/**
 * WorkoutHeatMap — GitHub-style activity grid showing 90-day workout consistency.
 * Green intensity cells, streak counter, and pattern insights.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const WEEKS = 13
const DAYS = 7
const CELL = 10
const GAP = 2
const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const ACCENT = '#22C55E'

function cellColor(count) {
  if (!count) return 'rgba(148,163,184,0.08)'
  if (count === 1) return '#22C55E33'
  if (count === 2) return '#22C55E88'
  return ACCENT
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function WorkoutHeatMap({ style }) {
  const { colors, card } = useTheme()
  const { gymId, member } = useAuth()
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(true)

  const memberId = member?.id

  useEffect(() => {
    if (!gymId || !memberId) return
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 90)
    api.get(`/gyms/${gymId}/members/${memberId}/workout-sessions`, {
      params: { from: formatDate(from), to: formatDate(to) },
    })
      .then(r => setSessions(r.data?.sessions || r.data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [gymId, memberId])

  const { dateMap, grid, months } = useMemo(() => {
    const map = {}
    if (sessions) {
      sessions.forEach(s => {
        const key = (s.date || s.startedAt || s.created_at || '').slice(0, 10)
        if (key) map[key] = (map[key] || 0) + 1
      })
    }

    // Build grid: 13 weeks ending today
    const today = new Date()
    const todayDay = today.getDay() // 0=Sun
    // End of grid is this Saturday (end of current week, Mon-Sun layout)
    const endOffset = todayDay === 0 ? 0 : 7 - todayDay
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + endOffset)

    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - WEEKS * 7 + 1)

    const cols = []
    const monthLabels = []
    const cursor = new Date(startDate)

    for (let w = 0; w < WEEKS; w++) {
      const week = []
      for (let d = 0; d < DAYS; d++) {
        const key = formatDate(cursor)
        const isFuture = cursor > today
        week.push({ key, count: map[key] || 0, future: isFuture })
        if (d === 0 && (w === 0 || cursor.getDate() <= 7)) {
          monthLabels.push({ week: w, label: MONTH_NAMES[cursor.getMonth()] })
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      cols.push(week)
    }

    return { dateMap: map, grid: cols, months: monthLabels }
  }, [sessions])

  const { streak, total, insight } = useMemo(() => {
    if (!sessions || !sessions.length) return { streak: 0, total: 0, insight: null }

    const totalCount = sessions.length
    // Streak: consecutive days ending today (or yesterday)
    let s = 0
    const check = new Date()
    for (let i = 0; i < 90; i++) {
      const key = formatDate(check)
      if (dateMap[key]) { s++; check.setDate(check.getDate() - 1) }
      else if (i === 0) { check.setDate(check.getDate() - 1) } // allow today not done yet
      else break
    }

    // Day-of-week analysis
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]
    sessions.forEach(sess => {
      const d = new Date(sess.date || sess.startedAt || sess.created_at)
      if (!isNaN(d)) dayTotals[d.getDay()]++
    })
    const maxDay = dayTotals.indexOf(Math.max(...dayTotals))
    const minDay = dayTotals.indexOf(Math.min(...dayTotals))
    let text = null
    if (totalCount >= 3) {
      if (dayTotals[maxDay] > dayTotals[minDay]) {
        text = dayTotals[minDay] === 0
          ? `${DAY_NAMES_FULL[minDay]}s are your rest day`
          : `You're strongest on ${DAY_NAMES_FULL[maxDay]}s`
      }
    }

    return { streak: s, total: totalCount, insight: text }
  }, [sessions, dateMap])

  if (!gymId || !memberId) return null

  return (
    <View style={[styles.card, card, { borderTopColor: ACCENT }, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="grid" size={16} color={colors?.textSec || COLORS.textSec} />
          <Text style={styles.title}>Workout Consistency</Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{'\uD83D\uDD25'} {streak}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginVertical: SPACING.md }} />
      ) : (
        <>
          {/* Month labels */}
          <View style={styles.monthRow}>
            <View style={{ width: 16 }} />
            {Array.from({ length: WEEKS }).map((_, w) => {
              const m = months.find(ml => ml.week === w)
              return (
                <View key={w} style={styles.monthCell}>
                  {m && <Text style={styles.monthLabel}>{m.label}</Text>}
                </View>
              )
            })}
          </View>

          {/* Grid */}
          <View style={styles.gridWrap}>
            {/* Day labels */}
            <View style={styles.dayLabels}>
              {DAY_LABELS.map((l, i) => (
                <View key={i} style={styles.dayLabelCell}>
                  <Text style={styles.dayLabelText}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Weeks as columns */}
            <View style={styles.grid}>
              {grid.map((week, wi) => (
                <View key={wi} style={styles.weekCol}>
                  {week.map((day, di) => (
                    <View
                      key={di}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: day.future
                            ? 'transparent'
                            : cellColor(day.count),
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Bottom stats */}
          <View style={styles.footer}>
            <View style={styles.pill}>
              <Feather name="activity" size={12} color={ACCENT} />
              <Text style={styles.pillText}>{total} workouts</Text>
            </View>
            {insight && (
              <Text style={styles.insight} numberOfLines={1}>{insight}</Text>
            )}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    borderTopWidth: 3,
    borderTopColor: ACCENT,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: COLORS.text,
  },
  streakBadge: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  streakText: {
    fontFamily: FONT.numBold,
    fontSize: 13,
    color: ACCENT,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  monthCell: { width: CELL + GAP, alignItems: 'center' },
  monthLabel: {
    fontFamily: FONT.medium,
    fontSize: 9,
    color: COLORS.textSec,
  },
  gridWrap: { flexDirection: 'row', marginBottom: SPACING.sm },
  dayLabels: { marginRight: 4, justifyContent: 'space-between' },
  dayLabelCell: { height: CELL + GAP, justifyContent: 'center' },
  dayLabelText: {
    fontFamily: FONT.medium,
    fontSize: 9,
    color: COLORS.textSec,
  },
  grid: { flexDirection: 'row', gap: GAP },
  weekCol: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontFamily: FONT.numSemibold,
    fontSize: 12,
    color: ACCENT,
  },
  insight: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSec,
    flex: 1,
  },
})
