import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'
import { Building2, CreditCard, Globe, Bell, Monitor, Rows3, Rows4, MessageSquare, Send, Shield, Download, Trash2, AlertTriangle } from 'lucide-react'
import { formatDate } from '../../lib/utils'

const CITIES = [
  { value: 'bengaluru', label: 'Bengaluru' },
  { value: 'hyderabad', label: 'Hyderabad' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'mumbai', label: 'Mumbai' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
]

const TABS = [
  { id: 'profile', label: 'Gym Profile' },
  { id: 'plans', label: 'Plans' },
  { id: 'language', label: 'Language' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'display', label: 'Display' },
  { id: 'support', label: 'Support' },
  { id: 'privacy', label: 'Data & Privacy' },
]

function formatPaise(paise) {
  const rupees = (paise || 0) / 100
  return '\u20B9' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/* ---- Gym Profile Tab ---- */
function GymProfileTab({ gymId, gym, updateGym, theme, sp }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', address: '', city: '', latitude: '', longitude: '' })

  useEffect(() => {
    if (gym) {
      setForm({
        name: gym.name || gym.gym_name || '',
        address: gym.address || '',
        city: gym.city || '',
        latitude: gym.latitude ?? '',
        longitude: gym.longitude ?? '',
      })
    }
  }, [gym])

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/gyms/${gymId}`, data),
    onSuccess: (res) => { toast.success('Gym profile updated'); if (updateGym) updateGym(res.data) },
    onError: () => toast.error('Failed to update profile'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    })
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const inputSty = {
    width: '100%', padding: `${sp(10)}px ${sp(14)}px`, background: theme.bgTer,
    border: `1px solid ${theme.borderStrong}`, borderRadius: 8, color: theme.text,
    fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  const labelSty = {
    display: 'block', fontSize: 13, fontWeight: 600, color: theme.textSec,
    marginBottom: 6, fontFamily: "'Inter', -apple-system, sans-serif",
  }

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: theme.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={18} color={theme.accent} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
          Gym Profile
        </h3>
      </div>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: sp(18) }}>
          <label style={labelSty}>Gym Name</label>
          <input value={form.name} onChange={set('name')} required style={inputSty} />
        </div>
        <div style={{ marginBottom: sp(18) }}>
          <label style={labelSty}>Address</label>
          <input value={form.address} onChange={set('address')} style={inputSty} />
        </div>
        <div style={{ marginBottom: sp(18) }}>
          <label style={labelSty}>City</label>
          <select value={form.city} onChange={set('city')} style={{ ...inputSty, appearance: 'none', cursor: 'pointer' }}>
            <option value="">Select city</option>
            {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: sp(18) }}>
          <div>
            <label style={labelSty}>GPS Latitude</label>
            <input type="number" step="any" value={form.latitude} onChange={set('latitude')} style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>GPS Longitude</label>
            <input type="number" step="any" value={form.longitude} onChange={set('longitude')} style={inputSty} />
          </div>
        </div>
        <button type="submit" disabled={mutation.isPending} style={{
          background: theme.grad, color: '#fff', border: 'none', borderRadius: 10,
          padding: `${sp(12)}px ${sp(28)}px`, fontWeight: 600, cursor: 'pointer',
          fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", marginTop: 4,
          opacity: mutation.isPending ? 0.7 : 1, transition: 'opacity 0.2s',
        }}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

/* ---- Plans Tab ---- */
function PlansTab({ gymId, theme, sp }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [planForm, setPlanForm] = useState({ name: '', duration_months: '', price: '' })

  const { data: plans, isLoading } = useQuery({
    queryKey: ['gym-plans', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/plans`).then((r) => r.data),
    enabled: !!gymId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['gym-plans', gymId] })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/gyms/${gymId}/plans`, data),
    onSuccess: () => { toast.success('Plan created'); invalidate(); resetForm() },
    onError: () => toast.error('Failed to create plan'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/gyms/${gymId}/plans/${id}`, data),
    onSuccess: () => { toast.success('Plan updated'); invalidate(); resetForm() },
    onError: () => toast.error('Failed to update plan'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/gyms/${gymId}/plans/${id}`),
    onSuccess: () => { toast.success('Plan deleted'); invalidate() },
    onError: () => toast.error('Failed to delete plan'),
  })

  function resetForm() { setPlanForm({ name: '', duration_months: '', price: '' }); setShowForm(false); setEditingId(null) }
  function startEdit(plan) {
    setEditingId(plan.id)
    setPlanForm({ name: plan.name, duration_months: String(plan.duration_months), price: String(plan.price / 100) })
    setShowForm(true)
  }
  function handleSubmitPlan(e) {
    e.preventDefault()
    const payload = { name: planForm.name, duration_months: parseInt(planForm.duration_months, 10), price: Math.round(parseFloat(planForm.price) * 100) }
    editingId ? updateMutation.mutate({ id: editingId, data: payload }) : createMutation.mutate(payload)
  }

  const setPlan = (field) => (e) => setPlanForm((f) => ({ ...f, [field]: e.target.value }))
  const isSaving = createMutation.isPending || updateMutation.isPending

  const inputSty = {
    width: '100%', padding: `${sp(10)}px ${sp(14)}px`, background: theme.bgTer,
    border: `1px solid ${theme.borderStrong}`, borderRadius: 8, color: theme.text,
    fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", outline: 'none', boxSizing: 'border-box',
  }
  const labelSty = {
    display: 'block', fontSize: 13, fontWeight: 600, color: theme.textSec,
    marginBottom: 6, fontFamily: "'Inter', -apple-system, sans-serif",
  }

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(28) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={18} color={theme.accent} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>Membership Plans</h3>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true) }} style={{
            background: theme.grad, color: '#fff', border: 'none', borderRadius: 8,
            padding: `${sp(8)}px ${sp(18)}px`, fontWeight: 600, cursor: 'pointer',
            fontSize: 13, fontFamily: "'Inter', -apple-system, sans-serif",
          }}>+ Add Plan</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmitPlan} style={{
          padding: sp(22), background: theme.bgTer, borderRadius: 12,
          border: `1px solid ${theme.borderStrong}`, marginBottom: sp(22),
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
            <div><label style={labelSty}>Plan Name</label><input placeholder="e.g. Monthly" value={planForm.name} onChange={setPlan('name')} required style={inputSty} /></div>
            <div><label style={labelSty}>Duration (months)</label><input type="number" min="1" value={planForm.duration_months} onChange={setPlan('duration_months')} required style={inputSty} /></div>
            <div><label style={labelSty}>Price (INR)</label><input type="number" min="0" step="1" placeholder="e.g. 1500" value={planForm.price} onChange={setPlan('price')} required style={inputSty} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: sp(18) }}>
            <button type="submit" disabled={isSaving} style={{
              background: theme.grad, color: '#fff', border: 'none', borderRadius: 8,
              padding: `${sp(10)}px ${sp(22)}px`, fontWeight: 600, cursor: 'pointer',
              fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", opacity: isSaving ? 0.7 : 1,
            }}>{isSaving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}</button>
            <button type="button" onClick={resetForm} style={{
              background: theme.bgHover, color: theme.textSec, border: `1px solid ${theme.borderStrong}`,
              borderRadius: 8, padding: `${sp(10)}px ${sp(22)}px`, fontWeight: 600, cursor: 'pointer',
              fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif",
            }}>Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 60, background: theme.bgTer, borderRadius: 10 }} />)}
        </div>
      ) : (plans || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: `${sp(16)}px ${sp(20)}px`, background: theme.bgTer, borderRadius: 12,
              border: `1px solid ${theme.borderStrong}`, transition: 'border-color 0.2s',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: theme.textSec, marginTop: 4, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                  {plan.duration_months} month{plan.duration_months !== 1 ? 's' : ''} &middot;{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.green, fontWeight: 600 }}>{formatPaise(plan.price)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => startEdit(plan)} style={{
                  padding: `${sp(7)}px ${sp(16)}px`, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
                  color: theme.textSec, fontFamily: "'Inter', -apple-system, sans-serif",
                }}>Edit</button>
                <button onClick={() => { if (window.confirm(`Delete "${plan.name}"?`)) deleteMutation.mutate(plan.id) }} style={{
                  padding: `${sp(7)}px ${sp(16)}px`, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: 'transparent', border: `1px solid rgba(255,71,87,0.3)`, borderRadius: 8,
                  color: theme.red, fontFamily: "'Inter', -apple-system, sans-serif",
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center', color: theme.textTer, fontSize: 14 }}>
          No plans yet. Create your first membership plan.
        </div>
      )}
    </div>
  )
}

/* ---- Language Tab ---- */
function LanguageTab({ gymId, gym, updateGym, theme, sp }) {
  const toast = useToast()
  const [selected, setSelected] = useState(gym?.preferred_language || 'en')

  useEffect(() => { if (gym?.preferred_language) setSelected(gym.preferred_language) }, [gym?.preferred_language])

  const mutation = useMutation({
    mutationFn: (lang) => api.patch(`/gyms/${gymId}`, { preferred_language: lang }),
    onSuccess: (res) => { toast.success('Language preference saved'); if (updateGym) updateGym(res.data) },
    onError: () => toast.error('Failed to update language'),
  })

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Globe size={18} color={theme.cyan} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>Preferred Language</h3>
      </div>
      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: sp(22), marginTop: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        Choose the language for notifications and reports sent to your members.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: sp(10), maxWidth: 340 }}>
        {LANGUAGES.map((lang) => (
          <label key={lang.value} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: `${sp(14)}px ${sp(18)}px`, borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${selected === lang.value ? 'rgba(108,92,231,0.4)' : theme.borderStrong}`,
            background: selected === lang.value ? theme.accentSoft : theme.bgTer,
            transition: 'all 0.2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${selected === lang.value ? theme.accent : theme.textTer}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {selected === lang.value && <div style={{ width: 10, height: 10, borderRadius: '50%', background: theme.accent }} />}
            </div>
            <input type="radio" name="language" value={lang.value} checked={selected === lang.value} onChange={() => setSelected(lang.value)} style={{ display: 'none' }} />
            <span style={{ fontSize: 15, fontWeight: selected === lang.value ? 600 : 400, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>{lang.label}</span>
          </label>
        ))}
      </div>
      <button onClick={() => mutation.mutate(selected)} disabled={mutation.isPending} style={{
        background: theme.grad, color: '#fff', border: 'none', borderRadius: 10,
        padding: `${sp(12)}px ${sp(28)}px`, fontWeight: 600, cursor: 'pointer',
        fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", marginTop: sp(24),
        opacity: mutation.isPending ? 0.7 : 1,
      }}>{mutation.isPending ? 'Saving...' : 'Save Language'}</button>
    </div>
  )
}

/* ---- Notifications Tab ---- */
function NotificationsTab({ gymId, theme, sp }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['notification-settings', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/notification-settings`).then(r => r.data.settings),
    enabled: !!gymId,
  })

  const [prefs, setPrefs] = useState({
    whatsapp_enabled: true, sms_enabled: true, email_enabled: true,
    payment_reminders: true, expiry_alerts: true, checkin_summary: false,
    marketing: false, day_pass_alerts: true,
  })

  useEffect(() => { if (settingsData) setPrefs(settingsData) }, [settingsData])

  const mutation = useMutation({
    mutationFn: (patch) => api.patch(`/gyms/${gymId}/notification-settings`, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['notification-settings', gymId] })
      const previous = queryClient.getQueryData(['notification-settings', gymId])
      queryClient.setQueryData(['notification-settings', gymId], old => ({ ...old, ...patch }))
      return { previous }
    },
    onError: (_err, _patch, context) => {
      queryClient.setQueryData(['notification-settings', gymId], context.previous)
      setPrefs(context.previous)
      toast.error('Failed to update notification settings')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notification-settings', gymId] }),
  })

  const toggle = (key) => () => {
    const newVal = !prefs[key]
    setPrefs(p => ({ ...p, [key]: newVal }))
    mutation.mutate({ [key]: newVal })
  }

  const channelSwitches = [
    { key: 'whatsapp_enabled', label: 'Enable WhatsApp Notifications', desc: 'Send notifications via WhatsApp (requires WATI integration)' },
    { key: 'sms_enabled', label: 'Enable SMS Notifications', desc: 'Send notifications via SMS (powered by MSG91)' },
    { key: 'email_enabled', label: 'Enable Email Notifications', desc: 'Send notifications via Email (Gmail SMTP)' },
  ]
  const typeSwitches = [
    { key: 'payment_reminders', label: 'Payment Reminders', desc: 'Notify when a payment is due or overdue' },
    { key: 'expiry_alerts', label: 'Membership Expiry Alerts', desc: 'Notify members before their membership expires' },
    { key: 'day_pass_alerts', label: 'Daily Pass Alerts', desc: 'Get notified when someone purchases a day pass' },
    { key: 'checkin_summary', label: 'Daily Check-in Summary', desc: 'Receive a daily summary of check-in activity' },
    { key: 'marketing', label: 'Promotional Messages', desc: 'Send promotional offers and win-back campaigns' },
  ]

  const renderToggle = (s) => (
    <div key={s.key} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `${sp(16)}px 0`, borderBottom: `1px solid ${theme.borderStrong}`,
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>{s.label}</div>
        <div style={{ fontSize: 13, color: theme.textSec, marginTop: 3, fontFamily: "'Inter', -apple-system, sans-serif" }}>{s.desc}</div>
      </div>
      <button onClick={toggle(s.key)} disabled={isLoading} style={{
        width: 48, height: 26, borderRadius: 13, border: 'none',
        cursor: isLoading ? 'wait' : 'pointer',
        background: prefs[s.key] ? theme.accent : theme.bgHover,
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0, marginLeft: 20, opacity: isLoading ? 0.5 : 1,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: prefs[s.key] ? 24 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: prefs[s.key] ? '#fff' : theme.textTer,
          transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0,214,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} color={theme.green} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>Notifications</h3>
        {mutation.isPending && <span style={{ fontSize: 11, color: theme.textTer, fontStyle: 'italic' }}>Saving...</span>}
      </div>

      <h4 style={{ fontSize: 12, fontWeight: 600, color: theme.textTer, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Inter', -apple-system, sans-serif" }}>Channels</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: sp(28) }}>
        {channelSwitches.map(renderToggle)}
      </div>

      <div style={{
        padding: `${sp(16)}px ${sp(20)}px`, background: theme.accentSoft, borderRadius: 10,
        border: `1px solid rgba(108,92,231,0.2)`, marginBottom: sp(28),
        fontSize: 13, color: theme.textSec, lineHeight: 1.7, fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <strong style={{ color: theme.text }}>WhatsApp Setup (WATI):</strong> Sign up at{' '}
        <a href="https://www.wati.io" target="_blank" rel="noopener noreferrer" style={{ color: theme.accent, textDecoration: 'underline' }}>wati.io</a> and configure templates.
        <br /><strong style={{ color: theme.text }}>SMS Setup (MSG91):</strong> Configure your MSG91 auth key in environment settings.
        <br /><strong style={{ color: theme.text }}>Email Setup (Gmail):</strong> Configure GMAIL_USER and GMAIL_APP_PASSWORD in environment settings.
      </div>

      <h4 style={{ fontSize: 12, fontWeight: 600, color: theme.textTer, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Inter', -apple-system, sans-serif" }}>Notification Types</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {typeSwitches.map(renderToggle)}
      </div>
    </div>
  )
}

/* ---- Display Tab ---- */
function DisplayTab({ theme, sp, density, setDensity }) {
  const densityOptions = [
    { value: 'compact', label: 'Compact', desc: 'Default sizing \u2014 more content visible', icon: Rows4 },
    { value: 'roomy', label: 'Roomy', desc: 'Larger touch targets, 1.5\u00D7 padding', icon: Rows3 },
  ]

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Monitor size={18} color={theme.accent} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>Display</h3>
      </div>

      <p style={{ fontSize: 14, color: theme.textSec, marginBottom: sp(22), marginTop: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        Adjust the visual density of the dashboard interface.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: sp(10), maxWidth: 400 }}>
        {densityOptions.map(opt => {
          const Icon = opt.icon
          const sel = density === opt.value
          return (
            <button key={opt.value} onClick={() => setDensity(opt.value)} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: `${sp(16)}px ${sp(20)}px`, borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${sel ? theme.accent : theme.borderStrong}`,
              background: sel ? theme.accentSoft : theme.bgTer,
              transition: 'all 0.2s', textAlign: 'left',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: sel ? theme.accent : theme.bgHover,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}>
                <Icon size={20} color={sel ? '#fff' : theme.textSec} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: theme.textSec, marginTop: 2, fontFamily: "'Inter', -apple-system, sans-serif" }}>{opt.desc}</div>
              </div>
              {sel && (
                <div style={{
                  marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%',
                  background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Live preview */}
      <div style={{
        marginTop: sp(24), padding: sp(16), borderRadius: 10,
        background: theme.bgTer, border: `1px solid ${theme.borderStrong}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.textTer, textTransform: 'uppercase', letterSpacing: 1, marginBottom: sp(10), fontFamily: "'Inter', -apple-system, sans-serif" }}>
          Preview
        </div>
        <div style={{ display: 'flex', gap: sp(8), flexWrap: 'wrap' }}>
          {['Button A', 'Button B', 'Button C'].map(label => (
            <div key={label} style={{
              padding: `${sp(8)}px ${sp(16)}px`, borderRadius: 8,
              background: theme.bgHover, border: `1px solid ${theme.borderStrong}`,
              fontSize: 14, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif",
            }}>{label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---- Support Tab ---- */
function SupportTab({ gymId, gym, theme, sp }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('medium')

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/support-tickets`).then(r => r.data?.tickets || r.data || []),
    enabled: !!gymId,
  })

  const submitTicket = useMutation({
    mutationFn: (payload) => api.post(`/gyms/${gymId}/support-tickets`, payload),
    onSuccess: () => {
      toast.success('Support ticket submitted')
      queryClient.invalidateQueries({ queryKey: ['support-tickets', gymId] })
      setMessage('')
      setPriority('medium')
    },
    onError: () => toast.error('Failed to submit ticket'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim()) return toast.error('Please enter a message')
    submitTicket.mutate({
      message: message.trim(),
      priority,
      page_url: window.location.href,
    })
  }

  const inputSty = {
    width: '100%', padding: `${sp(10)}px ${sp(14)}px`, background: theme.bgTer,
    border: `1px solid ${theme.borderStrong}`, borderRadius: 8, color: theme.text,
    fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  const labelSty = {
    display: 'block', fontSize: 13, fontWeight: 600, color: theme.textSec,
    marginBottom: 6, fontFamily: "'Inter', -apple-system, sans-serif",
  }

  const priorityColors = { low: theme.textTer, medium: theme.amber, urgent: theme.red }
  const statusColors = { Open: theme.amber, 'In-Progress': theme.cyan, Resolved: theme.green }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: sp(24) }}>
      {/* Submit a Request */}
      <div style={{
        background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
        borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: theme.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={18} color={theme.accent} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            Submit a Request
          </h3>
        </div>
        <form onSubmit={handleSubmit} style={{ maxWidth: 540 }}>
          <div style={{ marginBottom: sp(18) }}>
            <label style={labelSty}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or request..."
              required
              rows={5}
              style={{ ...inputSty, resize: 'vertical', minHeight: 100 }}
            />
          </div>
          <div style={{ marginBottom: sp(18) }}>
            <label style={labelSty}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ ...inputSty, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button type="submit" disabled={submitTicket.isPending} style={{
            background: theme.grad, color: '#fff', border: 'none', borderRadius: 10,
            padding: `${sp(12)}px ${sp(28)}px`, fontWeight: 600, cursor: 'pointer',
            fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", marginTop: 4,
            opacity: submitTicket.isPending ? 0.7 : 1, transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Send size={15} />
            {submitTicket.isPending ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>

      {/* Previous Tickets */}
      <div style={{
        background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
        borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: theme.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rows3 size={18} color={theme.accent} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            Previous Tickets
          </h3>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: 60, background: theme.bgTer, borderRadius: 10 }} />)}
          </div>
        ) : (tickets || []).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tickets.map((ticket) => (
              <div key={ticket.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: `${sp(16)}px ${sp(20)}px`, background: theme.bgTer, borderRadius: 12,
                border: `1px solid ${theme.borderStrong}`, transition: 'border-color 0.2s',
                gap: 14,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: priorityColors[ticket.priority] || theme.textTer,
                      fontFamily: "'Inter', -apple-system, sans-serif",
                    }}>{ticket.priority}</span>
                    <span style={{ fontSize: 12, color: theme.textTer, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 14, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ticket.message?.length > 100 ? ticket.message.slice(0, 100) + '...' : ticket.message}
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                  padding: `${sp(4)}px ${sp(12)}px`, borderRadius: 20,
                  background: (statusColors[ticket.status] || theme.textTer) + '18',
                  color: statusColors[ticket.status] || theme.textTer,
                  fontFamily: "'Inter', -apple-system, sans-serif",
                }}>
                  {ticket.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: theme.textTer, fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            No support tickets yet. Submit a request above if you need help.
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Data & Privacy Tab (DPDP Compliance) ---- */
function DataPrivacyTab({ gymId, theme, sp }) {
  const toast = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await api.post(`/gyms/${gymId}/data/export`)
      toast.success('Data export requested. You will receive it via email within 48 hours.')
    } catch {
      toast.error('Failed to request data export')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      await api.delete(`/gyms/${gymId}/data`)
      toast.success('Data deletion request submitted. Your data will be erased within 30 days.')
      setShowDeleteModal(false)
      setDeleteConfirm('')
    } catch {
      toast.error('Failed to submit data deletion request')
    } finally {
      setDeleting(false)
    }
  }

  const inputSty = {
    width: '100%', padding: `${sp(10)}px ${sp(14)}px`, background: theme.bgTer,
    border: `1px solid ${theme.borderStrong}`, borderRadius: 8, color: theme.text,
    fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      <div style={{
        background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
        borderRadius: 14, padding: sp(28), backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(28) }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: 'rgba(26,58,143,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color={theme.accent} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            Data & Privacy
          </h3>
        </div>

        <p style={{ fontSize: 14, color: theme.textSec, marginTop: 0, marginBottom: sp(24), lineHeight: 1.7, fontFamily: "'Inter', -apple-system, sans-serif" }}>
          Under the Digital Personal Data Protection (DPDP) Act 2023, you have the right to access, export, and delete your personal data.
          For questions, contact <a href="mailto:admin@ivira.app" style={{ color: theme.accent, textDecoration: 'underline' }}>admin@ivira.app</a>.
        </p>

        {/* Export Section */}
        <div style={{
          padding: sp(22), background: theme.bgTer, borderRadius: 12,
          border: `1px solid ${theme.borderStrong}`, marginBottom: sp(20),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Download size={18} color={theme.cyan || '#00D4FF'} />
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
              Request Data Export
            </span>
          </div>
          <p style={{ fontSize: 13, color: theme.textSec, marginTop: 0, marginBottom: sp(16), lineHeight: 1.6, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            Download a copy of all your gym data including members, payments, check-ins, and settings. The export will be sent to your registered email as a ZIP file within 48 hours.
          </p>
          <button onClick={handleExport} disabled={exporting} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: theme.accentSoft, color: theme.accent, border: `1px solid rgba(108,92,231,0.3)`,
            borderRadius: 10, padding: `${sp(10)}px ${sp(22)}px`, fontWeight: 600,
            cursor: exporting ? 'wait' : 'pointer', fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif",
            opacity: exporting ? 0.7 : 1, transition: 'opacity 0.2s',
          }}>
            <Download size={15} />
            {exporting ? 'Requesting...' : 'Export My Data'}
          </button>
        </div>

        {/* Delete Section */}
        <div style={{
          padding: sp(22), background: 'rgba(239,68,68,0.04)', borderRadius: 12,
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Trash2 size={18} color={theme.red || '#EF4444'} />
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.red || '#EF4444', fontFamily: "'Inter', -apple-system, sans-serif" }}>
              Delete My Data
            </span>
          </div>
          <p style={{ fontSize: 13, color: theme.textSec, marginTop: 0, marginBottom: sp(12), lineHeight: 1.6, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            Permanently delete all your gym data from I V I R A. This action is <strong style={{ color: theme.red || '#EF4444' }}>irreversible</strong>.
            Member records, payment history, check-in logs, and all associated data will be erased within 30 days.
            Payment records may be retained as required by applicable tax law.
          </p>
          <button onClick={() => setShowDeleteModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.1)', color: theme.red || '#EF4444',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
            padding: `${sp(10)}px ${sp(22)}px`, fontWeight: 600,
            cursor: 'pointer', fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif",
          }}>
            <Trash2 size={15} />
            Delete My Data
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, backdropFilter: 'blur(4px)',
        }} onClick={() => setShowDeleteModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
            borderRadius: 16, padding: sp(32), maxWidth: 440, width: '90%',
            boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: sp(20) }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={22} color={theme.red || '#EF4444'} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.text, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                Confirm Data Deletion
              </h3>
            </div>

            <p style={{ fontSize: 14, color: theme.textSec, lineHeight: 1.7, marginTop: 0, marginBottom: sp(20), fontFamily: "'Inter', -apple-system, sans-serif" }}>
              This will permanently erase all your gym data from I V I R A, including member records, payment history, and check-in logs.
              This action <strong style={{ color: theme.red || '#EF4444' }}>cannot be undone</strong>.
            </p>

            <div style={{ marginBottom: sp(20) }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.textSec, marginBottom: 6, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                Type <strong style={{ color: theme.red || '#EF4444' }}>DELETE</strong> to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                style={inputSty}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleteConfirm !== 'DELETE' || deleting} style={{
                flex: 1, background: deleteConfirm === 'DELETE' ? (theme.red || '#EF4444') : theme.bgHover,
                color: deleteConfirm === 'DELETE' ? '#fff' : theme.textTer,
                border: 'none', borderRadius: 10, padding: `${sp(12)}px ${sp(22)}px`,
                fontWeight: 700, cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif",
                opacity: deleting ? 0.7 : 1, transition: 'all 0.2s',
              }}>
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }} style={{
                flex: 1, background: theme.bgHover, color: theme.textSec,
                border: `1px solid ${theme.borderStrong}`, borderRadius: 10,
                padding: `${sp(12)}px ${sp(22)}px`, fontWeight: 600, cursor: 'pointer',
                fontSize: 14, fontFamily: "'Inter', -apple-system, sans-serif",
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ---- Main Settings Page ---- */
export default function Settings() {
  const { gym, updateGym } = useAuth()
  const gymId = gym?.id
  const { theme, density, setDensity, sp } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div>
      <div className="settings-container">
        <div style={{ marginBottom: sp(36) }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1.3, fontFamily: "'Inter', -apple-system, sans-serif" }}>Settings</h1>
          <p style={{ fontSize: 14, color: theme.textSec, marginTop: 6, marginBottom: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            Manage your gym configuration and preferences
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 4, background: theme.bgSec, borderRadius: 12, padding: 4,
          marginBottom: sp(28), border: `1px solid ${theme.borderStrong}`, width: 'fit-content',
          flexWrap: 'wrap',
        }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: `${sp(10)}px ${sp(22)}px`, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: "'Inter', -apple-system, sans-serif",
              background: activeTab === tab.id ? theme.accent : 'transparent',
              color: activeTab === tab.id ? '#fff' : theme.textSec,
              transition: 'all 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'profile' && <GymProfileTab gymId={gymId} gym={gym} updateGym={updateGym} theme={theme} sp={sp} />}
        {activeTab === 'plans' && <PlansTab gymId={gymId} theme={theme} sp={sp} />}
        {activeTab === 'language' && <LanguageTab gymId={gymId} gym={gym} updateGym={updateGym} theme={theme} sp={sp} />}
        {activeTab === 'notifications' && <NotificationsTab gymId={gymId} theme={theme} sp={sp} />}
        {activeTab === 'display' && <DisplayTab theme={theme} sp={sp} density={density} setDensity={setDensity} />}
        {activeTab === 'support' && <SupportTab gymId={gymId} gym={gym} theme={theme} sp={sp} />}
        {activeTab === 'privacy' && <DataPrivacyTab gymId={gymId} theme={theme} sp={sp} />}
      </div>

      <style>{`
        .settings-container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
        @media (max-width: 640px) { .settings-container { padding: 24px 16px; } }
      `}</style>
    </div>
  )
}
