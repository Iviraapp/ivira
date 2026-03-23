import { useState } from 'react'
import { V, G, GR, FONT, FONT_D, FONT_M, CARD_ACCENTS, glass } from '../../components/vira/theme'

const MOCK_MEDS = [
  { id: 1, name: 'Amlodipine', dosage: '5mg', time: '8:00 AM', category: 'Blood Pressure', taken: false },
  { id: 2, name: 'Metformin', dosage: '500mg', time: '8:00 AM', category: 'Diabetes', taken: true },
  { id: 3, name: 'Atorvastatin', dosage: '10mg', time: '9:00 PM', category: 'Cholesterol', taken: false },
  { id: 4, name: 'Vitamin D3', dosage: '1000 IU', time: '8:00 AM', category: 'Supplement', taken: true },
]

function ProgressRing({ taken, total, size = GR.xl * 2 }) {
  const stroke = GR.xs
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? taken / total : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={V.cardSolid} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={V.green} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: FONT_M, fontSize: 22, fontWeight: 700, color: V.text }}>
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
      padding: `${GR.md}px ${GR.md}px ${GR.xl * 2}px`,
      minHeight: '100%', background: V.bg,
    }}>
      <h2 style={{
        fontFamily: FONT_D, fontSize: 22, fontWeight: 700,
        color: V.text, margin: `0 0 ${G / 2}px`,
      }}>
        Medications
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: 14, color: V.textSec,
        margin: `0 0 ${GR.md}px`,
      }}>
        Track your daily medication adherence
      </p>

      {/* Progress ring + streak */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: GR.md,
        marginBottom: GR.lg,
        padding: GR.md,
        ...glass(CARD_ACCENTS[2]),
        borderTop: `3px solid ${CARD_ACCENTS[2]}`,
      }}>
        <ProgressRing taken={taken} total={meds.length} />
        <div>
          <p style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V.text,
            margin: `0 0 ${G / 2}px`,
          }}>
            {taken === meds.length ? 'All done for today!' : `${meds.length - taken} remaining`}
          </p>
          <p style={{ fontFamily: FONT, fontSize: 13, color: V.textSec, margin: `0 0 ${GR.sm}px` }}>
            {Math.round((taken / meds.length) * 100)}% adherence today
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: G * 0.75,
            padding: `${G / 2}px ${GR.sm}px`,
            borderRadius: GR.sm,
            ...glass(V.amber),
            background: `${V.amber}12`,
          }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: V.amber }}>
              12 day streak
            </span>
          </div>
        </div>
      </div>

      {/* Medication list — golden ratio gap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: GR.sm }}>
        {meds.map((med, i) => (
          <div
            key={med.id}
            onClick={() => toggleMed(med.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: GR.sm,
              padding: GR.md,
              ...glass(CARD_ACCENTS[i % CARD_ACCENTS.length]),
              borderLeft: `3px solid ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`,
              cursor: 'pointer', transition: 'all 0.2s',
              opacity: med.taken ? 0.65 : 1,
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: G * 3.5, height: G * 3.5, borderRadius: GR.xs,
              flexShrink: 0,
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
              <p style={{ fontFamily: FONT, fontSize: 12, color: V.textTer, margin: `${G / 4}px 0 0` }}>
                {med.dosage} · {med.category}
              </p>
            </div>

            <div style={{
              padding: `${G / 2}px ${GR.sm}px`,
              borderRadius: GR.xs,
              ...glass(),
              fontFamily: FONT_M, fontSize: 11, color: V.textSec,
            }}>
              {med.time}
            </div>
          </div>
        ))}
      </div>

      {/* Next refill card */}
      <div style={{
        marginTop: GR.md,
        padding: GR.md,
        ...glass(CARD_ACCENTS[6]),
        borderTop: `3px solid ${CARD_ACCENTS[6]}`,
      }}>
        <p style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 600, color: V.textTer,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          margin: `0 0 ${GR.xs}px`,
        }}>
          Upcoming Refills
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: V.text, margin: 0 }}>
              Amlodipine 5mg
            </p>
            <p style={{ fontFamily: FONT, fontSize: 12, color: V.amber, margin: `${G / 4}px 0 0` }}>
              Refill due in 3 days
            </p>
          </div>
          <button style={{
            padding: `${GR.xs}px ${GR.md}px`,
            borderRadius: GR.sm,
            ...glass(V.teal),
            background: `${V.teal}12`,
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
