import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { formatPaise, formatDate, debounce } from '../../lib/utils'
import api from '../../lib/api'
import {
  IndianRupee, TrendingUp, TrendingDown, Download, RefreshCw, Clock,
  AlertTriangle, ChevronLeft, ChevronRight, Plus, Search, X,
  Banknote, Smartphone, CreditCard, HelpCircle, Landmark, PieChart as PieChartIcon,
  FileText, MessageCircle, Mail, ChevronDown, ShoppingBag,
} from 'lucide-react'
import Avatar from '../../components/ui/Avatar'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

const CATEGORIES = ['Membership', 'Personal Training', 'Supplement', 'Locker', 'Other']
const METHODS = ['Cash', 'UPI', 'Card', 'Other']

function paymentStatusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s === 'paid' || s === 'captured' || s === 'completed')
    return { bg: `${theme.green}15`, color: theme.green, label: s === 'captured' ? 'Paid' : s }
  if (s === 'failed' || s === 'refunded')
    return { bg: `${theme.red}15`, color: theme.red, label: s }
  if (s === 'pending' || s === 'created')
    return { bg: `${theme.amber}15`, color: theme.amber, label: 'Pending' }
  return { bg: `${theme.textTer}15`, color: theme.textTer, label: s || 'Unknown' }
}

function dunningStageStyle(stage, theme) {
  const n = Number(stage) || 0
  if (n <= 1) return { bg: `${theme.amber}15`, color: theme.amber }
  if (n <= 3) return { bg: `${theme.amber}25`, color: theme.amber }
  return { bg: `${theme.red}15`, color: theme.red }
}

function MethodIcon({ method, size = 15, color }) {
  const m = (method || '').toLowerCase()
  if (m === 'cash' || m === 'manual') return <Banknote size={size} color={color} />
  if (m === 'upi') return <Smartphone size={size} color={color} />
  if (m === 'card' || m === 'stripe') return <CreditCard size={size} color={color} />
  if (m === 'bank' || m === 'neft' || m === 'imps') return <Landmark size={size} color={color} />
  return <HelpCircle size={size} color={color} />
}

function methodLabel(method) {
  const m = (method || '').toLowerCase()
  if (m === 'cash' || m === 'manual') return 'Cash'
  if (m === 'upi') return 'UPI'
  if (m === 'card' || m === 'stripe') return 'Card'
  if (m === 'bank' || m === 'neft' || m === 'imps') return 'Bank'
  return method || '—'
}

// Invoice receipt dropdown with multi-channel send options
function InvoiceDropdown({ payment, gymId, theme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const invoiceId = payment.invoice_id || payment.id

  const handleDownload = async () => {
    setOpen(false)
    try {
      const res = await api.get(`/gyms/${gymId}/invoices/${invoiceId}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${payment.member_name || 'member'}-${formatDate(payment.paid_at || payment.created_at)}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(`/api/v1/gyms/${gymId}/invoices/${invoiceId}/pdf`, '_blank')
    }
  }

  const handleSend = async (method) => {
    setOpen(false)
    try {
      await api.post(`/gyms/${gymId}/invoices/${invoiceId}/send`, { method })
      toast.success(`Invoice sent via ${method}`)
    } catch {
      toast.error(`Failed to send via ${method}`)
    }
  }

  const gateway = payment.gateway || payment.source || ''
  const gatewayLabel = gateway === 'razorpay' ? 'Razorpay' : gateway === 'stripe' ? 'Stripe' : ''

  const actions = [
    { icon: Download, label: 'Download PDF', action: handleDownload },
    { icon: Mail, label: 'Send via Email', action: () => handleSend('email') },
    { icon: MessageCircle, label: 'Send via WhatsApp', action: () => handleSend('whatsapp') },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', fontSize: 12, fontWeight: 500, fontFamily: FONT,
          color: theme.textSec, background: 'transparent',
          border: `1px solid ${theme.border}`,
          borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.text }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSec }}
      >
        <FileText size={13} />
        Receipt
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: theme.bgSec, border: `1px solid ${theme.border}`,
          borderRadius: 10, minWidth: 180, zIndex: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
          {gatewayLabel && (
            <div style={{
              padding: '8px 14px', fontSize: 11, color: theme.textTer,
              borderBottom: `1px solid ${theme.border}`, fontFamily: FONT,
            }}>
              Paid via {gatewayLabel}
            </div>
          )}
          {actions.map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', border: 'none', background: 'transparent',
              color: theme.textSec, fontSize: 13, fontFamily: FONT,
              cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.text }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSec }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple pie chart SVG component (no external deps)
function RevenuePieChart({ data, theme }) {
  if (!data || data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const COLORS = [theme.text, theme.textSec, theme.textTer, `${theme.text}80`, `${theme.text}50`]
  const cx = 80, cy = 80, r = 70
  let cumulative = 0

  const slices = data.map((d, i) => {
    const pct = d.value / total
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2
    cumulative += pct
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2
    const largeArc = pct > 0.5 ? 1 : 0

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)

    // If only one slice at 100%, draw a circle
    if (pct >= 0.999) {
      return (
        <circle key={i} cx={cx} cy={cy} r={r} fill={COLORS[i % COLORS.length]} />
      )
    }

    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={COLORS[i % COLORS.length]}
      />
    )
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {slices}
        <circle cx={cx} cy={cy} r={40} fill={theme.bgSec} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={theme.text}
          style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT }}>
          {formatPaise(total)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={theme.textTer}
          style={{ fontSize: 9, fontWeight: 500, fontFamily: FONT }}>
          THIS MONTH
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: COLORS[i % COLORS.length], flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: theme.textSec, fontFamily: FONT, minWidth: 100 }}>
              {d.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: FONT_M }}>
              {formatPaise(d.value)}
            </span>
            <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT }}>
              ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Add Payment Modal
function AddPaymentModal({ open, onClose, gymId, theme, sp }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Membership')
  const [method, setMethod] = useState('Cash')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)

  const debouncedSearch = useCallback(debounce((q) => setMemberSearch(q), 300), [])

  const { data: searchResults } = useQuery({
    queryKey: ['member-search', gymId, memberSearch],
    queryFn: () =>
      api.get(`/gyms/${gymId}/members`, { params: { search: memberSearch, limit: 8 } })
        .then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!gymId && memberSearch.length >= 2,
    staleTime: 10_000,
  })

  const addPayment = useMutation({
    mutationFn: (payload) => api.post(`/gyms/${gymId}/payments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', gymId] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats', gymId] })
      queryClient.invalidateQueries({ queryKey: ['member-payments'] })
      toast.success('Payment recorded successfully')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  })

  const handleSubmit = () => {
    if (!selectedMember) return toast.error('Select a member')
    const paise = Math.round(parseFloat(amount) * 100)
    if (!paise || paise <= 0) return toast.error('Enter a valid amount')

    addPayment.mutate({
      member_id: selectedMember.id,
      amount_paise: paise,
      category,
      method: method.toLowerCase(),
      status: 'captured',
      source: 'manual',
    })
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedMember(null)
      setAmount('')
      setCategory('Membership')
      setMethod('Cash')
      setMemberSearch('')
    }
  }, [open])

  if (!open) return null

  const members = searchResults || []

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 1000,
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 440, background: theme.bgSec,
        border: `1px solid ${theme.border}`, borderRadius: 16,
        zIndex: 1001, overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: `${sp(20)}px ${sp(24)}px`,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: 17, fontWeight: 700, color: theme.text, fontFamily: FONT,
            }}>Add Payment</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: theme.textTer, fontFamily: FONT }}>
              Record a manual payment
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: theme.bgTer, color: theme.textSec, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: `${sp(20)}px ${sp(24)}px` }}>
          {/* Member Search */}
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec,
            marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Member</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            {selectedMember ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: theme.bgTer,
                border: `1px solid ${theme.border}`, borderRadius: 10,
              }}>
                <Avatar name={selectedMember.name} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT }}>
                    {selectedMember.name}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textTer, fontFamily: FONT }}>
                    {selectedMember.phone || selectedMember.email}
                  </div>
                </div>
                <button onClick={() => { setSelectedMember(null); setMemberSearch('') }} style={{
                  background: 'none', border: 'none', color: theme.textTer,
                  cursor: 'pointer', padding: 4,
                }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: theme.textTer, pointerEvents: 'none',
                  }} />
                  <input
                    ref={searchRef}
                    placeholder="Search by name or phone..."
                    onChange={(e) => {
                      debouncedSearch(e.target.value)
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    style={{
                      width: '100%', padding: '10px 14px 10px 36px',
                      background: theme.bg, border: `1px solid ${theme.border}`,
                      borderRadius: 10, fontSize: 14, color: theme.text,
                      fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.target.style.borderColor = theme.borderStrong}
                    onMouseLeave={(e) => { if (document.activeElement !== e.target) e.target.style.borderColor = theme.border }}
                  />
                </div>
                {showDropdown && members.length > 0 && (
                  <div ref={dropdownRef} style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: theme.bgSec, border: `1px solid ${theme.border}`,
                    borderRadius: 10, maxHeight: 200, overflow: 'auto', zIndex: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}>
                    {members.map((m) => (
                      <button key={m.id} onClick={() => {
                        setSelectedMember(m)
                        setShowDropdown(false)
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Avatar name={m.name} size={28} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: theme.text, fontFamily: FONT }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: 12, color: theme.textTer, fontFamily: FONT }}>
                            {m.phone || m.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Amount */}
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec,
            marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Amount</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 15, fontWeight: 600, color: theme.textTer, fontFamily: FONT,
              pointerEvents: 'none',
            }}>₹</span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', padding: '10px 14px 10px 32px',
                background: theme.bg, border: `1px solid ${theme.border}`,
                borderRadius: 10, fontSize: 18, fontWeight: 600, color: theme.text,
                fontFamily: FONT_M, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = theme.borderStrong}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          {/* Category + Method row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec,
                marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{
                width: '100%', padding: '10px 14px', background: theme.bg,
                border: `1px solid ${theme.border}`, borderRadius: 10,
                fontSize: 14, color: theme.text, fontFamily: FONT,
                outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(theme.textTer)}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec,
                marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={{
                width: '100%', padding: '10px 14px', background: theme.bg,
                border: `1px solid ${theme.border}`, borderRadius: 10,
                fontSize: 14, color: theme.text, fontFamily: FONT,
                outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(theme.textTer)}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={addPayment.isPending}
            style={{
              width: '100%', padding: '12px 20px', fontSize: 14, fontWeight: 700,
              fontFamily: FONT, color: theme.bg === '#000000' ? '#000' : '#fff',
              background: theme.text, border: 'none', borderRadius: 10,
              cursor: addPayment.isPending ? 'not-allowed' : 'pointer',
              opacity: addPayment.isPending ? 0.6 : 1,
              transition: 'all 0.15s', letterSpacing: '-0.01em',
            }}
          >
            {addPayment.isPending ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function Payments() {
  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const toast = useToast()
  const gymId = gym?.id
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddPayment, setShowAddPayment] = useState(false)
  const limit = 20

  // Revenue stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/stats`).then((res) => res.data),
    enabled: !!gymId,
    refetchInterval: 60_000,
  })

  // Payments list with server-side pagination + status filter
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', gymId, page, statusFilter],
    queryFn: () =>
      api.get(`/gyms/${gymId}/payments`, {
        params: { page, limit, ...(statusFilter && { status: statusFilter }) },
      }).then((res) => res.data),
    enabled: !!gymId,
    keepPreviousData: true,
  })

  // Revenue breakdown by category (for pie chart)
  const { data: revenueBreakdown } = useQuery({
    queryKey: ['revenue-breakdown', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/payments/breakdown`).then((r) => r.data),
    enabled: !!gymId,
    staleTime: 60_000,
  })

  // Dunning status
  const { data: dunningData, isLoading: dunningLoading } = useQuery({
    queryKey: ['dunning', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/dunning`).then((res) => res.data),
    enabled: !!gymId,
  })

  // Failed payments
  const { data: failedData } = useQuery({
    queryKey: ['payments-failed', gymId],
    queryFn: () =>
      api.get(`/gyms/${gymId}/payments`, { params: { status: 'failed', limit: 10 } })
        .then((r) => r.data),
    enabled: !!gymId,
  })

  const runDunning = useMutation({
    mutationFn: () => api.post(`/gyms/${gymId}/dunning/run`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dunning', gymId] })
      queryClient.invalidateQueries({ queryKey: ['payments', gymId] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats', gymId] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      const processed = res?.data?.processed ?? 0
      toast.success(`Dunning complete: ${processed} member${processed !== 1 ? 's' : ''} processed`)
      setLastDunningRun(new Date().toISOString())
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Dunning failed'),
  })

  const [lastDunningRun, setLastDunningRun] = useState(() =>
    localStorage.getItem('ivira_last_dunning') || null
  )

  const handleRunDunning = () => {
    runDunning.mutate()
  }

  if (lastDunningRun) {
    localStorage.setItem('ivira_last_dunning', lastDunningRun)
  }

  const payments = paymentsData?.data ?? []
  const total = paymentsData?.total ?? 0
  const totalPages = Math.ceil(total / limit)
  const dunningMembers = dunningData?.data ?? []
  const failedPayments = failedData?.data ?? []

  const todayRevenue = stats?.todayRevenue ?? 0
  const weekRevenue = stats?.weekRevenue ?? 0
  const monthRevenue = stats?.monthRevenue ?? 0

  const weeklyAvg = monthRevenue > 0 ? Math.round(monthRevenue / 4) : 0
  const weekTrend = weeklyAvg > 0 ? Math.round(((weekRevenue - weeklyAvg) / weeklyAvg) * 100) : 0

  const stockValue = stats?.stockValue ?? 0

  const statCards = [
    { label: "Today's Revenue", value: todayRevenue, icon: IndianRupee },
    { label: 'This Week', value: weekRevenue, icon: TrendingUp, trend: weekTrend },
    { label: 'This Month', value: monthRevenue, icon: IndianRupee },
    ...(stockValue > 0 ? [{ label: 'Stock Value', value: stockValue, icon: ShoppingBag }] : []),
  ]

  const STATUS_FILTERS = [
    { value: '', label: 'All' },
    { value: 'captured', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ]

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  // Build pie chart data from breakdown or fallback to stats
  const pieData = (() => {
    if (revenueBreakdown?.data && Array.isArray(revenueBreakdown.data)) {
      return revenueBreakdown.data
        .filter((d) => d.value > 0 || d.amount_paise > 0)
        .map((d) => ({ label: d.category || d.label, value: d.amount_paise || d.value }))
    }
    // Fallback: build from stats if available
    const fallback = []
    if (stats?.revenueByCategory) {
      Object.entries(stats.revenueByCategory).forEach(([k, v]) => {
        if (v > 0) fallback.push({ label: k, value: v })
      })
    }
    return fallback
  })()

  async function handleDownloadInvoice(payment) {
    try {
      const invoiceId = payment.invoice_id || payment.id
      const response = await api.get(`/gyms/${gymId}/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${payment.member_name || 'member'}-${formatDate(payment.paid_at || payment.created_at)}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(`/api/v1/gyms/${gymId}/invoices/${payment.invoice_id || payment.id}/pdf`, '_blank')
    }
  }

  return (
    <div style={{
      padding: `${sp(32)}px ${sp(40)}px`, maxWidth: 1200, margin: '0 auto',
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{
        marginBottom: sp(28), display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
          }}>
            Payments
          </h1>
          <p style={{ fontSize: 14, color: theme.textSec, margin: '4px 0 0', fontWeight: 400 }}>
            Revenue overview and payment history
          </p>
        </div>
        <button
          onClick={() => setShowAddPayment(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: `${sp(10)}px ${sp(20)}px`,
            fontSize: 13, fontWeight: 700, fontFamily: FONT,
            color: theme.bg === '#000000' ? '#000' : '#fff',
            background: theme.text,
            border: 'none', borderRadius: 10,
            cursor: 'pointer', transition: 'all 0.15s',
            letterSpacing: '-0.01em',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Payment
        </button>
      </div>

      {/* Revenue Stat Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: sp(16), marginBottom: sp(28),
      }}>
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              height: 120, background: theme.bgSec, border: `1px solid ${theme.border}`,
              borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))
        ) : (
          statCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} style={{
                background: theme.bgSec, border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: sp(24), position: 'relative',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontSize: 12, color: theme.textSec, fontWeight: 500,
                    textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT,
                  }}>
                    {card.label}
                  </span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: theme.bgTer,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={theme.textSec} />
                  </div>
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 600, color: theme.text,
                  fontFamily: FONT, lineHeight: 1, letterSpacing: '-0.02em',
                }}>
                  {formatPaise(card.value)}
                </div>
                {card.trend !== undefined && card.trend !== 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
                  }}>
                    {card.trend >= 0
                      ? <TrendingUp size={13} color={theme.green} />
                      : <TrendingDown size={13} color={theme.red} />
                    }
                    <span style={{
                      fontSize: 12, fontWeight: 500, fontFamily: FONT,
                      color: card.trend >= 0 ? theme.green : theme.red,
                    }}>
                      {card.trend > 0 ? '+' : ''}{card.trend}% vs weekly avg
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Revenue Breakdown Pie Chart */}
      {pieData.length > 0 && (
        <div style={{
          background: theme.bgSec, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: sp(24), marginBottom: sp(28),
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          }}>
            <PieChartIcon size={16} color={theme.textSec} />
            <h2 style={{
              fontSize: 16, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
            }}>Revenue Breakdown</h2>
          </div>
          <RevenuePieChart data={pieData} theme={theme} />
        </div>
      )}

      {/* Payment History */}
      <div style={{
        background: theme.bgSec, border: `1px solid ${theme.border}`,
        borderRadius: 12, marginBottom: sp(28), overflow: 'hidden',
      }}>
        {/* Header + Filters */}
        <div style={{
          padding: `${sp(20)}px ${sp(24)}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <h2 style={{
            fontSize: 16, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
          }}>
            Payment History
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1) }}
                style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: statusFilter === f.value ? 600 : 400,
                  fontFamily: FONT,
                  color: statusFilter === f.value ? (theme.bg === '#000000' ? '#000' : '#fff') : theme.textSec,
                  background: statusFilter === f.value ? theme.text : 'transparent',
                  border: `1px solid ${statusFilter === f.value ? theme.text : theme.border}`,
                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {paymentsLoading ? (
          <div style={{ padding: sp(24) }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                height: 48, background: theme.bgTer, borderRadius: 8,
                marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div style={{
            padding: '60px 40px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
          }}>
            <IndianRupee size={32} color={theme.textTer} style={{ marginBottom: 16 }} />
            <h3 style={{
              color: theme.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px', fontFamily: FONT,
            }}>
              {statusFilter ? `No ${statusFilter} payments` : 'No payments yet'}
            </h3>
            <p style={{ color: theme.textSec, fontSize: 14, margin: 0, fontFamily: FONT }}>
              {statusFilter ? 'Try a different filter.' : 'Payments will appear here once members start paying for memberships.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: FONT,
              }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                    {['Date', 'Member', 'Method', 'Amount', 'Status', 'Action'].map((col) => (
                      <th key={col} style={{
                        padding: `${sp(12)}px ${sp(24)}px`, fontWeight: 500,
                        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: theme.textTer, textAlign: 'left',
                        background: 'transparent', border: 'none', fontFamily: FONT,
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const st = paymentStatusStyle(payment.status, theme)
                    const payMethod = payment.method || payment.source || ''
                    return (
                      <tr key={payment.id}
                        style={{ transition: 'background 0.15s', borderBottom: `1px solid ${theme.border}` }}
                        onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{
                          padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                          color: theme.textSec, fontSize: 13, fontFamily: FONT, whiteSpace: 'nowrap',
                        }}>
                          {formatDate(payment.paid_at || payment.created_at)}
                        </td>
                        <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
                            <Avatar name={payment.member_name} size={32} />
                            <div>
                              <div style={{
                                fontWeight: 600, color: theme.text, fontSize: 14, fontFamily: FONT,
                              }}>
                                {payment.member_name}
                              </div>
                              {(payment.plan_name || payment.category) && (
                                <div style={{
                                  fontSize: 12, color: theme.textTer, marginTop: 1, fontFamily: FONT,
                                }}>
                                  {payment.category || payment.plan_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: `${sp(14)}px ${sp(16)}px`, border: 'none' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 6,
                            background: theme.bgTer, fontSize: 12, fontWeight: 500,
                            color: theme.textSec, fontFamily: FONT,
                          }}>
                            <MethodIcon method={payMethod} size={13} color={theme.textSec} />
                            {methodLabel(payMethod)}
                          </div>
                        </td>
                        <td style={{
                          padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                          fontWeight: 600, fontSize: 14, fontFamily: FONT_M, color: theme.text,
                        }}>
                          {formatPaise(payment.amount_paise ?? payment.amount)}
                        </td>
                        <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', fontSize: 12, fontWeight: 600,
                            borderRadius: 6, background: st.bg, color: st.color,
                            textTransform: 'capitalize', fontFamily: FONT,
                          }}>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%', background: st.color,
                            }} />
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                          <InvoiceDropdown payment={payment} gymId={gymId} theme={theme} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: `${sp(14)}px ${sp(24)}px`,
                borderTop: `1px solid ${theme.border}`,
              }}>
                <span style={{ color: theme.textSec, fontSize: 13, fontFamily: FONT }}>
                  {startItem}–{endItem} of {total}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '6px 10px', background: theme.bgTer,
                      border: `1px solid ${theme.border}`, borderRadius: 6,
                      color: page === 1 ? theme.textTer : theme.textSec,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '6px 10px', background: theme.bgTer,
                      border: `1px solid ${theme.border}`, borderRadius: 6,
                      color: page === totalPages ? theme.textTer : theme.textSec,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Failed Payments */}
      {failedPayments.length > 0 && (
        <div style={{
          background: theme.bgSec, border: `1px solid ${theme.border}`,
          borderRadius: 12, marginBottom: sp(28), overflow: 'hidden',
        }}>
          <div style={{
            padding: `${sp(20)}px ${sp(24)}px`,
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={16} color={theme.red} />
            <h2 style={{
              fontSize: 16, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
            }}>Failed Payments</h2>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: FONT_M,
              color: theme.red, background: `${theme.red}15`,
              padding: '2px 8px', borderRadius: 10,
            }}>{failedPayments.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: FONT,
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {['Member', 'Amount', 'Date', 'Method'].map((col) => (
                    <th key={col} style={{
                      padding: `${sp(12)}px ${sp(24)}px`, fontWeight: 500,
                      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: theme.textTer, textAlign: 'left',
                      background: 'transparent', border: 'none', fontFamily: FONT,
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedPayments.map((p) => (
                  <tr key={p.id}
                    style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={p.member_name} size={28} />
                        <span style={{ fontWeight: 600, color: theme.text, fontSize: 14, fontFamily: FONT }}>
                          {p.member_name}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                      fontWeight: 600, color: theme.red, fontFamily: FONT_M,
                    }}>
                      {formatPaise(p.amount_paise ?? p.amount)}
                    </td>
                    <td style={{
                      padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                      color: theme.textSec, fontSize: 13, fontFamily: FONT,
                    }}>
                      {formatDate(p.paid_at || p.created_at)}
                    </td>
                    <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 6,
                        background: theme.bgTer, fontSize: 12, fontWeight: 500,
                        color: theme.textSec, fontFamily: FONT,
                      }}>
                        <MethodIcon method={p.method || p.source} size={13} color={theme.textSec} />
                        {methodLabel(p.method || p.source)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dunning Section */}
      <div style={{
        background: theme.bgSec, border: `1px solid ${theme.border}`,
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          padding: `${sp(20)}px ${sp(24)}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h2 style={{
              fontSize: 16, fontWeight: 600, color: theme.text, margin: 0, fontFamily: FONT,
            }}>
              Dunning Status
            </h2>
            <p style={{ fontSize: 13, color: theme.textSec, margin: '4px 0 0', fontFamily: FONT }}>
              Automated payment retry reminders
            </p>
            {lastDunningRun && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
              }}>
                <Clock size={12} color={theme.textTer} />
                <span style={{
                  fontSize: 11, color: theme.textTer, fontFamily: FONT,
                }}>
                  Last run: {formatDate(lastDunningRun)} at {new Date(lastDunningRun).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleRunDunning}
            disabled={runDunning.isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: `${sp(10)}px ${sp(20)}px`,
              fontSize: 13, fontWeight: 600, fontFamily: FONT,
              color: theme.bg === '#000000' ? '#000' : '#fff',
              background: theme.text,
              border: 'none', borderRadius: 8,
              cursor: runDunning.isPending ? 'not-allowed' : 'pointer',
              opacity: runDunning.isPending ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={14} style={{
              animation: runDunning.isPending ? 'spin 1s linear infinite' : 'none',
            }} />
            {runDunning.isPending ? 'Running...' : 'Run Dunning'}
          </button>
        </div>

        {dunningLoading ? (
          <div style={{ padding: sp(24) }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 48, background: theme.bgTer, borderRadius: 8,
                marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : dunningMembers.length === 0 ? (
          <div style={{
            padding: '48px 40px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
          }}>
            <TrendingUp size={28} color={theme.green} style={{ marginBottom: 12 }} />
            <h3 style={{
              color: theme.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px', fontFamily: FONT,
            }}>
              No dunning cases
            </h3>
            <p style={{ color: theme.textSec, fontSize: 14, margin: 0, fontFamily: FONT }}>
              All members are up to date with payments.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: FONT,
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {['Member', 'Amount', 'Stage', 'Expired', 'Last Attempt'].map((col) => (
                    <th key={col} style={{
                      padding: `${sp(12)}px ${sp(24)}px`, fontWeight: 500,
                      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: theme.textTer, textAlign: 'left',
                      background: 'transparent', border: 'none', fontFamily: FONT,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dunningMembers.map((member) => {
                  const ds = dunningStageStyle(member.dunning_step || member.dunning_stage, theme)
                  return (
                    <tr key={member.id || member.membership_id}
                      style={{ transition: 'background 0.15s', borderBottom: `1px solid ${theme.border}` }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
                          <Avatar name={member.name || member.member_name} size={32} />
                          <div>
                            <div style={{
                              fontWeight: 600, color: theme.text, fontSize: 14, fontFamily: FONT,
                            }}>
                              {member.name || member.member_name}
                            </div>
                            <div style={{
                              fontSize: 12, color: theme.textTer, marginTop: 1, fontFamily: FONT,
                            }}>
                              {member.phone || member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                        fontWeight: 600, color: theme.text, fontFamily: FONT,
                      }}>
                        {member.amount_paise ? formatPaise(member.amount_paise) : '--'}
                      </td>
                      <td style={{ padding: `${sp(14)}px ${sp(24)}px`, border: 'none' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', fontSize: 12, fontWeight: 600,
                          borderRadius: 6, background: ds.bg, color: ds.color, fontFamily: FONT,
                        }}>
                          <AlertTriangle size={11} />
                          Stage {member.dunning_step || member.dunning_stage || 1}
                        </span>
                      </td>
                      <td style={{
                        padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                        color: theme.red, fontSize: 13, fontFamily: FONT, fontWeight: 500,
                      }}>
                        {member.end_date ? formatDate(member.end_date) : '--'}
                      </td>
                      <td style={{
                        padding: `${sp(14)}px ${sp(24)}px`, border: 'none',
                        color: theme.textSec, fontSize: 13, fontFamily: FONT,
                      }}>
                        {member.dunning_next_at ? formatDate(member.dunning_next_at) : member.last_attempt ? formatDate(member.last_attempt) : 'N/A'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <AddPaymentModal
        open={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        gymId={gymId}
        theme={theme}
        sp={sp}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
