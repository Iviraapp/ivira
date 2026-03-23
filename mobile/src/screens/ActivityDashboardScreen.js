import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { getItem, setItem } from '../lib/storage'

let Pedometer = null
try {
  const sensors = require('expo-sensors')
  Pedometer = sensors.Pedometer
} catch {}

let Svg = null
let Circle = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
} catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const RING_SIZE = 180
const RING_STROKE = 12
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const DEFAULT_STEP_GOAL = 10000
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ActivityDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, card } = useTheme()
  const { member, gymId, isDemo } = useAuth()

  const [steps, setSteps] = useState(0)
  const [stepGoal, setStepGoal] = useState(DEFAULT_STEP_GOAL)
  const [pedometerAvailable, setPedometerAvailable] = useState(null)
  const [weeklySteps, setWeeklySteps] = useState([0, 0, 0, 0, 0, 0, 0])
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0)
  const [checkinsThisWeek, setCheckinsThisWeek] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [goalInputVisible, setGoalInputVisible] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const stepCountAnim = useRef(new Animated.Value(0)).current
  const ringProgressAnim = useRef(new Animated.Value(0)).current
  const barProgressAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const pedometerSub = useRef(null)
  const displayedSteps = useRef(0)

  // Animated count-up value
  const [displaySteps, setDisplaySteps] = useState(0)

  // Load step goal from storage
  useEffect(() => {
    getItem('ivira_step_goal').then(val => {
      if (val) {
        const parsed = parseInt(val, 10)
        if (!isNaN(parsed) && parsed > 0) setStepGoal(parsed)
      }
    }).catch(() => {})
  }, [])

  // Check pedometer availability and load data
  useEffect(() => {
    let cancelled = false

    async function init() {
      // Check pedometer
      let available = false
      if (Pedometer) {
        try {
          available = await Pedometer.isAvailableAsync()
        } catch {}
      }
      if (!cancelled) setPedometerAvailable(available)

      if (available) {
        await loadTodaySteps()
        await loadWeeklySteps()
        subscribeToSteps()
      }

      // Load activity data from API
      await loadActivityData()

      if (!cancelled) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }
    }

    init()

    return () => {
      cancelled = true
      if (pedometerSub.current) {
        pedometerSub.current.remove()
        pedometerSub.current = null
      }
    }
  }, [])

  // Animate step count-up and ring when steps change
  useEffect(() => {
    const progress = Math.min(steps / stepGoal, 1)

    // Animate ring
    Animated.timing(ringProgressAnim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start()

    // Animate bar
    Animated.timing(barProgressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start()

    // Count-up animation
    const startVal = displayedSteps.current
    const endVal = steps
    const duration = 1200
    const startTime = Date.now()

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(startVal + (endVal - startVal) * eased)
      setDisplaySteps(current)
      if (t >= 1) {
        clearInterval(timer)
        displayedSteps.current = endVal
      }
    }, 16)

    return () => clearInterval(timer)
  }, [steps, stepGoal])

  async function loadTodaySteps() {
    if (!Pedometer) return
    try {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      const result = await Pedometer.getStepCountAsync(start, end)
      if (result?.steps != null) {
        setSteps(result.steps)
        displayedSteps.current = 0 // Reset so count-up animates from 0
      }
    } catch {}
  }

  async function loadWeeklySteps() {
    if (!Pedometer) return
    try {
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=Sun
      // Convert to Mon=0 ... Sun=6
      const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekly = new Array(7).fill(0)

      for (let i = 0; i <= todayIndex; i++) {
        const dayStart = new Date(now)
        dayStart.setDate(now.getDate() - (todayIndex - i))
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        // Don't query future from the current time
        const queryEnd = i === todayIndex ? now : dayEnd

        try {
          const result = await Pedometer.getStepCountAsync(dayStart, queryEnd)
          if (result?.steps != null) {
            weekly[i] = result.steps
          }
        } catch {}
      }

      setWeeklySteps(weekly)
    } catch {}
  }

  function subscribeToSteps() {
    if (!Pedometer) return
    try {
      pedometerSub.current = Pedometer.watchStepCount(result => {
        if (result?.steps != null) {
          // watchStepCount returns steps since subscription, add to today's base
          setSteps(prev => {
            const base = displayedSteps.current || prev
            return base + result.steps
          })
        }
      })
    } catch {}
  }

  async function loadActivityData() {
    if (!gymId || !member?.id) return
    try {
      const now = new Date()
      const weekStart = new Date(now)
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart.setDate(now.getDate() - mondayOffset)
      weekStart.setHours(0, 0, 0, 0)

      const from = weekStart.toISOString().split('T')[0]
      const to = now.toISOString().split('T')[0]

      // Try to load checkins for this week
      try {
        const res = await api.get(`/gyms/${gymId}/members/${member.id}/checkins?from=${from}&to=${to}`)
        if (res?.data?.checkins) {
          setCheckinsThisWeek(res.data.checkins.length)
          // Calculate streak from checkins
          calculateStreak(res.data.checkins)
        } else if (Array.isArray(res?.data)) {
          setCheckinsThisWeek(res.data.length)
          calculateStreak(res.data)
        }
      } catch {}

      // Try to load workout sessions
      try {
        const res = await api.get(`/gyms/${gymId}/members/${member.id}/workout-sessions?from=${from}&to=${to}`)
        if (res?.data?.sessions) {
          setWorkoutsThisWeek(res.data.sessions.length)
        } else if (Array.isArray(res?.data)) {
          setWorkoutsThisWeek(res.data.length)
        }
      } catch {}
    } catch {}
  }

  function calculateStreak(checkins) {
    if (!checkins || checkins.length === 0) {
      setCurrentStreak(0)
      return
    }
    // Sort by date descending
    const dates = checkins
      .map(c => (c.checked_in_at || c.date || '').split('T')[0])
      .filter(Boolean)
      .sort()
      .reverse()

    const uniqueDates = [...new Set(dates)]
    let streak = 0
    const today = new Date().toISOString().split('T')[0]

    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]
      if (uniqueDates[i] === expectedStr) {
        streak++
      } else if (i === 0 && uniqueDates[0] !== today) {
        // Allow gap for today if day hasn't ended
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        if (uniqueDates[0] === yesterday.toISOString().split('T')[0]) {
          streak++
        } else break
      } else break
    }

    setCurrentStreak(streak)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      loadTodaySteps(),
      loadWeeklySteps(),
      loadActivityData(),
    ])
    setRefreshing(false)
  }, [gymId, member])

  const handleSetGoal = () => {
    if (Platform.OS !== 'ios') {
      setGoalInputVisible(true)
      return
    }
    Alert.prompt(
      'Daily Step Goal',
      'Enter your daily step target:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: (value) => {
            const parsed = parseInt(value, 10)
            if (!isNaN(parsed) && parsed > 0) {
              setStepGoal(parsed)
              setItem('ivira_step_goal', String(parsed)).catch(() => {})
            }
          },
        },
      ],
      'plain-text',
      String(stepGoal),
      'number-pad',
    )
  }

  const handleGoalInputSubmit = () => {
    const parsed = parseInt(goalInput, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setStepGoal(parsed)
      setItem('ivira_step_goal', String(parsed)).catch(() => {})
    }
    setGoalInputVisible(false)
    setGoalInput('')
  }

  // Calculated metrics
  const distanceKm = (steps * 0.0008).toFixed(1)
  const calories = Math.round(steps * 0.04)
  const activeMinutes = Math.round(steps / 100)
  const progressPct = Math.min(Math.round((steps / stepGoal) * 100), 100)
  const isGoalMet = steps >= stepGoal

  // Weekly chart max
  const weeklyMax = Math.max(...weeklySteps, stepGoal * 0.5)
  const now = new Date()
  const todayDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1

  // Ring stroke dashoffset
  const ringStrokeDashoffset = ringProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  })

  const barWidth = barProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textSec}
            />
          }
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
              onPress={() => navigation?.goBack?.()}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
            <TouchableOpacity
              style={[styles.goalBtn, { backgroundColor: colors.accentSoft }]}
              onPress={handleSetGoal}
              activeOpacity={0.7}
            >
              <Feather name="target" size={16} color={COLORS.accent} />
              <Text style={[styles.goalBtnText, { color: COLORS.accent }]}>Set Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Pedometer unavailable notice */}
          {pedometerAvailable === false && (
            <View style={[styles.noticeCard, card, { borderLeftColor: COLORS.amber, borderLeftWidth: 3 }]}>
              <Feather name="alert-circle" size={18} color={COLORS.amber} />
              <Text style={[styles.noticeText, { color: colors.textSec }]}>
                Step tracking requires device sensors. Showing workout-based activity data.
              </Text>
            </View>
          )}

          {/* Goal Input for web */}
          {goalInputVisible && (
            <View style={[styles.goalInputRow, card]}>
              <TextInput
                style={[styles.goalInputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgTer }]}
                placeholder="Step goal"
                placeholderTextColor={colors.textTer}
                keyboardType="number-pad"
                value={goalInput}
                onChangeText={setGoalInput}
                onSubmitEditing={handleGoalInputSubmit}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.goalInputBtn, { backgroundColor: COLORS.accent }]}
                onPress={handleGoalInputSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.goalInputBtnText}>Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setGoalInputVisible(false); setGoalInput('') }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color={colors.textSec} />
              </TouchableOpacity>
            </View>
          )}

          {/* Hero Steps Card */}
          <View style={[styles.heroCard, card, isGoalMet && { borderColor: COLORS.green, borderWidth: 1.5 }]}>
            <View style={styles.ringContainer}>
              {Svg && Circle ? (
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  {/* Background ring */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={colors.bgTer}
                    strokeWidth={RING_STROKE}
                    fill="transparent"
                  />
                  {/* Progress ring */}
                  <AnimatedCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={isGoalMet ? COLORS.green : COLORS.accent}
                    strokeWidth={RING_STROKE}
                    fill="transparent"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringStrokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
              ) : (
                <View style={[styles.ringFallback, { borderColor: isGoalMet ? COLORS.green : COLORS.accent }]} />
              )}
              <View style={styles.ringCenter}>
                <Text style={[styles.heroStepCount, { color: isGoalMet ? COLORS.green : colors.text }]}>
                  {displaySteps.toLocaleString()}
                </Text>
                <Text style={[styles.heroStepLabel, { color: colors.textSec }]}>total steps</Text>
                <Text style={[styles.heroProgressPct, { color: isGoalMet ? COLORS.green : COLORS.accent }]}>
                  {progressPct}%
                </Text>
              </View>
            </View>
          </View>

          {/* Activity Metrics Row */}
          <View style={styles.metricsRow}>
            <MetricPill
              icon="zap"
              value={calories}
              label="Calories"
              tint={COLORS.red}
              colors={colors}
              card={card}
            />
            <MetricPill
              icon="map-pin"
              value={`${distanceKm} km`}
              label="Distance"
              tint={COLORS.cyan}
              colors={colors}
              card={card}
            />
            <MetricPill
              icon="clock"
              value={activeMinutes}
              label="Active Min"
              tint={COLORS.green}
              colors={colors}
              card={card}
            />
          </View>

          {/* Daily Goal Progress Bar */}
          <View style={[styles.goalProgressCard, card]}>
            <View style={styles.goalProgressHeader}>
              <Text style={[styles.goalProgressTitle, { color: colors.text }]}>Daily Goal</Text>
              <Text style={[styles.goalProgressPct, { color: isGoalMet ? COLORS.green : COLORS.accent }]}>
                {progressPct}%
              </Text>
            </View>
            <View style={[styles.goalProgressBarBg, { backgroundColor: colors.bgTer }]}>
              <Animated.View
                style={[
                  styles.goalProgressBarFill,
                  {
                    width: barWidth,
                    backgroundColor: isGoalMet ? COLORS.green : COLORS.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.goalProgressLabel, { color: colors.textSec }]}>
              {steps.toLocaleString()} / {stepGoal.toLocaleString()} steps
            </Text>
          </View>

          {/* Weekly Activity Chart */}
          <View style={[styles.weeklyCard, card]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Activity</Text>
            <View style={styles.weeklyChart}>
              {weeklySteps.map((daySteps, i) => {
                const barHeight = weeklyMax > 0
                  ? Math.max((daySteps / weeklyMax) * 120, 4)
                  : 4
                const isToday = i === todayDayIndex
                const isFuture = i > todayDayIndex
                return (
                  <View key={i} style={styles.weeklyBarCol}>
                    <Text style={[styles.weeklyBarValue, { color: colors.textTer }]}>
                      {daySteps > 0 ? (daySteps >= 1000 ? `${(daySteps / 1000).toFixed(1)}k` : daySteps) : ''}
                    </Text>
                    <View
                      style={[
                        styles.weeklyBar,
                        {
                          height: barHeight,
                          backgroundColor: isFuture
                            ? colors.bgTer
                            : isToday
                              ? COLORS.accent
                              : 'rgba(0,82,255,0.3)',
                          borderRadius: RADIUS.sm,
                        },
                      ]}
                    />
                    <Text style={[
                      styles.weeklyDayLabel,
                      { color: isToday ? COLORS.accent : colors.textTer },
                      isToday && { fontFamily: FONT.semibold },
                    ]}>
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Activity Breakdown */}
          <View style={[styles.breakdownCard, card]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Breakdown</Text>
            <View style={styles.breakdownGrid}>
              <BreakdownItem
                icon="activity"
                value={workoutsThisWeek}
                label="Workouts This Week"
                color={COLORS.accent}
                colors={colors}
              />
              <BreakdownItem
                icon="log-in"
                value={checkinsThisWeek}
                label="Check-ins This Week"
                color={COLORS.green}
                colors={colors}
              />
              <BreakdownItem
                icon="trending-up"
                value={currentStreak}
                label="Current Streak"
                suffix=" days"
                color={COLORS.amber}
                colors={colors}
              />
              <BreakdownItem
                icon="target"
                value={stepGoal.toLocaleString()}
                label="Daily Step Goal"
                color={COLORS.cyan}
                colors={colors}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  )
}

// Animated Circle for SVG ring
const AnimatedCircle = Circle ? Animated.createAnimatedComponent(Circle) : View

function MetricPill({ icon, value, label, tint, colors, card }) {
  return (
    <View style={[styles.metricPill, card]}>
      <View style={[styles.metricIconWrap, { backgroundColor: `${tint}18` }]}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.textSec }]}>{label}</Text>
    </View>
  )
}

function BreakdownItem({ icon, value, label, suffix = '', color, colors }) {
  return (
    <View style={styles.breakdownItem}>
      <View style={[styles.breakdownIconWrap, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.breakdownValue, { color: colors.text }]}>
        {value}{suffix}
      </Text>
      <Text style={[styles.breakdownLabel, { color: colors.textSec }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    flex: 1,
    textAlign: 'center',
  },
  goalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  goalBtnText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },

  // Notice
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.regular,
    lineHeight: 18,
  },

  // Goal input
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  goalInputField: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontFamily: FONT.numMedium,
    fontSize: 16,
  },
  goalInputBtn: {
    height: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInputBtnText: {
    color: '#FFFFFF',
    fontFamily: FONT.semibold,
    fontSize: 14,
  },

  // Hero Card
  heroCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFallback: {
    width: RING_SIZE - 20,
    height: RING_SIZE - 20,
    borderRadius: (RING_SIZE - 20) / 2,
    borderWidth: RING_STROKE,
  },
  heroStepCount: {
    fontSize: 48,
    fontFamily: FONT.numExtraBold,
    lineHeight: 54,
  },
  heroStepLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
    marginTop: 2,
  },
  heroProgressPct: {
    fontSize: 13,
    fontFamily: FONT.numSemibold,
    marginTop: 4,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: FONT.numBold,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
  },

  // Goal Progress
  goalProgressCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  goalProgressTitle: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  goalProgressPct: {
    fontSize: 15,
    fontFamily: FONT.numBold,
  },
  goalProgressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  goalProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalProgressLabel: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // Weekly Chart
  weeklyCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.md,
  },
  weeklyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: SPACING.md,
  },
  weeklyBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
  },
  weeklyBarValue: {
    fontSize: 10,
    fontFamily: FONT.numMedium,
    marginBottom: 2,
  },
  weeklyBar: {
    width: 28,
    minHeight: 4,
  },
  weeklyDayLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    marginTop: SPACING.xs,
  },

  // Breakdown
  breakdownCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  breakdownItem: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  breakdownIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  breakdownValue: {
    fontSize: 22,
    fontFamily: FONT.numBold,
  },
  breakdownLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    textAlign: 'center',
  },
})
