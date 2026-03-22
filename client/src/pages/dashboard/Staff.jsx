import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonTable } from '../../components/ui'
import { formatPaise, formatDate } from '../../lib/utils'
import api from '../../lib/api'
import {
  UserCog, Plus, Search, ChevronRight, Phone, Mail as MailIcon,
  Calendar, DollarSign, Clock, Trash2, Edit3, X, Users,
  CheckCircle2, XCircle, AlertTriangle, Coffee, TrendingUp,
  Briefcase, Shield, Dumbbell, UserCheck,
} from 'lucide-react'

// ── Fonts ───────────────────────────────────────────────────────
const FONT = "'Inter', -apple-system, sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"

// ── Role config (theme-dependent) ───────────────────────────────
const getRoles = (theme) => [
  { value: 'trainer', label: 'Trainer', icon: Dumbbell, color: theme.green, bg: 'rgba(52,168,83,0.12)' },
  { value: 'manager', label: 'Manager', icon: Briefcase, color: theme.amber, bg: 'rgba(251,188,5,0.12)' },
  { value: 'front_desk', label: 'Front Desk', icon: UserCheck, color: theme.cyan, bg: 'rgba(66,133,244,0.10)' },
  { value: 'cleaner', label: 'Cleaner', icon: Coffee, color: theme.textSec, bg: `${theme.textTer}20` },
  { value: 'owner', label: 'Owner', icon: Shield, color: theme.accent, bg: theme.accentSoft },
]

const getRoleConfig = (role, theme) => {
  const roles = getRoles(theme)
  return roles.find(r => r.value === role) || roles[0]
}

const EMPTY_FORM = {
  name: '', phone: '', email: '', role: 'trainer',
  salary_paise: 0, join_date: '', notes: '',
  emergency_contact: '', id_proof_type: '', id_proof_number: '',
}

// ── Shared style helpers ────────────────────────────────────────
const getInputSty = (theme) => ({
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: `1px solid ${theme.border}`, background: theme.bgInput, color: theme.text,
  fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
})

const getLabelSty = (theme) => ({
  display: 'block', fontSize: 11, fontWeight: 700, color: theme.textTer,
  marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1,
})

// ── Components ─────────────────────────────────────────────────

function StaffAvatar({ name, role, size = 42, theme }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const cfg = getRoleConfig(role, theme)
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)`,
      border: `1.5px solid ${cfg.color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800, color: cfg.color,
      fontFamily: FONT, flexShrink: 0, letterSpacing: 1,
    }}>{initials}</div>
  )
}

function RoleBadge({ role, theme }) {
  const cfg = getRoleConfig(role, theme)
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
      background: cfg.bg, color: cfg.color, fontFamily: FONT,
    }}>
      <Icon size={11} />
      {role?.replace('_', ' ')}
    </span>
  )
}

function StatusDot({ status, theme }) {
  const isActive = (status || 'active') === 'active'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: isActive ? 'rgba(52,168,83,0.12)' : 'rgba(234,67,53,0.12)',
      color: isActive ? theme.green : theme.red,
      fontFamily: FONT,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isActive ? theme.green : theme.red,
        boxShadow: isActive ? `0 0 6px ${theme.green}60` : 'none',
      }} />
      {status || 'active'}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color, sub, theme }) {
  return (
    <div style={{
      background: theme.bgSec, borderRadius: 14, border: `1px solid ${theme.border}`,
      padding: '18px 20px', flex: 1, minWidth: 140,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: theme.text, fontFamily: FONT_MONO, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: theme.textTer, marginTop: 4, fontFamily: FONT }}>{sub}</div>}
    </div>
  )
}

function FormField({ label, children, half, theme }) {
  const labelSty = getLabelSty(theme)
  return (
    <div style={{ marginBottom: 16, flex: half ? '1 1 45%' : '1 1 100%', minWidth: half ? 160 : 'auto' }}>
      <label style={labelSty}>{label}</label>
      {children}
    </div>
  )
}

// ── Staff Detail Slide-Over ────────────────────────────────────
function StaffDetail({ staff, onClose, gymId, onUpdate }) {
  const { theme } = useTheme()
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')

  const inputSty = getInputSty(theme)
  const labelSty = getLabelSty(theme)
  const ROLES = getRoles(theme)

  const { data: detailData } = useQuery({
    queryKey: ['staff-detail', gymId, staff.id],
    queryFn: () => api.get(`/gyms/${gymId}/staff/${staff.id}`).then(r => r.data || r),
    enabled: !!staff.id,
  })

  const { data: attendanceData } = useQuery({
    queryKey: ['staff-attendance', gymId, staff.id],
    queryFn: () => api.get(`/gyms/${gymId}/staff/attendance`, {
      params: { staffId: staff.id, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    }).then(r => r.data || r),
    enabled: !!staff.id && tab === 'attendance',
  })

  const terminateMut = useMutation({
    mutationFn: () => api.delete(`/gyms/${gymId}/staff/${staff.id}`),
    onSuccess: () => {
      toast.success('Staff terminated')
      qc.invalidateQueries({ queryKey: ['staff'] })
      onClose()
    },
    onError: () => toast.error('Failed to terminate'),
  })

  const detail = detailData?.staff || staff
  const attnSummary = detail?.attendance_summary
  const attendance = attendanceData?.attendance || []

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480,
        background: theme.bgSec, borderLeft: `1px solid ${theme.border}`,
        overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
        animation: 'slideIn 0.25s ease-out',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{
          padding: '24px 24px 0', borderBottom: `1px solid ${theme.border}`,
          background: `linear-gradient(180deg, ${theme.bgTer} 0%, ${theme.bgSec} 100%)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <StaffAvatar name={detail.name} role={detail.role} size={52} theme={theme} />
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.text, fontFamily: FONT, margin: 0 }}>
                  {detail.name}
                </h2>
                <div style={{ marginTop: 6 }}><RoleBadge role={detail.role} theme={theme} /></div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: theme.bgTer, border: `1px solid ${theme.border}`, borderRadius: 8,
              padding: 6, cursor: 'pointer', color: theme.textTer, display: 'flex',
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5,
                color: tab === t.id ? theme.brandAccent : theme.textTer,
                borderBottom: tab === t.id ? `2px solid ${theme.brandAccent}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {tab === 'overview' && (
            <>
              {/* Contact info */}
              <div style={{
                background: theme.bgTer, borderRadius: 12, padding: 16, marginBottom: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Phone size={14} color={theme.textTer} />
                  <span style={{ fontSize: 14, color: theme.text, fontFamily: FONT_MONO }}>{detail.phone || '--'}</span>
                </div>
                {detail.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MailIcon size={14} color={theme.textTer} />
                    <span style={{ fontSize: 14, color: theme.textSec }}>{detail.email}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={14} color={theme.textTer} />
                  <span style={{ fontSize: 13, color: theme.textSec }}>Joined {formatDate(detail.join_date || detail.created_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DollarSign size={14} color={theme.textTer} />
                  <span style={{ fontSize: 14, fontFamily: FONT_MONO, color: theme.green, fontWeight: 600 }}>
                    {detail.salary_paise ? formatPaise(detail.salary_paise) : '--'}
                    <span style={{ color: theme.textTer, fontWeight: 400 }}>/mo</span>
                  </span>
                </div>
                {detail.emergency_contact && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={14} color={theme.textTer} />
                    <span style={{ fontSize: 13, color: theme.textSec }}>Emergency: {detail.emergency_contact}</span>
                  </div>
                )}
              </div>

              {/* Attendance summary (this month) */}
              {attnSummary && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    This Month's Attendance
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Present', val: attnSummary.present, color: theme.green, Icon: CheckCircle2 },
                      { label: 'Half Day', val: attnSummary.half_day, color: theme.amber, Icon: Clock },
                      { label: 'Absent', val: attnSummary.absent, color: theme.red, Icon: XCircle },
                      { label: 'Leave', val: attnSummary.leave, color: theme.cyan, Icon: Coffee },
                    ].map(a => (
                      <div key={a.label} style={{
                        background: theme.bgTer, borderRadius: 10, padding: '12px 10px',
                        textAlign: 'center',
                      }}>
                        <a.Icon size={16} color={a.color} style={{ marginBottom: 4 }} />
                        <div style={{ fontSize: 20, fontWeight: 800, color: a.color, fontFamily: FONT_MONO }}>{a.val}</div>
                        <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5 }}>{a.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {detail.notes && (
                <div style={{ marginBottom: 20 }}>
                  <div style={labelSty}>Notes</div>
                  <div style={{
                    background: theme.bgTer, borderRadius: 10, padding: 14,
                    fontSize: 13, color: theme.textSec, lineHeight: 1.6,
                  }}>{detail.notes}</div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24, borderTop: `1px solid ${theme.border}`, paddingTop: 20 }}>
                <button onClick={() => onUpdate(detail)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: 10, border: `1px solid ${theme.border}`,
                  background: theme.bgTer, color: theme.textSec, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: FONT,
                }}>
                  <Edit3 size={14} /> Edit
                </button>
                {detail.status !== 'terminated' && (
                  <button
                    onClick={() => { if (confirm('Terminate this staff member?')) terminateMut.mutate() }}
                    disabled={terminateMut.isPending}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 10, border: `1px solid ${theme.red}30`,
                      background: 'rgba(234,67,53,0.12)', color: theme.red, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: FONT,
                    }}
                  >
                    <Trash2 size={14} /> Terminate
                  </button>
                )}
              </div>
            </>
          )}

          {tab === 'attendance' && (
            <div>
              {attendance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textTer }}>
                  <Clock size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div style={{ fontSize: 14 }}>No attendance records this month</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {attendance.map(a => {
                    const statusStyles = {
                      present: { color: theme.green, bg: 'rgba(52,168,83,0.12)', icon: CheckCircle2 },
                      absent: { color: theme.red, bg: 'rgba(234,67,53,0.12)', icon: XCircle },
                      half_day: { color: theme.amber, bg: 'rgba(251,188,5,0.12)', icon: Clock },
                      leave: { color: theme.cyan, bg: 'rgba(66,133,244,0.10)', icon: Coffee },
                    }
                    const st = statusStyles[a.status] || statusStyles.present
                    const Icon = st.icon
                    return (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: theme.bgTer, borderRadius: 8, padding: '10px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6, background: st.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon size={14} color={st.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>{formatDate(a.date)}</div>
                            {(a.check_in || a.check_out) && (
                              <div style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT_MONO }}>
                                {a.check_in || '--'} → {a.check_out || '--'}
                              </div>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: st.color,
                          textTransform: 'uppercase', fontFamily: FONT, letterSpacing: 0.5,
                        }}>{a.status?.replace('_', ' ')}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Staff Modal ───────────────────────────────────────
function StaffFormModal({ open, onClose, initialData, gymId, onSuccess }) {
  const { theme } = useTheme()
  const toast = useToast()
  const qc = useQueryClient()
  const isEdit = !!initialData?.id

  const inputSty = getInputSty(theme)
  const ROLES = getRoles(theme)

  const [form, setForm] = useState(() => {
    if (initialData?.id) {
      return {
        name: initialData.name || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        role: initialData.role || 'trainer',
        salary_paise: initialData.salary_paise || 0,
        join_date: initialData.join_date ? initialData.join_date.slice(0, 10) : '',
        notes: initialData.notes || '',
        emergency_contact: initialData.emergency_contact || '',
        id_proof_type: initialData.id_proof_type || '',
        id_proof_number: initialData.id_proof_number || '',
      }
    }
    return { ...EMPTY_FORM }
  })

  const [showMore, setShowMore] = useState(false)

  const mutation = useMutation({
    mutationFn: (body) => isEdit
      ? api.put(`/gyms/${gymId}/staff/${initialData.id}`, body)
      : api.post(`/gyms/${gymId}/staff`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      toast.success(isEdit ? 'Staff updated' : 'Staff member added')
      onSuccess?.()
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'add'} staff`),
  })

  const handleSubmit = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return toast.error('Name must be at least 2 characters')
    if (!form.phone.trim() || form.phone.trim().length < 10) return toast.error('Enter a valid phone number')

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      salary_paise: form.salary_paise || 0,
    }
    // Only include optional fields if they have values
    if (form.email.trim()) payload.email = form.email.trim()
    if (form.join_date) payload.join_date = form.join_date
    if (form.notes.trim()) payload.notes = form.notes.trim()
    if (form.emergency_contact.trim()) payload.emergency_contact = form.emergency_contact.trim()
    if (form.id_proof_type) payload.id_proof_type = form.id_proof_type
    if (form.id_proof_number.trim()) payload.id_proof_number = form.id_proof_number.trim()

    mutation.mutate(payload)
  }

  if (!open) return null

  const salaryRs = form.salary_paise / 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
        margin: 16, background: theme.bgSec, borderRadius: 20,
        border: `1px solid ${theme.border}`, padding: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.text, fontFamily: FONT, margin: 0 }}>
            {isEdit ? 'Edit Staff' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} style={{
            background: theme.bgTer, border: `1px solid ${theme.border}`, borderRadius: 8,
            padding: 6, cursor: 'pointer', color: theme.textTer, display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Main fields */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px' }}>
          <FormField label="Full Name" half theme={theme}>
            <input
              style={inputSty} placeholder="e.g. Raj Kumar"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </FormField>
          <FormField label="Phone" half theme={theme}>
            <input
              style={{ ...inputSty, fontFamily: FONT_MONO }} placeholder="9876543210"
              maxLength={10} inputMode="numeric"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
            />
          </FormField>
          <FormField label="Email" half theme={theme}>
            <input
              style={inputSty} type="email" placeholder="raj@gym.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Monthly Salary" half theme={theme}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, color: theme.textTer, fontFamily: FONT_MONO, pointerEvents: 'none',
              }}>Rs</span>
              <input
                style={{ ...inputSty, fontFamily: FONT_MONO, paddingLeft: 40 }}
                type="number" min="0" step="1000"
                value={salaryRs || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0
                  setForm({ ...form, salary_paise: Math.round(val * 100) })
                }}
                placeholder="0"
              />
            </div>
          </FormField>
        </div>

        {/* Role Selection */}
        <FormField label="Role" theme={theme}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROLES.filter(r => r.value !== 'owner').map(r => {
              const sel = form.role === r.value
              const Icon = r.icon
              return (
                <button key={r.value} onClick={() => setForm({ ...form, role: r.value })} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                  border: sel ? `1.5px solid ${r.color}60` : `1px solid ${theme.border}`,
                  background: sel ? r.bg : theme.bgTer,
                  color: sel ? r.color : theme.textSec,
                  fontSize: 13, fontWeight: 600, fontFamily: FONT,
                  transition: 'all 0.2s',
                }}>
                  <Icon size={14} />
                  {r.label}
                </button>
              )
            })}
          </div>
        </FormField>

        {/* Expandable additional fields */}
        {!showMore ? (
          <button onClick={() => setShowMore(true)} style={{
            background: 'none', border: 'none', color: theme.textTer, fontSize: 13,
            cursor: 'pointer', fontFamily: FONT, padding: '4px 0', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Plus size={12} /> More details (optional)
          </button>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px' }}>
            <FormField label="Join Date" half theme={theme}>
              <input
                style={inputSty} type="date"
                value={form.join_date}
                onChange={e => setForm({ ...form, join_date: e.target.value })}
              />
            </FormField>
            <FormField label="Emergency Contact" half theme={theme}>
              <input
                style={inputSty} placeholder="Contact number"
                value={form.emergency_contact}
                onChange={e => setForm({ ...form, emergency_contact: e.target.value })}
              />
            </FormField>
            <FormField label="ID Proof Type" half theme={theme}>
              <select
                style={{ ...inputSty, appearance: 'none', cursor: 'pointer' }}
                value={form.id_proof_type}
                onChange={e => setForm({ ...form, id_proof_type: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN Card</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
                <option value="voter_id">Voter ID</option>
              </select>
            </FormField>
            <FormField label="ID Proof Number" half theme={theme}>
              <input
                style={{ ...inputSty, fontFamily: FONT_MONO }} placeholder="XXXX-XXXX-XXXX"
                value={form.id_proof_number}
                onChange={e => setForm({ ...form, id_proof_number: e.target.value })}
              />
            </FormField>
            <FormField label="Notes" theme={theme}>
              <textarea
                style={{ ...inputSty, resize: 'vertical', minHeight: 60 }}
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </FormField>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{
            padding: '11px 22px', borderRadius: 10, cursor: 'pointer',
            background: theme.bgTer, border: `1px solid ${theme.border}`,
            color: theme.textSec, fontSize: 14, fontWeight: 600, fontFamily: FONT,
          }}>Cancel</button>
          <button
            disabled={mutation.isPending || !form.name.trim() || !form.phone.trim()}
            onClick={handleSubmit}
            style={{
              padding: '11px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: theme.brandAccent, color: '#fff', fontSize: 14, fontWeight: 700,
              fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5,
              opacity: mutation.isPending ? 0.6 : 1, transition: 'opacity 0.2s',
            }}
          >{mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Staff'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Staff Page ────────────────────────────────────────────
export default function Staff() {
  const { theme } = useTheme()
  const { gym } = useAuth()
  const gymId = gym?.id
  const toast = useToast()
  const qc = useQueryClient()

  const ROLES = getRoles(theme)
  const inputSty = getInputSty(theme)

  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [view, setView] = useState('grid') // grid | table

  const { data, isLoading } = useQuery({
    queryKey: ['staff', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/staff`).then(r => r.data || r),
    enabled: !!gymId,
  })

  const staff = useMemo(() => {
    let list = data?.staff || data || []
    if (!Array.isArray(list)) list = []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q) || s.email?.toLowerCase().includes(q))
    }
    if (filterRole) list = list.filter(s => s.role === filterRole)
    return list
  }, [data, search, filterRole])

  // Stats
  const allStaff = data?.staff || data || []
  const totalStaff = Array.isArray(allStaff) ? allStaff.length : 0
  const activeCount = Array.isArray(allStaff) ? allStaff.filter(s => s.status === 'active').length : 0
  const totalSalary = Array.isArray(allStaff) ? allStaff.reduce((sum, s) => sum + (s.salary_paise || 0), 0) : 0
  const trainers = Array.isArray(allStaff) ? allStaff.filter(s => s.role === 'trainer').length : 0

  const openAdd = () => { setEditData(null); setShowForm(true) }
  const openEdit = (s) => { setEditData(s); setShowForm(true); setSelectedStaff(null) }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={24} color={theme.accent} />
          </div>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: theme.text, fontFamily: FONT, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
              Staff Management
            </h1>
            <p style={{ color: theme.textSec, fontSize: 14, margin: 0, marginTop: 2 }}>
              {totalStaff} team member{totalStaff !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={openAdd} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: theme.brandAccent, color: '#fff', fontSize: 14, fontWeight: 700,
          fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5,
          boxShadow: `0 4px 20px ${theme.brandAccent}4D`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 24px ${theme.brandAccent}66` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${theme.brandAccent}4D` }}
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={Users} label="Total Staff" value={totalStaff} color={theme.accent} theme={theme} />
        <StatCard icon={CheckCircle2} label="Active" value={activeCount} color={theme.green} theme={theme} />
        <StatCard icon={Dumbbell} label="Trainers" value={trainers} color={theme.cyan} theme={theme} />
        <StatCard icon={TrendingUp} label="Monthly Payroll" value={formatPaise(totalSalary)} color={theme.amber} sub="base salary" theme={theme} />
      </div>

      {/* ── Search & Filters ────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} color={theme.textTer} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            placeholder="Search by name, phone, or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputSty, paddingLeft: 40 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setFilterRole('')} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: FONT,
            background: !filterRole ? theme.accentSoft : theme.bgTer,
            color: !filterRole ? theme.accent : theme.textTer,
          }}>All</button>
          {ROLES.filter(r => r.value !== 'owner').map(r => (
            <button key={r.value} onClick={() => setFilterRole(filterRole === r.value ? '' : r.value)} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: FONT,
              background: filterRole === r.value ? r.bg : theme.bgTer,
              color: filterRole === r.value ? r.color : theme.textTer,
              transition: 'all 0.2s',
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* ── Staff Grid/Table ────────────────────────────────── */}
      {isLoading ? <SkeletonTable rows={4} cols={5} /> : staff.length === 0 ? (
        <div style={{
          background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.border}`,
          padding: '56px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: theme.accentSoft,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <UserCog size={32} color={theme.accent} />
          </div>
          <h3 style={{ color: theme.text, fontSize: 20, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>
            {search || filterRole ? 'No matching staff' : 'No staff members yet'}
          </h3>
          <p style={{ color: theme.textSec, fontSize: 14, marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' }}>
            {search || filterRole ? 'Try adjusting your search or filter' : 'Add trainers, managers, and front desk staff to your team'}
          </p>
          {!search && !filterRole && (
            <button onClick={openAdd} style={{
              padding: '11px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: theme.brandAccent, color: '#fff', fontSize: 14, fontWeight: 700,
              fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>Add Your First Staff</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {staff.map(s => {
            const cfg = getRoleConfig(s.role, theme)
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStaff(s)}
                style={{
                  background: theme.bgSec, borderRadius: 14, border: `1px solid ${theme.border}`,
                  padding: 20, cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${cfg.color}30`
                  e.currentTarget.style.background = theme.bgHover
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme.border
                  e.currentTarget.style.background = theme.bgSec
                }}
              >
                {/* Accent line at top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${cfg.color}60, transparent)`,
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <StaffAvatar name={s.name} role={s.role} size={44} theme={theme} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: theme.text, fontFamily: FONT }}>{s.name}</div>
                      <div style={{ marginTop: 4 }}><RoleBadge role={s.role} theme={theme} /></div>
                    </div>
                  </div>
                  <StatusDot status={s.status} theme={theme} />
                </div>

                <div style={{
                  display: 'flex', gap: 16, marginTop: 16, paddingTop: 14,
                  borderTop: `1px solid ${theme.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} color={theme.textTer} />
                    <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT_MONO }}>{s.phone}</span>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DollarSign size={12} color={theme.green} />
                    <span style={{ fontSize: 13, color: theme.green, fontWeight: 700, fontFamily: FONT_MONO }}>
                      {s.salary_paise ? formatPaise(s.salary_paise) : '--'}
                    </span>
                    <span style={{ fontSize: 11, color: theme.textTer }}>/mo</span>
                  </div>
                </div>

                {/* Hover arrow */}
                <ChevronRight size={16} color={theme.textTer} style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  opacity: 0.3,
                }} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      <StaffFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditData(null) }}
        initialData={editData}
        gymId={gymId}
        onSuccess={() => setEditData(null)}
      />

      {selectedStaff && (
        <StaffDetail
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          gymId={gymId}
          onUpdate={openEdit}
        />
      )}
    </div>
  )
}
