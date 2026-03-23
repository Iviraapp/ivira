import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { SlideOver } from '../../components/ui/Modal'
import { formatDate, formatPaise, debounce, getInitials } from '../../lib/utils'
import api from '../../lib/api'
import { Plus, Search, Download, Upload, UserPlus, Phone, Mail, Calendar, QrCode, Grid3x3, List, ChevronLeft, ChevronRight, X, AlertTriangle, MessageCircle, UserCheck, RefreshCw, FileSpreadsheet, ArrowRight, Check, AlertCircle, Loader2, ChevronDown, IndianRupee, Clock, Save } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import { useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_D = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
]

const EMPTY_FORM = { name: '', phone: '', email: '', plan_id: '', notes: '' }

// Timezone-safe: extract YYYY-MM-DD then compare as local dates
function toLocalDate(dateStr) {
  if (!dateStr) return null
  // Handle ISO strings like "2026-03-21T00:00:00.000Z" — extract date part only
  const d = String(dateStr).slice(0, 10) // "YYYY-MM-DD"
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day) // local midnight, no UTC shift
}

function getDaysLeft(endDate) {
  if (!endDate) return null
  const end = toLocalDate(endDate)
  if (!end || isNaN(end)) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}

function isExpiringSoon(endDate) {
  const days = getDaysLeft(endDate)
  return days !== null && days >= 0 && days <= 7
}

function statusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return { bg: `${theme.statusActive}15`, color: theme.statusActive, dot: theme.statusActive }
  if (s === 'expired') return { bg: `${theme.statusExpired}15`, color: theme.statusExpired, dot: theme.statusExpired }
  if (s === 'paused' || s === 'suspended') return { bg: `${theme.amber}15`, color: theme.amber, dot: theme.amber }
  return { bg: `${theme.statusInactive}15`, color: theme.statusInactive, dot: theme.statusInactive }
}

function getTierFromPlan(planName, theme) {
  if (!planName) return { label: 'NO PLAN', color: theme.red, bg: `${theme.red}15`, noPlan: true }
  const p = planName.toLowerCase()
  if (p.includes('annual') || p.includes('yearly')) return { label: planName, color: theme.amber, bg: `${theme.amber}15` }
  if (p.includes('quarter')) return { label: planName, color: theme.cyan, bg: `${theme.cyan}15` }
  return { label: planName, color: theme.accent, bg: theme.accentSoft }
}

const CSS = `
@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.members-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px;
}
@media (max-width: 640px) {
  .members-grid { grid-template-columns: 1fr; }
}
`

function MemberCard({ member, onEdit, onDetail, onManualCheckin, delay, theme, sp }) {
  const [hovered, setHovered] = useState(false)
  const st = statusStyle(member.status, theme)
  const tier = getTierFromPlan(member.plan_name, theme)
  const days = getDaysLeft(member.membership_end)
  const daysColor = days !== null && days < 7 ? theme.red : days !== null && days < 15 ? theme.amber : theme.green

  return (
    <div
      onClick={() => onDetail(member)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? theme.bgHover : theme.bgSec,
        backdropFilter: 'blur(12px)',
        borderRadius: 16, padding: `${sp(20)}px ${sp(20)}px ${sp(16)}px`,
        border: `1px solid ${hovered ? `${theme.accent}30` : theme.borderStrong}`,
        cursor: 'pointer', transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 12px 36px rgba(0,0,0,0.3), 0 0 20px ${theme.accent}08` : 'none',
        animation: `cardFadeIn 0.4s ease-out ${delay}ms both`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Status dot top-right */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: st.dot,
          boxShadow: `0 0 6px ${st.color}60`,
        }} />
        <span style={{
          fontSize: 10, fontWeight: 700, color: st.color,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          fontFamily: FONT,
        }}>
          {member.status}
        </span>
      </div>

      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <Avatar name={member.name} src={member.photo_url} size={48} />
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: theme.text, lineHeight: 1.2,
            fontFamily: FONT_D, textTransform: 'uppercase',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
          }}>
            {member.name}
          </div>
          <div style={{
            fontSize: 12, color: theme.textTer, marginTop: 2,
            fontFamily: FONT,
            whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
          }}>
            {member.email || member.phone}
          </div>
        </div>
      </div>

      {/* Tier badge + Days left + Check-in badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: `${sp(3)}px ${sp(10)}px`, borderRadius: 20, fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          background: tier.bg, color: tier.color,
          fontFamily: FONT,
          ...(tier.noPlan ? { border: `1px dashed ${tier.color}40` } : {}),
        }}>
          {tier.label}
        </span>

        {days !== null && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: `${sp(3)}px ${sp(10)}px`, borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: `${daysColor}12`, color: daysColor,
            fontFamily: FONT_M, letterSpacing: '0.5px',
          }}>
            {days <= 0 ? 'EXPIRED' : `${days}D LEFT`}
          </span>
        )}

        {member.checkin_count !== undefined && member.checkin_count > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: `${sp(3)}px ${sp(8)}px`, borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: `${theme.cyan}12`, color: theme.cyan,
            fontFamily: FONT_M,
          }}>
            <QrCode size={10} />
            {member.checkin_count}
          </span>
        )}
      </div>

      {/* Manual Check-in Quick Action */}
      {member.status === 'active' && (
        <button
          onClick={(e) => { e.stopPropagation(); onManualCheckin(member) }}
          style={{
            marginTop: sp(12), width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
            padding: `${sp(8)}px ${sp(12)}px`, borderRadius: 10,
            fontSize: 12, fontWeight: 600, fontFamily: FONT,
            color: theme.green, background: `${theme.green}10`,
            border: `1px solid ${theme.green}25`,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.green}20`; e.currentTarget.style.borderColor = `${theme.green}40` }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${theme.green}10`; e.currentTarget.style.borderColor = `${theme.green}25` }}
        >
          <UserCheck size={14} />
          Manual Check-in
        </button>
      )}
    </div>
  )
}

function QRCodeSection({ member, gymId, theme, sp }) {
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const canGenerate = member?.status === 'active' && !!member?.plan_name

  async function generateQR() {
    if (!member?.phone || !canGenerate) return
    setLoading(true)
    try {
      const res = await api.post(`/gyms/${gymId}/qr/generate`, { phone: member.phone })
      setQrData(res.data)
      setCountdown(90)
    } catch (err) {
      console.error('QR generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (countdown <= 0) { setQrData(null); return }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  return (
    <div style={{
      background: theme.bgTer, borderRadius: 14, padding: sp(18),
      border: `1px solid ${theme.border}`, marginBottom: sp(20),
    }}>
      <h4 style={{
        fontSize: 11, fontWeight: 700, color: theme.textTer, margin: '0 0 12px',
        textTransform: 'uppercase', letterSpacing: '1px', fontFamily: FONT,
      }}>
        QR Check-in Code
      </h4>

      {qrData && countdown > 0 ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: 12, background: '#fff',
            borderRadius: 12, marginBottom: 10,
          }}>
            <QRCodeSVG
              value={JSON.stringify({ token: qrData.token, gymId })}
              size={160}
              level="M"
              includeMargin={false}
            />
          </div>
          <div style={{
            fontSize: 13, color: theme.textSec, fontFamily: FONT_M,
            marginBottom: 4,
          }}>
            Expires in <span style={{ color: countdown < 20 ? theme.red : theme.green, fontWeight: 700 }}>{countdown}s</span>
          </div>
          <button
            onClick={generateQR}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              fontFamily: FONT, color: theme.accent, background: theme.accentSoft,
              border: `1px solid ${theme.accent}30`, borderRadius: 8,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={13} />
            Regenerate
          </button>
        </div>
      ) : !canGenerate ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: `${theme.amber}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
          }}>
            <AlertTriangle size={22} color={theme.amber} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: '0 0 4px', fontFamily: FONT }}>
            Check-ins unavailable
          </p>
          <p style={{ fontSize: 12, color: theme.textSec, margin: 0, fontFamily: FONT }}>
            Assign an active plan to enable QR check-ins
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <QrCode size={36} style={{ color: theme.textTer, marginBottom: 10 }} />
          <p style={{ fontSize: 12, color: theme.textSec, margin: '0 0 12px', fontFamily: FONT }}>
            Generate a temporary QR code for this member to check in
          </p>
          <button
            onClick={generateQR}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 600,
              fontFamily: FONT, color: '#fff', background: theme.accent,
              border: 'none', borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              boxShadow: `0 0 16px ${theme.accent}30`,
            }}
          >
            <QrCode size={15} />
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        </div>
      )}
    </div>
  )
}

function MemberDetailSlideOver({ member, open, onClose, gymId, onManualCheckin, plans, gymName }) {
  const { theme, sp } = useTheme()
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: detailData } = useQuery({
    queryKey: ['member-detail', gymId, member?.id],
    queryFn: () => api.get(`/gyms/${gymId}/members/${member.id}`).then((r) => r.data),
    enabled: !!member?.id && open,
  })

  // Payment history for this member
  const { data: paymentsData } = useQuery({
    queryKey: ['member-payments', gymId, member?.id],
    queryFn: () => api.get(`/gyms/${gymId}/payments`, { params: { member_id: member.id, limit: 3 } }).then((r) => r.data),
    enabled: !!member?.id && open,
  })

  const detail = detailData?.member || member
  const days = getDaysLeft(detail?.membership_end)
  const st = statusStyle(detail?.status, theme)
  const recentPayments = paymentsData?.payments ?? []

  // Plan editing state
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false)
  const [planSearch, setPlanSearch] = useState('')
  const [planDirty, setPlanDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const dropdownRef = useRef(null)

  // Sync selected plan when detail loads
  useEffect(() => {
    if (detail?.plan_id) setSelectedPlanId(detail.plan_id)
    else setSelectedPlanId('')
    setPlanDirty(false)
  }, [detail?.plan_id, detail?.id])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setPlanDropdownOpen(false)
    }
    if (planDropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [planDropdownOpen])

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId)
  const filteredPlans = (plans || []).filter((p) =>
    !planSearch || p.name.toLowerCase().includes(planSearch.toLowerCase())
  )

  // Compute new expiry when plan changes
  const newExpiry = useMemo(() => {
    if (!selectedPlan) return null
    const duration = selectedPlan.duration_days || selectedPlan.duration
    if (!duration) return null
    const start = new Date()
    start.setDate(start.getDate() + Number(duration))
    return start.toISOString().slice(0, 10)
  }, [selectedPlan])

  function handlePlanSelect(plan) {
    setSelectedPlanId(plan.id)
    setPlanDirty(plan.id !== detail?.plan_id)
    setPlanDropdownOpen(false)
    setPlanSearch('')
  }

  async function handleSavePlan() {
    if (!selectedPlanId || !detail?.id) return
    setSaving(true)
    try {
      await api.patch(`/gyms/${gymId}/members/${detail.id}`, { plan_id: selectedPlanId })
      queryClient.invalidateQueries({ queryKey: ['member-detail', gymId, detail.id] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['members-expiring'] })
      toast.success('Plan updated')
      setPlanDirty(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update plan')
    } finally {
      setSaving(false)
    }
  }

  function openWhatsApp() {
    const phone = (detail.phone || '').replace(/[^0-9]/g, '')
    const name = detail.name || 'there'
    const gym = gymName || 'our gym'
    const text = encodeURIComponent(`Hello ${name}, welcome to ${gym}! Ready for your workout today?`)
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  if (!member) return null

  const labelSt = { fontSize: 11, color: theme.textTer, margin: 0, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }
  const valSt = { fontSize: 14, color: theme.text, margin: '2px 0 0', fontWeight: 600, fontFamily: FONT }

  return (
    <SlideOver open={open} onClose={onClose} title="Member Details">
      <div style={{ padding: '24px 0' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: sp(28) }}>
          <Avatar name={detail.name} src={detail.photo_url} size={72} />
          <h2 style={{
            fontSize: 22, fontWeight: 800, color: theme.text, margin: '14px 0 2px',
            fontFamily: FONT_D, textTransform: 'uppercase',
          }}>
            {detail.name}
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: st.bg, color: st.color, textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
            {detail.status}
          </span>
        </div>

        {/* Manual Check-in Button */}
        {detail.status === 'active' && (
          <button
            onClick={() => onManualCheckin(detail)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: `${sp(12)}px`, borderRadius: 12, marginBottom: sp(20),
              fontSize: 14, fontWeight: 600, fontFamily: FONT,
              color: '#fff', background: theme.green,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: `0 0 20px ${theme.green}30`,
            }}
          >
            <UserCheck size={18} />
            Manual Check-in
          </button>
        )}

        {/* QR Code Generator */}
        <QRCodeSection member={detail} gymId={gymId} theme={theme} sp={sp} />

        {/* Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: sp(24) }}>
          {detail.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.bgTer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={16} color={theme.textTer} />
              </div>
              <div>
                <p style={labelSt}>Phone</p>
                <p style={{ ...valSt, fontFamily: FONT }}>{detail.phone}</p>
              </div>
              <button
                onClick={openWhatsApp}
                title="Message on WhatsApp"
                style={{
                  marginLeft: 'auto', width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                  color: '#25D366', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MessageCircle size={15} />
              </button>
            </div>
          )}
          {detail.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.bgTer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={16} color={theme.textTer} />
              </div>
              <div>
                <p style={labelSt}>Email</p>
                <p style={{ ...valSt, fontFamily: FONT }}>{detail.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Membership & Plan Selection ── */}
        <div style={{
          background: theme.bgTer, borderRadius: 14, padding: sp(18),
          border: `1px solid ${theme.border}`, marginBottom: sp(20),
        }}>
          <h4 style={{ ...labelSt, margin: '0 0 12px' }}>Membership</h4>

          {/* Plan dropdown */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ ...labelSt, marginBottom: 6 }}>Plan</p>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: `${sp(10)}px ${sp(14)}px`, borderRadius: 10,
                  background: theme.bgInput || theme.bg, border: `1px solid ${planDropdownOpen ? theme.borderFocus : theme.border}`,
                  color: selectedPlan ? theme.text : theme.textTer,
                  fontSize: 14, fontWeight: selectedPlan ? 600 : 400, fontFamily: FONT,
                  cursor: 'pointer', transition: 'border-color 0.2s', textAlign: 'left',
                  boxShadow: planDropdownOpen ? `0 0 0 3px ${theme.accent}15` : 'none',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedPlan ? `${selectedPlan.name} — ${formatPaise(selectedPlan.price_paise || selectedPlan.price)}` : 'Select a plan...'}
                </span>
                <ChevronDown size={16} style={{
                  flexShrink: 0, color: theme.textTer,
                  transform: planDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }} />
              </button>

              {planDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  marginTop: 4, background: theme.bgSec, borderRadius: 12,
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                  maxHeight: 240, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Search */}
                  <div style={{ padding: '8px 10px', borderBottom: `1px solid ${theme.border}` }}>
                    <input
                      autoFocus
                      placeholder="Search plans..."
                      value={planSearch}
                      onChange={(e) => setPlanSearch(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: 13, fontFamily: FONT,
                        color: theme.text, background: theme.bgTer, border: `1px solid ${theme.border}`,
                        borderRadius: 8, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {/* Options */}
                  <div style={{ overflow: 'auto', flex: 1 }}>
                    {filteredPlans.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: theme.textTer, fontFamily: FONT }}>
                        No plans found
                      </div>
                    ) : filteredPlans.map((p) => {
                      const isSelected = p.id === selectedPlanId
                      return (
                        <button
                          key={p.id}
                          onClick={() => handlePlanSelect(p)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', border: 'none', cursor: 'pointer',
                            background: isSelected ? theme.accentSoft : 'transparent',
                            color: theme.text, fontSize: 13, fontFamily: FONT, fontWeight: isSelected ? 600 : 400,
                            textAlign: 'left', transition: 'background 0.1s',
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = theme.bgHover }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div>
                            <div>{p.name}</div>
                            <div style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT_M, marginTop: 1 }}>
                              {formatPaise(p.price_paise || p.price)} · {p.duration_days || p.duration || '—'} days
                            </div>
                          </div>
                          {isSelected && <Check size={16} color={theme.green} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expiry + Days Left + Joined */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={labelSt}>Expires</p>
              <p style={{
                ...valSt, fontFamily: FONT_M,
                color: planDirty && newExpiry ? theme.green : days !== null && days < 7 ? theme.red : theme.text,
              }}>
                {planDirty && newExpiry
                  ? formatDate(newExpiry)
                  : detail.membership_end ? formatDate(detail.membership_end) : '--'}
              </p>
              {planDirty && newExpiry && (
                <p style={{ fontSize: 10, color: theme.green, margin: '2px 0 0', fontFamily: FONT }}>
                  Will update on save
                </p>
              )}
            </div>
            {days !== null && !planDirty && (
              <div>
                <p style={labelSt}>Days Left</p>
                <p style={{ ...valSt, fontFamily: FONT_M, color: days < 7 ? theme.red : days < 15 ? theme.amber : theme.green }}>
                  {days <= 0 ? 'Expired' : `${days} days`}
                </p>
              </div>
            )}
            <div>
              <p style={labelSt}>Joined</p>
              <p style={{ ...valSt, fontFamily: FONT_M }}>
                {detail.created_at ? formatDate(detail.created_at) : '--'}
              </p>
            </div>
          </div>

          {/* Save button */}
          {planDirty && (
            <button
              onClick={handleSavePlan}
              disabled={saving}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: `${sp(10)}px`, borderRadius: 10, marginTop: 14,
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
                color: '#fff', background: theme.accent,
                border: 'none', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1, transition: 'all 0.2s',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}
            >
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* ── Payment History ── */}
        <div style={{
          background: theme.bgTer, borderRadius: 14, padding: sp(18),
          border: `1px solid ${theme.border}`, marginBottom: sp(20),
        }}>
          <h4 style={{ ...labelSt, margin: '0 0 12px' }}>Recent Payments</h4>
          {recentPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <IndianRupee size={20} color={theme.textTer} style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 12, color: theme.textTer, margin: 0, fontFamily: FONT }}>
                No payments recorded
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentPayments.map((p, i) => (
                <div key={p.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: `${sp(8)}px ${sp(10)}px`, borderRadius: 8,
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: `${theme.green}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <IndianRupee size={14} color={theme.green} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: FONT,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {formatPaise(p.amount_paise || p.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT }}>
                      {p.plan_name || p.description || 'Payment'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: theme.textSec, fontFamily: FONT_M }}>
                      {p.created_at ? formatDate(p.created_at) : '--'}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      color: p.status === 'captured' ? theme.green : p.status === 'failed' ? theme.red : theme.amber,
                      fontFamily: FONT,
                    }}>
                      {p.status || 'paid'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {detail.notes && (
          <div style={{
            background: theme.bgTer, borderRadius: 14, padding: sp(18),
            border: `1px solid ${theme.border}`,
          }}>
            <h4 style={{ ...labelSt, margin: '0 0 8px' }}>Notes</h4>
            <p style={{ fontSize: 13, color: theme.textSec, margin: 0, fontFamily: FONT, lineHeight: 1.5 }}>
              {detail.notes}
            </p>
          </div>
        )}
      </div>
    </SlideOver>
  )
}

/* ══ CSV/Excel Import Modal ══ */
const IVIRA_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'plan_id', label: 'Plan', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: '', label: '— Skip —', required: false },
]

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const parseLine = (line) => {
    const result = []; let current = ''; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
      current += ch
    }
    result.push(current.trim())
    return result
  }
  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some((c) => c))
  return { headers, rows }
}

// Lightweight XLSX parser: extracts shared strings + first sheet data from the ZIP
async function parseXLSX(arrayBuffer) {
  try {
    // Use the browser's built-in ZIP via DecompressionStream isn't available for ZIP,
    // so we dynamically import SheetJS from CDN if not already loaded
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }
    const wb = window.XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const data = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    if (data.length < 2) return { headers: [], rows: [] }
    return {
      headers: data[0].map(String),
      rows: data.slice(1).map((r) => r.map(String)).filter((r) => r.some((c) => c)),
    }
  } catch {
    return { headers: [], rows: [] }
  }
}

function autoMapColumns(fileHeaders) {
  const mapping = {}
  const patterns = {
    name: /^(name|full.?name|member.?name|first.?name)$/i,
    phone: /^(phone|mobile|cell|contact|phone.?number)$/i,
    email: /^(email|e.?mail|email.?address)$/i,
    notes: /^(notes?|comment|remarks?)$/i,
  }
  fileHeaders.forEach((h, idx) => {
    for (const [field, regex] of Object.entries(patterns)) {
      if (regex.test(h) && !Object.values(mapping).includes(field)) {
        mapping[idx] = field
        break
      }
    }
  })
  return mapping
}

function normalizePhone(raw) {
  const digits = (raw || '').replace(/[^0-9]/g, '')
  if (digits.length === 10) return '+91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits
  if (digits.length === 13 && digits.startsWith('91')) return '+' + digits
  return null
}

function ImportMembersModal({ gymId, plans, onClose, onSuccess }) {
  const { theme, sp } = useTheme()
  const [step, setStep] = useState('upload') // upload | map | validate | importing
  const [fileData, setFileData] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({})
  const [validated, setValidated] = useState([]) // { row, errors[], data }
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] })
  const fileRef = useRef(null)

  const inputStyle = {
    width: '100%', padding: `${sp(8)}px ${sp(12)}px`, fontSize: 13, fontFamily: FONT,
    color: theme.text, background: theme.bgTer, border: `1px solid ${theme.border}`,
    borderRadius: 8, outline: 'none', boxSizing: 'border-box',
  }

  const [fileError, setFileError] = useState('')

  /* ── Step 1: File upload ── */
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    try {
      let parsed
      if (isXlsx) {
        const buf = await file.arrayBuffer()
        parsed = await parseXLSX(buf)
      } else {
        const text = await file.text()
        parsed = parseCSV(text)
      }
      if (!parsed.headers.length) {
        setFileError('Could not parse file. Ensure it has headers and data rows.')
        return
      }
      setFileData(parsed)
      setMapping(autoMapColumns(parsed.headers))
      setStep('map')
    } catch {
      setFileError('Failed to read file. Try a different format.')
    }
  }

  /* ── Step 2→3: Validate mapped data ── */
  function handleValidate() {
    const nameIdx = Object.entries(mapping).find(([, v]) => v === 'name')?.[0]
    const phoneIdx = Object.entries(mapping).find(([, v]) => v === 'phone')?.[0]

    if (nameIdx === undefined || phoneIdx === undefined) return

    const results = fileData.rows.map((row, ri) => {
      const errors = []
      const name = row[nameIdx]?.trim() || ''
      const phoneRaw = row[phoneIdx]?.trim() || ''
      const phone = normalizePhone(phoneRaw)
      const emailIdx = Object.entries(mapping).find(([, v]) => v === 'email')?.[0]
      const notesIdx = Object.entries(mapping).find(([, v]) => v === 'notes')?.[0]
      const email = emailIdx !== undefined ? (row[emailIdx]?.trim() || '') : ''
      const notes = notesIdx !== undefined ? (row[notesIdx]?.trim() || '') : ''

      if (!name) errors.push('Missing name')
      if (!phone) errors.push(`Invalid phone: "${phoneRaw}"`)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: "${email}"`)

      return { rowNum: ri + 2, name, phone: phone || phoneRaw, email, notes, errors }
    })

    // Check for duplicate phones/emails within the file
    const phoneSeen = new Map()
    const emailSeen = new Map()
    results.forEach((r) => {
      if (r.phone && !r.errors.length) {
        if (phoneSeen.has(r.phone)) {
          r.errors.push(`Duplicate phone (same as row ${phoneSeen.get(r.phone)})`)
        } else {
          phoneSeen.set(r.phone, r.rowNum)
        }
      }
      if (r.email) {
        if (emailSeen.has(r.email.toLowerCase())) {
          r.errors.push(`Duplicate email (same as row ${emailSeen.get(r.email.toLowerCase())})`)
        } else {
          emailSeen.set(r.email.toLowerCase(), r.rowNum)
        }
      }
    })

    setValidated(results)
    setStep('validate')
  }

  /* ── Step 3→Import ── */
  async function handleImport() {
    const valid = validated.filter((r) => r.errors.length === 0)
    if (!valid.length) return
    setImporting(true)
    setStep('importing')
    const importErrors = []
    let done = 0
    setProgress({ done: 0, total: valid.length, errors: [] })

    for (const row of valid) {
      try {
        const payload = { name: row.name, phone: row.phone }
        if (row.email) payload.email = row.email
        if (row.notes) payload.notes = row.notes
        await api.post(`/gyms/${gymId}/members`, payload)
        done++
      } catch (err) {
        importErrors.push({ row: row.rowNum, msg: err?.response?.data?.message || 'Failed' })
      }
      setProgress({ done: done, total: valid.length, errors: importErrors })
    }

    setImporting(false)
    if (done > 0) onSuccess(done)
  }

  const validCount = validated.filter((r) => r.errors.length === 0).length
  const errorCount = validated.filter((r) => r.errors.length > 0).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    }} onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto',
        background: theme.bgSec, borderRadius: 16, border: `1px solid ${theme.border}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${sp(20)}px ${sp(24)}px`, borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: theme.accentSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileSpreadsheet size={20} color={theme.text} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: 0, fontFamily: FONT }}>Import Members</h2>
              <p style={{ fontSize: 12, color: theme.textTer, margin: 0, fontFamily: FONT }}>
                {step === 'upload' && 'Upload a CSV or Excel file'}
                {step === 'map' && 'Map columns to I V I R A fields'}
                {step === 'validate' && 'Review and confirm'}
                {step === 'importing' && 'Importing...'}
              </p>
            </div>
          </div>
          {!importing && (
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.border}`,
              background: 'transparent', color: theme.textSec, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Steps indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, padding: `${sp(16)}px ${sp(24)}px`,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          {['Upload', 'Map Fields', 'Validate', 'Import'].map((label, i) => {
            const stepIdx = ['upload', 'map', 'validate', 'importing'].indexOf(step)
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: FONT_M,
                  background: done ? theme.green : active ? theme.text : theme.bgTer,
                  color: done ? '#fff' : active ? theme.bg : theme.textTer,
                  transition: 'all 0.2s',
                }}>
                  {done ? <Check size={12} /> : i + 1}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: active ? 600 : 400, color: active ? theme.text : theme.textTer,
                  marginLeft: 6, fontFamily: FONT, whiteSpace: 'nowrap',
                }}>{label}</span>
                {i < 3 && <div style={{ flex: 1, height: 1, background: done ? theme.green : theme.border, margin: '0 12px' }} />}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div style={{ padding: `${sp(24)}px` }}>

          {/* ── Upload step ── */}
          {step === 'upload' && (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${theme.border}`, borderRadius: 14, padding: '48px 24px',
                textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.text}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border}
            >
              <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
              <Upload size={32} color={theme.textTer} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, fontFamily: FONT, marginBottom: 4 }}>
                Drop your file here or click to browse
              </div>
              <div style={{ fontSize: 13, color: theme.textTer, fontFamily: FONT }}>
                Supports CSV and Excel (.xlsx) files with headers
              </div>
              {fileError && (
                <div style={{ marginTop: 12, fontSize: 13, color: theme.red, fontFamily: FONT }}>
                  <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {fileError}
                </div>
              )}
              <div style={{
                marginTop: 16, padding: '8px 16px', borderRadius: 8,
                background: theme.bgTer, display: 'inline-block',
                fontSize: 12, color: theme.textSec, fontFamily: FONT_M,
              }}>
                Required: Name, Phone
              </div>
            </div>
          )}

          {/* ── Map step ── */}
          {step === 'map' && fileData && (
            <>
              <div style={{
                fontSize: 13, color: theme.textSec, marginBottom: 16, fontFamily: FONT,
              }}>
                Found <strong style={{ color: theme.text }}>{fileData.rows.length}</strong> rows
                with <strong style={{ color: theme.text }}>{fileData.headers.length}</strong> columns.
                Map each file column to a I V I R A field.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fileData.headers.map((header, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: `${sp(10)}px ${sp(14)}px`, borderRadius: 10,
                    background: theme.bgTer, border: `1px solid ${theme.border}`,
                  }}>
                    {/* File column */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                        File Column
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT }}>
                        {header}
                      </div>
                      <div style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT_M, marginTop: 2 }}>
                        e.g. {fileData.rows[0]?.[idx] || '—'}
                      </div>
                    </div>

                    <ArrowRight size={16} color={theme.textTer} style={{ flexShrink: 0 }} />

                    {/* I V I R A field selector */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                        I V I R A Field
                      </div>
                      <select
                        value={mapping[idx] || ''}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [idx]: e.target.value }))}
                        style={{
                          ...inputStyle, cursor: 'pointer', appearance: 'none',
                          fontWeight: mapping[idx] ? 600 : 400,
                          color: mapping[idx] ? theme.text : theme.textTer,
                        }}
                      >
                        {IVIRA_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setStep('upload')} style={{
                  padding: `${sp(10)}px ${sp(20)}px`, fontSize: 13, fontWeight: 500, fontFamily: FONT,
                  color: theme.textSec, background: 'transparent', border: `1px solid ${theme.border}`,
                  borderRadius: 10, cursor: 'pointer',
                }}>Back</button>
                <button
                  onClick={handleValidate}
                  disabled={!Object.values(mapping).includes('name') || !Object.values(mapping).includes('phone')}
                  style={{
                    padding: `${sp(10)}px ${sp(24)}px`, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    color: '#fff', background: theme.accent, border: 'none', borderRadius: 10, cursor: 'pointer',
                    opacity: (!Object.values(mapping).includes('name') || !Object.values(mapping).includes('phone')) ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >Validate Data</button>
              </div>
            </>
          )}

          {/* ── Validate step ── */}
          {step === 'validate' && (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{
                  flex: 1, padding: sp(16), borderRadius: 12, background: `${theme.green}10`,
                  border: `1px solid ${theme.green}25`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: theme.green, fontFamily: FONT_M }}>{validCount}</div>
                  <div style={{ fontSize: 12, color: theme.green, fontFamily: FONT, fontWeight: 600 }}>Ready</div>
                </div>
                <div style={{
                  flex: 1, padding: sp(16), borderRadius: 12, background: `${theme.red}10`,
                  border: `1px solid ${theme.red}25`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: theme.red, fontFamily: FONT_M }}>{errorCount}</div>
                  <div style={{ fontSize: 12, color: theme.red, fontFamily: FONT, fontWeight: 600 }}>Errors</div>
                </div>
              </div>

              {/* Error rows */}
              {errorCount > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: 1, marginBottom: 8, fontFamily: FONT,
                  }}>Issues Found</div>
                  <div style={{
                    maxHeight: 200, overflow: 'auto', borderRadius: 10,
                    border: `1px solid ${theme.red}25`,
                  }}>
                    {validated.filter((r) => r.errors.length > 0).map((r) => (
                      <div key={r.rowNum} style={{
                        padding: `${sp(8)}px ${sp(14)}px`, fontSize: 12, fontFamily: FONT,
                        borderBottom: `1px solid ${theme.border}`,
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                      }}>
                        <span style={{ fontFamily: FONT_M, color: theme.textTer, fontSize: 11, flexShrink: 0 }}>Row {r.rowNum}</span>
                        <div>
                          <div style={{ color: theme.text, fontWeight: 500 }}>{r.name || '(empty)'}</div>
                          {r.errors.map((err, i) => (
                            <div key={i} style={{ color: theme.red, fontSize: 11, marginTop: 2 }}>
                              <AlertCircle size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                              {err}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview valid rows */}
              {validCount > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: theme.textTer, textTransform: 'uppercase',
                    letterSpacing: 1, marginBottom: 8, fontFamily: FONT,
                  }}>Preview (first 5)</div>
                  <div style={{ overflow: 'auto', borderRadius: 10, border: `1px solid ${theme.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                          {['Name', 'Phone', 'Email'].map((h) => (
                            <th key={h} style={{
                              padding: `${sp(8)}px ${sp(12)}px`, textAlign: 'left',
                              fontSize: 10, fontWeight: 700, color: theme.textTer,
                              textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONT,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {validated.filter((r) => r.errors.length === 0).slice(0, 5).map((r) => (
                          <tr key={r.rowNum} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: `${sp(8)}px ${sp(12)}px`, color: theme.text }}>{r.name}</td>
                            <td style={{ padding: `${sp(8)}px ${sp(12)}px`, color: theme.textSec, fontFamily: FONT_M }}>{r.phone}</td>
                            <td style={{ padding: `${sp(8)}px ${sp(12)}px`, color: theme.textSec }}>{r.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('map')} style={{
                  padding: `${sp(10)}px ${sp(20)}px`, fontSize: 13, fontWeight: 500, fontFamily: FONT,
                  color: theme.textSec, background: 'transparent', border: `1px solid ${theme.border}`,
                  borderRadius: 10, cursor: 'pointer',
                }}>Back</button>
                <button
                  onClick={handleImport}
                  disabled={validCount === 0}
                  style={{
                    padding: `${sp(10)}px ${sp(24)}px`, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    color: '#fff', background: theme.green, border: 'none', borderRadius: 10, cursor: 'pointer',
                    opacity: validCount === 0 ? 0.4 : 1, transition: 'opacity 0.2s',
                  }}
                >Import {validCount} Member{validCount !== 1 ? 's' : ''}</button>
              </div>
            </>
          )}

          {/* ── Importing step ── */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              {importing ? (
                <>
                  <Loader2 size={32} color={theme.text} style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, fontFamily: FONT, marginBottom: 8 }}>
                    Importing members...
                  </div>
                  <div style={{ fontSize: 14, color: theme.textSec, fontFamily: FONT_M }}>
                    {progress.done} / {progress.total}
                  </div>
                  <div style={{
                    width: '100%', height: 4, borderRadius: 2, background: theme.bgTer,
                    marginTop: 16, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: theme.green,
                      width: `${(progress.done / progress.total) * 100}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: `${theme.green}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Check size={28} color={theme.green} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: FONT, marginBottom: 4 }}>
                    Import Complete
                  </div>
                  <div style={{ fontSize: 14, color: theme.textSec, fontFamily: FONT }}>
                    {progress.done} member{progress.done !== 1 ? 's' : ''} imported
                    {progress.errors.length > 0 && `, ${progress.errors.length} failed`}
                  </div>
                  {progress.errors.length > 0 && (
                    <div style={{
                      marginTop: 12, padding: sp(12), borderRadius: 10,
                      background: `${theme.red}08`, border: `1px solid ${theme.red}20`,
                      fontSize: 12, color: theme.red, fontFamily: FONT, textAlign: 'left',
                    }}>
                      {progress.errors.map((e, i) => (
                        <div key={i}>Row {e.row}: {e.msg}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Members() {
  const { gym, isAdmin } = useAuth()
  const { theme, sp } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const gymId = gym?.id
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [slideOpen, setSlideOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [viewMode, setViewMode] = useState('grid')
  const [detailMember, setDetailMember] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const limit = 20

  useEffect(() => {
    const urlStatus = searchParams.get('status') || ''
    if (urlStatus !== status) {
      setStatus(urlStatus)
      setPage(1)
    }
  }, [searchParams])

  const debouncedSetSearch = useMemo(
    () => debounce((value) => { setSearch(value); setPage(1) }, 300), []
  )

  const isExpiring = status === 'expiring'
  const apiStatus = isExpiring ? 'active' : status

  // Normal paginated query (used for all tabs except 'expiring')
  const { data: membersData, isLoading: isLoadingNormal } = useQuery({
    queryKey: ['members', gymId, page, limit, search, apiStatus],
    queryFn: () => api.get(`/gyms/${gymId}/members`, { params: { page, limit, search, status: apiStatus } }).then((res) => res.data),
    enabled: !!gymId && !isExpiring, keepPreviousData: true,
  })

  // Always fetch expiring data so the tab count is accurate even when not on the Expiring tab
  const { data: expiringData, isLoading: isLoadingExpiring } = useQuery({
    queryKey: ['members-expiring', gymId, search],
    queryFn: () => api.get(`/gyms/${gymId}/members`, { params: { page: 1, limit: 500, search, status: 'active' } }).then((res) => res.data),
    enabled: !!gymId, keepPreviousData: true,
    staleTime: isExpiring ? 0 : 60_000, // aggressive refresh on expiring tab, lazy otherwise
  })

  const isLoading = isExpiring ? isLoadingExpiring : isLoadingNormal

  // Compute members + total based on current tab
  const { members, total } = useMemo(() => {
    if (isExpiring) {
      const all = expiringData?.members ?? []
      const filtered = all.filter((m) => isExpiringSoon(m.membership_end))
      const start = (page - 1) * limit
      return { members: filtered.slice(start, start + limit), total: filtered.length }
    }
    return { members: membersData?.members ?? [], total: membersData?.total ?? 0 }
  }, [isExpiring, expiringData, membersData, page, limit])

  const { data: plansData } = useQuery({
    queryKey: ['plans', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/plans`).then((res) => res.data),
    enabled: !!gymId,
  })

  const { data: statsData } = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/stats`).then((r) => r.data),
    enabled: !!gymId,
  })

  const plans = plansData?.plans ?? []
  const planOptions = useMemo(() => [
    { value: '', label: 'Select a plan' },
    ...plans.map((p) => ({ value: p.id, label: `${p.name} - ${formatPaise(p.price_paise || p.price)}` })),
  ], [plans])

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(`/gyms/${gymId}/members`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['members'] }); toast.success('Member added'); closeSlide() },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to add member'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/gyms/${gymId}/members/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['members'] }); toast.success('Member updated'); closeSlide() },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update'),
  })

  const manualCheckinMutation = useMutation({
    mutationFn: (memberId) => api.post(`/gyms/${gymId}/checkins/manual`, { memberId }),
    onSuccess: (_, memberId) => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats'] })
      queryClient.invalidateQueries({ queryKey: ['live-checkins'] })
      toast.success('Check-in recorded')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Check-in failed'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function openAdd() { setEditingMember(null); setForm(EMPTY_FORM); setSlideOpen(true) }
  function openEdit(member) {
    setEditingMember(member)
    setForm({ name: member.name || '', phone: member.phone || '', email: member.email || '', plan_id: member.plan_id || '', notes: member.notes || '' })
    setSlideOpen(true)
  }
  function closeSlide() { setSlideOpen(false); setEditingMember(null); setForm(EMPTY_FORM) }
  function handleFormChange(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }

  function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) return
    const payload = {
      name: form.name.trim(), phone: form.phone.trim(),
      ...(form.email.trim() && { email: form.email.trim() }),
      ...(form.plan_id && { plan_id: form.plan_id }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    }
    editingMember ? updateMutation.mutate({ id: editingMember.id, payload }) : createMutation.mutate(payload)
  }

  function handleManualCheckin(member) {
    if (manualCheckinMutation.isPending) return
    manualCheckinMutation.mutate(member.id)
  }

  function handleTabClick(value) {
    setStatus(value)
    setPage(1)
    if (value) {
      setSearchParams({ status: value })
    } else {
      setSearchParams({})
    }
  }

  const [exportLoading, setExportLoading] = useState(false)

  async function handleExportCSV() {
    setExportLoading(true)
    try {
      // Fetch ALL members for current filter (not just current page)
      let exportMembers = members
      if (!isExpiring && total > limit) {
        const { data } = await api.get(`/gyms/${gymId}/members`, {
          params: { page: 1, limit: 10000, search, status: apiStatus },
        })
        exportMembers = data?.members ?? members
      } else if (isExpiring && expiringData?.members) {
        exportMembers = expiringData.members.filter((m) => isExpiringSoon(m.membership_end))
      }
      if (!exportMembers.length) { toast.warning('No data to export'); return }

      const headers = ['Name', 'Email', 'Phone', 'Plan', 'Status', 'Join Date', 'Expiry Date', 'Total Paid']
      const rows = exportMembers.map((m) => [
        m.name || '', m.email || '', m.phone || '', m.plan_name || '',
        m.status || '', m.created_at ? formatDate(m.created_at) : '',
        m.membership_end ? formatDate(m.membership_end) : '',
        m.total_paid_paise ? formatPaise(m.total_paid_paise) : m.ltv_paise ? formatPaise(m.ltv_paise) : '₹0',
      ])
      const csv = [headers, ...rows].map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const label = status || 'all'
      a.download = `members-${label}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${exportMembers.length} members`)
    } catch (err) {
      toast.error('Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  const pageNumbers = useMemo(() => {
    const pages = []; const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [page, totalPages])

  const darkInput = {
    width: '100%', padding: `${sp(10)}px ${sp(14)}px`, fontSize: 14, fontFamily: FONT,
    color: theme.text, background: theme.bgTer, border: `1px solid ${theme.borderStrong}`,
    borderRadius: 10, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: theme.textSec,
    marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '1px',
  }

  // Compute expiring count from the always-running query (single source of truth)
  const expiringCount = useMemo(() => {
    if (expiringData?.members) {
      return expiringData.members.filter((m) => isExpiringSoon(m.membership_end)).length
    }
    return statsData?.expiringSoon?.length ?? 0
  }, [expiringData, statsData])

  const tabCounts = {
    active: statsData?.activeMembers,
    expired: statsData?.expiredMembers,
    expiring: expiringCount || undefined,
  }

  return (
    <div style={{ padding: `${sp(28)}px ${sp(32)}px`, maxWidth: 1200, margin: '0 auto', fontFamily: FONT }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ marginBottom: sp(28) }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: theme.text, margin: 0, lineHeight: 1.1,
          fontFamily: FONT_D, textTransform: 'uppercase', letterSpacing: '-0.01em',
        }}>
          Members
        </h1>
        <p style={{ fontSize: 14, color: theme.textTer, margin: '4px 0 0', fontWeight: 500, fontFamily: FONT }}>
          {total > 0 ? `${total} total members` : 'Manage your gym members'}
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: sp(18), flexWrap: 'wrap' }}>
        {FILTER_TABS.map((tab) => {
          const isActive = status === tab.value
          const count = tabCounts[tab.value]
          return (
            <button
              key={tab.value}
              onClick={() => handleTabClick(tab.value)}
              style={{
                padding: `${sp(7)}px ${sp(16)}px`, fontSize: 13, fontWeight: isActive ? 700 : 500,
                fontFamily: FONT, color: isActive ? '#fff' : theme.textSec,
                background: isActive ? theme.accent : theme.bgSec,
                border: isActive ? 'none' : `1px solid ${theme.borderStrong}`,
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: isActive ? `0 0 16px ${theme.accent}30` : 'none',
              }}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                  background: isActive ? 'rgba(255,255,255,0.2)' : theme.bgTer,
                  color: isActive ? '#fff' : theme.textTer,
                  fontFamily: FONT_M,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sp(20), flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={16} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textTer, pointerEvents: 'none',
          }} />
          <input
            placeholder="Search members..."
            onChange={(e) => debouncedSetSearch(e.target.value)}
            style={{ ...darkInput, paddingLeft: 40, minHeight: 48 }}
            onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20` }}
            onBlur={(e) => { e.target.style.borderColor = theme.borderStrong; e.target.style.boxShadow = 'none' }}
          />
        </div>

        <div style={{ display: 'flex', border: `1px solid ${theme.borderStrong}`, borderRadius: 10, overflow: 'hidden' }}>
          {[{ mode: 'grid', icon: Grid3x3 }, { mode: 'list', icon: List }].map(({ mode, icon: Icon }) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: `${sp(8)}px ${sp(12)}px`, background: viewMode === mode ? theme.accent : 'transparent',
              border: 'none', color: viewMode === mode ? '#fff' : theme.textTer,
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center',
            }}>
              <Icon size={16} />
            </button>
          ))}
        </div>

        <div style={{ flex: '0 0 auto', marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setImportOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${sp(10)}px ${sp(16)}px`,
              fontSize: 13, fontWeight: 600, fontFamily: FONT, color: theme.textSec,
              background: 'transparent', border: `1px solid ${theme.borderStrong}`, borderRadius: 10,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgTer; e.currentTarget.style.color = theme.text }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSec }}
            >
              <Upload size={15} /> Import
            </button>
          )}
          {isAdmin && (
            <button onClick={handleExportCSV} disabled={exportLoading} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${sp(10)}px ${sp(16)}px`,
              fontSize: 13, fontWeight: 600, fontFamily: FONT, color: theme.textSec,
              background: 'transparent', border: `1px solid ${theme.borderStrong}`, borderRadius: 10,
              cursor: exportLoading ? 'wait' : 'pointer', transition: 'all 0.2s',
              opacity: exportLoading ? 0.6 : 1,
            }}
              onMouseEnter={(e) => { if (!exportLoading) { e.currentTarget.style.background = theme.bgTer; e.currentTarget.style.color = theme.text } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSec }}
            >
              <Download size={15} /> {exportLoading ? 'Exporting...' : 'Export'}
            </button>
          )}
          <button onClick={openAdd} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${sp(10)}px ${sp(20)}px`,
            fontSize: 13, fontWeight: 700, fontFamily: FONT_D, color: '#fff',
            background: theme.accent, border: 'none', borderRadius: 10, cursor: 'pointer',
            transition: 'all 0.2s', boxShadow: `0 0 20px ${theme.accent}30`,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 30px ${theme.accent}50`; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 20px ${theme.accent}30`; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="members-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              height: 140, borderRadius: 16, background: theme.bgSec,
              border: `1px solid ${theme.borderStrong}`, animation: `cardFadeIn 0.4s ease-out ${i * 50}ms both`,
            }} />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div style={{
          background: theme.bgSec, border: `1px solid ${theme.borderStrong}`, borderRadius: 16,
          padding: '80px 40px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: status === 'expiring' ? `${theme.amber}12` : theme.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}>
            {status === 'expiring' ? <AlertTriangle size={28} color={theme.amber} /> : <UserPlus size={28} color={theme.accent} />}
          </div>
          <h3 style={{ color: theme.text, fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: FONT_D, textTransform: 'uppercase' }}>
            {status === 'expiring' ? 'No expiring memberships' :
             status === 'expired' ? 'No expired members' :
             status ? `No ${status} members` : 'No members yet'}
          </h3>
          <p style={{ color: theme.textSec, fontSize: 14, margin: '0 0 24px', maxWidth: 320, fontFamily: FONT }}>
            {status === 'expiring' ? 'All memberships are healthy. Great job keeping members engaged!' :
             status ? `No members with "${status}" status found.` :
             'Get started by adding your first gym member.'}
          </p>
          {!status && (
            <button onClick={openAdd} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${sp(10)}px ${sp(20)}px`,
              fontSize: 14, fontWeight: 700, fontFamily: FONT_D, color: '#fff',
              background: theme.accent, border: 'none', borderRadius: 10, cursor: 'pointer',
              boxShadow: `0 0 20px ${theme.accent}30`, textTransform: 'uppercase',
            }}>
              <Plus size={16} /> Add first member
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="members-grid">
          {members.map((member, i) => (
            <MemberCard
              key={member.id} member={member} theme={theme} sp={sp}
              onEdit={openEdit}
              onDetail={(m) => { setDetailMember(m); setDetailOpen(true) }}
              onManualCheckin={handleManualCheckin}
              delay={i * 40}
            />
          ))}
        </div>
      ) : (
        <div style={{
          background: theme.bgSec, border: `1px solid ${theme.borderStrong}`, borderRadius: 16,
          overflow: 'hidden', backdropFilter: 'blur(20px)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: theme.text, fontFamily: FONT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {['Member', 'Plan', 'Status', 'Expiry', ''].map((col) => (
                    <th key={col} style={{
                      padding: `${sp(13)}px ${sp(20)}px`, fontWeight: 700, fontSize: 10,
                      textTransform: 'uppercase', letterSpacing: '1.5px',
                      color: theme.textTer, textAlign: 'left', background: 'transparent', border: 'none',
                      fontFamily: FONT,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const st = statusStyle(member.status, theme)
                  const tier = getTierFromPlan(member.plan_name, theme)
                  return (
                    <tr key={member.id} style={{ transition: 'background 0.2s', cursor: 'pointer', minHeight: 48 }}
                      onClick={() => { setDetailMember(member); setDetailOpen(true) }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: `${sp(12)}px ${sp(20)}px`, border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48 }}>
                          <Avatar name={member.name} src={member.photo_url} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, color: theme.text, fontFamily: FONT }}>{member.name}</div>
                            <div style={{ fontSize: 12, color: theme.textTer, marginTop: 1, fontFamily: FONT }}>{member.email || member.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: `${sp(12)}px ${sp(20)}px`, border: 'none' }}>
                        <span style={{
                          padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                          background: tier.bg, color: tier.color,
                          ...(tier.noPlan ? { border: `1px dashed ${tier.color}40` } : {}),
                          fontFamily: FONT,
                        }}>
                          {tier.label}
                        </span>
                      </td>
                      <td style={{ padding: `${sp(12)}px ${sp(20)}px`, border: 'none' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                          background: st.bg, color: st.color, textTransform: 'capitalize',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />
                          {member.status}
                        </span>
                      </td>
                      <td style={{
                        padding: `${sp(12)}px ${sp(20)}px`, border: 'none', color: theme.textSec,
                        fontFamily: FONT_M, fontSize: 12,
                      }}>
                        {member.membership_end ? formatDate(member.membership_end) : '--'}
                      </td>
                      <td style={{ padding: `${sp(12)}px ${sp(20)}px`, border: 'none' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {member.status === 'active' && (
                            <button onClick={(e) => { e.stopPropagation(); handleManualCheckin(member) }} style={{
                              padding: '5px 10px', fontSize: 11, fontWeight: 600, fontFamily: FONT,
                              color: theme.green, background: `${theme.green}10`,
                              border: `1px solid ${theme.green}25`, borderRadius: 8,
                              cursor: 'pointer', transition: 'all 0.2s',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.green}20` }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = `${theme.green}10` }}
                            >
                              <UserCheck size={12} /> Check-in
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); openEdit(member) }} style={{
                            padding: '5px 14px', fontSize: 12, fontWeight: 600, fontFamily: FONT,
                            color: theme.textSec, background: 'transparent', border: `1px solid ${theme.borderStrong}`,
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSec }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${sp(18)}px 4px`, fontSize: 13, color: theme.textSec, fontFamily: FONT,
        }}>
          <span style={{ fontFamily: FONT_M, fontSize: 12 }}>
            {startItem}-{endItem} of {total}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{
              padding: `${sp(6)}px ${sp(10)}px`, fontSize: 13, fontFamily: FONT, color: page <= 1 ? theme.textTer : theme.textSec,
              background: theme.bgTer, border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
              cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1, transition: 'all 0.15s',
            }}>
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n) => (
              <button key={n} onClick={() => setPage(n)} style={{
                padding: `${sp(6)}px ${sp(12)}px`, fontSize: 13, fontWeight: n === page ? 700 : 400,
                fontFamily: FONT, color: n === page ? '#fff' : theme.textSec,
                background: n === page ? theme.accent : theme.bgTer,
                border: n === page ? 'none' : `1px solid ${theme.borderStrong}`,
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: n === page ? `0 0 12px ${theme.accent}30` : 'none', minWidth: 36,
              }}>
                {n}
              </button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{
              padding: `${sp(6)}px ${sp(10)}px`, fontSize: 13, fontFamily: FONT, color: page >= totalPages ? theme.textTer : theme.textSec,
              background: theme.bgTer, border: `1px solid ${theme.borderStrong}`, borderRadius: 8,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, transition: 'all 0.15s',
            }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit SlideOver */}
      <SlideOver open={slideOpen} onClose={closeSlide} title={editingMember ? 'Edit Member' : 'Add Member'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 0' }}>
          <div>
            <label style={labelStyle}>Name <span style={{ color: theme.red }}>*</span></label>
            <input placeholder="Member name" value={form.name} onChange={(e) => handleFormChange('name', e.target.value)}
              style={darkInput}
              onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20` }}
              onBlur={(e) => { e.target.style.borderColor = theme.borderStrong; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone <span style={{ color: theme.red }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textTer, pointerEvents: 'none' }} />
              <input placeholder="+1 (814) 895-7439" value={form.phone} onChange={(e) => handleFormChange('phone', e.target.value)}
                style={{ ...darkInput, paddingLeft: 40 }}
                onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20` }}
                onBlur={(e) => { e.target.style.borderColor = theme.borderStrong; e.target.style.boxShadow = 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textTer, pointerEvents: 'none' }} />
              <input type="email" placeholder="member@example.com" value={form.email} onChange={(e) => handleFormChange('email', e.target.value)}
                style={{ ...darkInput, paddingLeft: 40 }}
                onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20` }}
                onBlur={(e) => { e.target.style.borderColor = theme.borderStrong; e.target.style.boxShadow = 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Plan</label>
            <select value={form.plan_id} onChange={(e) => handleFormChange('plan_id', e.target.value)} style={{
              ...darkInput, cursor: 'pointer', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238B8BA3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
            }}>
              {planOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea placeholder="Any additional notes..." value={form.notes} onChange={(e) => handleFormChange('notes', e.target.value)} rows={3}
              style={{ ...darkInput, resize: 'vertical' }}
              onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}20` }}
              onBlur={(e) => { e.target.style.borderColor = theme.borderStrong; e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
          <button onClick={closeSlide} style={{
            padding: `${sp(10)}px ${sp(20)}px`, fontSize: 14, fontWeight: 500, fontFamily: FONT,
            color: theme.textSec, background: 'transparent', border: `1px solid ${theme.borderStrong}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || !form.phone.trim() || isSaving} style={{
            padding: `${sp(10)}px ${sp(24)}px`, fontSize: 14, fontWeight: 700, fontFamily: FONT_D,
            color: '#fff', background: theme.accent, border: 'none', borderRadius: 10,
            cursor: !form.name.trim() || !form.phone.trim() || isSaving ? 'not-allowed' : 'pointer',
            opacity: !form.name.trim() || !form.phone.trim() || isSaving ? 0.5 : 1,
            transition: 'all 0.2s', boxShadow: `0 0 20px ${theme.accent}30`,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {isSaving ? 'Saving...' : editingMember ? 'Update' : 'Add Member'}
          </button>
        </div>
      </SlideOver>

      {/* Member Detail SlideOver */}
      <MemberDetailSlideOver
        member={detailMember}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailMember(null) }}
        gymId={gymId}
        onManualCheckin={handleManualCheckin}
        plans={plans}
        gymName={gym?.gym_name || gym?.name || ''}
      />

      {/* Import Members Modal */}
      {importOpen && (
        <ImportMembersModal
          gymId={gymId}
          plans={plans}
          onClose={() => setImportOpen(false)}
          onSuccess={(count) => {
            queryClient.invalidateQueries({ queryKey: ['members'] })
            queryClient.invalidateQueries({ queryKey: ['gym-stats'] })
            toast.success(`${count} member${count !== 1 ? 's' : ''} imported`)
            setImportOpen(false)
          }}
        />
      )}
    </div>
  )
}
