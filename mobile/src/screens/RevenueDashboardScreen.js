import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const formatINR = (paise) => `\u20B9${(paise / 100).toLocaleString('en-IN')}`

const SOURCE_LABELS = {
  membership: 'Memberships',
  class_booking: 'Class Bookings',
  affiliate: 'Affiliate',
  personal_training: 'Personal Training',
  merchandise: 'Merchandise',
  supplement: 'Supplements',
  other: 'Other',
}

const SOURCE_COLORS = [
  COLORS.green,
  COLORS.accent,
  COLORS.amber,
  COLORS.cyan,
  '#E040FB',
  '#FF7043',
  COLORS.textSec,
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOUR_LABELS = ['6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p', '12a']
const HEATMAP_HOURS = 10
const HEATMAP_DAYS = 7

function getHeatColor(intensity) {
  // intensity 0..1 -> transparent to accent
  if (intensity <= 0) return 'rgba(16,185,129,0.06)'
  if (intensity < 0.25) return 'rgba(16,185,129,0.15)'
  if (intensity < 0.5) return 'rgba(16,185,129,0.30)'
  if (intensity < 0.75) return 'rgba(16,185,129,0.55)'
  return 'rgba(16,185,129,0.85)'
}

export default function RevenueDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { gymId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [revenueSummary, setRevenueSummary] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [trainerFees, setTrainerFees] = useState(null)

  const fetchData = useCallback(async () => {
    if (!gymId) return
    try {
      const [summaryRes, timelineRes, analyticsRes, feesRes] = await Promise.allSettled([
        api.get(`/gyms/${gymId}/revenue/summary`),
        api.get(`/gyms/${gymId}/revenue/timeline`),
        api.get(`/gyms/${gymId}/analytics`),
        api.get(`/gyms/${gymId}/revenue/trainer-fees`),
      ])

      if (summaryRes.status === 'fulfilled') setRevenueSummary(summaryRes.value.data)
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value.data?.timeline || timelineRes.value.data || [])
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data)
      if (feesRes.status === 'fulfilled') setTrainerFees(feesRes.value.data)
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  // No gym connected
  if (!gymId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" size={48} color={colors.textTer} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Connect your gym</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
            Link your gym to access the revenue dashboard.
          </Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  // Derived data
  const totalRevenue = revenueSummary?.total_revenue ?? 0
  const trendPercent = revenueSummary?.trend_percent ?? 0
  const trendPositive = trendPercent >= 0
  const sources = revenueSummary?.sources || []

  // Timeline bar chart
  const maxDayRevenue = Math.max(...(timeline.map(d => d.amount || 0)), 1)

  // Analytics
  const monthlyRevenue = analytics?.monthly_revenue || []
  const peakHours = analytics?.peak_hours || []
  const churnRate = analytics?.churn_rate ?? 0
  const activeMembers = analytics?.active_members ?? 0
  const newMembers = analytics?.new_members_this_month ?? 0
  const memberGrowth = analytics?.member_growth_percent ?? 0

  // Heatmap: normalize peak_hours into a 7x10 grid
  const heatmapMax = Math.max(...peakHours.map(h => h.count || 0), 1)

  // Trainer fees
  const pendingFeesTotal = trainerFees?.total_pending ?? 0
  const pendingTrainers = trainerFees?.trainers || []

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Revenue</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <Text style={[styles.heroLabel, { color: colors.textSec }]}>This Month</Text>
          <Text style={[styles.heroAmount, { color: colors.text }]}>{formatINR(totalRevenue)}</Text>
          <View style={styles.trendRow}>
            <Feather
              name={trendPositive ? 'trending-up' : 'trending-down'}
              size={16}
              color={trendPositive ? COLORS.green : COLORS.red}
            />
            <Text style={[styles.trendText, { color: trendPositive ? COLORS.green : COLORS.red }]}>
              {trendPositive ? '+' : ''}{trendPercent.toFixed(1)}%
            </Text>
            <Text style={[styles.trendSub, { color: colors.textTer }]}>vs last month</Text>
          </View>
        </View>

        {/* Revenue Breakdown */}
        {sources.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Revenue Breakdown</Text>
            {sources.map((src, idx) => {
              const percent = totalRevenue > 0 ? (src.amount / totalRevenue) * 100 : 0
              const barColor = SOURCE_COLORS[idx % SOURCE_COLORS.length]
              return (
                <View key={src.source || idx} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: barColor }]} />
                    <Text style={[styles.breakdownLabel, { color: colors.textSec }]}>
                      {SOURCE_LABELS[src.source] || src.source}
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: colors.text }]}>{formatINR(src.amount)}</Text>
                  </View>
                  <View style={[styles.breakdownBarBg, { backgroundColor: colors.bgTer }]}>
                    <View style={[styles.breakdownBarFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.breakdownPercent, { color: colors.textTer }]}>{percent.toFixed(1)}%</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Revenue Timeline */}
        {timeline.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Revenue (30 Days)</Text>
            <View style={styles.timelineChart}>
              {timeline.map((day, idx) => {
                const barHeight = Math.max((day.amount / maxDayRevenue) * 120, 2)
                const showLabel = idx % 5 === 0
                return (
                  <View key={idx} style={styles.timelineBarCol}>
                    <View
                      style={[
                        styles.timelineBar,
                        { height: barHeight, backgroundColor: COLORS.green },
                      ]}
                    />
                    {showLabel && (
                      <Text style={[styles.timelineDayLabel, { color: colors.textTer }]}>
                        {day.label || `D${idx + 1}`}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Peak Hours Heatmap */}
        {peakHours.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Peak Hours</Text>
            <View style={styles.heatmapContainer}>
              {/* Hour labels row */}
              <View style={styles.heatmapHourRow}>
                <View style={styles.heatmapDayLabel} />
                {HOUR_LABELS.map((h, i) => (
                  <Text key={i} style={[styles.heatmapHourText, { color: colors.textTer }]}>{h}</Text>
                ))}
              </View>
              {/* Grid */}
              {DAY_LABELS.map((dayLabel, dayIdx) => (
                <View key={dayIdx} style={styles.heatmapRow}>
                  <Text style={[styles.heatmapDayText, { color: colors.textSec }]}>{dayLabel}</Text>
                  {Array.from({ length: HEATMAP_HOURS }).map((_, hourIdx) => {
                    const entry = peakHours.find(h => h.day === dayIdx && h.hour_block === hourIdx)
                    const intensity = entry ? entry.count / heatmapMax : 0
                    return (
                      <View
                        key={hourIdx}
                        style={[styles.heatmapCell, { backgroundColor: getHeatColor(intensity) }]}
                      />
                    )
                  })}
                </View>
              ))}
            </View>
            <View style={styles.heatmapLegend}>
              <Text style={[styles.heatmapLegendText, { color: colors.textTer }]}>Less</Text>
              {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                <View key={i} style={[styles.heatmapLegendBox, { backgroundColor: getHeatColor(v) }]} />
              ))}
              <Text style={[styles.heatmapLegendText, { color: colors.textTer }]}>More</Text>
            </View>
          </View>
        )}

        {/* Member Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="users" size={18} color={COLORS.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>{activeMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSec }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="user-plus" size={18} color={COLORS.green} />
            <Text style={[styles.statValue, { color: colors.text }]}>{newMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSec }]}>New</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="user-minus" size={18} color={COLORS.red} />
            <Text style={[styles.statValue, { color: colors.text }]}>{churnRate.toFixed(1)}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSec }]}>Churn</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="trending-up" size={18} color={memberGrowth >= 0 ? COLORS.green : COLORS.red} />
            <Text style={[styles.statValue, { color: colors.text }]}>{memberGrowth >= 0 ? '+' : ''}{memberGrowth.toFixed(1)}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSec }]}>Growth</Text>
          </View>
        </View>

        {/* Pending Trainer Fees */}
        <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Pending Trainer Fees</Text>
            <Text style={[styles.feesTotalBadge, { color: COLORS.amber }]}>{formatINR(pendingFeesTotal)}</Text>
          </View>
          {pendingTrainers.length > 0 ? (
            pendingTrainers.map((trainer, idx) => (
              <View key={idx} style={[styles.trainerRow, idx < pendingTrainers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.trainerName, { color: colors.text }]}>{trainer.name}</Text>
                  <Text style={[styles.trainerSessions, { color: colors.textTer }]}>{trainer.sessions || 0} sessions</Text>
                </View>
                <Text style={[styles.trainerAmount, { color: COLORS.amber }]}>{formatINR(trainer.amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: colors.textTer }]}>No pending fees</Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontFamily: FONT.semibold,
    fontSize: 20,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONT.semibold,
    fontSize: 18,
  },

  // Hero
  heroCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  heroLabel: {
    fontFamily: FONT.medium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  heroAmount: {
    fontFamily: FONT.numExtraBold,
    fontSize: 38,
    letterSpacing: -1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 6,
  },
  trendText: {
    fontFamily: FONT.numSemibold,
    fontSize: 14,
  },
  trendSub: {
    fontFamily: FONT.regular,
    fontSize: 12,
  },

  // Card
  card: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  // Breakdown
  breakdownRow: {
    marginBottom: SPACING.sm,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  breakdownLabel: {
    fontFamily: FONT.medium,
    fontSize: 13,
    flex: 1,
  },
  breakdownAmount: {
    fontFamily: FONT.numSemibold,
    fontSize: 13,
  },
  breakdownBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownPercent: {
    fontFamily: FONT.numMedium,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },

  // Timeline
  timelineChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 2,
  },
  timelineBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timelineBar: {
    width: '80%',
    borderRadius: 2,
    minWidth: 3,
  },
  timelineDayLabel: {
    fontFamily: FONT.numMedium,
    fontSize: 9,
    marginTop: 4,
  },

  // Heatmap
  heatmapContainer: {
    gap: 3,
  },
  heatmapHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  heatmapDayLabel: {
    width: 32,
  },
  heatmapHourText: {
    flex: 1,
    fontFamily: FONT.numMedium,
    fontSize: 9,
    textAlign: 'center',
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heatmapDayText: {
    width: 32,
    fontFamily: FONT.medium,
    fontSize: 10,
  },
  heatmapCell: {
    flex: 1,
    height: 22,
    borderRadius: 4,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    gap: 4,
  },
  heatmapLegendText: {
    fontFamily: FONT.regular,
    fontSize: 10,
  },
  heatmapLegendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: FONT.numBold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
  },

  // Trainer fees
  feesTotalBadge: {
    fontFamily: FONT.numBold,
    fontSize: 14,
  },
  trainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  trainerName: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  trainerSessions: {
    fontFamily: FONT.regular,
    fontSize: 12,
    marginTop: 2,
  },
  trainerAmount: {
    fontFamily: FONT.numSemibold,
    fontSize: 14,
  },
  noDataText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
})
