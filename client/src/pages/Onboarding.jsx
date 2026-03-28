import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import Button from '../components/ui/Button'
import Input, { Select, Textarea } from '../components/ui/Input'
import Card from '../components/ui/Card'
import { Building2, Users, CreditCard, MapPin, CheckCircle, Globe, Palette } from 'lucide-react'

const STEPS = [
  { label: 'Gym Info', icon: Building2 },
  { label: 'Domain', icon: Globe },
  { label: 'Brand', icon: Palette },
  { label: 'Address', icon: MapPin },
  { label: 'Plans', icon: Users },
  { label: 'Business', icon: CreditCard },
  { label: 'Launch', icon: CheckCircle },
]

const CITIES = ['Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai']

const DURATIONS = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  const padded = String(i).padStart(2, '0')
  return { value: `${padded}:00`, label: `${h}:00 ${ampm}` }
})

const ESTIMATED_MEMBERS_OPTIONS = ['1-50', '50-100', '100-250', '250-500', '500+']

const ACCENT_COLORS = [
  '#10B981', '#2563EB', '#DC2626', '#16A34A',
  '#F59E0B', '#EC4899', '#06B6D4', '#000000',
]

const emptyPlan = () => ({ name: '', duration_months: '1', price: '' })

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { gym, refreshProfile } = useAuth()
  const toast = useToast()
  const { theme, isDark } = useTheme()

  const font = "'Inter', -apple-system, sans-serif"
  const fontMono = "'JetBrains Mono', monospace"

  // Step 0: Gym Details
  const [gymName, setGymName] = useState(gym?.gym_name || '')
  const [phone, setPhone] = useState(gym?.phone || '')
  const [city, setCity] = useState(gym?.city || '')
  const [area, setArea] = useState(gym?.area || '')
  const [estimatedMembers, setEstimatedMembers] = useState('')

  // Lead tracking
  const [selectedTier] = useState(() => {
    return searchParams.get('tier') || localStorage.getItem('ivira_selected_tier') || ''
  })

  // Step 1: Domain
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState(null) // null | true | false
  const [checkingDomain, setCheckingDomain] = useState(false)
  const [customDomain, setCustomDomain] = useState('')

  // Step 2: Branding
  const [logoBase64, setLogoBase64] = useState('')
  const [logoFileName, setLogoFileName] = useState('')
  const [accentColor, setAccentColor] = useState('#10B981')

  // Step 3: Address & Location
  const [address, setAddress] = useState(gym?.address || '')
  const [latitude, setLatitude] = useState(gym?.latitude || '')
  const [longitude, setLongitude] = useState(gym?.longitude || '')
  const [timezone] = useState('Asia/Kolkata')
  const [locating, setLocating] = useState(false)

  // Step 4: Plans
  const [plans, setPlans] = useState([emptyPlan()])

  // Step 5: Business + Payment
  const [gstin, setGstin] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [openTime, setOpenTime] = useState('06:00')
  const [closeTime, setCloseTime] = useState('22:00')
  const [paymentGateway, setPaymentGateway] = useState('razorpay')

  // WhatsApp widget
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowWhatsApp(true), 10000)
    return () => clearTimeout(timer)
  }, [])

  const validate = (step) => {
    const errs = {}
    if (step === 0) {
      if (!gymName.trim()) errs.gymName = 'Gym name is required'
      if (!phone.trim()) errs.phone = 'Phone number is required'
      else if (!/^(\+91)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ''))) errs.phone = 'Enter a valid Indian phone number'
      if (!city) errs.city = 'Select a city'
      if (!area.trim()) errs.area = 'Area/locality is required'
    } else if (step === 1) {
      // Domain step - subdomain is optional but if entered, must be checked
      if (subdomain && subdomainAvailable === false) errs.subdomain = 'This subdomain is not available'
    } else if (step === 2) {
      // Branding step - all optional
    } else if (step === 3) {
      if (!address.trim()) errs.address = 'Full address is required'
    } else if (step === 4) {
      plans.forEach((p, i) => {
        if (!p.name.trim()) errs[`plan_${i}_name`] = 'Plan name is required'
        if (!p.price || Number(p.price) <= 0) errs[`plan_${i}_price`] = 'Enter a valid price'
      })
    } else if (step === 5) {
      if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/.test(gstin.toUpperCase())) {
        errs.gstin = 'Enter a valid GSTIN'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const trackLead = async (step) => {
    try {
      await api.post('/leads/track', {
        gym_name: gymName,
        email: phone,
        estimated_members: estimatedMembers,
        step_reached: step,
        selected_tier: selectedTier,
      })
    } catch (_) {
      // fire-and-forget
    }
  }

  const maybeConciergeAlert = () => {
    const highMembers = ['100-250', '250-500', '500+'].includes(estimatedMembers)
    const highTier = ['Pro', 'Enterprise'].includes(selectedTier)
    if (highMembers || highTier) {
      api.post('/leads/concierge-alert', {
        gym_name: gymName,
        email: phone,
        estimated_members: estimatedMembers,
        selected_tier: selectedTier,
      }).catch(() => {})
    }
  }

  const goNext = () => {
    if (validate(currentStep)) {
      const nextStep = currentStep + 1
      trackLead(nextStep)
      maybeConciergeAlert()
      setCurrentStep(Math.min(nextStep, STEPS.length - 1))
    }
  }

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0))

  const checkSubdomain = async () => {
    if (!subdomain.trim()) return
    setCheckingDomain(true)
    setSubdomainAvailable(null)
    try {
      const res = await api.get(`/domains/check?subdomain=${encodeURIComponent(subdomain.trim().toLowerCase())}`)
      setSubdomainAvailable(res.data?.available ?? true)
    } catch {
      setSubdomainAvailable(false)
    } finally {
      setCheckingDomain(false)
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogoBase64(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude.toFixed(6)))
        setLongitude(String(pos.coords.longitude.toFixed(6)))
        setLocating(false)
        toast.success('Location captured')
      },
      (err) => {
        setLocating(false)
        toast.error('Could not get location. Please allow location access.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const addPlan = () => {
    if (plans.length >= 3) return
    setPlans([...plans, emptyPlan()])
  }

  const removePlan = (idx) => {
    if (plans.length <= 1) return
    setPlans(plans.filter((_, i) => i !== idx))
  }

  const updatePlan = (idx, field, value) => {
    const updated = [...plans]
    updated[idx] = { ...updated[idx], [field]: value }
    setPlans(updated)
  }

  const handleConnectGateway = () => {
    const name = paymentGateway === 'razorpay' ? 'Razorpay' : 'Stripe'
    toast.info(`Redirecting to ${name} setup...`)
  }

  const handleLaunch = async () => {
    setLoading(true)
    try {
      const gymId = gym?.id
      if (!gymId) throw new Error('No gym found. Please log in again.')

      // Normalize phone
      let normalizedPhone = phone.replace(/\s/g, '')
      if (!normalizedPhone.startsWith('+91')) normalizedPhone = '+91' + normalizedPhone

      // PATCH gym details
      await api.patch(`/gyms/${gymId}`, {
        gym_name: gymName.trim(),
        phone: normalizedPhone,
        city,
        area: area.trim(),
        address: address.trim(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        timezone,
        gstin: gstin.trim().toUpperCase() || null,
        bank_account_name: bankAccountName.trim() || null,
        opening_time: openTime,
        closing_time: closeTime,
        subdomain: subdomain.trim().toLowerCase() || null,
        custom_domain: customDomain.trim() || null,
        logo: logoBase64 || null,
        accent_color: accentColor,
      })

      // POST each plan
      for (const plan of plans) {
        await api.post(`/gyms/${gymId}/plans`, {
          name: plan.name.trim(),
          duration_months: Number(plan.duration_months),
          price: Math.round(Number(plan.price) * 100), // convert to paise
        })
      }

      // Mark onboarding complete
      await api.patch(`/gyms/${gymId}/onboarding`, { step: 7 })

      await refreshProfile()
      toast.success('Your gym is live! Welcome to IVIRA.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const glassCard = {
    background: isDark ? 'rgba(26,26,26,0.7)' : `${theme.bgSec}`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '28px',
  }

  const brandGlow = `rgba(16,185,129,0.35)`

  const renderProgressBar = () => (
    <div style={{ marginBottom: 32 }}>
      {/* Progress track */}
      <div style={{
        height: 4, background: theme.bgTer, borderRadius: 2, marginBottom: 24, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: theme.brandAccent,
          width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>
      {/* Step circles and connecting lines */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          const circleColor = isCompleted ? theme.green : isCurrent ? theme.brandAccent : theme.bgTer
          const iconColor = isCompleted || isCurrent ? '#fff' : theme.textTer
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: circleColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: isCurrent ? `0 0 0 4px ${brandGlow}, 0 0 20px ${brandGlow}` : 'none',
                }}>
                  {isCompleted
                    ? <CheckCircle size={18} color={iconColor} />
                    : <Icon size={16} color={iconColor} />
                  }
                </div>
                <span style={{
                  fontSize: 11, fontWeight: isCurrent ? 600 : 400, marginTop: 6,
                  color: isCompleted ? theme.green : isCurrent ? theme.brandAccent : theme.textTer,
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 40, height: 2, background: i < currentStep ? theme.green : theme.bgTer,
                  marginBottom: 20, transition: 'background 0.3s ease',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // Step 0: Gym Details
  const renderStep0 = () => (
    <div style={glassCard}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Gym Details</h2>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Tell us about your gym</p>
      <Input
        label="Gym Name"
        placeholder="e.g. Iron Paradise Fitness"
        value={gymName}
        onChange={(e) => setGymName(e.target.value)}
        error={errors.gymName}
        autoFocus
      />
      <Input
        label="Phone Number"
        placeholder="+1 (814) 895-7439"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
      />
      <Select
        label="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        error={errors.city}
      >
        <option value="">Select a city</option>
        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      <Input
        label="Area / Locality"
        placeholder="e.g. Koramangala, Banjara Hills"
        value={area}
        onChange={(e) => setArea(e.target.value)}
        error={errors.area}
      />
      <Select
        label="Estimated Members"
        value={estimatedMembers}
        onChange={(e) => setEstimatedMembers(e.target.value)}
      >
        <option value="">Select range</option>
        {ESTIMATED_MEMBERS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </Select>
    </div>
  )

  // Step 1: Domain Selection
  const renderStep1 = () => (
    <div style={glassCard}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Domain Selection</h2>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Choose your gym's web address</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 8 }}>Subdomain</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            border: `1px solid ${errors.subdomain ? theme.red : theme.border}`,
            borderRadius: 10, overflow: 'hidden', background: theme.bgTer,
          }}>
            <input
              type="text"
              value={subdomain}
              onChange={(e) => {
                setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())
                setSubdomainAvailable(null)
              }}
              placeholder="your-gym"
              style={{
                flex: 1, padding: '10px 12px', border: 'none', outline: 'none',
                background: 'transparent', color: theme.text, fontSize: 14, fontFamily: fontMono,
              }}
            />
            <span style={{
              padding: '10px 12px', fontSize: 13, color: theme.textTer,
              borderLeft: `1px solid ${theme.border}`, whiteSpace: 'nowrap', fontFamily: fontMono,
            }}>
              .ivira.app
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={checkSubdomain}
            loading={checkingDomain}
            disabled={!subdomain.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            Check Availability
          </Button>
        </div>
        {errors.subdomain && (
          <span style={{ fontSize: 12, color: theme.red, marginTop: 4, display: 'block' }}>{errors.subdomain}</span>
        )}
        {subdomainAvailable !== null && !checkingDomain && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13,
            color: subdomainAvailable ? theme.green : theme.red,
            fontWeight: 500,
          }}>
            {subdomainAvailable ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15" />
                  <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {subdomain}.ivira.app is available!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15" />
                  <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {subdomain}.ivira.app is not available
              </>
            )}
          </div>
        )}
      </div>

      <Input
        label="Custom Domain (Optional)"
        placeholder="e.g. members.yourgym.com"
        value={customDomain}
        onChange={(e) => setCustomDomain(e.target.value)}
        helper="You can configure a custom domain later"
      />
    </div>
  )

  // Step 2: Branding
  const renderStep2 = () => (
    <div style={glassCard}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Branding</h2>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Customize your gym's look and feel</p>

      {/* Logo Upload */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 8 }}>Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 14, border: `2px dashed ${theme.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: theme.bgTer, overflow: 'hidden', flexShrink: 0,
          }}>
            {logoBase64 ? (
              <img src={logoBase64} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Palette size={24} color={theme.textTer} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'inline-block', padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${theme.border}`, background: theme.bgTer,
              color: theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
            </label>
            {logoFileName && (
              <span style={{ display: 'block', fontSize: 12, color: theme.textSec, marginTop: 6 }}>{logoFileName}</span>
            )}
            <span style={{ display: 'block', fontSize: 12, color: theme.textTer, marginTop: 4 }}>PNG or JPG, recommended 200x200px</span>
          </div>
        </div>
      </div>

      {/* Accent Color Picker */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 12 }}>Accent Color</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none',
                background: color, cursor: 'pointer',
                outline: accentColor === color ? `3px solid ${color}` : 'none',
                outlineOffset: 3,
                transition: 'transform 0.15s ease, outline 0.15s ease',
                transform: accentColor === color ? 'scale(1.1)' : 'scale(1)',
              }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div style={{ marginBottom: 4 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 12 }}>Preview</label>
        <div style={{
          padding: 20, borderRadius: 12, border: `1px solid ${theme.border}`,
          background: theme.bgTer,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {logoBase64 ? (
              <img src={logoBase64} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16,
              }}>
                {(gymName || 'G').charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>{gymName || 'Your Gym'}</span>
          </div>
          <div style={{
            height: 4, borderRadius: 2, background: accentColor, width: '60%', marginBottom: 8,
          }} />
          <div style={{
            height: 4, borderRadius: 2, background: accentColor, opacity: 0.4, width: '40%',
          }} />
          <div style={{ marginTop: 14 }}>
            <span style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: 6,
              background: accentColor, color: '#fff', fontSize: 12, fontWeight: 600,
            }}>
              Join Now
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  // Step 3: Address & Location
  const renderStep3 = () => (
    <div style={glassCard}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Address & Location</h2>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Help members find your gym</p>
      <Textarea
        label="Full Address"
        placeholder="Building name, street, area, city - PIN"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        error={errors.address}
      />
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <Input
          label="Latitude"
          placeholder="12.9716"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <Input
          label="Longitude"
          placeholder="77.5946"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
      </div>
      <Button
        variant="secondary"
        size="sm"
        loading={locating}
        onClick={useMyLocation}
        style={{ marginBottom: 16 }}
      >
        <MapPin size={14} /> Use My Location
      </Button>
      <Input
        label="Timezone"
        value="IST (Asia/Kolkata)"
        disabled
        style={{ background: theme.bgTer, color: theme.textSec }}
      />
    </div>
  )

  // Step 4: Membership Plans
  const renderStep4 = () => (
    <div style={glassCard}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Membership Plans</h2>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Set up plans your members can subscribe to</p>
      {plans.map((plan, i) => (
        <div key={i} style={{
          padding: 16, borderRadius: 10, border: `1px solid ${theme.border}`, marginBottom: 16,
          background: theme.bgTer,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>Plan {i + 1}</span>
            {plans.length > 1 && (
              <button
                onClick={() => removePlan(i)}
                style={{
                  background: 'none', border: 'none', color: theme.red, fontSize: 13,
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                Remove
              </button>
            )}
          </div>
          <Input
            label="Plan Name"
            placeholder="e.g. Monthly Basic, Quarterly Premium"
            value={plan.name}
            onChange={(e) => updatePlan(i, 'name', e.target.value)}
            error={errors[`plan_${i}_name`]}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Select
              label="Duration"
              value={plan.duration_months}
              onChange={(e) => updatePlan(i, 'duration_months', e.target.value)}
              containerStyle={{ flex: 1 }}
            >
              {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
            <Input
              label="Price (INR)"
              type="number"
              placeholder="1500"
              value={plan.price}
              onChange={(e) => updatePlan(i, 'price', e.target.value)}
              error={errors[`plan_${i}_price`]}
              containerStyle={{ flex: 1 }}
            />
          </div>
        </div>
      ))}
      {plans.length < 3 && (
        <Button variant="secondary" size="sm" onClick={addPlan} fullWidth>
          + Add Plan
        </Button>
      )}
    </div>
  )

  // Step 5: Business Info + Payment Setup
  const renderStep5 = () => (
    <div style={glassCard}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Business Info</h2>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Optional details for billing and operations</p>
      <Input
        label="GSTIN (Optional)"
        placeholder="22AAAAA0000A1Z5"
        value={gstin}
        onChange={(e) => setGstin(e.target.value)}
        error={errors.gstin}
        helper="Leave blank if not registered for GST"
      />
      <Input
        label="Bank Account Name"
        placeholder="Name on bank account"
        value={bankAccountName}
        onChange={(e) => setBankAccountName(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Select
          label="Opening Time"
          value={openTime}
          onChange={(e) => setOpenTime(e.target.value)}
          containerStyle={{ flex: 1 }}
        >
          {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </Select>
        <Select
          label="Closing Time"
          value={closeTime}
          onChange={(e) => setCloseTime(e.target.value)}
          containerStyle={{ flex: 1 }}
        >
          {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </Select>
      </div>

      {/* Payment Gateway Section */}
      <div style={{
        padding: 20, borderRadius: 12, border: `1px solid ${theme.border}`,
        background: theme.bgTer,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 14 }}>Payment Gateway</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { value: 'razorpay', label: 'Razorpay', tag: 'Recommended for India' },
            { value: 'stripe', label: 'Stripe', tag: null },
          ].map((gw) => (
            <label
              key={gw.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${paymentGateway === gw.value ? theme.brandAccent : theme.border}`,
                background: paymentGateway === gw.value ? (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)') : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="radio"
                name="paymentGateway"
                value={gw.value}
                checked={paymentGateway === gw.value}
                onChange={(e) => setPaymentGateway(e.target.value)}
                style={{ accentColor: theme.brandAccent }}
              />
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{gw.label}</span>
              {gw.tag && (
                <span style={{
                  fontSize: 11, fontWeight: 500, color: theme.brandAccent,
                  background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {gw.tag}
                </span>
              )}
            </label>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={handleConnectGateway}>
          Connect {paymentGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}
        </Button>
      </div>
    </div>
  )

  // Step 6: Review & Launch
  const renderStep6 = () => {
    let normalizedPhone = phone.replace(/\s/g, '')
    if (!normalizedPhone.startsWith('+91')) normalizedPhone = '+91' + normalizedPhone

    return (
      <div style={glassCard}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: font }}>Review & Launch</h2>
        <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 24 }}>Everything looks good? Let's go live!</p>

        {/* Gym Details Summary */}
        <div style={summarySection}>
          <div style={summaryHeader}>
            <Building2 size={16} color={theme.brandAccent} />
            <span style={{ fontWeight: 600, color: theme.text }}>Gym Details</span>
            <button onClick={() => setCurrentStep(0)} style={{ ...editBtnStyle, color: theme.brandAccent }}>Edit</button>
          </div>
          <div style={summaryGrid}>
            <SummaryItem label="Name" value={gymName} theme={theme} />
            <SummaryItem label="Phone" value={normalizedPhone} theme={theme} />
            <SummaryItem label="City" value={city} theme={theme} />
            <SummaryItem label="Area" value={area} theme={theme} />
            {estimatedMembers && <SummaryItem label="Est. Members" value={estimatedMembers} theme={theme} />}
          </div>
        </div>

        {/* Domain Summary */}
        <div style={summarySection}>
          <div style={summaryHeader}>
            <Globe size={16} color={theme.brandAccent} />
            <span style={{ fontWeight: 600, color: theme.text }}>Domain</span>
            <button onClick={() => setCurrentStep(1)} style={{ ...editBtnStyle, color: theme.brandAccent }}>Edit</button>
          </div>
          <div style={summaryGrid}>
            {subdomain && <SummaryItem label="Subdomain" value={`${subdomain}.ivira.app`} theme={theme} />}
            {customDomain && <SummaryItem label="Custom Domain" value={customDomain} theme={theme} />}
            {!subdomain && !customDomain && <SummaryItem label="Domain" value="Not configured" theme={theme} />}
          </div>
        </div>

        {/* Branding Summary */}
        <div style={summarySection}>
          <div style={summaryHeader}>
            <Palette size={16} color={theme.brandAccent} />
            <span style={{ fontWeight: 600, color: theme.text }}>Branding</span>
            <button onClick={() => setCurrentStep(2)} style={{ ...editBtnStyle, color: theme.brandAccent }}>Edit</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {logoBase64 && (
              <img src={logoBase64} alt="Logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accent</span>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: accentColor,
                border: `2px solid ${theme.border}`,
              }} />
              <span style={{ fontSize: 13, color: theme.textSec, fontFamily: fontMono }}>{accentColor}</span>
            </div>
          </div>
        </div>

        {/* Address Summary */}
        <div style={summarySection}>
          <div style={summaryHeader}>
            <MapPin size={16} color={theme.brandAccent} />
            <span style={{ fontWeight: 600, color: theme.text }}>Address</span>
            <button onClick={() => setCurrentStep(3)} style={{ ...editBtnStyle, color: theme.brandAccent }}>Edit</button>
          </div>
          <div style={summaryGrid}>
            <SummaryItem label="Address" value={address} span theme={theme} />
            {latitude && longitude && (
              <SummaryItem label="GPS" value={`${latitude}, ${longitude}`} theme={theme} />
            )}
            <SummaryItem label="Timezone" value="IST" theme={theme} />
          </div>
        </div>

        {/* Plans Summary */}
        <div style={summarySection}>
          <div style={summaryHeader}>
            <Users size={16} color={theme.brandAccent} />
            <span style={{ fontWeight: 600, color: theme.text }}>Membership Plans</span>
            <button onClick={() => setCurrentStep(4)} style={{ ...editBtnStyle, color: theme.brandAccent }}>Edit</button>
          </div>
          {plans.map((p, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '8px 0',
              borderBottom: i < plans.length - 1 ? `1px solid ${theme.border}` : 'none',
            }}>
              <span style={{ fontSize: 14, color: theme.textSec }}>{p.name || `Plan ${i + 1}`}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: fontMono }}>
                INR {Number(p.price).toLocaleString('en-IN')} / {DURATIONS.find(d => String(d.value) === String(p.duration_months))?.label || p.duration_months + 'mo'}
              </span>
            </div>
          ))}
        </div>

        {/* Business Summary */}
        <div style={{ ...summarySection, borderBottom: 'none', marginBottom: 0 }}>
          <div style={summaryHeader}>
            <CreditCard size={16} color={theme.brandAccent} />
            <span style={{ fontWeight: 600, color: theme.text }}>Business Info</span>
            <button onClick={() => setCurrentStep(5)} style={{ ...editBtnStyle, color: theme.brandAccent }}>Edit</button>
          </div>
          <div style={summaryGrid}>
            {gstin && <SummaryItem label="GSTIN" value={gstin.toUpperCase()} theme={theme} />}
            {bankAccountName && <SummaryItem label="Bank Account" value={bankAccountName} theme={theme} />}
            <SummaryItem label="Hours" value={`${formatTime(openTime)} - ${formatTime(closeTime)}`} theme={theme} />
            <SummaryItem label="Payment Gateway" value={paymentGateway === 'razorpay' ? 'Razorpay' : 'Stripe'} theme={theme} />
          </div>
        </div>
      </div>
    )
  }

  const summarySection = {
    padding: '16px 0',
    borderBottom: `1px solid ${theme.border}`,
    marginBottom: 8,
  }

  const summaryHeader = {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  }

  const summaryGrid = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px',
  }

  const editBtnStyle = {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: theme.brandAccent, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  }

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6]

  const lastStep = STEPS.length - 1

  return (
    <div style={{
      minHeight: '100vh', background: theme.bg,
      display: 'flex', justifyContent: 'center', padding: '24px 16px',
      fontFamily: font,
    }}>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px ${brandGlow}, 0 0 40px rgba(16,185,129,0.15); }
          50% { box-shadow: 0 0 30px ${brandGlow}, 0 0 60px rgba(16,185,129,0.25); }
        }
        @keyframes waPulse {
          0% { box-shadow: 0 0 0 0 rgba(37,211,102,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: 600 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: theme.grad,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8,
          }}>G</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 2, fontFamily: font }}>Set Up Your Gym</h1>
          <p style={{ fontSize: 14, color: theme.textSec }}>Complete these steps to get started on IVIRA</p>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Current Step */}
        {stepRenderers[currentStep]()}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex', justifyContent: currentStep === 0 ? 'flex-end' : 'space-between',
          marginTop: 20, gap: 12,
        }}>
          {currentStep > 0 && (
            <Button variant="secondary" onClick={goBack} disabled={loading}>
              Back
            </Button>
          )}
          {currentStep < lastStep ? (
            <Button onClick={goNext} style={{ background: theme.brandAccent }}>
              Next
            </Button>
          ) : (
            <Button
              loading={loading}
              onClick={handleLaunch}
              style={{
                background: theme.brandAccent,
                padding: '14px 32px',
                fontSize: 16,
                fontWeight: 700,
                animation: 'glowPulse 2s ease-in-out infinite',
                fontFamily: font,
              }}
            >
              <CheckCircle size={18} /> Launch Your Gym
            </Button>
          )}
        </div>
      </div>

      {/* WhatsApp Chat Widget */}
      {showWhatsApp && (
        <a
          href="https://wa.me/18148957439?text=Hi, I need help setting up my gym on IVIRA"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 48, height: 48, borderRadius: '50%',
            background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: 'none', zIndex: 9999,
            animation: 'waPulse 2s infinite',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          title="Chat with us on WhatsApp"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}
    </div>
  )
}

/* --- Helper components & styles --- */

function SummaryItem({ label, value, span, theme }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 12, color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <p style={{ fontSize: 14, color: theme.text, fontWeight: 500, marginTop: 2, wordBreak: 'break-word' }}>{value || '-'}</p>
    </div>
  )
}

function formatTime(val) {
  const [h] = val.split(':').map(Number)
  const hour = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour}:00 ${ampm}`
}
