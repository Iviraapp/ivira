import { useState } from 'react'
import { V, G, GR, FONT, FONT_D, glass } from '../../components/vira/theme'

const STORAGE_KEY = 'ivira_supplements_log'

const DEFAULT_SUPPLEMENTS = [
  { id: 1, name: 'Whey Protein', dose: '30g scoop', timing: 'Post-workout', category: 'Protein', color: '#10B981', emoji: '🥛' },
  { id: 2, name: 'Creatine', dose: '5g', timing: 'Pre-workout', category: 'Performance', color: '#3B82F6', emoji: '⚡' },
  { id: 3, name: 'Multivitamin', dose: '1 tablet', timing: 'Morning', category: 'Vitamins', color: '#F59E0B', emoji: '💊' },
  { id: 4, name: 'Omega-3', dose: '2 capsules', timing: 'With meal', category: 'Recovery', color: '#EC4899', emoji: '🐟' },
]

const TIMING_OPTIONS = ['Pre-workout', 'Post-workout', 'Morning', 'Evening', 'With meal', 'Before bed']
const CATEGORY_OPTIONS = ['Protein', 'Performance', 'Vitamins', 'Recovery', 'Weight Loss', 'Other']
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444']
const EMOJIS = ['🥛', '⚡', '💊', '🐟', '🫐', '🧬', '💪', '🌿']

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { supplements: parsed.supplements || DEFAULT_SUPPLEMENTS, logs: parsed.logs || {} }
    }
  } catch {}
  return { supplements: DEFAULT_SUPPLEMENTS, logs: {} }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export default function ViraMeds() {
  const initial = loadData()
  const [supplements, setSupplements] = useState(initial.supplements)
  const [logs, setLogs] = useState(initial.logs) // { 'YYYY-MM-DD': { suppId: true } }
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDose, setNewDose] = useState('')
  const [newTiming, setNewTiming] = useState('Post-workout')
  const [newCategory, setNewCategory] = useState('Protein')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [newEmoji, setNewEmoji] = useState(EMOJIS[0])

  const todayKey = new Date().toISOString().split('T')[0]
  const todayLogs = logs[todayKey] || {}
  const takenCount = supplements.filter(s => todayLogs[s.id]).length

  const toggleTaken = (id) => {
    const updated = {
      ...logs,
      [todayKey]: { ...todayLogs, [id]: !todayLogs[id] }
    }
    setLogs(updated)
    saveData({ supplements, logs: updated })
  }

  const addSupplement = () => {
    if (!newName.trim()) return
    const supp = {
      id: Date.now(),
      name: newName.trim(),
      dose: newDose.trim() || '',
      timing: newTiming,
      category: newCategory,
      color: newColor,
      emoji: newEmoji,
    }
    const updated = [...supplements, supp]
    setSupplements(updated)
    saveData({ supplements: updated, logs })
    setShowAdd(false)
    setNewName(''); setNewDose('')
  }

  const removeSupplement = (id) => {
    const updated = supplements.filter(s => s.id !== id)
    setSupplements(updated)
    saveData({ supplements: updated, logs })
  }

  const adherencePercent = supplements.length > 0 ? Math.round((takenCount / supplements.length) * 100) : 0

  return (
    <div style={{ padding: `${GR.md}px`, display: 'flex', flexDirection: 'column', gap: GR.md, overflowY: 'auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: FONT_D, fontSize: 20, fontWeight: 700, color: V.text, margin: `0 0 ${G/2}px` }}>Supplements</h2>
          <p style={{ fontFamily: FONT, fontSize: 13, color: V.textSec, margin: 0 }}>
            {takenCount}/{supplements.length} taken today
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: `${G/2}px ${GR.sm}px`, borderRadius: GR.sm,
            background: `${V.accent}15`, border: `1px solid ${V.accent}40`,
            color: V.accent, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {/* Adherence bar */}
      {supplements.length > 0 && (
        <div style={{ ...glass(), padding: GR.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: G/2 }}>
            <span style={{ fontFamily: FONT, fontSize: 11, color: V.textSec }}>Today's adherence</span>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: adherencePercent === 100 ? V.green : V.accent }}>{adherencePercent}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${adherencePercent}%`,
              background: adherencePercent === 100 ? `linear-gradient(90deg, ${V.accent}, ${V.green})` : `linear-gradient(90deg, ${V.accent}, ${V.accent}AA)`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{ ...glass(V.accent), padding: GR.md, display: 'flex', flexDirection: 'column', gap: G }}>
          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: V.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Supplement</div>

          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Name (e.g. BCAA, Pre-workout)"
            style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: GR.sm, padding: `${G}px ${GR.sm}px`, color: V.text, fontFamily: FONT, fontSize: 13, outline: 'none' }}
          />
          <input
            value={newDose} onChange={e => setNewDose(e.target.value)}
            placeholder="Dose (e.g. 2 scoops, 5g)"
            style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: GR.sm, padding: `${G}px ${GR.sm}px`, color: V.text, fontFamily: FONT, fontSize: 13, outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: G/2, flexWrap: 'wrap' }}>
            {TIMING_OPTIONS.map(t => (
              <button key={t} onClick={() => setNewTiming(t)} style={{
                padding: `${G/2}px ${G}px`, borderRadius: GR.lg,
                background: newTiming === t ? `${V.accent}20` : 'transparent',
                border: `1px solid ${newTiming === t ? V.accent + '60' : V.border}`,
                color: newTiming === t ? V.accent : V.textSec,
                fontFamily: FONT, fontSize: 11, cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: G/2 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setNewEmoji(e)} style={{
                width: 32, height: 32, borderRadius: 8, fontSize: 16,
                background: newEmoji === e ? `${V.accent}15` : 'transparent',
                border: `1px solid ${newEmoji === e ? V.accent + '40' : V.border}`,
                cursor: 'pointer',
              }}>{e}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: G/2 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: 24, height: 24, borderRadius: '50%', background: c, border: `2px solid ${newColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: G }}>
            <button onClick={addSupplement} style={{
              flex: 1, padding: `${G}px`, borderRadius: GR.sm,
              background: `${V.accent}15`, border: `1px solid ${V.accent}40`,
              color: V.accent, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{
              flex: 1, padding: `${G}px`, borderRadius: GR.sm,
              background: 'transparent', border: `1px solid ${V.border}`,
              color: V.textSec, fontFamily: FONT, fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Supplement list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: G/2 }}>
        {supplements.map(s => {
          const taken = !!todayLogs[s.id]
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: GR.sm,
              padding: `${GR.sm}px`,
              borderRadius: GR.sm,
              background: taken ? `${s.color}0D` : V.cardSolid,
              border: `1px solid ${taken ? s.color + '30' : V.border}`,
              transition: 'all 0.2s',
            }}>
              <button
                onClick={() => toggleTaken(s.id)}
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: taken ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${taken ? s.color + '60' : V.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 18, transition: 'all 0.2s',
                }}
              >
                {taken ? '✓' : s.emoji}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: taken ? s.color : V.text }}>
                  {s.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: V.textTer }}>
                  {s.dose && `${s.dose} · `}{s.timing}
                </div>
              </div>
              <button
                onClick={() => removeSupplement(s.id)}
                style={{ background: 'none', border: 'none', color: V.textTer, cursor: 'pointer', fontSize: 16, padding: 4 }}
              >×</button>
            </div>
          )
        })}
      </div>

      {supplements.length === 0 && (
        <div style={{ textAlign: 'center', padding: `${GR.lg}px`, color: V.textSec, fontFamily: FONT, fontSize: 13 }}>
          No supplements added yet. Tap + Add to get started.
        </div>
      )}
    </div>
  )
}
