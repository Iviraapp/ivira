import { CalendarDays } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function TrainerSchedule() {
  const { theme } = useTheme()
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.text, margin: '0 0 24px' }}>Schedule</h1>
      <div style={{
        textAlign: 'center', padding: 60, borderRadius: 16,
        background: theme.cardBg || theme.bgSec, border: `1px solid ${theme.border}`,
      }}>
        <CalendarDays size={48} color={theme.textTer} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 16, color: theme.textSec }}>Week View Coming Soon</p>
        <p style={{ fontSize: 13, color: theme.textTer }}>Manage your weekly schedule with drag-and-drop</p>
      </div>
    </div>
  )
}
