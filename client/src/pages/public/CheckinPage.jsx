import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { useTheme } from '../../context/ThemeContext'

/* ── Web Audio beeps (no external files) ── */
const audioCtxRef = { current: null }
function getAudioCtx() {
  if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtxRef.current
}

function playSound(type) {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()

    if (type === 'success') {
      const notes = [523.25, 659.25, 783.99] // C5, E5, G5
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'
        o.frequency.value = freq
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
        o.start(ctx.currentTime + i * 0.12)
        o.stop(ctx.currentTime + i * 0.12 + 0.4)
      })
    } else {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.value = 110
      gain.gain.value = 0.2
      osc.start(ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.stop(ctx.currentTime + 0.5)
    }
  } catch { /* audio not available */ }
}

/* ── Constants ── */
const COOLDOWN_MS = 4000
const QR_LIFETIME = 90

const DEMO_ADS = [
  { id: 1, brand: 'MuscleBlaze', headline: 'Fuel Your Gains', sub: 'Whey Protein starting at ₹1,499', color: '#1A3A8F' },
  { id: 2, brand: 'HealthKart', headline: 'Pre-Workout Sale', sub: 'Flat 30% off on all supplements', color: '#34A853' },
  { id: 3, brand: 'Decathlon', headline: 'Gear Up', sub: 'New arrivals in gym wear', color: '#4285F4' },
]
const CIRCUMFERENCE = 2 * Math.PI * 54
const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', monospace"

/* ── Circular countdown for QR mode ── */
function CircularCountdown({ countdown, color, theme }) {
  const progress = countdown / QR_LIFETIME
  const offset = CIRCUMFERENCE * (1 - progress)

  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 20px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={54} fill="none" stroke={theme.bgTer} strokeWidth="6" />
        <circle
          cx="70" cy="70" r={54} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 48, fontWeight: 800, fontFamily: FONT_M,
          color, lineHeight: 1,
          textShadow: `0 0 24px ${color}40`,
          transition: 'color 0.5s',
        }}>{countdown}</div>
        <div style={{ fontSize: 10, color: theme.textTer, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
          seconds
        </div>
      </div>
    </div>
  )
}

/* ── Cooldown progress bar ── */
function CooldownBar({ active, theme }) {
  return (
    <div style={{
      width: '100%', height: 4, borderRadius: 2,
      background: theme.bgTer, overflow: 'hidden',
      marginTop: 20,
    }}>
      <div style={{
        height: '100%', borderRadius: 2,
        background: theme.green,
        width: active ? '100%' : '0%',
        transition: active ? `width ${COOLDOWN_MS}ms linear` : 'none',
      }} />
    </div>
  )
}

/* ── Milestone Overlay ── */
function MilestoneOverlay({ milestone, theme }) {
  if (!milestone) return null

  const configs = {
    century: { headline: 'LEGENDARY', sub: `${milestone.count}th Workout`, color: '#FFD700' },
    major: { headline: 'CHAMPION', sub: `${milestone.count}th Workout`, color: '#1A3A8F' },
    streak: { headline: 'ON FIRE', sub: `${milestone.count}-Day Streak`, color: '#FF6B35' },
    birthday: { headline: 'HAPPY BIRTHDAY', sub: 'Your special day workout', color: '#1A3A8F' },
  }
  const cfg = configs[milestone.type] || configs.major

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'milestoneIn 0.4s ease-out',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        {/* Glowing ring */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          border: `3px solid ${cfg.color}`,
          boxShadow: `0 0 60px ${cfg.color}60, inset 0 0 30px ${cfg.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          animation: 'milestonePulse 1.5s ease-in-out infinite',
        }}>
          {milestone.type === 'century' && (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          {milestone.type === 'major' && (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
              <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          )}
          {milestone.type === 'streak' && (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          )}
          {milestone.type === 'birthday' && (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
              <path d="M2 21h20" /><path d="M7 8v2" /><path d="M12 8v2" /><path d="M17 8v2" />
              <path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" />
            </svg>
          )}
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 36, fontWeight: 900, color: cfg.color,
          fontFamily: "'Inter', -apple-system, sans-serif",
          letterSpacing: '4px', textTransform: 'uppercase',
          textShadow: `0 0 40px ${cfg.color}60`,
          marginBottom: 8,
        }}>{cfg.headline}</div>

        {/* Name */}
        <div style={{
          fontSize: 22, fontWeight: 700, color: '#EDEDED',
          fontFamily: "'Inter', -apple-system, sans-serif",
          marginBottom: 6,
        }}>{milestone.name || 'Member'}</div>

        {/* Sub */}
        <div style={{
          fontSize: 16, color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Inter', -apple-system, sans-serif",
          marginBottom: 20,
        }}>{cfg.sub}</div>

        {/* Gamification text */}
        {milestone.type === 'streak' && (
          <div style={{
            fontSize: 12, color: '#1A3A8F',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '6px 16px', borderRadius: 20,
            border: '1px solid rgba(26,58,143,0.3)',
            display: 'inline-block',
            background: 'rgba(26,58,143,0.08)',
          }}>Top 5% of active members</div>
        )}

        {milestone.type === 'century' && (
          <div style={{
            fontSize: 12, color: '#FFD700',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '6px 16px', borderRadius: 20,
            border: '1px solid rgba(255,215,0,0.3)',
            display: 'inline-block',
            background: 'rgba(255,215,0,0.08)',
          }}>Elite Status Achieved</div>
        )}
      </div>

      <style>{`
        @keyframes milestoneIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes milestonePulse {
          0%, 100% { box-shadow: 0 0 60px ${cfg.color}60, inset 0 0 30px ${cfg.color}20; }
          50% { box-shadow: 0 0 80px ${cfg.color}80, inset 0 0 40px ${cfg.color}30; }
        }
      `}</style>
    </div>
  )
}

/* ── Flash Sale Banner ── */
function FlashSaleBanner({ sale }) {
  if (!sale) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1A3A8F20, #1A3A8F08)',
      border: '1px solid #1A3A8F40',
      borderRadius: 12, padding: '14px 20px',
      marginTop: 16, textAlign: 'center',
      animation: 'flashSlide 0.5s ease-out',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1A3A8F', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4, fontFamily: FONT }}>
        LIMITED OFFER
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#EDEDED', fontFamily: FONT }}>
        {sale.title || sale.description || 'Special offer available at the front desk'}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: FONT_M }}>
        Ask at reception
      </div>
    </div>
  )
}

// ===== Offline Sync Engine =====
function useOfflineSync(gymId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [cachedMembers, setCachedMembers] = useState([])
  const [pendingCheckins, setPendingCheckins] = useState([])
  const [lastSync, setLastSync] = useState(null)

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Download active members every 15 minutes
  useEffect(() => {
    if (!gymId) return
    const syncMembers = async () => {
      try {
        const { data } = await api.get(`/kiosk/${gymId}/members`)
        setCachedMembers(data.members || [])
        localStorage.setItem(`kiosk_members_${gymId}`, JSON.stringify(data.members || []))
        setLastSync(new Date().toISOString())
        localStorage.setItem(`kiosk_last_sync_${gymId}`, new Date().toISOString())
      } catch {
        // Load from cache
        const cached = localStorage.getItem(`kiosk_members_${gymId}`)
        if (cached) setCachedMembers(JSON.parse(cached))
      }
    }
    syncMembers()
    const interval = setInterval(syncMembers, 15 * 60 * 1000) // 15 min
    return () => clearInterval(interval)
  }, [gymId])

  // Load pending checkins from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`kiosk_pending_${gymId}`)
    if (stored) setPendingCheckins(JSON.parse(stored))
  }, [gymId])

  // Sync pending checkins when back online
  useEffect(() => {
    if (!isOnline || pendingCheckins.length === 0 || !gymId) return
    const syncCheckins = async () => {
      try {
        await api.post(`/kiosk/${gymId}/sync`, { checkins: pendingCheckins })
        setPendingCheckins([])
        localStorage.removeItem(`kiosk_pending_${gymId}`)
      } catch {
        // Will retry next time
      }
    }
    syncCheckins()
  }, [isOnline, pendingCheckins, gymId])

  // Heartbeat every 60 seconds
  useEffect(() => {
    if (!gymId) return
    const deviceId = localStorage.getItem('kiosk_device_id') || (() => {
      const id = 'kiosk_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('kiosk_device_id', id)
      return id
    })()
    const beat = () => {
      if (!navigator.onLine) return
      api.post(`/kiosk/${gymId}/heartbeat`, {
        deviceId,
        deviceInfo: { userAgent: navigator.userAgent, screen: `${screen.width}x${screen.height}` },
      }).catch(() => {})
    }
    beat()
    const interval = setInterval(beat, 60000)
    return () => clearInterval(interval)
  }, [gymId])

  const queueCheckin = (memberId, phone) => {
    const checkin = {
      memberId, phone,
      timestamp: new Date().toISOString(),
      clientId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }
    const updated = [...pendingCheckins, checkin]
    setPendingCheckins(updated)
    localStorage.setItem(`kiosk_pending_${gymId}`, JSON.stringify(updated))
  }

  const findMemberOffline = (phone) => {
    const normalized = phone.startsWith('+91') ? phone : `+91${phone}`
    return cachedMembers.find(m =>
      m.phone === normalized || m.phone === phone || m.phone?.endsWith(phone)
    )
  }

  return {
    isOnline, cachedMembers, pendingCheckins, lastSync,
    queueCheckin, findMemberOffline,
  }
}

/* ══════════════════════════════════════════════ */
export default function CheckinPage() {
  const { gymId } = useParams()
  const queryClient = useQueryClient()
  const { theme, isDark } = useTheme()

  // Mode: 'phone' (enter phone) | 'qr' (show QR) | 'result' (success/error cooldown)
  const [mode, setMode] = useState('phone')
  const [phone, setPhone] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [memberName, setMemberName] = useState('')
  const [gymName, setGymName] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Kiosk result state
  const [resultType, setResultType] = useState('') // 'success' | 'error'
  const [resultMsg, setResultMsg] = useState('')
  const [cooldownActive, setCooldownActive] = useState(false)

  // Engagement engine state
  const [milestone, setMilestone] = useState(null) // { type, count, name }
  const [flashSale, setFlashSale] = useState(null)
  const [isBirthday, setIsBirthday] = useState(false)
  const [streakCount, setStreakCount] = useState(0)

  // Idle / ad state
  const [idleMode, setIdleMode] = useState(false)
  const [currentAd, setCurrentAd] = useState(null)
  const [adIndex, setAdIndex] = useState(0)
  const idleTimerRef = useRef()

  // Offline sync engine
  const offlineSync = useOfflineSync(gymId)

  const timerRef = useRef()
  const cooldownRef = useRef()
  const milestoneTimerRef = useRef()

  // Load gym name
  useEffect(() => {
    api.get(`/discover/gyms/${gymId}`).then(({ data }) => {
      setGymName(data.gym_name || data.gym?.name || data.name || '')
    }).catch(() => {})
  }, [gymId])

  // Cleanup
  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearTimeout(cooldownRef.current)
    clearTimeout(milestoneTimerRef.current)
  }, [])

  // Auto-close milestone overlay
  useEffect(() => {
    if (milestone) {
      milestoneTimerRef.current = setTimeout(() => {
        setMilestone(null)
      }, 4000)
      return () => clearTimeout(milestoneTimerRef.current)
    }
  }, [milestone])

  // Idle detection — show ads after 90s of inactivity
  useEffect(() => {
    function resetIdle() {
      clearTimeout(idleTimerRef.current)
      if (idleMode) setIdleMode(false)
      idleTimerRef.current = setTimeout(() => {
        if (mode === 'phone') setIdleMode(true)
      }, 90000)
    }

    const events = ['touchstart', 'mousedown', 'keydown']
    events.forEach(e => document.addEventListener(e, resetIdle))
    resetIdle()

    return () => {
      clearTimeout(idleTimerRef.current)
      events.forEach(e => document.removeEventListener(e, resetIdle))
    }
  }, [mode, idleMode])

  // Rotate ads every 8 seconds
  useEffect(() => {
    if (!idleMode) return
    const ads = DEMO_ADS
    setCurrentAd(ads[0])
    const interval = setInterval(() => {
      setAdIndex(prev => {
        const next = (prev + 1) % ads.length
        setCurrentAd(ads[next])
        return next
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [idleMode])

  /* ── Kiosk: check in by phone ── */
  const handleCheckin = useCallback(async () => {
    const cleaned = phone.trim()
    if (!cleaned || cleaned.length < 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError('')
    setLoading(true)

    // Offline fallback: validate locally and queue check-in
    if (!offlineSync.isOnline) {
      const offlineMember = offlineSync.findMemberOffline(cleaned)
      if (offlineMember) {
        offlineSync.queueCheckin(offlineMember.id, cleaned)
        playSound('success')
        setMemberName(offlineMember.name || '')
        setResultType('success')
        setResultMsg(offlineMember.name ? `Welcome, ${offlineMember.name}!` : 'Check-in queued!')
        setMode('result')
        startCooldown()
      } else {
        playSound('error')
        setResultType('error')
        setResultMsg('Member not found in offline cache')
        setMode('result')
        startCooldown()
      }
      setLoading(false)
      return
    }

    try {
      // Step 1: generate QR token (validates member exists)
      const { data: genData } = await api.post(`/gyms/${gymId}/qr/generate`, { phone: cleaned })
      const token = genData.token || genData.qrToken
      const name = genData.member?.name || genData.memberName || ''

      // Step 2: immediately verify the token - records the check-in
      await api.post(`/gyms/${gymId}/checkin`, { token })

      // Invalidate dashboard queries so counters update live
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['gym-stats'] })
      queryClient.invalidateQueries({ queryKey: ['live-checkins'] })

      // Extract engagement data from response
      const checkInCount = genData.member?.check_in_count || genData.checkInCount || 0
      const streak = genData.member?.streak || 0
      const birthday = genData.member?.is_birthday || false
      const promos = genData.member?.active_promotions || []

      setStreakCount(streak)
      setIsBirthday(birthday)

      // Check for milestones (century before major since 100 % 50 === 0)
      if (checkInCount > 0 && checkInCount % 100 === 0) {
        setMilestone({ type: 'century', count: checkInCount, name: name })
      } else if (checkInCount > 0 && checkInCount % 50 === 0) {
        setMilestone({ type: 'major', count: checkInCount, name: name })
      } else if (streak >= 5 && streak % 5 === 0) {
        setMilestone({ type: 'streak', count: streak, name: name })
      } else if (birthday) {
        setMilestone({ type: 'birthday', count: 0, name: name })
      }

      // Check for flash sales
      if (promos.length > 0) {
        setFlashSale(promos[0])
      }

      // Success result
      playSound('success')
      setMemberName(name)
      setResultType('success')
      setResultMsg(name ? `Welcome, ${name}!` : 'Check-in successful!')
      setMode('result')
      startCooldown()
    } catch (err) {
      // If network error, try offline fallback
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const offlineMember = offlineSync.findMemberOffline(cleaned)
        if (offlineMember) {
          offlineSync.queueCheckin(offlineMember.id, cleaned)
          playSound('success')
          setMemberName(offlineMember.name || '')
          setResultType('success')
          setResultMsg(offlineMember.name ? `Welcome, ${offlineMember.name}!` : 'Check-in queued!')
          setMode('result')
          startCooldown()
          setLoading(false)
          return
        }
      }
      const msg = err.response?.data?.message || 'Member not found'
      playSound('error')
      setResultType('error')
      setResultMsg(msg)
      setMode('result')
      startCooldown()
    } finally {
      setLoading(false)
    }
  }, [phone, gymId, queryClient, offlineSync])

  function startCooldown() {
    setCooldownActive(true)
    // Force a reflow so the CSS transition starts from 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCooldownActive(true))
    })
    cooldownRef.current = setTimeout(() => {
      setCooldownActive(false)
      resetToReady()
    }, COOLDOWN_MS)
  }

  function resetToReady() {
    setMode('phone')
    setPhone('')
    setResultType('')
    setResultMsg('')
    setMemberName('')
    setError('')
    setQrToken('')
    setMilestone(null)
    setFlashSale(null)
    setIsBirthday(false)
    setStreakCount(0)
    setIdleMode(false)
    setCurrentAd(null)
    clearTimeout(idleTimerRef.current)
    clearTimeout(milestoneTimerRef.current)
  }

  /* ── QR generation flow (show QR to staff) ── */
  async function generateQR() {
    const cleaned = phone.trim()
    if (!cleaned || cleaned.length < 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post(`/gyms/${gymId}/qr/generate`, { phone: cleaned })
      setQrToken(data.token || data.qrToken)
      setMemberName(data.member?.name || '')
      setMode('qr')
      startQrCountdown()
    } catch (err) {
      setError(err.response?.data?.message || 'Member not found')
    } finally {
      setLoading(false)
    }
  }

  function startQrCountdown() {
    setCountdown(QR_LIFETIME)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          refreshQR()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function refreshQR() {
    try {
      const { data } = await api.post(`/gyms/${gymId}/qr/generate`, { phone: phone.trim() })
      setQrToken(data.token || data.qrToken)
      setMemberName(data.member?.name || memberName)
      startQrCountdown()
    } catch {
      setMode('phone')
      setError('Session expired. Please try again.')
    }
  }

  const timerColor = countdown < 15 ? theme.red : countdown < 30 ? theme.amber : theme.green

  /* ══ Result screen (success / error) ══ */
  if (mode === 'result') {
    const isSuccess = resultType === 'success'

    return (
      <div style={{
        minHeight: '100vh',
        background: isSuccess
          ? (isDark ? 'rgba(52,168,83,0.06)' : 'rgba(52,168,83,0.04)')
          : (isDark ? 'rgba(234,67,53,0.08)' : 'rgba(234,67,53,0.04)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: FONT,
        transition: 'background 0.3s',
      }}>
        {milestone && <MilestoneOverlay milestone={milestone} theme={theme} />}

        <div style={{
          width: '100%', maxWidth: 480, textAlign: 'center',
          animation: 'checkinFadeIn 0.3s ease-out',
        }}>
          {/* Status icon */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: isSuccess ? `${theme.green}18` : `${theme.red}18`,
            border: `3px solid ${isSuccess ? '#1A3A8F' : theme.red}`,
            boxShadow: isSuccess ? '0 0 40px rgba(26,58,143,0.4)' : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'checkinPop 0.4s ease-out',
          }}>
            {isSuccess ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div style={{
            fontSize: isSuccess ? 28 : 36,
            fontWeight: 800,
            color: isSuccess ? theme.green : theme.red,
            fontFamily: FONT,
            marginBottom: 8,
            letterSpacing: '-0.5px',
          }}>
            {isSuccess ? resultMsg : 'Check-in Failed'}
          </div>

          {/* Streak display */}
          {isSuccess && streakCount > 0 && (
            <div style={{
              fontSize: 13, color: '#1A3A8F', fontFamily: FONT_M,
              marginTop: 4, marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A3A8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              {streakCount}-day streak
            </div>
          )}

          {/* Birthday greeting */}
          {isSuccess && isBirthday && !milestone && (
            <div style={{
              fontSize: 14, color: '#1A3A8F', fontWeight: 600,
              marginTop: 8, fontFamily: FONT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Happy Birthday!
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A3A8F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
                <path d="M2 21h20" /><path d="M7 8v2" /><path d="M12 8v2" /><path d="M17 8v2" />
                <path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" />
              </svg>
              Special offers at reception
            </div>
          )}

          {/* Flash sale banner */}
          {isSuccess && <FlashSaleBanner sale={flashSale} />}

          {!isSuccess && (
            <>
              <div style={{
                fontSize: 16, color: theme.textSec,
                marginBottom: 16,
              }}>
                {resultMsg}
              </div>
              <div style={{
                fontSize: 24, fontWeight: 800,
                color: theme.red,
                textTransform: 'uppercase', letterSpacing: 2,
                padding: '16px 32px',
                background: `${theme.red}12`,
                borderRadius: 16,
                border: `2px solid ${theme.red}30`,
                display: 'inline-block',
              }}>
                See Front Desk
              </div>
            </>
          )}

          {/* Cooldown bar */}
          <CooldownBar active={cooldownActive} theme={theme} />

          <div style={{
            marginTop: 16, fontSize: 13, color: theme.textTer,
            fontFamily: FONT_M,
          }}>
            Ready for next member in a moment...
          </div>
        </div>

        <style>{`
          @keyframes checkinFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes checkinPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes flashSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  /* ══ QR display screen ══ */
  if (mode === 'qr') {
    return (
      <div style={{
        minHeight: '100vh', background: theme.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: FONT,
      }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <Logo theme={theme} />
          {gymName && <GymLabel name={gymName} theme={theme} />}

          <div style={{
            background: theme.bgSec, borderRadius: 20,
            border: `1px solid ${theme.border}`, padding: 28,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            {memberName && (
              <div style={{
                fontSize: 18, fontWeight: 700, color: theme.text,
                fontFamily: FONT, marginBottom: 20,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>Welcome, {memberName}!</div>
            )}

            <div style={{
              display: 'inline-block', padding: 16, background: '#FFFFFF',
              borderRadius: 16, marginBottom: 24,
              border: `3px solid ${timerColor}`,
              boxShadow: `0 0 30px ${timerColor}20`,
              transition: 'border-color 0.5s, box-shadow 0.5s',
            }}>
              <QRCodeSVG value={qrToken} size={200} />
            </div>

            <CircularCountdown countdown={countdown} color={timerColor} theme={theme} />

            <p style={{ fontSize: 14, fontWeight: 500, color: theme.textSec, fontFamily: FONT_M, marginBottom: 4 }}>
              {phone}
            </p>
            <p style={{ fontSize: 12, color: theme.textTer, marginBottom: 20 }}>
              QR auto-refreshes when it expires
            </p>

            <button
              onClick={() => { clearInterval(timerRef.current); resetToReady() }}
              style={{
                width: '100%', padding: '14px 24px', borderRadius: 12, cursor: 'pointer',
                background: theme.bgTer, border: `1px solid ${theme.border}`,
                color: theme.textSec, fontSize: 14, fontWeight: 500, fontFamily: FONT,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = theme.bgTer}
            >Use Different Number</button>
          </div>
        </div>
      </div>
    )
  }

  /* ══ Phone input screen (default) ══ */
  return (
    <div style={{
      minHeight: '100vh', background: theme.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: FONT,
    }}>
      {idleMode && <IdleScreen ad={currentAd} gymName={gymName} theme={theme} onWake={() => setIdleMode(false)} />}

      {/* Offline status banner */}
      {!offlineSync.isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
          background: '#EA4335', color: '#fff', textAlign: 'center',
          padding: '8px 16px', fontSize: 13, fontWeight: 600, fontFamily: FONT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#fff', opacity: 0.7,
            animation: 'spPulse 1.5s ease-in-out infinite',
          }} />
          OFFLINE MODE
          {offlineSync.pendingCheckins.length > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              padding: '2px 8px', borderRadius: 10, fontSize: 11,
            }}>
              {offlineSync.pendingCheckins.length} check-in{offlineSync.pendingCheckins.length !== 1 ? 's' : ''} queued
            </span>
          )}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <Logo theme={theme} />
        {gymName && <GymLabel name={gymName} theme={theme} />}

        <h1 style={{
          fontSize: 22, fontWeight: 700, color: theme.text,
          fontFamily: FONT, marginBottom: 4,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>Gym Check-in</h1>
        <p style={{ fontSize: 14, color: theme.textSec, marginBottom: 32 }}>
          Enter your phone number to check in
        </p>

        <div style={{
          background: theme.bgSec, borderRadius: 20,
          border: `1px solid ${theme.border}`, padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: theme.textSec, marginBottom: 8, textAlign: 'left',
              textTransform: 'uppercase', letterSpacing: 1,
            }}>Phone Number</label>
            <input
              type="tel"
              placeholder="9876543210"
              maxLength={10}
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleCheckin()}
              autoFocus
              style={{
                width: '100%', padding: '16px 18px', borderRadius: 14,
                border: `1px solid ${theme.border}`, background: theme.bgTer, color: theme.text,
                fontSize: 22, fontFamily: FONT_M, outline: 'none',
                boxSizing: 'border-box', textAlign: 'center', letterSpacing: 4,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = theme.borderFocus}
              onBlur={e => e.target.style.borderColor = theme.border}
            />
            {error && <p style={{ fontSize: 13, color: theme.red, marginTop: 8, fontWeight: 500 }}>{error}</p>}
          </div>

          {/* Primary: instant check-in */}
          <button
            disabled={loading}
            onClick={handleCheckin}
            style={{
              width: '100%', padding: '16px 24px', borderRadius: 14,
              border: 'none', cursor: 'pointer',
              background: theme.brandAccent, color: '#fff',
              fontSize: 16, fontWeight: 700, fontFamily: FONT,
              textTransform: 'uppercase', letterSpacing: 1,
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
              marginBottom: 10,
            }}
          >{loading ? 'Checking in...' : 'Check In'}</button>

          {/* Secondary: generate QR for staff to scan */}
          <button
            disabled={loading}
            onClick={generateQR}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 12,
              border: `1px solid ${theme.border}`, cursor: 'pointer',
              background: 'transparent', color: theme.textSec,
              fontSize: 13, fontWeight: 500, fontFamily: FONT,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Show QR Code Instead</button>
        </div>
      </div>
    </div>
  )
}

/* ── Idle screen with sponsor ads ── */
function IdleScreen({ ad, gymName, theme, onWake }) {
  if (!ad) return null
  return (
    <div onClick={onWake} style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#050505',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontFamily: FONT,
      animation: 'checkinFadeIn 0.5s ease-out',
    }}>
      {/* Sponsor ad */}
      <div style={{
        background: '#121212', border: '1px solid #1F1F1F',
        borderRadius: 20, padding: 48, maxWidth: 480, width: '90%',
        textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '40%', height: 3, borderRadius: '0 0 3px 3px',
          background: ad.color,
        }} />
        <div style={{
          fontSize: 11, fontWeight: 700, color: ad.color,
          letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: 16, fontFamily: FONT,
        }}>{ad.brand}</div>
        <div style={{
          fontSize: 32, fontWeight: 800, color: '#FFFFFF',
          letterSpacing: '-0.5px', marginBottom: 8, fontFamily: FONT,
        }}>{ad.headline}</div>
        <div style={{
          fontSize: 16, color: 'rgba(255,255,255,0.5)',
          fontFamily: FONT,
        }}>{ad.sub}</div>
      </div>

      {/* Tap to check in */}
      <div style={{
        marginTop: 40, fontSize: 14, color: 'rgba(255,255,255,0.3)',
        fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#1A3A8F',
          animation: 'spPulse 2s ease-in-out infinite',
        }} />
        Tap anywhere to check in
      </div>

      {/* Gym branding */}
      <div style={{
        position: 'absolute', bottom: 24, left: 0, right: 0,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.2)', fontFamily: FONT }}>
          {gymName || 'IVIRA'}
        </div>
      </div>

      <style>{`
        @keyframes spPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

/* ── Shared sub-components ── */
function Logo({ theme }) {
  return (
    <div style={{
      fontSize: 32, fontWeight: 800, fontFamily: FONT,
      background: theme.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      marginBottom: 4,
    letterSpacing: 2,
    }}>IVIRA</div>
  )
}

function GymLabel({ name, theme }) {
  return (
    <div style={{
      fontSize: 14, fontWeight: 600, color: theme.brandAccent,
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginBottom: 4, fontFamily: FONT,
    }}>{name}</div>
  )
}
