import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Heart, User, Camera, ChevronRight, Calendar, Clock,
  LogOut, Trophy, Bell, Shield, Dumbbell, Flame, Star, Target, Zap,
  Award, TrendingUp, MapPin, Users, Gift, Crown, X, QrCode,
  Sparkles, CreditCard, Activity, ChevronDown,
} from 'lucide-react'
import { M, FONT, FONT_M } from '../../components/member/theme'
import BottomNav from '../../components/member/BottomNav'
import QRCodeCard from '../../components/member/QRCodeCard'
import GoalTracker from '../../components/member/GoalTracker'
import HealthTracker from '../../components/member/HealthTracker'
import MealLogger from '../../components/member/MealLogger'
import StoreCard from '../../components/member/StoreCard'
import useMediaQuery from '../../hooks/useMediaQuery'
import api from '../../lib/api'

// 4 tabs = 2 left + FAB center + 2 right → perfectly balanced bottom nav
const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'classes', label: 'Classes', icon: Calendar },
  { key: 'rewards', label: 'Rewards', icon: Trophy },
  { key: 'profile', label: 'Profile', icon: User },
]

/* ────────── MOBILE TOP HEADER ────────── */
function MobileHeader({ tab }) {
  const titles = { home: null, classes: 'Classes', rewards: 'Rewards', profile: 'Profile' }
  const title = titles[tab]
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 90,
      background: `${M.bg}EE`,
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${M.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', justifyContent: 'space-between',
      fontFamily: FONT,
    }}>
      {title ? (
        <span style={{ fontSize: 17, fontWeight: 700, color: M.text }}>{title}</span>
      ) : (
        <span style={{ fontSize: 18, fontWeight: 800, color: M.text, letterSpacing: '-0.02em' }}>
          <span style={{ opacity: 0.35 }}>I</span>VIRA
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          width: 36, height: 36, borderRadius: 10,
          background: M.card, border: `1px solid ${M.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Bell size={17} color={M.textSec} />
        </button>
      </div>
    </div>
  )
}

/* ────────── MEMBERSHIP CARD ────────── */
function MembershipCard({ member }) {
  // Compute days remaining from membership end_date
  const endDate = member?.membership?.end_date || member?.end_date || null
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null
  const urgent = daysLeft !== null && daysLeft <= 7
  const plan = member?.membership?.plan_name || member?.membership?.name || member?.plan_name || 'Membership'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0C1F18 0%, #150C2A 100%)',
      borderRadius: 20, padding: '20px 20px 18px',
      border: `1px solid ${urgent ? M.red + '40' : 'rgba(16,185,129,0.2)'}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: 'rgba(159,103,255,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -16, left: 20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #10B981, #9F67FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CreditCard size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>IVIRA</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{plan}</div>
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 20,
          background: urgent ? M.red + '20' : M.green + '15',
          border: `1px solid ${urgent ? M.red + '40' : M.green + '30'}`,
          fontSize: 11, fontWeight: 700,
          color: urgent ? M.red : M.green,
        }}>
          {urgent ? '⚠ Expiring' : '● Active'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{member?.name || 'Member'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {member?.membership?.start_date
              ? `Member since ${new Date(member.membership.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
              : member?.created_at
              ? `Member since ${new Date(member.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
              : 'Active member'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: urgent ? M.red : M.accent, fontFamily: FONT }}>
            {daysLeft !== null ? daysLeft : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            {daysLeft !== null ? 'days left' : 'active'}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────── QR CHECK-IN SHEET ────────── */
function CheckinSheet({ open, onClose, gymId, memberId }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, background: M.card,
          borderRadius: '24px 24px 0 0', padding: '12px 20px 32px',
          border: `1px solid ${M.border}`, borderBottom: 'none',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: M.border, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: M.text, fontFamily: FONT }}>Quick Check-In</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <X size={20} color={M.textSec} />
          </button>
        </div>
        <QRCodeCard gymId={gymId} memberId={memberId} />
      </div>
    </div>
  )
}

/* ────────── ACTION HUB (2x2 TILES) ────────── */
function ActionHub({ onTabChange, onWorkout }) {
  const navigate = useNavigate()
  const actions = [
    { label: 'Book a Class', icon: Calendar, color: '#10B981', bg: '#10B98118', tab: 'classes' },
    { label: 'Find a Trainer', icon: Users, color: '#34A853', bg: '#34A85318', tab: 'classes' },
    { label: 'Log Workout', icon: Dumbbell, color: '#FBBC05', bg: '#FBBC0518', workout: true },
    { label: 'Join a Challenge', icon: Target, color: '#EA4335', bg: '#EA433518', tab: 'rewards' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => a.vira ? navigate('/vira') : a.workout ? onWorkout?.() : onTabChange(a.tab)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 10, padding: 16, borderRadius: 16,
            background: M.card, border: `1px solid ${M.border}`,
            cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
            transition: 'all 0.2s', minHeight: 96,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: a.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <a.icon size={20} color={a.color} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: M.text }}>{a.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ────────── STREAK BANNER ────────── */
function StreakBanner({ member }) {
  const streak = member?.streak || 0
  const visits = member?.totalCheckins || 0
  const isOnFire = streak >= 3
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,'
  const firstName = (member?.name || 'Member').split(' ')[0]

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: '18px 20px',
      border: `1px solid ${isOnFire ? M.accent + '30' : M.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
    }}>
      {isOnFire && (
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 80, height: 80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}
      <div>
        <p style={{ fontSize: 12, color: M.textSec, margin: '0 0 3px', fontFamily: FONT }}>{greeting}</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: 0, fontFamily: FONT, letterSpacing: '-0.01em' }}>
          {firstName}
        </h2>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: isOnFire ? M.accent : M.textSec, fontFamily: FONT_M, lineHeight: 1 }}>
            {isOnFire ? '🔥 ' : ''}{streak}
          </div>
          <div style={{ fontSize: 9, color: M.textTer, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Day Streak</div>
        </div>
        <div style={{ width: 1, height: 28, background: M.border }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: M.green, fontFamily: FONT_M, lineHeight: 1 }}>{visits}</div>
          <div style={{ fontSize: 9, color: M.textTer, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Total Visits</div>
        </div>
      </div>
    </div>
  )
}

/* ────────── UPCOMING CLASSES STRIP ────────── */
function UpcomingStrip({ onSeeAll, gymId }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('ivira_member_token')
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    api.get(`/gyms/${gymId}/sessions`, {
      params: { date: today, limit: 4 },
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const raw = res.data?.sessions || res.data || []
      setClasses(raw.slice(0, 4).map(s => ({
        name: s.name || s.class_name || 'Class',
        time: s.start_time
          ? new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : s.time || '',
        trainer: s.trainer_name || s.trainer || 'TBA',
        spots: s.available_spots ?? 10,
      })))
      setLoading(false)
    }).catch(() => {
      // Fallback sample data if gym has no sessions
      setClasses([
        { name: 'HIIT Burn', time: '6:30 AM', trainer: 'Rahul K.', spots: 3 },
        { name: 'Yoga Flow', time: '7:30 AM', trainer: 'Priya S.', spots: 8 },
        { name: 'Boxing', time: '8:00 AM', trainer: 'Vikram R.', spots: 1 },
      ])
      setLoading(false)
    })
  }, [gymId, today, token])

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: '16px 0 16px 20px',
      border: `1px solid ${M.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text, fontFamily: FONT }}>Today's Classes</span>
        <button
          onClick={onSeeAll}
          style={{ fontSize: 12, color: M.accent, fontWeight: 500, cursor: 'pointer', fontFamily: FONT, background: 'none', border: 'none', padding: 0 }}
        >See All →</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 10, paddingRight: 20 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ minWidth: 130, height: 80, borderRadius: 14, background: M.cardSec, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div style={{ paddingRight: 20, fontSize: 13, color: M.textSec, fontFamily: FONT }}>No classes today.</div>
      ) : (
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto', paddingRight: 20, paddingBottom: 4,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {classes.map((c, i) => (
            <div key={i} style={{
              minWidth: 140, padding: '14px 16px', borderRadius: 14,
              background: M.cardSec, border: `1px solid ${M.border}`,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: M.text }}>{c.name}</div>
              <div style={{ fontSize: 11, color: M.textSec, marginTop: 4 }}>{c.trainer}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <Clock size={11} color={M.accent} />
                <span style={{ fontSize: 11, color: M.accent, fontFamily: FONT_M }}>{c.time}</span>
              </div>
              <div style={{
                fontSize: 10, marginTop: 6, fontWeight: 600,
                color: c.spots <= 3 ? M.red : M.green,
              }}>{c.spots} spot{c.spots !== 1 ? 's' : ''} left</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ────────── TODAY'S PLAN CARD ────────── */
const PLAN_CACHE_KEY = 'ivira_todays_plan'
const PLAN_CACHE_DATE_KEY = 'ivira_todays_plan_date'

function TodaysPlanCard({ onWorkout }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPlan = () => {
    const token = localStorage.getItem('ivira_member_token')
    if (!token) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    const cachedDate = localStorage.getItem(PLAN_CACHE_DATE_KEY)
    const cachedPlan = localStorage.getItem(PLAN_CACHE_KEY)
    if (cachedDate === today && cachedPlan) {
      setPlan(JSON.parse(cachedPlan))
      setLoading(false)
      return
    }

    api.post('/ai/workout-plan', {
      goal: 'general_fitness',
      experience_level: 'intermediate',
      days_per_week: 4,
      equipment_available: ['barbell', 'dumbbell', 'machine', 'cable'],
      focus_areas: ['chest', 'back', 'legs', 'core'],
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const data = res.data
      const dayIndex = new Date().getDay()
      const days = data?.days || []
      const todayDay = days[dayIndex % days.length] || days[0]
      const exercises = todayDay?.exercises?.filter(e => !e.is_warmup).slice(0, 5) || null

      if (exercises && exercises.length > 0) {
        setPlan(exercises)
        localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(exercises))
        localStorage.setItem(PLAN_CACHE_DATE_KEY, today)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchPlan()
  }, [])

  if (loading) {
    return (
      <div style={{
        background: M.card, borderRadius: 16, padding: '16px 20px',
        border: `1px solid ${M.border}`,
      }}>
        <div style={{ height: 16, width: 120, borderRadius: 8, background: M.cardSec, marginBottom: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 14, borderRadius: 8, background: M.cardSec, marginBottom: 10, width: `${70 + i * 8}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
        <div style={{ height: 38, borderRadius: 12, background: M.cardSec, marginTop: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    )
  }

  if (!plan) return null

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: '16px 20px',
      border: `1px solid ${M.accent}28`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: M.text, fontFamily: FONT }}>
          Today's Plan ✨
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            onClick={() => {
              localStorage.removeItem(PLAN_CACHE_KEY)
              localStorage.removeItem(PLAN_CACHE_DATE_KEY)
              setLoading(true)
              setPlan(null)
              fetchPlan()
            }}
            style={{ fontSize: 10, color: M.textSec, cursor: 'pointer', textDecoration: 'underline' }}
          >
            refresh
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: M.accent, letterSpacing: '0.06em',
            textTransform: 'uppercase', background: M.accent + '15',
            padding: '3px 8px', borderRadius: 20,
          }}>AI</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {plan.map((ex, i) => {
          const name = ex.name || ex.exercise_name || ex.exercise || `Exercise ${i + 1}`
          const sets = ex.sets ?? ex.set_count ?? '—'
          const reps = ex.reps ?? ex.rep_count ?? ex.reps_per_set ?? '—'
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 12,
              background: M.cardSec, border: `1px solid ${M.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: M.accent + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Dumbbell size={14} color={M.accent} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: M.text, fontFamily: FONT }}>{name}</span>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, color: M.textSec,
                fontFamily: FONT_M, flexShrink: 0, marginLeft: 8,
              }}>{sets} × {reps}</span>
            </div>
          )
        })}
      </div>

      <button
        onClick={onWorkout}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 12,
          background: `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.01em',
        }}
      >
        Start Workout
      </button>
    </div>
  )
}

/* ────────── WORKOUT HISTORY ────────── */
function WorkoutHistory({ gymId, memberId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null) // expanded session id

  useEffect(() => {
    if (!gymId || !memberId) { setLoading(false); return }
    const token = localStorage.getItem('ivira_member_token') || localStorage.getItem('ivira_token')
    api.get(`/gyms/${gymId}/members/${memberId}/workout-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10 }
    }).then(res => {
      setSessions(res.data?.sessions || res.data?.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [gymId, memberId])

  if (loading) return (
    <div style={{ background: M.card, borderRadius: 16, padding: '16px 20px', border: `1px solid ${M.border}` }}>
      <div style={{ height: 14, width: 100, borderRadius: 8, background: M.cardSec, marginBottom: 12 }} />
      {[1,2,3].map(i => <div key={i} style={{ height: 52, borderRadius: 12, background: M.cardSec, marginBottom: 8 }} />)}
    </div>
  )

  if (!sessions.length) return null // Don't show if no history yet

  return (
    <div style={{ background: M.card, borderRadius: 16, padding: '16px 20px', border: `1px solid ${M.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: M.text, fontFamily: FONT }}>Workout History</span>
        <span style={{ fontSize: 12, color: M.textSec, fontFamily: FONT }}>{sessions.length} sessions</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.slice(0, 5).map(s => {
          const isExp = expanded === s.id
          const date = new Date(s.session_date || s.created_at)
          const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          const type = s.workout_type || s.name || 'Workout'
          const duration = s.duration_minutes ? `${s.duration_minutes}m` : null
          const exCount = s.exercise_count || s.sets?.length || null

          return (
            <div key={s.id}
              onClick={() => setExpanded(isExp ? null : s.id)}
              style={{
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                background: M.cardSec, border: `1px solid ${M.border}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: M.accent + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Dumbbell size={15} color={M.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: M.text, fontFamily: FONT, textTransform: 'capitalize' }}>
                      {type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 11, color: M.textSec, fontFamily: FONT, marginTop: 2 }}>
                      {dateStr}{duration ? ` · ${duration}` : ''}{exCount ? ` · ${exCount} exercises` : ''}
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color={M.textSec} style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              </div>

              {isExp && s.exercises && s.exercises.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${M.border}` }}>
                  {s.exercises.slice(0, 4).map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: M.textSec, fontFamily: FONT }}>{ex.exercise_name || ex.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: M.text, fontFamily: FONT_M }}>
                        {ex.best_weight_kg ? `${ex.best_weight_kg}kg` : ''} {ex.total_sets ? `${ex.total_sets}×` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ────────── ASSIGNED WORKOUTS (from trainer) ────────── */
function AssignedWorkouts({ gymId, onWorkout }) {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    const token = localStorage.getItem('ivira_member_token') || localStorage.getItem('ivira_token')
    api.get(`/gyms/${gymId}/members/me/assigned-workouts`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const all = res.data?.workouts || []
      // Show only pending/upcoming workouts
      setWorkouts(all.filter(w => w.status === 'pending' || !w.status).slice(0, 3))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [gymId])

  if (loading || !workouts.length) return null

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: '16px 20px',
      border: `1px solid ${M.accent}28`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: M.text, fontFamily: FONT }}>
          From Your Trainer
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#F59E0B',
          background: '#F59E0B15', padding: '3px 8px', borderRadius: 20, letterSpacing: '0.06em',
        }}>
          {workouts.length} PENDING
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {workouts.map(w => {
          const isExp = expanded === w.id
          const exercises = Array.isArray(w.exercises) ? w.exercises : []
          const scheduledStr = w.scheduled_date
            ? new Date(w.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
            : null

          return (
            <div key={w.id}
              style={{
                background: M.cardSec, borderRadius: 12, padding: '12px 14px',
                border: `1px solid ${M.border}`, cursor: 'pointer',
              }}
              onClick={() => setExpanded(isExp ? null : w.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: M.text, fontFamily: FONT }}>
                    {w.title}
                  </div>
                  {scheduledStr && (
                    <div style={{ fontSize: 11, color: M.textSec, fontFamily: FONT, marginTop: 2 }}>
                      📅 {scheduledStr}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} color={M.textSec}
                  style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              </div>

              {isExp && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${M.border}` }}>
                  {w.description && (
                    <p style={{ fontSize: 12, color: M.textSec, fontFamily: FONT, marginBottom: 8 }}>
                      {w.description}
                    </p>
                  )}
                  {exercises.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {exercises.slice(0, 5).map((ex, i) => (
                        <div key={i} style={{
                          fontSize: 12, color: M.text, fontFamily: FONT,
                          padding: '4px 0', borderBottom: i < exercises.length - 1 ? `1px solid ${M.border}` : 'none',
                          display: 'flex', justifyContent: 'space-between',
                        }}>
                          <span>{ex.exercise_name || ex.name || `Exercise ${i+1}`}</span>
                          {ex.notes && <span style={{ color: M.textSec }}>{ex.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {w.notes && (
                    <p style={{ fontSize: 11, color: M.accent, fontFamily: FONT, marginBottom: 10 }}>
                      💬 {w.notes}
                    </p>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onWorkout && onWorkout() }}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 10,
                      background: `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: FONT,
                    }}
                  >
                    Start This Workout
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ────────── HORIZONTAL DATE SCROLLER ────────── */
function DateScroller({ selectedDate, onSelect }) {
  const scrollRef = useRef(null)
  const dates = []
  const today = new Date()
  for (let i = -1; i < 13; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0',
      scrollbarWidth: 'none', msOverflowStyle: 'none',
    }} ref={scrollRef}>
      {dates.map((d, i) => {
        const isSelected = d.toDateString() === selectedDate.toDateString()
        const isToday = d.toDateString() === today.toDateString()
        return (
          <button
            key={i}
            onClick={() => onSelect(d)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '10px 14px', borderRadius: 14, flexShrink: 0,
              minWidth: 52, minHeight: 64,
              background: isSelected ? M.accent : M.card,
              border: `1px solid ${isSelected ? M.accent : M.border}`,
              cursor: 'pointer', fontFamily: FONT, transition: 'all 0.2s',
            }}
          >
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
              color: isSelected ? '#fff' : M.textTer,
            }}>{dayNames[d.getDay()]}</span>
            <span style={{
              fontSize: 18, fontWeight: 700,
              color: isSelected ? '#fff' : M.text,
              fontFamily: FONT_M,
            }}>{d.getDate()}</span>
            {isToday && !isSelected && (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: M.accent }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ────────── BOOKING CONFIRMATION SHEET ────────── */
function BookingSheet({ classItem, onConfirm, onClose }) {
  const [booked, setBooked] = useState(false)
  const [loading, setLoading] = useState(false)
  const intensityColor = { High: M.red, Med: M.amber, Low: M.green }
  const color = intensityColor[classItem?.intensity] || M.accent

  const handleConfirm = async () => {
    setLoading(true)
    const token = localStorage.getItem('ivira_member_token')
    const gymId = localStorage.getItem('ivira_member_gym')

    try {
      if (classItem.id && gymId) {
        // Real API booking
        await api.post(`/gyms/${gymId}/sessions/${classItem.id}/reserve`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        // Fallback for demo/mock classes without real IDs
        await new Promise(r => setTimeout(r, 800))
      }
      setLoading(false)
      setBooked(true)
      setTimeout(() => { onConfirm?.(); onClose() }, 1400)
    } catch (err) {
      setLoading(false)
      const msg = err?.response?.data?.message || 'Booking failed. Please try again.'
      alert(msg)
    }
  }

  if (!classItem) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: M.card, borderRadius: '24px 24px 0 0',
          padding: '12px 20px 36px',
          border: `1px solid ${M.border}`, borderBottom: 'none',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: M.border, margin: '0 auto 20px' }} />

        {booked ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: M.green + '20', border: `2px solid ${M.green}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 30 }}>✓</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: '0 0 8px', fontFamily: FONT }}>
              Class Booked!
            </h3>
            <p style={{ fontSize: 13, color: M.textSec, margin: 0, fontFamily: FONT }}>
              {classItem.name} at {classItem.time}. See you there! 💪
            </p>
          </div>
        ) : (
          <>
            {/* Class info */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: `${color}18`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: FONT_M }}>{classItem.time.split(' ')[0]}</span>
                <span style={{ fontSize: 9, color, fontWeight: 600 }}>{classItem.time.split(' ')[1]}</span>
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: M.text, margin: '0 0 3px', fontFamily: FONT }}>{classItem.name}</h3>
                <p style={{ fontSize: 12, color: M.textSec, margin: 0, fontFamily: FONT }}>{classItem.trainer} · {classItem.duration}</p>
              </div>
            </div>

            {/* Details row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
              {[
                { label: 'Intensity', value: classItem.intensity, color },
                { label: 'Spots Left', value: `${classItem.spots} available`, color: classItem.spots <= 3 ? M.red : M.green },
                { label: 'Duration', value: classItem.duration, color: M.textSec },
                { label: 'Trainer', value: classItem.trainer, color: M.textSec },
              ].map((d, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 12,
                  background: M.cardSec, border: `1px solid ${M.border}`,
                }}>
                  <div style={{ fontSize: 10, color: M.textTer, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{d.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: d.color || M.text }}>{d.value}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                background: loading ? M.cardSec : `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
                border: 'none', color: loading ? M.textSec : '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                fontFamily: FONT, minHeight: 52,
                boxShadow: loading ? 'none' : `0 4px 20px ${M.accentGlow}`,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${M.textTer}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                  Booking…
                </>
              ) : 'Confirm Booking'}
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '12px', marginTop: 8, borderRadius: 12,
                background: 'none', border: 'none', color: M.textSec,
                fontSize: 14, cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ────────── CLASS LISTINGS ────────── */
function ClassListings({ date, gymId, onBook }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('ivira_member_token')
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    api.get(`/gyms/${gymId}/sessions`, {
      params: { date: dateStr },
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const raw = res.data?.sessions || res.data || []
      setClasses(raw.map(s => ({
        id: s.id,
        name: s.name || s.class_name || 'Class',
        time: s.start_time ? new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : s.time || '',
        trainer: s.trainer_name || s.trainer || 'TBA',
        duration: s.duration_minutes ? `${s.duration_minutes} min` : s.duration || '45 min',
        spots: s.available_spots ?? s.capacity ?? 10,
        intensity: s.intensity || 'Med',
      })))
      setLoading(false)
    }).catch(() => {
      // Fallback to sample data if API fails or returns empty
      setClasses([
        { id: null, name: 'Morning HIIT', time: '6:30 AM', trainer: 'Rahul K.', duration: '45 min', spots: 3, intensity: 'High' },
        { id: null, name: 'Yoga Flow', time: '7:30 AM', trainer: 'Priya S.', duration: '60 min', spots: 8, intensity: 'Low' },
        { id: null, name: 'Spin Cycle', time: '8:30 AM', trainer: 'Anjali M.', duration: '40 min', spots: 5, intensity: 'High' },
        { id: null, name: 'Strength Training', time: '10:00 AM', trainer: 'Arjun P.', duration: '50 min', spots: 12, intensity: 'Med' },
        { id: null, name: 'Boxing Basics', time: '5:00 PM', trainer: 'Vikram R.', duration: '45 min', spots: 1, intensity: 'High' },
        { id: null, name: 'Pilates', time: '6:30 PM', trainer: 'Dr. Suresh', duration: '55 min', spots: 10, intensity: 'Low' },
      ])
      setLoading(false)
    })
  }, [gymId, dateStr, token])

  const intensityColor = { High: M.red, Med: M.amber, Low: M.green }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 72, borderRadius: 14, background: M.card, border: `1px solid ${M.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )

  if (classes.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: M.textSec, fontFamily: FONT, fontSize: 13 }}>
      No classes scheduled for this day.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {classes.map((c, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 14,
          background: M.card, border: `1px solid ${M.border}`,
        }}>
          <div style={{
            width: 48, minHeight: 48, borderRadius: 12,
            background: `${intensityColor[c.intensity]}18`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: intensityColor[c.intensity], fontFamily: FONT_M }}>
              {c.time.split(' ')[0]}
            </span>
            <span style={{ fontSize: 8, color: intensityColor[c.intensity], fontWeight: 600 }}>
              {c.time.split(' ')[1]}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: M.text }}>{c.name}</div>
            <div style={{ fontSize: 11, color: M.textSec, marginTop: 2 }}>{c.trainer} · {c.duration}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={() => onBook?.(c)}
              style={{
                padding: '8px 16px', borderRadius: 10,
                background: c.spots <= 3 ? M.accent : M.accentSoft,
                border: `1px solid ${c.spots <= 3 ? M.accent : M.accent + '40'}`,
                color: c.spots <= 3 ? '#fff' : M.accent,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                minHeight: 36, minWidth: 64,
              }}
            >
              {c.spots <= 3 ? `${c.spots} left!` : 'Book'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ────────── LEADERBOARD SECTION ────────── */
function LeaderboardSection({ gymId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('ivira_member_token')
  const memberId = (() => { try { return JSON.parse(localStorage.getItem('ivira_member') || '{}').id } catch { return null } })()

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    api.get(`/gyms/${gymId}/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setData(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [gymId, token])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 56, borderRadius: 14, background: M.card, border: `1px solid ${M.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )

  const rankings = data?.rankings || []
  if (rankings.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: M.textSec, fontFamily: FONT, fontSize: 13 }}>
      No leaderboard data yet. Start logging your steps! 🏃
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* My rank banner */}
      {data?.memberStreak > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 14,
          background: `linear-gradient(135deg, ${M.accent}18, ${M.accent}08)`,
          border: `1px solid ${M.accent}30`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Flame size={18} color={M.accent} />
          <span style={{ fontSize: 13, fontWeight: 600, color: M.accent, fontFamily: FONT }}>
            Your streak: {data.memberStreak} days 🔥
          </span>
        </div>
      )}

      {/* Rankings */}
      {rankings.slice(0, 10).map((r, i) => {
        const isMe = r.member_id === memberId
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        return (
          <div key={r.member_id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 14,
            background: isMe ? M.accentSoft : M.card,
            border: `1px solid ${isMe ? M.accent + '40' : M.border}`,
          }}>
            <div style={{
              width: 32, textAlign: 'center',
              fontSize: medal ? 18 : 13, fontWeight: 700,
              color: isMe ? M.accent : M.textTer, fontFamily: FONT_M,
            }}>
              {medal || `#${r.rank}`}
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${M.accent}40, #9F67FF40)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: M.text, fontFamily: FONT,
            }}>
              {(r.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? M.accent : M.text, fontFamily: FONT }}>
                {isMe ? 'You' : r.name}
              </div>
              <div style={{ fontSize: 11, color: M.textSec, fontFamily: FONT }}>
                {(r.steps || 0).toLocaleString()} steps · {r.calories_burned || 0} kcal
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: M.textSec, fontFamily: FONT_M }}>
              {r.distance_km ? `${r.distance_km} km` : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ────────── REFERRAL CARD ────────── */
function ReferralCard({ gymId }) {
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)
  const token = localStorage.getItem('ivira_member_token')

  useEffect(() => {
    if (!gymId) return
    // Get or generate referral code
    api.post(`/gyms/${gymId}/referrals/my-code`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setStats(res.data?.stats || res.data)
    }).catch(() => {
      api.get(`/gyms/${gymId}/referrals/my-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setStats(res.data?.stats)).catch(() => {})
    })
  }, [gymId, token])

  const handleCopy = () => {
    if (!stats?.code) return
    navigator.clipboard.writeText(stats.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, #0A1628 0%, #1A0A28 100%)`,
      borderRadius: 18, padding: '18px 20px',
      border: '1px solid rgba(159,103,255,0.25)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(159,103,255,0.1)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, #9F67FF30, #9F67FF18)',
          border: '1px solid rgba(159,103,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Gift size={18} color="#9F67FF" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: FONT }}>Refer a Friend</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: FONT }}>Earn 1,000 pts per successful referral</div>
        </div>
      </div>

      {stats ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Referred', value: stats.total_referrals || 0 },
              { label: 'Joined', value: stats.completed_referrals || 0 },
              { label: 'Rank', value: stats.leaderboard_position ? `#${stats.leaderboard_position}` : '—' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#9F67FF', fontFamily: FONT_M }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleCopy}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(159,103,255,0.15)',
              border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(159,103,255,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', fontFamily: FONT_M }}>
              {stats.code || '...'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: copied ? M.green : '#9F67FF' }}>
              {copied ? '✓ Copied!' : 'Tap to copy'}
            </span>
          </button>
        </>
      ) : (
        <div style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      )}
    </div>
  )
}

/* ────────── CHALLENGES ────────── */
function ChallengesSection({ gymId }) {
  const challenges = [
    { title: '30-Day Streak', desc: 'Check in every day for 30 days', progress: 0.4, reward: '500 pts', icon: Zap, color: M.accent },
    { title: 'Class Explorer', desc: 'Try 5 different class types', progress: 0.6, reward: '300 pts', icon: Star, color: M.amber },
    { title: '10K Steps Daily', desc: 'Hit 10K steps for 7 days straight', progress: 0.28, reward: '200 pts', icon: TrendingUp, color: M.green },
    { title: 'Social Butterfly', desc: 'Refer 3 friends who join', progress: 0.33, reward: '1000 pts', icon: Users, color: '#E040FB' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ReferralCard gymId={gymId} />
      {challenges.map((c, i) => (
        <div key={i} style={{
          background: M.card, borderRadius: 16, padding: '16px 18px',
          border: `1px solid ${M.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: `${c.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <c.icon size={20} color={c.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: M.text }}>{c.title}</div>
              <div style={{ fontSize: 11, color: M.textSec }}>{c.desc}</div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 8, background: `${c.color}15`,
              fontSize: 11, fontWeight: 600, color: c.color, fontFamily: FONT_M,
            }}>{c.reward}</div>
          </div>
          {/* Progress Bar */}
          <div style={{ position: 'relative', height: 6, borderRadius: 3, background: M.cardSec, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${c.progress * 100}%`, borderRadius: 3,
              background: `linear-gradient(90deg, ${c.color}, ${c.color}AA)`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: M.textTer, marginTop: 6, fontFamily: FONT_M }}>
            {Math.round(c.progress * 100)}% complete
          </div>
        </div>
      ))}
    </div>
  )
}

/* ────────── REWARDS / PERKS TIER ────────── */
function RewardsTier({ member }) {
  const points = 1250
  const tiers = [
    { name: 'Bronze', min: 0, max: 1000, color: M.bronze, icon: Award },
    { name: 'Silver', min: 1000, max: 3000, color: M.silver, icon: Award },
    { name: 'Gold', min: 3000, max: 10000, color: M.gold, icon: Crown },
  ]

  const currentTier = tiers.reduce((acc, t) => points >= t.min ? t : acc, tiers[0])
  const nextTier = tiers[tiers.indexOf(currentTier) + 1]
  const tierProgress = nextTier
    ? (points - currentTier.min) / (nextTier.min - currentTier.min)
    : 1

  const perks = [
    { name: 'Free Towel Service', unlocked: true, tier: 'Bronze' },
    { name: 'Guest Pass (1/month)', unlocked: true, tier: 'Bronze' },
    { name: '10% Store Discount', unlocked: points >= 1000, tier: 'Silver' },
    { name: 'Priority Class Booking', unlocked: points >= 1000, tier: 'Silver' },
    { name: 'Free PT Session/month', unlocked: points >= 3000, tier: 'Gold' },
    { name: 'VIP Locker Access', unlocked: points >= 3000, tier: 'Gold' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tier Card */}
      <div style={{
        background: `linear-gradient(135deg, ${M.card}, ${currentTier.color}10)`,
        borderRadius: 20, padding: '24px 20px',
        border: `1px solid ${currentTier.color}40`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative ring */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          border: `2px solid ${currentTier.color}15`,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: `${currentTier.color}20`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 30px ${currentTier.color}20`,
          }}>
            <currentTier.icon size={28} color={currentTier.color} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: M.textTer, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Tier</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: currentTier.color }}>{currentTier.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: M.text, fontFamily: FONT_M }}>{points.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: M.textTer }}>points</div>
          </div>
        </div>

        {nextTier && (
          <>
            <div style={{ position: 'relative', height: 8, borderRadius: 4, background: M.cardSec, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${tierProgress * 100}%`, borderRadius: 4,
                background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: M.textTer }}>{currentTier.name}</span>
              <span style={{ fontSize: 11, color: nextTier.color, fontWeight: 600 }}>{nextTier.min - points} pts to {nextTier.name}</span>
            </div>
          </>
        )}
      </div>

      {/* Perks List */}
      <div style={{
        background: M.card, borderRadius: 16, padding: 20,
        border: `1px solid ${M.border}`,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text, display: 'block', marginBottom: 14, fontFamily: FONT }}>Your Perks</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {perks.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              background: p.unlocked ? M.accentSoft : M.cardSec,
              border: `1px solid ${p.unlocked ? M.accent + '30' : M.border}`,
              opacity: p.unlocked ? 1 : 0.5,
            }}>
              <Gift size={16} color={p.unlocked ? M.accent : M.textTer} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: p.unlocked ? M.text : M.textSec }}>{p.name}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                background: p.tier === 'Bronze' ? `${M.bronze}20` : p.tier === 'Silver' ? `${M.silver}20` : `${M.gold}20`,
                color: p.tier === 'Bronze' ? M.bronze : p.tier === 'Silver' ? M.silver : M.gold,
              }}>{p.tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ────────── VIRA AI CARD ────────── */
function ViraCard({ onOpen }) {
  const prompts = ['How can I recover faster?', 'Plan my week', 'I feel sore today']
  return (
    <div
      onClick={onOpen}
      style={{
        background: 'linear-gradient(135deg, #0D1F1A 0%, #0A1628 100%)',
        borderRadius: 20, padding: '18px 20px',
        border: '1px solid rgba(16,185,129,0.25)',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(16,185,129,0.08)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -30, right: -20, width: 120, height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: 'linear-gradient(135deg, #10B981, #9F67FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(16,185,129,0.4)',
          flexShrink: 0,
        }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: FONT }}>
            Vira AI
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: FONT }}>
            Your personal health coach
          </div>
        </div>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 20,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.25)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#10B981', fontFamily: FONT }}>Online</span>
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {prompts.map((p, i) => (
          <span key={i} style={{
            padding: '6px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: FONT,
          }}>{p}</span>
        ))}
      </div>
    </div>
  )
}

/* ────────── WORKOUT LOGGING SHEET ────────── */
function WorkoutSheet({ open, onClose, gymId, memberId }) {
  const [phase, setPhase] = useState('start') // 'start' | 'logging' | 'done'
  const [sessionId, setSessionId] = useState(null)
  const [exercises, setExercises] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sets, setSets] = useState({}) // { exerciseId: [{reps, weight}] }
  const [saving, setSaving] = useState(false)
  const token = localStorage.getItem('ivira_member_token')

  const WORKOUT_TYPES = [
    { label: 'Push Day', icon: '💪', exercises: ['Bench Press', 'Shoulder Press', 'Tricep Pushdown'] },
    { label: 'Pull Day', icon: '🏋️', exercises: ['Deadlift', 'Pull-ups', 'Barbell Row'] },
    { label: 'Leg Day', icon: '🦵', exercises: ['Squat', 'Leg Press', 'Romanian Deadlift'] },
    { label: 'Cardio', icon: '🏃', exercises: ['Treadmill', 'Cycling', 'Rowing'] },
    { label: 'Custom', icon: '✏️', exercises: [] },
  ]

  useEffect(() => {
    if (!open) {
      setPhase('start'); setSessionId(null); setExercises([])
      setSets({}); setSearchQuery(''); setSearchResults([])
    }
  }, [open])

  const searchExercises = async (q) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await api.get('/exercises/browse', { params: { search: q, limit: 8 } })
      setSearchResults(res.data?.exercises || res.data || [])
    } catch {
      // Fallback: filter common exercises
      const common = ['Bench Press','Squat','Deadlift','Pull-ups','Shoulder Press','Bicep Curl','Tricep Pushdown','Leg Press','Lat Pulldown','Cable Row','Incline Press','Leg Curl','Leg Extension','Dumbbell Row','Chest Fly']
      setSearchResults(common.filter(e => e.toLowerCase().includes(q.toLowerCase())).map((name, i) => ({ id: `local-${i}`, name })))
    }
    setSearching(false)
  }

  const startWorkout = async (type) => {
    if (!gymId || !memberId) { setPhase('logging'); return }
    try {
      const res = await api.post(`/gyms/${gymId}/members/${memberId}/workout-sessions`, {
        workout_type: type.label, notes: '',
      }, { headers: { Authorization: `Bearer ${token}` } })
      setSessionId(res.data?.session?.id || res.data?.id || null)
    } catch {}
    if (type.exercises.length > 0) {
      setExercises(type.exercises.map((name, i) => ({ id: `preset-${i}`, name })))
    }
    setPhase('logging')
  }

  const addExercise = (ex) => {
    if (!exercises.find(e => e.name === ex.name)) {
      setExercises(prev => [...prev, ex])
    }
    setSearchQuery(''); setSearchResults([])
  }

  const addSet = (exId) => {
    setSets(prev => ({
      ...prev,
      [exId]: [...(prev[exId] || [{ reps: 10, weight: 0 }]), { reps: 10, weight: 0 }]
    }))
  }

  const updateSet = (exId, idx, field, val) => {
    setSets(prev => ({
      ...prev,
      [exId]: (prev[exId] || []).map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }))
  }

  const finishWorkout = async () => {
    setSaving(true)
    try {
      if (sessionId && gymId && memberId) {
        // Log sets for each exercise
        for (const ex of exercises) {
          const exSets = sets[ex.id]
          if (exSets && exSets.length > 0) {
            await api.post(`/gyms/${gymId}/members/${memberId}/workout-sessions/${sessionId}/sets`, {
              exercise_name: ex.name,
              sets: exSets.map(s => ({ reps: parseInt(s.reps) || 0, weight_kg: parseFloat(s.weight) || 0 }))
            }, { headers: { Authorization: `Bearer ${token}` } })
          }
        }
        await api.put(`/gyms/${gymId}/members/${memberId}/workout-sessions/${sessionId}/complete`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch {}
    setSaving(false)
    setPhase('done')
    setTimeout(() => onClose(), 2000)
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: M.card, borderRadius: '24px 24px 0 0',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          border: `1px solid ${M.border}`, borderBottom: 'none',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Handle + Header */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: M.border, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: M.text, fontFamily: FONT }}>
              {phase === 'start' ? 'Log Workout' : phase === 'done' ? 'Workout Done! 🎉' : 'Logging Workout'}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color={M.textSec} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>

          {/* PHASE: START */}
          {phase === 'start' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: M.textSec, margin: '0 0 8px', fontFamily: FONT }}>
                Choose a workout type to get started
              </p>
              {WORKOUT_TYPES.map(t => (
                <button
                  key={t.label}
                  onClick={() => startWorkout(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14,
                    background: M.cardSec, border: `1px solid ${M.border}`,
                    cursor: 'pointer', fontFamily: FONT, textAlign: 'left', width: '100%',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: M.text }}>{t.label}</div>
                    {t.exercises.length > 0 && (
                      <div style={{ fontSize: 11, color: M.textSec, marginTop: 2 }}>
                        {t.exercises.slice(0, 2).join(', ')}{t.exercises.length > 2 ? ' +more' : ''}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* PHASE: LOGGING */}
          {phase === 'logging' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Exercise search */}
              <div style={{ position: 'relative' }}>
                <input
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); searchExercises(e.target.value) }}
                  placeholder="Search exercises to add…"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    background: M.cardSec, border: `1px solid ${M.border}`,
                    color: M.text, fontFamily: FONT, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: M.card, border: `1px solid ${M.border}`, borderRadius: 12, marginTop: 4,
                    overflow: 'hidden',
                  }}>
                    {searchResults.slice(0, 6).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => addExercise(ex)}
                        style={{
                          width: '100%', padding: '10px 14px', textAlign: 'left',
                          background: 'none', border: 'none', cursor: 'pointer',
                          borderBottom: i < searchResults.length - 1 ? `1px solid ${M.border}` : 'none',
                          color: M.text, fontFamily: FONT, fontSize: 13,
                        }}
                      >{ex.name}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Exercise list */}
              {exercises.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: M.textSec, fontFamily: FONT, fontSize: 13 }}>
                  Search for exercises above to add them
                </div>
              )}
              {exercises.map(ex => {
                const exSets = sets[ex.id] || []
                return (
                  <div key={ex.id} style={{ background: M.cardSec, borderRadius: 14, padding: '14px 16px', border: `1px solid ${M.border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: M.text, marginBottom: 10, fontFamily: FONT }}>{ex.name}</div>
                    {/* Set rows */}
                    {exSets.map((set, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: M.textTer, fontFamily: FONT, width: 28 }}>#{idx+1}</span>
                        <input
                          type="number" placeholder="Reps" value={set.reps}
                          onChange={e => updateSet(ex.id, idx, 'reps', e.target.value)}
                          style={{
                            flex: 1, padding: '6px 10px', borderRadius: 8,
                            background: M.card, border: `1px solid ${M.border}`,
                            color: M.text, fontFamily: FONT, fontSize: 13, outline: 'none', textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: 11, color: M.textTer, fontFamily: FONT }}>reps</span>
                        <input
                          type="number" placeholder="kg" value={set.weight || ''}
                          onChange={e => updateSet(ex.id, idx, 'weight', e.target.value)}
                          style={{
                            flex: 1, padding: '6px 10px', borderRadius: 8,
                            background: M.card, border: `1px solid ${M.border}`,
                            color: M.text, fontFamily: FONT, fontSize: 13, outline: 'none', textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: 11, color: M.textTer, fontFamily: FONT }}>kg</span>
                      </div>
                    ))}
                    <button
                      onClick={() => addSet(ex.id)}
                      style={{
                        marginTop: 4, padding: '6px 12px', borderRadius: 8,
                        background: M.accentSoft, border: `1px solid ${M.accent}40`,
                        color: M.accent, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >+ Add Set</button>
                  </div>
                )
              })}

              {exercises.length > 0 && (
                <button
                  onClick={finishWorkout}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 14,
                    background: saving ? M.cardSec : `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
                    border: 'none', color: saving ? M.textSec : '#fff',
                    fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                    fontFamily: FONT, minHeight: 52,
                    boxShadow: saving ? 'none' : `0 4px 20px ${M.accentGlow}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {saving ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${M.textTer}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                      Saving…
                    </>
                  ) : '✓ Finish Workout'}
                </button>
              )}
            </div>
          )}

          {/* PHASE: DONE */}
          {phase === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                background: M.green + '20', border: `2px solid ${M.green}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              }}>💪</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: '0 0 8px', fontFamily: FONT }}>
                Workout Complete!
              </h3>
              <p style={{ fontSize: 13, color: M.textSec, margin: 0, fontFamily: FONT }}>
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} logged. Great work! 🔥
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ────────── HOME TAB ────────── */
function HomeTab({ member, gymId, onTabChange, onVira, onWorkout }) {
  const [checkedInToday, setCheckedInToday] = useState(false)
  const token = localStorage.getItem('ivira_member_token')

  useEffect(() => {
    if (!gymId || !member?.id) return
    const today = new Date().toISOString().split('T')[0]
    api.get(`/gyms/${gymId}/checkins`, {
      params: { memberId: member.id, date: today, limit: 1 },
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const checkins = res.data?.checkins || res.data || []
      setCheckedInToday(checkins.length > 0)
    }).catch(() => {
      // silent fail — default false
    })
  }, [gymId, member?.id, token])

  const goals = [
    { label: 'Check In', done: checkedInToday, icon: Shield },
    { label: 'Workout', done: false, icon: Dumbbell },
    { label: 'Log Meal', done: false, icon: Flame },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StreakBanner member={member} />
      <ViraCard onOpen={onVira} />
      <ActionHub onTabChange={onTabChange} onWorkout={onWorkout} />
      <GoalTracker goals={goals} />
      <UpcomingStrip onSeeAll={() => onTabChange('classes')} gymId={gymId} />
      <AssignedWorkouts gymId={gymId} onWorkout={onWorkout} />
      <TodaysPlanCard onWorkout={onWorkout} />
      <WorkoutHistory gymId={gymId} memberId={member?.id} />
    </div>
  )
}

/* ────────── CLASSES TAB ────────── */
function ClassesTab({ gymId }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bookingClass, setBookingClass] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <DateScroller selectedDate={selectedDate} onSelect={setSelectedDate} />
      <ClassListings date={selectedDate} gymId={gymId} onBook={setBookingClass} />

      {bookingClass && (
        <BookingSheet
          classItem={bookingClass}
          onConfirm={() => setBookingClass(null)}
          onClose={() => setBookingClass(null)}
        />
      )}
    </div>
  )
}

/* ────────── REWARDS TAB ────────── */
function RewardsTab({ member, gymId }) {
  const [section, setSection] = useState('challenges')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Segmented Control */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 14,
        background: M.card, border: `1px solid ${M.border}`,
      }}>
        {[
          { key: 'challenges', label: 'Challenges' },
          { key: 'leaderboard', label: 'Leaderboard' },
          { key: 'perks', label: 'Perks' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: section === s.key ? M.accent : 'transparent',
              border: 'none', color: section === s.key ? '#fff' : M.textSec,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
              transition: 'all 0.2s', minHeight: 40,
            }}
          >{s.label}</button>
        ))}
      </div>

      {section === 'challenges' && <ChallengesSection gymId={gymId} />}
      {section === 'leaderboard' && <LeaderboardSection gymId={gymId} />}
      {section === 'perks' && <RewardsTier member={member} />}
    </div>
  )
}

/* ────────── HEALTH TAB (standalone, no double title) ────────── */
function HealthTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <HealthTracker steps={4230} stepGoal={8000} calories={1450} heartRate={72} weight={75000} />
      <MealLogger todayMeals={[]} />
    </div>
  )
}

/* ────────── PROFILE TAB ────────── */
function ProfileTab({ member, onLogout, onTabChange }) {
  const navigate = useNavigate()
  const menuItems = [
    { label: 'My Bookings', icon: Calendar, desc: 'View all class bookings', action: () => onTabChange('classes') },
    { label: 'Achievements', icon: Trophy, desc: 'Badges & milestones', action: () => onTabChange('rewards') },
    { label: 'Health & Fitness', icon: Activity, desc: 'Steps, calories, workouts', action: () => navigate('/vira') },
    { label: 'Transformation', icon: Camera, desc: 'Progress photos', action: null },
    { label: 'Notifications', icon: Bell, desc: 'Alerts & reminders', action: null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Profile Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '20px', background: M.card, borderRadius: 18,
        border: `1px solid ${M.border}`,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 28px ${M.accentGlow}`,
        }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', fontFamily: FONT }}>
            {(member?.name || 'M')[0].toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: M.text, margin: '0 0 3px', fontFamily: FONT }}>{member?.name || 'Member'}</h2>
          <p style={{ fontSize: 12, color: M.textSec, margin: '0 0 8px', fontFamily: FONT }}>{member?.email || member?.phone || ''}</p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: M.accent + '18', border: `1px solid ${M.accent}30`,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: M.accent }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: M.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {member?.status || 'Active'}
            </span>
          </div>
        </div>
        <ChevronRight size={18} color={M.textTer} />
      </div>

      {/* Membership Card */}
      <MembershipCard member={member} />

      {/* Quick Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, background: M.card, borderRadius: 16,
        padding: 16, border: `1px solid ${M.border}`,
      }}>
        {[
          { label: 'Streak', value: member?.streak || 0, unit: 'days', color: M.accent },
          { label: 'Visits', value: member?.totalCheckins || 0, unit: 'total', color: M.green },
          { label: 'Points', value: ((member?.totalCheckins || 0) * 10 + (member?.referral_bonus || 0)).toLocaleString(), unit: 'pts', color: M.amber },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: FONT }}>{s.value}</div>
            <div style={{ fontSize: 10, color: M.textTer, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 10, color: M.textTer }}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div style={{
        background: M.card, borderRadius: 16,
        border: `1px solid ${M.border}`, overflow: 'hidden',
      }}>
        {menuItems.map((item, i) => (
          <div key={i}
            onClick={item.action}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', cursor: item.action ? 'pointer' : 'default', minHeight: 52,
              borderBottom: i < menuItems.length - 1 ? `1px solid ${M.border}` : 'none',
              transition: 'background 0.15s',
              opacity: item.action ? 1 : 0.5,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: M.cardSec, border: `1px solid ${M.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <item.icon size={16} color={M.textSec} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: M.text, fontWeight: 500, fontFamily: FONT }}>{item.label}</div>
                <div style={{ fontSize: 11, color: M.textTer, fontFamily: FONT }}>{item.desc}</div>
              </div>
            </div>
            <ChevronRight size={15} color={M.textTer} />
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          width: '100%', padding: '14px', borderRadius: 14, marginBottom: 8,
          background: M.red + '12', border: `1px solid ${M.red}28`,
          color: M.red, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          minHeight: 50,
        }}
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  )
}

/* ────────── DESKTOP SIDEBAR ────────── */
function Sidebar({ tabs, activeTab, onTabChange, onCheckin }) {
  return (
    <aside style={{
      width: 240, position: 'fixed', top: 0, left: 0, bottom: 0,
      background: M.card, borderRight: `1px solid ${M.border}`,
      display: 'flex', flexDirection: 'column',
      padding: '24px 0', fontFamily: FONT, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 24px 24px',
        borderBottom: `1px solid ${M.border}`,
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 20, fontWeight: 800, color: M.text,
          letterSpacing: '-0.02em',
        }}>
          <span style={{ opacity: 0.45 }}>I</span><span>VIRA</span>
        </span>
      </div>

      {/* Check-In Button (Desktop) */}
      <div style={{ padding: '0 12px', marginBottom: 16 }}>
        <button
          onClick={onCheckin}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 16px', borderRadius: 14,
            background: `linear-gradient(135deg, ${M.accent}, #9F67FF)`,
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT, minHeight: 48,
            boxShadow: `0 4px 20px ${M.accentGlow}`,
            transition: 'transform 0.2s',
          }}
        >
          <QrCode size={20} />
          Quick Check-In
        </button>
      </div>

      {/* Nav Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 10, width: '100%',
              background: activeTab === key ? M.accentSoft : 'transparent',
              border: activeTab === key ? `1px solid ${M.accent}30` : '1px solid transparent',
              color: activeTab === key ? M.accent : M.textSec,
              cursor: 'pointer', fontFamily: FONT,
              fontSize: 14, fontWeight: activeTab === key ? 600 : 400,
              textAlign: 'left', transition: 'all 0.2s', minHeight: 44,
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

/* ────────── MAIN DASHBOARD ────────── */
export default function MemberDashboard() {
  const [tab, setTab] = useState('home')
  const [member, setMember] = useState(null)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    const token = localStorage.getItem('ivira_member_token')
    if (!token) { navigate('/member/login', { replace: true }); return }
    // Immediately show cached data
    const stored = localStorage.getItem('ivira_member')
    if (stored) setMember(JSON.parse(stored))
    // Then refresh from API in background
    const gymId = localStorage.getItem('ivira_member_gym')
    if (gymId && token) {
      api.get(`/gyms/${gymId}/members/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        const fresh = res.data?.member
        if (fresh) {
          const updated = { ...JSON.parse(stored || '{}'), ...fresh }
          setMember(updated)
          localStorage.setItem('ivira_member', JSON.stringify(updated))
        }
      }).catch(() => {}) // silent fail — cached data still shown
    }
  }, [navigate])

  const gymId = localStorage.getItem('ivira_member_gym')

  const handleLogout = () => {
    localStorage.removeItem('ivira_member_token')
    localStorage.removeItem('ivira_member_gym')
    localStorage.removeItem('ivira_member')
    navigate('/member/login', { replace: true })
  }

  const renderTab = () => {
    switch (tab) {
      case 'home':    return <HomeTab member={member} gymId={gymId} onTabChange={setTab} onVira={() => navigate('/vira')} onWorkout={() => setWorkoutOpen(true)} />
      case 'classes': return <ClassesTab gymId={gymId} />
      case 'rewards': return <RewardsTab member={member} gymId={gymId} />
      case 'profile': return <ProfileTab member={member} onLogout={handleLogout} onTabChange={setTab} />
      default:        return <HomeTab member={member} gymId={gymId} onTabChange={setTab} onVira={() => navigate('/vira')} onWorkout={() => setWorkoutOpen(true)} />
    }
  }

  // Show skeleton while member data loads
  if (!member) {
    return (
      <div style={{ minHeight: '100vh', background: M.bg, display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 16px', fontFamily: FONT }}>
        {/* Skeleton banner */}
        <div style={{ height: 80, borderRadius: 16, background: M.card, border: `1px solid ${M.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
        {/* Skeleton grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 96, borderRadius: 16, background: M.card, border: `1px solid ${M.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        {/* Skeleton strip */}
        <div style={{ height: 120, borderRadius: 16, background: M.card, border: `1px solid ${M.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, fontFamily: FONT,
    }}>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar tabs={TABS} activeTab={tab} onTabChange={setTab} onCheckin={() => setCheckinOpen(true)} />
      )}

      {/* Mobile Top Header */}
      {!isDesktop && <MobileHeader tab={tab} />}

      {/* Content Area */}
      <div style={{
        marginLeft: isDesktop ? 240 : 0,
        paddingTop: isDesktop ? 0 : 56,   // offset for fixed mobile header
        paddingBottom: isDesktop ? 24 : 96,
      }}>
        <div style={{
          padding: '16px',
          maxWidth: isDesktop ? 768 : 480,
          margin: '0 auto',
        }}>
          {renderTab()}
        </div>
      </div>

      {/* Mobile Bottom Nav with FAB */}
      {!isDesktop && (
        <BottomNav
          tabs={TABS}
          activeTab={tab}
          onTabChange={setTab}
          onCheckin={() => setCheckinOpen(true)}
        />
      )}

      {/* Check-In Bottom Sheet */}
      <CheckinSheet
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        gymId={gymId}
        memberId={member?.id}
      />
      <WorkoutSheet
        open={workoutOpen}
        onClose={() => setWorkoutOpen(false)}
        gymId={gymId}
        memberId={member?.id}
      />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
