import { useTheme } from '../../context/ThemeContext'

export default function Badge({ children, color = 'neutral', style }) {
  const { theme } = useTheme()

  const colorMap = {
    success: { bg: `rgba(52,168,83,0.15)`, color: theme.green, dot: theme.green },
    error: { bg: `rgba(234,67,53,0.15)`, color: theme.red, dot: theme.red },
    warning: { bg: `rgba(251,188,5,0.15)`, color: theme.amber, dot: theme.amber },
    primary: { bg: theme.accentSoft, color: theme.accent, dot: theme.accent },
    neutral: { bg: theme.bgTer, color: theme.textSec, dot: theme.textTer },
  }

  const c = colorMap[color] || colorMap.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '9999px',
      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
      background: c.bg, color: c.color,
      whiteSpace: 'nowrap', fontFamily: "'Inter', -apple-system, sans-serif",
      ...style,
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: c.dot, flexShrink: 0,
      }} />
      {children}
    </span>
  )
}
