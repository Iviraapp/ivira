import { useTheme } from '../../context/ThemeContext'
import Button from './Button'

export default function EmptyState({ icon, title, description, action, onAction }) {
  const { theme } = useTheme()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 64, height: 64, borderRadius: '16px',
          background: theme.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px', fontSize: '28px', color: theme.textTer,
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontSize: '16px', fontWeight: 600, color: theme.text, marginBottom: '4px',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '14px', color: theme.textSec, marginBottom: '20px', maxWidth: 360,
        }}>
          {description}
        </p>
      )}
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  )
}
