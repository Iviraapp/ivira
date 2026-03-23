import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useTheme } from '../context/ThemeContext'

// ── IVIRA Brand Tokens ──────────────────────────────────────
const MATTE_BLACK  = '#0A0A0A'
const SURFACE      = '#111111'
const CARBON       = '#111111'
const GRAPHITE     = '#161616'
const DEEP_BLUE    = '#0A0A0A'
const IVIRA_BLUE   = '#1A3A8F'
const COBALT       = '#2250B0'
const SKY_ACCENT   = '#3B82F6'
const BLUE_GLOW    = 'rgba(26,58,143,0.15)'
const ACCENT       = '#3B82F6'
const ACCENT_DARK  = '#2563EB'
const ACCENT_GLOW  = 'rgba(59,130,246,0.08)'
const PLATINUM     = '#E5E5E5'
const SILVER       = '#999999'
const GUNMETAL     = '#444444'
const WHITE        = '#FFFFFF'

const FONT_DISPLAY = "'Satoshi', 'General Sans', 'Inter', sans-serif"
const FONT_BODY    = "'General Sans', 'Inter', -apple-system, sans-serif"
const FONT_NAV     = "'General Sans', 'Inter', sans-serif"

// ── Sparkline Data for Telemetry Cards ─────────────────────
const sparkData = {
  realtime: [{ v: 30 },{ v: 45 },{ v: 38 },{ v: 62 },{ v: 55 },{ v: 78 },{ v: 82 },{ v: 90 },{ v: 75 },{ v: 95 }],
  revenue:  [{ v: 20 },{ v: 35 },{ v: 40 },{ v: 38 },{ v: 52 },{ v: 60 },{ v: 58 },{ v: 72 },{ v: 80 },{ v: 85 }],
  churn:    [{ v: 80 },{ v: 72 },{ v: 65 },{ v: 55 },{ v: 48 },{ v: 40 },{ v: 35 },{ v: 28 },{ v: 22 },{ v: 18 }],
  retention:[{ v: 40 },{ v: 45 },{ v: 50 },{ v: 58 },{ v: 65 },{ v: 70 },{ v: 78 },{ v: 82 },{ v: 88 },{ v: 92 }],
  attendance:[{ v: 25 },{ v: 60 },{ v: 85 },{ v: 72 },{ v: 90 },{ v: 55 },{ v: 70 },{ v: 88 },{ v: 45 },{ v: 65 }],
  aiinsights:[{ v: 10 },{ v: 25 },{ v: 30 },{ v: 55 },{ v: 60 },{ v: 65 },{ v: 75 },{ v: 85 },{ v: 90 },{ v: 95 }],
  velocity: [{ v: 30 },{ v: 42 },{ v: 48 },{ v: 55 },{ v: 50 },{ v: 65 },{ v: 78 },{ v: 70 },{ v: 82 },{ v: 90 }],
}

// ── Framer Motion Variants ─────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
}

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
  members: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  qr: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="21" x2="21" y2="21"/></svg>,
  payment: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  whatsapp: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  staff: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  classes: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  analytics: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  plans: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  ai: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  search: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  daypass: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
  nutrition: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  steps: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
  workout: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11"/><path d="M21 3l-6.5 6.5"/><path d="M3 21l6.5-6.5"/><path d="M18 3l3 3"/><path d="M3 18l3 3"/></svg>,
  fasting: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  trophy: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>,
  badge: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/></svg>,
  trainer: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  marketplace: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  newsletter: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  affiliate: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  check: (c = WHITE) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  portal: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  revenue: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
  shield: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  brain: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>,
  zap: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
  target: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  clock: (c = WHITE) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
}

// ── Data ─────────────────────────────────────────────────────
const ownerFeatures = [
  { icon: 'members', title: 'Member Management', desc: 'Full member database with profiles, photos, membership status, attendance history, and contact info. Import via CSV or add individually. Bulk actions for renewals and status updates.', highlights: ['100–2,000 members', 'CSV import', 'Bulk actions'] },
  { icon: 'qr', title: 'QR + OTP Check-ins', desc: 'GPS-validated entry within 150m radius. Members scan a 30-second rotating QR code or enter a one-time OTP. Anti-screenshot protection and NFC tap-to-enter on Android.', highlights: ['GPS + QR + OTP', '150m radius lock', 'NFC support'] },
  { icon: 'payment', title: 'Payment & Billing', desc: 'Accept payments via Razorpay (UPI, cards, net banking). Auto-generate GST invoices, send payment reminders via WhatsApp, and track revenue in real time with collection velocity metrics.', highlights: ['Razorpay integration', 'Auto-invoicing', 'Revenue analytics'] },
  { icon: 'whatsapp', title: 'WhatsApp Notifications', desc: 'Automated messages for payment reminders, membership expiry alerts, renewal confirmations, day pass purchases, and custom announcements — delivered directly to members\' WhatsApp.', highlights: ['Auto-reminders', 'Expiry alerts', 'Custom messages'] },
  { icon: 'staff', title: 'Staff Management', desc: 'Add trainers and staff with role-based access. Track attendance, assign members to trainers, monitor session counts, and manage commissions per booking.', highlights: ['Role-based access', 'Trainer assignment', 'Commission tracking'] },
  { icon: 'classes', title: 'Classes & Scheduling', desc: 'Create group classes with capacity limits, recurring schedules, and booking slots. Members book online, get reminders, and check in via QR. Wait-list support for full classes.', highlights: ['Capacity limits', 'Online booking', 'Wait-list support'] },
  { icon: 'analytics', title: 'Analytics Dashboard', desc: 'Live dashboard showing today\'s check-ins, revenue, expiring memberships, weekly trends, and peak hour heatmaps. Monthly revenue charts, churn rate tracking, and member growth over time.', highlights: ['Real-time metrics', 'Churn prediction', 'Peak hour heatmaps'] },
  { icon: 'plans', title: 'Membership Plans', desc: 'Create unlimited plan tiers — monthly, quarterly, half-yearly, annual. Set custom pricing, enable auto-renewal reminders, and offer upgrade paths. Day pass support for walk-in visitors.', highlights: ['Custom tiers', 'Day passes', 'Auto-renewal alerts'] },
  { icon: 'ai', title: 'AI Coach (Vira)', desc: 'Built-in AI assistant that provides your members with personalized workout routines, nutrition plans, and wellness recommendations. Powered by advanced language models.', highlights: ['Workout generation', 'Diet protocols', 'Wellness tips'] },
  { icon: 'marketplace', title: 'Marketplace', desc: 'Publish trainer profiles, personal training packages, diet consultations, and group sessions. Members discover and book directly from the app with integrated payments.', highlights: ['Trainer profiles', 'Direct booking', 'Integrated payments'] },
  { icon: 'newsletter', title: 'Newsletter & Campaigns', desc: 'Compose and send branded email campaigns to your member base. Segment by status, plan type, or activity level. Track open rates and engagement metrics.', highlights: ['Audience segments', 'Branded emails', 'Open rate tracking'] },
  { icon: 'affiliate', title: 'Affiliate Store', desc: 'Curate a storefront of supplements, gym wear, and fitness accessories from partner brands. Earn commissions on every sale. Members shop directly from your gym\'s portal.', highlights: ['Earn commissions', 'Branded storefront', 'Direct sales'] },
]

const seekerFeatures = [
  { icon: 'search', title: 'Gym Finder', desc: 'Discover gyms near you powered by Google Places API. View ratings, photos, amenities, contact info, and distance. Filter by type — CrossFit, yoga, MMA, traditional gyms, and more.', highlights: ['Google Maps powered', 'Photos & ratings', 'Distance sorting'] },
  { icon: 'daypass', title: 'Day Pass Booking', desc: 'Walk into any I V I R A partner gym and pay per visit. No commitment, no contracts. Ideal for travelers or anyone exploring new workout spots. Book and pay online.', highlights: ['Pay per visit', 'No contracts', 'Online booking'] },
  { icon: 'portal', title: 'Member Portal', desc: 'Your complete fitness hub: view active membership, remaining days, payment history, GST invoices, upcoming class bookings, and complete check-in records.', highlights: ['Membership status', 'Invoice downloads', 'Check-in history'] },
  { icon: 'nutrition', title: 'Nutrition Tracking', desc: 'Log meals with calorie and macro breakdowns. Set daily targets for protein, carbs, and fat. AI-powered food recognition and personalized diet protocols based on your goals.', highlights: ['Macro tracking', 'AI food recognition', 'Goal-based diets'] },
  { icon: 'steps', title: 'Step Counter & Activity', desc: 'Built-in pedometer with daily, weekly, and monthly step counts. Syncs with Apple Health and Google Fit. Track active minutes, calories burned, and set daily movement goals.', highlights: ['Apple Health sync', 'Google Fit sync', 'Activity goals'] },
  { icon: 'workout', title: 'Workout Logging', desc: 'Log exercises with sets, reps, weight, and RPE. Track personal records automatically. Build workout templates, follow trainer-assigned routines, and maintain consistency streaks.', highlights: ['PR tracking', 'Custom templates', 'Streak system'] },
  { icon: 'fasting', title: 'Fasting Tracker', desc: 'Monitor intermittent fasting with customizable windows (16:8, 18:6, 20:4, OMAD). Live countdown timer, fasting history calendar, streak tracking, and completion badges.', highlights: ['Multiple protocols', 'Live timer', 'Streak badges'] },
  { icon: 'ai', title: 'AI Fitness Coach (Vira)', desc: 'Chat with Vira, your AI fitness companion. Get personalized workout plans, nutrition advice, supplement guidance, injury prevention tips, and answers to any fitness question.', highlights: ['Chat interface', 'Personalized plans', 'Always available'] },
  { icon: 'trophy', title: 'Leaderboards & Challenges', desc: 'Compete with your gym community on steps, workouts, and check-in streaks. Join weekly challenges, climb the leaderboard, and earn recognition from your gym tribe.', highlights: ['Gym leaderboard', 'Weekly challenges', 'Community'] },
  { icon: 'badge', title: 'Achievements & Badges', desc: 'Earn badges for milestones: first check-in, 7-day streak, 100 workouts, nutrition master, and more. Gamified progression system that keeps you motivated and accountable.', highlights: ['30+ badges', 'Milestones', 'Gamification'] },
  { icon: 'trainer', title: 'Trainer Booking', desc: 'Browse certified trainers at your gym with specializations, ratings, and availability. Book personal training sessions, custom diet consultations, and get tailored workout protocols.', highlights: ['Trainer profiles', 'Session booking', 'Custom protocols'] },
]

const bentoCards = [
  { key: 'realtime', title: 'Real-time Analytics', desc: 'Live dashboard with today\'s check-ins, revenue, member activity, and operational metrics. Updates automatically — no refresh needed. See your gym\'s pulse at a glance.', icon: 'analytics', span: 2, accent: '#60A5FA' },
  { key: 'revenue', title: 'Revenue Tracking', desc: 'Daily, weekly, and monthly revenue breakdowns. Track UPI vs card vs cash. See collection rates, outstanding dues, and projected monthly revenue.', icon: 'revenue', span: 1, accent: '#34D399' },
  { key: 'churn', title: 'Churn Prediction', desc: 'AI flags members who haven\'t checked in recently, have expiring plans, or show declining engagement — so you can intervene before they leave.', icon: 'shield', span: 1, accent: '#F472B6' },
  { key: 'retention', title: 'Member Retention', desc: 'Engagement scoring based on check-in frequency, app usage, and payment history. Automated WhatsApp re-activation campaigns for dormant members.', icon: 'target', span: 1, accent: '#A78BFA' },
  { key: 'attendance', title: 'Attendance Patterns', desc: 'Heatmaps showing peak hours by day of week. Identify capacity bottlenecks, optimize class schedules, and staff shifts based on real data.', icon: 'clock', span: 1, accent: '#FBBF24' },
  { key: 'aiinsights', title: 'AI Insights', desc: 'Machine learning surfaces hidden patterns: which plan tiers retain best, which referral sources convert, and seasonal trends to plan promotions around.', icon: 'brain', span: 1, accent: '#38BDF8' },
  { key: 'velocity', title: 'Payment Velocity', desc: 'Track how fast you collect dues after invoicing. See aging receivables, overdue payments by member, and forecast monthly cash flow.', icon: 'zap', span: 1, accent: '#FB923C' },
]

// ── Geo-Based Pricing ───────────────────────────────────────
// PPP-adjusted pricing per region
const GEO_PRICING = {
  IN: { symbol: '\u20B9', starter: '12,000', growth: '24,000', pro: '48,000', label: 'INR', period: '/year', cities: ['Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai'] },
  US: { symbol: '$', starter: '149', growth: '299', pro: '599', label: 'USD', period: '/month', cities: ['New York', 'Los Angeles', 'Miami', 'Austin'] },
  GB: { symbol: '\u00A3', starter: '119', growth: '239', pro: '479', label: 'GBP', period: '/month', cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh'] },
  AE: { symbol: 'AED ', starter: '549', growth: '1,099', pro: '2,199', label: 'AED', period: '/month', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'] },
  EU: { symbol: '\u20AC', starter: '139', growth: '279', pro: '559', label: 'EUR', period: '/month', cities: ['Berlin', 'Paris', 'Amsterdam', 'Madrid'] },
  SG: { symbol: 'S$', starter: '199', growth: '399', pro: '799', label: 'SGD', period: '/month', cities: ['Singapore'] },
  AU: { symbol: 'A$', starter: '229', growth: '459', pro: '899', label: 'AUD', period: '/month', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
  CA: { symbol: 'C$', starter: '199', growth: '399', pro: '799', label: 'CAD', period: '/month', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'] },
  DEFAULT: { symbol: '$', starter: '149', growth: '299', pro: '599', label: 'USD', period: '/month', cities: ['Bengaluru', 'New York', 'London', 'Dubai'] },
}

const TZ_TO_COUNTRY = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Colombo': 'IN',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'Europe/London': 'GB', 'Europe/Belfast': 'GB',
  'Asia/Dubai': 'AE', 'Asia/Muscat': 'AE',
  'Europe/Berlin': 'EU', 'Europe/Paris': 'EU', 'Europe/Rome': 'EU', 'Europe/Madrid': 'EU',
  'Europe/Amsterdam': 'EU', 'Europe/Brussels': 'EU', 'Europe/Vienna': 'EU',
  'Europe/Stockholm': 'EU', 'Europe/Helsinki': 'EU', 'Europe/Warsaw': 'EU',
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
        name: 'Starter', price: p.starter, period: p.period, members: 'Up to 100 members', best: false,
        features: ['Member management', 'QR + OTP check-ins', 'Payment collection', 'WhatsApp notifications', 'Basic analytics', 'Email support'],
      },
      {
        name: 'Growth', price: p.growth, period: p.period, members: 'Up to 500 members', best: true,
        features: ['Everything in Starter', 'Staff management', 'Classes & scheduling', 'Advanced analytics', 'AI Coach for members', 'Newsletter campaigns', 'Priority support'],
      },
      {
        name: 'Pro', price: p.pro, period: p.period, members: 'Up to 2,000 members', best: false,
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
      rgba(255,255,255,0.025) 2px,
      rgba(255,255,255,0.025) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.015) 2px,
      rgba(255,255,255,0.015) 4px
    )
  `,
}

// ── Shared Styles ────────────────────────────────────────────
const sectionLabel = {
  fontFamily: FONT_NAV,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.05em',
  color: SILVER,
  marginBottom: 16,
}

const sectionHeading = {
  fontFamily: FONT_DISPLAY,
  fontSize: 'clamp(28px, 4.5vw, 48px)',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: WHITE,
  lineHeight: 1.15,
  margin: 0,
  marginBottom: 20,
}

const containerStyle = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 24px',
}

// ── Mobile & Platform Detection ─────────────────────────────
function getMobilePlatform() {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

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
function GymSignUpModal({ open, onClose, isDark }) {
  const [form, setForm] = useState({ gymName: '', ownerName: '', email: '', phone: '', city: '', memberCount: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  // Theme-adaptive modal colors
  const m = {
    bg: isDark ? '#0A0A0A' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    fieldBg: isDark ? '#111111' : '#F8F9FA',
    fieldBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    fieldColor: isDark ? '#E5E5E5' : '#111111',
    labelColor: isDark ? '#999999' : '#555555',
    textPrimary: isDark ? '#FFFFFF' : '#111111',
    textSec: isDark ? '#999999' : '#555555',
    overlay: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    btnBg: isDark ? '#FFFFFF' : IVIRA_BLUE,
    btnColor: isDark ? '#0A0A0A' : '#FFFFFF',
    btnDisabledBg: isDark ? '#444444' : '#CBD5E1',
    btnDisabledColor: isDark ? '#999999' : '#64748B',
    shadow: isDark
      ? '0 16px 48px rgba(0,0,0,0.6)'
      : '0 16px 48px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
  }

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
    width: '100%', padding: '13px 14px', fontSize: 14, fontFamily: FONT_BODY,
    background: m.fieldBg, color: m.fieldColor,
    border: `1px solid ${m.fieldBorder}`,
    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }
  const labelStyle = {
    fontFamily: FONT_NAV, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: m.labelColor,
    marginBottom: 6, display: 'block',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: m.overlay, backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: m.bg, border: `1px solid ${m.border}`,
        borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh',
        overflow: 'auto', padding: 'clamp(24px, 5vw, 40px)',
        boxShadow: m.shadow,
        position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        {/* Accent top border */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '16px 16px 0 0', background: `linear-gradient(90deg, ${IVIRA_BLUE}, ${ACCENT})` }} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
              background: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 style={{
              fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800,
              letterSpacing: '-0.02em', color: m.textPrimary, marginBottom: 12,
            }}>Application Received</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: m.textSec, lineHeight: 1.6 }}>
              Our team will review your application and contact you within 24 hours to set up your I V I R A Command Center.
            </p>
            <button onClick={onClose} style={{
              fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
              background: m.btnBg, color: m.btnColor, border: 'none', borderRadius: 10,
              padding: '14px 32px', cursor: 'pointer', marginTop: 24,
            }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 16, marginBottom: 32 }}>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800,
                letterSpacing: '-0.02em', color: m.textPrimary, margin: 0,
              }}>Register Your Gym</h3>
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: m.textSec, margin: '8px 0 0' }}>
                Submit your details and our team will onboard you within 24 hours.
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>GYM / FACILITY NAME *</label>
                  <input required style={fieldStyle} value={form.gymName}
                    onChange={e => setForm(f => ({ ...f, gymName: e.target.value }))}
                    placeholder="Iron Pulse Fitness"
                    onFocus={e => e.target.style.borderColor = ACCENT}
                    onBlur={e => e.target.style.borderColor = m.fieldBorder} />
                </div>
                <div>
                  <label style={labelStyle}>OWNER NAME *</label>
                  <input required style={fieldStyle} value={form.ownerName}
                    onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                    placeholder="Your full name"
                    onFocus={e => e.target.style.borderColor = ACCENT}
                    onBlur={e => e.target.style.borderColor = m.fieldBorder} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>EMAIL *</label>
                  <input required type="email" style={fieldStyle} value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@gym.com"
                    onFocus={e => e.target.style.borderColor = ACCENT}
                    onBlur={e => e.target.style.borderColor = m.fieldBorder} />
                </div>
                <div>
                  <label style={labelStyle}>PHONE *</label>
                  <input required type="tel" style={fieldStyle} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 8148957439"
                    onFocus={e => e.target.style.borderColor = ACCENT}
                    onBlur={e => e.target.style.borderColor = m.fieldBorder} />
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
                  placeholder="Tell us about your facility, equipment, specialties..."
                  onFocus={e => e.target.style.borderColor = ACCENT}
                  onBlur={e => e.target.style.borderColor = m.fieldBorder} />
              </div>
              <button type="submit" disabled={submitting} style={{
                fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
                background: submitting ? m.btnDisabledBg : m.btnBg,
                color: submitting ? m.btnDisabledColor : m.btnColor,
                border: 'none', borderRadius: 10, padding: '16px 32px',
                cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
                marginTop: 8, letterSpacing: '0.02em',
              }}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Concierge Lead Capture ────────────────────────────────────
function ConciergeLeadCapture({ isDark, t, navigate }) {
  const [query, setQuery] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return navigate('/find-gym')
    if (!email.trim() || !email.includes('@')) return
    setSubmitting(true)
    try {
      await fetch('https://api.ivira.app/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest: query.trim(),
          email: email.trim(),
          source: 'concierge_search',
          type: 'fitness_seeker',
        }),
      }).catch(() => {})
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div variants={fadeUp} custom={1} style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          background: t.cardBg, border: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)'}`,
          borderRadius: 16, padding: '24px 36px', maxWidth: 520, width: '100%',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>
            We'll match you with the perfect facility
          </p>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted, margin: 0 }}>
            Check your email for personalized recommendations.
          </p>
          <button onClick={() => navigate('/find-gym')} style={{
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, marginTop: 8,
            background: 'transparent', color: ACCENT, border: `1px solid ${ACCENT}44`,
            borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
          }}>
            Browse all gyms now
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={fadeUp} custom={1} style={{ textAlign: 'center', marginBottom: 56 }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        maxWidth: 520, margin: '0 auto', width: '100%',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: t.cardBg,
          border: `1px solid ${focused ? IVIRA_BLUE + '66' : t.cardBorder}`,
          borderRadius: 14, padding: '14px 20px',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          boxShadow: focused ? `0 0 20px rgba(26,58,143,0.12)` : 'none',
        }}>
          {icons.search(IVIRA_BLUE)}
          <input
            placeholder="What are you looking for? MMA, Yoga, CrossFit..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              background: 'none', border: 'none', outline: 'none', flex: 1,
              fontFamily: FONT_BODY, fontSize: 15, color: t.text,
            }}
          />
        </div>

        {/* Email + submit row — appears when query has content */}
        {query.trim().length > 0 && (
          <div style={{
            display: 'flex', gap: 10,
            animation: 'authFadeIn 0.3s ease-out forwards',
          }}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                flex: 1, padding: '13px 16px', fontSize: 14,
                fontFamily: FONT_BODY, background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 10, color: t.text, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = IVIRA_BLUE}
              onBlur={e => e.target.style.borderColor = t.cardBorder}
            />
            <button type="submit" disabled={submitting} style={{
              fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
              background: IVIRA_BLUE, color: '#FFFFFF', border: 'none',
              borderRadius: 10, padding: '13px 24px', cursor: 'pointer',
              transition: 'opacity 0.2s', whiteSpace: 'nowrap',
              opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Sending...' : 'Find My Gym'}
            </button>
          </div>
        )}

        {/* Fallback link */}
        {query.trim().length === 0 && (
          <button type="button" onClick={() => navigate('/find-gym')} style={{
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
            background: 'none', border: 'none', color: t.textMuted,
            cursor: 'pointer', padding: 4,
          }}>
            Or <span style={{ color: ACCENT, fontWeight: 600 }}>browse all gyms</span> near you
          </button>
        )}
      </form>
    </motion.div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const platform = getMobilePlatform()
  const { mode, setMode, isDark } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showGymSignUp, setShowGymSignUp] = useState(false)
  const [heroRef, heroVisible] = useScrollReveal(0.1)

  const arenas = useCounter(5000, 2200, heroVisible)
  const athletes = useCounter(100, 2200, heroVisible)
  const cityCount = useCounter(4, 1500, heroVisible)

  const { pricing, plans, geo } = useGeoPricing()

  // Instantly.ai-inspired mesh gradient for light backgrounds
  const meshGradient = `
    radial-gradient(ellipse 80% 60% at 10% 20%, rgba(99,132,255,0.28), transparent 55%),
    radial-gradient(ellipse 70% 50% at 80% 10%, rgba(120,160,255,0.22), transparent 50%),
    radial-gradient(ellipse 60% 80% at 50% 80%, rgba(150,130,255,0.18), transparent 55%),
    radial-gradient(ellipse 90% 60% at 90% 60%, rgba(100,170,255,0.15), transparent 50%),
    linear-gradient(135deg, #e8eeff 0%, #dce4fc 25%, #d0dcfa 50%, #c8d8f8 75%, #e0e8ff 100%)
  `
  const meshGradientAlt = `
    radial-gradient(ellipse 70% 50% at 30% 30%, rgba(99,132,255,0.20), transparent 55%),
    radial-gradient(ellipse 60% 60% at 70% 70%, rgba(130,150,255,0.18), transparent 50%),
    linear-gradient(135deg, #eef1ff 0%, #e4eafc 50%, #dce3fa 100%)
  `
  const meshGradientDeep = `
    radial-gradient(ellipse 80% 50% at 20% 50%, rgba(80,110,255,0.25), transparent 50%),
    radial-gradient(ellipse 70% 60% at 80% 30%, rgba(110,140,255,0.20), transparent 50%),
    radial-gradient(ellipse 60% 50% at 50% 90%, rgba(130,120,255,0.15), transparent 55%),
    linear-gradient(135deg, #e0e8ff 0%, #d4defa 50%, #ccd6f8 100%)
  `

  // ── Theme-adaptive colors ──
  const t = {
    bg:        isDark ? MATTE_BLACK : '#F4F7FF',
    bgAlt:     isDark ? SURFACE : '#EEF2FF',
    bgCarbon:  isDark ? CARBON : '#E8EDFF',
    text:      isDark ? WHITE : '#0F172A',
    textSec:   isDark ? PLATINUM : '#334155',
    textMuted: isDark ? SILVER : '#475569',
    textDim:   isDark ? GUNMETAL : '#94A3B8',
    border:    isDark ? `${GUNMETAL}33` : 'rgba(26,58,143,0.10)',
    cardBg:    isDark ? SURFACE : 'rgba(255,255,255,0.80)',
    cardBorder:isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,58,143,0.10)',
    cardShadow:isDark ? 'none' : '0 4px 20px rgba(26,58,143,0.08)',
    navBg:     isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.85)',
    navBgClear:isDark ? 'transparent' : 'rgba(255,255,255,0.5)',
    carbonBg:  isDark ? carbonFiberBg : {},
    meshBg:    isDark ? {} : { background: meshGradient },
    meshBgAlt: isDark ? {} : { background: meshGradientAlt },
    meshBgDeep:isDark ? {} : { background: meshGradientDeep },
    wordmark:  isDark ? WHITE : '#0F172A',
    selection: isDark ? SKY_ACCENT : IVIRA_BLUE,
    selText:   WHITE,
  }

  // ── Vibrant accent colors for card borders ──
  const CARD_ACCENTS = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#22C55E', // green
    '#F59E0B', // amber
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#14B8A6', // teal
    '#6366F1', // indigo
    '#D946EF', // fuchsia
    '#84CC16', // lime
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const conciergeCards = [
    { title: 'MMA / Combat', desc: 'From octagon cages to Muay Thai rings. Find elite combat training facilities with world-class coaches and competitive sparring partners.' },
    { title: 'Yoga / Wellness', desc: 'Tranquil sanctuaries for mindful practice. Hot yoga studios, meditation centers, and holistic wellness retreats curated for the discerning practitioner.' },
    { title: 'Boxing / Strength', desc: 'Raw iron and heavy bags. Powerlifting platforms, Olympic lifting zones, and boxing gyms where champions are forged.' },
  ]

  return (
    <div style={{ ...(isDark ? { background: t.bg } : t.meshBg), color: t.textSec, fontFamily: FONT_BODY, minHeight: '100vh', overflowX: 'hidden', transition: 'background 0.4s, color 0.4s' }}>

      {/* ── STICKY NAV ──────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? t.navBg : t.navBgClear,
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${t.border}` : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <div style={{
          ...containerStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 72,
        }}>
          {/* Wordmark */}
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 900,
            letterSpacing: '0.3em', color: t.wordmark, textDecoration: 'none',
          }}>
            I V I R A
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}
               className="nav-desktop">
            {[
              { label: 'Features', href: '#features' },
              { label: 'For Members', href: '#members' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Contact', href: '/contact' },
            ].map(link => (
              <a key={link.label} href={link.href} style={{
                fontFamily: FONT_NAV, fontSize: 14, fontWeight: 500,
                color: t.textMuted, textDecoration: 'none',
                transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.target.style.color = t.text}
              onMouseLeave={e => e.target.style.color = t.textMuted}>
                {link.label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}
               className="nav-ctas">
            <button onClick={() => navigate('/member/login')} style={{
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
              background: 'transparent', color: t.textMuted,
              border: 'none', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', transition: 'color 0.3s',
            }}
            onMouseEnter={e => e.target.style.color = t.text}
            onMouseLeave={e => e.target.style.color = t.textMuted}>
              Member Login
            </button>
            <button onClick={() => navigate('/login')} style={{
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
              background: 'transparent', color: t.text,
              border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)',
              borderRadius: 8,
              padding: '8px 18px', cursor: 'pointer', transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)' }}
            onMouseLeave={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}>
              Gym Owner Login
            </button>
            <button onClick={() => setShowGymSignUp(true)} style={{
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
              background: IVIRA_BLUE, color: WHITE,
              border: 'none', borderRadius: 8,
              padding: '9px 20px', cursor: 'pointer', transition: 'all 0.3s',
              boxShadow: '0 2px 8px rgba(26,58,143,0.3)',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 14px rgba(26,58,143,0.45)' }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 2px 8px rgba(26,58,143,0.3)' }}>
              Get Started
            </button>
            {/* Theme toggle */}
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center',
                color: t.textMuted, transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = t.text}
              onMouseLeave={e => e.currentTarget.style.color = t.textMuted}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div style={{ display: 'none', alignItems: 'center', gap: 8 }} className="mobile-toggle">
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: t.text, display: 'flex' }}
            >
              {isDark ? (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button onClick={() => setMobileMenu(!mobileMenu)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 8,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth="2">
                {mobileMenu
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div style={{
            background: t.bgAlt, borderTop: `1px solid ${t.border}`,
            padding: '20px 24px 28px',
          }}>
            {/* Nav Links */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Contact', to: '/contact' },
              ].map(link => link.to ? (
                <Link key={link.label} to={link.to} onClick={() => setMobileMenu(false)} style={{
                  fontFamily: FONT_NAV, fontSize: 15, fontWeight: 500,
                  color: t.textMuted, textDecoration: 'none',
                }}>{link.label}</Link>
              ) : (
                <a key={link.label} href={link.href} onClick={() => setMobileMenu(false)} style={{
                  fontFamily: FONT_NAV, fontSize: 15, fontWeight: 500,
                  color: t.textMuted, textDecoration: 'none',
                }}>{link.label}</a>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.border, marginBottom: 20 }} />

            {/* App Download Section — for members */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: FONT_NAV, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: t.textDim, marginBottom: 12,
              }}>Get the App</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {platform === 'android' && (
                  <>
                    <a href="https://api.ivira.app/downloads/ivira-latest.apk" download onClick={() => setMobileMenu(false)} style={{
                      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
                      background: `linear-gradient(135deg, ${IVIRA_BLUE}, ${ACCENT})`,
                      color: WHITE, border: 'none', borderRadius: 10,
                      padding: '14px 20px', cursor: 'pointer', width: '100%',
                      textDecoration: 'none', textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: '0 2px 10px rgba(26,58,143,0.3)',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download APK (Beta)
                    </a>
                    <div style={{
                      fontFamily: FONT_BODY, fontSize: 11, color: t.textDim,
                      textAlign: 'center', lineHeight: 1.5,
                    }}>
                      Google Play listing coming soon
                    </div>
                  </>
                )}
                {platform === 'ios' && (
                  <div style={{
                    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: 10,
                    padding: '14px 20px', textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    App Store &mdash; Coming Soon
                  </div>
                )}
                {/* Member login — always available on all mobile platforms */}
                <button onClick={() => { navigate('/member/login'); setMobileMenu(false) }} style={{
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                  background: platform === 'ios' ? IVIRA_BLUE : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  color: platform === 'ios' ? WHITE : t.text,
                  border: platform === 'ios' ? 'none' : `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: '14px 20px', cursor: 'pointer', width: '100%',
                }}>
                  {platform === 'ios' ? 'Open Member Hub in Browser' : 'Member Login'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.border, marginBottom: 20 }} />

            {/* Gym Owner Section */}
            <div>
              <div style={{
                fontFamily: FONT_NAV, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: t.textDim, marginBottom: 12,
              }}>Gym Owners</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { navigate('/login'); setMobileMenu(false) }} style={{
                  fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                  background: 'transparent', color: t.text,
                  border: `1px solid ${t.border}`, borderRadius: 10,
                  padding: '12px 0', cursor: 'pointer', flex: 1,
                }}>Login</button>
                <button onClick={() => { setShowGymSignUp(true); setMobileMenu(false) }} style={{
                  fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: t.text,
                  border: `1px solid ${t.border}`, borderRadius: 10,
                  padding: '12px 0', cursor: 'pointer', flex: 1,
                }}>Register Gym</button>
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
        ...( isDark ? { background: MATTE_BLACK, ...t.carbonBg } : { ...t.meshBg }),
      }}>
        {/* Subtle gradient overlay */}
        {isDark && <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${ACCENT_GLOW}, transparent 70%)`,
        }} />}

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 100,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            marginBottom: 40,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.2s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 8px rgba(34,197,94,0.5)',
            }} />
            <span style={{
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
              color: t.textMuted, letterSpacing: '0.02em',
            }}>
              Now serving {pricing.cities.join(', ')} and more
            </span>
          </div>

          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900, letterSpacing: '-0.02em',
            color: t.text, lineHeight: 1.1, margin: 0, marginBottom: 28,
            maxWidth: 820,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.8s ease 0.4s',
          }}>
            {isMobile
              ? 'Your Fitness. One App.'
              : 'Run Your Gym. Crush Your Goals.'}
          </h1>

          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(16px, 1.8vw, 19px)',
            color: t.textMuted, lineHeight: 1.7, maxWidth: 620, margin: '0 auto 44px',
            fontWeight: 400,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.6s',
          }}>
            {isMobile
              ? 'QR check-in, workout logging, nutrition tracking, fasting timers, AI coaching, and your membership — all in one app.'
              : 'For gym owners: member management, QR check-ins, Razorpay billing, WhatsApp notifications, analytics, and AI insights. For members: workout logging, nutrition tracking, fasting timers, step counter, and an AI coach — all in one platform.'}
          </p>

          {/* CTAs — device-aware on mobile */}
          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 16, justifyContent: 'center', alignItems: 'center',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.8s',
            maxWidth: isMobile ? 340 : 'none', margin: '0 auto',
          }}>
            {isMobile && platform === 'android' ? (
              <>
                {/* Android: APK download as primary */}
                <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
                  fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
                  background: IVIRA_BLUE, color: WHITE, border: 'none', borderRadius: 12,
                  padding: '16px 32px', cursor: 'pointer', transition: 'all 0.3s',
                  boxShadow: '0 4px 16px rgba(26,58,143,0.35)',
                  textDecoration: 'none', width: '100%', textAlign: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download I V I R A (Beta)
                </a>
                <div style={{
                  fontFamily: FONT_BODY, fontSize: 12, color: t.textDim,
                  textAlign: 'center',
                }}>
                  APK &middot; Google Play coming soon
                </div>
                <button onClick={() => navigate('/login')} style={{
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                  background: 'transparent', color: t.text,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: 12, padding: '14px 32px', cursor: 'pointer',
                  width: '100%', transition: 'all 0.3s',
                }}>
                  Gym Owner? Manage Your Business
                </button>
              </>
            ) : isMobile && platform === 'ios' ? (
              <>
                {/* iOS: App Store coming soon, fallback to browser */}
                <div style={{
                  fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600,
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  color: t.textMuted,
                  border: `1px solid ${t.border}`, borderRadius: 12,
                  padding: '16px 32px', width: '100%', textAlign: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  position: 'relative',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  App Store &mdash; Coming Soon
                </div>
                <button onClick={() => navigate('/member/login')} style={{
                  fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
                  background: IVIRA_BLUE, color: WHITE, border: 'none', borderRadius: 12,
                  padding: '16px 32px', cursor: 'pointer', transition: 'all 0.3s',
                  boxShadow: '0 4px 16px rgba(26,58,143,0.35)',
                  width: '100%', textAlign: 'center',
                }}>
                  Open Member Hub
                </button>
                <button onClick={() => navigate('/login')} style={{
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                  background: 'transparent', color: t.text,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: 12, padding: '14px 32px', cursor: 'pointer',
                  width: '100%', transition: 'all 0.3s',
                }}>
                  Gym Owner? Manage Your Business
                </button>
              </>
            ) : (
              <>
                {/* Desktop: existing CTAs */}
                <button onClick={() => setShowGymSignUp(true)} style={{
                  fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700,
                  background: IVIRA_BLUE, color: WHITE, border: 'none', borderRadius: 10,
                  padding: '14px 32px', cursor: 'pointer', transition: 'all 0.3s',
                  boxShadow: '0 4px 16px rgba(26,58,143,0.35)',
                }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 28px rgba(26,58,143,0.5)' }}
                onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(26,58,143,0.35)' }}>
                  Start Your 14-Day Free Trial
                </button>
                <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
                  fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600,
                  background: 'transparent', color: t.text,
                  border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.15)', borderRadius: 10,
                  padding: '14px 32px', cursor: 'pointer', transition: 'all 0.3s',
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download APK
                </a>
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
              { value: `${arenas.toLocaleString()}+`, label: 'Gyms' },
              { value: `${athletes}K+`, label: 'Members' },
              { value: cityCount, label: 'Cities' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 5vw, 52px)',
                  fontWeight: 900, color: t.text, letterSpacing: '-0.02em',
                }}>{stat.value}</div>
                <div style={{
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500,
                  color: t.textMuted, marginTop: 8,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Geo-specific trusted cities */}
          <div style={{
            textAlign: 'center', marginTop: 48,
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 1.6s',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 24px', borderRadius: 100,
              background: 'rgba(59,111,212,0.1)',
              border: '1px solid rgba(59,111,212,0.2)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: ACCENT,
                boxShadow: `0 0 8px ${ACCENT}`,
                animation: 'pulse 2s infinite',
              }} />
              <span style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
                color: SILVER,
              }}>
                Trusted in {pricing.cities.join(' \u00B7 ')}
              </span>
            </div>
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

      {/* ── HOW IT WORKS — Two Audiences ────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 100px) 0', ...(isDark ? { background: t.bgAlt } : t.meshBgAlt) }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ ...sectionLabel, color: t.textMuted }}>How I V I R A Works</div>
              <h2 style={{ ...sectionHeading, color: t.text, fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                Two Sides. One Platform.
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 640, margin: '0 auto', lineHeight: 1.7 }}>
                I V I R A powers both the business and the athlete. Gym owners get a complete
                command center. Members get a personal fitness companion.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
              gap: 24,
            }}>
              {/* Gym Owner Side */}
              <div style={{
                background: t.cardBg, borderRadius: 20, padding: 'clamp(28px, 4vw, 40px)',
                border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${IVIRA_BLUE}, ${ACCENT})` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${IVIRA_BLUE}12`, border: `1px solid ${IVIRA_BLUE}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icons.analytics(IVIRA_BLUE)}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: t.text, margin: 0, letterSpacing: '-0.01em' }}>
                      For Gym Owners
                    </h3>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted, margin: 0 }}>ivira.app</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { step: '01', title: 'Register your gym', desc: 'Create your account with email OTP. You\'ll get a branded dashboard at yourname.ivira.app, a unique member invite code, and a 14-day free trial — no credit card required.' },
                    { step: '02', title: 'Add members & plans', desc: 'Import members via CSV or add manually. Create membership tiers (monthly, quarterly, annual), set pricing in your currency, and connect Razorpay to accept UPI, cards, and net banking.' },
                    { step: '03', title: 'Go live', desc: 'Print your QR code for the entrance. Members scan to check in (GPS-verified). WhatsApp reminders, auto-invoicing, expiry alerts, and AI insights run on autopilot.' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14 }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                        color: ACCENT, opacity: 0.7, flexShrink: 0, marginTop: 2,
                      }}>{item.step}</div>
                      <div>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowGymSignUp(true)} style={{
                  fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, marginTop: 28,
                  background: IVIRA_BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10,
                  padding: '12px 24px', cursor: 'pointer', transition: 'opacity 0.2s', width: '100%',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Start 14-Day Free Trial
                </button>
              </div>

              {/* Member / App User Side */}
              <div style={{
                background: t.cardBg, borderRadius: 20, padding: 'clamp(28px, 4vw, 40px)',
                border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, #22C55E, #14B8A6)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icons.steps('#22C55E')}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: t.text, margin: 0, letterSpacing: '-0.01em' }}>
                      For Members & Athletes
                    </h3>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted, margin: 0 }}>app.ivira.app</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { step: '01', title: 'Sign up with your gym\'s invite code', desc: 'Your gym owner shares a unique invite link or code (GYM-XXXXXX). Enter it during sign-up to instantly link your account. Or download the Android APK for the full native experience.' },
                    { step: '02', title: 'Check in & connect', desc: 'Scan the QR code at your gym\'s entrance to check in — no cards, no queues, GPS-verified. View your membership status, remaining days, and payment history from your portal.' },
                    { step: '03', title: 'Track, train, transform', desc: 'Log workouts with sets and reps, track nutrition with macro breakdowns, monitor fasting windows, count steps, and chat with Vira AI for personalized guidance. All in one app.' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14 }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                        color: '#22C55E', opacity: 0.7, flexShrink: 0, marginTop: 2,
                      }}>{item.step}</div>
                      <div>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                  {isMobile && platform === 'android' ? (
                    <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
                      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
                      background: '#22C55E', color: '#FFFFFF', border: 'none', borderRadius: 10,
                      padding: '12px 20px', cursor: 'pointer', transition: 'opacity 0.2s', flex: 1,
                      textDecoration: 'none', textAlign: 'center',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download APK
                    </a>
                  ) : (
                    <button onClick={() => navigate('/member/login')} style={{
                      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
                      background: '#22C55E', color: '#FFFFFF', border: 'none', borderRadius: 10,
                      padding: '12px 20px', cursor: 'pointer', transition: 'opacity 0.2s', flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      Open Web App
                    </button>
                  )}
                  <button onClick={() => navigate('/member/login')} style={{
                    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                    background: 'transparent', color: t.text, flex: 1,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                    borderRadius: 10, padding: '12px 20px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#22C55E'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}>
                    Sign In
                  </button>
                </div>
              </div>

            </div>
          </div>
        </Section>
      </section>

      {/* ── BENTO TELEMETRY ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 0', background: t.bg }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ ...sectionLabel, color: t.textMuted }}>Intelligence Layer</div>
              <h2 style={{ ...sectionHeading, color: t.text }}>Performance Telemetry</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Every metric, every pattern, every insight — rendered in real time.
                Your gym's vital signs, always visible.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }} className="bento-grid">
              {bentoCards.map((card, i) => (
                <motion.div
                  key={card.key}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.3 } }}
                  style={{
                    gridColumn: card.span === 2 ? 'span 2' : 'span 1',
                    background: t.cardBg,
                    borderRadius: 16,
                    padding: 'clamp(24px, 3vw, 36px)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 200,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    cursor: 'default',
                    transition: 'border-color 0.5s, box-shadow 0.5s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = card.accent + '66'
                    e.currentTarget.style.boxShadow = `0 0 24px ${card.accent}25`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}>
                    {/* Accent gradient line */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${card.accent}, ${card.accent}44, transparent)`,
                    }} />
                    {/* Sparkline chart background */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                      opacity: 0.18, pointerEvents: 'none',
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData[card.key] || sparkData.realtime}>
                          <defs>
                            <linearGradient id={`grad-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={card.accent} stopOpacity={0.8} />
                              <stop offset="100%" stopColor={card.accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={card.accent} strokeWidth={1.5}
                            fill={`url(#grad-${card.key})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginBottom: 16, opacity: 0.8, position: 'relative', zIndex: 1 }}>
                      {icons[card.icon] && icons[card.icon](card.accent)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
                      letterSpacing: '-0.01em',
                      color: t.text, margin: 0, marginBottom: 10,
                      position: 'relative', zIndex: 1,
                    }}>{card.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 14, color: t.textMuted,
                      lineHeight: 1.6, margin: 0,
                      position: 'relative', zIndex: 1,
                    }}>{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── COMMAND CENTER (Owner Features) ─────────────────── */}
      <section id="features" style={{ padding: 'clamp(60px, 10vw, 120px) 0', ...(isDark ? { background: t.bgCarbon, ...t.carbonBg } : t.meshBgDeep) }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ ...sectionLabel, color: t.textMuted }}>For Gym Owners</div>
              <h2 style={{ ...sectionHeading, color: t.text }}>The Command Center</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
                Member management, billing, check-ins, staff, classes, analytics, AI coaching,
                and marketing — everything your gym needs in a single dashboard. No spreadsheets.
                No third-party tools.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {ownerFeatures.map((feat, i) => {
                const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
                return (
                <motion.div key={feat.icon + i} custom={i} variants={fadeUp}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}
                  whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.3 } }}>
                  <div style={{
                    background: t.cardBg, borderRadius: 16, padding: 28,
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    transition: 'border-color 0.5s, box-shadow 0.5s',
                    height: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = accent + '55'
                    e.currentTarget.style.boxShadow = `0 4px 20px ${accent}22`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = t.cardBorder
                    e.currentTarget.style.boxShadow = t.cardShadow
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: accent,
                    }} />
                    <div style={{ marginBottom: 16 }}>
                      {icons[feat.icon] && icons[feat.icon](accent)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700,
                      letterSpacing: '-0.01em',
                      color: t.text, margin: 0, marginBottom: 10,
                    }}>{feat.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted,
                      lineHeight: 1.6, margin: 0,
                    }}>{feat.desc}</p>
                    {feat.highlights && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                        {feat.highlights.map(h => (
                          <span key={h} style={{
                            fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
                            color: accent, background: accent + '12',
                            padding: '3px 10px', borderRadius: 6, letterSpacing: '0.01em',
                          }}>{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
                )
              })}
            </div>
          </div>
        </Section>
      </section>

      {/* ── PERFORMANCE SUITE (Seeker Features) ────────────── */}
      <section id="members" style={{ padding: 'clamp(60px, 10vw, 120px) 0', ...(isDark ? { background: t.bgAlt } : t.meshBgAlt) }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ ...sectionLabel, color: t.textMuted }}>For Fitness Seekers</div>
              <h2 style={{ ...sectionHeading, color: t.text }}>Your Performance Suite</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
                Gym finder, workout logging, nutrition tracking, fasting timers, step counting,
                AI coaching, leaderboards, and more — whether you\'re a member or exploring new gyms.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {seekerFeatures.map((feat, i) => {
                const accent = CARD_ACCENTS[(i + 3) % CARD_ACCENTS.length]
                return (
                <motion.div key={feat.icon + i} custom={i} variants={fadeUp}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}
                  whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.3 } }}>
                  <div style={{
                    background: t.cardBg, borderRadius: 16, padding: 28,
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    transition: 'border-color 0.5s, box-shadow 0.5s',
                    height: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = accent + '55'
                    e.currentTarget.style.boxShadow = `0 4px 20px ${accent}22`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = t.cardBorder
                    e.currentTarget.style.boxShadow = t.cardShadow
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: accent,
                    }} />
                    <div style={{ marginBottom: 16 }}>
                      {icons[feat.icon] && icons[feat.icon](accent)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700,
                      letterSpacing: '-0.01em',
                      color: t.text, margin: 0, marginBottom: 10,
                    }}>{feat.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted,
                      lineHeight: 1.6, margin: 0,
                    }}>{feat.desc}</p>
                    {feat.highlights && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                        {feat.highlights.map(h => (
                          <span key={h} style={{
                            fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
                            color: accent, background: accent + '12',
                            padding: '3px 10px', borderRadius: 6, letterSpacing: '0.01em',
                          }}>{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
                )
              })}
            </div>
          </div>
        </Section>
      </section>

      {/* ── CONCIERGE ───────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(60px, 10vw, 120px) 0',
        ...(isDark ? { background: t.bg, ...t.carbonBg } : t.meshBg),
        position: 'relative',
      }}>
        {isDark && <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${ACCENT_GLOW}, transparent 60%)`,
        }} />}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          <div style={{ ...containerStyle, position: 'relative', zIndex: 1 }}>
            <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ ...sectionLabel, color: t.textMuted }}>Bespoke Matching</div>
              <h2 style={{ ...sectionHeading, color: t.text }}>Elite Training Concierge</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
                From MMA cages to yoga sanctuaries, from boxing rings to CrossFit boxes
                — our concierge finds the perfect training facility for your discipline.
              </p>
            </motion.div>

            {/* Lead Capture Search */}
            <ConciergeLeadCapture isDark={isDark} t={t} navigate={navigate} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
            }}>
              {conciergeCards.map((card, i) => {
                const accent = ['#EF4444', '#3B82F6', '#22C55E'][i]
                return (
                <motion.div key={card.title} custom={i + 2} variants={scaleIn}
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}>
                  <div style={{
                    background: t.cardBg, borderRadius: 16,
                    padding: 40, textAlign: 'center',
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    position: 'relative', overflow: 'hidden',
                    transition: 'border-color 0.5s, box-shadow 0.5s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = accent + '55'
                    e.currentTarget.style.boxShadow = `0 4px 20px ${accent}22`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = t.cardBorder
                    e.currentTarget.style.boxShadow = t.cardShadow
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: accent,
                    }} />
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: accent === ACCENT ? ACCENT_GLOW : BLUE_GLOW,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 24px',
                    }}>
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 900,
                        color: accent, letterSpacing: '0.1em',
                      }}>{['I', 'II', 'III'][i]}</div>
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700,
                      letterSpacing: '-0.01em',
                      color: t.text, margin: 0, marginBottom: 16,
                    }}>{card.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 15, color: t.textMuted,
                      lineHeight: 1.7, margin: 0,
                    }}>{card.desc}</p>
                  </div>
                </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── MEMBER EXPERIENCE ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 0', ...(isDark ? { background: t.bgCarbon } : t.meshBgDeep) }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ ...sectionHeading, color: t.text, fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                A Premium Experience for Your Members.
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 700, margin: '0 auto', lineHeight: 1.7 }}>
                Members access your gym through a PWA (Progressive Web App) that works like a native app — no App Store download required. Instant check-in, payment history, GST invoices, and a built-in store. Install to home screen for the full app experience.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
            }}>
              {[
                { icon: 'shield', title: '30-Second QR Rotation', desc: 'Your QR code refreshes every 30 seconds, making screenshots useless. GPS verification ensures you\'re physically at the gym. The most secure check-in system available.', accent: '#8B5CF6' },
                { icon: 'qr', title: 'Tap to Enter (NFC)', desc: 'On Android, simply tap your phone at the gym entrance — no app to open, no QR to scan. NFC-powered instant check-in. Members love the speed. Gym owners love the accuracy.', accent: '#3B82F6' },
                { icon: 'payment', title: 'Invoices, Payments & Store', desc: 'View complete payment history with downloadable GST invoices. Browse and buy from your gym\'s curated store — supplements, gear, accessories — all with integrated checkout.', accent: '#22C55E' },
              ].map((card, i) => (
                <motion.div key={card.title} custom={i} variants={scaleIn}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
                  <div style={{
                    background: t.cardBg, borderRadius: 16, padding: 32,
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    position: 'relative', overflow: 'hidden',
                    height: '100%',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: card.accent,
                    }} />
                    <div style={{ marginBottom: 20 }}>
                      {icons[card.icon] && icons[card.icon](card.accent)}
                    </div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
                      color: t.text, margin: 0, marginBottom: 12,
                    }}>{card.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 14, color: t.textMuted,
                      lineHeight: 1.6, margin: 0,
                    }}>{card.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── WHY I V I R A ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 0', ...(isDark ? { background: t.bgAlt } : t.meshBgAlt) }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ ...sectionLabel, color: t.textMuted }}>Why I V I R A</div>
              <h2 style={{ ...sectionHeading, color: t.text, fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                Built Different.
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
                Not another generic gym management SaaS. I V I R A is a complete fitness ecosystem
                that serves both sides of the gym — the business and the athlete.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 20,
            }}>
              {[
                {
                  title: 'Two-Sided Platform',
                  desc: 'Most gym software only serves owners. I V I R A gives members their own app experience — workouts, nutrition, AI coaching — while gym owners get a complete management dashboard.',
                  accent: IVIRA_BLUE,
                  number: '01',
                },
                {
                  title: 'PWA + Native Apps',
                  desc: 'Members get an installable Progressive Web App that works offline. Gym owners get a full dashboard. Android APK available now. iOS coming soon. No App Store dependency.',
                  accent: '#22C55E',
                  number: '02',
                },
                {
                  title: 'AI-Powered Wellness',
                  desc: 'Vira, our AI coach, provides personalized workout plans, nutrition guidance, and wellness recommendations. Not just a chatbot — a comprehensive health intelligence layer.',
                  accent: '#8B5CF6',
                  number: '03',
                },
                {
                  title: 'Invite Code System',
                  desc: 'Gym owners share a unique code (GYM-XXXXXX). Members enter it during sign-up and are instantly linked. Deep-linkable URLs make onboarding frictionless.',
                  accent: '#F59E0B',
                  number: '04',
                },
                {
                  title: 'Geo-Localized Pricing',
                  desc: 'Pricing automatically adjusts to your country using purchasing power parity. Fair pricing whether you\'re in Bengaluru, New York, London, or Dubai.',
                  accent: '#EF4444',
                  number: '05',
                },
                {
                  title: 'White-Label Branding',
                  desc: 'Every gym gets a custom subdomain (yourgym.ivira.app) with their branding. Members see your gym\'s identity, not ours. Your brand, your portal.',
                  accent: '#06B6D4',
                  number: '06',
                },
              ].map((item, i) => (
                <motion.div key={item.number} custom={i} variants={fadeUp}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
                  <div style={{
                    background: t.cardBg, borderRadius: 16, padding: 28,
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
                    height: '100%',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: item.accent }} />
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                      color: item.accent, opacity: 0.6, marginBottom: 12,
                    }}>{item.number}</div>
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700,
                      color: t.text, margin: 0, marginBottom: 10, letterSpacing: '-0.01em',
                    }}>{item.title}</h3>
                    <p style={{
                      fontFamily: FONT_BODY, fontSize: 14, color: t.textMuted,
                      lineHeight: 1.65, margin: 0,
                    }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── YOUR BRAND, YOUR WEBSITE ──────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 10vw, 120px) 0', ...(isDark ? { background: t.bg } : t.meshBg) }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <h2 style={{ ...sectionHeading, color: t.text, fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                Your Brand, Your Website
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
                Every gym gets a custom-branded dashboard with its own subdomain.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
            }}>
              {[
                { name: 'Iron Temple', subdomain: 'irontemple.ivira.app', accent: '#EA4335' },
                { name: 'Ocean Fitness', subdomain: 'oceanfit.ivira.app', accent: IVIRA_BLUE },
                { name: 'Forest Gym', subdomain: 'forestgym.ivira.app', accent: '#34A853' },
              ].map((gym, i) => (
                <motion.div key={gym.name} custom={i} variants={scaleIn}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
                  <div style={{
                    background: t.cardBg, borderRadius: 16, padding: 28,
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    position: 'relative', overflow: 'hidden',
                    height: '100%',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: gym.accent,
                    }} />
                    <h3 style={{
                      fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
                      color: t.text, margin: 0, marginBottom: 6,
                    }}>{gym.name}</h3>
                    <p style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: t.textDim,
                      margin: '0 0 20px',
                    }}>{gym.subdomain}</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      {['Members', 'Payments', 'Store'].map(tab => (
                        <span key={tab} style={{
                          fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500,
                          color: t.textMuted, padding: '6px 14px', borderRadius: 8,
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.cardBorder}`,
                        }}>{tab}</span>
                      ))}
                    </div>
                    <div style={{
                      height: 8, borderRadius: 4,
                      background: gym.accent, opacity: 0.8, width: '60%',
                    }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: 'clamp(60px, 10vw, 120px) 0', background: t.bg }}>
        <Section>
          <div style={containerStyle}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ ...sectionHeading, color: t.text, fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
                Transparent pricing. No surprises.
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted, maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7 }}>
                Start with a 14-day free trial. Scale as you grow.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24, alignItems: 'stretch',
            }}>
              {plans.map((plan, i) => {
                const pricingColors = ['#3B82F6', '#22C55E', '#8B5CF6']
                const planAccent = pricingColors[i]
                return (
                <motion.div key={plan.name} custom={i} variants={scaleIn}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
                  style={{ position: 'relative' }}>

                  {plan.best && (
                    <div style={{
                      position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                      fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: WHITE, background: IVIRA_BLUE,
                      padding: '5px 20px', borderRadius: 100, zIndex: 2,
                      whiteSpace: 'nowrap',
                    }}>Most Popular</div>
                  )}

                  <div style={{
                    background: t.cardBg, borderRadius: 16, padding: 40,
                    position: 'relative', overflow: 'hidden',
                    border: plan.best ? `1px solid ${IVIRA_BLUE}66` : `1px solid ${t.cardBorder}`,
                    boxShadow: t.cardShadow,
                    transition: 'border-color 0.5s, box-shadow 0.5s',
                    height: '100%', display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = plan.best ? IVIRA_BLUE : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')
                    e.currentTarget.style.boxShadow = plan.best ? `0 0 30px rgba(26,58,143,0.3)` : (isDark ? '0 0 20px rgba(255,255,255,0.05)' : '0 4px 20px rgba(0,0,0,0.08)')
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = plan.best ? IVIRA_BLUE + '66' : t.cardBorder
                    e.currentTarget.style.boxShadow = t.cardShadow
                  }}>
                    {/* Color accent border */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: planAccent,
                    }} />

                    <h3 style={{
                      fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500,
                      color: t.textMuted, margin: 0, marginBottom: 16,
                    }}>{plan.name}</h3>

                    <div style={{ marginBottom: 32 }}>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 900,
                        color: t.text, letterSpacing: '-0.02em',
                      }}>{pricing.symbol}{plan.price}</span>
                      <span style={{
                        fontFamily: FONT_BODY, fontSize: 15, color: t.textDim,
                        marginLeft: 4,
                      }}>{plan.period}</span>
                    </div>

                    <div style={{ flex: 1 }}>
                      {plan.features.map(f => (
                        <div key={f} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          marginBottom: 14,
                        }}>
                          {icons.check(plan.best ? IVIRA_BLUE : t.textMuted)}
                          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: t.textSec }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => navigate('/login')} style={{
                      fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
                      background: plan.best ? IVIRA_BLUE : 'transparent',
                      color: plan.best ? WHITE : t.text,
                      border: plan.best ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      borderRadius: 10, padding: '14px 24px', cursor: 'pointer',
                      width: '100%', marginTop: 24, transition: 'all 0.3s',
                    }}
                    onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.opacity = '0.9' }}
                    onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.opacity = '1' }}>
                      Get Started
                    </button>
                  </div>
                </motion.div>
                )
              })}
            </div>
          </div>
        </Section>
      </section>

      {/* ── DOWNLOAD ────────────────────────────────────────── */}
      <section id="download" style={{
        padding: 'clamp(60px, 10vw, 100px) 0',
        ...(isDark ? { background: t.bgCarbon, ...t.carbonBg } : t.meshBgDeep),
        position: 'relative',
      }}>
        {isDark && <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 50% 60% at 50% 0%, ${ACCENT_GLOW}, transparent 50%)`,
        }} />}
        <Section>
          <div style={{ ...containerStyle, position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ ...sectionLabel, color: t.textMuted }}>Mobile</div>
            <h2 style={{ ...sectionHeading, color: t.text, marginBottom: 16 }}>Download the App</h2>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 17, color: t.textMuted,
              maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.7,
            }}>
              Take the full I V I R A experience with you. Available on every platform.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* App Store - Coming Soon (links to backend) */}
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" style={{
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: 14, padding: '20px 32px',
                display: 'flex', alignItems: 'center',
                gap: 14, minWidth: 200, opacity: 0.55, position: 'relative',
                textDecoration: 'none', cursor: 'default',
                boxShadow: t.cardShadow,
              }} onClick={e => e.preventDefault()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill={t.text}><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: t.textMuted, display: 'block' }}>Download on the</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: t.text }}>App Store</span>
                </div>
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600,
                  color: WHITE, background: ACCENT,
                  padding: '3px 10px', borderRadius: 6,
                }}>Coming Soon</span>
              </a>

              {/* Google Play - Coming Soon */}
              <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" style={{
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                borderRadius: 14, padding: '20px 32px',
                display: 'flex', alignItems: 'center',
                gap: 14, minWidth: 200, opacity: 0.55, position: 'relative',
                textDecoration: 'none', cursor: 'default',
                boxShadow: t.cardShadow,
              }} onClick={e => e.preventDefault()}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/><path d="M17.727 8.273L5.226.697a1.002 1.002 0 00-1.022.023L13.792 12l3.935-3.727z" fill="#EA4335"/><path d="M13.792 12l3.935 3.727-8.501 5.025-1.022.584L4.204 22.163 13.792 12z" fill="#34A853"/><path d="M20.391 10.108l-2.664-1.835L13.792 12l3.935 3.727 2.664-1.574c.732-.494.732-1.645 0-2.14l-2.664-1.574 2.664-1.331z" fill="#FBBC05"/></svg>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: t.textMuted, display: 'block' }}>Get it on</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: t.text }}>Google Play</span>
                </div>
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600,
                  color: WHITE, background: ACCENT,
                  padding: '3px 10px', borderRadius: 6,
                }}>Coming Soon</span>
              </a>

              {/* Download APK - Available to all users */}
              <a href="https://api.ivira.app/downloads/ivira-latest.apk" download style={{
                background: isDark ? 'rgba(26,58,143,0.15)' : 'rgba(26,58,143,0.06)',
                border: `2px solid ${isDark ? 'rgba(59,130,246,0.4)' : 'rgba(26,58,143,0.2)'}`,
                borderRadius: 14, padding: '20px 32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                gap: 14, transition: 'all 0.3s', minWidth: 200, textDecoration: 'none',
                boxShadow: isDark ? '0 4px 20px rgba(26,58,143,0.2)' : '0 4px 20px rgba(26,58,143,0.1)',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(26,58,143,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(59,130,246,0.4)' : 'rgba(26,58,143,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 20px rgba(26,58,143,0.2)' : '0 4px 20px rgba(26,58,143,0.1)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `linear-gradient(135deg, ${IVIRA_BLUE}, ${ACCENT})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: ACCENT, fontWeight: 600, display: 'block' }}>Android Beta</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: t.text }}>Download APK</span>
                </div>
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700,
                  color: WHITE, background: '#22C55E',
                  padding: '3px 10px', borderRadius: 6,
                }}>Available</span>
              </a>

              {/* Open Web App */}
              <a href="/member/login" style={{
                background: isDark ? 'rgba(26,58,143,0.15)' : 'rgba(26,58,143,0.06)',
                border: `2px solid ${isDark ? 'rgba(59,130,246,0.4)' : 'rgba(26,58,143,0.2)'}`,
                borderRadius: 14, padding: '20px 32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                gap: 14, transition: 'all 0.3s', minWidth: 200, textDecoration: 'none',
                boxShadow: isDark ? '0 4px 20px rgba(26,58,143,0.2)' : '0 4px 20px rgba(26,58,143,0.1)',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(26,58,143,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(59,130,246,0.4)' : 'rgba(26,58,143,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 20px rgba(26,58,143,0.2)' : '0 4px 20px rgba(26,58,143,0.1)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `linear-gradient(135deg, ${IVIRA_BLUE}, ${ACCENT})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8M12 8v8" /></svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: ACCENT, fontWeight: 600, display: 'block' }}>Try it now</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: t.text }}>Open Web App</span>
                </div>
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700,
                  color: WHITE, background: '#22C55E',
                  padding: '3px 10px', borderRadius: 6,
                }}>Live</span>
              </a>
            </div>

            {/* Feedback prompt */}
            <div style={{
              marginTop: 32, padding: '16px 24px',
              background: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(26,58,143,0.04)',
              border: `1px solid ${isDark ? 'rgba(59,130,246,0.15)' : 'rgba(26,58,143,0.1)'}`,
              borderRadius: 12, maxWidth: 520, margin: '32px auto 0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>💬</span>
              <p style={{
                fontFamily: FONT_BODY, fontSize: 13, color: t.textMuted,
                lineHeight: 1.6, margin: 0, textAlign: 'left',
              }}>
                Try the I V I R A app! We'd love your feedback.{' '}
                <a href="/contact" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>
                  Share your thoughts
                </a>{' '}
                to help us improve before the official launch.
              </p>
            </div>
          </div>
        </Section>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        padding: '60px 0 40px', background: t.bg,
        borderTop: `1px solid ${t.border}`,
      }}>
        <div style={{
          ...containerStyle,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
        }}>
          {/* Wordmark */}
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 900,
            letterSpacing: '0.3em', color: t.text, textDecoration: 'none',
          }}>
            I V I R A
          </Link>

          {/* Links */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Dashboard', to: '/login' },
              { label: 'Member Login', to: '/member/login' },
              { label: 'Find Gym', to: '/find-gym' },
              { label: 'Download App', to: '/app' },
              { label: 'Privacy', to: '/privacy' },
              { label: 'Terms', to: '/terms' },
              { label: 'Contact', to: '/contact' },
            ].map(link => (
              <Link key={link.label} to={link.to} style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
                color: t.textMuted, textDecoration: 'none',
                transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.target.style.color = t.text}
              onMouseLeave={e => e.target.style.color = t.textMuted}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 48, height: 1, background: t.textDim }} />

          {/* Bottom */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT_BODY, fontSize: 13, color: t.textDim,
            }}>
              &copy; {new Date().getFullYear()} I V I R A. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* ── RESPONSIVE STYLES ───────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-ctas { display: none !important; }
          .mobile-toggle { display: flex !important; }
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid > * {
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
          background: ${t.selection};
          color: ${t.selText};
        }
      `}</style>

      {/* Gym Owner Sign-Up Modal */}
      <GymSignUpModal open={showGymSignUp} onClose={() => setShowGymSignUp(false)} isDark={isDark} />
    </div>
  )
}
