import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

export default function Button({
  children, variant = 'primary', size = 'md', loading, disabled, fullWidth, style, ...props
}) {
  const { theme } = useTheme()
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontWeight: 600, borderRadius: '10px', border: 'none', fontSize: '14px',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, sans-serif", lineHeight: 1, letterSpacing: '-0.01em',
    position: 'relative', overflow: 'hidden',
  }

  const variants = {
    primary: {
      background: theme.brandAccent,
      color: '#fff',
      boxShadow: `0 2px 12px rgba(26,58,143,0.25)`,
    },
    secondary: {
      background: 'transparent',
      color: theme.text,
      border: `1px solid ${theme.border}`,
    },
    ghost: {
      background: 'transparent',
      color: theme.textSec,
    },
    danger: {
      background: theme.red,
      color: '#fff',
    },
    success: {
      background: theme.green,
      color: '#fff',
    },
  }

  const hoverVariants = {
    primary: { filter: 'brightness(1.1)' },
    secondary: { background: theme.accentSoft },
    ghost: { background: theme.accentSoft },
    danger: { filter: 'brightness(1.1)' },
    success: { filter: 'brightness(1.1)' },
  }

  const sizes = {
    sm: { padding: '7px 14px', fontSize: '13px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '13px 28px', fontSize: '16px' },
  }

  const s = {
    ...base,
    ...variants[variant],
    ...sizes[size],
    ...(hovered && !disabled && !loading ? hoverVariants[variant] : {}),
    ...(active && !disabled && !loading ? { transform: 'scale(0.97)', filter: 'brightness(0.95)' } : {}),
    ...(fullWidth && { width: '100%' }),
    ...(disabled || loading ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
    ...style,
  }

  return (
    <button
      style={s}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      {...props}
    >
      {loading && (
        <span style={{
          width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)',
          borderTopColor: '#fff', borderRadius: '50%',
          animation: 'spin 0.6s linear infinite', display: 'inline-block', flexShrink: 0,
        }} />
      )}
      {children}
    </button>
  )
}
