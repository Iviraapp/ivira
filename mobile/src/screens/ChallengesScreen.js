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
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const STORAGE_KEY = 'ivira_challenges_progress'
const STREAK_KEY = 'ivira_challenges_streak'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const DAILY_CHALLENGES = [
  {
    id: 'd1',
    title: 'Hydration Hero',
    description: 'Drink 8 glasses of water',
    icon: 'droplet',
    color: '#4285F4',
    maxProgress: 8,
    unit: 'glasses',
    xp: 50,
    difficulty: 'Easy',
  },
  {
    id: 'd2',
    title: 'Fasting Champion',
    description: 'Complete a 16h fast',
    icon: 'clock',
    color: '#8B5CF6',
    maxProgress: 16,
    unit: 'hours',
    xp: 100,
    difficulty: 'Hard',
  },
  {
    id: 'd3',
    title: 'Step Master',
    description: 'Walk 10,000 steps',
    icon: 'navigation',
    color: '#F97316',
    maxProgress: 10000,
    unit: 'steps',
    xp: 75,
    difficulty: 'Medium',
  },
  {
    id: 'd4',
    title: 'Push-Up Power',
    description: 'Do 50 pushups',
    icon: 'trending-up',
    color: '#EA4335',
    maxProgress: 50,
    unit: 'reps',
    xp: 80,
    difficulty: 'Medium',
  },
  {
    id: 'd5',
    title: 'Protein Goal',
    description: 'Eat 150g protein',
    icon: 'target',
    color: '#34A853',
    maxProgress: 150,
    unit: 'g',
    xp: 60,
    difficulty: 'Easy',
  },
]

const WEEKLY_CHALLENGES = [
  {
    id: 'w1',
    title: 'Fast Track',
    description: 'Fast 5 days this week',
    icon: 'zap',
    color: '#8B5CF6',
    maxProgress: 5,
    unit: 'days',
    xp: 250,
    difficulty: 'Hard',
  },
  {
    id: 'w2',
    title: 'Gym Rat',
    description: 'Work out 4 times',
    icon: 'activity',
    color: COLORS.accent,
    maxProgress: 4,
    unit: 'sessions',
    xp: 200,
    difficulty: 'Medium',
  },
  {
    id: 'w3',
    title: 'Calorie Consistency',
    description: 'Hit calorie goal every day',
    icon: 'award',
    color: '#FBBC05',
    maxProgress: 7,
    unit: 'days',
    xp: 300,
    difficulty: 'Hard',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLevel(xp) {
  // Every 500 XP = 1 level, with increasing thresholds
  if (xp < 100) return { level: 1, currentLevelXp: 0, nextLevelXp: 100 }
  let level = 1
  let cumulative = 0
  let threshold = 100
  while (cumulative + threshold <= xp) {
    cumulative += threshold
    level++
    threshold = 100 + (level - 1) * 50
  }
  return {
    level,
    currentLevelXp: xp - cumulative,
    nextLevelXp: threshold,
  }
}

function getDifficultyColor(difficulty) {
  switch (difficulty) {
    case 'Easy':
      return '#34A853'
    case 'Medium':
      return '#FBBC05'
    case 'Hard':
      return '#EA4335'
    default:
      return '#94A3B8'
  }
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChallengesScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, card } = useTheme()
  const { member, gymId } = useAuth()

  const [progress, setProgress] = useState({})
  const [totalXp, setTotalXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const headerScale = useRef(new Animated.Value(0.95)).current
  const xpBarAnim = useRef(new Animated.Value(0)).current
  const checkAnims = useRef({})

  // Track which challenges just completed (for animation)
  const [justCompleted, setJustCompleted] = useState({})

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  const loadFromAsyncStorage = useCallback(async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    const streakData = await AsyncStorage.getItem(STREAK_KEY)

    if (stored) {
      const parsed = JSON.parse(stored)
      const todayKey = getTodayKey()

      // Reset daily challenges if from a different day
      if (parsed._date !== todayKey) {
        const weeklyOnly = {}
        WEEKLY_CHALLENGES.forEach((c) => {
          if (parsed[c.id] !== undefined) weeklyOnly[c.id] = parsed[c.id]
        })
        weeklyOnly._date = todayKey
        setProgress(weeklyOnly)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(weeklyOnly))
      } else {
        setProgress(parsed)
      }

      // Calculate XP from completed challenges
      const xp = calculateTotalXp(parsed._date === todayKey ? parsed : {})
      setTotalXp(xp)
      runEntranceAnimations(xp)
    } else {
      runEntranceAnimations(0)
    }

    if (streakData) {
      const streakParsed = JSON.parse(streakData)
      setStreak(streakParsed.count || 0)
    }
  }, [])

  const loadProgress = useCallback(async () => {
    try {
      // Try backend API first if authenticated
      if (gymId && member?.id) {
        try {
          const [challengesRes, todayRes, xpRes] = await Promise.all([
            api.get(`/gyms/${gymId}/challenges`),
            api.get(`/gyms/${gymId}/members/${member.id}/challenges/today`),
            api.get(`/gyms/${gymId}/members/${member.id}/xp`),
          ])

          // Build a lookup from local challenge definitions for icons, colors, etc.
          const localLookup = {}
          ;[...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].forEach((c) => {
            localLookup[c.id] = c
          })

          // Map backend today progress to local progress format
          const backendProgress = {}
          if (todayRes?.data?.challenges) {
            todayRes.data.challenges.forEach((cp) => {
              backendProgress[cp.challenge_id || cp.challengeId] = cp.progress || 0
            })
          } else if (todayRes?.data) {
            // Handle flat object format: { d1: 5, d2: 10, ... }
            Object.entries(todayRes.data).forEach(([key, val]) => {
              if (typeof val === 'number') backendProgress[key] = val
            })
          }

          const xp = xpRes?.data?.totalXp ?? xpRes?.data?.xp ?? 0
          const backendStreak = xpRes?.data?.streak ?? 0

          setProgress(backendProgress)
          setTotalXp(xp)
          setStreak(backendStreak)
          runEntranceAnimations(xp)
          return
        } catch (apiErr) {
          console.warn('ChallengesScreen: API fetch failed, falling back to AsyncStorage', apiErr)
        }
      }

      // Fallback to AsyncStorage
      await loadFromAsyncStorage()
    } catch (e) {
      console.warn('ChallengesScreen: load error', e)
      runEntranceAnimations(0)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, member?.id, loadFromAsyncStorage])

  function calculateTotalXp(prog) {
    let xp = 0
    const all = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES]
    all.forEach((c) => {
      if ((prog[c.id] || 0) >= c.maxProgress) {
        xp += c.xp
      }
    })
    return xp
  }

  const saveProgress = useCallback(
    async (newProgress, newXp, challengeId, increment) => {
      // Try backend API first
      if (gymId && member?.id && challengeId && increment) {
        try {
          await api.post(
            `/gyms/${gymId}/members/${member.id}/challenges/${challengeId}/progress`,
            { increment }
          )
          return // Backend handles streak/XP server-side
        } catch (apiErr) {
          console.warn('ChallengesScreen: API save failed, falling back to AsyncStorage', apiErr)
        }
      }

      // Fallback to AsyncStorage
      try {
        const data = { ...newProgress, _date: getTodayKey() }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))

        // Update streak
        const hasCompletion = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].some(
          (c) => (newProgress[c.id] || 0) >= c.maxProgress
        )
        if (hasCompletion) {
          const streakData = await AsyncStorage.getItem(STREAK_KEY)
          const parsed = streakData ? JSON.parse(streakData) : { count: 0, lastDate: null }
          const today = getTodayKey()
          if (parsed.lastDate !== today) {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayKey = yesterday.toISOString().split('T')[0]
            const newCount = parsed.lastDate === yesterdayKey ? parsed.count + 1 : 1
            const newStreakData = { count: newCount, lastDate: today }
            await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreakData))
            setStreak(newCount)
          }
        }
      } catch (e) {
        console.warn('ChallengesScreen: save error', e)
      }
    },
    [gymId, member?.id]
  )

  // -----------------------------------------------------------------------
  // Animations
  // -----------------------------------------------------------------------

  function runEntranceAnimations(xp) {
    fadeAnim.setValue(0)
    headerScale.setValue(0.95)
    xpBarAnim.setValue(0)

    const levelInfo = getLevel(xp)
    const xpProgress = levelInfo.nextLevelXp > 0 ? levelInfo.currentLevelXp / levelInfo.nextLevelXp : 0

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(xpBarAnim, {
        toValue: xpProgress,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start()
  }

  function runCheckAnimation(challengeId) {
    if (!checkAnims.current[challengeId]) {
      checkAnims.current[challengeId] = new Animated.Value(0)
    }
    const anim = checkAnims.current[challengeId]
    anim.setValue(0)
    Animated.sequence([
      Animated.spring(anim, {
        toValue: 1,
        friction: 3,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  function handleTapChallenge(challenge) {
    const current = progress[challenge.id] || 0
    if (current >= challenge.maxProgress) return // Already complete

    // Determine increment based on challenge type
    let increment = 1
    if (challenge.id === 'd3') increment = 1000 // steps
    if (challenge.id === 'd2') increment = 2 // fasting hours
    if (challenge.id === 'd4') increment = 10 // pushups
    if (challenge.id === 'd5') increment = 30 // protein grams

    const newVal = Math.min(current + increment, challenge.maxProgress)
    const newProgress = { ...progress, [challenge.id]: newVal }
    setProgress(newProgress)

    // Check if just completed
    if (newVal >= challenge.maxProgress && current < challenge.maxProgress) {
      const newXp = totalXp + challenge.xp
      setTotalXp(newXp)
      setJustCompleted((prev) => ({ ...prev, [challenge.id]: true }))
      runCheckAnimation(challenge.id)

      // Update XP bar animation
      const levelInfo = getLevel(newXp)
      const xpProgress = levelInfo.nextLevelXp > 0 ? levelInfo.currentLevelXp / levelInfo.nextLevelXp : 0
      Animated.timing(xpBarAnim, {
        toValue: xpProgress,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start()

      saveProgress(newProgress, newXp, challenge.id, increment)
    } else {
      saveProgress(newProgress, totalXp, challenge.id, increment)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setJustCompleted({})
    loadProgress()
  }, [loadProgress])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const levelInfo = getLevel(totalXp)

  function renderChallengeCard(challenge) {
    const current = progress[challenge.id] || 0
    const isComplete = current >= challenge.maxProgress
    const pct = Math.min(current / challenge.maxProgress, 1)
    const completed = justCompleted[challenge.id] || isComplete

    // Get or create check animation value
    if (!checkAnims.current[challenge.id]) {
      checkAnims.current[challenge.id] = new Animated.Value(isComplete ? 1 : 0)
    }
    const checkScale = checkAnims.current[challenge.id]

    return (
      <TouchableOpacity
        key={challenge.id}
        activeOpacity={isComplete ? 1 : 0.7}
        onPress={() => handleTapChallenge(challenge)}
        style={[
          styles.challengeCard,
          {
            backgroundColor: colors.bgSec,
            borderColor: isComplete ? challenge.color + '40' : colors.border,
            borderWidth: 1,
          },
          isComplete && {
            shadowColor: challenge.color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <View style={styles.challengeTop}>
          {/* Icon */}
          <View
            style={[
              styles.challengeIcon,
              {
                backgroundColor: challenge.color + '18',
              },
            ]}
          >
            {isComplete ? (
              <Animated.View
                style={{
                  transform: [{ scale: checkScale }],
                }}
              >
                <Feather name="check" size={20} color={challenge.color} />
              </Animated.View>
            ) : (
              <Feather name={challenge.icon} size={20} color={challenge.color} />
            )}
          </View>

          {/* Content */}
          <View style={styles.challengeContent}>
            <View style={styles.challengeTitleRow}>
              <Text
                style={[
                  styles.challengeTitle,
                  { color: colors.text },
                  isComplete && { textDecorationLine: 'line-through', opacity: 0.6 },
                ]}
                numberOfLines={1}
              >
                {challenge.title}
              </Text>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(challenge.difficulty) + '18' },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: getDifficultyColor(challenge.difficulty) },
                  ]}
                >
                  {challenge.difficulty}
                </Text>
              </View>
            </View>
            <Text style={[styles.challengeDesc, { color: colors.textSec }]} numberOfLines={1}>
              {challenge.description}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: colors.bgTer }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isComplete ? challenge.color : challenge.color + 'CC',
                  width: `${pct * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={[styles.progressText, { color: colors.textSec }]}>
              {challenge.id === 'd3'
                ? `${(current / 1000).toFixed(1)}k / ${(challenge.maxProgress / 1000).toFixed(0)}k`
                : `${current} / ${challenge.maxProgress}`}{' '}
              {challenge.unit}
            </Text>
            <View style={styles.xpBadge}>
              <Feather name="star" size={11} color="#FBBC05" />
              <Text style={styles.xpBadgeText}>{challenge.xp} XP</Text>
            </View>
          </View>
        </View>

        {/* Tap hint when not complete */}
        {!isComplete && (
          <View style={styles.tapHint}>
            <Feather name="plus-circle" size={13} color={colors.textTer} />
            <Text style={[styles.tapHintText, { color: colors.textTer }]}>Tap to log progress</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Challenges</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero: Level + XP + Streak */}
        <Animated.View
          style={[
            styles.heroCard,
            card,
            {
              opacity: fadeAnim,
              transform: [{ scale: headerScale }],
            },
          ]}
        >
          {/* Level Circle */}
          <View style={styles.heroTop}>
            <View style={[styles.levelCircle, { borderColor: COLORS.accent }]}>
              <Text style={styles.levelNumber}>{levelInfo.level}</Text>
              <Text style={[styles.levelLabel, { color: colors.textSec }]}>LVL</Text>
            </View>

            <View style={styles.heroStats}>
              {/* Total XP */}
              <View style={styles.heroStatRow}>
                <Feather name="star" size={16} color="#FBBC05" />
                <Text style={[styles.heroStatValue, { color: colors.text }]}>
                  {totalXp.toLocaleString()}
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSec }]}>Total XP</Text>
              </View>

              {/* Streak */}
              <View style={styles.heroStatRow}>
                <Feather name="zap" size={16} color="#F97316" />
                <Text style={[styles.heroStatValue, { color: colors.text }]}>{streak}</Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSec }]}>Day Streak</Text>
              </View>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={[styles.xpLabel, { color: colors.textSec }]}>
                Level {levelInfo.level}
              </Text>
              <Text style={[styles.xpLabel, { color: colors.textSec }]}>
                {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
              </Text>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: colors.bgTer }]}>
              <Animated.View
                style={[
                  styles.xpFill,
                  {
                    backgroundColor: COLORS.accent,
                    width: xpBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>

        {/* Streak Flame Banner */}
        {streak >= 3 && (
          <Animated.View style={[styles.streakBanner, { opacity: fadeAnim }]}>
            <View
              style={[
                styles.streakBannerInner,
                { backgroundColor: '#F97316' + '15', borderColor: '#F97316' + '30' },
              ]}
            >
              <Feather name="zap" size={18} color="#F97316" />
              <Text style={[styles.streakBannerText, { color: '#F97316' }]}>
                {streak} day streak! Keep it going!
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Daily Challenges */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Feather name="sun" size={18} color={COLORS.accent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Challenges</Text>
            <View style={[styles.countBadge, { backgroundColor: COLORS.accent + '18' }]}>
              <Text style={[styles.countBadgeText, { color: COLORS.accent }]}>
                {DAILY_CHALLENGES.filter((c) => (progress[c.id] || 0) >= c.maxProgress).length}/
                {DAILY_CHALLENGES.length}
              </Text>
            </View>
          </View>
          {DAILY_CHALLENGES.map(renderChallengeCard)}
        </Animated.View>

        {/* Weekly Challenges */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={18} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Challenges</Text>
            <View style={[styles.countBadge, { backgroundColor: '#8B5CF6' + '18' }]}>
              <Text style={[styles.countBadgeText, { color: '#8B5CF6' }]}>
                {WEEKLY_CHALLENGES.filter((c) => (progress[c.id] || 0) >= c.maxProgress).length}/
                {WEEKLY_CHALLENGES.length}
              </Text>
            </View>
          </View>
          {WEEKLY_CHALLENGES.map(renderChallengeCard)}
        </Animated.View>

        {/* XP Breakdown */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 0 }]}>
            XP Rewards
          </Text>
          <View
            style={[
              styles.xpBreakdownCard,
              { backgroundColor: colors.bgSec, borderColor: colors.border },
            ]}
          >
            {[...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].map((c) => {
              const done = (progress[c.id] || 0) >= c.maxProgress
              return (
                <View key={c.id} style={styles.xpBreakdownRow}>
                  <View style={styles.xpBreakdownLeft}>
                    {done ? (
                      <Feather name="check-circle" size={14} color={COLORS.green} />
                    ) : (
                      <Feather name="circle" size={14} color={colors.textTer} />
                    )}
                    <Text
                      style={[
                        styles.xpBreakdownName,
                        { color: done ? colors.textSec : colors.text },
                        done && { textDecorationLine: 'line-through' },
                      ]}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.xpBreakdownVal,
                      { color: done ? COLORS.green : '#FBBC05' },
                    ]}
                  >
                    {done ? '+' : ''}{c.xp} XP
                  </Text>
                </View>
              )
            })}
            <View style={[styles.xpBreakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.xpBreakdownRow}>
              <Text style={[styles.xpBreakdownTotal, { color: colors.text }]}>
                Total Possible
              </Text>
              <Text style={[styles.xpBreakdownTotal, { color: '#FBBC05' }]}>
                {[...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].reduce((s, c) => s + c.xp, 0)} XP
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  heroCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  levelCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  levelNumber: {
    fontFamily: FONT.numExtraBold,
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
  levelLabel: {
    fontFamily: FONT.numSemibold,
    fontSize: 10,
    marginTop: -2,
    letterSpacing: 1,
  },
  heroStats: {
    flex: 1,
    gap: 10,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroStatValue: {
    fontFamily: FONT.numBold,
    fontSize: 20,
  },
  heroStatLabel: {
    fontFamily: FONT.regular,
    fontSize: 13,
  },

  // XP Bar
  xpSection: {
    marginTop: SPACING.xs,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    fontFamily: FONT.numMedium,
    fontSize: 12,
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Streak Banner
  streakBanner: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  streakBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  streakBannerText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
  },

  // Section
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONT.semibold,
    fontSize: 17,
    flex: 1,
  },
  countBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontFamily: FONT.numSemibold,
    fontSize: 12,
  },

  // Challenge Card
  challengeCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  challengeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  challengeTitle: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  challengeDesc: {
    fontFamily: FONT.regular,
    fontSize: 13,
  },

  // Difficulty badge
  difficultyBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  difficultyText: {
    fontFamily: FONT.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Progress
  progressSection: {
    marginBottom: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: FONT.numMedium,
    fontSize: 12,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  xpBadgeText: {
    fontFamily: FONT.numSemibold,
    fontSize: 11,
    color: '#FBBC05',
  },

  // Tap hint
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 4,
  },
  tapHintText: {
    fontFamily: FONT.regular,
    fontSize: 11,
  },

  // XP Breakdown
  xpBreakdownCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  xpBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  xpBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  xpBreakdownName: {
    fontFamily: FONT.regular,
    fontSize: 13,
    flex: 1,
  },
  xpBreakdownVal: {
    fontFamily: FONT.numSemibold,
    fontSize: 13,
    marginLeft: 8,
  },
  xpBreakdownDivider: {
    height: 1,
    marginVertical: 6,
  },
  xpBreakdownTotal: {
    fontFamily: FONT.semibold,
    fontSize: 14,
  },
})
