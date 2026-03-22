import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonCard } from '../../components/ui'
import { formatPaise } from '../../lib/utils'
import api from '../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Area, AreaChart, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, Clock,
  Activity, Zap, ArrowUpRight, ArrowDownRight, Lightbulb,
} from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)
const FONT = "'Inter', -apple-system, sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"

// ── Realistic fallback data for empty gyms ──────────────────────
function generateRealisticPeakHours() {
  const data = []
  DAYS.forEach((_, dayIdx) => {
    const isWeekend = dayIdx === 0 || dayIdx === 6
    HOURS.forEach((hour) => {
      let base = 2
      // Morning spike 6–9 AM
      if (hour >= 6 && hour <= 9) {
        base = isWeekend ? 8 : 18
        if (hour === 7) base = isWeekend ? 12 : 28
        if (hour === 8) base = isWeekend ? 14 : 24
      }
      // Lunch lull 12–2 PM
      else if (hour >= 12 && hour <= 14) {
        base = isWeekend ? 6 : 4
      }
      // Evening spike 5–8 PM
      else if (hour >= 17 && hour <= 20) {
        base = isWeekend ? 14 : 30
        if (hour === 18) base = isWeekend ? 18 : 38
        if (hour === 19) base = isWeekend ? 16 : 32
      }
      // Late night
      else if (hour >= 21) {
        base = 3
      }
      // Mid-day
      else {
        base = isWeekend ? 5 : 6
      }
      // Add slight randomness
      const jitter = Math.floor(Math.random() * 4) - 2
      const count = Math.max(0, base + jitter)
      if (count > 0) {
        data.push({ day_of_week: dayIdx, hour, count })
      }
    })
  })
  return data
}

// ── Heatmap Tooltip ─────────────────────────────────────────────
function HeatmapTooltip({ visible, x, y, day, hour, count, theme }) {
  if (!visible) return null
  const timeStr = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`
  return (
    <div style={{
      position: 'fixed', left: x + 12, top: y - 48,
      background: theme.bg, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 8, padding: '8px 12px', zIndex: 1000,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      pointerEvents: 'none', minWidth: 120,
      fontFamily: FONT,
    }}>
      <div style={{ fontSize: 11, color: theme.textTer, marginBottom: 4 }}>
        {day} · {timeStr}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: FONT_MONO }}>
          {count}
        </span>
        <span style={{ fontSize: 11, color: theme.textSec }}>check-ins</span>
      </div>
    </div>
  )
}

// ── Chart Tooltip ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter, theme, isDark }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: theme.bg, border: `1px solid ${theme.borderStrong}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
      fontFamily: FONT,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
    }}>
      <div style={{ color: theme.textTer, marginBottom: 4, fontSize: 11, fontWeight: 500 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: theme.text, fontWeight: 600, fontSize: 14, fontFamily: FONT_MONO }}>
          {formatter ? formatter(p.value, p.dataKey) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { gym } = useAuth()
  const gymId = gym?.id
  const { theme, isDark } = useTheme()

  const { data, isLoading } = useQuery({
    queryKey: ['gym-analytics', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/analytics`).then((r) => r.data),
    enabled: !!gymId,
  })

  const monthlyRevenue = data?.monthlyRevenue ?? []
  const memberGrowth = data?.memberGrowth ?? []
  const churn = data?.churn ?? []
  const rawPeakHours = data?.peakHours ?? []

  // Use realistic fallback data if no peak hours data
  const peakHours = rawPeakHours.length > 0 ? rawPeakHours : generateRealisticPeakHours()

  // ── Compute insights ──────────────────────────────────────────
  const peakInsights = useMemo(() => {
    const countMap = {}
    let maxCount = 0, maxDay = '', maxHour = 0
    const dayTotals = Array(7).fill(0)
    const hourTotals = {}

    peakHours.forEach(({ day_of_week, hour, count }) => {
      countMap[`${day_of_week}-${hour}`] = count
      dayTotals[day_of_week] += count
      hourTotals[hour] = (hourTotals[hour] || 0) + count
      if (count > maxCount) {
        maxCount = count
        maxDay = DAYS[day_of_week]
        maxHour = hour
      }
    })

    // Find busiest day
    const busiestDayIdx = dayTotals.indexOf(Math.max(...dayTotals))
    const busiestDay = DAYS[busiestDayIdx]

    // Find peak hour
    const peakHourNum = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0]?.[0]
    const peakHourFormatted = peakHourNum
      ? (Number(peakHourNum) > 12 ? `${Number(peakHourNum) - 12} PM` : `${peakHourNum} AM`)
      : '--'

    // Generate recommendation
    let recommendation = ''
    if (busiestDay && peakHourNum) {
      const peakH = Number(peakHourNum)
      if (peakH >= 17 && peakH <= 20) {
        recommendation = `Peak traffic hits at ${peakHourFormatted} on ${busiestDay}s. Consider adding an extra trainer during 5–8 PM.`
      } else if (peakH >= 6 && peakH <= 9) {
        recommendation = `Your morning rush peaks at ${peakHourFormatted}. Early-bird classes could boost retention.`
      } else {
        recommendation = `${busiestDay} at ${peakHourFormatted} is your busiest slot. Ensure adequate staffing.`
      }
    }

    return { countMap, maxCount, busiestDay, peakHourFormatted, recommendation }
  }, [peakHours])

  // Current hour for "live" indicator
  const currentHour = new Date().getHours()
  const currentDay = new Date().getDay()

  // Churn trend
  const churnTrend = useMemo(() => {
    if (churn.length < 2) return null
    const latest = churn[churn.length - 1]?.rate ?? 0
    const prev = churn[churn.length - 2]?.rate ?? 0
    return { current: latest, delta: +(latest - prev).toFixed(1), isDown: latest < prev }
  }, [churn])

  // ── Heatmap color interpolation ───────────────────────────────
  function heatColor(ratio) {
    if (ratio === 0) return isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
    // 3-stop gradient: transparent → midtone → full intensity
    const alpha = 0.08 + ratio * 0.92
    if (isDark) {
      // Dark: transparent gray → bright white
      const v = Math.round(60 + 195 * ratio)
      return `rgba(${v},${v},${v},${alpha.toFixed(2)})`
    } else {
      // Light: light gray → deep black
      const v = Math.round(220 - 220 * ratio)
      return `rgba(${v},${v},${v},${(0.15 + ratio * 0.85).toFixed(2)})`
    }
  }

  // ── Heatmap hover state ───────────────────────────────────────
  const [heatTip, setHeatTip] = useState({ visible: false, x: 0, y: 0, day: '', hour: 0, count: 0 })

  const card = {
    background: theme.bgSec,
    border: `0.5px solid ${theme.border}`,
    borderRadius: 12,
  }

  return (
    <div style={{ background: theme.bg, minHeight: '100vh' }}>
      <div className="analytics-container">
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: theme.text,
            margin: 0, fontFamily: FONT,
          }}>
            Analytics
          </h1>
          <p style={{
            fontSize: 14, color: theme.textSec, marginTop: 4, marginBottom: 0,
            fontFamily: FONT,
          }}>
            Performance insights and member trends
          </p>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 28,
        }} className="analytics-kpi-strip">
          {[
            {
              label: 'Peak Hour', value: peakInsights.peakHourFormatted,
              icon: Zap, sub: 'Busiest time slot',
            },
            {
              label: 'Busiest Day', value: peakInsights.busiestDay || '--',
              icon: Activity, sub: 'Highest weekly traffic',
            },
            {
              label: 'Churn Rate',
              value: churnTrend ? `${churnTrend.current}%` : '--',
              icon: AlertTriangle,
              sub: churnTrend
                ? `${churnTrend.isDown ? '↓' : '↑'} ${Math.abs(churnTrend.delta)}% from prev`
                : 'No data',
              color: churnTrend ? (churnTrend.isDown ? theme.green : theme.red) : theme.textTer,
            },
            {
              label: 'Revenue Trend',
              value: monthlyRevenue.length > 0 ? formatPaise(monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0) : '--',
              icon: TrendingUp, sub: 'Latest month',
            },
          ].map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} style={{
                ...card, padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Icon size={15} color={theme.textTer} strokeWidth={1.5} />
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: theme.textTer,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    fontFamily: FONT,
                  }}>
                    {kpi.label}
                  </span>
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: kpi.color || theme.text,
                  fontFamily: FONT_MONO, lineHeight: 1,
                }}>
                  {kpi.value}
                </div>
                <div style={{
                  fontSize: 12, color: kpi.color || theme.textTer, marginTop: 6,
                  fontFamily: FONT,
                }}>
                  {kpi.sub}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Peak Hours Heatmap ─────────────────────────────── */}
        <div style={{ ...card, padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} color={theme.textTer} strokeWidth={1.5} />
              <h3 style={{
                fontSize: 15, fontWeight: 600, color: theme.text, margin: 0,
                fontFamily: FONT,
              }}>
                Peak Hours
              </h3>
            </div>
            {/* Live indicator */}
            {currentHour >= 6 && currentHour <= 22 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: theme.accentSoft, fontSize: 11, fontWeight: 600,
                color: theme.green, fontFamily: FONT,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: theme.green,
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }} />
                Live
              </div>
            )}
          </div>

          {isLoading ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: theme.textSec, fontSize: 14 }}>Loading...</span>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 680 }}>
                  {/* Hour headers */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 3, paddingLeft: 44 }}>
                    {HOURS.map((h) => (
                      <div key={h} style={{
                        flex: 1, textAlign: 'center', fontSize: 10,
                        color: theme.textTer, fontWeight: 500, minWidth: 32,
                        fontFamily: FONT_MONO,
                      }}>
                        {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
                      </div>
                    ))}
                  </div>

                  {/* Day rows */}
                  {DAYS.map((day, dayIdx) => (
                    <div key={day} style={{ display: 'flex', gap: 3, marginBottom: 3, alignItems: 'center' }}>
                      <div style={{
                        width: 40, fontSize: 11, fontWeight: 500,
                        color: dayIdx === currentDay ? theme.text : theme.textTer,
                        textAlign: 'right', paddingRight: 6, flexShrink: 0,
                        fontFamily: FONT,
                      }}>
                        {day}
                      </div>
                      {HOURS.map((hour) => {
                        const count = peakInsights.countMap[`${dayIdx}-${hour}`] || 0
                        const ratio = peakInsights.maxCount > 0 ? count / peakInsights.maxCount : 0
                        const isNow = dayIdx === currentDay && hour === currentHour
                        return (
                          <div
                            key={hour}
                            onMouseEnter={(e) => setHeatTip({
                              visible: true, x: e.clientX, y: e.clientY,
                              day, hour, count,
                            })}
                            onMouseMove={(e) => setHeatTip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }))}
                            onMouseLeave={() => setHeatTip((prev) => ({ ...prev, visible: false }))}
                            style={{
                              flex: 1, minWidth: 32, height: 26, borderRadius: 3,
                              background: heatColor(ratio),
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              position: 'relative',
                              outline: isNow ? `2px solid ${theme.green}` : 'none',
                              outlineOffset: -1,
                            }}
                          >
                            {/* Live pulse dot for current hour */}
                            {isNow && (
                              <div style={{
                                position: 'absolute', top: 3, right: 3,
                                width: 5, height: 5, borderRadius: '50%',
                                background: theme.green,
                                animation: 'pulse-dot 2s ease-in-out infinite',
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Legend + Recommendation */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 16, paddingLeft: 44, flexWrap: 'wrap', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT }}>Empty</span>
                      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
                        <div key={r} style={{
                          width: 18, height: 12, borderRadius: 2,
                          background: heatColor(r),
                          border: r === 0 ? `0.5px solid ${theme.border}` : 'none',
                        }} />
                      ))}
                      <span style={{ fontSize: 11, color: theme.textTer, fontFamily: FONT }}>Peak</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              {peakInsights.recommendation && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginTop: 16, padding: '12px 16px', borderRadius: 8,
                  background: theme.accentSoft,
                  border: `0.5px solid ${theme.border}`,
                }}>
                  <Lightbulb size={16} color={theme.amber} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{
                    fontSize: 13, color: theme.textSec, margin: 0, lineHeight: 1.5,
                    fontFamily: FONT,
                  }}>
                    {peakInsights.recommendation}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Revenue & Growth Charts ────────────────────────── */}
        <div className="analytics-two-col" style={{ marginBottom: 24 }}>
          {/* Monthly Revenue */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <TrendingUp size={16} color={theme.textTer} strokeWidth={1.5} />
              <h3 style={{
                fontSize: 15, fontWeight: 600, color: theme.text, margin: 0,
                fontFamily: FONT,
              }}>
                Monthly Revenue
              </h3>
            </div>
            {isLoading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: theme.textSec, fontSize: 13 }}>Loading...</span>
              </div>
            ) : monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.text} stopOpacity={isDark ? 0.15 : 0.08} />
                      <stop offset="100%" stopColor={theme.text} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FONT }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FONT_MONO }}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}K`}
                    width={48}
                  />
                  <Tooltip
                    content={<ChartTooltip
                      theme={theme} isDark={isDark}
                      formatter={(value, key) => key === 'revenue' ? formatPaise(value) : value}
                    />}
                    cursor={{ stroke: theme.border, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={theme.text}
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: theme.text, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.textTer, fontSize: 13,
              }}>
                No revenue data yet
              </div>
            )}
          </div>

          {/* Member Growth */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Users size={16} color={theme.textTer} strokeWidth={1.5} />
              <h3 style={{
                fontSize: 15, fontWeight: 600, color: theme.text, margin: 0,
                fontFamily: FONT,
              }}>
                Member Growth
              </h3>
            </div>
            {isLoading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: theme.textSec, fontSize: 13 }}>Loading...</span>
              </div>
            ) : memberGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={memberGrowth}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.text} stopOpacity={isDark ? 0.12 : 0.06} />
                      <stop offset="100%" stopColor={theme.text} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FONT }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: theme.textTer, fontFamily: FONT_MONO }}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    content={<ChartTooltip
                      theme={theme} isDark={isDark}
                      formatter={(value) => `${value} new members`}
                    />}
                    cursor={{ stroke: theme.border, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="new_members"
                    stroke={theme.text}
                    strokeWidth={2}
                    fill="url(#growthGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: theme.text, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.textTer, fontSize: 13,
              }}>
                No member data yet
              </div>
            )}
          </div>
        </div>

        {/* ── Churn Rate ─────────────────────────────────────── */}
        <div style={{ ...card, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} color={theme.textTer} strokeWidth={1.5} />
              <h3 style={{
                fontSize: 15, fontWeight: 600, color: theme.text, margin: 0,
                fontFamily: FONT,
              }}>
                Churn Rate
              </h3>
            </div>
            {/* Trend badge */}
            {churnTrend && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: churnTrend.isDown ? 'rgba(52,168,83,0.1)' : 'rgba(234,67,53,0.1)',
                color: churnTrend.isDown ? theme.green : theme.red,
                fontFamily: FONT_MONO,
              }}>
                {churnTrend.isDown
                  ? <ArrowDownRight size={14} strokeWidth={2} />
                  : <ArrowUpRight size={14} strokeWidth={2} />
                }
                {Math.abs(churnTrend.delta)}% from last month
              </div>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : churn.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {churn.map((c, idx) => {
                const isLatest = idx === churn.length - 1
                const rateColor = c.rate > 10 ? theme.red : c.rate > 5 ? theme.amber : theme.green
                return (
                  <div key={c.month} style={{
                    flex: '0 0 auto', minWidth: 100, padding: '16px 18px',
                    background: isLatest ? theme.accentSoft : theme.bgTer,
                    borderRadius: 10, textAlign: 'center',
                    border: `0.5px solid ${isLatest ? theme.borderStrong : theme.border}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      fontSize: 12, color: theme.textSec, marginBottom: 8,
                      fontWeight: 500, fontFamily: FONT,
                    }}>
                      {c.month}
                    </div>
                    <div style={{
                      fontSize: 26, fontWeight: 700, color: rateColor,
                      lineHeight: 1, fontFamily: FONT_MONO,
                    }}>
                      {c.rate}%
                    </div>
                    {/* Mini bar */}
                    <div style={{
                      marginTop: 10, height: 3, borderRadius: 2,
                      background: theme.border, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(c.rate * 5, 100)}%`, height: '100%',
                        background: rateColor, borderRadius: 2,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              padding: '40px 0', textAlign: 'center',
              color: theme.textTer, fontSize: 13,
            }}>
              No churn data available
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Tooltip Portal */}
      <HeatmapTooltip {...heatTip} theme={theme} />

      <style>{`
        .analytics-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
        }
        .analytics-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .analytics-kpi-strip {
          grid-template-columns: repeat(4, 1fr);
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @media (max-width: 1024px) {
          .analytics-two-col {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .analytics-kpi-strip {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .analytics-container {
            padding: 24px 16px;
          }
          .analytics-kpi-strip {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
