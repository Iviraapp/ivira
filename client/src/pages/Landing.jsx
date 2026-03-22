import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'

// ── Brand Tokens ──────────────────────────────────────────────
const BLUE      = '#1A3A8F'
const BLUE_DARK = '#0F2560'
const BLUE_LIGHT= '#E8EEF9'
const WHITE     = '#FFFFFF'
const OFF_WHITE = '#F7F9FC'
const GRAY_50   = '#F9FAFB'
const GRAY_100  = '#F3F4F6'
const GRAY_200  = '#E5E7EB'
const GRAY_500  = '#6B7280'
const GRAY_700  = '#374151'
const GRAY_900  = '#111827'
const GREEN     = '#10B981'
const AMBER     = '#F59E0B'

const FONT_DISPLAY = "'General Sans', 'Inter', -apple-system, sans-serif"
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
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Icon Components (inline SVG) ─────────────────────────────
function DumbbellLogo({ size = 28, color = BLUE }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="11" width="5" height="10" rx="1.5" fill={color} />
      <rect x="25" y="11" width="5" height="10" rx="1.5" fill={color} />
      <rect x="7" y="9" width="4" height="14" rx="1" fill={color} opacity="0.8" />
      <rect x="21" y="9" width="4" height="14" rx="1" fill={color} opacity="0.8" />
      <rect x="11" y="14" width="10" height="4" rx="1" fill={color} />
    </svg>
  )
}

function IconBox({ children, bg = BLUE_LIGHT }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16, flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

// Simple SVG icons for features
const icons = {
  members: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  qr: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="21" y2="21"/></svg>,
  payment: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  whatsapp: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  staff: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  classes: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  analytics: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  plans: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  ai: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  daypass: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
  nutrition: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  steps: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
  workout: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11"/><path d="M21 3l-6.5 6.5"/><path d="M3 21l6.5-6.5"/><path d="M18 3l3 3"/><path d="M3 18l3 3"/></svg>,
  fasting: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  trophy: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>,
  badge: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/></svg>,
  trainer: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  marketplace: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  newsletter: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  affiliate: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  check: (c = GREEN) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  portal: (c = BLUE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
}

// ── Data ─────────────────────────────────────────────────────
const ownerFeatures = [
  { icon: 'members', title: 'Member Management', desc: 'Add, search, and track 100 to 2,000 members with detailed profiles and membership history.' },
  { icon: 'qr', title: 'QR + OTP Check-ins', desc: 'GPS-validated check-ins within 150m radius. Members scan QR or enter OTP at the door.' },
  { icon: 'payment', title: 'Payment & Billing', desc: 'Razorpay-powered payments with auto-invoicing, renewal reminders, and complete revenue tracking.' },
  { icon: 'whatsapp', title: 'WhatsApp Notifications', desc: 'Automated reminders for dues, renewals, and announcements sent directly via WhatsApp.' },
  { icon: 'staff', title: 'Staff Management', desc: 'Manage trainers, track staff attendance, assign roles, and monitor performance metrics.' },
  { icon: 'classes', title: 'Classes & Scheduling', desc: 'Create group classes, manage bookings, set capacity limits, and handle recurring schedules.' },
  { icon: 'analytics', title: 'Analytics Dashboard', desc: 'Revenue trends, member retention rates, churn scoring, and actionable business insights.' },
  { icon: 'plans', title: 'Membership Plans', desc: 'Flexible monthly, quarterly, and annual plans with auto-renewal and upgrade paths.' },
  { icon: 'ai', title: 'AI Coach', desc: 'Built-in AI that provides nutrition guidance and workout recommendations to your members.' },
  { icon: 'marketplace', title: 'Marketplace', desc: 'Showcase trainer profiles and services. Let members book sessions and diet plans online.' },
  { icon: 'newsletter', title: 'Newsletter & Campaigns', desc: 'Send targeted email campaigns, promotions, and updates to keep members engaged.' },
  { icon: 'affiliate', title: 'Affiliate Store', desc: 'Earn commissions by partnering with supplement and fitness brands through our marketplace.' },
]

const seekerFeatures = [
  { icon: 'search', title: 'GymFinder', desc: 'Discover gyms nearby with ratings, amenities, photos, and real-time availability.' },
  { icon: 'daypass', title: 'Day Pass Booking', desc: 'Walk into any partner gym and pay per visit. No long-term commitment required.' },
  { icon: 'portal', title: 'Member Portal', desc: 'View your membership details, payment history, and check-in records in one place.' },
  { icon: 'nutrition', title: 'Nutrition Tracking', desc: 'Log meals, set calorie goals, track macros, and get personalized diet suggestions.' },
  { icon: 'steps', title: 'Step Counter', desc: 'Sync with Apple Health or Google Fit to track daily steps and activity levels.' },
  { icon: 'workout', title: 'Workout Logging', desc: 'Track exercises, sets, reps, and personal records. Build streaks and stay consistent.' },
  { icon: 'fasting', title: 'Fasting Tracker', desc: 'Monitor intermittent fasting windows with timers, history, and streak tracking.' },
  { icon: 'ai', title: 'AI Fitness Coach', desc: 'Chat with an AI coach for workout plans, nutrition advice, and fitness guidance.' },
  { icon: 'trophy', title: 'Leaderboards & Challenges', desc: 'Compete with other members on steps, workouts, and gym check-ins.' },
  { icon: 'badge', title: 'Achievements & Badges', desc: 'Earn badges for milestones, streaks, and challenges. Gamify your fitness journey.' },
  { icon: 'trainer', title: 'Trainer Booking', desc: 'Browse certified trainers, book personal training sessions, and get custom diet plans.' },
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
        name: 'Starter', price: p.starter, period: '/year', members: 'Up to 100 members', best: false,
        features: ['Member management', 'QR + OTP check-ins', 'Payment collection', 'WhatsApp notifications', 'Basic analytics', 'Email support'],
      },
      {
        name: 'Growth', price: p.growth, period: '/year', members: 'Up to 500 members', best: true,
        features: ['Everything in Starter', 'Staff management', 'Classes & scheduling', 'Advanced analytics', 'AI Coach for members', 'Newsletter campaigns', 'Priority support'],
      },
      {
        name: 'Pro', price: p.pro, period: '/year', members: 'Up to 2,000 members', best: false,
        features: ['Everything in Growth', 'Marketplace & bookings', 'Affiliate store', 'Churn prediction', 'Custom branding', 'API access', 'Dedicated account manager'],
      },
    ],
  }
}

const cities = ['Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai']

// ── Main Component ───────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeHowTab, setActiveHowTab] = useState('owner')
  const { geo, setGeo, pricing, plans: pricingPlans } = useGeoPricing()

  // Stats counter
  const [statsRef, statsVisible] = useScrollReveal(0.3)
  const gymCount = useCounter(5000, 2000, statsVisible)
  const memberCount = useCounter(100, 2000, statsVisible)
  const cityCount = useCounter(4, 1500, statsVisible)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'For Gym Owners', href: '#owners' },
    { label: 'For Members', href: '#seekers' },
    { label: 'Pricing', href: '#pricing' },
  ]

  const smoothScroll = (e, href) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Styles ───────────────────────────────────────────────
  const s = {
    nav: {
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${GRAY_200}` : '1px solid transparent',
      transition: 'all 0.3s ease',
      padding: scrolled ? '12px 0' : '20px 0',
    },
    navInner: {
      maxWidth: 1200, margin: '0 auto', padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    logo: {
      display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
    },
    logoText: {
      fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24,
      color: scrolled ? BLUE : BLUE, letterSpacing: '-0.5px',
    },
    navLinksDesktop: {
      display: 'flex', alignItems: 'center', gap: 32,
    },
    navLink: {
      fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500,
      color: scrolled ? GRAY_700 : GRAY_700, textDecoration: 'none',
      transition: 'color 0.2s', cursor: 'pointer',
    },
    navBtns: {
      display: 'flex', alignItems: 'center', gap: 12,
    },
    btnOutline: {
      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
      padding: '10px 20px', borderRadius: 8,
      border: `2px solid ${BLUE}`, background: 'transparent',
      color: BLUE, cursor: 'pointer', transition: 'all 0.2s',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    },
    btnPrimary: {
      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
      padding: '10px 20px', borderRadius: 8,
      border: 'none', background: BLUE, color: WHITE,
      cursor: 'pointer', transition: 'all 0.2s',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
    },
    btnPrimaryLg: {
      fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700,
      padding: '16px 36px', borderRadius: 12,
      border: 'none', background: BLUE, color: WHITE,
      cursor: 'pointer', transition: 'all 0.25s',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
    },
    btnOutlineLg: {
      fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700,
      padding: '16px 36px', borderRadius: 12,
      border: `2px solid ${BLUE}`, background: WHITE, color: BLUE,
      cursor: 'pointer', transition: 'all 0.25s',
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
    },
    container: {
      maxWidth: 1200, margin: '0 auto', padding: '0 24px',
    },
    sectionPad: {
      padding: '100px 0',
    },
    heading: {
      fontFamily: FONT_DISPLAY, fontWeight: 800, color: GRAY_900,
      lineHeight: 1.1, letterSpacing: '-1px',
    },
    subheading: {
      fontFamily: FONT_BODY, color: GRAY_500, lineHeight: 1.6,
      maxWidth: 600, margin: '0 auto',
    },
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT_BODY, color: GRAY_900, overflowX: 'hidden', background: WHITE }}>

      {/* ━━ NAV BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>
            <DumbbellLogo size={28} color={BLUE} />
            <span style={s.logoText}>IVIRA</span>
          </Link>

          {/* Desktop Nav */}
          <div style={{ ...s.navLinksDesktop, '@media (max-width: 900px)': { display: 'none' } }}
            className="nav-links-desktop">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={e => smoothScroll(e, l.href)}
                style={s.navLink}
                onMouseEnter={e => e.target.style.color = BLUE}
                onMouseLeave={e => e.target.style.color = GRAY_700}>
                {l.label}
              </a>
            ))}
          </div>

          <div style={s.navBtns} className="nav-btns-desktop">
            <Link to="/login" style={s.btnOutline}
              onMouseEnter={e => { e.target.style.background = BLUE; e.target.style.color = WHITE }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = BLUE }}>
              Gym Owner Login
            </Link>
            <Link to="/find-gym" style={s.btnPrimary}
              onMouseEnter={e => e.target.style.background = BLUE_DARK}
              onMouseLeave={e => e.target.style.background = BLUE}>
              Find a Gym
            </Link>
          </div>

          {/* Hamburger */}
          <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none', background: 'none', border: 'none', cursor: 'pointer',
              padding: 8, zIndex: 1001,
            }}>
            <div style={{ width: 24, height: 2, background: GRAY_900, marginBottom: 6, transition: 'all 0.3s',
              transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <div style={{ width: 24, height: 2, background: GRAY_900, marginBottom: 6,
              opacity: mobileMenuOpen ? 0 : 1, transition: 'all 0.3s' }} />
            <div style={{ width: 24, height: 2, background: GRAY_900, transition: 'all 0.3s',
              transform: mobileMenuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: WHITE, zIndex: 999, paddingTop: 80,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          }}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={e => smoothScroll(e, l.href)}
                style={{ ...s.navLink, fontSize: 20, fontWeight: 600 }}>
                {l.label}
              </a>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, width: '80%' }}>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                style={{ ...s.btnOutline, justifyContent: 'center', padding: '14px 24px', fontSize: 16 }}>
                Gym Owner Login
              </Link>
              <Link to="/find-gym" onClick={() => setMobileMenuOpen(false)}
                style={{ ...s.btnPrimary, justifyContent: 'center', padding: '14px 24px', fontSize: 16 }}>
                Find a Gym
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        paddingTop: 160, paddingBottom: 100,
        background: `linear-gradient(180deg, ${WHITE} 0%, ${BLUE_LIGHT} 100%)`,
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle bg decoration */}
        <div style={{
          position: 'absolute', top: -200, right: -200, width: 500, height: 500,
          borderRadius: '50%', background: `radial-gradient(circle, rgba(26,58,143,0.06) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100, width: 400, height: 400,
          borderRadius: '50%', background: `radial-gradient(circle, rgba(26,58,143,0.04) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={s.container}>
          <Section>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: WHITE, border: `1px solid ${GRAY_200}`, borderRadius: 100,
              padding: '8px 20px', marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: GRAY_700 }}>
                Now live across 4 cities in India
              </span>
            </div>
          </Section>

          <Section delay={0.1}>
            <h1 style={{
              ...s.heading, fontSize: 'clamp(36px, 5.5vw, 72px)',
              marginBottom: 24, maxWidth: 800, margin: '0 auto 24px',
            }}>
              Your Complete{' '}
              <span style={{ color: BLUE }}>Fitness</span>{' '}
              Platform
            </h1>
          </Section>

          <Section delay={0.2}>
            <p style={{
              ...s.subheading, fontSize: 'clamp(16px, 2vw, 20px)',
              marginBottom: 48, maxWidth: 640,
            }}>
              IVIRA connects gym owners with powerful management tools and fitness
              seekers with everything they need to stay fit. One platform, two paths.
            </p>
          </Section>

          <Section delay={0.3}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
              <Link to="/login" style={s.btnPrimaryLg}
                onMouseEnter={e => { e.currentTarget.style.background = BLUE_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)' }}>
                I Own a Gym
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
              </Link>
              <Link to="/find-gym" style={s.btnOutlineLg}
                onMouseEnter={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = WHITE; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = WHITE; e.currentTarget.style.color = BLUE; e.currentTarget.style.transform = 'translateY(0)' }}>
                I'm a Fitness Seeker
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
              </Link>
            </div>
          </Section>

          {/* Stats */}
          <Section delay={0.4}>
            <div ref={statsRef} style={{
              display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 6vw, 80px)', flexWrap: 'wrap',
            }}>
              {[
                { value: gymCount, suffix: '+', label: 'Gyms', fmt: v => v.toLocaleString('en-IN') },
                { value: memberCount, suffix: 'K+', label: 'Members', fmt: v => v.toLocaleString('en-IN') },
                { value: cityCount, suffix: '', label: 'Cities', fmt: v => v.toString() },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800,
                    color: BLUE, lineHeight: 1,
                  }}>
                    {stat.fmt(stat.value)}{stat.suffix}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: GRAY_500, marginTop: 4, fontWeight: 500 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ━━ SOCIAL PROOF ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '48px 0', background: WHITE, borderBottom: `1px solid ${GRAY_100}` }}>
        <div style={s.container}>
          <Section>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: GRAY_500, fontWeight: 500, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Trusted across India
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 4vw, 56px)', flexWrap: 'wrap', alignItems: 'center' }}>
                {cities.map(city => (
                  <span key={city} style={{
                    fontFamily: FONT_DISPLAY, fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 700,
                    color: GRAY_900, opacity: 0.7,
                  }}>
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ━━ FOR GYM OWNERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="owners" style={{
        ...s.sectionPad,
        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
        color: WHITE,
      }}>
        <div style={s.container}>
          <Section>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '3px', color: 'rgba(255,255,255,0.6)', marginBottom: 16, display: 'block',
              }}>
                For Gym Owners
              </span>
              <h2 style={{
                fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800,
                color: WHITE, lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 16,
              }}>
                Built for Gym Owners Who Mean Business
              </h2>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.7)',
                maxWidth: 560, margin: '0 auto',
              }}>
                Everything you need to run your gym efficiently, retain members, and grow revenue.
              </p>
            </div>
          </Section>

          <div id="features" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {ownerFeatures.map((f, i) => (
              <Section key={f.title} delay={i * 0.05}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.08)', borderRadius: 16,
                    padding: 28, border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease', cursor: 'default', height: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <IconBox bg="rgba(255,255,255,0.15)">
                    {icons[f.icon] && icons[f.icon](WHITE)}
                  </IconBox>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 8 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </Section>
            ))}
          </div>

          <Section delay={0.3}>
            <div style={{ textAlign: 'center', marginTop: 56 }}>
              <Link to="/login" style={{
                ...s.btnPrimaryLg, background: WHITE, color: BLUE,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = GRAY_100; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = WHITE; e.currentTarget.style.transform = 'translateY(0)' }}>
                Start Free Trial
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
              </Link>
            </div>
          </Section>
        </div>
      </section>

      {/* ━━ FOR FITNESS SEEKERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="seekers" style={{ ...s.sectionPad, background: OFF_WHITE }}>
        <div style={s.container}>
          <Section>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '3px', color: BLUE, marginBottom: 16, display: 'block',
              }}>
                For Fitness Seekers
              </span>
              <h2 style={{
                ...s.heading, fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 16,
              }}>
                Your Fitness Journey Starts Here
              </h2>
              <p style={{ ...s.subheading, fontSize: 18 }}>
                Track workouts, count calories, find gyms, book day passes, and let AI guide your fitness goals.
              </p>
            </div>
          </Section>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {seekerFeatures.map((f, i) => (
              <Section key={f.title} delay={i * 0.05}>
                <div
                  style={{
                    background: WHITE, borderRadius: 16, padding: 28,
                    border: `1px solid ${GRAY_200}`, transition: 'all 0.3s ease',
                    cursor: 'default', height: '100%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(26,58,143,0.1)'
                    e.currentTarget.style.borderColor = BLUE
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                    e.currentTarget.style.borderColor = GRAY_200
                  }}
                >
                  <IconBox bg={BLUE_LIGHT}>
                    {icons[f.icon] && icons[f.icon](BLUE)}
                  </IconBox>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: GRAY_900, marginBottom: 8 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: GRAY_500, lineHeight: 1.6, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </Section>
            ))}
          </div>

          <Section delay={0.3}>
            <div style={{ textAlign: 'center', marginTop: 56 }}>
              <Link to="/find-gym" style={s.btnPrimaryLg}
                onMouseEnter={e => { e.currentTarget.style.background = BLUE_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)' }}>
                Find a Gym Near You
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
              </Link>
            </div>
          </Section>
        </div>
      </section>

      {/* ━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ ...s.sectionPad, background: WHITE }}>
        <div style={s.container}>
          <Section>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ ...s.heading, fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 16 }}>
                How It Works
              </h2>
              <p style={{ ...s.subheading, fontSize: 18 }}>
                Get started in minutes, no matter which side you are on.
              </p>
            </div>
          </Section>

          <Section delay={0.1}>
            {/* Tabs */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 56,
              background: GRAY_100, borderRadius: 12, padding: 4,
              maxWidth: 400, margin: '0 auto 56px',
            }}>
              {[
                { key: 'owner', label: 'Gym Owners' },
                { key: 'seeker', label: 'Fitness Seekers' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveHowTab(tab.key)}
                  style={{
                    flex: 1, padding: '12px 24px', borderRadius: 10, border: 'none',
                    fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    background: activeHowTab === tab.key ? WHITE : 'transparent',
                    color: activeHowTab === tab.key ? BLUE : GRAY_500,
                    boxShadow: activeHowTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.25s ease',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </Section>

          <Section delay={0.2}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 32, maxWidth: 900, margin: '0 auto',
            }}>
              {(activeHowTab === 'owner' ? [
                { step: '01', title: 'Register Your Gym', desc: 'Sign up in 2 minutes. Add your gym details, location, and amenities.' },
                { step: '02', title: 'Add Your Members', desc: 'Import existing members or let them self-register. Set up membership plans.' },
                { step: '03', title: 'Grow Your Business', desc: 'Use analytics, automation, and marketing tools to retain and grow your member base.' },
              ] : [
                { step: '01', title: 'Download the App', desc: 'Get IVIRA from the App Store or Play Store. Create your profile in seconds.' },
                { step: '02', title: 'Find Your Gym', desc: 'Browse nearby gyms, compare amenities and prices, or book a day pass instantly.' },
                { step: '03', title: 'Track Everything', desc: 'Log workouts, track nutrition, earn achievements, and chat with AI for guidance.' },
              ]).map((item, i) => (
                <div key={item.step} style={{ textAlign: 'center', padding: '0 12px' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 24px rgba(26,58,143,0.25)',
                  }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: WHITE }}>
                      {item.step}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: GRAY_900, marginBottom: 8 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: GRAY_500, lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ━━ PRICING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pricing" style={{ ...s.sectionPad, background: OFF_WHITE }}>
        <div style={s.container}>
          <Section>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '3px', color: BLUE, marginBottom: 16, display: 'block',
              }}>
                Pricing
              </span>
              <h2 style={{ ...s.heading, fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 16 }}>
                Simple, Transparent Pricing
              </h2>
              <p style={{ ...s.subheading, fontSize: 18 }}>
                No hidden fees. No per-member charges. Pick the plan that fits your gym.
              </p>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: GRAY_500 }}>Region:</span>
                <select
                  value={geo}
                  onChange={e => setGeo(e.target.value)}
                  style={{
                    fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: GRAY_700,
                    background: WHITE, border: `1px solid ${GRAY_200}`, borderRadius: 8,
                    padding: '6px 12px', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="IN">India (INR)</option>
                  <option value="US">United States (USD)</option>
                  <option value="GB">United Kingdom (GBP)</option>
                  <option value="AE">UAE (AED)</option>
                  <option value="SG">Singapore (SGD)</option>
                  <option value="AU">Australia (AUD)</option>
                  <option value="CA">Canada (CAD)</option>
                </select>
              </div>
            </div>
          </Section>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24, maxWidth: 1000, margin: '0 auto', alignItems: 'stretch',
          }}>
            {pricingPlans.map((plan, i) => (
              <Section key={plan.name} delay={i * 0.1}>
                <div style={{
                  background: WHITE, borderRadius: 20, padding: 40,
                  border: plan.best ? `2px solid ${BLUE}` : `1px solid ${GRAY_200}`,
                  position: 'relative', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: plan.best ? '0 16px 48px rgba(26,58,143,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                  transform: plan.best ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
                  onMouseEnter={e => {
                    if (!plan.best) {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(26,58,143,0.1)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!plan.best) {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                    }
                  }}
                >
                  {plan.best && (
                    <div style={{
                      position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                      background: BLUE, color: WHITE, padding: '6px 24px', borderRadius: 100,
                      fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, letterSpacing: '0.5px',
                    }}>
                      Most Popular
                    </div>
                  )}

                  <div style={{ marginBottom: 32 }}>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                      color: GRAY_900, marginBottom: 4,
                    }}>
                      {plan.name}
                    </h3>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: GRAY_500, margin: 0 }}>
                      {plan.members}
                    </p>
                  </div>

                  <div style={{ marginBottom: 32 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, color: GRAY_500 }}>
                      {pricing.symbol}
                    </span>
                    <span style={{
                      fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 800,
                      color: GRAY_900, lineHeight: 1, letterSpacing: '-2px',
                    }}>
                      {plan.price}
                    </span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: GRAY_500 }}>
                      {plan.period}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{
                        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                      }}>
                        {icons.check(plan.best ? BLUE : GREEN)}
                        <span style={{ fontFamily: FONT_BODY, fontSize: 15, color: GRAY_700 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/login" style={{
                    ...s.btnPrimaryLg,
                    width: '100%', justifyContent: 'center', marginTop: 32,
                    background: plan.best ? BLUE : WHITE,
                    color: plan.best ? WHITE : BLUE,
                    border: plan.best ? 'none' : `2px solid ${BLUE}`,
                    fontSize: 16, padding: '14px 24px',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = plan.best ? BLUE_DARK : BLUE
                      e.currentTarget.style.color = WHITE
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = plan.best ? BLUE : WHITE
                      e.currentTarget.style.color = plan.best ? WHITE : BLUE
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}>
                    Get Started
                  </Link>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ DOWNLOAD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        ...s.sectionPad,
        background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
        color: WHITE, overflow: 'hidden', position: 'relative',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 300, height: 300,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -120, left: -120, width: 400, height: 400,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />

        <div style={s.container}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 64, alignItems: 'center',
          }}>
            <Section>
              <div>
                <h2 style={{
                  fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800,
                  color: WHITE, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 20,
                }}>
                  Take IVIRA With You Everywhere
                </h2>
                <p style={{
                  fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.6, marginBottom: 40, maxWidth: 440,
                }}>
                  Track workouts, log nutrition, check in at your gym, and get AI coaching --
                  all from your phone.
                </p>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {/* App Store */}
                  <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 12,
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 12, padding: '12px 24px', textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={WHITE}>
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                        Download on the
                      </div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: WHITE, lineHeight: 1.2 }}>
                        App Store
                      </div>
                    </div>
                  </a>

                  {/* Play Store */}
                  <a href="https://play.google.com" target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 12,
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 12, padding: '12px 24px', textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={WHITE}>
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.098 12l2.6-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
                    </svg>
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                        Get it on
                      </div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: WHITE, lineHeight: 1.2 }}>
                        Google Play
                      </div>
                    </div>
                  </a>

                  {/* APK */}
                  <a href="/download/ivira.apk" download
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 12,
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 12, padding: '12px 24px', textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                        Direct
                      </div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: WHITE, lineHeight: 1.2 }}>
                        Download APK
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </Section>

            <Section delay={0.2}>
              {/* Phone mockup */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
              }}>
                <div style={{
                  width: 260, height: 520, borderRadius: 36,
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '48px 24px 24px',
                }}>
                  {/* Notch */}
                  <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    width: 80, height: 24, borderRadius: 12,
                    background: 'rgba(0,0,0,0.3)',
                  }} />

                  <DumbbellLogo size={40} color={WHITE} />
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
                    color: WHITE, marginTop: 12, marginBottom: 8,
                  }}>
                    IVIRA
                  </div>
                  <p style={{
                    fontFamily: FONT_BODY, fontSize: 13, color: 'rgba(255,255,255,0.6)',
                    textAlign: 'center', marginBottom: 32, lineHeight: 1.5,
                  }}>
                    Your complete fitness companion
                  </p>

                  {/* Mock UI elements */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', padding: '0 14px',
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', marginRight: 12 }} />
                      <div>
                        <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)', marginBottom: 4 }} />
                        <div style={{ width: 50, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                      </div>
                    </div>
                    <div style={{
                      height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', padding: '0 14px',
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', marginRight: 12 }} />
                      <div>
                        <div style={{ width: 100, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)', marginBottom: 4 }} />
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                      </div>
                    </div>
                    <div style={{
                      height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', padding: '0 14px',
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', marginRight: 12 }} />
                      <div>
                        <div style={{ width: 70, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)', marginBottom: 4 }} />
                        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Bottom nav mockup */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 16px',
                  }}>
                    {[1,2,3,4].map(n => (
                      <div key={n} style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.2)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ background: GRAY_900, color: WHITE, padding: '64px 0 32px' }}>
        <div style={s.container}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 48, marginBottom: 48,
          }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <DumbbellLogo size={24} color={WHITE} />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: WHITE }}>
                  IVIRA
                </span>
              </div>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 14, color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7, maxWidth: 280,
              }}>
                India's complete fitness platform for gym owners and fitness enthusiasts.
                Manage, track, and grow -- all in one place.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Platform
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'For Gym Owners', to: '/login' },
                  { label: 'Find a Gym', to: '/find-gym' },
                  { label: 'Member Login', to: '/member/login' },
                ].map(l => (
                  <Link key={l.to} to={l.to} style={{
                    fontFamily: FONT_BODY, fontSize: 14, color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none', transition: 'color 0.2s',
                  }}
                    onMouseEnter={e => e.target.style.color = WHITE}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Legal
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Privacy Policy', to: '/privacy' },
                  { label: 'Terms of Service', to: '/terms' },
                  { label: 'Contact Us', to: '/contact' },
                ].map(l => (
                  <Link key={l.to} to={l.to} style={{
                    fontFamily: FONT_BODY, fontSize: 14, color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none', transition: 'color 0.2s',
                  }}
                    onMouseEnter={e => e.target.style.color = WHITE}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Connect
              </h4>
              <div style={{ display: 'flex', gap: 16 }}>
                {/* Twitter/X */}
                <a href="https://twitter.com/ivirafit" target="_blank" rel="noopener noreferrer"
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={WHITE}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                {/* Instagram */}
                <a href="https://instagram.com/ivirafit" target="_blank" rel="noopener noreferrer"
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5"/>
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                {/* LinkedIn */}
                <a href="https://linkedin.com/company/ivira" target="_blank" rel="noopener noreferrer"
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={WHITE}>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 16,
          }}>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0,
            }}>
              2024-2026 IVIRA. All rights reserved.
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 14px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#FF9933"/>
                <rect x="2" y="10" width="20" height="4" fill={WHITE}/>
                <rect x="2" y="14" width="20" height="6" rx="0" fill="#138808"/>
                <circle cx="12" cy="12" r="2" fill="#000080"/>
              </svg>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                Made in India
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ━━ RESPONSIVE STYLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <style>{`
        @media (max-width: 900px) {
          .nav-links-desktop { display: none !important; }
          .nav-btns-desktop { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
        @media (min-width: 901px) {
          .hamburger-btn { display: none !important; }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        a:focus-visible, button:focus-visible {
          outline: 2px solid ${BLUE};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
