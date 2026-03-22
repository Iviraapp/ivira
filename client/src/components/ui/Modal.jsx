import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

export default function Modal({ open, onClose, title, children, width = 480 }) {
  const { theme } = useTheme()
  const ref = useRef()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
      const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKey)
        document.body.style.overflow = ''
      }
    } else {
      setVisible(false)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        ref={ref}
        style={{
          background: theme.bgSec,
          borderRadius: '16px', width: '100%', maxWidth: width,
          maxHeight: '90vh', overflow: 'auto',
          border: `1px solid ${theme.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px', borderBottom: `1px solid ${theme.border}`,
          }}>
            <h2 style={{
              fontSize: '18px', fontWeight: 700, color: theme.text,
              fontFamily: "'Inter', -apple-system, sans-serif", margin: 0,
            }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '8px', border: 'none',
                background: theme.bgTer, color: theme.textSec, fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.bgHover
                e.currentTarget.style.color = theme.text
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme.bgTer
                e.currentTarget.style.color = theme.textSec
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

export function SlideOver({ open, onClose, title, children, width = 480 }) {
  const { theme } = useTheme()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
      const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKey)
        document.body.style.overflow = ''
      }
    } else {
      setVisible(false)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{
        background: theme.bgSec,
        width: '100%', maxWidth: width, height: '100vh', overflow: 'auto',
        borderLeft: `1px solid ${theme.border}`,
        boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: `1px solid ${theme.border}`,
          position: 'sticky', top: 0,
          background: theme.navBg, backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', zIndex: 1,
        }}>
          <h2 style={{
            fontSize: '18px', fontWeight: 700, color: theme.text,
            fontFamily: "'Inter', -apple-system, sans-serif", margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '8px', border: 'none',
              background: theme.bgTer, color: theme.textSec, fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.bgHover
              e.currentTarget.style.color = theme.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.bgTer
              e.currentTarget.style.color = theme.textSec
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}
