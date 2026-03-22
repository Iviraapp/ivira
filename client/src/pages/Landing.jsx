import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'

// ── IVIRA Brand Tokens ──────────────────────────────────────
const MATTE_BLACK  = '#0A0A0A'
const CARBON       = '#141414'
const GRAPHITE     = '#1C1C1E'
const CRIMSON      = '#DC2626'
const CRIMSON_DARK = '#991B1B'
const CRIMSON_GLOW = 'rgba(220,38,38,0.15)'
const PLATINUM     = '#E5E5E5'
const SILVER       = '#9CA3AF'
const GUNMETAL     = '#374151'
const WHITE        = '#FFFFFF'

const FONT_DISPLAY = "'Barlow Condensed', 'Inter', sans-serif"
const FONT_BODY    = "'Inter', -apple-system, sans-serif"

// ── Scroll Reveal Hook ───────────────────────────────────────
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ── Animated Counter Hook ────────────────────────────────────
function useCounter(target, duration = 2000, trigger = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, trigger])
  return count
}

// ── Section Wrapper ──────────────────────────────────────────
function Section({ children, style, delay = 0 }) {
  const [ref, vis] = useScrollReveal()
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(40px)',
      transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Icon Components (inline SVG) ─────────────────────────────
const icons = {
  members: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  qr: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="21" y2="21"/></svg>,
  payment: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  whatsapp: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  staff: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  classes: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  analytics: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  plans: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  ai: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  daypass: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
  nutrition: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  steps: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
  workout: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11"/><path d="M21 3l-6.5 6.5"/><path d="M3 21l6.5-6.5"/><path d="M18 3l3 3"/><path d="M3 18l3 3"/></svg>,
  fasting: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  trophy: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>,
  badge: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/></svg>,
  trainer: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  marketplace: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  newsletter: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  affiliate: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  check: (c = CRIMSON) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  portal: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  revenue: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
  shield: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  brain: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>,
  zap: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
  target: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  clock: (c = CRIMSON) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
}

// ── Data ─────────────────────────────────────────────────────
const ownerFeatures = [
  { icon: 'members', title: 'MEMBER MANAGEMENT', desc: 'Add, search, and track 100 to 2,000 athletes with detailed profiles and membership telemetry.' },
  { icon: 'qr', title: 'QR + OTP CHECK-INS', desc: 'GPS-validated check-ins within 150m radius. Athletes scan QR or enter OTP at the gate.' },
  { icon: 'payment', title: 'PAYMENT & BILLING', desc: 'Razorpay-powered payments with auto-invoicing, renewal alerts, and complete revenue tracking.' },
  { icon: 'whatsapp', title: 'WHATSAPP NOTIFICATIONS', desc: 'Automated reminders for dues, renewals, and announcements sent directly via WhatsApp.' },
  { icon: 'staff', title: 'STAFF MANAGEMENT', desc: 'Manage trainers, track staff attendance, assign roles, and monitor performance metrics.' },
  { icon: 'classes', title: 'CLASSES & SCHEDULING', desc: 'Create group classes, manage bookings, set capacity limits, and handle recurring schedules.' },
  { icon: 'analytics', title: 'ANALYTICS DASHBOARD', desc: 'Revenue trends, member retention rates, churn scoring, and actionable business intelligence.' },
  { icon: 'plans', title: 'MEMBERSHIP PLANS', desc: 'Flexible monthly, quarterly, and annual plans with auto-renewal and upgrade paths.' },
  { icon: 'ai', title: 'AI COACH', desc: 'Built-in AI that provides nutrition guidance and workout recommendations to your athletes.' },
  { icon: 'marketplace', title: 'MARKETPLACE', desc: 'Showcase trainer profiles and services. Let members book sessions and diet plans online.' },
  { icon: 'newsletter', title: 'NEWSLETTER & CAMPAIGNS', desc: 'Send targeted email campaigns, promotions, and updates to keep athletes engaged.' },
  { icon: 'affiliate', title: 'AFFILIATE STORE', desc: 'Earn commissions by partnering with supplement and fitness brands through our marketplace.' },
]

const seekerFeatures = [
  { icon: 'search', title: 'GYMFINDER', desc: 'Discover arenas nearby with ratings, amenities, photos, and real-time availability.' },
  { icon: 'daypass', title: 'DAY PASS BOOKING', desc: 'Walk into any partner arena and pay per visit. No long-term commitment required.' },
  { icon: 'portal', title: 'MEMBER PORTAL', desc: 'View your membership details, payment history, and check-in records in one place.' },
  { icon: 'nutrition', title: 'NUTRITION TRACKING', desc: 'Log meals, set calorie goals, track macros, and get personalized diet protocols.' },
  { icon: 'steps', title: 'STEP COUNTER', desc: 'Sync with Apple Health or Google Fit to track daily steps and activity levels.' },
  { icon: 'workout', title: 'WORKOUT LOGGING', desc: 'Track exercises, sets, reps, and personal records. Build streaks and stay relentless.' },
  { icon: 'fasting', title: 'FASTING TRACKER', desc: 'Monitor intermittent fasting windows with timers, history, and streak tracking.' },
  { icon: 'ai', title: 'AI FITNESS COACH', desc: 'Chat with an AI coach for workout plans, nutrition advice, and performance guidance.' },
  { icon: 'trophy', title: 'LEADERBOARDS & CHALLENGES', desc: 'Compete with other athletes on steps, workouts, and arena check-ins.' },
  { icon: 'badge', title: 'ACHIEVEMENTS & BADGES', desc: 'Earn badges for milestones, streaks, and challenges. Gamify your performance journey.' },
  { icon: 'trainer', title: 'TRAINER BOOKING', desc: 'Browse certified trainers, book personal training sessions, and get custom protocols.' },
]

const bentoCards = [
  { key: 'realtime', title: 'REAL-TIME ANALYTICS', desc: 'Live dashboard with member activity, revenue streams, and operational metrics updated every second.', icon: 'analytics', span: 2 },
  { key: 'revenue', title: 'REVENUE TRACKING', desc: 'Every transaction mapped, every trend surfaced. Know your numbers before they matter.', icon: 'revenue', span: 1 },
  { key: 'churn', title: 'CHURN PREDICTION', desc: 'AI-powered early warning system identifies at-risk members before they leave.', icon: 'shield', span: 1 },
  { key: 'retention', title: 'MEMBER RETENTION', desc: 'Engagement scoring and automated re-activation campaigns.', icon: 'target', span: 1 },
  { key: 'attendance', title: 'ATTENDANCE PATTERNS', desc: 'Heat maps of peak hours, seasonal trends, and capacity optimization.', icon: 'clock', span: 1 },
  { key: 'aiinsights', title: 'AI INSIGHTS', desc: 'Machine learning models that surface opportunities hidden in your data.', icon: 'brain', span: 1 },
  { key: 'velocity', title: 'PAYMENT VELOCITY', desc: 'Track collection speed, outstanding dues, and cash flow projections.', icon: 'zap', span: 1 },
]

// ── Geo-Based Pricing ───────────────────────────────────────
const GEO_PRICING = {
  IN: { symbol: '\u20B9', starter: '12,000', growth: '24,000', pro: '48,000', label: 'INR' },
  US: { symbol: '$', starter: '149', growth: '299', pro: '599', label: 'USD' },
  GB: { symbol: '\u00A3', starter: '119', growth: '239', pro: '479', label: 'GBP' },
  AE: { symbol: 'AED ', starter: '549', growth: '1,099', pro: '2,199', label: 'AED' },
  SG: { symbol: 'S$', starter: '199', growth: '399', pro: '799', label: 'SGD' },
  AU: { symbol: 'A$', starter: '229', growth: '459', pro: '899', label: 'AUD' },
  CA: { symbol: 'C$', starter: '199', growth: '399', pro: '799', label: 'CAD' },
  DEFAULT: { symbol: '$', starter: '149', growth: '299', pro: '599', label: 'USD' },
}

const TZ_TO_COUNTRY = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Colombo': 'IN',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'Europe/London': 'GB', 'Europe/Belfast': 'GB',
  'Asia/Dubai': 'AE', 'Asia/Muscat': 'AE',
  'Asia/Singapore': 'SG',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
}

function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_TO_COUNTRY[tz] || 'DEFAULT'
  } catch { return 'DEFAULT' }
}

function useGeoPricing() {
  const [geo, setGeo] = useState(() => detectCountry())
  const p = GEO_PRICING[geo] || GEO_PRICING.DEFAULT
  return {
    geo, setGeo, pricing: p,
    plans: [
      {
        name: 'STARTER', price: p.starter, period: '/year', members: 'Up to 100 athletes', best: false,
        features: ['Member management', 'QR + OTP check-ins', 'Payment collection', 'WhatsApp notifications', 'Basic analytics', 'Email support'],
      },
      {
        name: 'GROWTH', price: p.growth, period: '/year', members: 'Up to 500 athletes', best: true,
        features: ['Everything in Starter', 'Staff management', 'Classes & scheduling', 'Advanced analytics', 'AI Coach for athletes', 'Newsletter campaigns', 'Priority support'],
      },
      {
        name: 'PRO', price: p.pro, period: '/year', members: 'Up to 2,000 athletes', best: false,
        features: ['Everything in Growth', 'Marketplace & bookings', 'Affiliate store', 'Churn prediction', 'Custom branding', 'API access', 'Dedicated account manager'],
      },
    ],
    regions: Object.keys(GEO_PRICING).filter(k => k !== 'DEFAULT'),
  }
}

// ── Carbon Fiber Pattern ─────────────────────────────────────
const carbonFiberBg = {
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.015) 2px,
      rgba(255,255,255,0.015) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.01) 2px,
      rgba(255,255,255,0.01) 4px
    )
  `,
}

// ── Shared Styles ────────────────────────────────────────────
const sectionLabel = {
  fontFamily: FONT_DISPLAY,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.3em',
  color: CRIMSON,
  textTransform: 'uppercase',
  marginBottom: 16,
}

const sectionHeading = {
  fontFamily: FONT_DISPLAY,
  fontSize: 'clamp(32px, 5vw, 56px)',
  fontWeight: 700,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: PLATINUM,
  lineHeight: 1.1,
  margin: 0,
  marginBottom: 24,
}

const containerStyle = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 24px',
}

// ── Mobile Detection ────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent)
  )
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

// ── Gym Owner Sign-Up Modal ────────────────────────────────
function GymSignUpModal({ open, onClose }) {
  const [form, setForm] = useState({ gymName: '', ownerName: '', email: '', phone: '', city: '', memberCount: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('https://api.ivira.app/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'landing_gym_signup', type: 'gym_owner' }),
      }).catch(() => {})
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldStyle = {
    width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: FONT_BODY,
    background: CARBON, color: PLATINUM, border: `1px solid ${GUNMETAL}`,
    borderRadius: 4, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 600,
    letterSpacing: '0.2em', textTransform: 'uppercase', color: SILVER,
    marginBottom: 6, display: 'block',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: MATTE_BLACK, border: `1px solid ${GUNMETAL}`,
        borderRadius: 8, width: '100%', maxWidth: 520, maxHeight: '90vh',
        overflow: 'auto', padding: 40,
      }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
            <h3 style={{
              fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: WHITE, marginBottom: 12,
            }}>APPLICATION RECEIVED</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: SILVER, lineHeight: 1.6 }}>
              Our team will review your application and contact you within 24 hours to set up your IVIRA Command Center.
            </p>
            <button onClick={onClose} style={{
              fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              background: CRIMSON, color: WHITE, border: 'none', borderRadius: 4,
              padding: '14px 32px', cursor: 'pointer', marginTop: 24,
            }}>CLOSE</button>
          </div>
        ) : (
          <>
            <div style={{ borderLeft: `3px solid ${CRIMSON}`, paddingLeft: 16, marginBottom: 32 }}>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: WHITE, margin: 0,
              }}>REGISTER YOUR FACILITY</h3>
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: SILVER, margin: '8px 0 0' }}>
                Submit your details and our team will onboard you within 24 hours.
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>GYM / FACILITY NAME *</label>
                  <input required style={fieldStyle} value={form.gymName}
                    onChange={e => setForm(f => ({ ...f, gymName: e.target.value }))}
                    placeholder="Iron Pulse Fitness" />
                </div>
                <div>
                  <label style={labelStyle}>OWNER NAME *</label>
                  <input required style={fieldStyle} value={form.ownerName}
                    onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                    placeholder="Your full name" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>EMAIL *</label>
                  <input required type="email" style={fieldStyle} value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@gym.com" />
                </div>
                <div>
                  <label style={labelStyle}>PHONE *</label>
                  <input required type="tel" style={fieldStyle} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 9876543210" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>CITY *</label>
                  <select required style={{ ...fieldStyle, cursor: 'pointer' }} value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
                    <option value="">Select city</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi NCR</option>
                    <option value="Pune">Pune</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>MEMBER COUNT</label>
                  <select style={{ ...fieldStyle, cursor: 'pointer' }} value={form.memberCount}
                    onChange={e => setForm(f => ({ ...f, memberCount: e.target.value }))}>
                    <option value="">Select range</option>
                    <option value="1-50">1 - 50</option>
                    <option value="51-100">51 - 100</option>
                    <option value="101-500">101 - 500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>ANYTHING ELSE?</label>
                <textarea style={{ ...fieldStyle, minHeight: 70, resize: 'vertical' }} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your facility, equipment, specialties..." />
              </div>
              <button type="submit" disabled={submitting} style={{
                fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                background: submitting ? GUNMETAL : CRIMSON, color: WHITE,
                border: 'none', borderRadius: 4, padding: '16px 32px',
                cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
                marginTop: 8,
              }}>
                {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showGymSignUp, setShowGymSignUp] = useState(false)
  const [heroRef, heroVisible] = useScrollReveal(0.1)

  const arenas = useCounter(5000, 2200, heroVisible)
  const athletes = useCounter(100, 2200, heroVisible)
  const cities = useCounter(4, 1500, heroVisible)

  const { geo, setGeo, pricing, plans, regions } = useGeoPricing()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const conciergeCards = [
    { title: 'MMA / COMBAT', desc: 'From octagon cages to Muay Thai rings. Find elite combat training facilities with world-class coaches and competitive sparring partners.' },
    { title: 'YOGA / WELLNESS', desc: 'Tranquil sanctuaries for mindful practice. Hot yoga studios, meditation centers, and holistic wellness retreats curated for the discerning practitioner.' },
    { title: 'BOXING / STRENGTH', desc: 'Raw iron and heavy bags. Powerlifting platforms, Olympic lifting zones, and boxing gyms where champions are forged.' },
  ]

  return (
    <div style={{ background: MATTE_BLACK, color: PLATINUM, fontFamily: FONT_BODY, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── STICKY NAV ──────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${GUNMETAL}33` : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <div style={{
          ...containerStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 72,
        }}>
          {/* Wordmark */}
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700,
            letterSpacing: '0.35em', color: WHITE, textDecoration: 'none',
            textTransform: 'uppercase',
          }}>
            IVIRA
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}
               className="nav-desktop">
            {[
              { label: 'FEATURES', href: '#features' },
              { label: 'PRICING', href: '#pricing' },
              { label: 'CONTACT', href: '/contact' },
            ].map(link => (
              <a key={link.label} href={link.href} style={{
                fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 500,
                letterSpacing: '0.2em', color: SILVER, textDecoration: 'none',
                textTransform: 'uppercase', transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.target.style.color = WHITE}
              onMouseLeave={e => e.target.style.color = SILVER}>
                {link.label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}
               className="nav-ctas">
            <button onClick={() => navigate('/login')} style={{
              fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              background: 'transparent', color: PLATINUM,
              border: `1px solid ${GUNMETAL}`, borderRadius: 4,
              padding: '10px 20px', cursor: 'pointer', transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = CRIMSON; e.target.style.color = WHITE }}
            onMouseLeave={e => { e.target.style.borderColor = GUNMETAL; e.target.style.color = PLATINUM }}>
              COMMAND CENTER
            </button>
            <button onClick={() => navigate('/find-gym')} style={{
              fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              background: CRIMSON, color: WHITE,
              border: `1px solid ${CRIMSON}`, borderRadius: 4,
              padding: '10px 20px', cursor: 'pointer', transition: 'all 0.3s',
            }}
            onMouseEnter={e => e.target.style.background = CRIMSON_DARK}
            onMouseLeave={e => e.target.style.background = CRIMSON}>
              FIND YOUR ARENA
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileMenu(!mobileMenu)} style={{
            display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8,
          }} className="mobile-toggle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2">
              {mobileMenu
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div style={{
            background: CARBON, borderTop: `1px solid ${GUNMETAL}33`,
            padding: '24px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <a href="#features" onClick={() => setMobileMenu(false)} style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: '0.2em', color: SILVER, textDecoration: 'none', textTransform: 'uppercase' }}>FEATURES</a>
              <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: '0.2em', color: SILVER, textDecoration: 'none', textTransform: 'uppercase' }}>PRICING</a>
              <Link to="/contact" onClick={() => setMobileMenu(false)} style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: '0.2em', color: SILVER, textDecoration: 'none', textTransform: 'uppercase' }}>CONTACT</Link>
              <div style={{ borderTop: `1px solid ${GUNMETAL}33`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => { navigate('/login'); setMobileMenu(false) }} style={{
                  fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: 'transparent', color: PLATINUM, border: `1px solid ${GUNMETAL}`, borderRadius: 4,
                  padding: '12px 20px', cursor: 'pointer', width: '100%',
                }}>COMMAND CENTER</button>
                <button onClick={() => { navigate('/find-gym'); setMobileMenu(false) }} style={{
                  fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: CRIMSON, color: WHITE, border: `1px solid ${CRIMSON}`, borderRadius: 4,
                  padding: '12px 20px', cursor: 'pointer', width: '100%',
                }}>FIND YOUR ARENA</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        position: 'relative', padding: '120px 24px 80px',
        background: MATTE_BLACK, ...carbonFiberBg,
      }}>
        {/* Subtle gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${CRIMSON_GLOW}, transparent 70%)`,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
          <div style={{
            ...sectionLabel, marginBottom: 32,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.2s',
          }}>
            THE OPERATING SYSTEM FOR ELITE FITNESS
          </div>

          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(48px, 10vw, 120px)',
            fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: WHITE, lineHeight: 0.95, margin: 0, marginBottom: 32,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s ease 0.4s',
          }}>
            ENGINEERED<br />FOR<br />PERFORMANCE
          </h1>

          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(16px, 2vw, 20px)',
            color: SILVER, lineHeight: 1.7, maxWidth: 640, margin: '0 auto 48px',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.6s',
          }}>
            Built for gym owners who demand precision.<br />
            Designed for athletes who settle for nothing less.
          </p>

          <div style={{
            display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.8s',
          }}>
            {isMobile ? (
              /* ── MOBILE: Primary = Download App, Secondary = Find Gym ── */
              <>
                <button onClick={() => {
                  const el = document.getElementById('download')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }} style={{
                  fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: CRIMSON, color: WHITE, border: 'none', borderRadius: 4,
                  padding: '16px 40px', cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  DOWNLOAD THE APP
                </button>
                <button onClick={() => navigate('/find-gym')} style={{
                  fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: 'transparent', color: WHITE,
                  border: `1px solid ${GUNMETAL}`, borderRadius: 4,
                  padding: '16px 40px', cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  FIND A GYM NEAR YOU
                </button>
              </>
            ) : (
              /* ── DESKTOP: Primary = Gym Owner Sign-Up, Secondary = Explore ── */
              <>
                <button onClick={() => setShowGymSignUp(true)} style={{
                  fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: CRIMSON, color: WHITE, border: 'none', borderRadius: 4,
                  padding: '16px 40px', cursor: 'pointer', transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.target.style.background = CRIMSON_DARK; e.target.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.target.style.background = CRIMSON; e.target.style.transform = 'translateY(0)' }}>
                  I OWN A GYM
                </button>
                <button onClick={() => navigate('/find-gym')} style={{
                  fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: 'transparent', color: WHITE,
                  border: `1px solid ${GUNMETAL}`, borderRadius: 4,
                  padding: '16px 40px', cursor: 'pointer', transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = CRIMSON; e.target.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.target.style.borderColor = GUNMETAL; e.target.style.transform = 'translateY(0)' }}>
                  EXPLORE THE ARENA
                </button>
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 6vw, 80px)',
            marginTop: 80,
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 1.2s',
          }}>
            {[
              { value: `${arenas.toLocaleString()}+`, label: 'ARENAS' },
              { value: `${athletes}K+`, label: 'ATHLETES' },
              { value: cities, label: 'CITIES' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px, 4vw, 48px)',
                  fontWeight: 700, color: WHITE, letterSpacing: '0.1em',
                }}>{stat.value}</div>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 500,
                  letterSpacing: '0.3em', color: SILVER, marginTop: 8,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          opacity: heroVisible ? 0.4 : 0, transition: 'opacity 1s ease 1.5s',
        }}>
          <div style={{
            width: 1, height: 48, background: `linear-gradient(${GUNMETAL}, transparent)`,
            margin: '0 auto',
            animation: 'pulse 2s infinite',
          }} />
        </div>
      </section>

      {/* ── BENTO TELEMETRY ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 0', background: MATTE_BLACK }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={sectionLabel}>INTELLIGENCE LAYER</div>
              <h2 style={sectionHeading}>PERFORMANCE TELEMETRY</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: SILVER, maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Every metric, every pattern, every insight — rendered in real time.
                Your arena's vital signs, always visible.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }} className="bento-grid">
              {bentoCards.map((card, i) => (
                <Section key={card.key} delay={i * 0.08}>
                  <div style={{
                    gridColumn: card.span === 2 ? 'span 2' : 'span 1',
                    background: CARBON,
                    borderRadius: 8,
                    padding: 'clamp(24px, 3vw, 36px)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 180,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    border: `1px solid ${GUNMETAL}22`,
                    transition: 'border-color 0.3s, transform 0.3s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${CRIMSON}44`; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${GUNMETAL}22`; e.currentTarget.style.transform = 'translateY(0)' }}>
                    {/* Crimson accent line */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, ${CRIMSON}, transparent)`,
                    }} />
                    <div style={{ marginBottom: 16, opacity: 0.7 }}>
                      {icons[card.icon] && icons[card.icon](CRIMSON)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: WHITE, margin: 0, marginBottom: 10,
                    }}>{card.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 14, color: SILVER,
                      lineHeight: 1.6, margin: 0,
                    }}>{card.desc}</p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── COMMAND CENTER (Owner Features) ─────────────────── */}
      <section id="features" style={{ padding: 'clamp(60px, 10vw, 120px) 0', background: CARBON, ...carbonFiberBg }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={sectionLabel}>FOR GYM OWNERS</div>
              <h2 style={sectionHeading}>THE COMMAND CENTER</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: SILVER, maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Total operational control. Every tool a gym owner needs,
                precision-engineered into a single cockpit.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {ownerFeatures.map((feat, i) => (
                <Section key={feat.icon + i} delay={i * 0.05}>
                  <div style={{
                    background: GRAPHITE, borderRadius: 8, padding: 28,
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${GUNMETAL}22`,
                    transition: 'border-color 0.3s, transform 0.3s',
                    height: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${CRIMSON}44`; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${GUNMETAL}22`; e.currentTarget.style.transform = 'translateY(0)' }}>
                    {/* Crimson top border */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: 48, height: 2,
                      background: CRIMSON,
                    }} />
                    <div style={{ marginBottom: 16 }}>
                      {icons[feat.icon] && icons[feat.icon](CRIMSON)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: WHITE, margin: 0, marginBottom: 10,
                    }}>{feat.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 14, color: SILVER,
                      lineHeight: 1.6, margin: 0,
                    }}>{feat.desc}</p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── PERFORMANCE SUITE (Seeker Features) ────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 0', background: GRAPHITE }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={sectionLabel}>FOR FITNESS SEEKERS</div>
              <h2 style={sectionHeading}>YOUR PERFORMANCE SUITE</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: SILVER, maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Every tool an athlete needs to train smarter, track progress,
                and push beyond limits.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {seekerFeatures.map((feat, i) => (
                <Section key={feat.icon + i} delay={i * 0.05}>
                  <div style={{
                    background: CARBON, borderRadius: 8, padding: 28,
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${GUNMETAL}22`,
                    transition: 'border-color 0.3s, transform 0.3s',
                    height: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${CRIMSON}44`; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${GUNMETAL}22`; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: 48, height: 2,
                      background: CRIMSON,
                    }} />
                    <div style={{ marginBottom: 16 }}>
                      {icons[feat.icon] && icons[feat.icon](CRIMSON)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: WHITE, margin: 0, marginBottom: 10,
                    }}>{feat.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 14, color: SILVER,
                      lineHeight: 1.6, margin: 0,
                    }}>{feat.desc}</p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── CONCIERGE ───────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(60px, 10vw, 120px) 0',
        background: MATTE_BLACK, ...carbonFiberBg,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${CRIMSON_GLOW}, transparent 60%)`,
        }} />
        <Section>
          <div style={{ ...containerStyle, position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={sectionLabel}>BESPOKE MATCHING</div>
              <h2 style={sectionHeading}>ELITE TRAINING CONCIERGE</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: SILVER, maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
                From MMA cages to yoga sanctuaries, from boxing rings to CrossFit boxes
                — our concierge finds the perfect training facility for your discipline.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
            }}>
              {conciergeCards.map((card, i) => (
                <Section key={card.title} delay={i * 0.12}>
                  <div style={{
                    background: CARBON, borderRadius: 8,
                    padding: 40, textAlign: 'center',
                    border: `1px solid ${GUNMETAL}22`,
                    position: 'relative', overflow: 'hidden',
                    transition: 'border-color 0.3s, transform 0.3s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${CRIMSON}44`; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${GUNMETAL}22`; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, transparent, ${CRIMSON}, transparent)`,
                    }} />
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: CRIMSON_GLOW, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 24px',
                    }}>
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800,
                        color: CRIMSON, letterSpacing: '0.1em',
                      }}>{i === 0 ? 'I' : i === 1 ? 'II' : 'III'}</div>
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
                      letterSpacing: '0.25em', textTransform: 'uppercase',
                      color: WHITE, margin: 0, marginBottom: 16,
                    }}>{card.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 15, color: SILVER,
                      lineHeight: 1.7, margin: 0,
                    }}>{card.desc}</p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: 'clamp(60px, 10vw, 120px) 0', background: CARBON }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={sectionLabel}>INVESTMENT</div>
              <h2 style={sectionHeading}>SELECT YOUR TIER</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: SILVER, maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
                Precision pricing for every scale of operation. All plans billed annually.
              </p>

              {/* Region Selector */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 48 }}>
                {regions.map(r => (
                  <button key={r} onClick={() => setGeo(r)} style={{
                    fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    background: geo === r ? CRIMSON : 'transparent',
                    color: geo === r ? WHITE : SILVER,
                    border: `1px solid ${geo === r ? CRIMSON : GUNMETAL}`,
                    borderRadius: 4, padding: '8px 16px', cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={e => { if (geo !== r) { e.target.style.borderColor = CRIMSON; e.target.style.color = WHITE } }}
                  onMouseLeave={e => { if (geo !== r) { e.target.style.borderColor = GUNMETAL; e.target.style.color = SILVER } }}>
                    {GEO_PRICING[r]?.label || r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24, alignItems: 'stretch',
            }}>
              {plans.map((plan, i) => (
                <Section key={plan.name} delay={i * 0.1}>
                  <div style={{
                    background: GRAPHITE, borderRadius: 8, padding: 40,
                    position: 'relative', overflow: 'hidden',
                    border: plan.best ? `1px solid ${CRIMSON}66` : `1px solid ${GUNMETAL}33`,
                    transition: 'border-color 0.3s, transform 0.3s',
                    height: '100%', display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                    {/* Top accent */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: plan.best ? CRIMSON : `${GUNMETAL}66`,
                    }} />

                    {plan.best && (
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.3em', textTransform: 'uppercase',
                        color: CRIMSON, marginBottom: 16,
                      }}>RECOMMENDED</div>
                    )}

                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                      letterSpacing: '0.25em', textTransform: 'uppercase',
                      color: WHITE, margin: 0, marginBottom: 8,
                    }}>{plan.name}</h3>

                    <div style={{
                      fontFamily: FONT_BODY, fontSize: 13, color: SILVER,
                      marginBottom: 24,
                    }}>{plan.members}</div>

                    <div style={{ marginBottom: 32 }}>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 42, fontWeight: 800,
                        color: WHITE, letterSpacing: '0.05em',
                      }}>{pricing.symbol}{plan.price}</span>
                      <span style={{
                        fontFamily: FONT_BODY, fontSize: 15, color: SILVER,
                      }}>{plan.period}</span>
                    </div>

                    <div style={{ flex: 1 }}>
                      {plan.features.map(f => (
                        <div key={f} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          marginBottom: 14,
                        }}>
                          {icons.check(CRIMSON)}
                          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: PLATINUM }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => navigate('/login')} style={{
                      fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      background: plan.best ? CRIMSON : 'transparent',
                      color: WHITE,
                      border: plan.best ? `1px solid ${CRIMSON}` : `1px solid ${GUNMETAL}`,
                      borderRadius: 4, padding: '14px 24px', cursor: 'pointer',
                      width: '100%', marginTop: 24, transition: 'all 0.3s',
                    }}
                    onMouseEnter={e => { e.target.style.background = plan.best ? CRIMSON_DARK : CRIMSON_GLOW; e.target.style.borderColor = CRIMSON }}
                    onMouseLeave={e => { e.target.style.background = plan.best ? CRIMSON : 'transparent'; e.target.style.borderColor = plan.best ? CRIMSON : GUNMETAL }}>
                      GET STARTED
                    </button>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── DOWNLOAD ────────────────────────────────────────── */}
      <section id="download" style={{
        padding: 'clamp(60px, 10vw, 100px) 0',
        background: MATTE_BLACK, ...carbonFiberBg,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 50% 60% at 50% 0%, ${CRIMSON_GLOW}, transparent 50%)`,
        }} />
        <Section>
          <div style={{ ...containerStyle, position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={sectionLabel}>MOBILE</div>
            <h2 style={{ ...sectionHeading, marginBottom: 16 }}>DEPLOY ON YOUR DEVICE</h2>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 17, color: SILVER,
              maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.7,
            }}>
              Take the full IVIRA experience with you. Available on every platform.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'APP STORE', sub: 'Download on the' },
                { label: 'GOOGLE PLAY', sub: 'Get it on' },
                { label: 'DOWNLOAD APK', sub: 'Direct install' },
              ].map((store, i) => (
                <button key={store.label} style={{
                  background: CARBON, border: `1px solid ${GUNMETAL}44`,
                  borderRadius: 8, padding: '16px 32px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, transition: 'all 0.3s', minWidth: 180,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${CRIMSON}66`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${GUNMETAL}44`; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <span style={{
                    fontFamily: FONT_BODY, fontSize: 11, color: SILVER,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>{store.sub}</span>
                  <span style={{
                    fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
                    letterSpacing: '0.15em', color: WHITE, textTransform: 'uppercase',
                  }}>{store.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        padding: '60px 0 40px', background: MATTE_BLACK,
        borderTop: `1px solid ${GUNMETAL}22`,
      }}>
        <div style={{
          ...containerStyle,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
        }}>
          {/* Wordmark */}
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700,
            letterSpacing: '0.4em', color: WHITE, textDecoration: 'none',
            textTransform: 'uppercase',
          }}>
            IVIRA
          </Link>

          {/* Links */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'COMMAND CENTER', to: '/login' },
              { label: 'MEMBER LOGIN', to: '/member/login' },
              { label: 'FIND ARENA', to: '/find-gym' },
              { label: 'PRIVACY', to: '/privacy' },
              { label: 'TERMS', to: '/terms' },
              { label: 'CONTACT', to: '/contact' },
            ].map(link => (
              <Link key={link.label} to={link.to} style={{
                fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 500,
                letterSpacing: '0.2em', color: SILVER, textDecoration: 'none',
                textTransform: 'uppercase', transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.target.style.color = WHITE}
              onMouseLeave={e => e.target.style.color = SILVER}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 48, height: 1, background: GUNMETAL }} />

          {/* Bottom */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.3em', color: GUNMETAL, textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              ENGINEERED IN INDIA
            </div>
            <div style={{
              fontFamily: FONT_BODY, fontSize: 13, color: GUNMETAL,
            }}>
              {new Date().getFullYear()} IVIRA. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* ── RESPONSIVE STYLES ───────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-ctas { display: none !important; }
          .mobile-toggle { display: block !important; }
          .bento-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .bento-grid > div:first-child > div {
            grid-column: span 2 !important;
          }
        }
        @media (max-width: 480px) {
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid > div:first-child > div {
            grid-column: span 1 !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-toggle { display: none !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        ::selection {
          background: ${CRIMSON};
          color: ${WHITE};
        }
      `}</style>

      {/* Gym Owner Sign-Up Modal */}
      <GymSignUpModal open={showGymSignUp} onClose={() => setShowGymSignUp(false)} />
    </div>
  )
}
