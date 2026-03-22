import { useState, useEffect } from 'react'

const FONT = "'Inter', -apple-system, sans-serif"

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem('ivira_pwa_dismissed')) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show prompt after 30 seconds of usage
      setTimeout(() => setShowPrompt(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('ivira_pwa_dismissed', 'true')
  }

  if (!showPrompt || dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: '90%', maxWidth: 400,
      background: '#121212', border: '1px solid #1F1F1F',
      borderRadius: 16, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: FONT,
      animation: 'pwaSlideUp 0.4s ease-out',
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: '#7C3AED', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 18, fontWeight: 800, color: '#fff',
      }}>G</div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#EDEDED' }}>
          Add IVIRA to Home Screen
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          Quick access to your dashboard
        </div>
      </div>

      <button onClick={handleInstall} style={{
        padding: '8px 16px', borderRadius: 8, border: 'none',
        background: '#7C3AED', color: '#fff', fontSize: 13,
        fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
        flexShrink: 0,
      }}>Install</button>

      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', color: '#555',
        cursor: 'pointer', fontSize: 18, padding: 4,
        lineHeight: 1, flexShrink: 0,
      }}>&times;</button>

      <style>{`
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
