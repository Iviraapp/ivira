import { useTheme } from '../../context/ThemeContext'

export default function Skeleton({ width, height = 20, radius = 8, style }) {
  const { theme } = useTheme()

  return (
    <div
      className="skeleton"
      style={{
        width: width || '100%',
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${theme.bgTer} 25%, ${theme.bgHover} 50%, ${theme.bgTer} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function SkeletonCard() {
  const { theme } = useTheme()

  return (
    <div style={{
      background: theme.bgSec,
      borderRadius: 14,
      border: `1px solid ${theme.border}`, padding: 24,
    }}>
      <Skeleton width={120} height={14} style={{ marginBottom: 12 }} />
      <Skeleton width={80} height={32} style={{ marginBottom: 8 }} />
      <Skeleton width={100} height={12} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  const { theme } = useTheme()

  return (
    <div style={{
      background: theme.bgSec,
      borderRadius: 14,
      border: `1px solid ${theme.border}`, padding: 24,
    }}>
      <div style={{
        display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 12,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${100 / cols}%`} height={14} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'flex', gap: 16, padding: '12px 0',
          borderBottom: `1px solid ${theme.accentSoft}`,
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={`${100 / cols}%`} height={16} />
          ))}
        </div>
      ))}
    </div>
  )
}
