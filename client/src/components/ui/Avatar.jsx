import { useTheme } from '../../context/ThemeContext'
import { getInitials } from '../../lib/utils'

export default function Avatar({ name, size = 40, src, style }) {
  const { theme } = useTheme()
  const initials = getInitials(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
          border: `2px solid ${theme.border}`,
          transition: 'all 0.2s ease',
          ...style,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: theme.bgTer,
        color: theme.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        fontFamily: "'Inter', -apple-system, sans-serif",
        letterSpacing: '0.02em',
        transition: 'all 0.2s ease',
        border: `1px solid ${theme.border}`,
        ...style,
      }}
    >
      {initials}
    </div>
  )
}
