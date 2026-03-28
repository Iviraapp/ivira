import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

// Optional SVG — fallback gracefully
let Svg, Rect, Line, SvgCircle, SvgText
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Rect = svg.Rect
  Line = svg.Line
  SvgCircle = svg.Circle
  SvgText = svg.Text
} catch { Svg = null }

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_H = 150
const CHART_PAD = 32

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#94A3B8',
  gold: '#FBBF24',
  platinum: '#A78BFA',
  diamond: '#38BDF8',
}

const RANK_COLORS = ['#FBBF24', '#94A3B8', '#CD7F32']

function scoreColor(score) {
  if (score >= 80) return COLORS.green
  if (score >= 60) return COLORS.amber
  return COLORS.red
}

function nextTier(tier) {
  const order = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const idx = order.indexOf(tier)
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null
}

// Skeleton placeholder
function Skeleton({ width, height, style }) {
  return (
    <View style={[{
      width, height, borderRadius: RADIUS.sm,
      backgroundColor: 'rgba(148,163,184,0.10)',
    }, style]} />
  )
}

export default function PodStatsScreen({ navigation, route }) {
  const { colors } = useTheme()
  const { member, gymId } = useAuth()
  const podId = route?.params?.podId
  const podName = route?.params?.podName || 'Pod'

  const [period, setPeriod] = useState(30)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async (silent) => {
    if (!gymId || !podId) return
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get(`/gyms/${gymId}/pods/${podId}/stats`, {
        params: { days: period },
      })
      setStats(data)
    } catch (e) {
      console.warn('[PodStats] fetch error', e?.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, podId, period])

  useEffect(() => { fetchStats() }, [fetchStats])

  const onRefresh = () => { setRefreshing(true); fetchStats(true) }

  // ---------- Insights generator ----------
  const getInsights = () => {
    if (!stats) return []
    const lines = []
    if (stats.avg_health >= 80) lines.push('Your pod is crushing it! Keep the momentum.')
    else if (stats.avg_health >= 60) lines.push('Solid consistency. Push for Gold tier.')
    else lines.push('The pod needs a reset. Rally your members.')

    const weak = (stats.member_stats || []).find(m => m.consistency_pct < 50)
    if (weak) lines.push(`${weak.name} needs support. Send a nudge.`)

    const next = nextTier(stats.tier)
    if (next) {
      const thresholds = { silver: 50, gold: 70, platinum: 85, diamond: 95 }
      const target = thresholds[next] || 100
      const gap = Math.max(0, target - stats.avg_health)
      lines.push(`${gap}% away from ${next.charAt(0).toUpperCase() + next.slice(1)} tier.`)
    }
    return lines
  }

  // ---------- Bar chart ----------
  const renderChart = () => {
    const daily = stats?.daily_health || []
    if (!daily.length) return null

    if (!Svg) {
      return (
        <View style={s.fallbackChart}>
          <Text style={[s.fallbackText, { color: colors.textSec }]}>
            Avg: {stats.avg_health}%
          </Text>
        </View>
      )
    }

    const chartW = SCREEN_W - SPACING.md * 2 - CHART_PAD
    const barGap = 2
    const barW = Math.max(2, (chartW - daily.length * barGap) / daily.length)
    const labelEvery = daily.length <= 10 ? 2 : daily.length <= 35 ? 5 : 7

    return (
      <View style={s.chartWrap}>
        <Svg width={SCREEN_W - SPACING.md * 2} height={CHART_H + 24}>
          {/* Y axis guide lines */}
          {[0, 25, 50, 75, 100].map(v => (
            <Line
              key={v}
              x1={CHART_PAD} y1={CHART_H - (v / 100) * CHART_H}
              x2={CHART_PAD + chartW} y2={CHART_H - (v / 100) * CHART_H}
              stroke="rgba(148,163,184,0.08)" strokeWidth={1}
            />
          ))}
          {/* Y labels */}
          {[0, 50, 100].map(v => (
            <SvgText
              key={`y${v}`} x={CHART_PAD - 4}
              y={CHART_H - (v / 100) * CHART_H + 4}
              fill={colors.textTer} fontSize={9} textAnchor="end"
            >{v}</SvgText>
          ))}
          {/* Bars */}
          {daily.map((d, i) => {
            const h = (d.score / 100) * (CHART_H - 4)
            const x = CHART_PAD + i * (barW + barGap)
            return (
              <Rect
                key={i} x={x} y={CHART_H - h}
                width={barW} height={h}
                rx={barW > 4 ? 3 : 1}
                fill={scoreColor(d.score)}
                opacity={0.85}
              />
            )
          })}
          {/* X labels */}
          {daily.map((d, i) => {
            if (i % labelEvery !== 0) return null
            const x = CHART_PAD + i * (barW + barGap) + barW / 2
            const label = d.date?.slice(5) || ''
            return (
              <SvgText
                key={`x${i}`} x={x} y={CHART_H + 14}
                fill={colors.textTer} fontSize={8} textAnchor="middle"
              >{label}</SvgText>
            )
          })}
        </Svg>
        <Text style={[s.chartLabel, { color: colors.textSec }]}>Pod Health Trend</Text>
      </View>
    )
  }

  // ---------- Loading skeleton ----------
  if (loading && !stats) {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Skeleton width={140} height={20} style={{ marginLeft: SPACING.sm }} />
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          <Skeleton width="100%" height={140} style={{ marginBottom: SPACING.md }} />
          <Skeleton width="100%" height={180} style={{ marginBottom: SPACING.md }} />
          <Skeleton width="100%" height={200} style={{ marginBottom: SPACING.md }} />
          <Skeleton width="100%" height={160} />
        </ScrollView>
      </View>
    )
  }

  const members = [...(stats?.member_stats || [])].sort((a, b) => b.consistency_pct - a.consistency_pct)
  const podBest = members.reduce((best, m) => m.longest_streak > (best?.longest_streak || 0) ? m : best, null)
  const insights = getInsights()

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {podName}
        </Text>
        <Text style={[s.headerSub, { color: colors.textSec }]}>Stats</Text>
      </View>

      {/* Period selector */}
      <View style={s.periodRow}>
        {PERIODS.map(p => {
          const active = p.days === period
          return (
            <TouchableOpacity
              key={p.days}
              style={[s.periodPill, active && s.periodPillActive]}
              onPress={() => setPeriod(p.days)}
              activeOpacity={0.7}
            >
              <Text style={[s.periodText, active && s.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {/* 1. Pod Overview */}
        <View style={[ELITE_CARD, s.card, { borderTopColor: COLORS.green, borderTopWidth: 3 }]}>
          <View style={s.overviewRow}>
            <View style={s.scoreBlock}>
              <Text style={[s.bigScore, { color: scoreColor(stats?.avg_health || 0) }]}>
                {stats?.avg_health ?? '--'}
              </Text>
              <Text style={[s.scoreUnit, { color: colors.textSec }]}>Health Score</Text>
            </View>
            <View style={s.overviewMeta}>
              <View style={s.tierBadge}>
                <Feather name="shield" size={16} color={TIER_COLORS[stats?.tier] || colors.textSec} />
                <Text style={[s.tierText, { color: TIER_COLORS[stats?.tier] || colors.textSec }]}>
                  {(stats?.tier || 'bronze').charAt(0).toUpperCase() + (stats?.tier || 'bronze').slice(1)}
                </Text>
              </View>
              <Text style={[s.multiplier, { color: COLORS.accent }]}>
                {stats?.consistency_multiplier || 1.0}x Consistency Multiplier
              </Text>
              <View style={s.checkinRow}>
                <Feather name="check-circle" size={14} color={colors.textSec} />
                <Text style={[s.checkinText, { color: colors.textSec }]}>
                  {stats?.total_checkins ?? 0} check-ins
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Health Trend Chart */}
        <View style={[ELITE_CARD, s.card]}>
          {renderChart()}
        </View>

        {/* 3. Member Leaderboard */}
        <View style={[ELITE_CARD, s.card, { borderTopColor: '#8B5CF6', borderTopWidth: 3 }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Member Rankings</Text>
          {members.map((m, i) => {
            const isSelf = m.member_id === member?.id
            const rankColor = i < 3 ? RANK_COLORS[i] : colors.textTer
            return (
              <View key={m.member_id || i} style={[s.memberRow, isSelf && { backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: RADIUS.sm }]}>
                <Text style={[s.rank, { color: rankColor }]}>{i + 1}</Text>
                <View style={[s.avatar, { backgroundColor: scoreColor(m.consistency_pct) + '22' }]}>
                  {m.photo_url ? null : (
                    <Text style={[s.avatarLetter, { color: scoreColor(m.consistency_pct) }]}>
                      {(m.name || '?')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={s.memberInfo}>
                  <View style={s.nameRow}>
                    <Text style={[s.memberName, { color: colors.text }]} numberOfLines={1}>{m.name}</Text>
                    {m.is_captain && (
                      <View style={s.captainBadge}>
                        <Text style={s.captainText}>Captain</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.barOuter}>
                    <View style={[s.barFill, { width: `${m.consistency_pct}%`, backgroundColor: scoreColor(m.consistency_pct) }]} />
                  </View>
                </View>
                <View style={s.streakCol}>
                  <Text style={[s.streakNum, { color: COLORS.amber }]}>{m.current_streak}</Text>
                  <Text style={{ fontSize: 10 }}>🔥</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* 4. Streaks Card */}
        <View style={[ELITE_CARD, s.card, { borderTopColor: COLORS.amber, borderTopWidth: 3 }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Streak Records</Text>
          {members.map((m, i) => (
            <View key={m.member_id || i} style={s.streakRow}>
              <Text style={[s.streakName, { color: colors.text }]} numberOfLines={1}>{m.name}</Text>
              <View style={s.streakStats}>
                <View style={s.streakStat}>
                  <Feather name="zap" size={12} color={COLORS.amber} />
                  <Text style={[s.streakVal, { color: colors.text }]}>{m.current_streak}d</Text>
                  <Text style={[s.streakLabel, { color: colors.textTer }]}>current</Text>
                </View>
                <View style={s.streakStat}>
                  <Feather name="award" size={12} color={COLORS.cyan} />
                  <Text style={[s.streakVal, { color: colors.text }]}>{m.longest_streak}d</Text>
                  <Text style={[s.streakLabel, { color: colors.textTer }]}>best</Text>
                </View>
              </View>
            </View>
          ))}
          {podBest && (
            <View style={s.podBestRow}>
              <Feather name="trophy" size={14} color={COLORS.amber} />
              <Text style={[s.podBestText, { color: colors.textSec }]}>
                Pod best: {podBest.longest_streak} days by {podBest.name}
              </Text>
            </View>
          )}
        </View>

        {/* 5. Insights */}
        {insights.length > 0 && (
          <View style={[ELITE_CARD, s.card]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Insights</Text>
            {insights.map((line, i) => (
              <View key={i} style={s.insightRow}>
                <Feather name="info" size={14} color={COLORS.accent} style={{ marginTop: 2 }} />
                <Text style={[s.insightText, { color: colors.textSec }]}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: 56, paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONT.bold, fontSize: 18, marginLeft: SPACING.sm, flex: 1,
  },
  headerSub: {
    fontFamily: FONT.medium, fontSize: 14, marginLeft: SPACING.xs,
  },
  periodRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md, gap: SPACING.sm,
  },
  periodPill: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  periodPillActive: { backgroundColor: COLORS.accent },
  periodText: {
    fontFamily: FONT.semibold, fontSize: 13, color: COLORS.textSec,
  },
  periodTextActive: { color: '#FFFFFF' },
  scroll: { paddingHorizontal: SPACING.md },
  card: { padding: SPACING.md, marginBottom: SPACING.md },

  // Overview
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  scoreBlock: { alignItems: 'center', marginRight: SPACING.lg },
  bigScore: { fontFamily: FONT.numExtraBold, fontSize: 52, lineHeight: 56 },
  scoreUnit: { fontFamily: FONT.medium, fontSize: 12, marginTop: 2 },
  overviewMeta: { flex: 1 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tierText: { fontFamily: FONT.semibold, fontSize: 14, marginLeft: 6 },
  multiplier: { fontFamily: FONT.semibold, fontSize: 13, marginBottom: 6 },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkinText: { fontFamily: FONT.regular, fontSize: 13 },

  // Chart
  chartWrap: { alignItems: 'center' },
  chartLabel: { fontFamily: FONT.medium, fontSize: 12, marginTop: 4 },
  fallbackChart: { alignItems: 'center', paddingVertical: SPACING.lg },
  fallbackText: { fontFamily: FONT.numBold, fontSize: 20 },

  // Members
  sectionTitle: { fontFamily: FONT.bold, fontSize: 16, marginBottom: SPACING.sm },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 6,
  },
  rank: { fontFamily: FONT.numBold, fontSize: 15, width: 24, textAlign: 'center' },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarLetter: { fontFamily: FONT.bold, fontSize: 14 },
  memberInfo: { flex: 1, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  memberName: { fontFamily: FONT.semibold, fontSize: 13, flexShrink: 1 },
  captainBadge: {
    marginLeft: 6, backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: RADIUS.full,
  },
  captainText: { fontFamily: FONT.semibold, fontSize: 9, color: COLORS.accent },
  barOuter: {
    height: 5, borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.10)', overflow: 'hidden',
  },
  barFill: { height: 5, borderRadius: 3 },
  streakCol: { alignItems: 'center', width: 32 },
  streakNum: { fontFamily: FONT.numBold, fontSize: 13 },

  // Streaks card
  streakRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.08)',
  },
  streakName: { fontFamily: FONT.medium, fontSize: 13, flex: 1, marginRight: 8 },
  streakStats: { flexDirection: 'row', gap: 16 },
  streakStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakVal: { fontFamily: FONT.numSemibold, fontSize: 13 },
  streakLabel: { fontFamily: FONT.regular, fontSize: 10 },
  podBestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: SPACING.sm, paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.12)',
  },
  podBestText: { fontFamily: FONT.medium, fontSize: 13 },

  // Insights
  insightRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  insightText: { fontFamily: FONT.regular, fontSize: 13, flex: 1, lineHeight: 19 },
})
