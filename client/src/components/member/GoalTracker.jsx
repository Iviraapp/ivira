import { Shield, Dumbbell, Flame } from 'lucide-react'
import { M, FONT } from './theme'

const DEFAULT_GOALS = [
  { label: 'Check In', done: false, icon: Shield },
  { label: 'Workout', done: false, icon: Dumbbell },
  { label: 'Log Meal', done: false, icon: Flame },
]

export default function GoalTracker({ goals = DEFAULT_GOALS }) {
  const completed = goals.filter(g => g.done).length
  const pct = goals.length > 0 ? completed / goals.length : 0
  const allDone = completed === goals.length

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: 20,
      border: `1px solid ${allDone ? M.accent + '40' : M.border}`, fontFamily: FONT,
      transition: 'border-color 0.4s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text }}>Daily Goals</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: allDone ? M.accent : M.textSec, fontFamily: "'JetBrains Mono', monospace" }}>
          {allDone ? '✓ All done!' : `${completed}/${goals.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: M.cardSec, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${pct * 100}%`,
          background: allDone
            ? `linear-gradient(90deg, ${M.accent}, ${M.green})`
            : `linear-gradient(90deg, ${M.accent}, ${M.accent}AA)`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {goals.map((g, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center', padding: '14px 8px', borderRadius: 12,
            background: g.done ? M.accentSoft : M.cardSec,
            border: `1px solid ${g.done ? M.accent + '40' : M.border}`,
            transition: 'all 0.3s',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, margin: '0 auto 8px',
              background: g.done ? M.accent + '20' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <g.icon size={16} color={g.done ? M.accent : M.textTer} />
            </div>
            <div style={{ fontSize: 11, color: g.done ? M.accent : M.textSec, fontWeight: g.done ? 600 : 400 }}>
              {g.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
