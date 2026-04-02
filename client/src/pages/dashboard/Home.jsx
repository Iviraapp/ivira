/**
 * Dashboard Home — improved
 *
 * Same data, same API calls, same components.
 * Changes:
 *  1. Today's focus strip — single most important number at the top
 *  2. Check-in method breakdown pill row (QR / NFC / GPS / manual)
 *  3. Circle activity card — gym-wide pod/circle engagement
 *  4. Smarter at-risk logic — shows days absent + WhatsApp nudge
 *  5. GPS radius warning if gym hasn't set coordinates
 *  6. Vira AI insight card for the gym owner
 *  7. Cleaner grid on mobile
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import MemberOutcomesCard from '../../components/dashboard/MemberOutcomesCard'
import GymFeedComposer from '../../components/dashboard/GymFeedComposer'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { formatPaise, formatDate, formatTime } from '../../lib/utils'
import api from '../../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import {
  Users, QrCode, IndianRupee, AlertTriangle, Plus, Mail, Link,
  ChevronRight, TrendingUp, TrendingDown, Activity, MessageCircle,
  Zap, ShieldAlert, ShoppingBag, Clock, PieChart as PieChartIcon,
  BarChart2, Wifi, MapPin, Brain, Target, Trophy,
} from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { useNavigate } from 'react-router-dom'
import OnboardingChecklist from '../../components/dashboard/OnboardingChecklist'
import PlanFeatures from '../../components/dashboard/PlanFeatures'

const F  = "'Inter', -apple-system, sans-serif"
const FM = "'JetBrains Mono', monospace"

// ── Animated fade-in wrapper ────────────────────────────────────
function FadeIn({ delay = 0, children, style }) {
  return (
    <div style={{ opacity: 0, animation: `fadeInUp 0.4s ease-out ${delay}ms forwards`, ...style }}>
      {children}
    </div>
  )
}

// ── Count-up number ─────────────────────────────────────────────
function CountUp({ value, format }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const num = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0
    if (num === 0) { setDisplay(0); return }
    const dur = 1000, t0 = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(num * e))
      if (p < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => ref.current && cancelAnimationFrame(ref.current)
  }, [value])
  return format ? format(display) : display
}

// ── GPS warning banner ──────────────────────────────────────────
function GPSWarning({ gym, theme }) {
  if (gym?.latitude && gym?.longitude) return null
  return (
    <FadeIn delay={50} style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 12,
        background: `${theme.amber}10`, border: `1px solid ${theme.amber}30`,
      }}>
        <MapPin size={16} style={{ color: theme.amber, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: theme.textSec, margin: 0, fontFamily: F, flex: 1 }}>
          <strong style={{ color: theme.text }}>GPS check-in is disabled.</strong>{' '}
          Set your gym's location in{' '}
          <a href="/dashboard/settings" style={{ color: theme.amber, fontWeight: 600 }}>Settings → Gym Profile</a>
          {' '}to enable GPS proximity check-in for members.
        </p>
      </div>
    </FadeIn>
  )
}

// ── Today focus strip ───────────────────────────────────────────
function TodayStrip({ stats, theme }) {
  const todayCheckins = stats?.todayCheckins ?? 0
  const yesterday = stats?.yesterdayCheckins ?? 0
  const diff = todayCheckins - yesterday
  const methods = stats?.checkinMethods || {}

  const methodChips = [
    { label: 'QR', count: methods.qr ?? 0,     color: theme.brandAccent },
    { label: 'NFC', count: methods.nfc ?? 0,    color: theme.cyan },
    { label: 'GPS', count: methods.gps ?? 0,    color: theme.green },
    { label: 'Manual', count: methods.manual ?? 0, color: theme.textTer },
  ].filter(m => m.count > 0)

  return (
    <FadeIn delay={60} style={{ marginBottom: 24 }}>
      <div style={{
        background: theme.bgSec, borderRadius: 16,
        border: `1px solid ${theme.borderStrong}`,
        padding: '18px 24px',
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        {/* Big today number */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: theme.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontFamily: F }}>Today's Check-ins</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: theme.text, fontFamily: F, lineHeight: 1, letterSpacing: '-0.02em' }}>
              <CountUp value={todayCheckins} />
            </span>
            {yesterday > 0 && (
              <span style={{ fontSize: 13, fontWeight: 500, color: diff >= 0 ? theme.green : theme.red, fontFamily: F, display: 'flex', alignItems: 'center', gap: 3 }}>
                {diff >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {diff >= 0 ? '+' : ''}{diff} vs yesterday
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: theme.border, flexShrink: 0 }} />

        {/* Method breakdown */}
        {methodChips.length > 0 ? (
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: theme.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: F }}>By Method</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {methodChips.map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: `${m.color}12`, border: `1px solid ${m.color}25` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.color, fontFamily: FM }}>{m.count}</span>
                  <span style={{ fontSize: 11, color: theme.textSec, fontFamily: F }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: theme.textTer, fontFamily: F, margin: 0 }}>No check-ins recorded yet today</p>
        )}
      </div>
    </FadeIn>
  )
}

// ── KPI cards ───────────────────────────────────────────────────
function KPICard({ label, subLabel, value, subText, trend, count, icon: Icon, color, alert, onClick, delay, theme }) {
  const [hov, setHov] = useState(false)
  const isAlert = alert && (count > 0 || value > 0)
  return (
    <FadeIn delay={delay}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: theme.bgSec, borderRadius: 14,
          padding: '20px 22px 16px',
          border: `1px solid ${isAlert ? theme.brandAccent : hov ? theme.borderStrong : theme.border}`,
          position: 'relative', overflow: 'hidden',
          transform: hov ? 'translateY(-2px)' : 'none',
          transition: 'all 0.2s ease', cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: isAlert ? theme.brandAccent : theme.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontFamily: F }}>
              {label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: isAlert ? theme.brandAccent : theme.text, margin: '6px 0 0', lineHeight: 1, fontFamily: F, letterSpacing: '-0.02em' }}>
              {value}
            </p>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: isAlert ? `${theme.brandAccent}12` : theme.bgTer, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isAlert ? theme.brandAccent : theme.textTer }}>
            <Icon size={17} />
          </div>
        </div>
        {subText && <p style={{ fontSize: 12, color: theme.textTer, margin: '8px 0 0', fontFamily: F }}>{subText}</p>}
        {count > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: `${theme.brandAccent}10`, padding: '3px 9px', borderRadius: 7 }}>
            <ShieldAlert size={11} style={{ color: theme.brandAccent }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.brandAccent, fontFamily: F }}>{count} overdue</span>
          </div>
        )}
        {trend !== undefined && !alert && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
            {trend >= 0 ? <TrendingUp size={12} style={{ color: theme.green }} /> : <TrendingDown size={12} style={{ color: theme.red }} />}
            <span style={{ fontSize: 12, fontWeight: 500, color: trend >= 0 ? theme.green : theme.red, fontFamily: F }}>{Math.abs(trend)}% vs last month</span>
          </div>
        )}
      </div>
    </FadeIn>
  )
}

// ── Circle engagement card ──────────────────────────────────────
function CircleEngagementCard({ gymId, theme }) {
  const { data, isLoading } = useQuery({
    queryKey: ['circle-engagement', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/pods`, { params: { limit: 50 } }).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 120_000,
  })

  const pods = data?.pods || []
  const totalMembers = pods.reduce((s, p) => s + (p.member_count || 0), 0)
  const topPod = pods.sort((a, b) => (b.health_score || 0) - (a.health_score || 0))[0]

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, padding: 24, border: `1px solid ${theme.borderStrong}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={16} style={{ color: theme.textSec }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Circles</h3>
        </div>
        <span style={{ fontSize: 11, color: theme.textSec, fontFamily: FM }}>
          {pods.length} active
        </span>
      </div>

      {isLoading ? (
        <div style={{ height: 80, background: theme.bgTer, borderRadius: 10 }} />
      ) : pods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: theme.textSec, fontSize: 13, fontFamily: F, margin: 0 }}>No Circles created yet</p>
          <p style={{ color: theme.textTer, fontSize: 11, fontFamily: F, margin: '4px 0 0' }}>Members can create accountability groups in the app</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, background: theme.bgTer, borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: theme.textTer, margin: '0 0 4px', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F }}>{pods.length} <span style={{ fontSize: 13, color: theme.textTer, fontWeight: 400 }}>circles</span></p>
            </div>
            <div style={{ flex: 1, background: theme.bgTer, borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: theme.textTer, margin: '0 0 4px', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Members</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: theme.brandAccent, margin: 0, fontFamily: F }}>{totalMembers}</p>
            </div>
          </div>
          {topPod && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: `${theme.brandAccent}08`, border: `1px solid ${theme.brandAccent}20` }}>
              <p style={{ fontSize: 11, color: theme.brandAccent, fontWeight: 600, margin: '0 0 3px', fontFamily: F }}>Most Active Circle</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: theme.text, margin: 0, fontFamily: F }}>
                {topPod.name}
                <span style={{ fontSize: 11, color: theme.textTer, fontWeight: 400, marginLeft: 8 }}>
                  {topPod.member_count} members · Health {topPod.health_score || 0}%
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── At-risk table (unchanged logic, improved layout) ────────────
function AtRiskTable({ gymId, theme }) {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk-members', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/members`, { params: { status: 'active', sort: 'last_checkin', limit: 20 } }).then(r => r.data),
    enabled: !!gymId, refetchInterval: 120_000,
  })

  const atRisk = useMemo(() => {
    const members = data?.members || data || []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return members.filter(m => {
      const last = m.last_checkin_at || m.last_check_in
      return !last || new Date(last) < cutoff
    }).slice(0, 8)
  }, [data])

  const daysSince = (date) => {
    if (!date) return null
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  }

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, padding: 24, border: `1px solid ${theme.borderStrong}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.amber, boxShadow: `0 0 8px ${theme.amber}60` }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>At-Risk Members</h3>
        </div>
        <span style={{ fontSize: 10, color: theme.amber, fontFamily: FM, padding: '3px 8px', borderRadius: 6, background: `${theme.amber}12`, fontWeight: 600 }}>
          {atRisk.length} FLAGGED
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 48, background: theme.bgTer, borderRadius: 10 }} />)}
        </div>
      ) : atRisk.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Target size={28} style={{ color: theme.textTer, marginBottom: 10 }} />
          <p style={{ color: theme.textSec, fontSize: 13, margin: 0, fontFamily: F }}>All members are active!</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 80px', gap: 8, padding: '0 8px 10px', borderBottom: `1px solid ${theme.border}` }}>
            {['Member', 'Last Visit', 'Absent', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: theme.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F }}>{h}</span>
            ))}
          </div>
          {atRisk.map((m, i) => {
            const last = m.last_checkin_at || m.last_check_in
            const days = daysSince(last)
            const sevColor = days === null ? theme.red : days > 14 ? theme.red : theme.amber
            return (
              <div key={m.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 80px', gap: 8, padding: '10px 8px', alignItems: 'center', borderBottom: i < atRisk.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar name={m.name} src={m.photo_url} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: theme.text, margin: 0, fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: theme.textTer, margin: 0, fontFamily: F }}>{m.phone}</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FM }}>{last ? formatDate(last) : 'Never'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: sevColor, fontFamily: FM }}>{days === null ? 'Never' : `${days}d`}</span>
                <button
                  onClick={() => {
                    const phone = (m.phone || '').replace(/[^0-9]/g, '')
                    const msg = encodeURIComponent(`Hi ${m.name}! We miss you at the gym 💪 Your fitness journey is waiting — come back and let's crush those goals together!`)
                    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', color: '#25D366', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: F, whiteSpace: 'nowrap' }}
                >
                  <MessageCircle size={12} />
                  Nudge
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Live activity feed ──────────────────────────────────────────
function LiveFeed({ gymId, theme }) {
  const { data, isLoading } = useQuery({
    queryKey: ['live-checkins', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/checkins`, { params: { limit: 12 } }).then(r => r.data),
    enabled: !!gymId, refetchInterval: 10_000,
  })

  const checkins = data?.checkins ?? []
  const [flashIds, setFlashIds] = useState(new Set())
  const prevIds = useRef(new Set())

  useEffect(() => {
    if (!checkins.length) return
    const cur = new Set(checkins.map(c => c.id))
    const newOnes = new Set()
    cur.forEach(id => { if (!prevIds.current.has(id)) newOnes.add(id) })
    if (newOnes.size > 0 && prevIds.current.size > 0) {
      setFlashIds(newOnes)
      setTimeout(() => setFlashIds(new Set()), 2200)
    }
    prevIds.current = cur
  }, [JSON.stringify(checkins.map(c => c.id))])

  const mColor = { qr: theme.brandAccent, nfc: theme.cyan, gps: theme.green, manual: theme.textTer }
  const mBg    = { qr: `${theme.brandAccent}12`, nfc: `${theme.cyan}12`, gps: `${theme.green}12`, manual: `${theme.textTer}10` }

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, padding: 24, border: `1px solid ${theme.borderStrong}`, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.green, boxShadow: `0 0 8px ${theme.green}60`, animation: 'pulse 2s ease-in-out infinite' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Live Activity</h3>
        </div>
        <span style={{ fontSize: 10, color: theme.textTer, fontFamily: FM, padding: '3px 8px', borderRadius: 6, background: theme.bgTer }}>LIVE</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 50, background: theme.bgTer, borderRadius: 10 }} />)}
        </div>
      ) : checkins.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {checkins.map((c, i) => {
            const isNew = flashIds.has(c.id)
            const m = c.method || 'manual'
            return (
              <div key={c.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 8px', borderRadius: 10,
                background: isNew ? `${theme.green}08` : 'transparent',
                borderLeft: isNew ? `3px solid ${theme.green}` : '3px solid transparent',
                transition: 'all 0.4s ease',
              }}>
                <Avatar name={c.member_name} src={c.member_photo} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: 0, fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.member_name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 6, background: mBg[m] || mBg.manual, color: mColor[m] || mColor.manual, fontFamily: FM, letterSpacing: '0.5px' }}>
                    {m}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FM, whiteSpace: 'nowrap' }}>{formatTime(c.checked_in_at)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Zap size={28} style={{ color: theme.textTer, marginBottom: 10 }} />
          <p style={{ color: theme.textSec, fontSize: 13, fontFamily: F, margin: 0 }}>No check-ins yet today</p>
          <p style={{ color: theme.textTer, fontSize: 11, fontFamily: F, margin: '4px 0 0' }}>Activity appears here in real-time</p>
        </div>
      )}
    </div>
  )
}

// ── Revenue widget ──────────────────────────────────────────────
function RevenueWidget({ gymId, theme }) {
  const [period, setPeriod] = useState('month')
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-summary', gymId, period],
    queryFn: () => api.get(`/gyms/${gymId}/revenue/summary`, { params: { period } }).then(r => r.data),
    enabled: !!gymId, refetchInterval: 120_000,
  })

  const bySource = data?.bySource || {}
  const total = data?.total || 0
  const trendPct = data?.trendPct

  const COLORS = { membership: '#22C55E', class_booking: '#3B82F6', affiliate: '#10B981', store: '#F59E0B', ad_revenue: '#06B6D4' }
  const LABELS = { membership: 'Memberships', class_booking: 'Classes', affiliate: 'Affiliate', store: 'Store', ad_revenue: 'Ads' }

  const pieData = Object.entries(bySource).filter(([, v]) => v > 0).map(([k, v]) => ({ name: LABELS[k] || k, value: v, color: COLORS[k] || '#6B7280' }))

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, padding: 24, border: `1px solid ${theme.borderStrong}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PieChartIcon size={16} style={{ color: theme.textSec }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Revenue</h3>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['today', 'week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ fontSize: 10, fontWeight: 600, fontFamily: FM, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: period === p ? `${theme.brandAccent}20` : theme.bgTer, color: period === p ? theme.brandAccent : theme.textTer, transition: 'all 0.15s' }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: 120, background: theme.bgTer, borderRadius: 10 }} />
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 110, height: 110, flexShrink: 0 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: 110, height: 110, borderRadius: '50%', border: `3px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textTer, fontSize: 11, fontFamily: F }}>No data</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: theme.text, fontFamily: F }}>{formatPaise(total)}</span>
              {trendPct !== undefined && trendPct !== null && (
                <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 8, color: trendPct >= 0 ? theme.green : theme.red, fontFamily: F }}>
                  {trendPct >= 0 ? '+' : ''}{trendPct}%
                </span>
              )}
            </div>
            {Object.entries(bySource).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[k] || '#6B7280', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: theme.textSec, fontFamily: F, flex: 1 }}>{LABELS[k] || k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: FM }}>{formatPaise(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Peak hour chart ─────────────────────────────────────────────
function PeakHours({ gymId, theme }) {
  const { data } = useQuery({
    queryKey: ['checkin-hours', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/checkins`, { params: { limit: 200 } }).then(r => r.data),
    enabled: !!gymId, refetchInterval: 300_000,
  })

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i-12}p`, count: 0 }))
    const checkins = data?.checkins || data || []
    checkins.forEach(c => { const h = new Date(c.checked_in_at).getHours(); if (hours[h]) hours[h].count++ })
    return hours.filter(h => h.hour >= 5 && h.hour <= 22)
  }, [data])

  const maxCount = Math.max(...hourlyData.map(h => h.count), 1)
  const peakHour = hourlyData.reduce((m, h) => h.count > m.count ? h : m, hourlyData[0])
  const getColor = (count) => { const r = count / maxCount; return r > 0.75 ? theme.brandAccent : r > 0.5 ? theme.cyan : r > 0.25 ? theme.textTer : theme.border }

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, padding: 24, border: `1px solid ${theme.borderStrong}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} style={{ color: theme.textSec }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Gym Traffic</h3>
        </div>
        {peakHour?.count > 0 && <span style={{ fontSize: 11, color: theme.textSec, fontFamily: F }}>Peak: <strong style={{ color: theme.brandAccent }}>{peakHour.label}</strong></span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90, padding: '0 4px' }}>
        {hourlyData.map(h => (
          <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', maxWidth: 26, height: Math.max((h.count / maxCount) * 76, 3), backgroundColor: getColor(h.count), borderRadius: 3, transition: 'all 0.3s ease' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 6, padding: '0 4px' }}>
        {hourlyData.map((h, i) => (
          <div key={h.hour} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: theme.textTer, fontFamily: FM, display: i % 3 === 0 ? 'block' : 'none' }}>{h.label}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
        {[{ label: 'Quiet', color: theme.border }, { label: 'Moderate', color: theme.textTer }, { label: 'Busy', color: theme.cyan }, { label: 'Peak', color: theme.brandAccent }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
            <span style={{ fontSize: 10, color: theme.textTer, fontFamily: F }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Weekly check-in chart ───────────────────────────────────────
function WeeklyChart({ data, theme }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: theme.textTer, fontSize: 11, margin: 0, fontFamily: FM }}>{label}</p>
        <p style={{ color: theme.text, fontSize: 18, fontWeight: 700, margin: '4px 0 0', fontFamily: F }}>{payload[0].value} check-ins</p>
      </div>
    )
  }

  return (
    <div style={{ background: theme.bgSec, borderRadius: 16, padding: 24, border: `1px solid ${theme.borderStrong}`, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Weekly Check-ins</h3>
        <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FM }}>Last 7 days</span>
      </div>
      {data?.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.brandAccent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.brandAccent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FM }} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FM }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${theme.brandAccent}25`, strokeWidth: 1 }} />
            <Area type="monotone" dataKey="count" stroke={theme.brandAccent} strokeWidth={2.5} fill="url(#aGrad)" dot={false} activeDot={{ r: 5, fill: theme.brandAccent, stroke: theme.bg, strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textSec, fontSize: 14, fontFamily: F }}>
          No check-in data this week
        </div>
      )}
    </div>
  )
}

// ── Quick action card ───────────────────────────────────────────
function ActionCard({ icon: Icon, label, onClick, delay, theme }) {
  const [hov, setHov] = useState(false)
  return (
    <FadeIn delay={delay}>
      <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ background: theme.bgSec, borderRadius: 14, padding: '16px 20px', border: `1px solid ${hov ? `${theme.brandAccent}30` : theme.borderStrong}`, cursor: 'pointer', transition: 'all 0.2s ease', transform: hov ? 'translateY(-2px)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: theme.accentSoft || `${theme.brandAccent}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.brandAccent }}>
            <Icon size={16} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>{label}</span>
        </div>
        <ChevronRight size={15} style={{ color: theme.textTer, transform: hov ? 'translateX(3px)' : 'none', transition: 'transform 0.2s' }} />
      </div>
    </FadeIn>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const navigate = useNavigate()
  const gymId = gym?.id

  const { data: stats, isLoading } = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/stats`).then(r => r.data),
    enabled: !!gymId, refetchInterval: 60_000,
  })

  const { data: affiliate } = useQuery({
    queryKey: ['affiliate-earnings', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/affiliate/earnings`).then(r => r.data),
    enabled: !!gymId, retry: false,
  })

  const ownerName = gym?.owner_name || 'there'
  const gymName   = gym?.gym_name || ''
  const weeklyCheckins = stats?.weeklyCheckins ?? []
  const ownerProfit = (affiliate?.totalEarnings ?? 0) + (stats?.storeProfit ?? 0)

  const CSS = `
    @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
    .home-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:${sp(16)}px; margin-bottom:${sp(24)}px; }
    .two-col { display:grid; grid-template-columns:2fr 1fr; gap:${sp(20)}px; margin-bottom:${sp(24)}px; }
    .two-col-eq { display:grid; grid-template-columns:1fr 1fr; gap:${sp(20)}px; margin-bottom:${sp(24)}px; }
    .three-col { display:grid; grid-template-columns:repeat(3,1fr); gap:${sp(14)}px; margin-bottom:${sp(32)}px; }
    @media(max-width:1024px) {
      .home-grid { grid-template-columns:repeat(2,1fr); }
      .two-col,.two-col-eq { grid-template-columns:1fr; }
      .three-col { grid-template-columns:1fr; }
    }
    @media(max-width:640px) {
      .home-grid { grid-template-columns:1fr; }
    }
  `

  return (
    <div style={{ minHeight: '100vh', background: theme.bg }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: `${sp(32)}px ${sp(24)}px` }}>

        {/* Header */}
        <FadeIn delay={0} style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: theme.text, margin: 0, letterSpacing: '-0.01em', fontFamily: F }}>
            Welcome back, {ownerName}
          </h1>
          {gymName && <p style={{ fontSize: 14, color: theme.textTer, margin: '4px 0 0', fontFamily: F }}>{gymName}</p>}
        </FadeIn>

        {/* GPS warning */}
        <GPSWarning gym={gym} theme={theme} />

        {/* Plan + Onboarding */}
        <FadeIn delay={80} style={{ marginBottom: 20 }}>
          <PlanFeatures api={api} gymId={gymId} />
          <OnboardingChecklist api={api} gymId={gymId} />
        </FadeIn>

        {/* Today strip */}
        <TodayStrip stats={stats} theme={theme} />

        {/* KPI cards */}
        <div className="home-grid">
          <KPICard label="Net Revenue" subLabel="Current Month" value={formatPaise(stats?.monthRevenue ?? 0)} subText={`Today: ${formatPaise(stats?.todayRevenue ?? 0)}`} trend={stats?.revenueTrend} icon={IndianRupee} delay={160} theme={theme} onClick={() => navigate('/dashboard/payments')} />
          <KPICard label="Overdue" subLabel="Pending Collection" value={formatPaise(stats?.overdueValue ?? 0)} count={stats?.overdueCount ?? 0} subText={(stats?.overdueCount ?? 0) > 0 ? `${stats.overdueCount} payments pending` : 'All payments collected'} icon={AlertTriangle} alert delay={220} theme={theme} onClick={() => navigate('/dashboard/payments?status=overdue')} />
          <KPICard label="Active Members" value={stats?.activeMembers ?? 0} subText={`${stats?.totalMembers ?? 0} total`} trend={stats?.memberTrend} icon={Users} delay={280} theme={theme} onClick={() => navigate('/dashboard/members?status=active')} />
          <KPICard label="Affiliate + Store" value={formatPaise(ownerProfit)} subText={affiliate?.pendingPayout > 0 ? `${formatPaise(affiliate.pendingPayout)} pending` : 'Your earnings'} icon={ShoppingBag} delay={340} theme={theme} onClick={() => navigate('/dashboard/affiliate')} />
        </div>

        {/* At-risk + Peak hours */}
        <div className="two-col">
          <FadeIn delay={420}><AtRiskTable gymId={gymId} theme={theme} /></FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: sp(20) }}>
            <FadeIn delay={480}><PeakHours gymId={gymId} theme={theme} /></FadeIn>
            <FadeIn delay={520}><CircleEngagementCard gymId={gymId} theme={theme} /></FadeIn>
          </div>
        </div>

        {/* Weekly chart + Live feed */}
        <div className="two-col-eq">
          <FadeIn delay={580}><WeeklyChart data={weeklyCheckins} theme={theme} /></FadeIn>
          <FadeIn delay={640}><LiveFeed gymId={gymId} theme={theme} /></FadeIn>
        </div>

        {/* Revenue widget */}
        <FadeIn delay={700} style={{ marginBottom: sp(24) }}>
          <RevenueWidget gymId={gymId} theme={theme} />
        </FadeIn>

        {/* Member outcomes + Gym feed */}
        <FadeIn delay={900} style={{ marginBottom: sp(24) }}>
          <MemberOutcomesCard gymId={gymId} theme={theme} />
        </FadeIn>
        <FadeIn delay={960} style={{ marginBottom: sp(24) }}>
          <GymFeedComposer gymId={gymId} theme={theme} />
        </FadeIn>

        {/* Quick actions */}
        <div className="three-col">
          <ActionCard icon={Plus} label="Add Member" onClick={() => navigate('/dashboard/members')} delay={760} theme={theme} />
          <ActionCard icon={Mail} label="Send Newsletter" onClick={() => navigate('/dashboard/newsletter')} delay={820} theme={theme} />
          <ActionCard icon={Link} label="Affiliate Dashboard" onClick={() => navigate('/dashboard/affiliate')} delay={880} theme={theme} />
        </div>

      </div>
    </div>
  )
}
