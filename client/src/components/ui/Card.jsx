import { useTheme } from '../../context/ThemeContext'

export default function Card({ children, style, padding = '24px', ...props }) {
  const { theme } = useTheme()

  return (
    <div
      style={{
        background: theme.bgSec,
        borderRadius: '14px',
        border: `1px solid ${theme.border}`,
        padding,
        transition: 'all 0.2s ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatCard({ label, value, trend, trendUp, icon, color }) {
  const { theme } = useTheme()
  const accentColor = color || theme.accent
  const trendIsUp = trendUp !== undefined ? trendUp : (typeof trend === 'number' ? trend >= 0 : false)
  const trendColor = trendIsUp ? theme.green : theme.red

  return (
    <Card
      style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        borderLeft: `3px solid ${accentColor}`,
        animation: 'fadeInUp 0.4s ease both',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: theme.textSec,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          {label}
        </span>
        {icon && (
          <span style={{
            width: 36, height: 36, borderRadius: '10px',
            background: theme.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accentColor, fontSize: '18px', flexShrink: 0,
          }}>
            {icon}
          </span>
        )}
      </div>

      <span style={{
        fontSize: '28px', fontWeight: 700, color: theme.text, lineHeight: 1.1,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
      </span>

      {trend !== undefined && (
        <span style={{
          fontSize: '12px', fontWeight: 500, color: trendColor,
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          <span style={{ fontSize: '14px' }}>{trendIsUp ? '\u2191' : '\u2193'}</span>
          {typeof trend === 'number' ? `${Math.abs(trend)}%` : trend} vs last week
        </span>
      )}
    </Card>
  )
}
