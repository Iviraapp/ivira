import { useState } from 'react'
import { V, FONT, FONT_D, FONT_M } from '../../components/vira/theme'

const CARD_ACCENTS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#06B6D4', '#10B981', '#6366F1', '#E11D48',
]

const MOCK_MEDS = [
  { id: 1, name: 'Amlodipine', dosage: '5mg', time: '8:00 AM', category: 'Blood Pressure', taken: false },
  { id: 2, name: 'Metformin', dosage: '500mg', time: '8:00 AM', category: 'Diabetes', taken: true },
  { id: 3, name: 'Atorvastatin', dosage: '10mg', time: '9:00 PM', category: 'Cholesterol', taken: false },
  { id: 4, name: 'Vitamin D3', dosage: '1000 IU', time: '8:00 AM', category: 'Supplement', taken: true },
]

function ProgressRing({ taken, total, size = 100 }) {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? taken / total : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={V.border} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={V.green} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: FONT_M, fontSize: 22, fontWeight: 700, color: V.text,
        }}>
          {taken}/{total}
        </span>
        <span style={{
          fontFamily: FONT, fontSize: 10, color: V.textTer, textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          taken
        </span>
      </div>
    </div>
  )
}

export default function ViraMeds() {
  const [meds, setMeds] = useState(MOCK_MEDS)
  const taken = meds.filter(m => m.taken).length

  const toggleMed = (id) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m))
  }

  return (
    <div style={{
      padding: '16px 16px 100px', minHeight: '100%', background: V.bg,
    }}>
      <h2 style={{
        fontFamily: FONT_D, fontSize: 22, fontWeight: 700,
        color: V.text, margin: '0 0 4px',
      }}>
        Medications
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: 14, color: V.textSec, margin: '0 0 20px',
      }}>
        Track your daily medication adherence
      </p>

      {/* Progress ring + streak */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24,
        padding: '20px', borderRadius: 18,
        background: V.card, border: `1px solid ${V.border}`,
        borderTop: `3px solid ${CARD_ACCENTS[2]}`,
      }}>
        <ProgressRing taken={taken} total={meds.length} />
        <div>
          <p style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V.text, margin: '0 0 4px',
          }}>
            {taken === meds.length ? 'All done for today! 🎉' : `${meds.length - taken} remaining`}
          </p>
          <p style={{ fontFamily: FONT, fontSize: 13, color: V.textSec, margin: '0 0 10px' }}>
            {Math.round((taken / meds.length) * 100)}% adherence today
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 12,
            background: `${V.amber}15`, border: `1px solid ${V.amber}25`,
          }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: V.amber }}>
              12 day streak
            </span>
          </div>
        </div>
      </div>

      {/* Medication list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {meds.map((med, i) => (
          <div
            key={med.id}
            onClick={() => toggleMed(med.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px', borderRadius: 14,
              background: V.card, border: `1px solid ${V.border}`,
              borderLeft: `3px solid ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`,
              cursor: 'pointer', transition: 'all 0.2s',
              opacity: med.taken ? 0.65 : 1,
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: med.taken ? V.green : 'transparent',
              border: `2px solid ${med.taken ? V.green : V.textTer}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {med.taken && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: FONT, fontSize: 15, fontWeight: 600,
                color: V.text, margin: 0,
                textDecoration: med.taken ? 'line-through' : 'none',
              }}>
                {med.name}
              </p>
              <p style={{ fontFamily: FONT, fontSize: 12, color: V.textTer, margin: '2px 0 0' }}>
                {med.dosage} · {med.category}
              </p>
            </div>

            <div style={{
              padding: '4px 10px', borderRadius: 8,
              background: V.border, fontFamily: FONT_M,
              fontSize: 11, color: V.textSec,
            }}>
              {med.time}
            </div>
          </div>
        ))}
      </div>

      {/* Next refill card */}
      <div style={{
        marginTop: 16, padding: '16px', borderRadius: 14,
        background: V.card, border: `1px solid ${V.border}`,
        borderTop: `3px solid ${CARD_ACCENTS[6]}`,
      }}>
        <p style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 600, color: V.textTer,
          letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px',
        }}>
          Upcoming Refills
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: V.text, margin: 0 }}>
              Amlodipine 5mg
            </p>
            <p style={{ fontFamily: FONT, fontSize: 12, color: V.amber, margin: '2px 0 0' }}>
              Refill due in 3 days
            </p>
          </div>
          <button style={{
            padding: '8px 16px', borderRadius: 10,
            background: `${V.teal}15`, border: `1px solid ${V.teal}30`,
            color: V.teal, fontFamily: FONT, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Refill
          </button>
        </div>
      </div>
    </div>
  )
}
