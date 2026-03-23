import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const FONT_BRAND = "'Satoshi', 'General Sans', 'Inter', sans-serif"
const FONT_BODY  = "'General Sans', 'Inter', -apple-system, sans-serif"
const FONT_NAV   = "'General Sans', 'Inter', sans-serif"
const COBALT     = '#1A3A8F'
const MATTE      = '#0A0A0A'
const SURFACE    = '#161616'
const CRIMSON    = '#DC143C'
const WHITE      = '#FFFFFF'
const SILVER     = '#C0C0C0'
const GUNMETAL   = '#374151'

const COMPACT_THRESHOLD = 520 // px width

// Circle progress ring
function Ring({ value, max, color, size = 48, strokeWidth = 4, label, unit }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circ * (1 - pct)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r}
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{
        position: 'relative', marginTop: -size + 4, height: size - 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: FONT_BRAND, fontSize: size > 40 ? 14 : 11,
          fontWeight: 900, color: WHITE, letterSpacing: '0.05em',
        }}>{value}</span>
        {unit && <span style={{
          fontFamily: FONT_BODY, fontSize: 8, color: SILVER,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>{unit}</span>}
      </div>
      <span style={{
        fontFamily: FONT_NAV, fontSize: 9, fontWeight: 700,
        color: GUNMETAL, letterSpacing: '0.2em', textTransform: 'uppercase',
        marginTop: 2,
      }}>{label}</span>
    </div>
  )
}

export default function WellbeingWidget() {
  const location = useLocation()
  const [compact, setCompact] = useState(false)
  const [metrics, setMetrics] = useState({
    steps: 4280,
    water: 5,
    calories: 320,
    heartRate: 72,
    restMins: 15,
    activeHrs: 2.5,
  })
  const [time, setTime] = useState(new Date())
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [nudgeType, setNudgeType] = useState(null)
  const workerRef = useRef(null)

  // Detect compact mode
  useEffect(() => {
    const check = () => setCompact(window.innerWidth <= COMPACT_THRESHOLD)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Initialize Web Worker
  useEffect(() => {
    try {
      const w = new Worker('/telemetry-worker.js')
      workerRef.current = w

      w.postMessage({ type: 'INIT', data: { endpoint: '/api/v1/telemetry/sync' } })

      w.addEventListener('message', (e) => {
        const { type, data } = e.data || {}

        switch (type) {
          case 'METRIC_UPDATE':
            if (data?.type === 'steps') setMetrics(m => ({ ...m, steps: data.value }))
            if (data?.type === 'heart_rate') setMetrics(m => ({ ...m, heartRate: data.value }))
            if (data?.type === 'water') setMetrics(m => ({ ...m, water: data.value }))
            if (data?.type === 'calories') setMetrics(m => ({ ...m, calories: data.value }))
            break

          case 'NUDGE_TRIGGER':
            triggerNudge()
            break

          case 'METRICS_SNAPSHOT':
            // Could update from snapshot
            break

          default:
            break
        }
      })

      // Track user activity
      const trackActivity = () => w.postMessage({ type: 'USER_ACTIVE' })
      window.addEventListener('mousemove', trackActivity, { passive: true })
      window.addEventListener('keydown', trackActivity, { passive: true })

      return () => {
        w.terminate()
        window.removeEventListener('mousemove', trackActivity)
        window.removeEventListener('keydown', trackActivity)
      }
    } catch (e) {
      // Worker not supported — gracefully degrade
    }
  }, [])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't request immediately — wait for user interaction
    }
  }, [])

  const triggerNudge = () => {
    const types = ['hydration', 'movement', 'rest']
    const t = types[Math.floor(Math.random() * types.length)]
    setNudgeType(t)
    setNudgeVisible(true)

    // Also fire desktop notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const msgs = {
        hydration: { title: 'HYDRATION CHECK', body: 'Time to drink water. Stay hydrated.' },
        movement: { title: 'MOVEMENT BREAK', body: 'Stand up, stretch, walk for a minute.' },
        rest: { title: 'REST & RECOVERY', body: 'Take 5 deep breaths. Recovery is performance.' },
      }
      const msg = msgs[t]
      new Notification(msg.title, {
        body: msg.body,
        icon: '/icons/icon-96.png',
        badge: '/icons/icon-72.png',
        tag: `ivira-nudge-${t}`,
      })
    }

    setTimeout(() => setNudgeVisible(false), 8000)
  }

  // Only show on dashboard routes, never on public/landing/login pages
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/member/dashboard')
  if (!compact || !isDashboardRoute) return null

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: MATTE,
      display: 'flex', flexDirection: 'column',
      fontFamily: FONT_BODY,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/icons/icon-96.png" alt="I V I R A"
            style={{ width: 20, height: 20, borderRadius: 4 }} />
          <span style={{
            fontFamily: FONT_BRAND, fontSize: 11, fontWeight: 900,
            color: WHITE, letterSpacing: '0.25em', textTransform: 'uppercase',
          }}>I V I R A</span>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 6px rgba(34,197,94,0.5)',
          }} />
        </div>
        <span style={{
          fontFamily: FONT_NAV, fontSize: 11, fontWeight: 700,
          color: GUNMETAL, letterSpacing: '0.1em',
        }}>{timeStr}</span>
      </div>

      {/* Nudge Banner */}
      {nudgeVisible && nudgeType && (
        <div style={{
          padding: '8px 16px',
          background: nudgeType === 'hydration' ? 'rgba(26,58,143,0.15)'
            : nudgeType === 'movement' ? 'rgba(220,20,60,0.1)'
            : 'rgba(34,197,94,0.1)',
          borderBottom: `1px solid ${nudgeType === 'hydration' ? 'rgba(26,58,143,0.3)'
            : nudgeType === 'movement' ? 'rgba(220,20,60,0.2)'
            : 'rgba(34,197,94,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          animation: 'nudgeIn 0.3s ease-out',
        }}>
          <div>
            <div style={{
              fontFamily: FONT_BRAND, fontSize: 10, fontWeight: 900,
              color: WHITE, letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>
              {nudgeType === 'hydration' ? 'DRINK WATER' : nudgeType === 'movement' ? 'MOVE' : 'REST'}
            </div>
            <div style={{
              fontFamily: FONT_BODY, fontSize: 10, color: SILVER, marginTop: 1,
            }}>
              {nudgeType === 'hydration' ? 'Stay hydrated for peak performance'
                : nudgeType === 'movement' ? 'Stand up and stretch'
                : 'Take 5 deep breaths'}
            </div>
          </div>
          <button onClick={() => setNudgeVisible(false)} style={{
            background: 'none', border: 'none', color: GUNMETAL,
            cursor: 'pointer', fontSize: 14, padding: 2,
          }}>&times;</button>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{
        flex: 1, padding: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        alignContent: 'center',
      }}>
        <Ring value={metrics.steps} max={10000} color={COBALT} label="STEPS" size={52} />
        <Ring value={metrics.water} max={8} color="#3B82F6" label="WATER" unit="glasses" size={52} />
        <Ring value={metrics.heartRate} max={180} color={CRIMSON} label="BPM" size={52} />
        <Ring value={metrics.calories} max={2000} color="#F59E0B" label="KCAL" size={52} />
        <Ring value={metrics.restMins} max={60} color="#22C55E" label="REST" unit="min" size={52} />
        <Ring value={metrics.activeHrs} max={8} color={COBALT} label="ACTIVE" unit="hrs" size={52} />
      </div>

      {/* Bottom Bar */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => {
          if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission()
          }
        }} style={{
          fontFamily: FONT_NAV, fontSize: 9, fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: COBALT, background: 'rgba(26,58,143,0.1)',
          border: '1px solid rgba(26,58,143,0.2)',
          borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
        }}>ENABLE ALERTS</button>

        <div style={{
          fontFamily: FONT_NAV, fontSize: 9, fontWeight: 600,
          color: GUNMETAL, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          COMPACT MODE
        </div>
      </div>

      <style>{`
        @keyframes nudgeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
