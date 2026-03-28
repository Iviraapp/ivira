import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import {
  Settings as SettingsIcon, Building2, CreditCard, Bell, Users2, Wifi,
  Save, Plus, X, Phone, Mail, Clock, MapPin, FileText, Image,
  ToggleLeft, ToggleRight, Trash2, Edit3, Shield,
} from 'lucide-react'

const CARD = { background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: 24, marginBottom: 24, borderTop: '3px solid #10B981' }
const LABEL = { color: '#9CA3AF', fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }
const INPUT = {
  width: '100%', padding: '10px 12px', background: '#0D1117', border: '1px solid #1F2937',
  borderRadius: 8, color: '#F9FAFB', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const BTN_PRIMARY = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
  background: '#10B981', color: '#fff', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const BTN_SECONDARY = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
  background: '#1F2937', color: '#F9FAFB', border: '1px solid #374151', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const SECTION_TITLE = { color: '#F9FAFB', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }
const SECTION_DESC = { color: '#6B7280', fontSize: 13, margin: '4px 0 20px' }

const TABS = [
  { key: 'profile', label: 'Gym Profile', icon: Building2 },
  { key: 'plans', label: 'Membership Plans', icon: CreditCard },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'staff', label: 'Staff', icon: Users2 },
  { key: 'nfc', label: 'NFC Tags', icon: Wifi },
]

export default function Settings() {
  const { gymId, gym } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#F9FAFB', fontSize: 24, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Manage your gym configuration</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: activeTab === tab.key ? '#10B98120' : 'transparent',
              border: activeTab === tab.key ? '1px solid #10B98140' : '1px solid transparent',
              borderRadius: 8, color: activeTab === tab.key ? '#10B981' : '#6B7280',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <GymProfileSection gymId={gymId} gym={gym} />}
      {activeTab === 'plans' && <MembershipPlansSection gymId={gymId} />}
      {activeTab === 'notifications' && <NotificationSettingsSection gymId={gymId} />}
      {activeTab === 'staff' && <StaffSection gymId={gymId} />}
      {activeTab === 'nfc' && <NfcTagsSection gymId={gymId} />}
    </div>
  )
}

/* ─── Gym Profile ─── */
function GymProfileSection({ gymId, gym }) {
  const [form, setForm] = useState({
    name: '', address: '', city: '', phone: '', email: '',
    operating_hours: '', description: '', logo_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (gym) {
      setForm({
        name: gym.name || '',
        address: gym.address || '',
        city: gym.city || '',
        phone: gym.phone || '',
        email: gym.email || '',
        operating_hours: gym.operating_hours || '',
        description: gym.description || '',
        logo_url: gym.logo_url || '',
      })
    }
  }, [gym])

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/gyms/${gymId}`, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save gym profile:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={CARD}>
      <h2 style={SECTION_TITLE}><Building2 size={20} color="#10B981" /> Gym Profile</h2>
      <p style={SECTION_DESC}>Basic information about your gym</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div>
          <label style={LABEL}>Gym Name</label>
          <input style={INPUT} value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Your gym name" />
        </div>
        <div>
          <label style={LABEL}>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={14} style={{ position: 'absolute', left: 12, top: 13, color: '#6B7280' }} />
            <input style={{ ...INPUT, paddingLeft: 34 }} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="gym@example.com" />
          </div>
        </div>
        <div>
          <label style={LABEL}>Phone</label>
          <div style={{ position: 'relative' }}>
            <Phone size={14} style={{ position: 'absolute', left: 12, top: 13, color: '#6B7280' }} />
            <input style={{ ...INPUT, paddingLeft: 34 }} value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 9876543210" />
          </div>
        </div>
        <div>
          <label style={LABEL}>City</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={14} style={{ position: 'absolute', left: 12, top: 13, color: '#6B7280' }} />
            <input style={{ ...INPUT, paddingLeft: 34 }} value={form.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="City" />
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL}>Address</label>
          <input style={INPUT} value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Full address" />
        </div>
        <div>
          <label style={LABEL}>Operating Hours</label>
          <div style={{ position: 'relative' }}>
            <Clock size={14} style={{ position: 'absolute', left: 12, top: 13, color: '#6B7280' }} />
            <input style={{ ...INPUT, paddingLeft: 34 }} value={form.operating_hours} onChange={(e) => handleChange('operating_hours', e.target.value)} placeholder="6:00 AM - 10:00 PM" />
          </div>
        </div>
        <div>
          <label style={LABEL}>Logo URL</label>
          <div style={{ position: 'relative' }}>
            <Image size={14} style={{ position: 'absolute', left: 12, top: 13, color: '#6B7280' }} />
            <input style={{ ...INPUT, paddingLeft: 34 }} value={form.logo_url} onChange={(e) => handleChange('logo_url', e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL}>Description</label>
          <textarea
            style={{ ...INPUT, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Tell members about your gym..."
          />
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span style={{ color: '#22C55E', fontSize: 13, fontWeight: 500 }}>Saved successfully</span>}
      </div>
    </div>
  )
}

/* ─── Membership Plans ─── */
function MembershipPlansSection({ gymId }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', price: '', duration_days: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!gymId) return
    api.get(`/gyms/${gymId}/plans`)
      .then((res) => setPlans(res.data?.plans || res.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }, [gymId])

  const handleAdd = async () => {
    setSubmitting(true)
    try {
      const res = await api.post(`/gyms/${gymId}/plans`, {
        ...planForm,
        price: Number(planForm.price),
        duration_days: Number(planForm.duration_days),
      })
      setPlans((prev) => [...prev, res.data])
      setShowModal(false)
      setPlanForm({ name: '', price: '', duration_days: '', description: '' })
    } catch (err) {
      console.error('Failed to add plan:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={SECTION_TITLE}><CreditCard size={20} color="#10B981" /> Membership Plans</h2>
        <button style={BTN_PRIMARY} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Plan
        </button>
      </div>
      <p style={SECTION_DESC}>Configure the plans members can subscribe to</p>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>Loading plans...</div>
      ) : plans.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>No plans configured yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{
              background: '#0D1117', border: '1px solid #1F2937', borderRadius: 10, padding: 16,
              borderTop: '3px solid #10B981',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ color: '#F9FAFB', fontSize: 15, fontWeight: 600 }}>{plan.name}</div>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: plan.status === 'active' || !plan.status ? '#22C55E20' : '#EF444420',
                  color: plan.status === 'active' || !plan.status ? '#22C55E' : '#EF4444',
                  textTransform: 'capitalize',
                }}>
                  {plan.status || 'active'}
                </span>
              </div>
              <div style={{ color: '#10B981', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {'\u20B9'}{plan.price}
              </div>
              <div style={{ color: '#6B7280', fontSize: 12 }}>
                {plan.duration_days} days
              </div>
              {plan.description && (
                <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>{plan.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Plan Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#111827', border: '1px solid #1F2937', borderRadius: 16,
            padding: 28, width: 420, maxWidth: '90vw', zIndex: 1000,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#F9FAFB', fontSize: 18, fontWeight: 700, margin: 0 }}>Add Membership Plan</h3>
              <button onClick={() => setShowModal(false)} style={{ background: '#1F2937', border: 'none', color: '#9CA3AF', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LABEL}>Plan Name</label>
                <input style={INPUT} value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Monthly Premium" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>Price ({'\u20B9'})</label>
                  <input style={INPUT} type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="999" />
                </div>
                <div>
                  <label style={LABEL}>Duration (days)</label>
                  <input style={INPUT} type="number" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} placeholder="30" />
                </div>
              </div>
              <div>
                <label style={LABEL}>Description (optional)</label>
                <textarea style={{ ...INPUT, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Plan details..." />
              </div>
              <button style={{ ...BTN_PRIMARY, justifyContent: 'center', marginTop: 4, opacity: submitting ? 0.7 : 1 }} onClick={handleAdd} disabled={submitting || !planForm.name || !planForm.price}>
                {submitting ? 'Adding...' : 'Add Plan'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Notification Settings ─── */
function NotificationSettingsSection({ gymId }) {
  const [settings, setSettings] = useState({
    whatsapp_enabled: false, sms_enabled: false, email_enabled: false,
    payment_reminders: true, expiry_alerts: true, checkin_summary: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!gymId) return
    api.get(`/gyms/${gymId}/notification-settings`)
      .then((res) => { if (res.data) setSettings(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gymId])

  const handleToggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/gyms/${gymId}/notification-settings`, settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save notification settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ label, description, settingKey }) => {
    const enabled = settings[settingKey]
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid #1F2937',
      }}>
        <div>
          <div style={{ color: '#F9FAFB', fontSize: 14, fontWeight: 500 }}>{label}</div>
          {description && <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{description}</div>}
        </div>
        <button
          onClick={() => handleToggle(settingKey)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          {enabled
            ? <ToggleRight size={28} color="#10B981" />
            : <ToggleLeft size={28} color="#4B5563" />
          }
        </button>
      </div>
    )
  }

  if (loading) return <div style={{ ...CARD, textAlign: 'center', color: '#6B7280' }}>Loading notification settings...</div>

  return (
    <div style={CARD}>
      <h2 style={SECTION_TITLE}><Bell size={20} color="#10B981" /> Notification Settings</h2>
      <p style={SECTION_DESC}>Configure how and when notifications are sent</p>

      <div style={{ marginBottom: 24 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Channels</div>
        <Toggle label="WhatsApp" description="Send notifications via WhatsApp" settingKey="whatsapp_enabled" />
        <Toggle label="SMS" description="Send notifications via SMS" settingKey="sms_enabled" />
        <Toggle label="Email" description="Send notifications via email" settingKey="email_enabled" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Triggers</div>
        <Toggle label="Payment Reminders" description="Notify members about pending payments" settingKey="payment_reminders" />
        <Toggle label="Expiry Alerts" description="Alert members before membership expires" settingKey="expiry_alerts" />
        <Toggle label="Check-in Summary" description="Daily check-in summary for gym owner" settingKey="checkin_summary" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span style={{ color: '#22C55E', fontSize: 13, fontWeight: 500 }}>Saved successfully</span>}
      </div>
    </div>
  )
}

/* ─── Staff Management ─── */
function StaffSection({ gymId }) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [staffForm, setStaffForm] = useState({ name: '', phone: '', email: '', role: 'trainer' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!gymId) return
    api.get(`/gyms/${gymId}/staff`)
      .then((res) => setStaff(res.data?.staff || res.data || []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }, [gymId])

  const handleAdd = async () => {
    setSubmitting(true)
    try {
      const res = await api.post(`/gyms/${gymId}/staff`, staffForm)
      setStaff((prev) => [...prev, res.data])
      setShowModal(false)
      setStaffForm({ name: '', phone: '', email: '', role: 'trainer' })
    } catch (err) {
      console.error('Failed to add staff:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const ROLE_COLORS = {
    admin: { bg: '#7C3AED20', color: '#A78BFA' },
    trainer: { bg: '#3B82F620', color: '#60A5FA' },
    receptionist: { bg: '#F59E0B20', color: '#FBBF24' },
    manager: { bg: '#10B98120', color: '#34D399' },
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={SECTION_TITLE}><Users2 size={20} color="#10B981" /> Staff Management</h2>
        <button style={BTN_PRIMARY} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Staff
        </button>
      </div>
      <p style={SECTION_DESC}>Manage team members and their roles</p>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>Loading staff...</div>
      ) : staff.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>No staff members added yet</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937' }}>
                {['Name', 'Phone', 'Role', 'Status'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', color: '#6B7280',
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const rc = ROLE_COLORS[s.role] || ROLE_COLORS.trainer
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #1F293750' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: '#1F2937',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#9CA3AF', fontSize: 12, fontWeight: 700,
                        }}>
                          {(s.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#F9FAFB', fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                          {s.email && <div style={{ color: '#6B7280', fontSize: 11 }}>{s.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 13, fontFamily: 'monospace' }}>
                      {s.phone || '\u2014'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: rc.bg, color: rc.color, textTransform: 'capitalize',
                      }}>
                        {s.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: s.status === 'active' || !s.status ? '#22C55E20' : '#EF444420',
                        color: s.status === 'active' || !s.status ? '#22C55E' : '#EF4444',
                        textTransform: 'capitalize',
                      }}>
                        {s.status || 'active'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#111827', border: '1px solid #1F2937', borderRadius: 16,
            padding: 28, width: 420, maxWidth: '90vw', zIndex: 1000,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#F9FAFB', fontSize: 18, fontWeight: 700, margin: 0 }}>Add Staff Member</h3>
              <button onClick={() => setShowModal(false)} style={{ background: '#1F2937', border: 'none', color: '#9CA3AF', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LABEL}>Full Name</label>
                <input style={INPUT} value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Staff member name" />
              </div>
              <div>
                <label style={LABEL}>Phone</label>
                <input style={INPUT} value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="+91 9876543210" />
              </div>
              <div>
                <label style={LABEL}>Email (optional)</label>
                <input style={INPUT} value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@example.com" />
              </div>
              <div>
                <label style={LABEL}>Role</label>
                <select
                  style={{ ...INPUT, appearance: 'auto' }}
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                >
                  <option value="trainer">Trainer</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button style={{ ...BTN_PRIMARY, justifyContent: 'center', marginTop: 4, opacity: submitting ? 0.7 : 1 }} onClick={handleAdd} disabled={submitting || !staffForm.name}>
                {submitting ? 'Adding...' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── NFC Tags ─── */
function NfcTagsSection({ gymId }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gymId) return
    api.get(`/gyms/${gymId}/nfc-tags`)
      .then((res) => setTags(res.data?.tags || res.data || []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [gymId])

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={SECTION_TITLE}><Wifi size={20} color="#10B981" /> NFC Tags</h2>
        <button style={BTN_PRIMARY}>
          <Plus size={16} /> Register Tag
        </button>
      </div>
      <p style={SECTION_DESC}>Manage NFC tags for contactless check-ins</p>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>Loading NFC tags...</div>
      ) : tags.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Wifi size={40} color="#1F2937" style={{ marginBottom: 12 }} />
          <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 4 }}>No NFC tags registered</div>
          <div style={{ color: '#4B5563', fontSize: 12 }}>Register NFC tags to enable contactless check-ins for your members</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {tags.map((tag) => (
            <div key={tag.id} style={{
              background: '#0D1117', border: '1px solid #1F2937', borderRadius: 10, padding: 16,
              borderTop: '3px solid #10B981',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Shield size={16} color="#10B981" />
                <div style={{ color: '#F9FAFB', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                  {tag.tag_id || tag.uid}
                </div>
              </div>
              {tag.member_name && (
                <div style={{ color: '#9CA3AF', fontSize: 12 }}>Assigned to: {tag.member_name}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: tag.status === 'active' ? '#22C55E20' : '#EF444420',
                  color: tag.status === 'active' ? '#22C55E' : '#EF4444',
                  textTransform: 'capitalize',
                }}>
                  {tag.status || 'active'}
                </span>
                {tag.last_used && (
                  <span style={{ color: '#6B7280', fontSize: 11 }}>
                    Last used: {new Date(tag.last_used).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
