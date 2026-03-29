/**
 * Weekly Wellness Report — auto-generated summary card combining
 * sleep, steps, workouts, and nutrition into a single glanceable report.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, GLASS_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useHealth } from '../context/HealthContext'
import api from '../lib/api'

const METRICS = [
  { key: 'steps', label: 'Avg Steps', icon: 'trending-up', color: '#F97316', suffix: '', format: v => Math.round(v).toLocaleString() },
  { key: 'sleep', label: 'Avg Sleep', icon: 'moon', color: '#6366F1', suffix: 'h', format: v => v.toFixed(1) },
  { key: 'workouts', label: 'Workouts', icon: 'activity', color: '#3B82F6', suffix: '', format: v => v.toString() },
  { key: 'calories', label: 'Avg Intake', icon: 'zap', color: '#EF4444', suffix: 'kcal', format: v => Math.round(v).toLocaleString() },
]

function getOverallGrade(steps, sleep, workouts) {
  let score = 0
  if (steps >= 8000) score += 3; else if (steps >= 5000) score += 2; else if (steps > 0) score += 1
  if (sleep >= 7) score += 3; else if (sleep >= 6) score += 2; else if (sleep > 0) score += 1
  if (workouts >= 4) score += 3; else if (workouts >= 2) score += 2; else if (workouts >= 1) score += 1

  if (score >= 8) return { grade: 'A', color: '#22C55E', label: 'Excellent week!' }
  if (score >= 6) return { grade: 'B', color: '#34D399', label: 'Good progress' }
  if (score >= 4) return { grade: 'C', color: '#F59E0B', label: 'Room to improve' }
  return { grade: 'D', color: '#EF4444', label: 'Let\'s bounce back' }
}

export default function WeeklyWellnessReport({ style }) {
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const { steps: todaySteps, sleepData } = useHealth()
  const [weekData, setWeekData] = useState(null)

  useEffect(() => {
    if (!gymId || !member?.id) {
      // Build from local data only
      setWeekData({
        steps: todaySteps || 0,
        sleep: sleepData?.durationMinutes ? sleepData.duration / 60 : 0,
        workouts: 0,
        calories: 0,
      })
      return
    }

    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const from = weekAgo.toISOString().split('T')[0]
    const to = today.toISOString().split('T')[0]

    Promise.all([
      api.get(`/gyms/${gymId}/members/${member.id}/health/workouts/daily?from=${from}&to=${to}`).catch(() => ({ data: [] })),
      api.get(`/gyms/${gymId}/members/${member.id}/nutrition/daily?from=${from}&to=${to}`).catch(() => ({ data: { meals: [] } })),
    ]).then(([workoutRes, nutritionRes]) => {
      const workouts = Array.isArray(workoutRes.data?.workouts || workoutRes.data)
        ? (workoutRes.data?.workouts || workoutRes.data)
        : []
      const meals = nutritionRes.data?.meals || nutritionRes.data?.days || []

      const avgCalories = meals.length > 0
        ? meals.reduce((sum, m) => sum + (m.calories || m.totals?.calories || 0), 0) / Math.max(meals.length, 1)
        : 0

      setWeekData({
        steps: todaySteps || 0,
        sleep: sleepData?.durationMinutes ? sleepData.duration / 60 : 0,
        workouts: workouts.length,
        calories: avgCalories,
      })
    })
  }, [gymId, member?.id, todaySteps, sleepData])

  const report = useMemo(() => {
    if (!weekData) return null
    const grade = getOverallGrade(weekData.steps, weekData.sleep, weekData.workouts)
    return { ...weekData, ...grade }
  }, [weekData])

  if (!report) return null

  return (
    <View style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: report.color }, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="bar-chart-2" size={16} color={report.color} />
          <Text style={[styles.title, { color: colors.text }]}>Weekly Report</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: report.color + '20' }]}>
          <Text style={[styles.gradeText, { color: report.color }]}>{report.grade}</Text>
        </View>
      </View>
      <Text style={[styles.gradeLabel, { color: colors.textSec }]}>{report.label}</Text>

      {/* Metric Grid */}
      <View style={styles.grid}>
        {METRICS.map(m => {
          const val = report[m.key] || 0
          return (
            <View key={m.key} style={[styles.metricCard, { backgroundColor: m.color + '0D' }]}>
              <Feather name={m.icon} size={14} color={m.color} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {m.format(val)}{m.suffix ? <Text style={styles.metricSuffix}> {m.suffix}</Text> : null}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textTer }]}>{m.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  gradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: FONT.numExtraBold,
  },
  gradeLabel: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  metricSuffix: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
  },
})
