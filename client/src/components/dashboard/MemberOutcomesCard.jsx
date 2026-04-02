import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { TrendingUp, TrendingDown, Zap, Users, Brain, Activity, ChevronRight, BarChart2 } from 'lucide-react'

const F  = "'Inter', -apple-system, sans-serif"
const FM = "'JetBrains Mono', monospace"

function StatPill({ label, value, sub, color, theme }) {
  return (
    <div style={{ flex: 1, background: theme.bgTer, borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: theme.textTer, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: F }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: color || theme.text, margin: 0, fontFamily: FM, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: theme.textTer, margin: '4px 0 0', fontFamily: F }}>{sub}</p>}
    </div>
  )
}

function LiftBadge({ pct, theme }) {
  if (pct === null || pct === undefined) return null
  const up = pct >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 12, fontWeight: 700, fontFamily: F,
      color: up ? theme.green : theme.red,
      background: up ? `${theme.green}12` : `${theme.red}12`,
      padding: '3px 9px', borderRadius: 20,
    }}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

function AdoptionBar({ label, icon: Icon, pct, color, count, theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: theme.textSec, fontFamily: F }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, fontFamily: FM }}>{count} <span style={{ color: theme.textTer, fontWeight: 400 }}>({pct}%)</span></span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: theme.border, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 3, background: color, transition: 'width 0.8s ease' }} />
        </div>
      </div>
    </div>
  )
}

export default function MemberOutcomesCard() {
  const { gym } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const gymId = gym?.id
  const [weeks, setWeeks] = useState(8)

  const { data, isLoading } = useQuery({
    queryKey: ['member-outcomes', gymId, weeks],
    queryFn: () => api.get(`/gyms/${gymId}/outcomes/summary?weeks=${weeks}`).then(r => r.data),
    enabled: !!gymId,
    refetchInterval: 300_000,
  })

  const vira = data?.vira_impact
  const circles = data?.circles_impact
  const fitness = data?.fitness_score_trend
  const adoption = data?.feature_adoption
  const adoptionRates = adoption?.adoption_rates
  const total = data?.total_active_members || 0
  const hasData = data?.has_outcome_data

  const card = {
    background: theme.bgSec,
    borderRadius: 16,
    border: `1px solid ${theme.borderStrong}`,
    padding: 24,
  }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${theme.brandAccent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={17} style={{ color: theme.brandAccent }} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: 0, fontFamily: F, textTransform: 'uppercase', letterSpacing: '1px' }}>Member Outcomes</h3>
            <p style={{ fontSize: 11, color: theme.textTer, margin: 0, fontFamily: F }}>Feature usage → results</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[4, 8, 12].map(w => (
            <button key={w} onClick={() => setWeeks(w)} style={{ fontSize: 10, fontWeight: 600, fontFamily: FM, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: weeks === w ? `${theme.brandAccent}20` : theme.bgTer, color: weeks === w ? theme.brandAccent : theme.textTer, transition: 'all 0.15s' }}>
              {w}W
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 60, borderRadius: 12, background: theme.bgTer, opacity: 0.5 + i * 0.15 }} />)}
        </div>
      ) : !hasData ? (
        /* No data yet — first run */
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Activity size={28} style={{ color: theme.textTer, marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: theme.textSec, margin: '0 0 6px', fontFamily: F, fontWeight: 600 }}>Collecting outcome data</p>
          <p style={{ fontSize: 12, color: theme.textTer, margin: 0, fontFamily: F, lineHeight: 1.5 }}>
            {data?.data_available_in || 'Weekly snapshots run every Monday at 2 AM IST.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Vira AI impact */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Brain size={14} style={{ color: theme.brandAccent }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vira AI Impact</span>
              </div>
              {vira?.checkin_lift_pct !== null && <LiftBadge pct={vira?.checkin_lift_pct} theme={theme} />}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <StatPill label="With Vira" value={vira?.avg_checkins_with_vira ?? '—'} sub="check-ins/week" color={theme.brandAccent} theme={theme} />
              <StatPill label="Without Vira" value={vira?.avg_checkins_without_vira ?? '—'} sub="check-ins/week" theme={theme} />
            </div>
            {vira?.checkin_lift_pct !== null && (
              <p style={{ fontSize: 12, color: theme.textSec, margin: '10px 0 0', fontFamily: F, lineHeight: 1.5 }}>
                Members who use Vira AI check in <strong style={{ color: theme.brandAccent }}>{Math.abs(vira.checkin_lift_pct)}% {vira.checkin_lift_pct >= 0 ? 'more' : 'less'}</strong> than those who don't.
              </p>
            )}
          </div>

          {/* Fitness score trend */}
          {fitness?.delta !== null && (
            <div style={{ padding: '14px 16px', borderRadius: 12, background: `${parseFloat(fitness.delta) >= 0 ? theme.green : theme.red}08`, border: `1px solid ${parseFloat(fitness.delta) >= 0 ? theme.green : theme.red}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px', fontFamily: F }}>Avg Fitness Score</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: theme.text, fontFamily: FM }}>{fitness.recent_period_avg}</span>
                    <LiftBadge pct={parseFloat(fitness.delta) >= 0 ? `+${fitness.delta}` : fitness.delta} theme={theme} />
                  </div>
                  <p style={{ fontSize: 11, color: theme.textTer, margin: '3px 0 0', fontFamily: F }}>vs {fitness.early_period_avg} in first {weeks / 2} weeks</p>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: parseFloat(fitness.delta) >= 0 ? `${theme.green}15` : `${theme.red}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {parseFloat(fitness.delta) >= 0 ? <TrendingUp size={22} style={{ color: theme.green }} /> : <TrendingDown size={22} style={{ color: theme.red }} />}
                </div>
              </div>
            </div>
          )}

          {/* Circles impact */}
          {circles?.checkin_lift_pct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: theme.bgTer }}>
              <Users size={16} style={{ color: theme.cyan, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: theme.text, margin: 0, fontFamily: F }}>Circle members check in <strong style={{ color: theme.cyan }}>{Math.abs(circles.checkin_lift_pct)}% {circles.checkin_lift_pct >= 0 ? 'more' : 'less'}</strong></p>
                <p style={{ fontSize: 11, color: theme.textTer, margin: '2px 0 0', fontFamily: F }}>{circles.avg_checkins_with_circle}/wk vs {circles.avg_checkins_without_circle}/wk without a Circle</p>
              </div>
            </div>
          )}

          {/* Feature adoption bars */}
          {adoptionRates && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, fontFamily: F }}>Feature Adoption — {total} active members</p>
              <AdoptionBar label="Vira AI"       icon={Brain}    pct={adoptionRates.vira_ai_pct}       color={theme.brandAccent} count={adoption.vira_ai}       theme={theme} />
              <AdoptionBar label="Circles"        icon={Users}    pct={adoptionRates.circles_pct}        color={theme.cyan}        count={adoption.circles}       theme={theme} />
              <AdoptionBar label="Sleep Tracker"  icon={Activity} pct={adoptionRates.sleep_tracker_pct}  color={theme.amber}       count={adoption.sleep_tracker} theme={theme} />
              <AdoptionBar label="Food Scanner"   icon={Zap}      pct={adoptionRates.food_scanner_pct}   color={theme.green}       count={adoption.food_scanner}  theme={theme} />
            </div>
          )}

          {/* CTA */}
          <button onClick={() => navigate('/dashboard/members?sort=fitness')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 10, background: theme.bgTer, border: `1px solid ${theme.border}`, cursor: 'pointer', fontFamily: F, transition: 'all 0.15s' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSec }}>View per-member outcomes</span>
            <ChevronRight size={15} style={{ color: theme.textTer }} />
          </button>
        </div>
      )}
    </div>
  )
}
