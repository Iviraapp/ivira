import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Haptics from '../lib/haptics'
import { getFastingCaloriesBurned } from '../utils/healthMath'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BAR_CHART_HEIGHT = 120
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PROTOCOL_COLORS = {
  '16:8': '#3B82F6',
  '18:6': '#F59E0B',
  '20:4': '#8B5CF6',
}

const PROTOCOL_TARGETS_HOURS = {
  '16:8': 16,
  '18:6': 18,
  '20:4': 20,
}

// ── Demo data generator ────────────────────────────────────────────
function generateDemoData() {
  const protocols = ['16:8', '18:6', '20:4']
  const entries = []
  const now = new Date()

  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // ~20% chance the day was skipped
    if (Math.random() < 0.2) continue

    const protocol = protocols[Math.floor(Math.random() * protocols.length)]
    const targetHours = PROTOCOL_TARGETS_HOURS[protocol]

    // 75% chance of completing, 25% ended early
    const completed = Math.random() < 0.75
    const durationHours = completed
      ? targetHours + (Math.random() * 2 - 0.5) // slightly over/under target
      : targetHours * (0.5 + Math.random() * 0.35) // 50-85% of target
    const durationSec = Math.max(3600, Math.round(durationHours * 3600))

    const startHour = 18 + Math.floor(Math.random() * 3) // 6-8 PM start
    const startMin = Math.floor(Math.random() * 60)
    const startDate = new Date(date)
    startDate.setHours(startHour, startMin, 0, 0)

    const endDate = new Date(startDate.getTime() + durationSec * 1000)

    const calories = getFastingCaloriesBurned(75, 175, 28, 'male', durationSec)

    entries.push({
      id: `fast-${i}`,
      date: date.toISOString(),
      protocol,
      duration_seconds: durationSec,
      completed,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      calories_burned: Math.round(calories),
    })
  }

  return entries.sort((a, b) => new Date(b.date) - new Date(a.date))
}

// ── Helpers ────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatTime(iso) {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m} ${ampm}`
}

function formatDateLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getDayOfWeek(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long' })
}

// ── Stats computation ──────────────────────────────────────────────
function computeStats(entries) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const weekEntries = entries.filter((e) => new Date(e.date) >= weekAgo)
  const monthEntries = entries.filter((e) => new Date(e.date) >= monthAgo)

  const avg = (arr, key) =>
    arr.length ? arr.reduce((s, e) => s + (key ? e[key] : e), 0) / arr.length : 0
  const completionRate = (arr) =>
    arr.length ? Math.round((arr.filter((e) => e.completed).length / arr.length) * 100) : 0

  // Streak calculation (consecutive days with fasts, most recent first)
  let currentStreak = 0
  let bestStreak = 0
  let streak = 0
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))
  let prevDay = null
  for (const entry of sorted) {
    const day = new Date(entry.date).toDateString()
    if (day === prevDay) continue // same day, skip duplicate
    if (!prevDay) {
      // first entry — check if it's today or yesterday
      const today = new Date().toDateString()
      const yest = new Date(Date.now() - 86400000).toDateString()
      if (day === today || day === yest) {
        streak = 1
      } else {
        streak = 0
      }
    } else {
      const prevDate = new Date(prevDay)
      const curDate = new Date(day)
      const diff = (prevDate - curDate) / 86400000
      if (Math.round(diff) === 1) {
        streak++
      } else {
        if (streak > bestStreak) bestStreak = streak
        streak = entry.completed ? 1 : 0
      }
    }
    if (currentStreak === 0 && streak > 0) currentStreak = streak
    prevDay = day
  }
  if (streak > bestStreak) bestStreak = streak
  // currentStreak is the most recent ongoing streak
  currentStreak = currentStreak || streak

  return {
    week: {
      avgDuration: avg(weekEntries, 'duration_seconds'),
      count: weekEntries.length,
      completionRate: completionRate(weekEntries),
    },
    month: {
      avgDuration: avg(monthEntries, 'duration_seconds'),
      count: monthEntries.length,
      longestFast: monthEntries.length
        ? Math.max(...monthEntries.map((e) => e.duration_seconds))
        : 0,
      completionRate: completionRate(monthEntries),
    },
    allTime: {
      totalFasts: entries.length,
      totalHours: Math.round(entries.reduce((s, e) => s + e.duration_seconds, 0) / 3600),
      currentStreak,
      bestStreak,
    },
  }
}

// ── Weekly bar data ────────────────────────────────────────────────
function getWeeklyBarData(entries) {
  const now = new Date()
  const bars = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    const dayStr = day.toDateString()
    const match = entries.find((e) => new Date(e.date).toDateString() === dayStr)
    bars.push({
      label: DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1],
      hours: match ? match.duration_seconds / 3600 : 0,
      completed: match ? match.completed : false,
      protocol: match ? match.protocol : null,
    })
  }
  return bars
}

// ── Calendar heatmap data ──────────────────────────────────────────
function getMonthlyCalendarData(entries) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun

  const entryMap = {}
  entries.forEach((e) => {
    const d = new Date(e.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!entryMap[day] || e.completed) entryMap[day] = e
    }
  })

  const cells = []
  // Pad start
  const startPad = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Mon=0
  for (let p = 0; p < startPad; p++) cells.push({ day: null })

  for (let d = 1; d <= daysInMonth; d++) {
    const entry = entryMap[d]
    const isFuture = new Date(year, month, d) > now
    cells.push({
      day: d,
      status: isFuture ? 'future' : entry ? (entry.completed ? 'completed' : 'partial') : 'missed',
    })
  }

  return cells
}

// ── Stat Card ──────────────────────────────────────────────────────
function StatCard({ title, items, colors, card }) {
  return (
    <View style={[styles.statCard, { ...card }]}>
      <Text style={[styles.statCardTitle, { color: colors.textSec }]}>{title}</Text>
      {items.map((item, idx) => (
        <View key={idx} style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textTer }]}>{item.label}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Protocol Pill ──────────────────────────────────────────────────
function ProtocolPill({ protocol }) {
  const color = PROTOCOL_COLORS[protocol] || '#94A3B8'
  return (
    <View style={[styles.protocolPill, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={[styles.protocolPillText, { color }]}>{protocol}</Text>
    </View>
  )
}

// ── Bar Chart (no library) ─────────────────────────────────────────
function WeeklyBarChart({ data, colors }) {
  const maxHours = Math.max(24, ...data.map((d) => d.hours))
  // Find dominant protocol for target line
  const protocols = data.filter((d) => d.protocol).map((d) => d.protocol)
  const dominant = protocols.length
    ? protocols.sort((a, b) => protocols.filter((p) => p === b).length - protocols.filter((p) => p === a).length)[0]
    : '16:8'
  const targetHours = PROTOCOL_TARGETS_HOURS[dominant] || 16
  const targetY = (1 - targetHours / maxHours) * BAR_CHART_HEIGHT

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartArea}>
        {/* Target dashed line */}
        <View style={[styles.targetLine, { top: targetY }]}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.targetDash,
                { backgroundColor: i % 2 === 0 ? colors.textTer : 'transparent' },
              ]}
            />
          ))}
        </View>
        <Text
          style={[
            styles.targetLabel,
            { color: colors.textTer, top: targetY - 14 },
          ]}
        >
          {targetHours}h
        </Text>

        {/* Bars */}
        <View style={styles.barsRow}>
          {data.map((bar, idx) => {
            const barHeight = bar.hours > 0 ? (bar.hours / maxHours) * BAR_CHART_HEIGHT : 0
            const barColor = bar.completed ? '#22C55E' : bar.hours > 0 ? '#F59E0B' : colors.border
            return (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, bar.hours > 0 ? 4 : 2),
                        backgroundColor: barColor,
                        borderRadius: 4,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.textTer }]}>{bar.label}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// ── Log Entry ──────────────────────────────────────────────────────
function LogEntry({ item, colors, card }) {
  return (
    <View style={[styles.logCard, { ...card }]}>
      <View style={styles.logHeader}>
        <View>
          <Text style={[styles.logDate, { color: colors.text }]}>
            {formatDateLabel(item.date)}
          </Text>
          <Text style={[styles.logDay, { color: colors.textTer }]}>
            {getDayOfWeek(item.date)}
          </Text>
        </View>
        <View style={styles.logHeaderRight}>
          <ProtocolPill protocol={item.protocol} />
          {item.completed ? (
            <View style={[styles.statusIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
              <Feather name="check-circle" size={16} color="#22C55E" />
            </View>
          ) : (
            <View style={[styles.statusIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Feather name="alert-circle" size={16} color="#F59E0B" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.logBody}>
        <View style={styles.logStat}>
          <Feather name="clock" size={14} color={colors.textSec} />
          <Text style={[styles.logStatText, { color: colors.text }]}>
            {formatDuration(item.duration_seconds)}
          </Text>
        </View>
        <View style={styles.logStat}>
          <Feather name="arrow-right" size={14} color={colors.textSec} />
          <Text style={[styles.logStatText, { color: colors.textSec }]}>
            {formatTime(item.start_time)} → {formatTime(item.end_time)}
          </Text>
        </View>
        <View style={styles.logStat}>
          <Feather name="zap" size={14} color="#F97316" />
          <Text style={[styles.logStatText, { color: colors.textSec }]}>
            ~{item.calories_burned} kcal
          </Text>
        </View>
      </View>
    </View>
  )
}

// ── Calendar Heatmap ───────────────────────────────────────────────
function CalendarHeatmap({ entries, colors }) {
  const cells = getMonthlyCalendarData(entries)
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const statusColor = {
    completed: '#22C55E',
    partial: '#F59E0B',
    missed: colors.border,
    future: 'transparent',
  }

  return (
    <View style={styles.calendarContainer}>
      <Text style={[styles.calendarMonth, { color: colors.text }]}>{monthLabel}</Text>
      <View style={styles.calendarWeekHeader}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={[styles.calendarWeekDay, { color: colors.textTer }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((cell, idx) => (
          <View
            key={idx}
            style={[
              styles.calendarCell,
              {
                backgroundColor: cell.day ? statusColor[cell.status] : 'transparent',
                borderColor: cell.status === 'future' ? colors.border : 'transparent',
                borderWidth: cell.status === 'future' ? 1 : 0,
              },
            ]}
          >
            {cell.day && (
              <Text
                style={[
                  styles.calendarCellText,
                  {
                    color:
                      cell.status === 'completed'
                        ? '#fff'
                        : cell.status === 'partial'
                        ? '#fff'
                        : cell.status === 'future'
                        ? colors.textTer
                        : colors.textTer,
                  },
                ]}
              >
                {cell.day}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.calendarLegend}>
        {[
          { label: 'Completed', color: '#22C55E' },
          { label: 'Partial', color: '#F59E0B' },
          { label: 'Missed', color: colors.border },
        ].map((item, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.textTer }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ════════════════════════════════════════════════════════════════════
// ── Main Screen ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
export default function FastingLogScreen({ navigation }) {
  const { member, gymId, isDemo } = useAuth()
  const { colors, card } = useTheme()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('recent') // 'recent' | 'monthly'

  const memberId = member?.id

  const fetchData = useCallback(async () => {
    try {
      if (isDemo) {
        setEntries(generateDemoData())
      } else {
        const res = await api.get(`/gyms/${gymId}/members/${memberId}/health/fasting/history`, {
          params: { limit: 30 },
        })
        setEntries(res.data?.data || res.data || [])
      }
    } catch (err) {
      console.warn('Failed to fetch fasting history:', err.message)
      // Fallback to demo data on error
      setEntries(generateDemoData())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isDemo, gymId, memberId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    fetchData()
  }, [fetchData])

  const stats = computeStats(entries)
  const weeklyBars = getWeeklyBarData(entries)

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            navigation.goBack()
          }}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Fasting History</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.bgSec}
          />
        }
      >
        {/* ── Stats Overview Cards ────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          <StatCard
            title="This Week"
            colors={colors}
            card={card}
            items={[
              { label: 'Avg Duration', value: formatDuration(Math.round(stats.week.avgDuration)) },
              { label: 'Fasts', value: String(stats.week.count) },
              { label: 'Completion', value: `${stats.week.completionRate}%` },
            ]}
          />
          <StatCard
            title="This Month"
            colors={colors}
            card={card}
            items={[
              { label: 'Avg Duration', value: formatDuration(Math.round(stats.month.avgDuration)) },
              { label: 'Fasts', value: String(stats.month.count) },
              { label: 'Longest Fast', value: formatDuration(stats.month.longestFast) },
              { label: 'Completion', value: `${stats.month.completionRate}%` },
            ]}
          />
          <StatCard
            title="All Time"
            colors={colors}
            card={card}
            items={[
              { label: 'Total Fasts', value: String(stats.allTime.totalFasts) },
              { label: 'Total Hours', value: `${stats.allTime.totalHours}h` },
              { label: 'Current Streak', value: `${stats.allTime.currentStreak} days` },
              { label: 'Best Streak', value: `${stats.allTime.bestStreak} days` },
            ]}
          />
        </ScrollView>

        {/* ── Weekly Bar Chart ───────────────────────────────── */}
        <View style={[styles.sectionCard, { ...card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 7 Days</Text>
          <WeeklyBarChart data={weeklyBars} colors={colors} />
        </View>

        {/* ── View Mode Toggle ───────────────────────────────── */}
        <View style={styles.toggleRow}>
          {['recent', 'monthly'].map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setViewMode(mode)
              }}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: viewMode === mode ? colors.accent : 'transparent',
                  borderColor: viewMode === mode ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: viewMode === mode ? '#fff' : colors.textSec },
                ]}
              >
                {mode === 'recent' ? 'Recent' : 'Monthly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content based on view mode ─────────────────────── */}
        {viewMode === 'recent' ? (
          <View style={styles.logList}>
            {entries.length === 0 ? (
              <View style={[styles.emptyState, { ...card }]}>
                <Feather name="clock" size={40} color={colors.textTer} />
                <Text style={[styles.emptyText, { color: colors.textSec }]}>
                  No fasting sessions yet
                </Text>
              </View>
            ) : (
              entries.map((item) => (
                <LogEntry key={item.id} item={item} colors={colors} card={card} />
              ))
            )}
          </View>
        ) : (
          <CalendarHeatmap entries={entries} colors={colors} />
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  )
}

// ════════════════════════════════════════════════════════════════════
// ── Styles ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    letterSpacing: -0.3,
  },

  // Stats horizontal scroll
  statsScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    ...ELITE_CARD,
    width: 200,
    padding: SPACING.md,
  },
  statCardTitle: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONT.regular,
  },
  statValue: {
    fontSize: 14,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },

  // Section card
  sectionCard: {
    ...ELITE_CARD,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.md,
  },

  // Bar chart
  chartContainer: {
    height: BAR_CHART_HEIGHT + 28,
  },
  chartArea: {
    height: BAR_CHART_HEIGHT + 28,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: BAR_CHART_HEIGHT,
    paddingHorizontal: SPACING.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 18,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 1,
    zIndex: 1,
  },
  targetDash: {
    flex: 1,
    height: 1,
  },
  targetLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  toggleBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },

  // Log entries
  logList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  logCard: {
    ...ELITE_CARD,
    padding: SPACING.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logDate: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  logDay: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logStatText: {
    fontSize: 13,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },

  // Protocol pill
  protocolPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  protocolPillText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    fontVariant: ['tabular-nums'],
  },

  // Status icon
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Calendar heatmap
  calendarContainer: {
    marginHorizontal: SPACING.lg,
  },
  calendarMonth: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.sm,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONT.medium,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: (SCREEN_WIDTH - SPACING.lg * 2) / 7 - 4,
    height: (SCREEN_WIDTH - SPACING.lg * 2) / 7 - 4,
    margin: 2,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCellText: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },

  // Empty state
  emptyState: {
    ...ELITE_CARD,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    textAlign: 'center',
  },
})
