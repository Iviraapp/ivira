import { useState } from 'react'
import { V, FONT, FONT_D } from '../../components/vira/theme'

const CARD_ACCENTS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899',
]

const MOODS = [
  { emoji: '😊', label: 'Great',      color: '#22C55E', score: 5 },
  { emoji: '🙂', label: 'Good',       color: '#34D399', score: 4 },
  { emoji: '😐', label: 'Okay',       color: '#FBBF24', score: 3 },
  { emoji: '😔', label: 'Low',        color: '#F97316', score: 2 },
  { emoji: '😢', label: 'Struggling', color: '#EF4444', score: 1 },
]

// Mock 7-day history
const MOCK_HISTORY = [
  { day: 'Mon', score: 4 },
  { day: 'Tue', score: 3 },
  { day: 'Wed', score: 4 },
  { day: 'Thu', score: 2 },
  { day: 'Fri', score: 5 },
  { day: 'Sat', score: 3 },
  { day: 'Sun', score: null },
]

export default function ViraMoodLog() {
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [history] = useState(MOCK_HISTORY)

  const handleSave = () => {
    if (!selected) return
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{
      padding: '16px 16px 100px', minHeight: '100%', background: V.bg,
    }}>
      <h2 style={{
        fontFamily: FONT_D, fontSize: 22, fontWeight: 700,
        color: V.text, margin: '0 0 4px',
      }}>
        How are you feeling?
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: 14, color: V.textSec, margin: '0 0 20px',
      }}>
        Tap the emoji that best describes your mood right now
      </p>

      {/* Mood selector */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
        marginBottom: 20,
      }}>
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            onClick={() => setSelected(mood)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '16px 4px', borderRadius: 16,
              background: selected?.label === mood.label ? `${mood.color}18` : V.card,
              border: `2px solid ${selected?.label === mood.label ? mood.color : V.border}`,
              cursor: 'pointer', transition: 'all 0.2s',
              transform: selected?.label === mood.label ? 'scale(1.05)' : 'none',
            }}
          >
            <span style={{ fontSize: 32 }}>{mood.emoji}</span>
            <span style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 600,
              color: selected?.label === mood.label ? mood.color : V.textSec,
            }}>
              {mood.label}
            </span>
          </button>
        ))}
      </div>

      {/* Note input */}
      {selected && (
        <div style={{ animation: 'fadeIn 0.3s ease-out', marginBottom: 16 }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What's on your mind? (optional)"
            rows={3}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              background: V.card, border: `1px solid ${V.border}`,
              color: V.text, fontFamily: FONT, fontSize: 14,
              resize: 'none', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSave}
            style={{
              marginTop: 10, width: '100%', padding: '14px',
              borderRadius: 14, border: 'none',
              background: `linear-gradient(135deg, ${selected.color}, ${V.accent})`,
              color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {saved ? '✓ Mood Logged!' : 'Log Mood'}
          </button>

          {/* Struggling nudge */}
          {selected.score <= 2 && (
            <div style={{
              marginTop: 12, padding: '14px 16px', borderRadius: 14,
              background: `${V.accent}12`, border: `1px solid ${V.accent}25`,
            }}>
              <p style={{
                fontFamily: FONT, fontSize: 13, color: V.textSec, margin: 0, lineHeight: 1.6,
              }}>
                💜 It's okay to not be okay. Would you like to{' '}
                <span style={{ color: V.accent, fontWeight: 600, cursor: 'pointer' }}>
                  talk to Vira
                </span>{' '}
                about how you're feeling?
              </p>
            </div>
          )}
        </div>
      )}

      {/* 7-day history */}
      <div style={{
        background: V.card, borderRadius: 16, padding: '18px 16px',
        border: `1px solid ${V.border}`, borderTop: `3px solid ${CARD_ACCENTS[4]}`,
      }}>
        <h3 style={{
          fontFamily: FONT, fontSize: 13, fontWeight: 600,
          color: V.textSec, margin: '0 0 14px',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          This Week
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          {history.map((day, i) => {
            const mood = day.score ? MOODS.find(m => m.score === day.score) : null
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: mood ? `${mood.color}20` : V.border,
                  border: `2px solid ${mood ? mood.color : 'transparent'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {mood ? mood.emoji : '·'}
                </div>
                <span style={{
                  fontFamily: FONT, fontSize: 10, color: V.textTer, fontWeight: 500,
                }}>
                  {day.day}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Streak */}
      <div style={{
        marginTop: 12, padding: '14px 16px', borderRadius: 14,
        background: V.card, border: `1px solid ${V.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>🔥</span>
        <div>
          <p style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V.text, margin: 0 }}>
            5 Day Streak
          </p>
          <p style={{ fontFamily: FONT, fontSize: 12, color: V.textTer, margin: 0 }}>
            Keep logging daily to build your streak
          </p>
        </div>
      </div>
    </div>
  )
}
