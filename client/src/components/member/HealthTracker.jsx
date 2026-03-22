import { Footprints, TrendingDown, Flame, Heart } from 'lucide-react'
import { M, FONT, FONT_M } from './theme'

export default function HealthTracker({ steps = 0, stepGoal = 8000, calories = 0, heartRate = 0, weight = null }) {
  const stepProgress = Math.min(steps / stepGoal, 1)
  const circumference = 2 * Math.PI * 40
  const formatWeight = (g) => g ? `${(g / 1000).toFixed(1)} kg` : '\u2014'

  const metrics = [
    { label: 'Calories', value: calories || '\u2014', icon: Flame, color: M.amber },
    { label: 'Heart Rate', value: heartRate ? `${heartRate} bpm` : '\u2014', icon: Heart, color: M.red },
    { label: 'Weight', value: formatWeight(weight), icon: TrendingDown, color: M.green },
  ]

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: 20,
      border: `1px solid ${M.border}`, fontFamily: FONT,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: M.text, display: 'block', marginBottom: 16 }}>Health</span>

      {/* Step Ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
          <svg width={96} height={96}>
            <circle cx={48} cy={48} r={40} fill="none" stroke={M.border} strokeWidth={6} />
            <circle cx={48} cy={48} r={40} fill="none"
              stroke={stepProgress >= 1 ? M.green : M.accent}
              strokeWidth={6} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stepProgress)}
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', textAlign: 'center',
          }}>
            <Footprints size={16} color={M.accent} />
            <div style={{ fontSize: 14, fontWeight: 700, color: M.text, fontFamily: FONT_M, marginTop: 2 }}>
              {steps.toLocaleString()}
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: M.text, fontFamily: FONT_M }}>
            {steps.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: M.textSec }}>
            of {stepGoal.toLocaleString()} steps
          </div>
          <div style={{
            marginTop: 6, fontSize: 11, fontWeight: 600,
            color: stepProgress >= 1 ? M.green : M.accent,
          }}>
            {stepProgress >= 1 ? 'Goal reached!' : `${Math.round(stepProgress * 100)}% complete`}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 8px', borderRadius: 10,
            background: M.cardSec, border: `1px solid ${M.border}`,
            textAlign: 'center',
          }}>
            <m.icon size={14} color={m.color} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: M.text, fontFamily: FONT_M }}>{m.value}</div>
            <div style={{ fontSize: 10, color: M.textTer }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
