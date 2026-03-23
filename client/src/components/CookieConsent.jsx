import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { hasConsent, grantConsent, revokeConsent, setupRouteTracking } from '../lib/analytics'

export default function CookieConsent() {
  const { theme, isDark } = useTheme()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Show banner only if no consent decision has been made
    const consent = document.cookie.match(/ivira_consent=/)
    if (!consent) {
      // Small delay so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  function handleAccept() {
    grantConsent()
    setupRouteTracking()
    setVisible(false)
  }

  function handleDecline() {
    revokeConsent()
    setVisible(false)
  }

  const s = {
    overlay: {
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 99999,
      padding: '0 16px 16px',
      animation: 'slideUpConsent 0.4s ease-out',
      pointerEvents: 'none',
    },
    banner: {
      maxWidth: 520,
      margin: '0 auto',
      background: isDark ? '#111114' : '#FFFFFF',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,58,143,0.12)'}`,
      borderRadius: 16,
      padding: '20px 22px',
      boxShadow: isDark
        ? '0 -4px 40px rgba(0,0,0,0.5)'
        : '0 -4px 40px rgba(26,58,143,0.15)',
      pointerEvents: 'auto',
    },
    icon: {
      fontSize: 20,
      marginBottom: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: 700,
      color: theme.text,
      marginBottom: 6,
      fontFamily: "'Inter', -apple-system, sans-serif",
      letterSpacing: '-0.3px',
    },
    text: {
      fontSize: 12.5,
      lineHeight: '18px',
      color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B',
      marginBottom: expanded ? 12 : 16,
      fontFamily: "'Inter', -apple-system, sans-serif",
    },
    detail: {
      fontSize: 11.5,
      lineHeight: '17px',
      color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8',
      marginBottom: 16,
      padding: '12px 14px',
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(26,58,143,0.04)',
      borderRadius: 10,
      fontFamily: "'Inter', -apple-system, sans-serif",
    },
    toggle: {
      color: '#1A3A8F',
      fontSize: 11.5,
      fontWeight: 600,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      marginBottom: 14,
      fontFamily: "'Inter', -apple-system, sans-serif",
    },
    actions: {
      display: 'flex',
      gap: 10,
    },
    accept: {
      flex: 1,
      padding: '10px 20px',
      borderRadius: 10,
      border: 'none',
      background: '#1A3A8F',
      color: '#fff',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: "'Inter', -apple-system, sans-serif",
      letterSpacing: '-0.2px',
      transition: 'opacity 0.15s',
    },
    decline: {
      flex: 1,
      padding: '10px 20px',
      borderRadius: 10,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,58,143,0.15)'}`,
      background: 'transparent',
      color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: "'Inter', -apple-system, sans-serif",
      letterSpacing: '-0.2px',
      transition: 'opacity 0.15s',
    },
  }

  return (
    <>
      <style>{`
        @keyframes slideUpConsent {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div style={s.overlay}>
        <div style={s.banner}>
          <div style={s.icon}>🍪</div>
          <div style={s.title}>We value your privacy</div>
          <div style={s.text}>
            We use first-party cookies to understand how you use IVIRA and improve your experience. No data is shared with third parties.
          </div>

          {expanded && (
            <div style={s.detail}>
              <strong style={{ color: theme.text }}>What we collect:</strong><br />
              • <strong>Visitor ID</strong> — anonymous identifier to recognize returning visitors<br />
              • <strong>Session data</strong> — pages visited, time on site, navigation patterns<br />
              • <strong>Device info</strong> — browser type, OS, screen size (no fingerprinting)<br />
              • <strong>Traffic source</strong> — referrer URL and UTM campaign parameters<br /><br />
              All data stays on IVIRA servers. You can revoke consent anytime in Settings.
            </div>
          )}

          <button
            style={s.toggle}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide details' : 'What do we collect?'}
          </button>

          <div style={s.actions}>
            <button style={s.accept} onClick={handleAccept}>Accept</button>
            <button style={s.decline} onClick={handleDecline}>Decline</button>
          </div>
        </div>
      </div>
    </>
  )
}
