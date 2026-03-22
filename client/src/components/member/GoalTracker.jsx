import { Shield, Dumbbell, Flame } from 'lucide-react'
import { M, FONT } from './theme'

const DEFAULT_GOALS = [
  { label: 'Check In', done: false, icon: Shield },
  { label: 'Workout', done: false, icon: Dumbbell },
  { label: 'Log Meal', done: false, icon: Flame },
]

export default function GoalTracker({ goals = DEFAULT_GOALS }) {
  const completed = goals.filter(g => g.done).length

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: 20,
      border: `1px solid ${M.border}`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text }}>Daily Goals</span>
        <span style={{ fontSize: 12, color: M.accent, fontFamily: "'JetBrains Mono', monospace" }}>{completed}/{goals.length}</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {goals.map((g, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 12,
            background: g.done ? M.accentSoft : M.cardSec,
            border: `1px solid ${g.done ? M.accent + '40' : M.border}`,
            transition: 'all 0.3s',
          }}>
            <g.icon size={20} color={g.done ? M.accent : M.textTer} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: g.done ? M.accent : M.textSec, fontWeight: 500 }}>{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
