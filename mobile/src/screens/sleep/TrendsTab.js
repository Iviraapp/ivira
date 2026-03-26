import React, { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SLEEP_COLORS } from './SleepConstants'
import {
  calcDurationMinutes, formatDuration, formatTime12,
  calcSleepScore, computeInsights, computeSleepDebt, getDayLabel,
} from './SleepHelpers'
import SleepDebtIndicator from './SleepDebtIndicator'

let Svg, Polyline, Line, Rect, SvgText, G, Defs, LinearGradient, Stop, Path
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Polyline = svg.Polyline
  Line = svg.Line
  Rect = svg.Rect
  SvgText = svg.Text
  G = svg.G
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
  Path = svg.Path
} catch {}

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_W = SCREEN_W - 64
const CHART_H = 120
const PERIODS = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
]

export default function TrendsTab({ logs, goalHours, colors, card }) {
  const [period, setPeriod] = useState('7d')
  const days = PERIODS.find(p => p.key === period)?.days || 7

  const periodLogs = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return logs.filter(l => l.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date))
  }, [logs, days])

  const insights = useMemo(() => computeInsights(periodLogs, goalHours), [periodLogs, goalHours])
  const sleepDebt = useMemo(() => computeSleepDebt(logs, goalHours, days), [logs, goalHours, days])

  // Duration data points
  const durationData = useMemo(() => {
    return periodLogs.map(l => ({
      date: l.date,
      hours: calcDurationMinutes(l.bedHour, l.bedMin, l.wakeHour, l.wakeMin) / 60,
    }))
  }, [periodLogs])

  // Score data points
  const scoreData = useMemo(() => {
    return periodLogs.map(l => ({
      date: l.date,
      score: calcSleepScore(l, logs, goalHours),
    }))
  }, [periodLogs, logs, goalHours])

  // Stage composition data
  const stageData = useMemo(() => {
    return periodLogs.filter(l => l.deepMinutes != null).map(l => {
      const total = (l.deepMinutes || 0) + (l.remMinutes || 0) + (l.lightMinutes || 0) + (l.awakeMinutes || 0)
      return {
        date: l.date,
        deep: total > 0 ? (l.deepMinutes || 0) / total : 0,
        rem: total > 0 ? (l.remMinutes || 0) / total : 0,
        light: total > 0 ? (l.lightMinutes || 0) / total : 0,
        awake: total > 0 ? (l.awakeMinutes || 0) / total : 0,
      }
    })
  }, [periodLogs])

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodPill, period === p.key && styles.periodPillActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      {insights && (
        <View style={[styles.card, card]}>
          <Text style={[styles.cardTitle, { color: colors?.text || '#FFF' }]}>Summary</Text>
          <View style={styles.statsGrid}>
            <StatPill icon="clock" label="Avg Duration" value={insights.avgDuration} color={SLEEP_COLORS.primary} colors={colors} />
            <StatPill icon="bar-chart-2" label="Avg Score" value={String(insights.avgScore)} color="#22C55E" colors={colors} />
            <StatPill icon="moon" label="Avg Bedtime" value={insights.avgBedtime} color={SLEEP_COLORS.primary} colors={colors} />
            <StatPill icon="sunrise" label="Avg Wake" value={insights.avgWakeTime} color={SLEEP_COLORS.moon} colors={colors} />
          </View>
        </View>
      )}

      {/* Sleep Debt */}
      <SleepDebtIndicator debtHours={sleepDebt} colors={colors} />

      {/* Duration Trend Chart */}
      {durationData.length >= 2 && (
        <View style={[styles.card, card]}>
          <View style={styles.chartHeader}>
            <Feather name="clock" size={14} color={SLEEP_COLORS.primary} />
            <Text style={[styles.cardTitle, { color: colors?.text || '#FFF' }]}>Duration Trend</Text>
          </View>
          <TrendChart
            data={durationData.map(d => d.hours)}
            goalLine={goalHours}
            color={SLEEP_COLORS.primary}
            formatLabel={(v) => `${v.toFixed(1)}h`}
            minY={0}
            maxY={Math.max(12, ...durationData.map(d => d.hours)) + 1}
          />
        </View>
      )}

      {/* Score Trend Chart */}
      {scoreData.length >= 2 && (
        <View style={[styles.card, card]}>
          <View style={styles.chartHeader}>
            <Feather name="trending-up" size={14} color="#22C55E" />
            <Text style={[styles.cardTitle, { color: colors?.text || '#FFF' }]}>Score Trend</Text>
          </View>
          <TrendChart
            data={scoreData.map(d => d.score)}
            color="#22C55E"
            formatLabel={(v) => String(Math.round(v))}
            minY={0}
            maxY={100}
            colorGrade
          />
        </View>
      )}

      {/* Stage Composition */}
      {stageData.length >= 2 && (
        <View style={[styles.card, card]}>
          <View style={styles.chartHeader}>
            <Feather name="layers" size={14} color={SLEEP_COLORS.deep} />
            <Text style={[styles.cardTitle, { color: colors?.text || '#FFF' }]}>Sleep Stages</Text>
          </View>
          <StageCompositionChart data={stageData} />
          <View style={styles.legendRow}>
            <LegendDot color={SLEEP_COLORS.deep} label="Deep" />
            <LegendDot color={SLEEP_COLORS.rem} label="REM" />
            <LegendDot color={SLEEP_COLORS.light} label="Light" />
            <LegendDot color={SLEEP_COLORS.awake} label="Awake" />
          </View>
        </View>
      )}

      {/* Best & Worst */}
      {insights && (
        <View style={[styles.card, card]}>
          <Text style={[styles.cardTitle, { color: colors?.text || '#FFF' }]}>Highlights</Text>
          <View style={styles.highlightRow}>
            <View style={styles.highlightItem}>
              <View style={[styles.highlightIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Feather name="trending-up" size={14} color="#22C55E" />
              </View>
              <Text style={styles.highlightLabel}>Best Night</Text>
              <Text style={[styles.highlightValue, { color: colors?.text || '#FFF' }]}>{insights.bestNight}</Text>
              <Text style={[styles.highlightSub, { color: '#22C55E' }]}>{insights.bestDuration}</Text>
            </View>
            <View style={styles.highlightItem}>
              <View style={[styles.highlightIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Feather name="trending-down" size={14} color="#EF4444" />
              </View>
              <Text style={styles.highlightLabel}>Worst Night</Text>
              <Text style={[styles.highlightValue, { color: colors?.text || '#FFF' }]}>{insights.worstNight}</Text>
              <Text style={[styles.highlightSub, { color: '#EF4444' }]}>{insights.worstDuration}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Logs */}
      <View style={styles.recentHeader}>
        <Text style={[styles.cardTitle, { color: colors?.text || '#FFF' }]}>Recent Logs</Text>
      </View>
      {periodLogs.slice(-7).reverse().map(log => {
        const dur = calcDurationMinutes(log.bedHour, log.bedMin, log.wakeHour, log.wakeMin)
        const score = calcSleepScore(log, logs, goalHours)
        const scoreColor = score >= 85 ? '#22C55E' : score >= 70 ? SLEEP_COLORS.primary : score >= 50 ? '#F59E0B' : '#EF4444'
        return (
          <View key={log.id} style={[styles.logCard, card]}>
            <View style={styles.logTop}>
              <Text style={[styles.logDate, { color: colors?.text || '#FFF' }]}>{getDayLabel(log.date)}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '40' }]}>
                <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>{score}</Text>
              </View>
            </View>
            <View style={styles.logBottom}>
              <View style={styles.logStat}>
                <Feather name="moon" size={12} color={SLEEP_COLORS.primary} />
                <Text style={styles.logStatText}>{formatTime12(log.bedHour, log.bedMin)}</Text>
              </View>
              <Feather name="arrow-right" size={10} color="rgba(255,255,255,0.2)" />
              <View style={styles.logStat}>
                <Feather name="sunrise" size={12} color={SLEEP_COLORS.moon} />
                <Text style={styles.logStatText}>{formatTime12(log.wakeHour, log.wakeMin)}</Text>
              </View>
              <Text style={[styles.logDuration, { color: colors?.textSec || 'rgba(255,255,255,0.6)' }]}>
                {formatDuration(dur)}
              </Text>
            </View>
          </View>
        )
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

// ── SVG Trend Chart ──────────────────────────────────
function TrendChart({ data, goalLine, color, formatLabel, minY, maxY, colorGrade }) {
  if (!Svg || data.length < 2) {
    // Fallback bars
    return (
      <View style={styles.fallbackChart}>
        {data.map((v, i) => (
          <View key={i} style={[styles.fallbackBar, {
            height: `${((v - minY) / (maxY - minY)) * 100}%`,
            backgroundColor: color,
          }]} />
        ))}
      </View>
    )
  }

  const padX = 36
  const padR = 12
  const padY = 8
  const w = CHART_W
  const h = CHART_H
  const plotW = w - padX - padR
  const plotH = h - padY * 2

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * plotW
    const y = padY + plotH - ((v - minY) / (maxY - minY)) * plotH
    return `${x},${y}`
  })

  // Area path
  const firstX = padX
  const lastX = padX + plotW
  const areaD = `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(' ')} L ${lastX},${h - padY} L ${firstX},${h - padY} Z`

  // Goal line Y
  const goalY = goalLine ? padY + plotH - ((goalLine - minY) / (maxY - minY)) * plotH : null

  return (
    <Svg width={w} height={h + 20}>
      <Defs>
        <LinearGradient id={`trendFill_${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Area fill */}
      <Path d={areaD} fill={`url(#trendFill_${color})`} />

      {/* Goal line */}
      {goalY != null && (
        <Line x1={padX} y1={goalY} x2={w - padR} y2={goalY}
          stroke={color} strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />
      )}

      {/* Line */}
      <Polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {data.map((v, i) => {
        const [x, y] = points[i].split(',').map(Number)
        const dotColor = colorGrade
          ? (v >= 85 ? '#22C55E' : v >= 70 ? SLEEP_COLORS.primary : v >= 50 ? '#F59E0B' : '#EF4444')
          : color
        return (
          <G key={i}>
            <Rect x={x - 2} y={y - 2} width={4} height={4} rx={2} fill={dotColor} />
          </G>
        )
      })}

      {/* Y-axis labels */}
      <SvgText x={2} y={padY + 4} fontSize={9} fill="rgba(255,255,255,0.35)">{formatLabel(maxY)}</SvgText>
      <SvgText x={2} y={h - padY + 4} fontSize={9} fill="rgba(255,255,255,0.35)">{formatLabel(minY)}</SvgText>
      {goalLine != null && (
        <SvgText x={w - padR + 2} y={goalY + 3} fontSize={8} fill={color} opacity={0.6}>goal</SvgText>
      )}
    </Svg>
  )
}

// ── Stage Composition Chart ──────────────────────────
function StageCompositionChart({ data }) {
  if (!Svg || data.length === 0) return null

  const w = CHART_W
  const h = 80
  const barW = Math.max(4, (w - 20) / data.length - 2)
  const padX = 10

  return (
    <Svg width={w} height={h}>
      {data.map((d, i) => {
        const x = padX + i * (barW + 2)
        let y = 0
        const stages = [
          { pct: d.deep, color: SLEEP_COLORS.deep },
          { pct: d.rem, color: SLEEP_COLORS.rem },
          { pct: d.light, color: SLEEP_COLORS.light },
          { pct: d.awake, color: SLEEP_COLORS.awake },
        ]
        return (
          <G key={i}>
            {stages.map((s, j) => {
              const segH = s.pct * h
              const segY = y
              y += segH
              if (segH < 1) return null
              return (
                <Rect key={j} x={x} y={segY} width={barW} height={segH}
                  fill={s.color} opacity={0.8} rx={j === 0 ? 2 : 0} />
              )
            })}
          </G>
        )
      })}
    </Svg>
  )
}

// ── Small components ─────────────────────────────────
function StatPill({ icon, label, value, color, colors }) {
  return (
    <View style={styles.statPill}>
      <Feather name={icon} size={12} color={color} />
      <Text style={[styles.statValue, { color: colors?.text || '#FFF' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  periodPill: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  periodPillActive: { backgroundColor: SLEEP_COLORS.primary + '20', borderColor: SLEEP_COLORS.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  periodTextActive: { color: SLEEP_COLORS.primary },

  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.45)' },

  highlightRow: { flexDirection: 'row', gap: 12 },
  highlightItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
  highlightIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  highlightLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  highlightValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  highlightSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  recentHeader: { marginBottom: 8, marginTop: 4 },
  logCard: { padding: 14, borderRadius: 14, marginBottom: 8 },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logDate: { fontSize: 14, fontWeight: '600' },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },
  logBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  logStatText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  logDuration: { fontSize: 12, fontWeight: '600', marginLeft: 'auto' },

  fallbackChart: { height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingVertical: 8 },
  fallbackBar: { flex: 1, borderRadius: 2, minHeight: 4, opacity: 0.7 },
})
