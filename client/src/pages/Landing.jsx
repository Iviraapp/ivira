import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import StoreLinks from '../components/StoreLinks'
import LeadCaptureModal from '../components/LeadCaptureModal'

function getTheme(isDark) {
  return isDark ? {
    bg: '#000000', bgSec: '#0A0A0A', bgTer: '#141414',
    text: '#EDEDED', textSec: '#A0A0A0', textTer: '#666666',
    border: '#1A1A1A', borderStrong: '#2A2A2A',
    accent: '#7C3AED', accentSoft: 'rgba(124,58,237,0.12)',
    green: '#34A853', amber: '#FBBC05', red: '#EA4335',
    rowHover: '#080808', tableBorder: '#1A1A1A',
  } : {
    bg: '#F9FAFB', bgSec: '#FFFFFF', bgTer: '#F1F3F4',
    text: '#111827', textSec: '#4B5563', textTer: '#6B7280',
    border: '#E5E7EB', borderStrong: '#D1D5DB',
    accent: '#7C3AED', accentSoft: 'rgba(124,58,237,0.08)',
    green: '#34A853', amber: '#FBBC05', red: '#EA4335',
    rowHover: '#F9FAFB', tableBorder: '#EDEDED',
  }
}

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

let T = getTheme(true) // default dark

function useScrollReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Section({ children, style, delay = 0 }) {
  const [ref, vis] = useScrollReveal()
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  )
}

function BentoCard({ title, desc, icon, span, children }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: T.bgSec, border: `1px solid ${hov ? T.borderStrong : T.border}`,
        borderRadius: 16, padding: 28, gridColumn: span || 'span 1',
        transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? '0 12px 40px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div style={{ fontSize: 13, color: T.textTer, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: FONT }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, fontFamily: FONT }}>
        {desc}
      </div>
      {children}
    </div>
  )
}

/* ── SVG Icons for Bento Cards ── */
const NutritionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" opacity="0.3" />
    <path d="M12 6v6l4 2" />
  </svg>
)
const TrainerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)
const PayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
)
const CheckIcon = ({ light }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke={light ? '#000000' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const LockIcon = ({ tooltip, light }) => (
  <span title={tooltip || undefined}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={light ? '#9CA3AF' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  </span>
)

/* ── Macro Ring for Nutrition Card ── */
function MiniMacroRing({ label, pct, color }) {
  const r = 16, circ = 2 * Math.PI * r, off = circ * (1 - pct)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke={T.bgTer} strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round" transform="rotate(-90 20 20)" />
        <text x="20" y="22" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily={FONT_M}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span style={{ fontSize: 9, color: T.textTer, fontFamily: FONT, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
    </div>
  )
}

/* ── Comparison Table ── */
const COMPARISON_SECTIONS = [
  { section: 'CORE OPS', features: [
    { name: 'Member Management', standard: true, pro: true, enterprise: true },
    { name: 'Secure QR Check-ins', standard: true, pro: true, enterprise: true },
    { name: 'Automated GST Billing', standard: true, pro: true, enterprise: true },
    { name: 'Basic Analytics', standard: true, pro: true, enterprise: true },
    { name: 'Pro-Shop / Store', standard: true, pro: true, enterprise: true },
    { name: 'Class Scheduling', standard: true, pro: true, enterprise: true },
  ]},
  { section: 'REVENUE ENGINES', features: [
    { name: 'Staff Management', standard: false, pro: true, enterprise: true },
    { name: 'Staff Performance', standard: false, pro: true, enterprise: true },
    { name: 'Trainer Marketplace', standard: false, pro: true, enterprise: true },
    { name: 'Affiliate Program', standard: false, pro: true, enterprise: true },
    { name: 'Newsletter & Campaigns', standard: false, pro: true, enterprise: true },
    { name: 'Advanced Analytics', standard: false, pro: true, enterprise: true },
    { name: 'AI Nutritionist', standard: false, pro: true, enterprise: true },
  ]},
  { section: 'ENTERPRISE SCALE', features: [
    { name: 'WhatsApp Marketing', standard: false, pro: false, enterprise: true },
    { name: 'Custom Domain', standard: false, pro: false, enterprise: true },
    { name: 'API Access', standard: false, pro: false, enterprise: true },
    { name: 'White-Label Branding', standard: false, pro: false, enterprise: true },
    { name: 'Dedicated Account Manager', standard: false, pro: false, enterprise: true },
    { name: 'Multi-Location', standard: false, pro: false, enterprise: true },
    { name: 'Priority Support (Live)', standard: false, pro: false, enterprise: true },
  ]},
]

function ComparisonTable({ onCTA }) {
  const isLight = T.bg === '#F9FAFB'
  const [hovRow, setHovRow] = useState(null)
  const cols = [
    { key: 'standard', label: 'Standard', price: '₹8,999' },
    { key: 'pro', label: 'Pro', price: '₹15,999', popular: true },
    { key: 'enterprise', label: 'Enterprise', price: '₹29,999' },
  ]

  let rowIdx = 0

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        width: '100%', minWidth: 640, borderCollapse: 'collapse', fontFamily: FONT,
      }}>
        <thead>
          <tr>
            <th style={{
              position: 'sticky', top: 0, zIndex: 10, background: T.bg,
              textAlign: 'left', padding: '16px 16px 12px', fontSize: 12, fontWeight: 600,
              color: T.textTer, letterSpacing: '0.06em', textTransform: 'uppercase',
              borderBottom: `1px solid ${T.tableBorder}`,
            }}>Service</th>
            {cols.map(c => (
              <th key={c.key} style={{
                position: 'sticky', top: 0, zIndex: 10, background: T.bg,
                textAlign: 'center', padding: '16px 12px 12px',
                borderBottom: c.popular ? `2px solid ${T.accent}` : `1px solid ${T.tableBorder}`,
                borderLeft: c.popular ? `1px solid ${T.accent}30` : 'none',
                borderRight: c.popular ? `1px solid ${T.accent}30` : 'none',
                ...(c.popular ? { boxShadow: '0 0 40px -10px rgba(124, 58, 237, 0.3)' } : {}),
              }}>
                {c.popular && (
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#fff', background: '#7C3AED',
                    padding: '2px 10px', borderRadius: 10, display: 'inline-block',
                    marginBottom: 6, letterSpacing: '0.06em', fontFamily: FONT,
                  }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.label}</div>
                <div style={{ fontSize: 12, color: T.textTer, fontFamily: FONT_M, marginTop: 2 }}>{c.price}/mo</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_SECTIONS.map(sec => {
            const rows = sec.features.map(f => {
              const ri = rowIdx++
              return (
                <tr key={f.name}
                  onMouseEnter={() => setHovRow(ri)} onMouseLeave={() => setHovRow(null)}
                  style={{ background: hovRow === ri ? T.rowHover : 'transparent', transition: 'background 0.15s' }}
                >
                  <td style={{
                    padding: '12px 16px', fontSize: 13, fontWeight: 500, color: T.textSec,
                    borderBottom: `1px solid ${T.tableBorder}`,
                  }}>{f.name}</td>
                  {cols.map(c => (
                    <td key={c.key} style={{
                      textAlign: 'center', padding: '12px',
                      borderBottom: `1px solid ${T.tableBorder}`,
                      borderLeft: c.popular ? `1px solid ${T.accent}10` : 'none',
                      borderRight: c.popular ? `1px solid ${T.accent}10` : 'none',
                      ...(c.popular ? { boxShadow: '0 0 40px -10px rgba(124, 58, 237, 0.3)' } : {}),
                    }}>
                      {f[c.key] ? <CheckIcon light={isLight} /> : <LockIcon light={isLight} tooltip={c.key === 'standard' ? 'Unlock with Pro Package' : undefined} />}
                    </td>
                  ))}
                </tr>
              )
            })
            return [
              <tr key={`section-${sec.section}`}>
                <td colSpan={4} style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: 2,
                  color: '#555', padding: '20px 16px 8px', fontWeight: 700, fontFamily: FONT,
                }}>{sec.section}</td>
              </tr>,
              ...rows,
            ]
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: '20px 16px' }} />
            {cols.map(c => (
              <td key={c.key} style={{ textAlign: 'center', padding: '20px 12px' }}>
                <button onClick={() => onCTA(c.label)} style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: c.popular ? T.accent : T.text, color: c.popular ? '#fff' : T.bg,
                  fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                  transition: 'transform 0.2s', width: '100%', maxWidth: 160,
                }}>Get Started</button>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* ── Affiliate Calculator ── */
function AffiliateCalculator() {
  const [members, setMembers] = useState(100)
  const [spend, setSpend] = useState(2000)
  const commission = Math.round(members * spend * 0.12)

  return (
    <div style={{
      background: T.bgSec, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32,
      maxWidth: 520, margin: '0 auto',
    }}>
      <div style={{ fontSize: 13, color: T.textTer, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20, fontFamily: FONT }}>
        <PayoutIcon /> Commission Calculator
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: T.textSec, fontFamily: FONT }}>Active Members</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT_M }}>{members}</span>
        </div>
        <input type="range" min="10" max="500" value={members} onChange={e => setMembers(+e.target.value)}
          style={{ width: '100%', accentColor: T.accent, height: 4, cursor: 'pointer' }}
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: T.textSec, fontFamily: FONT }}>Avg Monthly Spend</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT_M }}>{'\u20B9'}{spend.toLocaleString('en-IN')}</span>
        </div>
        <input type="range" min="500" max="5000" step="100" value={spend} onChange={e => setSpend(+e.target.value)}
          style={{ width: '100%', accentColor: T.accent, height: 4, cursor: 'pointer' }}
        />
      </div>
      <div style={{
        borderTop: `1px solid ${T.border}`, paddingTop: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.textTer, fontFamily: FONT, marginBottom: 4 }}>YOUR MONTHLY COMMISSION</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.accent, fontFamily: FONT_M, letterSpacing: '-0.02em' }}>
            {'\u20B9'}{commission.toLocaleString('en-IN')}
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 8, background: T.accentSoft,
          fontSize: 12, fontWeight: 700, color: T.accent, fontFamily: FONT_M,
        }}>12% rate</div>
      </div>
    </div>
  )
}

function PricingCard({ name, price, features, popular, onCTA }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: popular ? T.bgTer : T.bgSec,
        border: `1px solid ${popular ? T.accent : T.border}`,
        borderRadius: 16, padding: 32, position: 'relative',
        transition: 'all 0.3s', flex: '1 1 300px', maxWidth: 380,
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: popular ? (T.bg === '#F9FAFB' ? '0 8px 32px rgba(124,58,237,0.15)' : `0 0 60px ${T.accentSoft}`) : 'none',
      }}
    >
      {popular && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: T.accent, color: '#fff', padding: '4px 16px', borderRadius: 20,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: FONT,
        }}>MOST POPULAR</div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: T.textSec, marginBottom: 8, fontFamily: FONT }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: T.text, fontFamily: FONT_M, letterSpacing: '-0.03em' }}>₹{price}</span>
        <span style={{ fontSize: 14, color: T.textTer, fontFamily: FONT }}>/mo</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {features.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: T.textSec, fontFamily: FONT }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {f}
          </div>
        ))}
      </div>
      <button onClick={onCTA} style={{
        width: '100%', padding: '12px 24px', borderRadius: 10, border: 'none',
        background: popular ? T.accent : T.text, color: popular ? '#fff' : '#000',
        fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
        transition: 'all 0.2s', letterSpacing: '-0.01em',
      }}>Get Started</button>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const [leadModal, setLeadModal] = useState(false)
  const [isDark, setIsDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  T = getTheme(isDark)
  useEffect(() => { setLoaded(true) }, [])

  useEffect(() => {
    document.title = 'IVIRA | Enterprise Gym Management Software India | Automated Billing & Secure Access'

    const setMeta = (name, content, property) => {
      const attr = property ? 'property' : 'name'
      const key = property || name
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', 'IVIRA is India\'s leading gym management software. Automate member check-ins, streamline GST billing, and protect revenue with secure gym access control. Start your 14-day free trial.')
    setMeta(null, 'IVIRA | Enterprise Gym Management Software India', 'og:title')
    setMeta(null, 'Automate member check-ins, streamline GST invoicing, and protect your revenue with India\'s most secure fitness platform. Automated gym billing and secure gym access control.', 'og:description')
    setMeta(null, 'website', 'og:type')
    setMeta('keywords', 'Gym Management Software India, Automated Gym Billing, Secure Gym Access Control, GST Invoicing Gym, Fitness Center Software')
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: FONT, overflowX: 'hidden', transition: 'background-color 0.5s ease, color 0.5s ease' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '2px', fontFamily: FONT }}>IVIRA</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: 14, color: T.textSec, textDecoration: 'none', fontFamily: FONT }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: T.textSec, textDecoration: 'none', fontFamily: FONT }}>Pricing</a>
          <button onClick={() => navigate('/login')} style={{
            padding: '8px 20px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: 'transparent', color: T.text, fontSize: 13, fontWeight: 600,
            fontFamily: FONT, cursor: 'pointer', transition: 'all 0.2s',
          }}>Log In</button>
          <button onClick={(e) => {
            const x = e.clientX
            const y = e.clientY
            const endRadius = Math.hypot(
              Math.max(x, window.innerWidth - x),
              Math.max(y, window.innerHeight - y)
            )

            if (document.startViewTransition) {
              const transition = document.startViewTransition(() => {
                setIsDark(d => !d)
              })
              transition.ready.then(() => {
                document.documentElement.animate(
                  {
                    clipPath: [
                      `circle(0px at ${x}px ${y}px)`,
                      `circle(${endRadius}px at ${x}px ${y}px)`,
                    ],
                  },
                  {
                    duration: 500,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: '::view-transition-new(root)',
                  }
                )
              })
            } else {
              setIsDark(d => !d)
            }
          }} style={{
            width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
            background: 'transparent', color: T.textSec, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            {isDark ? <svg className="theme-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg> : <svg className="theme-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 24px 80px', position: 'relative',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(${T.textTer} 1px, transparent 1px), linear-gradient(90deg, ${T.textTer} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: `radial-gradient(circle, ${T.accentSoft}, transparent 70%)`,
          filter: 'blur(80px)', opacity: 0.5,
        }} />

        <div style={{
          opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s ease 0.2s', position: 'relative',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            borderRadius: 20, border: `1px solid ${T.border}`, marginBottom: 32,
            fontSize: 13, color: T.textSec, fontFamily: FONT,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
            Now serving 5,000+ gyms across India
          </div>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.05,
          letterSpacing: '-0.04em', maxWidth: 800, margin: '0 0 24px',
          opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s ease 0.4s', position: 'relative', fontFamily: FONT,
        }}>
          The Enterprise Gym Management System<br />for High-Growth Fitness Brands.
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: T.textSec, maxWidth: 560,
          lineHeight: 1.6, margin: '0 0 40px', fontWeight: 400,
          opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s ease 0.6s', position: 'relative', fontFamily: FONT,
        }}>
          Automate member check-ins, streamline GST invoicing, and protect your revenue with India's most secure fitness platform. Built for gyms that value operational excellence.
        </p>

        <div style={{
          display: 'flex', gap: 12,
          opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s ease 0.8s', position: 'relative',
        }}>
          <button onClick={() => setLeadModal(true)} style={{
            padding: '14px 32px', borderRadius: 10, border: 'none',
            background: T.text, color: T.bg, fontSize: 15, fontWeight: 700,
            fontFamily: FONT, cursor: 'pointer', letterSpacing: '-0.01em',
          }}>Start Your 14-Day Free Trial</button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{
            padding: '14px 32px', borderRadius: 10,
            border: `1px solid ${T.borderStrong}`, background: 'transparent',
            color: T.textSec, fontSize: 15, fontWeight: 600,
            fontFamily: FONT, cursor: 'pointer',
          }}>See Features</button>
        </div>

        <div style={{
          marginTop: 24,
          opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s ease 1s', position: 'relative',
        }}>
          <StoreLinks variant="hero" />
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: FONT, margin: '0 0 12px' }}>
              Everything your gym needs
            </h2>
            <p style={{ fontSize: 16, color: T.textSec, fontFamily: FONT }}>
              Built for Indian gyms. From Bengaluru to Mumbai.
            </p>
          </div>
        </Section>
        <Section delay={0.1}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
          }}>
            <BentoCard title="Revenue Intelligence" desc="Track real-time collection, member trends, and peak hour traffic from a single dashboard." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" /></svg>} span="span 2">
              <div style={{ display: 'flex', gap: 3, marginTop: 16, height: 48, alignItems: 'flex-end' }}>
                {[40, 65, 55, 85, 70, 95, 60, 75, 90, 45, 80, 50].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: T.text, borderRadius: 2, opacity: 0.15 + (h / 100) * 0.6 }} />
                ))}
              </div>
            </BentoCard>
            <BentoCard title="Security & Access" desc="Stop membership sharing with rotating secure QR codes. Unlock doors remotely and maintain a full digital audit trail." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, border: `2px solid ${T.textTer}`, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, padding: 6 }}>
                  {Array.from({ length: 16 }).map((_, i) => <div key={i} style={{ background: i % 3 ? T.text : 'transparent', borderRadius: 1, opacity: 0.4 }} />)}
                </div>
              </div>
            </BentoCard>
            <BentoCard title="GST & Billing" desc="Generate tax-compliant invoices automatically. We send professional receipts to your members via WhatsApp and Email instantly." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}>
              <div style={{ marginTop: 16, position: 'relative', height: 48, borderRadius: 8, background: T.bgTer, overflow: 'hidden' }}>
                {[
                  { top: '20%', left: '15%' }, { top: '50%', left: '35%' }, { top: '30%', left: '55%' },
                  { top: '60%', left: '70%' }, { top: '25%', left: '80%' }, { top: '70%', left: '25%' },
                  { top: '40%', left: '48%' }, { top: '55%', left: '88%' },
                ].map((pos, i) => (
                  <div key={i} style={{
                    position: 'absolute', top: pos.top, left: pos.left,
                    width: 5, height: 5, borderRadius: '50%',
                    background: i === 3 ? T.accent : T.textTer, opacity: i === 3 ? 1 : 0.6,
                  }} />
                ))}
              </div>
            </BentoCard>
            <BentoCard title="Payments" desc="Accept payments via Razorpay, UPI, and Stripe. Automated collection tracking with real-time reconciliation." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>} span="span 2">
              <div style={{ marginTop: 16, display: 'flex', gap: 20 }}>
                {['₹42,300', '₹1,28,500', '₹3,45,000'].map((v, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: T.textTer, fontFamily: FONT }}>{['Today', 'Week', 'Month'][i]}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT_M, color: T.text }}>{v}</div>
                  </div>
                ))}
              </div>
            </BentoCard>
            <BentoCard title="Pro-Shop Management" desc="Launch your own supplement marketplace. Get automated low-stock alerts and sell gear directly through the member app." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>} />
            <BentoCard title="Global Map" desc="Help members discover your gym with GPS-powered location search and branded profiles." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>} />
            <BentoCard title="Multi-Tenancy" desc="Each gym gets its own subdomain, branding, and custom domain support." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>} span="span 2">
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                {['irontemple', 'goldsgym', 'fitzone'].map((sub) => (
                  <div key={sub} style={{
                    padding: '6px 14px', borderRadius: 8, background: T.bgTer,
                    border: `1px solid ${T.border}`, fontSize: 12, color: T.textSec,
                    fontFamily: FONT_M,
                  }}>
                    {sub}.ivira.app
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* 4 New High-Value Service Cards */}
            <BentoCard title="AI Nutritionist" desc='India-First Nutrition. Log "Ghar ka Khana" in Hinglish. AI-powered macro estimation for the Indian palate.' icon={<NutritionIcon />} span="span 2">
              <div style={{ display: 'flex', gap: 20, marginTop: 20, justifyContent: 'center' }}>
                <MiniMacroRing label="PROTEIN" pct={0.72} color="#7C3AED" />
                <MiniMacroRing label="CARBS" pct={0.58} color="#4285F4" />
                <MiniMacroRing label="FATS" pct={0.45} color="#FBBC05" />
              </div>
            </BentoCard>

            <BentoCard title="Trainer Marketplace" desc="Monetize Expertise. A dedicated marketplace for your trainers to sell transformation packs and digital plans." icon={<TrainerIcon />}>
              <div style={{ marginTop: 16, background: T.bgTer, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 9, color: T.textTer, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8, fontFamily: FONT }}>COACH OF THE MONTH</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.accent, fontFamily: FONT }}>A</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: FONT }}>Coach Arjun</div>
                    <div style={{ fontSize: 10, color: T.textTer, fontFamily: FONT_M }}>24 sessions</div>
                  </div>
                </div>
                <div style={{
                  padding: '5px 12px', borderRadius: 6, background: T.accent, textAlign: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: FONT, letterSpacing: '0.02em',
                }}>Book Session</div>
              </div>
            </BentoCard>

            <BentoCard title="Smart WhatsApp" desc="Automated Retention. Send personalized renewal nudges and flash sales directly to member's WhatsApp." icon={<WhatsAppIcon />}>
              <div style={{ marginTop: 16, background: T.bgTer, borderRadius: 10, padding: 12, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#25D366', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text, fontFamily: FONT, marginBottom: 2 }}>IVIRA</div>
                    <div style={{ fontSize: 10, color: T.textSec, lineHeight: 1.5, fontFamily: FONT }}>
                      Arjun, your protein is low! Get 10% off at the gym store today.
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: T.textTer, textAlign: 'right', marginTop: 6, fontFamily: FONT_M }}>now</div>
              </div>
            </BentoCard>

            <BentoCard title="Financial Command" desc="Seamless Payouts. Automated revenue splits and GST-compliant invoicing for every rupee earned." icon={<PayoutIcon />} span="span 2">
              <div style={{ marginTop: 16, display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ flex: 89, height: 28, background: T.text, borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#000', fontFamily: FONT_M }}>89% Pro</span>
                </div>
                <div style={{ flex: 10, height: 28, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: FONT_M }}>10%</span>
                </div>
                <div style={{ flex: 1, height: 28, background: T.textTer, borderRadius: '0 4px 4px 0' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: T.text }} /><span style={{ fontSize: 10, color: T.textTer, fontFamily: FONT }}>Trainer (89%)</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: T.accent }} /><span style={{ fontSize: 10, color: T.textTer, fontFamily: FONT }}>Owner (10%)</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: T.textTer }} /><span style={{ fontSize: 10, color: T.textTer, fontFamily: FONT }}>Platform (1%)</span></div>
              </div>
            </BentoCard>
          </div>
        </Section>
      </section>

      {/* Member Experience */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: FONT, margin: '0 0 12px' }}>
              A Premium Experience for Your Members.
            </h2>
            <p style={{ fontSize: 16, color: T.textSec, fontFamily: FONT }}>
              No App Store downloads required. Members get a branded web app for secure entry, payment history, and easy shopping. Everything stays in their pocket.
            </p>
          </div>
        </Section>
        <Section delay={0.1}>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              {
                title: '30s QR Rotation',
                desc: 'QR codes rotate every 30 seconds for bulletproof security. No screenshot sharing.',
                svgIcon: (
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: '#121212',
                    border: '1px solid #1F1F1F', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', position: 'relative',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                      <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" rx="0.5" /><line x1="22" y1="14" x2="22" y2="22" /><line x1="14" y1="22" x2="22" y2="22" />
                    </svg>
                    {/* Subtle rotating border indicator */}
                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <circle cx="24" cy="24" r="22" fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="8 130" opacity="0.4">
                        <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="4s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                ),
              },
              {
                title: 'Tap to Enter',
                desc: 'NFC-powered check-in on Android devices. Just tap your phone at the door.',
                svgIcon: (
                  <div className="tap-icon-glow" style={{
                    width: 48, height: 48, borderRadius: 12, background: '#121212',
                    border: '1px solid #1F1F1F', display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                      <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18.01" />
                      <path d="M8.5 8.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" opacity="0.5" /><path d="M6.5 6.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" opacity="0.3" />
                    </svg>
                  </div>
                ),
              },
              {
                title: 'Invoice & Store',
                desc: 'View payment history, download GST invoices, and shop from your phone.',
                svgIcon: (
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: '#121212',
                    border: '1px solid #1F1F1F', display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" />
                      <circle cx="18" cy="18" r="4" fill="#121212" stroke="#FFFFFF" strokeWidth="1.25" /><path d="M18 16v4M16 18h4" />
                    </svg>
                  </div>
                ),
              },
            ].map((card) => (
              <div key={card.title} style={{
                flex: '1 1 280px', maxWidth: 340, background: T.bgSec,
                border: `1px solid ${T.border}`, borderRadius: 16, padding: 28,
              }}>
                <div style={{ marginBottom: 24 }}>{card.svgIcon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: FONT, marginBottom: 8 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, fontFamily: FONT }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* Multi-Tenancy Showcase */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: FONT, margin: '0 0 12px' }}>
              Your Brand, Your Website
            </h2>
            <p style={{ fontSize: 16, color: T.textSec, fontFamily: FONT }}>
              Every gym gets a custom-branded dashboard with its own subdomain.
            </p>
          </div>
        </Section>
        <Section delay={0.1}>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { name: 'Iron Temple', color: '#DC2626', sub: 'irontemple' },
              { name: 'Ocean Fitness', color: '#2563EB', sub: 'oceanfit' },
              { name: 'Forest Gym', color: '#16A34A', sub: 'forestgym' },
            ].map((gym) => (
              <div key={gym.name} style={{
                width: 280, background: T.bgSec, border: `1px solid ${T.border}`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div style={{ height: 6, background: gym.color }} />
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: FONT, marginBottom: 4 }}>
                    {gym.name}
                  </div>
                  <div style={{ fontSize: 12, color: T.textTer, fontFamily: FONT_M, marginBottom: 16 }}>
                    {gym.sub}.ivira.app
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Members', 'Payments', 'Store'].map((tab) => (
                      <div key={tab} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11,
                        background: T.bgTer, color: T.textSec, fontFamily: FONT,
                      }}>{tab}</div>
                    ))}
                  </div>
                  <div style={{
                    marginTop: 16, height: 40, borderRadius: 8, background: T.bgTer,
                    display: 'flex', alignItems: 'center', paddingLeft: 12,
                  }}>
                    <div style={{ width: '60%', height: 8, borderRadius: 4, background: gym.color, opacity: 0.3 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: FONT, margin: '0 0 12px' }}>
              Transparent pricing. No surprises.
            </h2>
            <p style={{ fontSize: 16, color: T.textSec, fontFamily: FONT }}>
              Start with a 14-day free trial. Scale as you grow.
            </p>
          </div>
        </Section>
        <Section delay={0.1}>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <PricingCard
              name="Standard"
              price="8,999"
              features={['Up to 200 members', 'Secure QR check-ins', 'Member management', 'Automated GST billing', 'Basic analytics']}
              onCTA={() => setLeadModal(true)}
            />
            <PricingCard
              name="Pro"
              price="15,999"
              popular
              features={['Up to 1,000 members', 'Supplement Marketplace', 'Advanced analytics', 'WhatsApp marketing tools', 'Inventory management', 'Priority email support']}
              onCTA={() => setLeadModal(true)}
            />
            <PricingCard
              name="Enterprise"
              price="29,999"
              features={['Unlimited members', 'Custom domain support', 'API access', 'Dedicated account manager', 'White-label branding', 'Multi-location management']}
              onCTA={() => setLeadModal(true)}
            />
          </div>
        </Section>
      </section>

      {/* Service Comparison Matrix */}
      <section style={{ padding: '80px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: FONT, margin: '0 0 12px' }}>
              Compare Plans
            </h2>
            <p style={{ fontSize: 16, color: T.textSec, fontFamily: FONT }}>
              See exactly what's included in each package.
            </p>
          </div>
        </Section>
        <Section delay={0.1}>
          <ComparisonTable onCTA={(tier) => setLeadModal(true)} />
        </Section>
      </section>

      {/* Affiliate Commission Calculator */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: FONT, margin: '0 0 12px' }}>
              Earn While Your Members Shop
            </h2>
            <p style={{ fontSize: 16, color: T.textSec, fontFamily: FONT }}>
              Activate supplement brands in your member's store and earn commissions on every sale.
            </p>
          </div>
        </Section>
        <Section delay={0.1}>
          <AffiliateCalculator />
        </Section>
      </section>

      {/* Lead Capture Modal */}
      <LeadCaptureModal open={leadModal} onClose={() => setLeadModal(false)} />

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${T.border}`, padding: '40px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1100, margin: '0 auto', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT, marginBottom: 4, letterSpacing: '2px' }}>IVIRA</div>
          <div style={{ fontSize: 13, color: T.textTer, fontFamily: FONT }}>Built for Indian gyms.</div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Link to="/privacy" style={{ fontSize: 12, color: '#666666', textDecoration: 'none', fontFamily: FONT }}>Privacy Policy</Link>
          <Link to="/terms" style={{ fontSize: 12, color: '#666666', textDecoration: 'none', fontFamily: FONT }}>Terms of Service</Link>
          <Link to="/terms#payment-split" style={{ fontSize: 12, color: '#666666', textDecoration: 'none', fontFamily: FONT }}>Refund Policy</Link>
          <Link to="/contact" style={{ fontSize: 12, color: '#666666', textDecoration: 'none', fontFamily: FONT }}>Contact Us</Link>
        </div>
        <StoreLinks variant="footer" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
            <span style={{ fontSize: 12, color: T.textTer }}>All Systems Operational</span>
          </div>
          <div style={{ fontSize: 12, color: T.textTer, fontFamily: FONT }}>
            &copy; 2026 IVIRA. All Rights Reserved. Compliant with DPDP Act 2023.
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          nav { padding: 12px 16px !important; }
          nav > div:first-child + div > a { display: none; }
        }
        @media (max-width: 900px) {
          [style*="gridTemplateColumns: repeat(3"] { grid-template-columns: 1fr !important; }
          [style*="gridColumn: span 2"] { grid-column: span 1 !important; }
        }
        @keyframes tapGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
          50% { box-shadow: 0 0 12px 2px rgba(124,58,237,0.25); }
        }
        .tap-icon-glow {
          animation: tapGlow 3s ease-in-out infinite;
        }
        .theme-toggle-icon {
          transition: transform 0.5s ease;
        }
        .theme-toggle-icon:active {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  )
}
