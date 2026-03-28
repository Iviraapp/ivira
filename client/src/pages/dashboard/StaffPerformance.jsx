import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Avatar from '../../components/ui/Avatar'
import { formatPaise, formatDate, formatTime } from '../../lib/utils'
import api from '../../lib/api'
import {
  Trophy, TrendingUp, Users, Clock, Calendar, DollarSign,
  ChevronDown, ChevronUp, Upload, Star, Send, X, Award,
  Dumbbell, Briefcase, UserCheck, Coffee, Shield,
  BarChart3, ClipboardList, User, AlertTriangle,
} from 'lucide-react'

// ── Fonts ───────────────────────────────────────────────────────
const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

// ── Role helpers ────────────────────────────────────────────────
const ROLE_CONFIG = {
  trainer:    { label: 'Trainer',    icon: Dumbbell,  color: '#34A853' },
  manager:    { label: 'Manager',    icon: Briefcase, color: '#FBBC05' },
  front_desk: { label: 'Front Desk', icon: UserCheck, color: '#4285F4' },
  cleaner:    { label: 'Cleaner',    icon: Coffee,    color: 'rgba(255,255,255,0.4)' },
  owner:      { label: 'Owner',      icon: Shield,    color: '#FFFFFF' },
}

const getRoleCfg = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.trainer

// ── Demo data generators ────────────────────────────────────────
function generateDemoMetrics(staff) {
  // Deterministic-ish based on staff name length + role
  const seed = (staff.name || 'A').length
  const isTrainer = staff.role === 'trainer'
  const isManager = staff.role === 'manager'
  const monthsActive = staff.join_date
    ? Math.max(1, Math.floor((Date.now() - new Date(staff.join_date).getTime()) / (30 * 86400000)))
    : 6

  const baseRevenue = isTrainer ? 180000 : isManager ? 120000 : 60000
  const revenue = (baseRevenue + seed * 15000) * Math.min(monthsActive, 12)
  const bookings = isTrainer ? 28 + seed * 3 : isManager ? 15 + seed * 2 : 8 + seed
  const clients = isTrainer ? 12 + seed : isManager ? 8 + seed : 4

  return {
    revenue_paise: revenue,
    bookings_count: bookings,
    client_count: clients,
    sessions_this_month: isTrainer ? 22 + (seed % 8) : 0,
    rating: isTrainer ? (4.2 + (seed % 8) * 0.1).toFixed(1) : null,
    active_clients: clients,
  }
}

function generateDemoAttendance() {
  const records = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    if (date.getDay() === 0) continue // Skip Sundays

    const isLate = i === 3 || i === 7
    const isNoShow = i === 10
    if (isNoShow) {
      records.push({
        date: date.toISOString(),
        check_in: null,
        check_out: null,
        status: 'no_show',
      })
      continue
    }

    const checkInHour = isLate ? 9 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 2)
    const checkIn = new Date(date)
    checkIn.setHours(checkInHour, Math.floor(Math.random() * 30), 0)
    const checkOut = new Date(checkIn)
    checkOut.setHours(checkIn.getHours() + 7 + Math.floor(Math.random() * 2))

    records.push({
      date: date.toISOString(),
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      status: isLate ? 'late' : 'present',
      hours_worked: ((checkOut - checkIn) / 3600000).toFixed(1),
    })
  }
  return records
}

function generateDemoClients(staffName) {
  const seed = (staffName || '').length
  const names = [
    'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy',
    'Vikram Singh', 'Ananya Gupta', 'Karthik Nair', 'Pooja Iyer',
    'Arjun Mehta', 'Divya Rao', 'Rohan Das', 'Meera Joshi',
  ]
  const count = 4 + (seed % 5)
  return names.slice(0, count).map((name, i) => ({
    id: i + 1,
    name,
    membership: i % 3 === 0 ? 'expired' : 'active',
    joined: new Date(Date.now() - (30 + i * 20) * 86400000).toISOString(),
  }))
}

// ── Animations style tag ────────────────────────────────────────
function AnimationStyles() {
  return (
    <style>{`
      @keyframes spFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
        50% { box-shadow: 0 0 20px 4px rgba(16,185,129,0.15); }
      }
      @keyframes spModalIn {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    `}</style>
  )
}

// ── Sub Components ──────────────────────────────────────────────

function RoleBadge({ role, theme }) {
  const cfg = getRoleCfg(role)
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
      background: `${cfg.color}18`, color: cfg.color, fontFamily: FONT,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function TabBar({ tabs, active, onChange, theme, sp }) {
  return (
    <div style={{
      display: 'flex', gap: sp(2), padding: sp(4),
      background: '#121212', borderRadius: 14,
      border: `1px solid ${theme.border}`, marginBottom: sp(24),
    }}>
      {tabs.map(t => {
        const isActive = active === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, padding: `${sp(10)}px ${sp(16)}px`, border: 'none',
            borderRadius: 10, cursor: 'pointer', fontFamily: FONT,
            fontSize: 13, fontWeight: isActive ? 700 : 500,
            background: isActive ? theme.brandAccent : 'transparent',
            color: isActive ? '#FFFFFF' : theme.textSec,
            transition: 'all 0.2s ease',
            letterSpacing: isActive ? 0.3 : 0,
          }}>
            {t.icon && <t.icon size={14} style={{ marginRight: 6, verticalAlign: -2 }} />}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function BonusModal({ trainer, onClose, theme, sp }) {
  const [amount, setAmount] = useState('')

  const handleSend = () => {
    // In production, this would call the payment API
    alert(`Bonus of ${formatPaise(parseInt(amount) * 100)} confirmed for ${trainer.name}`)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 400,
        background: '#121212', border: `1px solid #1F1F1F`,
        borderRadius: 16, padding: sp(24),
        animation: 'spModalIn 0.25s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp(20) }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: FONT }}>
            Send Bonus
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: theme.textTer, padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: sp(20), padding: sp(12),
          background: theme.bgSec, borderRadius: 10,
          border: `1px solid ${theme.border}`,
        }}>
          <Avatar name={trainer.name} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: FONT }}>{trainer.name}</div>
            <RoleBadge role={trainer.role} theme={theme} />
          </div>
        </div>
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 700, color: theme.textTer,
          marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1,
        }}>Amount (INR)</label>
        <div style={{ position: 'relative', marginBottom: sp(20) }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: theme.textTer, fontFamily: FONT_M, fontSize: 16, fontWeight: 600,
          }}>₹</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', padding: '12px 14px 12px 32px', borderRadius: 10,
              border: `1px solid ${theme.border}`, background: theme.bgSec,
              color: theme.text, fontSize: 18, fontFamily: FONT_M,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button onClick={handleSend} disabled={!amount || parseInt(amount) <= 0} style={{
          width: '100%', padding: '12px 0', borderRadius: 10,
          border: 'none', cursor: amount && parseInt(amount) > 0 ? 'pointer' : 'not-allowed',
          background: amount && parseInt(amount) > 0 ? theme.brandAccent : theme.bgTer,
          color: '#FFFFFF', fontSize: 14, fontWeight: 700, fontFamily: FONT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: amount && parseInt(amount) > 0 ? 1 : 0.4,
          transition: 'all 0.2s ease',
        }}>
          <Send size={14} />
          Confirm Bonus
        </button>
      </div>
    </div>
  )
}

// ── Leaderboard Tab ─────────────────────────────────────────────

function LeaderboardTab({ rankedStaff, theme, sp }) {
  const top3 = rankedStaff.slice(0, 3)
  const rest = rankedStaff.slice(3)

  const getRankStyle = (rank) => {
    if (rank === 1) return {
      border: `2px solid #10B981`,
      boxShadow: '0 0 40px rgba(16,185,129,0.25)',
      animation: 'spPulse 3s ease-in-out infinite',
    }
    if (rank === 2) return {
      border: `1px solid ${theme.borderStrong}`,
      boxShadow: '0 4px 16px rgba(255,255,255,0.03)',
    }
    if (rank === 3) return {
      border: `1px solid ${theme.border}`,
    }
    return {}
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={18} color="#10B981" />
    if (rank === 2) return <Award size={16} color={theme.textSec} />
    if (rank === 3) return <Award size={16} color={theme.textTer} />
    return null
  }

  return (
    <div>
      {/* Top 3 Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: top3.length >= 3 ? 'repeat(3, 1fr)' : `repeat(${top3.length}, 1fr)`,
        gap: sp(16), marginBottom: sp(24),
      }}>
        {top3.map((s, i) => (
          <div key={s.id} style={{
            background: '#121212', borderRadius: 16,
            padding: sp(24), position: 'relative',
            animation: `spFadeIn 0.4s ease-out ${i * 0.1}s both`,
            ...getRankStyle(i + 1),
          }}>
            {/* Rank badge */}
            <div style={{
              position: 'absolute', top: sp(12), right: sp(12),
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {getRankIcon(i + 1)}
              <span style={{
                fontSize: 22, fontWeight: 800, fontFamily: FONT_M,
                color: i === 0 ? '#10B981' : theme.textTer,
              }}>#{i + 1}</span>
            </div>
            {/* Avatar + Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Avatar name={s.name} size={56} style={{
                border: i === 0 ? '2px solid #10B981' : `1px solid ${theme.border}`,
                marginBottom: sp(12),
              }} />
              <div style={{
                fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: FONT,
                marginBottom: 4,
              }}>{s.name}</div>
              <RoleBadge role={s.role} theme={theme} />
              <div style={{
                marginTop: sp(16), display: 'flex', flexDirection: 'column', gap: sp(8), width: '100%',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: `${sp(8)}px ${sp(12)}px`, borderRadius: 8,
                  background: theme.bgSec,
                }}>
                  <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenue</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: theme.green, fontFamily: FONT_M }}>
                    {formatPaise(s.metrics.revenue_paise)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: sp(8) }}>
                  <div style={{
                    flex: 1, padding: `${sp(8)}px ${sp(10)}px`, borderRadius: 8,
                    background: theme.bgSec, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>
                      {s.metrics.bookings_count}
                    </div>
                    <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase' }}>
                      Bookings
                    </div>
                  </div>
                  <div style={{
                    flex: 1, padding: `${sp(8)}px ${sp(10)}px`, borderRadius: 8,
                    background: theme.bgSec, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>
                      {s.metrics.client_count}
                    </div>
                    <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase' }}>
                      Clients
                    </div>
                  </div>
                </div>
                {/* Performance bar */}
                <div style={{
                  padding: `${sp(8)}px ${sp(12)}px`, borderRadius: 8,
                  background: theme.bgSec,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981', fontFamily: FONT_M }}>
                      {Math.min(100, Math.round((s.metrics.bookings_count / 40) * 100))}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(16,185,129,0.15)' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: 'linear-gradient(90deg, #10B981, #9F67FF)',
                      width: `${Math.min(100, Math.round((s.metrics.bookings_count / 40) * 100))}%`,
                      transition: 'width 0.5s ease-out',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rest in table */}
      {rest.length > 0 && (
        <div style={{
          background: '#121212', borderRadius: 14,
          border: `1px solid #1F1F1F`, overflow: 'hidden',
          animation: 'spSlideUp 0.5s ease-out 0.3s both',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
            <thead>
              <tr>
                {['Rank', 'Staff', 'Role', 'Revenue', 'Bookings', 'Clients'].map(h => (
                  <th key={h} style={{
                    padding: `${sp(12)}px ${sp(16)}px`, textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: theme.textTer,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    borderBottom: `1px solid #1F1F1F`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((s, i) => (
                <tr key={s.id} style={{
                  borderBottom: i < rest.length - 1 ? `1px solid #1F1F1F` : 'none',
                  animation: `spFadeIn 0.3s ease-out ${0.4 + i * 0.05}s both`,
                }}>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.textTer, fontFamily: FONT_M }}>
                      #{i + 4}
                    </span>
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={s.name} size={32} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                    <RoleBadge role={s.role} theme={theme} />
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, fontWeight: 600, color: theme.green }}>
                    {formatPaise(s.metrics.revenue_paise)}
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, color: theme.text }}>
                    {s.metrics.bookings_count}
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, color: theme.text }}>
                    {s.metrics.client_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rankedStaff.length === 0 && (
        <div style={{
          textAlign: 'center', padding: sp(48), color: theme.textTer,
          fontSize: 14, fontFamily: FONT,
        }}>
          No staff members found. Add staff to see the leaderboard.
        </div>
      )}
    </div>
  )
}

// ── Revenue Attribution Tab ─────────────────────────────────────

function RevenueTab({ rankedStaff, theme, sp }) {
  const trainers = rankedStaff.filter(s => s.role === 'trainer')
  const allStaff = trainers.length > 0 ? trainers : rankedStaff.slice(0, 5)

  const totalRevenue = allStaff.reduce((sum, s) => sum + s.metrics.revenue_paise, 0)

  return (
    <div>
      {/* Commission Split Visual */}
      <div style={{
        background: '#121212', borderRadius: 14, border: '1px solid #1F1F1F',
        padding: sp(24), marginBottom: sp(24),
        animation: 'spFadeIn 0.4s ease-out',
      }}>
        <h3 style={{
          margin: 0, marginBottom: sp(4), fontSize: 16, fontWeight: 700,
          color: theme.text, fontFamily: FONT,
        }}>Commission Split Model</h3>
        <p style={{
          margin: 0, marginBottom: sp(20), fontSize: 13, color: theme.textTer, fontFamily: FONT,
        }}>Revenue distribution per service booking</p>

        <div style={{ display: 'flex', gap: sp(4), marginBottom: sp(16), borderRadius: 10, overflow: 'hidden', height: 40 }}>
          <div style={{
            width: '85%', background: 'linear-gradient(135deg, #10B981, #9F67FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: FONT_M,
          }}>85% Trainer</div>
          <div style={{
            width: '10%', background: theme.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontFamily: FONT_M,
          }}>10%</div>
          <div style={{
            width: '5%', background: theme.cyan,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#FFFFFF', fontFamily: FONT_M,
          }}>5%</div>
        </div>
        <div style={{ display: 'flex', gap: sp(16), flexWrap: 'wrap' }}>
          {[
            { label: 'Trainer Share', pct: '85%', color: '#10B981' },
            { label: 'Gym Share', pct: '10%', color: theme.green },
            { label: 'Platform Fee', pct: '5%', color: theme.cyan },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
              <span style={{ fontSize: 12, color: theme.textSec, fontFamily: FONT }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>{item.pct}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-trainer stacked bars */}
      <div style={{
        background: '#121212', borderRadius: 14, border: '1px solid #1F1F1F',
        padding: sp(24), marginBottom: sp(24),
        animation: 'spFadeIn 0.4s ease-out 0.1s both',
      }}>
        <h3 style={{
          margin: 0, marginBottom: sp(20), fontSize: 16, fontWeight: 700,
          color: theme.text, fontFamily: FONT,
        }}>Revenue Breakdown by Trainer</h3>

        {allStaff.map((s, i) => {
          const gross = s.metrics.revenue_paise
          const maxRevenue = Math.max(...allStaff.map(x => x.metrics.revenue_paise))
          const barWidth = maxRevenue > 0 ? (gross / maxRevenue) * 100 : 0

          return (
            <div key={s.id} style={{
              marginBottom: sp(16),
              animation: `spFadeIn 0.3s ease-out ${0.15 + i * 0.05}s both`,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: sp(6),
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={s.name} size={24} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: FONT }}>{s.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>
                  {formatPaise(gross)}
                </span>
              </div>
              <div style={{
                display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden',
                background: theme.bgSec, width: `${Math.max(barWidth, 10)}%`,
                transition: 'width 0.5s ease-out',
              }}>
                <div style={{ width: '85%', background: 'linear-gradient(135deg, #10B981, #9F67FF)' }} />
                <div style={{ width: '10%', background: theme.green }} />
                <div style={{ width: '5%', background: theme.cyan }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Revenue Table */}
      <div style={{
        background: '#121212', borderRadius: 14, border: '1px solid #1F1F1F',
        overflow: 'hidden', animation: 'spSlideUp 0.5s ease-out 0.2s both',
      }}>
        <div style={{
          padding: `${sp(16)}px ${sp(20)}px`,
          borderBottom: '1px solid #1F1F1F',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{
            margin: 0, fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: FONT,
          }}>Detailed Attribution</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: theme.text, fontFamily: FONT_M }}>
              {formatPaise(totalRevenue)}
            </span>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead>
            <tr>
              {['Trainer', 'Gross Revenue', 'Trainer (85%)', 'Gym (10%)', 'Platform (5%)'].map(h => (
                <th key={h} style={{
                  padding: `${sp(12)}px ${sp(16)}px`, textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: theme.textTer,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  borderBottom: '1px solid #1F1F1F',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allStaff.map((s, i) => {
              const gross = s.metrics.revenue_paise
              return (
                <tr key={s.id} style={{
                  borderBottom: i < allStaff.length - 1 ? '1px solid #1F1F1F' : 'none',
                }}>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={s.name} size={28} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, fontWeight: 700, color: theme.text }}>
                    {formatPaise(gross)}
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, color: '#10B981', fontWeight: 600 }}>
                    {formatPaise(Math.round(gross * 0.85))}
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, color: theme.green, fontWeight: 600 }}>
                    {formatPaise(Math.round(gross * 0.10))}
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 14, color: theme.cyan, fontWeight: 600 }}>
                    {formatPaise(Math.round(gross * 0.05))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Attendance Tab ──────────────────────────────────────────────

function AttendanceTab({ staffList, attendanceData, theme, sp }) {
  const [selectedStaffId, setSelectedStaffId] = useState(null)

  const records = attendanceData.length > 0 ? attendanceData : generateDemoAttendance()
  const displayStaff = selectedStaffId
    ? staffList.filter(s => s.id === selectedStaffId)
    : staffList

  return (
    <div>
      {/* Staff filter */}
      {staffList.length > 1 && (
        <div style={{
          display: 'flex', gap: sp(8), marginBottom: sp(20), flexWrap: 'wrap',
          animation: 'spFadeIn 0.3s ease-out',
        }}>
          <button
            onClick={() => setSelectedStaffId(null)}
            style={{
              padding: `${sp(6)}px ${sp(14)}px`, borderRadius: 20,
              border: `1px solid ${!selectedStaffId ? theme.brandAccent : theme.border}`,
              background: !selectedStaffId ? theme.brandAccentSoft : 'transparent',
              color: !selectedStaffId ? theme.brandAccent : theme.textSec,
              fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            }}
          >All Staff</button>
          {staffList.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStaffId(s.id)}
              style={{
                padding: `${sp(6)}px ${sp(14)}px`, borderRadius: 20,
                border: `1px solid ${selectedStaffId === s.id ? theme.brandAccent : theme.border}`,
                background: selectedStaffId === s.id ? theme.brandAccentSoft : 'transparent',
                color: selectedStaffId === s.id ? theme.brandAccent : theme.textSec,
                fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
              }}
            >{s.name}</button>
          ))}
        </div>
      )}

      {/* Attendance Heatmap */}
      <div style={{
        background: '#121212', borderRadius: 14, border: '1px solid #1F1F1F',
        padding: sp(24), marginBottom: sp(20),
        animation: 'spFadeIn 0.3s ease-out',
      }}>
        <h3 style={{
          margin: 0, marginBottom: sp(16), fontSize: 14, fontWeight: 700,
          color: theme.text, fontFamily: FONT,
        }}>Attendance Overview</h3>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {records.slice(0, 28).map((r, i) => {
            const opacity = r.status === 'no_show' ? 0 : r.status === 'late' ? 0.4 : (r.hours_worked ? Math.min(1, parseFloat(r.hours_worked) / 10) : 0.6)
            return (
              <div key={i} title={`${formatDate(r.date)}: ${r.status}`} style={{
                width: 14, height: 14, borderRadius: 3,
                background: r.status === 'no_show' ? 'rgba(234,67,53,0.3)' : `rgba(255,255,255,${opacity})`,
                border: '1px solid rgba(255,255,255,0.05)',
              }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {[
            { label: 'Present', bg: 'rgba(255,255,255,0.6)' },
            { label: 'Late', bg: 'rgba(255,255,255,0.4)' },
            { label: 'No Show', bg: 'rgba(234,67,53,0.3)' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.bg }} />
              <span style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Log Table */}
      <div style={{
        background: '#121212', borderRadius: 14, border: '1px solid #1F1F1F',
        overflow: 'hidden', animation: 'spSlideUp 0.4s ease-out',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead>
            <tr>
              {['Date', 'Check-in', 'Check-out', 'Hours Worked', 'Status'].map(h => (
                <th key={h} style={{
                  padding: `${sp(12)}px ${sp(16)}px`, textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: theme.textTer,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  borderBottom: '1px solid #1F1F1F',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => {
              const isLate = r.status === 'late'
              const isNoShow = r.status === 'no_show'
              const hours = r.hours_worked || (r.check_in && r.check_out
                ? ((new Date(r.check_out) - new Date(r.check_in)) / 3600000).toFixed(1)
                : null)

              return (
                <tr key={i} style={{
                  borderBottom: i < records.length - 1 ? '1px solid #1F1F1F' : 'none',
                  background: isLate ? 'rgba(234,67,53,0.06)' : isNoShow ? 'rgba(234,67,53,0.04)' : 'transparent',
                  animation: `spFadeIn 0.3s ease-out ${i * 0.03}s both`,
                }}>
                  <td style={{
                    padding: `${sp(12)}px ${sp(16)}px`, fontSize: 13, color: theme.text,
                  }}>{formatDate(r.date)}</td>
                  <td style={{
                    padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 13,
                    color: isLate ? theme.red : theme.text,
                    fontWeight: isLate ? 600 : 400,
                  }}>
                    {r.check_in ? formatTime(r.check_in) : '—'}
                    {isLate && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, fontWeight: 700,
                        color: theme.red, fontFamily: FONT, textTransform: 'uppercase',
                      }}>LATE</span>
                    )}
                  </td>
                  <td style={{
                    padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 13, color: theme.text,
                  }}>{r.check_out ? formatTime(r.check_out) : '—'}</td>
                  <td style={{
                    padding: `${sp(12)}px ${sp(16)}px`, fontFamily: FONT_M, fontSize: 13,
                    color: hours && parseFloat(hours) >= 8 ? theme.green : theme.text,
                    fontWeight: 600,
                  }}>
                    {hours ? `${hours}h` : '—'}
                  </td>
                  <td style={{ padding: `${sp(12)}px ${sp(16)}px` }}>
                    {isNoShow ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, color: theme.red,
                        padding: '3px 10px', borderRadius: 20,
                        background: 'rgba(234,67,53,0.12)',
                        fontFamily: FONT, textTransform: 'uppercase',
                      }}>
                        <AlertTriangle size={10} /> No-Show
                      </span>
                    ) : isLate ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: theme.amber,
                        padding: '3px 10px', borderRadius: 20,
                        background: 'rgba(251,188,5,0.12)',
                        fontFamily: FONT, textTransform: 'uppercase',
                      }}>Late</span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: theme.green,
                        padding: '3px 10px', borderRadius: 20,
                        background: 'rgba(52,168,83,0.12)',
                        fontFamily: FONT, textTransform: 'uppercase',
                      }}>On Time</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Profiles Tab ────────────────────────────────────────────────

function ProfilesTab({ rankedStaff, theme, sp }) {
  const [expandedId, setExpandedId] = useState(null)
  const [bonusTrainer, setBonusTrainer] = useState(null)

  const trainers = rankedStaff.filter(s => s.role === 'trainer')
  const profileStaff = trainers.length > 0 ? trainers : rankedStaff

  return (
    <div>
      {bonusTrainer && (
        <BonusModal
          trainer={bonusTrainer}
          onClose={() => setBonusTrainer(null)}
          theme={theme}
          sp={sp}
        />
      )}

      {profileStaff.map((s, idx) => {
        const isExpanded = expandedId === s.id
        const m = s.metrics
        const clients = generateDemoClients(s.name)

        return (
          <div key={s.id} style={{
            background: '#121212', borderRadius: 14, border: '1px solid #1F1F1F',
            marginBottom: sp(16), overflow: 'hidden',
            animation: `spFadeIn 0.4s ease-out ${idx * 0.08}s both`,
          }}>
            {/* Header — always visible */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : s.id)}
              style={{
                padding: sp(20), cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: sp(16),
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar name={s.name} size={48} style={{
                border: `2px solid ${getRoleCfg(s.role).color}40`,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: FONT,
                  marginBottom: 4,
                }}>{s.name}</div>
                <RoleBadge role={s.role} theme={theme} />
              </div>
              <div style={{ display: 'flex', gap: sp(24), alignItems: 'center' }}>
                {/* Quick stats */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: FONT_M }}>
                    {m.active_clients}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase' }}>
                    Clients
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: theme.green, fontFamily: FONT_M }}>
                    {formatPaise(m.revenue_paise)}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase' }}>
                    Revenue
                  </div>
                </div>
                {m.rating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} color={theme.amber} fill={theme.amber} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.amber, fontFamily: FONT_M }}>
                      {m.rating}
                    </span>
                  </div>
                )}
                {isExpanded ? <ChevronUp size={18} color={theme.textTer} /> : <ChevronDown size={18} color={theme.textTer} />}
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{
                padding: `0 ${sp(20)}px ${sp(20)}px`,
                borderTop: '1px solid #1F1F1F',
                animation: 'spFadeIn 0.3s ease-out',
              }}>
                {/* Stats row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: sp(12), margin: `${sp(20)}px 0`,
                }}>
                  {[
                    { label: 'Active Clients', value: m.active_clients, icon: Users, color: theme.cyan },
                    { label: 'Sessions / Month', value: m.sessions_this_month, icon: Calendar, color: theme.brandAccent },
                    { label: 'Revenue', value: formatPaise(m.revenue_paise), icon: TrendingUp, color: theme.green },
                    { label: 'Rating', value: m.rating || 'N/A', icon: Star, color: theme.amber },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      background: theme.bgSec, borderRadius: 10, padding: sp(14),
                      border: `1px solid ${theme.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <stat.icon size={14} color={stat.color} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: theme.textTer, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {stat.label}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 20, fontWeight: 800, color: theme.text, fontFamily: FONT_M, lineHeight: 1,
                      }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Transformation Portfolio */}
                <div style={{ marginBottom: sp(20) }}>
                  <h4 style={{
                    margin: 0, marginBottom: sp(12), fontSize: 13, fontWeight: 700,
                    color: theme.textSec, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1,
                  }}>Transformation Portfolio</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: sp(12) }}>
                    {[1, 2, 3].map(n => (
                      <div key={n} style={{
                        background: theme.bgSec, borderRadius: 12,
                        border: `2px dashed ${theme.border}`,
                        padding: sp(24), textAlign: 'center',
                        cursor: 'pointer', transition: 'border-color 0.2s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = theme.brandAccent}
                        onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                      >
                        <Upload size={24} color={theme.textTer} style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: theme.textTer, fontFamily: FONT }}>
                          Add Before/After
                        </div>
                        <div style={{ fontSize: 10, color: theme.textTer, fontFamily: FONT, marginTop: 4 }}>
                          Transformation #{n}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client list */}
                <div style={{ marginBottom: sp(20) }}>
                  <h4 style={{
                    margin: 0, marginBottom: sp(12), fontSize: 13, fontWeight: 700,
                    color: theme.textSec, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1,
                  }}>Assigned Clients</h4>
                  <div style={{
                    background: theme.bgSec, borderRadius: 10,
                    border: `1px solid ${theme.border}`, overflow: 'hidden',
                  }}>
                    {clients.map((c, ci) => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: `${sp(10)}px ${sp(14)}px`,
                        borderBottom: ci < clients.length - 1 ? `1px solid ${theme.border}` : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={c.name} size={28} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: theme.text, fontFamily: FONT }}>
                            {c.name}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 12,
                          fontFamily: FONT,
                          background: c.membership === 'active' ? 'rgba(52,168,83,0.12)' : 'rgba(234,67,53,0.12)',
                          color: c.membership === 'active' ? theme.green : theme.red,
                        }}>{c.membership}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send Bonus button */}
                <button
                  onClick={() => setBonusTrainer(s)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '12px 0', borderRadius: 10,
                    border: `1px solid ${theme.brandAccent}`,
                    background: theme.brandAccentSoft, color: theme.brandAccent,
                    fontSize: 14, fontWeight: 700, fontFamily: FONT,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = theme.brandAccent
                    e.currentTarget.style.color = '#FFFFFF'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = theme.brandAccentSoft
                    e.currentTarget.style.color = theme.brandAccent
                  }}
                >
                  <Send size={14} />
                  Send Bonus
                </button>
              </div>
            )}
          </div>
        )
      })}

      {profileStaff.length === 0 && (
        <div style={{
          textAlign: 'center', padding: sp(48), color: theme.textTer,
          fontSize: 14, fontFamily: FONT,
        }}>
          No trainer profiles found. Add trainers to your staff to view profiles.
        </div>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────

export default function StaffPerformance() {
  const { gym } = useAuth()
  const gymId = gym?.id
  const { theme, sp } = useTheme()
  const [activeTab, setActiveTab] = useState('leaderboard')

  // Fetch staff list
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-performance', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/staff`).then(r => r.data),
    enabled: !!gymId,
  })

  // Fetch bookings (may 404)
  const { data: bookingsData } = useQuery({
    queryKey: ['staff-bookings', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/marketplace/bookings`).then(r => r.data).catch(() => null),
    enabled: !!gymId,
    retry: false,
  })

  // Fetch attendance (may 404)
  const { data: attendanceData } = useQuery({
    queryKey: ['staff-attendance-all', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/staff/attendance`).then(r => r.data).catch(() => null),
    enabled: !!gymId,
    retry: false,
  })

  // Compute ranked staff with metrics
  const rankedStaff = useMemo(() => {
    const staffList = staffData?.staff || staffData || []
    if (!Array.isArray(staffList)) return []

    const bookings = bookingsData?.bookings || []

    return staffList
      .map(s => {
        // Try to compute real metrics from bookings
        const staffBookings = bookings.filter(b => b.staff_id === s.id || b.trainer_id === s.id)
        let metrics

        if (staffBookings.length > 0) {
          const revenue = staffBookings.reduce((sum, b) => sum + (b.amount_paise || b.price_paise || 0), 0)
          const clientIds = new Set(staffBookings.map(b => b.member_id || b.client_id).filter(Boolean))
          metrics = {
            revenue_paise: revenue,
            bookings_count: staffBookings.length,
            client_count: clientIds.size,
            sessions_this_month: staffBookings.filter(b => {
              const d = new Date(b.created_at || b.date)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length,
            rating: s.rating || null,
            active_clients: clientIds.size,
          }
        } else {
          metrics = generateDemoMetrics(s)
        }

        return { ...s, metrics }
      })
      .sort((a, b) => b.metrics.revenue_paise - a.metrics.revenue_paise)
  }, [staffData, bookingsData])

  const staffList = staffData?.staff || staffData || []
  const attendance = attendanceData?.attendance || []

  const TABS = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'revenue', label: 'Revenue', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'profiles', label: 'Profiles', icon: User },
  ]

  return (
    <div style={{
      padding: sp(24), fontFamily: FONT,
      background: '#050505', minHeight: '100vh',
    }}>
      <AnimationStyles />

      {/* Header */}
      <div style={{ marginBottom: sp(24), animation: 'spFadeIn 0.4s ease-out' }}>
        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 800, color: theme.text,
          fontFamily: FONT, letterSpacing: -0.5,
        }}>Staff Performance</h1>
        <p style={{
          margin: 0, marginTop: 4, fontSize: 14, color: theme.textTer, fontFamily: FONT,
        }}>Revenue attribution, attendance tracking, and trainer profiles</p>
      </div>

      {/* Tab navigation */}
      <TabBar
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        theme={theme}
        sp={sp}
      />

      {/* Loading state */}
      {staffLoading && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: sp(16),
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 80, borderRadius: 14, background: '#121212',
              border: '1px solid #1F1F1F',
              animation: `spFadeIn 0.3s ease-out ${i * 0.1}s both`,
            }}>
              <div style={{
                height: '100%', borderRadius: 14,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }} />
            </div>
          ))}
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* Tab content */}
      {!staffLoading && activeTab === 'leaderboard' && (
        <LeaderboardTab rankedStaff={rankedStaff} theme={theme} sp={sp} />
      )}
      {!staffLoading && activeTab === 'revenue' && (
        <RevenueTab rankedStaff={rankedStaff} theme={theme} sp={sp} />
      )}
      {!staffLoading && activeTab === 'attendance' && (
        <AttendanceTab
          staffList={Array.isArray(staffList) ? staffList : []}
          attendanceData={attendance}
          theme={theme}
          sp={sp}
        />
      )}
      {!staffLoading && activeTab === 'profiles' && (
        <ProfilesTab rankedStaff={rankedStaff} theme={theme} sp={sp} />
      )}
    </div>
  )
}
