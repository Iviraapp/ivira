import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../lib/api'

const FONT = "'Inter', sans-serif"

const COLORS = {
  bg: '#000000',
  bgSec: '#111111',
  bgTer: '#1A1A1A',
  card: '#0A0A0A',
  text: '#FFFFFF',
  textSec: 'rgba(255,255,255,0.6)',
  textTer: 'rgba(255,255,255,0.4)',
  brandAccent: '#1A3A8F',
  border: '#262626',
  borderCard: '#1F1F1F',
  borderStrong: '#333333',
  green: '#34A853',
  red: '#EA4335',
}

const SWATCHES = ['#1A3A8F', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4']

const STEP_LABELS = ['Identity', 'Hardware Sync', 'Revenue Check']

const stepVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

const stepTransition = { duration: 0.3, ease: 'easeInOut' }

function CheckIcon({ size = 16, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ProgressStepper({ currentStep, completed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 48 }}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isActive = currentStep === stepNum
        const isDone = completed >= stepNum
        const lineColor = completed >= stepNum ? COLORS.brandAccent : '#1F1F1F'

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 80 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: isDone || isActive ? COLORS.brandAccent : '#1F1F1F',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s ease',
              }}>
                {isDone && !isActive ? (
                  <CheckIcon size={16} color="#fff" />
                ) : (
                  <span style={{
                    fontFamily: FONT, fontSize: 14, fontWeight: 600,
                    color: isDone || isActive ? '#fff' : '#666',
                  }}>{stepNum}</span>
                )}
              </div>
              <span style={{
                fontFamily: FONT, fontSize: 12, marginTop: 8,
                color: isActive ? COLORS.text : COLORS.textTer,
                fontWeight: isActive ? 600 : 400,
              }}>{label}</span>
            </div>
            {i < 2 && (
              <div style={{
                width: 48, height: 2, background: lineColor,
                marginTop: 17, transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StepIdentity({ gym, accentColor, setAccentColor }) {
  const hasLogo = gym?.logo_url
  const initial = (gym?.gym_name || 'G').charAt(0).toUpperCase()

  return (
    <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}>
      <h2 style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: COLORS.text, textAlign: 'center', marginBottom: 8 }}>
        Confirm your brand.
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSec, textAlign: 'center', marginBottom: 32 }}>
        Make sure everything looks right before going live.
      </p>

      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.borderCard}`,
        borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: COLORS.card, border: `1px solid ${COLORS.borderCard}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', marginBottom: 16,
        }}>
          {hasLogo ? (
            <img src={gym.logo_url} alt="Gym logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: COLORS.brandAccent }}>{initial}</span>
          )}
        </div>

        {/* Gym Name */}
        <h3 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 32, textAlign: 'center' }}>
          {gym?.gym_name || 'Your Gym'}
        </h3>

        {/* Accent Color */}
        <div style={{ width: '100%' }}>
          <label style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 12, display: 'block' }}>
            Choose your brand color
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {SWATCHES.map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: color, border: 'none', cursor: 'pointer',
                  outline: accentColor === color ? '2px solid #FFFFFF' : '2px solid transparent',
                  outlineOffset: 3, transition: 'outline 0.15s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StepHardwareSync({ pairingCode }) {
  const digits = String(pairingCode).split('')

  return (
    <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}>
      <h2 style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: COLORS.text, textAlign: 'center', marginBottom: 8 }}>
        Activate your front desk.
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSec, textAlign: 'center', marginBottom: 32 }}>
        Pair a tablet or kiosk to your IVIRA account.
      </p>

      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.borderCard}`,
        borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Pairing Code */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {digits.map((d, i) => (
            <div key={i} style={{
              width: 64, height: 72, borderRadius: 12,
              background: COLORS.card, border: `1px solid ${COLORS.borderCard}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: COLORS.text }}>{d}</span>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSec, textAlign: 'center', maxWidth: 360, marginBottom: 24, lineHeight: 1.6 }}>
          Enter this code on your gym's tablet or kiosk device to pair it with your IVIRA account.
        </p>

        {/* Waiting indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }}
          />
          <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textTer }}>Waiting for device...</span>
        </div>

        <button
          onClick={() => {}}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: 13, color: '#A1A1AA',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Don't have a kiosk?
        </button>
      </div>
    </motion.div>
  )
}

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: enabled ? COLORS.brandAccent : '#333',
        position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: enabled ? 25 : 3,
        transition: 'left 0.2s ease',
      }} />
    </button>
  )
}

function StepRevenueCheck({ razorpayEnabled, setRazorpayEnabled, stripeEnabled, setStripeEnabled }) {
  const anyEnabled = razorpayEnabled || stripeEnabled

  return (
    <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={stepTransition}>
      <h2 style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: COLORS.text, textAlign: 'center', marginBottom: 8 }}>
        Enable Payments.
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textSec, textAlign: 'center', marginBottom: 32 }}>
        Connect a payment gateway to start collecting from members.
      </p>

      {/* Razorpay Card */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.borderCard}`,
        borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: '#1A1A2E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>&#8377;</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Razorpay Payments</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSec, lineHeight: 1.4 }}>Accept UPI, cards, and net banking from your members</div>
        </div>
        <ToggleSwitch enabled={razorpayEnabled} onToggle={() => setRazorpayEnabled(!razorpayEnabled)} />
      </div>

      {/* Stripe Card */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.borderCard}`,
        borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: '#1A1A2E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: '#8B5CF6' }}>$</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Stripe International</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textSec, lineHeight: 1.4 }}>Accept international cards and Apple Pay</div>
        </div>
        <ToggleSwitch enabled={stripeEnabled} onToggle={() => setStripeEnabled(!stripeEnabled)} />
      </div>

      {anyEnabled && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.green, fontWeight: 500 }}>
            Payment gateway connected
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

function SuccessScreen({ onLaunch, onShareWhatsApp, loading }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}
    >
      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        style={{
          width: 80, height: 80, borderRadius: '50%', background: COLORS.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}
      >
        <CheckIcon size={36} color="#fff" />
      </motion.div>

      <h2 style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: COLORS.text, marginBottom: 8, textAlign: 'center' }}>
        You're All Set!
      </h2>
      <p style={{ fontFamily: FONT, fontSize: 15, color: COLORS.textSec, marginBottom: 40, textAlign: 'center' }}>
        Your gym is ready to go live.
      </p>

      {/* Launch Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onLaunch}
        disabled={loading}
        style={{
          width: '100%', height: 56, borderRadius: 14, border: 'none',
          background: COLORS.brandAccent, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: FONT, fontSize: 16, fontWeight: 700, marginBottom: 12,
          opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s ease',
        }}
      >
        {loading ? 'Saving...' : 'Launch My Dashboard'}
      </motion.button>

      {/* WhatsApp Share */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onShareWhatsApp}
        style={{
          width: '100%', height: 52, borderRadius: 14,
          background: 'transparent', border: '1px solid #25D366',
          color: '#25D366', cursor: 'pointer',
          fontFamily: FONT, fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Share to WhatsApp
      </motion.button>
    </motion.div>
  )
}

export default function FirstTimeSetup() {
  const navigate = useNavigate()
  const { gym } = useAuth()
  const { addToast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [completed, setCompleted] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Step 1 state
  const [accentColor, setAccentColor] = useState('#1A3A8F')

  // Step 2 state
  const pairingCode = useMemo(() => Math.floor(1000 + Math.random() * 9000), [])

  // Step 3 state
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)
  const [stripeEnabled, setStripeEnabled] = useState(false)

  const gymId = gym?.id || gym?.gym_id

  const handleNext = () => {
    if (currentStep < 3) {
      setCompleted(Math.max(completed, currentStep))
      setCurrentStep(currentStep + 1)
    } else {
      setCompleted(3)
      setShowSuccess(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleLaunch = async () => {
    setLoading(true)
    try {
      await api.patch(`/gyms/${gymId}`, {
        accent_color: accentColor,
        onboarding_step: 4,
      })
      addToast('Setup complete! Welcome to IVIRA.', 'success')
      navigate('/dashboard')
    } catch (err) {
      addToast('Failed to save settings. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleShareWhatsApp = () => {
    const subdomain = gym?.subdomain || gym?.slug || gymId
    const message = encodeURIComponent(
      `Hi! We've upgraded to IVIRA. Tap here to get your new digital key: ${subdomain}.ivira.app/app`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', fontFamily: FONT,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(26,58,143,0.08) 0%, transparent 70%)',
      }} />

      {/* Content */}
      <div style={{
        width: '100%', maxWidth: 640, padding: '48px 24px',
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        justifyContent: showSuccess ? 'center' : 'flex-start',
      }}>
        {!showSuccess && (
          <>
            <ProgressStepper currentStep={currentStep} completed={completed} />

            <div style={{ flex: 1 }}>
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <StepIdentity gym={gym} accentColor={accentColor} setAccentColor={setAccentColor} />
                )}
                {currentStep === 2 && (
                  <StepHardwareSync pairingCode={pairingCode} />
                )}
                {currentStep === 3 && (
                  <StepRevenueCheck
                    razorpayEnabled={razorpayEnabled}
                    setRazorpayEnabled={setRazorpayEnabled}
                    stripeEnabled={stripeEnabled}
                    setStripeEnabled={setStripeEnabled}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    style={{
                      flex: 'none', padding: '14px 24px', borderRadius: 12,
                      background: 'transparent', border: `1px solid ${COLORS.borderCard}`,
                      color: COLORS.textSec, cursor: 'pointer',
                      fontFamily: FONT, fontSize: 14, fontWeight: 500,
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  style={{
                    flex: 1, padding: '14px 24px', borderRadius: 12,
                    background: COLORS.brandAccent, border: 'none',
                    color: '#fff', cursor: 'pointer',
                    fontFamily: FONT, fontSize: 15, fontWeight: 600,
                  }}
                >
                  Continue
                </button>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: FONT, fontSize: 13, color: '#4B5563',
                  padding: '8px 0',
                }}
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {showSuccess && (
          <SuccessScreen onLaunch={handleLaunch} onShareWhatsApp={handleShareWhatsApp} loading={loading} />
        )}
      </div>
    </div>
  )
}
