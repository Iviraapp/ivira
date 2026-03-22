import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { formatPaise, formatDate, formatTime } from '../../lib/utils'
import api from '../../lib/api'
import Avatar from '../../components/ui/Avatar'
import {
  X, Phone, Mail, Calendar, TrendingUp, Flame, Activity,
  IndianRupee, Download, MessageCircle, Edit3, Pause, UserX,
  Clock, CheckCircle, XCircle, AlertCircle, ChevronRight,
} from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

const CSS = `
@keyframes mpFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes mpSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes mpCardIn {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes mpRingIn {
  from { stroke-dashoffset: var(--ring-circumference); }
  to { stroke-dashoffset: var(--ring-offset); }
}
.mp-overlay {
  animation: mpFadeIn 0.25s ease forwards;
}
.mp-panel {
  animation: mpSlideUp 0.35s ease forwards;
}
.mp-card {
  animation: mpCardIn 0.4s ease forwards;
  opacity: 0;
}
.mp-card-1 { animation-delay: 0.05s; }
.mp-card-2 { animation-delay: 0.1s; }
.mp-card-3 { animation-delay: 0.15s; }
.mp-card-4 { animation-delay: 0.2s; }
.mp-card-5 { animation-delay: 0.25s; }
.mp-card-6 { animation-delay: 0.3s; }
.mp-heatmap-cell:hover {
  outline: 1px solid rgba(255,255,255,0.3);
  outline-offset: -1px;
}
`

// ---------- Status helpers ----------
function statusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return { bg: `${theme.green}20`, color: theme.green, label: 'Active' }
  if (s === 'expired') return { bg: `${theme.red}20`, color: theme.red, label: 'Expired' }
  if (s === 'paused') return { bg: `${theme.amber}20`, color: theme.amber, label: 'Paused' }
  if (s === 'suspended') return { bg: `${theme.red}20`, color: theme.red, label: 'Suspended' }
  return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: status || 'Inactive' }
}

function paymentStatusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s === 'paid' || s === 'captured' || s === 'completed')
    return { bg: `${theme.green}15`, color: theme.green, label: s === 'captured' ? 'Paid' : s }
  if (s === 'failed' || s === 'refunded')
    return { bg: `${theme.red}15`, color: theme.red, label: s }
  if (s === 'pending' || s === 'created')
    return { bg: `${theme.amber}15`, color: theme.amber, label: 'Pending' }
  return { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', label: s || '—' }
}

// ---------- Retention Ring ----------
function RetentionRing({ score, size = 120, strokeWidth = 10, theme }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference
  const color = clamped >= 70 ? theme.brandAccent : clamped >= 30 ? '#666' : theme.red

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={theme.bgTer} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            '--ring-circumference': circumference,
            '--ring-offset': offset,
            animation: 'mpRingIn 1s ease forwards',
            transition: 'stroke-dashoffset 1s ease',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: FONT_M, fontSize: 28, fontWeight: 700, color: theme.text }}>{Math.round(clamped)}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score</span>
      </div>
    </div>
  )
}

// ---------- Heatmap ----------
function ActivityHeatmap({ checkins, theme }) {
  const { grid, months } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysBack = 365
    const start = new Date(today)
    start.setDate(start.getDate() - daysBack + 1)

    // Build count map
    const countMap = {}
    ;(checkins || []).forEach((c) => {
      const d = (c.checked_in_at || c.created_at || '').slice(0, 10)
      if (d) countMap[d] = (countMap[d] || 0) + 1
    })

    // Build grid: 7 rows (Sun-Sat) x ~53 columns
    const cells = []
    const monthLabels = []
    const cursor = new Date(start)
    // Align to Sunday
    while (cursor.getDay() !== 0) cursor.setDate(cursor.getDate() - 1)

    let lastMonth = -1
    let col = 0
    while (cursor <= today) {
      const weekCells = []
      for (let row = 0; row < 7; row++) {
        const dateStr = cursor.toISOString().slice(0, 10)
        const count = countMap[dateStr] || 0
        const isInRange = cursor >= start && cursor <= today
        weekCells.push({ date: dateStr, count, inRange: isInRange })

        if (row === 0 && cursor.getMonth() !== lastMonth && isInRange) {
          monthLabels.push({ col, label: cursor.toLocaleString('en', { month: 'short' }) })
          lastMonth = cursor.getMonth()
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      cells.push(weekCells)
      col++
    }

    return { grid: cells, months: monthLabels }
  }, [checkins])

  function cellColor(count, inRange) {
    if (!inRange) return 'transparent'
    if (count === 0) return theme.bgTer
    if (count === 1) return `${theme.brandAccent}4D` // 30%
    if (count === 2) return `${theme.brandAccent}99` // 60%
    return theme.brandAccent
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Month labels */}
      <div style={{ display: 'flex', marginBottom: 4, paddingLeft: 0 }}>
        {months.map((m, i) => (
          <span key={i} style={{
            fontFamily: FONT, fontSize: 10, color: theme.textTer,
            position: 'absolute', left: m.col * 14,
          }}>{m.label}</span>
        ))}
      </div>
      <div style={{ position: 'relative', marginTop: 18 }}>
        {/* Month labels absolute */}
        {months.map((m, i) => (
          <span key={i} style={{
            position: 'absolute', top: -16, left: m.col * 14,
            fontFamily: FONT, fontSize: 10, color: theme.textTer,
          }}>{m.label}</span>
        ))}
        <div style={{ display: 'flex', gap: 2 }}>
          {grid.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map((day, di) => (
                <div key={di} className="mp-heatmap-cell" title={`${day.date}: ${day.count} check-in${day.count !== 1 ? 's' : ''}`} style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: cellColor(day.count, day.inRange),
                  transition: 'background 0.15s ease',
                  cursor: 'default',
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Cancel Modal ----------
function CancelModal({ onConfirm, onClose, theme, sp, loading }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const chips = ['Too Expensive', 'Moving Away', 'Injury', 'Not Satisfied', 'Other']

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0A0A0A', border: `1px solid ${theme.borderStrong}`,
        borderRadius: 16, padding: sp(28), maxWidth: 440, width: '90%',
      }}>
        <h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: theme.text, margin: 0 }}>
          Why are they leaving?
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: sp(16) }}>
          {chips.map((c) => (
            <button key={c} onClick={() => setReason(c)} style={{
              fontFamily: FONT, fontSize: 13, padding: '6px 14px',
              borderRadius: 20, border: `1px solid ${reason === c ? theme.brandAccent : theme.borderStrong}`,
              background: reason === c ? theme.brandAccentSoft : 'transparent',
              color: reason === c ? theme.brandAccent : theme.textSec,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}>{c}</button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes (optional)..."
          rows={3}
          style={{
            width: '100%', marginTop: sp(14), padding: sp(12), borderRadius: 10,
            border: `1px solid ${theme.borderStrong}`, background: theme.bgTer,
            color: theme.text, fontFamily: FONT, fontSize: 14, resize: 'vertical',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: sp(18), justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            fontFamily: FONT, fontSize: 14, padding: '8px 18px', borderRadius: 10,
            border: `1px solid ${theme.borderStrong}`, background: 'transparent',
            color: theme.textSec, cursor: 'pointer',
          }}>Cancel</button>
          <button
            disabled={!reason || loading}
            onClick={() => onConfirm(reason, notes)}
            style={{
              fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '8px 18px',
              borderRadius: 10, border: 'none',
              background: theme.red, color: '#fff',
              cursor: reason && !loading ? 'pointer' : 'not-allowed',
              opacity: !reason || loading ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Main Component ----------
export default function MemberProfile({ memberId: propMemberId, onClose, onEditPlan }) {
  const params = useParams()
  const navigate = useNavigate()
  const memberId = propMemberId || params.memberId
  const isRoute = !propMemberId && !!params.memberId
  const handleClose = onClose || (() => navigate('/dashboard/members'))

  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const gymId = gym?.id

  const [showCancelModal, setShowCancelModal] = useState(false)

  // ---- Data fetching ----
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member', gymId, memberId],
    queryFn: () => api.get(`/gyms/${gymId}/members/${memberId}`).then((r) => r.data.member || r.data),
    enabled: !!gymId && !!memberId,
  })

  const { data: paymentsData } = useQuery({
    queryKey: ['member-payments', gymId, memberId],
    queryFn: () => api.get(`/gyms/${gymId}/payments`, { params: { member_id: memberId } }).then((r) => r.data),
    enabled: !!gymId && !!memberId,
  })

  const { data: checkinsData } = useQuery({
    queryKey: ['member-checkins', gymId, memberId],
    queryFn: () => api.get(`/gyms/${gymId}/checkins`, { params: { member_id: memberId, limit: 500 } }).then((r) => r.data),
    enabled: !!gymId && !!memberId,
  })

  const payments = paymentsData?.payments || paymentsData?.data || []
  const checkins = checkinsData?.checkins || checkinsData?.data || []

  // ---- Mutations ----
  const freezeMutation = useMutation({
    mutationFn: () => api.patch(`/gyms/${gymId}/members/${memberId}`, { status: 'paused' }),
    onSuccess: () => {
      toast.success('Membership frozen')
      queryClient.invalidateQueries({ queryKey: ['member', gymId, memberId] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
    onError: () => toast.error('Failed to freeze membership'),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ reason, notes }) =>
      api.patch(`/gyms/${gymId}/members/${memberId}`, { status: 'inactive', cancel_reason: reason, cancel_notes: notes }),
    onSuccess: () => {
      toast.success('Membership cancelled')
      setShowCancelModal(false)
      queryClient.invalidateQueries({ queryKey: ['member', gymId, memberId] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
    onError: () => toast.error('Failed to cancel membership'),
  })

  // ---- Computed stats ----
  const stats = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentCheckins = checkins.filter((c) => {
      const d = new Date(c.checked_in_at || c.created_at)
      return d >= thirtyDaysAgo
    })
    const uniqueDays = new Set(recentCheckins.map((c) => (c.checked_in_at || c.created_at || '').slice(0, 10)))
    const retentionScore = (uniqueDays.size / 30) * 100

    // Streak
    let streak = 0
    const sortedDates = [...new Set(checkins.map((c) => (c.checked_in_at || c.created_at || '').slice(0, 10)))]
      .sort()
      .reverse()
    const todayStr = now.toISOString().slice(0, 10)
    let cursor = todayStr
    for (const d of sortedDates) {
      if (d === cursor) {
        streak++
        const prev = new Date(cursor)
        prev.setDate(prev.getDate() - 1)
        cursor = prev.toISOString().slice(0, 10)
      } else if (d < cursor) {
        break
      }
    }

    // Avg per week
    const totalWeeks = Math.max(1, checkins.length > 0
      ? (now - new Date(checkins[checkins.length - 1]?.checked_in_at || checkins[checkins.length - 1]?.created_at)) / (7 * 24 * 60 * 60 * 1000)
      : 1)
    const avgPerWeek = (checkins.length / totalWeeks).toFixed(1)

    // LTV
    const ltv = payments
      .filter((p) => ['captured', 'paid', 'completed'].includes((p.status || '').toLowerCase()))
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    return { totalCheckins: checkins.length, streak, avgPerWeek, ltv, retentionScore }
  }, [checkins, payments])

  // ---- Escape key ----
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose])

  if (!memberId) return null

  const mSt = member ? statusStyle(member.status, theme) : null

  const cardStyle = {
    background: '#0A0A0A',
    border: '1px solid #1F1F1F',
    borderRadius: 16,
    padding: sp(22),
  }

  const sectionTitle = {
    fontFamily: FONT, fontSize: 13, fontWeight: 600,
    color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: sp(14),
  }

  const statNumber = {
    fontFamily: FONT_M, fontSize: 28, fontWeight: 700, color: theme.text,
    lineHeight: 1,
  }

  const statLabel = {
    fontFamily: FONT, fontSize: 12, color: theme.textTer, marginTop: 4,
  }

  const actionBtn = (bg, color, hoverBg) => ({
    fontFamily: FONT, fontSize: 13, fontWeight: 500,
    padding: `${sp(10)}px ${sp(16)}px`,
    borderRadius: 10, border: `1px solid #1F1F1F`,
    background: bg, color,
    cursor: 'pointer', transition: 'all 0.2s ease',
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', justifyContent: 'center',
  })

  return (
    <>
      <style>{CSS}</style>
      <div className="mp-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        overflowY: 'auto',
      }}>
        <div className="mp-panel" style={{
          maxWidth: 1200, margin: '0 auto', padding: `${sp(32)}px ${sp(24)}px`,
          minHeight: '100vh',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp(28) }}>
            <h1 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: theme.text, margin: 0 }}>
              Member Profile
            </h1>
            <button onClick={handleClose} style={{
              width: 36, height: 36, borderRadius: 10,
              background: theme.bgSec, border: `1px solid ${theme.borderStrong}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: theme.textSec, transition: 'all 0.2s ease',
            }}>
              <X size={18} />
            </button>
          </div>

          {memberLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: theme.textSec, fontFamily: FONT }}>
              Loading...
            </div>
          ) : !member ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: theme.textSec, fontFamily: FONT }}>
              Member not found
            </div>
          ) : (
            <div style={{ display: 'flex', gap: sp(24), alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* ===== LEFT COLUMN (60%) ===== */}
              <div style={{ flex: '1 1 580px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: sp(20) }}>
                {/* Personal Info Card */}
                <div className="mp-card mp-card-1" style={cardStyle}>
                  <div style={{ display: 'flex', gap: sp(18), alignItems: 'flex-start' }}>
                    <Avatar name={member.name} size={64} src={member.photo_url || member.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: theme.text, margin: 0 }}>
                          {member.name}
                        </h2>
                        <span style={{
                          fontFamily: FONT, fontSize: 11, fontWeight: 600,
                          padding: '3px 10px', borderRadius: 20,
                          background: mSt.bg, color: mSt.color,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>{mSt.label}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: sp(10) }}>
                        {member.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.textSec, fontFamily: FONT, fontSize: 14 }}>
                            <Phone size={14} color={theme.textTer} />
                            {member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.textSec, fontFamily: FONT, fontSize: 14 }}>
                            <Mail size={14} color={theme.textTer} />
                            {member.email}
                          </div>
                        )}
                        {member.plan_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.textSec, fontFamily: FONT, fontSize: 14 }}>
                            <IndianRupee size={14} color={theme.textTer} />
                            {member.plan_name}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.textTer, fontFamily: FONT, fontSize: 13 }}>
                          <Calendar size={14} color={theme.textTer} />
                          Member since {formatDate(member.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retention Gauge */}
                <div className="mp-card mp-card-2" style={cardStyle}>
                  <div style={sectionTitle}>Retention Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: sp(24) }}>
                    <RetentionRing score={stats.retentionScore} theme={theme} />
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 14, color: theme.textSec, lineHeight: 1.6 }}>
                        Based on check-in frequency over the last 30 days.
                      </div>
                      <div style={{ fontFamily: FONT_M, fontSize: 14, color: theme.text, marginTop: 8 }}>
                        {Math.round(stats.retentionScore >= 70 ? stats.retentionScore : stats.retentionScore)}% attendance
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: theme.textTer, marginTop: 4 }}>
                        {stats.retentionScore >= 70 ? 'Highly engaged member' : stats.retentionScore >= 30 ? 'Moderately active' : 'At risk of churning'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Ledger */}
                <div className="mp-card mp-card-3" style={{ ...cardStyle, padding: 0 }}>
                  <div style={{ ...sectionTitle, padding: `${sp(22)}px ${sp(22)}px 0` }}>Financial Ledger</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid #1F1F1F` }}>
                          {['Date', 'Description', 'Amount', 'Status', 'Method', ''].map((h) => (
                            <th key={h} style={{
                              padding: `${sp(10)}px ${sp(16)}px`,
                              textAlign: 'left', color: theme.textTer, fontWeight: 500,
                              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                              whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{
                              padding: sp(32), textAlign: 'center', color: theme.textTer,
                            }}>No payment records</td>
                          </tr>
                        ) : payments.map((p, i) => {
                          const pSt = paymentStatusStyle(p.status, theme)
                          return (
                            <tr key={p.id || i} style={{
                              borderBottom: `1px solid #1F1F1F`,
                              transition: 'background 0.15s ease',
                            }}
                              onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: `${sp(12)}px ${sp(16)}px`, color: theme.textSec, whiteSpace: 'nowrap' }}>
                                {formatDate(p.paid_at || p.created_at)}
                              </td>
                              <td style={{ padding: `${sp(12)}px ${sp(16)}px`, color: theme.text }}>
                                {p.description || p.category || 'Membership'}
                              </td>
                              <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap' }}>
                                {formatPaise(p.amount)}
                              </td>
                              <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 10px', borderRadius: 20,
                                  background: pSt.bg, color: pSt.color,
                                  fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                                }}>
                                  {pSt.label === 'Paid' && <CheckCircle size={11} />}
                                  {pSt.label === 'Pending' && <Clock size={11} />}
                                  {(pSt.label === 'failed' || pSt.label === 'refunded') && <XCircle size={11} />}
                                  {pSt.label}
                                </span>
                              </td>
                              <td style={{ padding: `${sp(12)}px ${sp(16)}px`, color: theme.textSec, textTransform: 'capitalize' }}>
                                {p.method || p.payment_method || '—'}
                              </td>
                              <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                                {(p.invoice_id || p.id) && (
                                  <button
                                    onClick={() => window.open(`/api/v1/gyms/${gymId}/invoices/${p.invoice_id || p.id}/pdf`, '_blank')}
                                    style={{
                                      fontFamily: FONT, fontSize: 11, padding: '4px 10px',
                                      borderRadius: 6, border: `1px solid #1F1F1F`,
                                      background: 'transparent', color: theme.textTer,
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <Download size={11} /> PDF
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ===== RIGHT COLUMN (40%) ===== */}
              <div style={{ flex: '0 1 400px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: sp(20) }}>
                {/* Activity Stats */}
                <div className="mp-card mp-card-4" style={cardStyle}>
                  <div style={sectionTitle}>Activity Stats</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: sp(20) }}>
                    <div>
                      <div style={statNumber}>{stats.totalCheckins}</div>
                      <div style={statLabel}>Total Check-ins</div>
                    </div>
                    <div>
                      <div style={{ ...statNumber, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {stats.streak}<Flame size={20} color={stats.streak > 0 ? theme.amber : theme.textTer} />
                      </div>
                      <div style={statLabel}>Current Streak</div>
                    </div>
                    <div>
                      <div style={statNumber}>{stats.avgPerWeek}</div>
                      <div style={statLabel}>Avg / Week</div>
                    </div>
                    <div>
                      <div style={statNumber}>{formatPaise(stats.ltv)}</div>
                      <div style={statLabel}>Lifetime Value</div>
                    </div>
                  </div>
                </div>

                {/* Activity Heatmap */}
                <div className="mp-card mp-card-5" style={cardStyle}>
                  <div style={sectionTitle}>Activity Heatmap</div>
                  <ActivityHeatmap checkins={checkins} theme={theme} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: sp(12), justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: theme.textTer }}>Less</span>
                    {[theme.bgTer, `${theme.brandAccent}4D`, `${theme.brandAccent}99`, theme.brandAccent].map((c, i) => (
                      <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
                    ))}
                    <span style={{ fontFamily: FONT, fontSize: 10, color: theme.textTer }}>More</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mp-card mp-card-6" style={cardStyle}>
                  <div style={sectionTitle}>Quick Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* WhatsApp */}
                    <button
                      onClick={() => {
                        const phone = (member.phone || '').replace(/[^0-9]/g, '')
                        const msg = encodeURIComponent(`Hi ${member.name}, this is a message from ${gym?.name || 'your gym'}. How can we help you today?`)
                        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
                      }}
                      style={actionBtn('#25D36615', '#25D366')}
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </button>

                    {/* Edit Plan */}
                    <button
                      onClick={() => onEditPlan?.(member)}
                      style={actionBtn('transparent', theme.textSec)}
                    >
                      <Edit3 size={16} /> Edit Plan
                    </button>

                    {/* Freeze */}
                    <button
                      disabled={freezeMutation.isPending || member.status === 'paused'}
                      onClick={() => freezeMutation.mutate()}
                      style={{
                        ...actionBtn('transparent', theme.amber),
                        opacity: freezeMutation.isPending || member.status === 'paused' ? 0.4 : 1,
                        cursor: freezeMutation.isPending || member.status === 'paused' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Pause size={16} />
                      {freezeMutation.isPending ? 'Freezing...' : member.status === 'paused' ? 'Already Frozen' : 'Freeze Membership'}
                    </button>

                    {/* Cancel */}
                    <button
                      onClick={() => setShowCancelModal(true)}
                      style={{
                        ...actionBtn(`${theme.red}12`, theme.red),
                        borderColor: `${theme.red}30`,
                      }}
                    >
                      <UserX size={16} /> Cancel Membership
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCancelModal && (
        <CancelModal
          theme={theme}
          sp={sp}
          loading={cancelMutation.isPending}
          onClose={() => setShowCancelModal(false)}
          onConfirm={(reason, notes) => cancelMutation.mutate({ reason, notes })}
        />
      )}
    </>
  )
}
