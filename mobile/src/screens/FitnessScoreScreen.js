import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CIRCLE_SIZE = 200
const CIRCLE_BORDER = 8
const BAR_MAX_WIDTH = SCREEN_WIDTH - 140

// --- Score calculation helpers ---

function calcConsistency(workouts) {
  if (!workouts || workouts.length === 0) return 0
  // Count workouts in the last 7 days
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentCount = workouts.filter((w) => new Date(w.date || w.created_at) >= weekAgo).length
  if (recentCount >= 5) return 20
  if (recentCount === 4) return 17
  if (recentCount === 3) return 14
  if (recentCount === 2) return 10
  if (recentCount === 1) return 6
  return 0
}

function calcStrength(workouts) {
  if (!workouts || workouts.length < 4) return 10
  const now = new Date()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  const recentWorkouts = workouts.filter((w) => {
    const d = new Date(w.date || w.created_at)
    return d >= twoWeeksAgo
  })
  const olderWorkouts = workouts.filter((w) => {
    const d = new Date(w.date || w.created_at)
    return d >= fourWeeksAgo && d < twoWeeksAgo
  })

  const getVolume = (list) =>
    list.reduce((sum, w) => sum + (w.total_volume || w.volume || 0), 0)

  const recentVol = getVolume(recentWorkouts)
  const olderVol = getVolume(olderWorkouts)

  if (olderVol === 0 && recentVol > 0) return 14
  if (olderVol === 0) return 10
  const ratio = recentVol / olderVol
  if (ratio >= 1.15) return 20
  if (ratio >= 1.05) return 17
  if (ratio >= 0.95) return 14
  if (ratio >= 0.8) return 10
  return 6
}

function calcEndurance(workouts) {
  if (!workouts || workouts.length === 0) return 4
  const durations = workouts
    .map((w) => w.duration_minutes || w.duration || 0)
    .filter((d) => d > 0)
  if (durations.length === 0) return 4
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length
  if (avg > 60) return 20
  if (avg > 45) return 16
  if (avg > 30) return 12
  if (avg > 15) return 8
  return 4
}

function calcNutrition(memberData) {
  const bmi = memberData?.bmi || memberData?.body_stats?.bmi
  if (!bmi) return 10
  if (bmi >= 18.5 && bmi <= 24.9) return 20
  if (bmi >= 25 && bmi <= 29.9) return 14
  if (bmi >= 30) return 8
  if (bmi < 18.5) return 12
  return 10
}

function calcRecovery(workouts) {
  if (!workouts || workouts.length === 0) return 14
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const workoutDays = new Set()
  workouts.forEach((w) => {
    const d = new Date(w.date || w.created_at)
    if (d >= weekAgo) {
      workoutDays.add(d.toISOString().split('T')[0])
    }
  })
  const restDays = 7 - workoutDays.size
  if (restDays >= 1 && restDays <= 2) return 20
  if (restDays === 0) return 10
  if (restDays >= 3) return 14
  return 14
}

function getScoreLabel(score) {
  if (score >= 85) return 'Excellent!'
  if (score >= 70) return 'Great!'
  if (score >= 50) return 'Good'
  if (score >= 30) return 'Getting There'
  return 'Getting Started'
}

function getScoreLabelColor(score) {
  if (score >= 85) return COLORS.green
  if (score >= 70) return COLORS.accent
  if (score >= 50) return COLORS.cyan
  if (score >= 30) return COLORS.amber
  return COLORS.textSec
}

function getInsights(dimensions) {
  const sorted = [...dimensions].sort((a, b) => a.value - b.value)
  const insights = []
  const lowest = sorted.slice(0, 3)

  lowest.forEach((dim) => {
    if (dim.value >= 17) return // Already good
    switch (dim.key) {
      case 'consistency':
        insights.push({
          icon: 'calendar',
          color: COLORS.accent,
          text: 'Try to work out at least 3 times per week for better results.',
        })
        break
      case 'strength':
        insights.push({
          icon: 'trending-up',
          color: COLORS.red,
          text: 'Gradually increase your weights to build strength over time.',
        })
        break
      case 'endurance':
        insights.push({
          icon: 'clock',
          color: COLORS.amber,
          text: 'Aim for longer workout sessions of 45+ minutes for endurance gains.',
        })
        break
      case 'nutrition':
        insights.push({
          icon: 'heart',
          color: COLORS.green,
          text: 'Focus on balanced nutrition to reach a healthy BMI range.',
        })
        break
      case 'recovery':
        if (dim.value <= 10) {
          insights.push({
            icon: 'moon',
            color: COLORS.cyan,
            text: "You're training hard! Add a rest day to let your muscles recover.",
          })
        } else {
          insights.push({
            icon: 'moon',
            color: COLORS.cyan,
            text: 'Balance your rest and workout days for optimal recovery.',
          })
        }
        break
    }
  })

  return insights.slice(0, 3)
}

// --- Component ---

export default function FitnessScoreScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const memberId = member?.id

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dimensions, setDimensions] = useState([])
  const [totalScore, setTotalScore] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState([])

  // Animations
  const scoreAnim = useRef(new Animated.Value(0)).current
  const ringAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0.2)).current
  const barAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  const fetchData = useCallback(async () => {
    try {
      if (!gymId || !memberId) {
        setLoading(false)
        return
      }

      const [memberRes, workoutsRes, checkinRes] = await Promise.allSettled([
        api.get(`/gyms/${gymId}/members/${memberId}`),
        api.get(`/gyms/${gymId}/members/${memberId}/workout-sessions?limit=30`),
        api.get(`/gyms/${gymId}/members/${memberId}/checkins?limit=30`),
      ])

      const memberData =
        memberRes.status === 'fulfilled' ? memberRes.value?.data?.member || memberRes.value?.data : {}
      const workouts =
        workoutsRes.status === 'fulfilled'
          ? workoutsRes.value?.data?.sessions || workoutsRes.value?.data?.data || workoutsRes.value?.data || []
          : []
      const checkins =
        checkinRes.status === 'fulfilled'
          ? checkinRes.value?.data?.checkins || checkinRes.value?.data?.data || checkinRes.value?.data || []
          : []

      // Use workouts for activity, fall back to checkins
      const activitySource = workouts.length > 0 ? workouts : checkins

      const consistency = calcConsistency(activitySource)
      const strength = calcStrength(workouts)
      const endurance = calcEndurance(workouts)
      const nutrition = calcNutrition(memberData)
      const recovery = calcRecovery(activitySource)

      const dims = [
        { key: 'consistency', label: 'Consistency', icon: 'repeat', color: COLORS.accent, value: consistency },
        { key: 'strength', label: 'Strength', icon: 'zap', color: COLORS.red, value: strength },
        { key: 'endurance', label: 'Endurance', icon: 'wind', color: COLORS.amber, value: endurance },
        { key: 'nutrition', label: 'Nutrition', icon: 'heart', color: COLORS.green, value: nutrition },
        { key: 'recovery', label: 'Recovery', icon: 'moon', color: COLORS.cyan, value: recovery },
      ]

      const total = consistency + strength + endurance + nutrition + recovery
      setDimensions(dims)
      setTotalScore(total)

      // Weekly activity (last 7 days)
      const now = new Date()
      const week = []
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayStr = day.toISOString().split('T')[0]
        const dayLabel = day.toLocaleDateString('en', { weekday: 'short' }).charAt(0)
        const active = activitySource.some((w) => {
          const wDate = new Date(w.date || w.created_at || w.checked_in_at)
          return wDate.toISOString().split('T')[0] === dayStr
        })
        week.push({ label: dayLabel, active })
      }
      setWeeklyActivity(week)

      // Animate
      runAnimations(total, dims)
    } catch (err) {
      console.warn('FitnessScore fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, memberId])

  function runAnimations(total, dims) {
    // Reset
    scoreAnim.setValue(0)
    ringAnim.setValue(0)
    fadeAnim.setValue(0)
    barAnims.forEach((a) => a.setValue(0))

    Animated.parallel([
      // Score count-up
      Animated.timing(scoreAnim, {
        toValue: total,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Ring progress
      Animated.timing(ringAnim, {
        toValue: total / 100,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
        ])
      ),
      // Staggered bars
      Animated.stagger(
        150,
        barAnims.map((anim, i) =>
          Animated.timing(anim, {
            toValue: dims[i]?.value || 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          })
        )
      ),
    ]).start()
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My IVIRA Fitness Score is ${totalScore}/100! ${getScoreLabel(totalScore)} 💪\n\nBreakdown:\n${dimensions.map((d) => `${d.label}: ${d.value}/20`).join('\n')}\n\nTrack your fitness with IVIRA!`,
      })
    } catch {}
  }

  const displayScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  })

  const insights = getInsights(dimensions)

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 100 }} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Fitness Score</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero Circle */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <View style={styles.circleContainer}>
            {/* Glow */}
            <Animated.View
              style={[
                styles.circleGlow,
                {
                  opacity: glowAnim,
                  backgroundColor: COLORS.accent,
                },
              ]}
            />
            {/* Background ring */}
            <View style={[styles.circleOuter, { borderColor: colors.border }]}>
              {/* Progress arc — simplified with rotation */}
              <AnimatedRing progress={ringAnim} />
              {/* Center content */}
              <View style={styles.circleInner}>
                <AnimatedScore value={displayScore} />
                <Text style={[styles.scoreOf, { color: colors.textSec }]}>/100</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.scoreLabel, { color: getScoreLabelColor(totalScore) }]}>
            {getScoreLabel(totalScore)}
          </Text>
        </Animated.View>

        {/* Breakdown Bars */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Score Breakdown</Text>
          {dimensions.map((dim, i) => (
            <View key={dim.key} style={styles.barRow}>
              <View style={styles.barLabel}>
                <View style={[styles.barIcon, { backgroundColor: dim.color + '20' }]}>
                  <Feather name={dim.icon} size={14} color={dim.color} />
                </View>
                <Text style={[styles.barLabelText, { color: colors.text }]}>{dim.label}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barBg, { backgroundColor: colors.bgTer }]} />
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: dim.color,
                      width: barAnims[i].interpolate({
                        inputRange: [0, 20],
                        outputRange: [0, BAR_MAX_WIDTH],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: colors.textSec }]}>
                {dim.value}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Weekly Trend */}
        {weeklyActivity.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
            <View style={[styles.weekCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              <View style={styles.weekRow}>
                {weeklyActivity.map((day, i) => (
                  <View key={i} style={styles.weekDay}>
                    <View
                      style={[
                        styles.weekBar,
                        {
                          backgroundColor: day.active ? COLORS.accent : colors.bgTer,
                          height: day.active ? 32 : 12,
                        },
                      ]}
                    />
                    <Text style={[styles.weekLabel, { color: day.active ? colors.text : colors.textTer }]}>
                      {day.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights</Text>
            {insights.map((insight, i) => (
              <View
                key={i}
                style={[styles.insightCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
              >
                <View style={[styles.insightIcon, { backgroundColor: insight.color + '18' }]}>
                  <Feather name={insight.icon} size={18} color={insight.color} />
                </View>
                <Text style={[styles.insightText, { color: colors.textSec }]}>{insight.text}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Share Button */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Feather name="share-2" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Share Your Score</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

// --- Animated score number ---

function AnimatedScore({ value }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      setDisplay(Math.round(v))
    })
    return () => value.removeListener(id)
  }, [value])

  return <Text style={styles.scoreNumber}>{display}</Text>
}

// --- Animated ring (View-based, no SVG) ---

function AnimatedRing({ progress }) {
  const [progressVal, setProgressVal] = useState(0)

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setProgressVal(value)
    })
    return () => progress.removeListener(id)
  }, [progress])

  // Create arc using two half-circles with rotation
  const rotation1 = Math.min(progressVal * 360, 180)
  const rotation2 = Math.max(0, progressVal * 360 - 180)
  const showSecondHalf = progressVal > 0.5

  return (
    <>
      {/* Right half */}
      <View style={styles.ringHalfContainer}>
        <View style={[styles.ringHalfMask, { overflow: 'hidden' }]}>
          <View
            style={[
              styles.ringHalf,
              {
                borderColor: COLORS.accent,
                borderLeftColor: 'transparent',
                borderBottomColor: 'transparent',
                transform: [{ rotate: `${rotation1 - 45}deg` }],
              },
            ]}
          />
        </View>
      </View>
      {/* Left half */}
      {showSecondHalf && (
        <View style={[styles.ringHalfContainer, styles.ringHalfLeft]}>
          <View style={[styles.ringHalfMask, styles.ringHalfMaskLeft, { overflow: 'hidden' }]}>
            <View
              style={[
                styles.ringHalf,
                {
                  borderColor: COLORS.accent,
                  borderRightColor: 'transparent',
                  borderTopColor: 'transparent',
                  transform: [{ rotate: `${rotation2 - 45}deg` }],
                },
              ]}
            />
          </View>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontFamily: FONT.semibold,
    fontSize: 18,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  circleContainer: {
    width: CIRCLE_SIZE + 40,
    height: CIRCLE_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE + 50,
    height: CIRCLE_SIZE + 50,
    borderRadius: (CIRCLE_SIZE + 50) / 2,
    opacity: 0.2,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: FONT.numBlack,
    fontSize: 72,
    color: '#FFFFFF',
    lineHeight: 80,
  },
  scoreOf: {
    fontFamily: FONT.numMedium,
    fontSize: 16,
    marginTop: -4,
  },
  scoreLabel: {
    fontFamily: FONT.bold,
    fontSize: 20,
    marginTop: SPACING.md,
  },

  // Ring
  ringHalfContainer: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    top: 0,
    left: 0,
  },
  ringHalfLeft: {},
  ringHalfMask: {
    position: 'absolute',
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    right: 0,
    top: 0,
  },
  ringHalfMaskLeft: {
    right: undefined,
    left: 0,
  },
  ringHalf: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: CIRCLE_BORDER,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  // Section
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONT.semibold,
    fontSize: 17,
    marginBottom: SPACING.md,
  },

  // Bars
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
  },
  barIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  barLabelText: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    position: 'relative',
  },
  barBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  barValue: {
    fontFamily: FONT.numSemibold,
    fontSize: 14,
    width: 24,
    textAlign: 'right',
  },

  // Weekly
  weekCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 56,
  },
  weekDay: {
    alignItems: 'center',
    flex: 1,
  },
  weekBar: {
    width: 20,
    borderRadius: 6,
    marginBottom: 6,
  },
  weekLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
  },

  // Insights
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Share
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    marginTop: SPACING.sm,
  },
  shareBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    color: '#FFFFFF',
  },
})
