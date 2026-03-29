import { useState, useEffect } from 'react'
import { V, G, GR, FONT, FONT_D, glass } from '../../components/vira/theme'

const STORAGE_KEY = 'ivira_vira_mood_log'
const MAX_HISTORY = 30 // days

const MOODS = [
  { score: 5, emoji: '😄', label: 'Great', color: '#10B981' },
  { score: 4, emoji: '🙂', label: 'Good', color: '#34A853' },
  { score: 3, emoji: '😐', label: 'Okay', color: '#FBBC05' },
  { score: 2, emoji: '😔', label: 'Low', color: '#EA8335' },
  { score: 1, emoji: '😞', label: 'Struggling', color: '#EA4335' },
]

function MoodRing({ score, size = 48 }) {
  const mood = MOODS.find(m => m.score === score) || MOODS[2]
  const pct = score / 5
  const r = (size - 4) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={4} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={mood.color} strokeWidth={4} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size > 44 ? 18 : 14,
      }}>{mood.emoji}</div>
    </div>
  )
}

export default function ViraMoodLog() {
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  }

  const [history, setHistory] = useState(loadHistory)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  // Check if already logged today
  const todayKey = new Date().toISOString().split('T')[0]
  const todayEntry = history.find(h => h.date === todayKey)

  useEffect(() => {
    if (todayEntry) setSelected(todayEntry.score)
  }, [todayEntry?.score])

  const handleSave = () => {
    if (!selected) return
    const entry = { date: todayKey, score: selected, note: note.trim(), logged_at: new Date().toISOString() }
    const updated = [entry, ...history.filter(h => h.date !== todayKey)].slice(0, MAX_HISTORY)
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const last7 = (() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const entry = history.find(h => h.date === key)
      days.push({ key, day: d.toLocaleDateString('en', { weekday: 'short' }).toUpperCase(), entry })
    }
    return days
  })()

  const avgScore = history.length > 0
    ? (history.slice(0, 7).reduce((s, h) => s + h.score, 0) / Math.min(history.length, 7)).toFixed(1)
    : null

  return (
    <div style={{ padding: `${GR.md}px`, display: 'flex', flexDirection: 'column', gap: GR.md, overflowY: 'auto', paddingBottom: 100 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, color: V.text, margin: `0 0 ${G/2}px` }}>Mood Log</h2>
        <p style={{ fontFamily: FONT, fontSize: 13, color: V.textSec, margin: 0 }}>
          {todayEntry ? 'You\'ve logged your mood today ✓' : 'How are you feeling today?'}
        </p>
      </div>

      {/* Today's mood selector */}
      <div style={{ ...glass(), padding: GR.md }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: V.textTer, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: GR.sm }}>
          Today's Mood
        </div>
        <div style={{ display: 'flex', gap: GR.xs, justifyContent: 'space-between', marginBottom: GR.sm }}>
          {MOODS.map(m => (
            <button
              key={m.score}
              onClick={() => setSelected(m.score)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: G/2,
                padding: `${G}px ${G/2}px`,
                borderRadius: GR.sm,
                background: selected === m.score ? `${m.color}18` : 'transparent',
                border: `1px solid ${selected === m.score ? m.color + '60' : V.border}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22 }}>{m.emoji}</span>
              <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: selected === m.score ? m.color : V.textTer, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)…"
          rows={2}
          style={{
            width: '100%', background: V.bg, border: `1px solid ${V.border}`,
            borderRadius: GR.sm, padding: `${G}px ${GR.sm}px`,
            color: V.text, fontFamily: FONT, fontSize: 13, resize: 'none',
            outline: 'none', marginBottom: GR.sm, boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleSave}
          disabled={!selected}
          style={{
            width: '100%', padding: `${GR.sm}px`,
            borderRadius: GR.sm,
            background: saved ? `${V.green}20` : selected ? `${V.accent}15` : V.cardSolid,
            border: `1px solid ${saved ? V.green + '40' : selected ? V.accent + '40' : V.border}`,
            color: saved ? V.green : selected ? V.accent : V.textTer,
            fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: selected ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Logged!' : todayEntry ? 'Update Mood' : 'Log Mood'}
        </button>
      </div>

      {/* 7-day strip */}
      <div style={{ ...glass(), padding: GR.md }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: V.textTer, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: GR.sm }}>
          This Week {avgScore && <span style={{ color: V.accent }}>· Avg {avgScore}/5</span>}
        </div>
        <div style={{ display: 'flex', gap: G/2, justifyContent: 'space-between' }}>
          {last7.map(({ key, day, entry }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: G/2 }}>
              {entry ? (
                <MoodRing score={entry.score} size={40} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${V.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: V.textTer }}>—</span>
                </div>
              )}
              <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 600, color: V.textTer, letterSpacing: '0.05em' }}>{day.slice(0,3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ ...glass(), padding: GR.md }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: V.textTer, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: GR.sm }}>
            Recent Logs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: G/2 }}>
            {history.slice(0, 10).map((h, i) => {
              const mood = MOODS.find(m => m.score === h.score) || MOODS[2]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: GR.sm, padding: `${G}px 0`, borderBottom: i < 9 && i < history.length - 1 ? `1px solid ${V.border}` : 'none' }}>
                  <span style={{ fontSize: 20 }}>{mood.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: mood.color }}>{mood.label}</div>
                    {h.note && <div style={{ fontFamily: FONT, fontSize: 11, color: V.textSec, marginTop: 2 }}>{h.note}</div>}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: V.textTer }}>
                    {new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
