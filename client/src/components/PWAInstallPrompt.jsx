import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const FONT_BRAND = "'Satoshi', 'General Sans', 'Inter', sans-serif"
const FONT_BODY  = "'General Sans', 'Inter', -apple-system, sans-serif"
const COBALT     = '#1A3A8F'
const ACCENT     = '#3B82F6'

function isDesktop() {
  if (typeof window === 'undefined') return true
  return !/Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

function getAuthState() {
  // Check for existing user session indicators
  const hasToken = !!localStorage.getItem('auth_token') || !!localStorage.getItem('firebase_token')
  const hasGymId = !!localStorage.getItem('gym_id')
  const hasMemberId = !!localStorage.getItem('member_id')
  const userName = localStorage.getItem('user_name') || ''
  const userRole = hasGymId ? 'owner' : hasMemberId ? 'member' : null

  return { isReturning: hasToken || hasGymId || hasMemberId, userRole, userName }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [phase, setPhase] = useState('install') // 'install' | 'postinstall' | 'welcome'
  const [dismissed, setDismissed] = useState(false)
  const [auth, setAuth] = useState({ isReturning: false, userRole: null, userName: '' })
  const desktop = isDesktop()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark } = useTheme()

  // Theme-adaptive colors
  const c = {
    bg:     isDark ? '#0A0A0A' : '#FFFFFF',
    border: isDark ? 'rgba(26,58,143,0.3)' : 'rgba(26,58,143,0.15)',
    shadow: isDark
      ? '0 12px 48px rgba(0,0,0,0.7), 0 0 24px rgba(26,58,143,0.1)'
      : '0 12px 48px rgba(0,0,0,0.12), 0 0 24px rgba(26,58,143,0.06)',
    text:   isDark ? '#FFFFFF' : '#111111',
    sub:    isDark ? '#777777' : '#888888',
    dim:    isDark ? '#444444' : '#AAAAAA',
    btnBg:  isDark ? '#FFFFFF' : COBALT,
    btnText:isDark ? '#0A0A0A' : '#FFFFFF',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    cardBdr:isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  }

  useEffect(() => {
    // Don't show if already a PWA, or user dismissed
    if (isStandalone() || localStorage.getItem('ivira_pwa_dismissed')) return

    setAuth(getAuthState())

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show faster on landing (15s), slower elsewhere (45s)
      const delay = location.pathname === '/' ? 15000 : 45000
      setTimeout(() => setShowPrompt(true), delay)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [location.pathname])

  // After PWA installed, show post-install onboarding
  useEffect(() => {
    if (!isStandalone()) return
    const hasSeenWelcome = localStorage.getItem('ivira_pwa_welcomed')
    if (hasSeenWelcome) return

    const authState = getAuthState()
    setAuth(authState)
    setPhase(authState.isReturning ? 'welcome' : 'postinstall')
    setShowPrompt(true)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      if (desktop && 'Notification' in window) {
        Notification.requestPermission()
      }
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    if (phase === 'install') {
      localStorage.setItem('ivira_pwa_dismissed', 'true')
    }
    if (phase === 'postinstall' || phase === 'welcome') {
      localStorage.setItem('ivira_pwa_welcomed', 'true')
    }
  }

  const goTo = (path) => {
    setShowPrompt(false)
    localStorage.setItem('ivira_pwa_welcomed', 'true')
    navigate(path)
  }

  if (!showPrompt || dismissed) return null

  // ── POST-INSTALL: First-time PWA user (no existing data) ──
  if (phase === 'postinstall') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'pwaFadeIn 0.4s ease',
      }}>
        <div style={{
          background: c.bg, borderRadius: 20, padding: 36,
          maxWidth: 420, width: '100%',
          border: `1px solid ${c.border}`,
          boxShadow: c.shadow,
          position: 'relative',
          animation: 'pwaScaleIn 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 32, right: 32, height: 3,
            background: `linear-gradient(90deg, ${COBALT}, ${ACCENT}, ${COBALT})`,
            borderRadius: '0 0 3px 3px',
          }} />

          {/* Close */}
          <button onClick={handleDismiss} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: c.dim,
            cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1,
          }}>&times;</button>

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/icons/icon-96.png" alt="IVIRA"
              style={{ width: 56, height: 56, borderRadius: 14, boxShadow: `0 0 20px rgba(26,58,143,0.25)` }} />
          </div>

          <h3 style={{
            fontFamily: FONT_BRAND, fontSize: 20, fontWeight: 800,
            color: c.text, textAlign: 'center', margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}>Welcome to IVIRA</h3>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 14, color: c.sub,
            textAlign: 'center', lineHeight: 1.6, margin: '0 0 28px',
          }}>
            {desktop
              ? 'Your desktop command center is ready. Sign in to sync your gym data or create a new account.'
              : 'Your fitness companion is installed. Sign in to access your membership or get started.'}
          </p>

          {/* Quick benefits */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            marginBottom: 24,
          }}>
            {(desktop
              ? [
                  { icon: '⚡', label: 'Instant access' },
                  { icon: '🔔', label: 'Smart alerts' },
                  { icon: '📊', label: 'Live dashboard' },
                  { icon: '🔒', label: 'Offline ready' },
                ]
              : [
                  { icon: '📱', label: 'QR check-in' },
                  { icon: '🏋️', label: 'Track workouts' },
                  { icon: '🍎', label: 'Log nutrition' },
                  { icon: '🏆', label: 'Leaderboards' },
                ]
            ).map(b => (
              <div key={b.label} style={{
                background: c.cardBg, border: `1px solid ${c.cardBdr}`,
                borderRadius: 10, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, color: c.text }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => goTo('/member/login')} style={{
              fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
              background: COBALT, color: '#FFFFFF', border: 'none', borderRadius: 12,
              padding: '14px 24px', cursor: 'pointer', width: '100%',
              boxShadow: '0 2px 10px rgba(26,58,143,0.3)',
              transition: 'all 0.3s',
            }}>
              Sign In as Member
            </button>
            <button onClick={() => goTo('/login')} style={{
              fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
              background: 'transparent', color: c.text,
              border: `1px solid ${c.cardBdr}`, borderRadius: 12,
              padding: '14px 24px', cursor: 'pointer', width: '100%',
              transition: 'all 0.3s',
            }}>
              Gym Owner Login
            </button>
            <button onClick={() => { goTo('/find-gym') }} style={{
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
              background: 'none', border: 'none',
              color: ACCENT, cursor: 'pointer', padding: '8px 0',
            }}>
              New here? Find a gym near you &rarr;
            </button>
          </div>
        </div>

        <style>{`
          @keyframes pwaFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes pwaScaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    )
  }

  // ── WELCOME BACK: Returning user (has existing data) ──
  if (phase === 'welcome') {
    const dashPath = auth.userRole === 'owner' ? '/dashboard' : '/member/dashboard'
    return (
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, width: '90%', maxWidth: 440,
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 16, padding: '20px 24px',
        boxShadow: c.shadow, fontFamily: FONT_BODY,
        animation: 'pwaSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 24, right: 24, height: 2,
          background: `linear-gradient(90deg, transparent, #22C55E, transparent)`,
          borderRadius: '0 0 2px 2px',
        }} />

        <button onClick={handleDismiss} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', color: c.dim,
          cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1,
        }}>&times;</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(34,197,94,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>✓</div>
          <div>
            <div style={{ fontFamily: FONT_BRAND, fontSize: 15, fontWeight: 700, color: c.text }}>
              Welcome back{auth.userName ? `, ${auth.userName}` : ''}
            </div>
            <div style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>
              Your data is synced and ready. Jump right in.
            </div>
          </div>
        </div>

        <button onClick={() => goTo(dashPath)} style={{
          fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700,
          background: COBALT, color: '#FFFFFF', border: 'none', borderRadius: 10,
          padding: '12px 24px', cursor: 'pointer', width: '100%',
          boxShadow: '0 2px 8px rgba(26,58,143,0.25)',
        }}>
          Go to {auth.userRole === 'owner' ? 'Dashboard' : 'Member Hub'}
        </button>
      </div>
    )
  }

  // ── INSTALL PROMPT: Pre-install banner ──
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: '90%', maxWidth: desktop ? 480 : 380,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 16, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: c.shadow, fontFamily: FONT_BODY,
      animation: 'pwaSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 2,
        background: `linear-gradient(90deg, transparent, ${COBALT}, transparent)`,
        borderRadius: '0 0 2px 2px',
      }} />

      <img src="/icons/icon-96.png" alt="IVIRA"
        style={{
          width: 48, height: 48, borderRadius: 12,
          flexShrink: 0, objectFit: 'cover',
          boxShadow: '0 0 16px rgba(26,58,143,0.3)',
        }} />

      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: FONT_BRAND, fontSize: 14, fontWeight: 700,
          color: c.text, letterSpacing: '-0.01em',
        }}>
          {desktop
            ? (auth.isReturning ? 'Install IVIRA Desktop' : 'Install IVIRA App')
            : 'Add IVIRA to Home Screen'}
        </div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 11, color: c.sub,
          marginTop: 4, letterSpacing: '0.02em', lineHeight: 1.4,
        }}>
          {desktop
            ? (auth.isReturning
                ? 'One-click access to your dashboard with offline support'
                : 'Offline-ready gym management with smart notifications')
            : 'Quick access to your fitness dashboard'
          }
        </div>
      </div>

      <button onClick={handleInstall} style={{
        padding: '10px 20px', borderRadius: 10, border: 'none',
        background: c.btnBg, color: c.btnText, fontSize: 13,
        fontFamily: FONT_BODY, fontWeight: 600,
        cursor: 'pointer', flexShrink: 0,
        transition: 'all 0.3s',
      }}
      onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.target.style.transform = 'translateY(0)' }}>
        Install
      </button>

      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', color: c.dim,
        cursor: 'pointer', fontSize: 18, padding: 4,
        lineHeight: 1, flexShrink: 0,
      }}>&times;</button>

      <style>{`
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(30px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
