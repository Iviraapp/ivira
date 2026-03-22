import { V, FONT, FONT_D } from './theme'

export default function RedFlagOverlay({ onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Pulsing glow */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(248,113,113,0.25) 0%, transparent 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        animation: 'crisisPulse 2s ease-in-out infinite',
      }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>

      <h2 style={{
        fontFamily: FONT_D, fontSize: 24, fontWeight: 700,
        color: '#FFFFFF', margin: '0 0 8px', textAlign: 'center',
      }}>
        You're not alone
      </h2>

      <p style={{
        fontFamily: FONT, fontSize: 15, color: 'rgba(255,255,255,0.7)',
        margin: '0 0 32px', textAlign: 'center', maxWidth: 320, lineHeight: 1.6,
      }}>
        It sounds like you may be going through a difficult time. Please reach out to someone who can help.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <a href="tel:112" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '16px 24px', borderRadius: 14,
          background: '#DC2626', color: '#FFFFFF',
          fontFamily: FONT, fontSize: 16, fontWeight: 700,
          textDecoration: 'none', letterSpacing: '0.01em',
          boxShadow: '0 4px 24px rgba(220,38,38,0.4)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call Emergency (112)
        </a>

        <a href="tel:9152987821" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 24px', borderRadius: 14,
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
          color: '#C4B5FD', fontFamily: FONT, fontSize: 15, fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          iCall Helpline (9152987821)
        </a>

        <a href="https://www.vandrevalafoundation.com" target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 24px', borderRadius: 14,
          background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.25)',
          color: '#5EEAD4', fontFamily: FONT, fontSize: 15, fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Vandrevala Foundation
        </a>
      </div>

      <button
        onClick={onDismiss}
        style={{
          marginTop: 28, background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.35)', fontFamily: FONT, fontSize: 13,
          cursor: 'pointer', padding: '8px 16px',
        }}
      >
        I'm okay, go back
      </button>

      <style>{`
        @keyframes crisisPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
