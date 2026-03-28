import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'

const ff = "'General Sans', 'Inter', -apple-system, sans-serif"

const ACCENT = '#10B981'
const ACCENT_LIGHT = '#3B82F6'

// Role-specific visual configs — no static images, pure CSS
// Instantly.ai-inspired mesh gradient for auth hero panels
const MESH_AUTH_LIGHT = `
  radial-gradient(ellipse 80% 60% at 10% 20%, rgba(99,132,255,0.30), transparent 55%),
  radial-gradient(ellipse 70% 50% at 80% 10%, rgba(120,160,255,0.24), transparent 50%),
  radial-gradient(ellipse 60% 80% at 50% 80%, rgba(150,130,255,0.20), transparent 55%),
  radial-gradient(ellipse 90% 60% at 90% 60%, rgba(100,170,255,0.16), transparent 50%),
  linear-gradient(135deg, #e8eeff 0%, #dce4fc 25%, #d0dcfa 50%, #c8d8f8 75%, #e0e8ff 100%)
`

const HERO_THEMES = {
  owner: {
    gradient: {
      dark: 'linear-gradient(135deg, #050A1A 0%, #0A1628 35%, #122044 70%, #10B981 100%)',
      light: MESH_AUTH_LIGHT,
    },
    accent: '#10B981',
    pattern: 'owner',
  },
  member: {
    gradient: {
      dark: 'linear-gradient(135deg, #050508 0%, #0A0A1A 30%, #0F1B3D 60%, #162E6B 100%)',
      light: MESH_AUTH_LIGHT,
    },
    accent: '#3B82F6',
    pattern: 'member',
  },
  trainer: {
    gradient: {
      dark: 'linear-gradient(135deg, #080505 0%, #1A0A0A 30%, #2D1220 60%, #4A1942 100%)',
      light: MESH_AUTH_LIGHT,
    },
    accent: '#EC4899',
    pattern: 'trainer',
  },
  admin: {
    gradient: {
      dark: 'linear-gradient(135deg, #020808 0%, #051515 30%, #082828 60%, #0D4040 100%)',
      light: MESH_AUTH_LIGHT,
    },
    accent: '#0D9488',
    pattern: 'admin',
  },
}

const CSS = `
@keyframes authFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes authSpin {
  to { transform: rotate(360deg); }
}
@keyframes authShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
@keyframes authPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
@keyframes authFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(1deg); }
}
@keyframes authOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.1); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}
@media (max-width: 768px) {
  .auth-layout { flex-direction: column !important; }
  .auth-hero {
    flex: none !important; width: 100% !important;
    min-height: auto !important; padding: 60px 24px 32px !important;
  }
  .auth-form-side {
    flex: none !important; width: 100% !important;
    min-height: auto !important; padding: 24px 20px 48px !important;
  }
}
`

// Generates decorative SVG patterns based on role
function HeroPattern({ role, isDark }) {
  const opacity = isDark ? 0.06 : 0.08

  if (role === 'owner') {
    // Geometric grid — business/dashboard feel
    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }} viewBox="0 0 400 400">
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i}>
            <rect x={60 + i * 70} y={50 + i * 50} width="45" height="45" rx="8" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="1" />
            <rect x={30 + i * 65} y={180 + i * 30} width="30" height="30" rx="6" fill={isDark ? '#3B82F6' : '#10B981'} opacity="0.3" />
          </g>
        ))}
        <circle cx="300" cy="80" r="40" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="0.8" />
        <circle cx="100" cy="300" r="60" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="0.5" />
      </svg>
    )
  }

  if (role === 'member') {
    // Organic shapes — fitness/energy
    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }} viewBox="0 0 400 400">
        <circle cx="320" cy="80" r="80" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="1" />
        <circle cx="320" cy="80" r="50" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="0.5" />
        <circle cx="80" cy="320" r="90" fill={isDark ? '#3B82F6' : '#10B981'} opacity="0.1" />
        <path d="M50 200 Q 150 100, 250 200 T 400 200" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="0.8" />
        <path d="M0 250 Q 100 180, 200 250 T 400 250" fill="none" stroke={isDark ? '#3B82F6' : '#10B981'} strokeWidth="0.5" />
      </svg>
    )
  }

  if (role === 'trainer') {
    // Dynamic lines — coaching/motion
    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }} viewBox="0 0 400 400">
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={50 + i * 30} y1="0" x2={200 + i * 50} y2="400" stroke={isDark ? '#EC4899' : '#BE185D'} strokeWidth="0.6" />
        ))}
        <circle cx="300" cy="120" r="35" fill="none" stroke={isDark ? '#EC4899' : '#BE185D'} strokeWidth="1" />
        <polygon points="80,280 120,340 40,340" fill="none" stroke={isDark ? '#EC4899' : '#BE185D'} strokeWidth="0.8" />
      </svg>
    )
  }

  // Admin — circuit/tech
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }} viewBox="0 0 400 400">
      <path d="M0 100 H 150 V 200 H 300 V 100 H 400" fill="none" stroke={isDark ? '#0D9488' : '#0F766E'} strokeWidth="0.8" />
      <path d="M0 300 H 100 V 200 H 250 V 350 H 400" fill="none" stroke={isDark ? '#0D9488' : '#0F766E'} strokeWidth="0.6" />
      <circle cx="150" cy="200" r="4" fill={isDark ? '#0D9488' : '#0F766E'} />
      <circle cx="300" cy="100" r="4" fill={isDark ? '#0D9488' : '#0F766E'} />
      <circle cx="100" cy="300" r="4" fill={isDark ? '#0D9488' : '#0F766E'} />
    </svg>
  )
}

// Animated floating orbs
function FloatingOrbs({ accent, isDark }) {
  const orbColor = isDark ? accent : accent
  return (
    <>
      <div style={{
        position: 'absolute', top: '15%', right: '10%',
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle, ${orbColor}22, transparent 70%)`,
        animation: 'authOrb 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', left: '15%',
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${orbColor}18, transparent 70%)`,
        animation: 'authOrb 10s ease-in-out infinite 2s',
      }} />
      <div style={{
        position: 'absolute', top: '60%', right: '25%',
        width: 50, height: 50, borderRadius: '50%',
        background: `radial-gradient(circle, ${orbColor}15, transparent 70%)`,
        animation: 'authOrb 6s ease-in-out infinite 4s',
      }} />
    </>
  )
}

export default function AuthLayout({
  children,
  title = 'I V I R A',
  subtitle = 'Access your enterprise dashboard.',
  tagline = 'Secure. Real-time. Global.',
  role = 'owner', // 'owner' | 'member' | 'trainer' | 'admin'
  footerText,
  langs,
  activeLang,
  onLangChange,
}) {
  const { isDark, setMode } = useTheme()
  const heroTheme = HERO_THEMES[role] || HERO_THEMES.owner

  // Derived colors
  const pageBg = isDark ? '#050505' : '#F0F4FF'
  const cardBg = isDark ? '#121212' : 'rgba(255,255,255,0.90)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,185,129,0.12)'
  const cardShadow = isDark
    ? '0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(16,185,129,0.06)'
    : '0 8px 40px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)'
  const heroTextPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const heroTextSec = isDark ? 'rgba(255,255,255,0.6)' : '#475569'
  const heroTextTer = isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8'

  return (
    <div
      className="auth-layout"
      style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: ff,
        background: pageBg,
      }}
    >
      <style>{CSS}</style>

      {/* Top bar — theme toggle + back link */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
      }}>
        <Link to="/" style={{
          fontSize: 13, fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B',
          textDecoration: 'none', fontFamily: ff, display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </Link>
        <button
          onClick={() => setMode(isDark ? 'light' : 'dark')}
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
            color: isDark ? 'rgba(255,255,255,0.6)' : '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </div>

      {/* LEFT PANEL — Dynamic hero with CSS backgrounds */}
      <div
        className="auth-hero"
        style={{
          flex: '0 0 50%',
          width: '50%',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          background: heroTheme.gradient[isDark ? 'dark' : 'light'],
        }}
      >
        {/* Decorative pattern overlay */}
        <HeroPattern role={heroTheme.pattern} isDark={isDark} />

        {/* Floating orbs */}
        <FloatingOrbs accent={heroTheme.accent} isDark={isDark} />

        {/* Noise texture for depth */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: isDark
            ? 'radial-gradient(ellipse 80% 50% at 30% 40%, rgba(59,130,246,0.06), transparent 60%)'
            : 'radial-gradient(ellipse 80% 50% at 30% 40%, rgba(16,185,129,0.04), transparent 60%)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* IVIRA Logo */}
          <div style={{ opacity: 0, animation: 'authFadeIn 0.6s ease-out 100ms forwards' }}>
            <img
              src="/icons/icon-96.png"
              alt="I V I R A"
              style={{
                width: 48, height: 48, borderRadius: 14, marginBottom: 28,
                boxShadow: `0 4px 24px ${heroTheme.accent}40`,
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Title */}
          <div style={{ opacity: 0, animation: 'authFadeIn 0.6s ease-out 200ms forwards' }}>
            <h1 style={{
              fontSize: 56, fontWeight: 900, lineHeight: 0.95, margin: 0,
              fontFamily: ff, textTransform: 'uppercase', letterSpacing: '-0.02em',
              background: `linear-gradient(135deg, ${heroTheme.accent}, ${ACCENT_LIGHT})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {title}
            </h1>
          </div>

          {/* Subtitle */}
          <div style={{ opacity: 0, animation: 'authFadeIn 0.5s ease-out 350ms forwards' }}>
            <p style={{
              fontSize: 17, color: heroTextSec, margin: '18px 0 0',
              fontWeight: 400, maxWidth: 400, lineHeight: 1.6,
            }}>
              {subtitle}
              {tagline && (
                <>
                  <br />
                  <span style={{ color: heroTextTer, fontWeight: 500 }}>{tagline}</span>
                </>
              )}
            </p>
          </div>

          {/* Role badge */}
          <div style={{ opacity: 0, animation: 'authFadeIn 0.5s ease-out 500ms forwards' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 28, padding: '6px 14px', borderRadius: 20,
              background: `${heroTheme.accent}15`,
              border: `1px solid ${heroTheme.accent}25`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: heroTheme.accent,
                boxShadow: `0 0 8px ${heroTheme.accent}60`,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600, color: heroTheme.accent,
                fontFamily: ff, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {role === 'owner' ? 'Gym Owner Portal' : role === 'member' ? 'Member Hub' : role === 'trainer' ? 'Trainer Portal' : 'Command Center'}
              </span>
            </div>
          </div>
        </div>

        {/* Language pills (optional) */}
        {langs && langs.length > 0 && (
          <div style={{
            marginTop: 'auto', paddingTop: 48,
            position: 'relative', zIndex: 2,
            opacity: 0, animation: 'authFadeIn 0.5s ease-out 800ms forwards',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {langs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => onLangChange?.(l.code)}
                  style={{
                    padding: '5px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                    border: activeLang === l.code
                      ? `1.5px solid ${heroTheme.accent}`
                      : `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                    background: activeLang === l.code
                      ? `${heroTheme.accent}15`
                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: activeLang === l.code ? heroTheme.accent : heroTextTer,
                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: ff,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Form */}
      <div
        className="auth-form-side"
        style={{
          flex: '0 0 50%', width: '50%', minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 56px',
          background: isDark ? pageBg : `
            radial-gradient(ellipse 70% 50% at 60% 30%, rgba(99,132,255,0.12), transparent 55%),
            radial-gradient(ellipse 60% 60% at 30% 70%, rgba(130,150,255,0.08), transparent 50%),
            #F4F7FF
          `,
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Card */}
          <div style={{ opacity: 0, animation: 'authFadeIn 0.5s ease-out 300ms forwards' }}>
            <div style={{
              background: cardBg, borderRadius: 20, padding: '44px 36px',
              border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
            }}>
              {children}
            </div>
          </div>

          {/* Footer text */}
          {footerText && (
            <div style={{ opacity: 0, animation: 'authFadeIn 0.5s ease-out 600ms forwards' }}>
              {footerText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Expose theme helpers for login forms to use
export function useAuthTheme() {
  const { theme, isDark } = useTheme()
  const ACCENT = '#10B981'

  return {
    theme,
    isDark,
    // Colors
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSec: isDark ? 'rgba(255,255,255,0.6)' : '#64748B',
    textTer: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
    inputBg: isDark ? '#0A0A0A' : '#FFFFFF',
    inputBorder: isDark ? '#1F1F1F' : 'rgba(16,185,129,0.15)',
    inputBorderHover: isDark ? '#333' : 'rgba(16,185,129,0.25)',
    accent: ACCENT,
    focusGlow: '0 0 0 3px rgba(16,185,129,0.15)',
    errorColor: '#EA4335',
    ff: "'General Sans', 'Inter', -apple-system, sans-serif",
    // Input style generator
    inputStyle: (hasError) => ({
      width: '100%',
      padding: '14px 16px',
      fontSize: 15,
      fontFamily: "'General Sans', 'Inter', -apple-system, sans-serif",
      background: isDark ? '#0A0A0A' : '#F8FAFC',
      border: `1px solid ${hasError ? '#EA4335' : isDark ? '#1F1F1F' : '#E2E8F0'}`,
      borderRadius: 12,
      color: isDark ? '#FFFFFF' : '#0F172A',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxSizing: 'border-box',
    }),
    // Primary button style
    buttonStyle: (loading, hover) => ({
      width: '100%',
      padding: '14px 24px',
      fontSize: 15,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontFamily: "'General Sans', 'Inter', -apple-system, sans-serif",
      background: ACCENT,
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.8 : hover ? 0.9 : 1,
      transition: 'all 0.2s',
      transform: hover && !loading ? 'translateY(-1px)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }),
    // Focus handlers
    onFocus: (e) => {
      e.target.style.borderColor = ACCENT
      e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)'
    },
    onBlur: (e, hasError, customBorder) => {
      e.target.style.borderColor = hasError
        ? '#EA4335'
        : customBorder || (isDark ? '#1F1F1F' : '#E2E8F0')
      e.target.style.boxShadow = 'none'
    },
  }
}
