import { useTheme } from '../../context/ThemeContext'

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

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
@media (max-width: 768px) {
  .auth-layout { flex-direction: column !important; }
  .auth-hero { display: none !important; }
  .auth-form-side {
    flex: none !important; width: 100% !important;
    min-height: 100vh !important; padding: 32px 20px !important;
  }
}
`

const ACCENT = '#7C3AED'

export default function AuthLayout({
  children,
  title = 'IVIRA',
  subtitle = 'Access your enterprise dashboard.',
  tagline = 'Secure. Real-time. Global.',
  backgroundImageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=60',
  footerText,
  langs,
  activeLang,
  onLangChange,
}) {
  const { theme, isDark } = useTheme()

  // Derived colors
  const pageBg = isDark ? '#050505' : '#F8FAFC'
  const cardBg = isDark ? '#121212' : '#FFFFFF'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'
  const cardShadow = isDark
    ? '0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(124,58,237,0.06)'
    : '0 8px 40px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)'
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const textSec = isDark ? 'rgba(255,255,255,0.6)' : '#64748B'
  const textTer = isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8'

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

      {/* LEFT PANEL — Hero with image overlay */}
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
        }}
      >
        {/* Background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${backgroundImageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1.02)',
          }}
        />
        {/* Gradient overlay — from-black/90 to-black/20 for WCAG AA */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.90), rgba(0,0,0,0.20))',
          }}
        />
        {/* Secondary vertical gradient for bottom readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 40%, transparent 60%, rgba(0,0,0,0.5))',
          }}
        />

        {/* Content — always white text over dark overlay */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* IVIRA Logo */}
          <div
            style={{
              opacity: 0,
              animation: 'authFadeIn 0.6s ease-out 100ms forwards',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${ACCENT}, #A78BFA)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
                boxShadow: `0 4px 24px rgba(124,58,237,0.35)`,
              }}
            >
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>G</span>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              opacity: 0,
              animation: 'authFadeIn 0.6s ease-out 200ms forwards',
            }}
          >
            <h1
              style={{
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 0.95,
                margin: 0,
                fontFamily: ff,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                background: `linear-gradient(135deg, ${ACCENT}, #A78BFA)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {title}
            </h1>
          </div>

          {/* Subtitle */}
          <div
            style={{
              opacity: 0,
              animation: 'authFadeIn 0.5s ease-out 350ms forwards',
            }}
          >
            <p
              style={{
                fontSize: 17,
                color: 'rgba(255,255,255,0.7)',
                margin: '18px 0 0',
                fontWeight: 400,
                maxWidth: 400,
                lineHeight: 1.6,
              }}
            >
              {subtitle}
              {tagline && (
                <>
                  <br />
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    {tagline}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Language pills (optional) */}
        {langs && langs.length > 0 && (
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 48,
              position: 'relative',
              zIndex: 2,
              opacity: 0,
              animation: 'authFadeIn 0.5s ease-out 800ms forwards',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {langs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => onLangChange?.(l.code)}
                  style={{
                    padding: '5px 16px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    border:
                      activeLang === l.code
                        ? `1.5px solid ${ACCENT}`
                        : '1px solid rgba(255,255,255,0.15)',
                    background:
                      activeLang === l.code
                        ? 'rgba(124,58,237,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    color:
                      activeLang === l.code ? ACCENT : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: ff,
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
          flex: '0 0 50%',
          width: '50%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 56px',
          background: pageBg,
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Card */}
          <div
            style={{
              opacity: 0,
              animation: 'authFadeIn 0.5s ease-out 300ms forwards',
            }}
          >
            <div
              style={{
                background: cardBg,
                borderRadius: 20,
                padding: '44px 36px',
                border: `1px solid ${cardBorder}`,
                boxShadow: cardShadow,
              }}
            >
              {children}
            </div>
          </div>

          {/* Footer text */}
          {footerText && (
            <div
              style={{
                opacity: 0,
                animation: 'authFadeIn 0.5s ease-out 600ms forwards',
              }}
            >
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
  const ACCENT = '#7C3AED'

  return {
    theme,
    isDark,
    // Colors
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSec: isDark ? 'rgba(255,255,255,0.6)' : '#64748B',
    textTer: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
    inputBg: isDark ? '#0A0A0A' : '#F8FAFC',
    inputBorder: isDark ? '#1F1F1F' : '#E2E8F0',
    inputBorderHover: isDark ? '#333' : '#CBD5E1',
    accent: ACCENT,
    focusGlow: '0 0 0 3px rgba(124,58,237,0.15)',
    errorColor: '#EA4335',
    ff: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    // Input style generator
    inputStyle: (hasError) => ({
      width: '100%',
      padding: '14px 16px',
      fontSize: 15,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
      e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
    },
    onBlur: (e, hasError, customBorder) => {
      e.target.style.borderColor = hasError
        ? '#EA4335'
        : customBorder || (isDark ? '#1F1F1F' : '#E2E8F0')
      e.target.style.boxShadow = 'none'
    },
  }
}
