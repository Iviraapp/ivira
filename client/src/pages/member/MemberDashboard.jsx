import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, ShoppingBag, Heart, User, Camera, ChevronRight, Calendar, Clock,
  LogOut, Trophy, Bell, Shield, Dumbbell, Flame, Star, Target, Zap,
  Award, TrendingUp, ChevronLeft, MapPin, Users, Gift, Crown, X, QrCode,
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

const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'classes', label: 'Classes', icon: Calendar },
  { key: 'rewards', label: 'Rewards', icon: Trophy },
  { key: 'health', label: 'Health', icon: Heart },
  { key: 'profile', label: 'Profile', icon: User },
]

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
function ActionHub({ onTabChange }) {
  const actions = [
    { label: 'Book a Class', icon: Calendar, color: '#10B981', bg: '#10B98118', tab: 'classes' },
    { label: 'Find a Trainer', icon: Users, color: '#34A853', bg: '#34A85318', tab: 'classes' },
    { label: 'My Workouts', icon: Dumbbell, color: '#FBBC05', bg: '#FBBC0518', tab: 'health' },
    { label: 'Join a Challenge', icon: Target, color: '#EA4335', bg: '#EA433518', tab: 'rewards' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onTabChange(a.tab)}
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
  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: '16px 20px',
      border: `1px solid ${M.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <p style={{ fontSize: 13, color: M.textSec, margin: '0 0 2px', fontFamily: FONT }}>Welcome back,</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: 0, fontFamily: FONT }}>
          {member?.name || 'Member'}
        </h2>
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: M.accent, fontFamily: FONT_M }}>{member?.streak || 0}</div>
          <div style={{ fontSize: 10, color: M.textTer, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</div>
        </div>
        <div style={{ width: 1, height: 32, background: M.border }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: M.green, fontFamily: FONT_M }}>{member?.totalCheckins || 0}</div>
          <div style={{ fontSize: 10, color: M.textTer, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visits</div>
        </div>
      </div>
    </div>
  )
}

/* ────────── UPCOMING CLASSES STRIP ────────── */
function UpcomingStrip() {
  const classes = [
    { name: 'HIIT Burn', time: '6:30 AM', trainer: 'Rahul K.', spots: 3 },
    { name: 'Yoga Flow', time: '7:30 AM', trainer: 'Priya S.', spots: 8 },
    { name: 'Boxing', time: '8:00 AM', trainer: 'Vikram R.', spots: 1 },
  ]

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: '16px 0 16px 20px',
      border: `1px solid ${M.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text, fontFamily: FONT }}>Today's Classes</span>
        <span style={{ fontSize: 12, color: M.accent, fontWeight: 500, cursor: 'pointer', fontFamily: FONT }}>See All</span>
      </div>
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

/* ────────── CLASS LISTINGS ────────── */
function ClassListings({ date }) {
  const classes = [
    { name: 'Morning HIIT', time: '6:30 AM', trainer: 'Rahul K.', duration: '45 min', spots: 3, intensity: 'High' },
    { name: 'Yoga Flow', time: '7:30 AM', trainer: 'Priya S.', duration: '60 min', spots: 8, intensity: 'Low' },
    { name: 'Spin Cycle', time: '8:30 AM', trainer: 'Anjali M.', duration: '40 min', spots: 5, intensity: 'High' },
    { name: 'Strength Training', time: '10:00 AM', trainer: 'Arjun P.', duration: '50 min', spots: 12, intensity: 'Med' },
    { name: 'Boxing Basics', time: '5:00 PM', trainer: 'Vikram R.', duration: '45 min', spots: 1, intensity: 'High' },
    { name: 'Pilates', time: '6:30 PM', trainer: 'Dr. Suresh', duration: '55 min', spots: 10, intensity: 'Low' },
  ]

  const intensityColor = { High: M.red, Med: M.amber, Low: M.green }

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
            <button style={{
              padding: '8px 16px', borderRadius: 10,
              background: c.spots <= 3 ? M.accent : M.accentSoft,
              border: `1px solid ${c.spots <= 3 ? M.accent : M.accent + '40'}`,
              color: c.spots <= 3 ? '#fff' : M.accent,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
              minHeight: 36, minWidth: 64,
            }}>
              {c.spots <= 3 ? `${c.spots} left` : 'Book'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ────────── CHALLENGES ────────── */
function ChallengesSection() {
  const challenges = [
    { title: '30-Day Streak', desc: 'Check in every day for 30 days', progress: 0.4, reward: '500 pts', icon: Zap, color: M.accent },
    { title: 'Class Explorer', desc: 'Try 5 different class types', progress: 0.6, reward: '300 pts', icon: Star, color: M.amber },
    { title: '10K Steps Daily', desc: 'Hit 10K steps for 7 days straight', progress: 0.28, reward: '200 pts', icon: TrendingUp, color: M.green },
    { title: 'Social Butterfly', desc: 'Refer 3 friends who join', progress: 0.33, reward: '1000 pts', icon: Users, color: '#E040FB' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

/* ────────── HOME TAB ────────── */
function HomeTab({ member, gymId, onTabChange }) {
  const goals = [
    { label: 'Check In', done: true, icon: Shield },
    { label: 'Workout', done: false, icon: Dumbbell },
    { label: 'Log Meal', done: false, icon: Flame },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StreakBanner member={member} />
      <ActionHub onTabChange={onTabChange} />
      <GoalTracker goals={goals} />
      <UpcomingStrip />
    </div>
  )
}

/* ────────── CLASSES TAB ────────── */
function ClassesTab() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: 0, fontFamily: FONT }}>Classes</h2>
      <DateScroller selectedDate={selectedDate} onSelect={setSelectedDate} />
      <ClassListings date={selectedDate} />
    </div>
  )
}

/* ────────── REWARDS TAB ────────── */
function RewardsTab({ member }) {
  const [section, setSection] = useState('challenges')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: 0, fontFamily: FONT }}>Rewards</h2>

      {/* Segmented Control */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 14,
        background: M.card, border: `1px solid ${M.border}`,
      }}>
        {[
          { key: 'challenges', label: 'Challenges' },
          { key: 'perks', label: 'Perks & Tiers' },
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

      {section === 'challenges' ? <ChallengesSection /> : <RewardsTier member={member} />}
    </div>
  )
}

/* ────────── HEALTH TAB ────────── */
function HealthTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: 0, fontFamily: FONT }}>Health</h2>
      <HealthTracker steps={4230} stepGoal={8000} calories={1450} heartRate={72} weight={75000} />
      <MealLogger todayMeals={[]} />
    </div>
  )
}

/* ────────── PROFILE TAB ────────── */
function ProfileTab({ member, onLogout }) {
  const menuItems = [
    { label: 'My Bookings', icon: Calendar },
    { label: 'Achievements', icon: Trophy },
    { label: 'Notifications', icon: Bell },
    { label: 'Transformation', icon: Camera },
  ]

  return (
    <div>
      {/* Profile Header */}
      <div style={{
        textAlign: 'center', padding: '24px 20px',
        background: M.card, borderRadius: 16, border: `1px solid ${M.border}`,
        marginBottom: 14,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `linear-gradient(135deg, ${M.accent}, #3B6FD4)`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12, boxShadow: `0 0 30px ${M.accentGlow}`,
        }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
            {(member?.name || 'M')[0]}
          </span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: M.text, margin: '0 0 4px' }}>{member?.name || 'Member'}</h2>
        <p style={{ fontSize: 13, color: M.textSec, margin: 0 }}>{member?.phone || ''}</p>
        <div style={{
          display: 'inline-block', marginTop: 8, padding: '4px 12px',
          borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: member?.status === 'active' ? M.green + '18' : M.red + '18',
          color: member?.status === 'active' ? M.green : M.red,
          textTransform: 'uppercase',
        }}>{member?.status || 'active'}</div>
      </div>

      {/* Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {menuItems.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: M.card, borderRadius: 12,
            border: `1px solid ${M.border}`, cursor: 'pointer', minHeight: 48,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <item.icon size={18} color={M.textSec} />
              <span style={{ fontSize: 14, color: M.text, fontWeight: 500 }}>{item.label}</span>
            </div>
            <ChevronRight size={16} color={M.textTer} />
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, marginTop: 24,
          background: M.red + '15', border: `1px solid ${M.red}30`,
          color: M.red, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          minHeight: 48,
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
          I V I R A
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
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    const token = localStorage.getItem('ivira_member_token')
    if (!token) { navigate('/member/login', { replace: true }); return }
    const stored = localStorage.getItem('ivira_member')
    if (stored) setMember(JSON.parse(stored))
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
      case 'home': return <HomeTab member={member} gymId={gymId} onTabChange={setTab} />
      case 'classes': return <ClassesTab />
      case 'rewards': return <RewardsTab member={member} />
      case 'health': return <HealthTab />
      case 'profile': return <ProfileTab member={member} onLogout={handleLogout} />
      default: return <HomeTab member={member} gymId={gymId} onTabChange={setTab} />
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.bg, fontFamily: FONT,
    }}>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar tabs={TABS} activeTab={tab} onTabChange={setTab} onCheckin={() => setCheckinOpen(true)} />
      )}

      {/* Content Area */}
      <div style={{
        marginLeft: isDesktop ? 240 : 0,
        paddingBottom: isDesktop ? 0 : 90,
      }}>
        <div style={{
          padding: '16px 16px 0',
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

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
