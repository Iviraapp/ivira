/**
 * Dashboard Summary — single glanceable card combining all daily health metrics.
 * Replaces scattered individual cards for sleep, steps, nutrition, fasting, and readiness.
 * Each metric is tappable to jump to its detail screen.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, GLASS_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'

let Svg = null, SvgCircle = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  SvgCircle = svg.Circle
} catch {}

const RING_SIZE = 56
const STROKE = 4
const R = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R

function MiniRing({ progress, color, children }) {
  const offset = CIRCUMFERENCE * (1 - Math.min(progress, 1))
  if (!Svg || !SvgCircle) {
    return (
      <View style={[ringStyles.fallback, { borderColor: color }]}>{children}</View>
    )
  }
  return (
    <View style={ringStyles.wrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <SvgCircle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} stroke="rgba(148,163,184,0.08)" strokeWidth={STROKE} fill="none" />
        <SvgCircle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} stroke={color} strokeWidth={STROKE} fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round" rotation={-90} origin={`${RING_SIZE/2}, ${RING_SIZE/2}`} />
      </Svg>
      <View style={ringStyles.content}>{children}</View>
    </View>
  )
}

const ringStyles = StyleSheet.create({
  wrap: { width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center' },
  content: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  fallback: { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE/2, borderWidth: STROKE, justifyContent: 'center', alignItems: 'center' },
})

export default function DashboardSummary({
  style,
  // Data props
  sleepData,
  stepCount = 0,
  stepGoal = 10000,
  caloriesConsumed = 0,
  calorieGoal = 2000,
  workoutsDone = 0,
  waterGlasses = 0,
  waterGoal = 8,
  fastingHours = 0,
  streak = 0,
  // Navigation
  onPressSleep,
  onPressSteps,
  onPressNutrition,
  onPressWorkout,
  onPressWater,
  onPressFasting,
}) {
  const { colors } = useTheme()

  // Sleep
  const sleepHours = sleepData?.durationMinutes ? (sleepData.durationMinutes / 60).toFixed(1) : '—'
  const sleepProgress = sleepData?.durationMinutes ? sleepData.durationMinutes / 480 : 0
  const sleepColor = sleepProgress >= 0.875 ? '#22C55E' : sleepProgress >= 0.75 ? '#8B5CF6' : '#F97316'

  // Steps
  const stepProgress = stepCount / stepGoal
  const stepColor = stepProgress >= 1 ? '#22C55E' : '#F97316'

  // Calories
  const calProgress = caloriesConsumed / calorieGoal
  const calColor = calProgress >= 1 ? COLORS.red : COLORS.accent

  // Readiness score
  const readiness = useMemo(() => {
    let score = 60
    if (sleepData?.durationMinutes) {
      score += Math.min(20, Math.round((sleepData.durationMinutes / 480) * 20))
    }
    score += Math.min(15, Math.round((stepCount / 10000) * 15))
    if (workoutsDone > 0) score += 5
    score = Math.max(0, Math.min(100, score))
    const c = score >= 75 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
    const l = score >= 75 ? 'Ready' : score >= 50 ? 'Moderate' : 'Rest'
    return { score, color: c, label: l }
  }, [sleepData, stepCount, workoutsDone])

  // Daily goals progress
  const goalsTotal = 4
  let goalsDone = 0
  if (sleepData?.durationMinutes >= 360) goalsDone++
  if (stepCount >= stepGoal * 0.5) goalsDone++
  if (caloriesConsumed > 0) goalsDone++
  if (workoutsDone > 0) goalsDone++
  const goalsPct = Math.round((goalsDone / goalsTotal) * 100)

  return (
    <View style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: readiness.color }, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Today's Summary</Text>
        <View style={styles.headerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
          )}
          <View style={[styles.readinessPill, { backgroundColor: readiness.color + '18' }]}>
            <Text style={[styles.readinessText, { color: readiness.color }]}>{readiness.score} {readiness.label}</Text>
          </View>
        </View>
      </View>

      {/* Metric Rings Row */}
      <View style={styles.ringsRow}>
        {/* Sleep */}
        <TouchableOpacity style={styles.ringItem} onPress={onPressSleep} activeOpacity={0.7}>
          <MiniRing progress={sleepProgress} color={sleepColor}>
            <Text style={[styles.ringValue, { color: colors.text }]}>{sleepHours}</Text>
          </MiniRing>
          <Text style={[styles.ringLabel, { color: colors.textTer }]}>Sleep</Text>
          <Text style={[styles.ringUnit, { color: colors.textTer }]}>hours</Text>
        </TouchableOpacity>

        {/* Steps */}
        <TouchableOpacity style={styles.ringItem} onPress={onPressSteps} activeOpacity={0.7}>
          <MiniRing progress={stepProgress} color={stepColor}>
            <Text style={[styles.ringValue, { color: colors.text }]}>{stepCount >= 1000 ? `${(stepCount/1000).toFixed(1)}k` : stepCount}</Text>
          </MiniRing>
          <Text style={[styles.ringLabel, { color: colors.textTer }]}>Steps</Text>
          <Text style={[styles.ringUnit, { color: colors.textTer }]}>/ {(stepGoal/1000).toFixed(0)}k</Text>
        </TouchableOpacity>

        {/* Calories */}
        <TouchableOpacity style={styles.ringItem} onPress={onPressNutrition} activeOpacity={0.7}>
          <MiniRing progress={calProgress} color={calColor}>
            <Text style={[styles.ringValue, { color: colors.text }]}>{caloriesConsumed >= 1000 ? `${(caloriesConsumed/1000).toFixed(1)}k` : caloriesConsumed}</Text>
          </MiniRing>
          <Text style={[styles.ringLabel, { color: colors.textTer }]}>Calories</Text>
          <Text style={[styles.ringUnit, { color: colors.textTer }]}>kcal</Text>
        </TouchableOpacity>

        {/* Workouts */}
        <TouchableOpacity style={styles.ringItem} onPress={onPressWorkout} activeOpacity={0.7}>
          <MiniRing progress={workoutsDone > 0 ? 1 : 0} color={workoutsDone > 0 ? '#22C55E' : 'rgba(148,163,184,0.2)'}>
            <Feather name={workoutsDone > 0 ? 'check' : 'activity'} size={16} color={workoutsDone > 0 ? '#22C55E' : colors.textTer} />
          </MiniRing>
          <Text style={[styles.ringLabel, { color: colors.textTer }]}>Workout</Text>
          <Text style={[styles.ringUnit, { color: colors.textTer }]}>{workoutsDone > 0 ? 'Done' : 'None'}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Stats Row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.bottomStat} onPress={onPressWater} activeOpacity={0.7}>
          <Feather name="droplet" size={13} color="#38BDF8" />
          <Text style={[styles.bottomStatText, { color: colors.textSec }]}>{waterGlasses}/{waterGoal} glasses</Text>
        </TouchableOpacity>

        {fastingHours > 0 && (
          <TouchableOpacity style={styles.bottomStat} onPress={onPressFasting} activeOpacity={0.7}>
            <Feather name="clock" size={13} color="#8B5CF6" />
            <Text style={[styles.bottomStatText, { color: colors.textSec }]}>{fastingHours}h fasted</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomStat}>
          <View style={[styles.goalProgressTrack, { backgroundColor: colors.bgTer }]}>
            <View style={[styles.goalProgressFill, { width: `${goalsPct}%`, backgroundColor: readiness.color }]} />
          </View>
          <Text style={[styles.bottomStatText, { color: colors.textSec }]}>{goalsPct}% goals</Text>
        </View>
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
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakEmoji: { fontSize: 12 },
  streakNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
    fontFamily: FONT.numBold,
  },
  readinessPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  readinessText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  ringItem: {
    alignItems: 'center',
    flex: 1,
  },
  ringValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    marginTop: 4,
  },
  ringUnit: {
    fontSize: 9,
    fontFamily: FONT.regular,
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.12)',
  },
  bottomStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomStatText: {
    fontSize: 11,
    fontFamily: FONT.medium,
  },
  goalProgressTrack: {
    width: 40,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
})
