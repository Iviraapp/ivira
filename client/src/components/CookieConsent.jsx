import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { hasConsent, grantConsent, revokeConsent, setupRouteTracking } from '../lib/analytics'

export default function CookieConsent() {
  const { theme, isDark } = useTheme()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const consent = document.cookie.match(/ivira_consent=/)
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss(cb) {
    setLeaving(true)
    setTimeout(() => { cb(); setVisible(false) }, 300)
  }

  function handleAccept() {
    dismiss(() => { grantConsent(); setupRouteTracking() })
  }

  function handleDecline() {
    dismiss(() => revokeConsent())
  }

  if (!visible) return null

  const BRAND = '#1A3A8F'

  return (
    <>
      <style>{`
        @keyframes cookieSlideUp {
          from { transform: translateY(calc(100% + 20px)); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes cookieSlideDown {
          from { transform: translateY(0); opacity: 1; }
          to   { transform: translateY(calc(100% + 20px)); opacity: 0; }
        }
        .ivira-cookie-accept:hover { opacity: 0.9; }
        .ivira-cookie-decline:hover {
          background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,58,143,0.06)'} !important;
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 99999,
        padding: '16px',
        pointerEvents: 'none',
        animation: `${leaving ? 'cookieSlideDown' : 'cookieSlideUp'} 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
      }}>
        <div style={{
          maxWidth: 440,
          margin: '0 auto',
          background: isDark
            ? 'rgba(15,15,18,0.92)'
            : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: 14,
          padding: '14px 16px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset'
            : '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}>
          {/* Cookie icon */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: isDark ? 'rgba(26,58,143,0.2)' : 'rgba(26,58,143,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke={BRAND} strokeWidth="1.5" strokeOpacity="0.6"/>
              <circle cx="5.5" cy="6" r="1" fill={BRAND} opacity="0.5"/>
              <circle cx="9" cy="4.5" r="0.8" fill={BRAND} opacity="0.4"/>
              <circle cx="7" cy="10" r="1.1" fill={BRAND} opacity="0.5"/>
              <circle cx="10.5" cy="8.5" r="0.7" fill={BRAND} opacity="0.35"/>
              <circle cx="10" cy="11.5" r="0.9" fill={BRAND} opacity="0.45"/>
            </svg>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: theme.text,
              fontFamily: "'Inter', -apple-system, sans-serif",
              lineHeight: '18px',
              letterSpacing: '-0.1px',
            }}>
              We use cookies to improve your experience.
            </span>
            <span style={{
              fontSize: 12,
              color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8',
              fontFamily: "'Inter', -apple-system, sans-serif",
              marginLeft: 4,
            }}>
              First-party only, no tracking.
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="ivira-cookie-decline"
              onClick={handleDecline}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                background: 'transparent',
                color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', -apple-system, sans-serif",
                transition: 'background 0.15s',
                lineHeight: 1,
              }}
            >
              Decline
            </button>
            <button
              className="ivira-cookie-accept"
              onClick={handleAccept}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                background: BRAND,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', -apple-system, sans-serif",
                transition: 'opacity 0.15s',
                lineHeight: 1,
              }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
