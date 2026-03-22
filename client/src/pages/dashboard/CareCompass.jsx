import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { Users, AlertTriangle, Activity, TrendingUp, Search, ChevronRight, Heart, Shield } from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_D = "'Satoshi', 'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

const CARD_ACCENTS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#06B6D4', '#10B981', '#6366F1', '#E11D48',
]

const PROGRAMS = {
  all: { label: 'All Patients', color: '#8B5CF6' },
  mental_health: { label: 'Mental Health', color: '#8B5CF6' },
  hypertension: { label: 'Heart Health', color: '#3B82F6' },
  pharmacy: { label: 'Pharmacy', color: '#14B8A6' },
}

const MOCK_PATIENTS = [
  { id: 1, name: 'Priya Sharma', age: 34, program: 'mental_health', adherence: 88, lastVitals: 'Mood: Good', status: 'stable', lastActive: '2h ago' },
  { id: 2, name: 'Rajesh Kumar', age: 56, program: 'hypertension', adherence: 72, lastVitals: 'BP: 142/92', status: 'attention', lastActive: '4h ago' },
  { id: 3, name: 'Anita Desai', age: 45, program: 'pharmacy', adherence: 96, lastVitals: 'Refill: 3 days', status: 'stable', lastActive: '1h ago' },
  { id: 4, name: 'Vikram Patel', age: 28, program: 'mental_health', adherence: 45, lastVitals: 'Mood: Low', status: 'critical', lastActive: '3d ago' },
  { id: 5, name: 'Sunita Reddy', age: 62, program: 'hypertension', adherence: 91, lastVitals: 'BP: 128/82', status: 'stable', lastActive: '30m ago' },
  { id: 6, name: 'Arun Nair', age: 39, program: 'pharmacy', adherence: 83, lastVitals: 'Missed 2 doses', status: 'attention', lastActive: '1d ago' },
  { id: 7, name: 'Meera Joshi', age: 51, program: 'hypertension', adherence: 67, lastVitals: 'BP: 155/98', status: 'critical', lastActive: '6h ago' },
  { id: 8, name: 'Kiran Das', age: 23, program: 'mental_health', adherence: 78, lastVitals: 'Mood: Okay', status: 'stable', lastActive: '5h ago' },
]

const STATS = [
  { label: 'ACTIVE PATIENTS', value: 8, icon: Users, colorKey: '#3B82F6' },
  { label: 'CRITICAL ALERTS', value: 2, icon: AlertTriangle, colorKey: '#EF4444', alert: true },
  { label: 'AVG ADHERENCE', value: '78%', icon: Activity, colorKey: '#22C55E' },
  { label: 'PENDING REVIEWS', value: 3, icon: TrendingUp, colorKey: '#F59E0B' },
]

export default function CareCompass() {
  const { theme, isDark } = useTheme()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_PATIENTS.filter(p => {
    if (filter !== 'all' && p.program !== filter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusColor = (s) => s === 'critical' ? '#EF4444' : s === 'attention' ? '#F59E0B' : '#22C55E'

  return (
    <div style={{ padding: '24px 28px 40px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(135deg, #8B5CF6, #EC4899)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
        }}>
          <Heart size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{
            fontFamily: FONT_D, fontSize: 24, fontWeight: 700,
            color: theme.text, margin: 0, letterSpacing: '-0.02em',
          }}>
            Care Compass
          </h1>
          <p style={{ fontFamily: FONT, fontSize: 13, color: theme.textSec, margin: 0 }}>
            Patient health monitoring & care management
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        {STATS.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} style={{
              background: isDark ? theme.bgSec : '#FFFFFF',
              borderRadius: 14, padding: '20px 22px',
              border: `1px solid ${theme.border}`,
              borderTop: `3px solid ${CARD_ACCENTS[i]}`,
              position: 'relative', overflow: 'hidden',
              animation: `fadeIn 0.4s ease-out ${i * 80}ms both`,
            }}>
              {stat.alert && (
                <div style={{
                  position: 'absolute', top: -30, right: -30,
                  width: 80, height: 80, borderRadius: '50%',
                  background: `${stat.colorKey}08`, filter: 'blur(16px)',
                }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontFamily: FONT, fontSize: 10, fontWeight: 600,
                    color: stat.alert ? stat.colorKey : theme.textTer,
                    letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
                  }}>
                    {stat.label}
                  </p>
                  <p style={{
                    fontFamily: FONT, fontSize: 28, fontWeight: 700,
                    color: stat.alert ? stat.colorKey : theme.text,
                    margin: '6px 0 0', letterSpacing: '-0.02em',
                  }}>
                    {stat.value}
                  </p>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${stat.colorKey}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.colorKey,
                }}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Critical alerts */}
      {MOCK_PATIENTS.filter(p => p.status === 'critical').length > 0 && (
        <div style={{
          background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          border: '1px solid rgba(239,68,68,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Shield size={16} color="#EF4444" />
            <span style={{
              fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#EF4444',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Critical Alerts
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_PATIENTS.filter(p => p.status === 'critical').map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#EF4444',
                  animation: 'crisisPulse 2s ease-in-out infinite',
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: theme.text }}>
                    {p.name}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: '#EF4444', marginLeft: 8 }}>
                    {p.lastVitals}
                  </span>
                </div>
                <span style={{ fontFamily: FONT, fontSize: 11, color: theme.textTer }}>
                  Last active: {p.lastActive}
                </span>
                <ChevronRight size={16} color={theme.textTer} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 10,
          background: isDark ? theme.bgSec : '#F9FAFB',
          border: `1px solid ${theme.border}`, flex: 1, minWidth: 200,
        }}>
          <Search size={16} color={theme.textTer} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: theme.text, fontFamily: FONT, fontSize: 14, flex: 1,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {Object.entries(PROGRAMS).map(([key, prog]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                background: filter === key ? `${prog.color}15` : 'transparent',
                border: `1px solid ${filter === key ? prog.color + '40' : theme.border}`,
                color: filter === key ? prog.color : theme.textSec,
                fontFamily: FONT, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {prog.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient table */}
      <div style={{
        background: isDark ? theme.bgSec : '#FFFFFF',
        borderRadius: 14, border: `1px solid ${theme.border}`,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.2fr 1fr 0.8fr 0.8fr 40px',
          padding: '12px 20px', borderBottom: `1px solid ${theme.border}`,
          background: isDark ? theme.bgTer : '#F9FAFB',
        }}>
          {['Patient', 'Program', 'Last Vitals', 'Adherence', 'Status', 'Active', ''].map(h => (
            <span key={h} style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 600,
              color: theme.textTer, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((patient, i) => {
          const prog = PROGRAMS[patient.program]
          return (
            <div
              key={patient.id}
              onClick={() => {}}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.2fr 1fr 0.8fr 0.8fr 40px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? `1px solid ${theme.border}` : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: `${prog.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT, fontSize: 14, fontWeight: 700, color: prog.color,
                }}>
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: theme.text, margin: 0 }}>
                    {patient.name}
                  </p>
                  <p style={{ fontFamily: FONT, fontSize: 11, color: theme.textTer, margin: 0 }}>
                    Age {patient.age}
                  </p>
                </div>
              </div>

              {/* Program pill */}
              <div>
                <span style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: `${prog.color}12`, border: `1px solid ${prog.color}25`,
                  fontFamily: FONT, fontSize: 11, fontWeight: 600, color: prog.color,
                }}>
                  {prog.label}
                </span>
              </div>

              {/* Vitals */}
              <span style={{
                fontFamily: FONT_M, fontSize: 12, color: theme.textSec,
              }}>
                {patient.lastVitals}
              </span>

              {/* Adherence */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 40, height: 4, borderRadius: 2, background: theme.border,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: patient.adherence >= 80 ? '#22C55E' : patient.adherence >= 60 ? '#F59E0B' : '#EF4444',
                    width: `${patient.adherence}%`,
                  }} />
                </div>
                <span style={{ fontFamily: FONT_M, fontSize: 12, color: theme.textSec }}>
                  {patient.adherence}%
                </span>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: statusColor(patient.status),
                }} />
                <span style={{
                  fontFamily: FONT, fontSize: 12, color: statusColor(patient.status),
                  fontWeight: 500, textTransform: 'capitalize',
                }}>
                  {patient.status}
                </span>
              </div>

              {/* Last active */}
              <span style={{ fontFamily: FONT, fontSize: 12, color: theme.textTer }}>
                {patient.lastActive}
              </span>

              {/* Arrow */}
              <ChevronRight size={16} color={theme.textTer} />
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            fontFamily: FONT, fontSize: 14, color: theme.textTer,
          }}>
            No patients found
          </div>
        )}
      </div>

      <style>{`
        @keyframes crisisPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
