import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../lib/api'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

const EVENT_COLORS = {
  checkin: '#22C55E',
  payment: '#7C3AED',
  new_member: '#06B6D4',
  expired: '#EF4444',
  milestone: '#F59E0B',
  booking: '#3B82F6',
  booking_cancelled: '#6B7280',
  at_risk: '#F97316',
}

const DEMO_EVENTS = [
  { id: 'demo-1', type: 'checkin', member_name: 'Rahul Sharma', phone: '9876543210', timestamp: new Date(Date.now() - 120000).toISOString(), details: 'Morning session' },
  { id: 'demo-2', type: 'payment', member_name: 'Priya Patel', phone: '9876543211', amount: 250000, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'demo-3', type: 'new_member', member_name: 'Arjun Reddy', phone: '9876543212', plan: 'Growth - 3 Months', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'demo-4', type: 'checkin', member_name: 'Sneha Iyer', phone: '9876543213', timestamp: new Date(Date.now() - 900000).toISOString(), details: 'Weight training' },
  { id: 'demo-5', type: 'expired', member_name: 'Vikram Singh', phone: '9876543214', days_expired: 5, timestamp: new Date(Date.now() - 1200000).toISOString() },
  { id: 'demo-6', type: 'milestone', member_name: 'Ananya Kumar', phone: '9876543215', timestamp: new Date(Date.now() - 1800000).toISOString(), details: '100th check-in!' },
  { id: 'demo-7', type: 'checkin', member_name: 'Karthik Nair', phone: '9876543216', timestamp: new Date(Date.now() - 2400000).toISOString(), details: 'Cardio session' },
]

function formatTime(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '--:--'
  }
}

function formatAmount(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100)
}

function getEventDescription(event, theme) {
  switch (event.type) {
    case 'checkin':
      return <><strong>{event.member_name}</strong> checked in{event.details ? ` - ${event.details}` : ''}</>
    case 'payment':
      return <><strong>{event.member_name}</strong> paid <span style={{ color: theme.brandAccent, fontWeight: 600 }}>{formatAmount(event.amount)}</span></>
    case 'new_member':
      return <><strong>{event.member_name}</strong> joined{event.plan ? ` on ${event.plan}` : ''}</>
    case 'expired':
      return <><strong>{event.member_name}</strong> membership expired <span style={{ color: '#EF4444', fontWeight: 600 }}>{event.days_expired}d ago</span></>
    case 'milestone':
      return <><strong>{event.member_name}</strong> hit a milestone{event.details ? ` — ${event.details}` : ''}</>
    case 'booking':
      return <><strong>{event.member_name || event.data?.member_name}</strong> booked <span style={{ color: '#3B82F6', fontWeight: 600 }}>{event.data?.className || 'a class'}</span>{event.data?.spotsLeft != null ? ` (${event.data.spotsLeft} spots left)` : ''}</>
    case 'booking_cancelled':
      return <><strong>{event.member_name || event.data?.member_name}</strong> cancelled booking for <span style={{ color: '#6B7280' }}>{event.data?.className || 'a class'}</span></>
    case 'at_risk':
      return <><strong style={{ color: '#F97316' }}>{event.member_name || event.data?.member_name}</strong> hasn't visited in 7+ days — <span style={{ color: '#F97316', fontWeight: 600 }}>At Risk</span></>
    default:
      return <><strong>{event.member_name || 'Unknown'}</strong> — {event.type}</>
  }
}

function getOccupancyStatus(pct) {
  if (pct >= 90) return { label: 'Near Capacity', color: '#EF4444', bg: '#EF444415' }
  if (pct >= 70) return { label: 'Busy', color: '#F59E0B', bg: '#F59E0B15' }
  if (pct >= 40) return { label: 'Moderate', color: '#3B82F6', bg: '#3B82F615' }
  if (pct > 0) return { label: 'Quiet', color: '#22C55E', bg: '#22C55E15' }
  return { label: 'Empty', color: '#6B7280', bg: '#6B728015' }
}

function OccupancyGauge({ current, capacity, theme, prevCount }) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0
  const status = getOccupancyStatus(pct)
  const spotsLeft = Math.max(0, capacity - current)

  // SVG arc gauge
  const SIZE = 160
  const STROKE = 12
  const R = (SIZE - STROKE) / 2
  const C = Math.PI * R // semi-circle circumference
  const offset = C - (C * pct) / 100

  // Trend arrow
  const trend = prevCount != null
    ? current > prevCount ? 'up' : current < prevCount ? 'down' : 'stable'
    : 'stable'

  const arcColor = status.color

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 16,
      padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: theme.textSec, fontFamily: FONT,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Gym Occupancy
          </span>
          {pct >= 80 && (
            <span className="lp-pulse-dot-red" style={{
              width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
              display: 'inline-block', flexShrink: 0,
            }} />
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: status.color, fontFamily: FONT,
          background: status.bg, padding: '3px 10px', borderRadius: 20,
          textTransform: 'uppercase', letterSpacing: '0.3px',
        }}>
          {status.label}
        </span>
      </div>

      {/* Arc gauge + stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* SVG semi-circular arc */}
        <div style={{ position: 'relative', width: SIZE, height: SIZE / 2 + 10, flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE / 2 + 10} viewBox={`0 0 ${SIZE} ${SIZE / 2 + 10}`}>
            {/* Background arc */}
            <path
              d={`M ${STROKE / 2} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
              fill="none"
              stroke={theme.bgTer}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            {/* Filled arc */}
            <path
              d={`M ${STROKE / 2} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
              fill="none"
              stroke={arcColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
            />
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: theme.text, fontFamily: FONT_M,
              lineHeight: 1, letterSpacing: '-1px',
            }}>
              {Math.round(pct)}%
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Current / Capacity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>
                {current}
              </span>
              <span style={{ fontSize: 13, color: theme.textTer, fontFamily: FONT }}>
                / {capacity}
              </span>
              {/* Trend arrow */}
              {trend !== 'stable' && (
                <span style={{
                  fontSize: 14, fontWeight: 600, marginLeft: 4,
                  color: trend === 'up' ? '#F59E0B' : '#22C55E',
                }}>
                  {trend === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT }}>
              members checked in
            </span>
          </div>

          {/* Spots remaining */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10,
            background: spotsLeft <= 5 && spotsLeft > 0 ? '#EF444410' : theme.bgTer,
          }}>
            <span style={{
              fontSize: 16, fontWeight: 700, fontFamily: FONT_M,
              color: spotsLeft <= 5 && spotsLeft > 0 ? '#EF4444' : theme.text,
            }}>
              {spotsLeft}
            </span>
            <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT }}>
              {spotsLeft === 1 ? 'spot remaining' : 'spots remaining'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventCard({ event, isNew, theme, gymName }) {
  const color = EVENT_COLORS[event.type] || '#6B7280'
  const initial = (event.member_name || '?').charAt(0).toUpperCase()

  const phone = (event.phone || '').replace(/\D/g, '')
  const phoneWithCountry = phone.startsWith('91') ? phone : `91${phone}`

  const showHighFive = event.type === 'checkin' || event.type === 'booking'
  const showNudge = event.type === 'expired' || event.type === 'at_risk'

  const highFiveMsg = encodeURIComponent(`Great seeing you at the gym today, ${event.member_name}! Keep the streak going`)
  const nudgeMsg = encodeURIComponent(`Hey ${event.member_name}, we miss you at ${gymName || 'the gym'}! Come back and crush it`)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      background: theme.bgSec, borderRadius: 10,
      border: `1px solid ${theme.border}`,
      borderLeftWidth: 3,
      borderLeftColor: color,
      marginBottom: 8,
      animation: 'pulseSlideIn 0.35s ease-out',
      boxShadow: isNew ? `inset 3px 0 12px -4px ${color}40` : 'none',
      transition: 'box-shadow 0.6s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: `${color}20`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, fontFamily: FONT,
      }}>
        {initial}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: theme.text, fontFamily: FONT, lineHeight: 1.45 }}>
          {getEventDescription(event, theme)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT_M }}>
            {formatTime(event.timestamp)}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: color, textTransform: 'uppercase',
            letterSpacing: '0.5px', fontFamily: FONT,
          }}>
            {event.type === 'new_member' ? 'NEW' : event.type === 'checkin' ? 'CHECK-IN' : event.type.toUpperCase()}
          </span>
        </div>
      </div>

      {/* WhatsApp buttons */}
      {phone && (showHighFive || showNudge) && (
        <a
          href={showHighFive
            ? `https://wa.me/${phoneWithCountry}?text=${highFiveMsg}`
            : `https://wa.me/${phoneWithCountry}?text=${nudgeMsg}`
          }
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flexShrink: 0, alignSelf: 'center',
            fontSize: 11, fontWeight: 600, fontFamily: FONT,
            padding: '4px 10px', borderRadius: 6,
            background: showHighFive ? '#22C55E18' : '#EF444418',
            color: showHighFive ? '#22C55E' : '#EF4444',
            border: `1px solid ${showHighFive ? '#22C55E30' : '#EF444430'}`,
            textDecoration: 'none', whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          className="lp-wa-btn"
        >
          {showHighFive ? 'High-Five' : 'Nudge'}
        </a>
      )}
    </div>
  )
}

export default function LivePulse() {
  const { gym } = useAuth()
  const { theme, isDark, sp } = useTheme()
  const [newEventIds, setNewEventIds] = useState(new Set())
  const [paymentFlash, setPaymentFlash] = useState(false)
  const prevEventIdsRef = useRef(new Set())
  const prevCheckedInRef = useRef(null)

  const gymId = gym?.id

  const { data: feedData } = useQuery({
    queryKey: ['activity-feed', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/activity/feed`).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 10_000,
    placeholderData: { events: DEMO_EVENTS },
  })

  const { data: statsData } = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/stats`).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 10_000,
    placeholderData: { current_checked_in: 12, capacity: 50 },
  })

  const events = Array.isArray(feedData?.events) ? feedData.events : DEMO_EVENTS
  const currentCheckedIn = statsData?.current_checked_in ?? 0
  const capacity = statsData?.capacity ?? 50

  // Track occupancy trend
  const prevCheckedIn = prevCheckedInRef.current
  useEffect(() => {
    if (currentCheckedIn !== prevCheckedInRef.current) {
      prevCheckedInRef.current = currentCheckedIn
    }
  }, [currentCheckedIn])

  // Track new events for glow effect and payment flash
  useEffect(() => {
    const currentIds = new Set(events.map(e => e.id))
    const prev = prevEventIdsRef.current
    const freshIds = new Set()

    for (const id of currentIds) {
      if (!prev.has(id)) freshIds.add(id)
    }

    if (freshIds.size > 0) {
      setNewEventIds(freshIds)

      // Check for payment flash
      const hasNewPayment = events.some(e => freshIds.has(e.id) && e.type === 'payment')
      if (hasNewPayment) {
        setPaymentFlash(true)
        setTimeout(() => setPaymentFlash(false), 1500)
      }

      // Clear glow after 3s
      const timer = setTimeout(() => setNewEventIds(new Set()), 3000)
      prevEventIdsRef.current = currentIds
      return () => clearTimeout(timer)
    }

    prevEventIdsRef.current = currentIds
  }, [events])

  return (
    <div style={{ padding: sp(24), fontFamily: FONT, minHeight: '100vh' }}>
      {/* Payment flash overlay */}
      {paymentFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, ${theme.brandAccentSoft} 0%, transparent 70%)`,
          animation: 'pulseSlideIn 0.3s ease-out',
        }} />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: sp(20),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="lp-pulse-dot-green" style={{
            width: 10, height: 10, borderRadius: '50%', background: '#22C55E',
            display: 'inline-block', flexShrink: 0,
          }} />
          <h1 style={{
            fontSize: 18, fontWeight: 700, color: theme.text,
            fontFamily: FONT, letterSpacing: '-0.3px', margin: 0,
          }}>
            LIVE PULSE
          </h1>
          <span style={{
            fontSize: 11, fontWeight: 600, fontFamily: FONT_M,
            color: isDark ? '#000' : '#fff',
            background: theme.text, padding: '2px 8px', borderRadius: 10,
            lineHeight: 1.4,
          }}>
            {events.length}
          </span>
        </div>
      </div>

      {/* Occupancy */}
      <OccupancyGauge current={currentCheckedIn} capacity={capacity} theme={theme} prevCount={prevCheckedIn} />

      {/* Event list */}
      {events.length === 0 ? (
        <div style={{
          background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 12,
          padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: theme.textTer, fontFamily: FONT }}>
            No activity yet today. Events will appear here in real-time.
          </div>
        </div>
      ) : (
        <div style={{
          maxHeight: 600, overflowY: 'auto', paddingRight: 4,
        }} className="lp-scroll">
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isNew={newEventIds.has(event.id)}
              theme={theme}
              gymName={gym?.gym_name}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulseSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes lpPulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
        @keyframes lpPulseRed {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { opacity: 0.7; transform: scale(0.8); box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
        .lp-pulse-dot-green { animation: lpPulseGreen 2s ease-in-out infinite; }
        .lp-pulse-dot-red { animation: lpPulseRed 1.5s ease-in-out infinite; }
        .lp-wa-btn:hover { filter: brightness(1.2); }
        .lp-scroll::-webkit-scrollbar { width: 4px; }
        .lp-scroll::-webkit-scrollbar-track { background: transparent; }
        .lp-scroll::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
      `}</style>
    </div>
  )
}
