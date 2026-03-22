import { useState } from 'react'
import { Plus, Coffee, Sun, Sunset, Moon, ChevronRight } from 'lucide-react'
import { M, FONT, FONT_M } from './theme'

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee, time: '7-9 AM' },
  { key: 'lunch', label: 'Lunch', icon: Sun, time: '12-2 PM' },
  { key: 'snack', label: 'Snack', icon: Sunset, time: '4-6 PM' },
  { key: 'dinner', label: 'Dinner', icon: Moon, time: '7-9 PM' },
]

export default function MealLogger({ onLog, todayMeals = [] }) {
  const [expanded, setExpanded] = useState(null)

  const loggedTypes = todayMeals.map(m => m.meal_type)
  const totalCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0)
  const totalProtein = todayMeals.reduce((s, m) => s + (m.protein_g || 0), 0)

  return (
    <div style={{
      background: M.card, borderRadius: 16, padding: 20,
      border: `1px solid ${M.border}`, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: M.text }}>Meals</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12, color: M.amber, fontFamily: FONT_M }}>{totalCalories} cal</span>
          <span style={{ fontSize: 12, color: M.green, fontFamily: FONT_M }}>{totalProtein}g protein</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MEAL_TYPES.map(({ key, label, icon: Icon, time }) => {
          const logged = loggedTypes.includes(key)
          return (
            <button
              key={key}
              onClick={() => logged ? null : (onLog ? onLog(key) : setExpanded(key))}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, width: '100%',
                background: logged ? M.accentSoft : M.cardSec,
                border: `1px solid ${logged ? M.accent + '30' : M.border}`,
                cursor: logged ? 'default' : 'pointer',
                fontFamily: FONT, textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={18} color={logged ? M.accent : M.textTer} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: logged ? M.accent : M.text }}>{label}</div>
                <div style={{ fontSize: 11, color: M.textTer }}>{time}</div>
              </div>
              {logged ? (
                <span style={{ fontSize: 11, color: M.green, fontWeight: 600 }}>Logged</span>
              ) : (
                <Plus size={16} color={M.textTer} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
