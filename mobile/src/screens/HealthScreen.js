import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from '../components/PremiumAlert'
let Svg = null
let Circle = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
} catch (err) { if (__DEV__) console.warn('[Health] SVG load:', err?.message) }
let Pedometer = null
try {
  Pedometer = require('expo-sensors').Pedometer
} catch (err) { if (__DEV__) console.warn('[Health] Pedometer load:', err?.message) }
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS, FONT, METABOLIC, ELITE_CARD } from '../lib/theme'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import BodyStatsCard from '../components/BodyStatsCard'
// Default nutrition values when API data is unavailable
const DEFAULT_DAILY_NUTRITION = { items: [], totals: { calories: 0, protein: 0, carbs: 0, fats: 0 } }
const DEFAULT_NUTRITION_GOAL = { calorie_goal: 2000, protein_goal: 120, carb_goal: 250, fat_goal: 65 }
import {
  requestHealthPermissions,
  requestExtendedPermissions,
  getTodaySteps,
  syncStepsToBackend,
  getLatestHeartRate,
  getRestingHeartRate,
  getHRV,
  isWearableConnected,
} from '../lib/healthKit'
import { useHealth } from '../context/HealthContext'
import NutritionGoalSetup from '../components/NutritionGoalSetup'
import WaterTracker from '../components/WaterTracker'
import { getItem, setItem } from '../lib/storage'
import { getWeeklyInsight, getProgressiveInsights } from '../lib/aiCoach'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const RING_SIZE = 140
const STEP_GOAL_OPTIONS = [5000, 7500, 10000, 12500, 15000]
const DEFAULT_STEP_GOAL = 10000
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS = {
  breakfast: 'sunrise',
  lunch: 'sun',
  dinner: 'moon',
  snack: 'coffee',
}
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}
const COMMON_FOODS = [
  { name: '1 Scoop Whey Protein', calories: 120, protein: 24, carbs: 3, fats: 1 },
  { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  { name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fats: 1.8 },
  { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.4 },
  { name: 'Greek Yogurt (150g)', calories: 100, protein: 17, carbs: 6, fats: 0.7 },
  { name: 'Oats (40g)', calories: 154, protein: 5, carbs: 27, fats: 2.6 },
  { name: 'Egg (1 whole)', calories: 78, protein: 6, carbs: 0.6, fats: 5 },
  { name: 'Peanut Butter (2 tbsp)', calories: 188, protein: 8, carbs: 6, fats: 16 },
]

export default function HealthScreen({ navigation }) {
  const { member, gymId } = useAuth()
  const { colors, card, isDark } = useTheme()

  // Steps + HR from shared HealthContext (real-time sync across all screens)
  const {
    steps: contextSteps, stepSource: contextStepSource, stepGoal: contextStepGoal,
    stepMode: contextStepMode, setManualSteps: contextSetManualSteps,
    setStepMode: contextSetStepMode, setStepGoal: contextSetStepGoal,
    heartRate: contextHR, restingHR: contextRHR, hrv: contextHRV,
    wearableConnected: contextWearable, fetchSteps: contextFetchSteps,
  } = useHealth()

  const [steps, setSteps] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [daily, setDaily] = useState(null)
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [goalCelebrated, setGoalCelebrated] = useState(false)
  const [foodSearch, setFoodSearch] = useState('')
  const [foodModalVisible, setFoodModalVisible] = useState(false)
  const [goalSetupVisible, setGoalSetupVisible] = useState(false)
  const [hasCustomGoal, setHasCustomGoal] = useState(false)

  // Step data source tracking: 'health', 'pedometer', 'demo', or null
  const [stepSource, setStepSource] = useState(null)
  const healthSyncRef = useRef(null)
  const pedometerSubRef = useRef(null)

  // Dual-mode step tracking
  const [stepMode, setStepMode] = useState('auto') // 'auto' | 'manual'
  const [manualSteps, setManualSteps] = useState(0)
  const [manualStepInput, setManualStepInput] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef(null)

  const pulseAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const insightFadeAnim = useRef(new Animated.Value(0)).current
  const [weeklyInsight, setWeeklyInsight] = useState(null)
  const [showInsightDetail, setShowInsightDetail] = useState(false)

  // Step goal (configurable)
  const [stepGoal, setStepGoal] = useState(DEFAULT_STEP_GOAL)
  const [showStepGoalPicker, setShowStepGoalPicker] = useState(false)

  // Heart rate data (wearable)
  const [heartRate, setHeartRate] = useState(null)
  const [restingHR, setRestingHR] = useState(null)
  const [hrv, setHrv] = useState(null)
  const [hasWearable, setHasWearable] = useState(false)

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // Green glow when goal met — only trigger once when threshold crossed
  const goalMet = (stepMode === 'manual' ? manualSteps : steps) >= stepGoal
  useEffect(() => {
    if (goalMet) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      )
      glow.start()
      return () => glow.stop()
    }
  }, [goalMet])

  // Animate step progress
  const animSteps = stepMode === 'manual' ? manualSteps : steps
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(animSteps / stepGoal, 1),
      duration: 1000,
      useNativeDriver: false,
    }).start()
  }, [animSteps, progressAnim])

  // Goal celebration haptic
  useEffect(() => {
    if (animSteps >= stepGoal && !goalCelebrated) {
      setGoalCelebrated(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
  }, [animSteps, goalCelebrated])

  // Fetch progressive AI insights — adapts to user's data maturity
  useEffect(() => {
    let cancelled = false
    const profileData = member ? {
      name: member.name,
      weight: member.weight,
      height: member.height,
      goal: member.fitness_goal || member.goal,
      interests: member.interests,
    } : null

    // Calculate data age from member's created_at or joined date
    let dataAge = 0
    if (member?.created_at || member?.joined_at) {
      const joinDate = new Date(member.created_at || member.joined_at)
      const now = new Date()
      dataAge = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24))
    }

    // Gather today's data from screen state
    const dailyData = {
      steps: steps || 0,
      calories: daily?.totals?.calories || 0,
      protein: daily?.totals?.protein || 0,
      sleep: 0, // Will be populated if sleep data is available
      workouts: 0,
      stepGoal: stepGoal || DEFAULT_STEP_GOAL,
    }

    getProgressiveInsights({ profile: profileData, dailyData, weeklyData: null, dataAge }).then(data => {
      if (!cancelled) {
        setWeeklyInsight(data)
        Animated.timing(insightFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }
    }).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    return () => { cancelled = true }
  }, [insightFadeAnim, member, steps, daily, stepGoal])

  // Check if user has a custom nutrition goal
  useEffect(() => {
    getItem('ivira_nutrition_profile').then(v => { if (v) setHasCustomGoal(true) }).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    getItem('ivira_custom_nutrition_goal').then(stored => {
      if (stored) {
        try { setGoal(JSON.parse(stored)) } catch (err) { if (__DEV__) console.warn('[Health] parse goal:', err?.message) }
      }
    }).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
  }, [])

  // Load step goal from storage
  useEffect(() => {
    getItem('ivira_step_goal').then(val => {
      if (val) {
        const num = parseInt(val, 10)
        if (STEP_GOAL_OPTIONS.includes(num)) setStepGoal(num)
      }
    }).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
  }, [])

  // Heart rate data — bridged from HealthContext (avoids duplicate API calls)
  useEffect(() => {
    if (contextHR) setHeartRate(contextHR)
    if (contextRHR) setRestingHR(contextRHR)
    if (contextHRV) setHrv(contextHRV)
    setHasWearable(contextWearable)
  }, [contextHR, contextRHR, contextHRV, contextWearable])

  // Load saved step mode + manual steps from storage
  useEffect(() => {
    const todayKey = `ivira_manual_steps_${new Date().toISOString().split('T')[0]}`
    getItem('ivira_step_mode').then(mode => {
      if (mode === 'manual') setStepMode('manual')
    }).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    getItem(todayKey).then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val)
          setManualSteps(parsed.steps || 0)
          // Don't auto-restore timer — only starts when user explicitly starts a workout
        } catch (err) { if (__DEV__) console.warn('[Health] parse manual steps:', err?.message) }
      }
    }).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
  }, [])

  // Persist manual steps whenever they change
  useEffect(() => {
    if (stepMode === 'manual') {
      const todayKey = `ivira_manual_steps_${new Date().toISOString().split('T')[0]}`
      setItem(todayKey, JSON.stringify({ steps: manualSteps, timerSeconds })).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    }
  }, [manualSteps, timerSeconds, stepMode])

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerRunning])

  // Switch mode handler
  const handleModeSwitch = useCallback(async (mode) => {
    setStepMode(mode)
    await setItem('ivira_step_mode', mode).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (mode === 'manual') {
      // Stop auto-sync when switching to manual
      if (healthSyncRef.current) { clearInterval(healthSyncRef.current); healthSyncRef.current = null }
    } else {
      // Switching back to auto — stop timer, refresh from health API
      setTimerRunning(false)
      try {
        const granted = await requestHealthPermissions()
        if (granted) {
          const result = await getTodaySteps()
          const stepCount = typeof result === 'object' ? result.steps : result
          const source = typeof result === 'object' ? result.source : null
          setSteps(stepCount)
          setLastSynced(new Date())
          if (source) {
            setStepSource('health')
          }
          if (gymId && member?.id) {
            syncStepsToBackend(gymId, member.id, stepCount)
          }
        }
      } catch (err) { if (__DEV__) console.warn('[Health] step tracking:', err?.message) }
    }
  }, [gymId, member?.id])

  const handleManualStepAdjust = useCallback((delta) => {
    setManualSteps(prev => Math.max(0, prev + delta))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const handleManualStepSubmit = useCallback(() => {
    const val = parseInt(manualStepInput, 10)
    if (!isNaN(val) && val >= 0) {
      setManualSteps(prev => prev + val)
      setManualStepInput('')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  }, [manualStepInput])

  const handleTimerToggle = useCallback(() => {
    setTimerRunning(prev => !prev)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }, [])

  const handleStepGoalChange = useCallback(async (newGoal) => {
    setStepGoal(newGoal)
    setShowStepGoalPicker(false)
    setGoalCelebrated(false) // Reset celebration for new goal
    await setItem('ivira_step_goal', String(newGoal)).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Step tracking — bridged from shared HealthContext for real-time sync
  // HealthContext handles all native health API polling, pedometer fallback, and backend sync.
  // Local `steps` state is kept in sync with context for backward compatibility.
  useEffect(() => {
    if (stepMode === 'auto') {
      setSteps(contextSteps)
      setStepSource(contextStepSource)
      if (contextStepSource) setLastSynced(new Date())
    }
  }, [contextSteps, contextStepSource, stepMode])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Refresh data when screen comes back into focus (e.g. after barcode scanner)
  // Don't set loading=true on refocus to avoid flicker
  const hasMounted = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (hasMounted.current) {
        loadData(false) // silent refresh — no loading spinner
      }
      hasMounted.current = true
    }, [])
  )

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      // Load nutrition (steps are handled by the step tracking useEffect)
      const today = new Date().toISOString().split('T')[0]
      const [dailyRes, goalRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/daily?date=${today}`),
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/goal`),
      ])
      setDaily(dailyRes.data)
      setGoal(goalRes.data)
    } catch (err) {
      if (__DEV__) console.warn('[Health] loadData:', err?.message)
      setDaily(DEFAULT_DAILY_NUTRITION)
      setGoal(DEFAULT_NUTRITION_GOAL)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const granted = await requestHealthPermissions()
      if (granted) {
        const result = await getTodaySteps()
        const stepCount = typeof result === 'object' ? result.steps : result
        const source = typeof result === 'object' ? result.source : null
        setSteps(stepCount)
        setLastSynced(new Date())
        if (source) {
          setStepSource('health')
        }
        if (gymId && member?.id) {
          syncStepsToBackend(gymId, member.id, stepCount)
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } catch (err) {
      if (__DEV__) console.warn('[Health] sync:', err?.message)
      premiumAlert('Sync Failed', 'Could not sync health data. Please try again.')
    } finally {
      setSyncing(false)
    }
  }, [gymId, member?.id])

  const handleGoalSave = useCallback(async (macroGoal) => {
    setGoal(macroGoal)
    setHasCustomGoal(true)
    await setItem('ivira_custom_nutrition_goal', JSON.stringify(macroGoal)).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    // Sync to backend if available
    if (gymId && member?.id) {
      api.patch(`/gyms/${gymId}/members/${member.id}/nutrition/goal`, macroGoal).catch(err => { if (__DEV__) console.warn('[Health]', err?.message) })
    }
  }, [gymId, member?.id])

  const handleNavigateNutrition = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation?.navigate?.('Nutrition')
  }, [navigation])

  const handleMealSlot = useCallback((mealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation?.navigate?.('Nutrition', { mealType })
  }, [navigation])

  // Only show full-screen spinner on first load (no data yet)
  if (loading && !daily && !goal) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const totals = daily?.totals || { calories: 0, protein: 0, carbs: 0, fats: 0 }
  const rawGoal = goal || DEFAULT_NUTRITION_GOAL
  const goals = {
    calorie_goal: rawGoal.calorie_goal ?? rawGoal.calories ?? 2000,
    protein_goal: rawGoal.protein_goal ?? rawGoal.protein ?? 120,
    carb_goal: rawGoal.carb_goal ?? rawGoal.carbs ?? 250,
    fat_goal: rawGoal.fat_goal ?? rawGoal.fats ?? 65,
  }
  const caloriesRemaining = Math.max(goals.calorie_goal - totals.calories, 0)
  const effectiveSteps = stepMode === 'manual' ? manualSteps : steps
  const stepProgress = Math.min(effectiveSteps / stepGoal, 1)
  const isGoalMet = effectiveSteps >= stepGoal
  const activeMinutes = Math.floor(timerSeconds / 60)

  const macros = [
    { label: 'Protein', value: totals.protein, goal: goals.protein_goal, color: COLORS.accent, unit: 'g' },
    { label: 'Carbs', value: totals.carbs, goal: goals.carb_goal, color: COLORS.cyan, unit: 'g' },
    { label: 'Fats', value: totals.fats, goal: goals.fat_goal, color: COLORS.amber, unit: 'g' },
  ]

  // Determine which meals have been logged
  const loggedMeals = {}
  if (daily?.meals) {
    daily.meals.forEach((meal) => {
      loggedMeals[meal.meal_type] = meal
    })
  }

  const formatSyncTime = (date) => {
    if (!date) return contextStepSource === 'unavailable' ? 'No sensor available' : 'Waiting...'
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    return `${diffHr}h ago`
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Wellness hero accent */}
      <View style={[styles.heroAccent, { backgroundColor: '#0a0e1a' }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors?.bgTer || '#1A2236' }]} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              try {
                await Promise.all([
                  loadData(false),
                  contextFetchSteps?.(),
                ])
              } catch (err) { if (__DEV__) console.warn('[Health] refresh:', err?.message) }
              setRefreshing(false)
            }}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Health</Text>
          <TouchableOpacity
            style={[styles.syncBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.7}
          >
            {syncing ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Feather name="refresh-cw" size={18} color={colors.textSec} />
            )}
          </TouchableOpacity>
        </View>

        {/* AI Insights Card */}
        {weeklyInsight && (
          <Animated.View style={[
            styles.aiInsightCard,
            card,
            { borderLeftColor: colors.accent, borderLeftWidth: 3, opacity: insightFadeAnim },
          ]}>
            <View style={styles.aiInsightHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <Feather name="zap" size={16} color={colors.accent} />
                <Text style={[styles.aiInsightTitle, { color: colors.text }]}>AI Insights</Text>
              </View>
              <Text style={[styles.aiInsightSubtitle, { color: colors.textSec }]}>{weeklyInsight?.weekLabel || 'This Week'}</Text>
            </View>
            <View style={styles.aiInsightList}>
              {weeklyInsight.items.map((item, i) => (
                <View key={i} style={styles.aiInsightRow}>
                  <View style={[
                    styles.aiInsightDot,
                    { backgroundColor: item.status === 'good' ? colors.green : item.status === 'neutral' ? colors.amber : colors.red },
                  ]} />
                  <Text style={[styles.aiInsightText, { color: colors.textSec }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.aiInsightLink}
              onPress={() => setShowInsightDetail(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.aiInsightLinkText, { color: colors.accent }]}>View Details</Text>
              <Feather name="arrow-right" size={14} color={colors.accent} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Section A - Step Mode Toggle + Dual Ring Layout */}
        <View style={styles.modeToggleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text style={[styles.movementTitle, { color: colors.text }]}>Today's Movement</Text>
            {stepSource === 'health' && stepMode === 'auto' && (
              <View style={styles.stepSourceBadge}>
                <Feather name="activity" size={10} color={COLORS.green} />
                <Text style={[styles.stepSourceText, { color: COLORS.green }]}>Live</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.stepGoalBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '30' }]}
              onPress={() => setShowStepGoalPicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="target" size={10} color={colors.accent} />
              <Text style={[styles.stepGoalBadgeText, { color: colors.accent }]}>
                {stepGoal >= 1000 ? `${(stepGoal / 1000)}k` : stepGoal}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.segmentedControl, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                stepMode === 'auto' && [styles.segmentBtnActive, { backgroundColor: colors.accent }],
              ]}
              onPress={() => handleModeSwitch('auto')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.segmentText,
                { color: stepMode === 'auto' ? '#FFFFFF' : colors.textSec },
                stepMode === 'auto' && styles.segmentTextActive,
              ]}>Auto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                stepMode === 'manual' && [styles.segmentBtnActive, { backgroundColor: colors.accent }],
              ]}
              onPress={() => handleModeSwitch('manual')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.segmentText,
                { color: stepMode === 'manual' ? '#FFFFFF' : colors.textSec },
                stepMode === 'manual' && styles.segmentTextActive,
              ]}>Manual</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stepSection}>
          <StepRing
            progress={stepProgress}
            steps={effectiveSteps}
            stepGoal={stepGoal}
            isGoalMet={isGoalMet}
            pulseAnim={pulseAnim}
            glowAnim={glowAnim}
            colors={colors}
          />
          <CalorieRing caloriesRemaining={caloriesRemaining} calorieGoal={goals.calorie_goal} />
        </View>

        {/* Auto Mode — Sync Row */}
        {stepMode === 'auto' && (
          <View style={styles.syncRow}>
            <Text style={[styles.syncText, { color: colors.textTer }]}>
              Last synced: {formatSyncTime(lastSynced)}
            </Text>
            <TouchableOpacity
              style={[styles.syncHealthBtn, { backgroundColor: colors.accentSoft }, syncing && styles.btnDisabled]}
              onPress={handleSync}
              disabled={syncing}
              activeOpacity={0.7}
            >
              <Feather name="activity" size={16} color={COLORS.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={styles.syncHealthBtnText}>
                {syncing ? 'Syncing...' : 'Sync Health Data'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Mode — Timer + Step Entry */}
        {stepMode === 'manual' && (
          <View style={[styles.manualPanel, card, { borderColor: colors.border }]}>
            {/* Active Timer */}
            <View style={styles.timerBlock}>
              <Text style={[styles.timerLabel, { color: colors.textSec }]}>ACTIVE TIME</Text>
              <Text style={[
                styles.timerDisplay,
                { color: timerRunning ? METABOLIC.activity : colors.text },
              ]}>
                {formatTimer(timerSeconds)}
              </Text>
              <Text style={[styles.timerMinutes, { color: colors.textTer }]}>
                {activeMinutes} min active
              </Text>
              <TouchableOpacity
                style={[
                  styles.timerBtn,
                  {
                    backgroundColor: timerRunning ? COLORS.red : colors.accent,
                    shadowColor: timerRunning ? COLORS.red : colors.accent,
                  },
                ]}
                onPress={handleTimerToggle}
                activeOpacity={0.7}
              >
                <Feather
                  name={timerRunning ? 'square' : 'play'}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: SPACING.sm }}
                />
                <Text style={styles.timerBtnText}>
                  {timerRunning ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={[styles.manualDivider, { backgroundColor: colors.border }]} />

            {/* Manual Step Entry */}
            <View style={styles.manualStepBlock}>
              <Text style={[styles.timerLabel, { color: colors.textSec }]}>STEP COUNT</Text>
              <View style={styles.manualStepRow}>
                <TouchableOpacity
                  style={[styles.stepAdjustBtn, { backgroundColor: colors.bgTer, borderColor: colors.border }]}
                  onPress={() => handleManualStepAdjust(-100)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepAdjustText, { color: colors.text }]}>-100</Text>
                </TouchableOpacity>
                <Text style={[styles.manualStepCount, { color: colors.text }]}>
                  {manualSteps.toLocaleString()}
                </Text>
                <TouchableOpacity
                  style={[styles.stepAdjustBtn, { backgroundColor: colors.bgTer, borderColor: colors.border }]}
                  onPress={() => handleManualStepAdjust(100)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepAdjustText, { color: colors.text }]}>+100</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={[styles.manualInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgTer }]}
                  placeholder="Add steps"
                  placeholderTextColor={colors.textTer}
                  keyboardType="number-pad"
                  value={manualStepInput}
                  onChangeText={setManualStepInput}
                  onSubmitEditing={handleManualStepSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.manualAddBtn, { backgroundColor: colors.accent }]}
                  onPress={handleManualStepSubmit}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Body Stats */}
        <BodyStatsCard
          weightKg={parseFloat(member?.weight) || 0}
          heightCm={parseFloat(member?.height) || 0}
          age={member?.date_of_birth ? Math.floor((Date.now() - new Date(member.date_of_birth).getTime()) / 31557600000) : 25}
          gender={member?.gender === 'female' ? 'female' : 'male'}
          activityLevel={member?.activity_level || 'moderate'}
          goal={member?.fitness_goal === 'weight_loss' ? 'cut' : member?.fitness_goal === 'muscle_gain' ? 'bulk' : 'maintain'}
          onEditPress={() => navigation?.navigate?.('Profile')}
        />

        {/* Heart Rate Section */}
        <View style={[styles.heartSection, card, { borderTopColor: '#EA4335', borderTopWidth: 3 }]}>
          <View style={styles.heartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Feather name="heart" size={16} color="#EA4335" />
              <Text style={[styles.heartTitle, { color: colors.text }]}>Heart</Text>
            </View>
            {hasWearable && (
              <View style={styles.stepSourceBadge}>
                <Feather name="watch" size={10} color={COLORS.green} />
                <Text style={[styles.stepSourceText, { color: COLORS.green }]}>Synced</Text>
              </View>
            )}
          </View>
          <View style={styles.heartCards}>
            {[
              { icon: 'heart', color: '#EA4335', value: heartRate ? `${heartRate.bpm}` : '--', unit: 'bpm', label: 'Current HR' },
              { icon: 'activity', color: '#F59E0B', value: restingHR ? `${restingHR.bpm}` : '--', unit: 'bpm', label: 'Resting HR' },
              { icon: 'trending-up', color: '#8B5CF6', value: hrv ? `${hrv.ms}` : '--', unit: 'ms', label: 'HRV' },
            ].map(item => (
              <View key={item.label} style={[styles.heartCard, { backgroundColor: colors.bgTer }]}>
                <View style={[styles.heartIconWrap, { backgroundColor: item.color + (isDark ? '1A' : '20') }]}>
                  <Feather name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[styles.heartValue, { color: colors.text }]}>{item.value}</Text>
                <Text style={[styles.heartUnit, { color: colors.textTer }]}>{item.unit}</Text>
                <Text style={[styles.heartLabel, { color: colors.textSec }]}>{item.label}</Text>
              </View>
            ))}
          </View>
          {/* Wearable data auto-detected — no connect prompt needed */}
        </View>

        {/* Steps & Activity Dashboard Link */}
        <TouchableOpacity
          style={[styles.activityDashLink, card]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            navigation?.navigate?.('ActivityDashboard')
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.activityDashIcon, { backgroundColor: COLORS.accentSoft }]}>
            <Feather name="bar-chart-2" size={20} color={COLORS.accent} />
          </View>
          <View style={styles.activityDashTextWrap}>
            <Text style={[styles.activityDashTitle, { color: colors.text }]}>
              Steps & Activity
            </Text>
            <Text style={[styles.activityDashDesc, { color: colors.textSec }]}>
              Weekly overview, goals & detailed tracking
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textTer} />
        </TouchableOpacity>

        {/* Quick Links Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.md }}>
          {[
            { label: 'Scan Food', icon: 'camera', color: '#EA4335', screen: 'FoodScanner' },
            { label: 'Recipes', icon: 'book-open', color: '#34A853', screen: 'Recipes' },
            { label: 'Challenges', icon: 'zap', color: '#8B5CF6', screen: 'Challenges' },
            { label: 'Sleep', icon: 'moon', color: '#6366F1', screen: 'SleepTracker' },
            { label: 'Badges', icon: 'star', color: '#F59E0B', screen: 'Achievements' },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[{ backgroundColor: colors.bgSec, borderRadius: RADIUS.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                navigation?.navigate?.(item.screen)
              }}
              activeOpacity={0.7}
            >
              <Feather name={item.icon} size={14} color={item.color} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section B - Nutrition Summary */}
        <View style={styles.nutritionSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition</Text>
            <TouchableOpacity
              style={[styles.goalSetupBtn, { backgroundColor: hasCustomGoal ? colors.bgTer : colors.accentSoft }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setGoalSetupVisible(true)
              }}
              activeOpacity={0.7}
            >
              <Feather
                name={hasCustomGoal ? 'edit-2' : 'sliders'}
                size={14}
                color={hasCustomGoal ? colors.textSec : COLORS.accent}
              />
              <Text style={[
                styles.goalSetupText,
                { color: hasCustomGoal ? colors.textSec : COLORS.accent },
              ]}>
                {hasCustomGoal ? 'Edit Goal' : 'Set Goal'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Prompt card when no custom goal */}
          {!hasCustomGoal && (
            <TouchableOpacity
              style={[styles.goalPromptCard, card]}
              onPress={() => setGoalSetupVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.goalPromptIcon, { backgroundColor: colors.accentSoft }]}>
                <Feather name="target" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.goalPromptTextWrap}>
                <Text style={[styles.goalPromptTitle, { color: colors.text }]}>
                  Set your nutrition goal
                </Text>
                <Text style={[styles.goalPromptDesc, { color: colors.textSec }]}>
                  Get personalized macros based on your body stats and fitness goal
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textTer} />
            </TouchableOpacity>
          )}

          {/* Macro Bars */}
          <View style={[styles.macroSection, card]}>
            {macros.map((macro) => (
              <MacroBar key={macro.label} {...macro} />
            ))}
          </View>

          {/* View Full Nutrition */}
          <TouchableOpacity
            style={styles.viewNutritionBtn}
            onPress={handleNavigateNutrition}
            activeOpacity={0.7}
          >
            <Text style={styles.viewNutritionText}>View Full Nutrition</Text>
            <Feather name="arrow-right" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Food Search Input */}
        <View style={[styles.foodSearchContainer, card]}>
          <TextInput
            style={[styles.foodSearchInput, { color: colors.text }]}
            placeholder="Search for food or scan barcode..."
            placeholderTextColor={colors.textTer}
            value={foodSearch}
            onChangeText={(text) => {
              setFoodSearch(text)
              if (text.length > 0) setFoodModalVisible(true)
              else setFoodModalVisible(false)
            }}
          />
          <TouchableOpacity
            style={styles.barcodeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              navigation?.navigate?.('BarcodeScanner')
            }}
            activeOpacity={0.7}
          >
            <Feather name="camera" size={20} color={colors.textSec} />
          </TouchableOpacity>
        </View>

        {/* Food Database Modal */}
        <Modal
          visible={foodModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setFoodModalVisible(false)
            setFoodSearch('')
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setFoodModalVisible(false)
              setFoodSearch('')
            }}
          >
            <View style={[styles.foodModalContent, { backgroundColor: colors.bgSec }]}>
              <View style={[styles.foodModalSearchRow, { borderBottomColor: colors.border }]}>
                <TextInput
                  style={[styles.foodModalInput, { color: colors.text }]}
                  placeholder="Search for food or scan barcode..."
                  placeholderTextColor={colors.textTer}
                  value={foodSearch}
                  onChangeText={(text) => {
                    setFoodSearch(text)
                    if (text.length === 0) setFoodModalVisible(false)
                  }}
                  autoFocus
                />
              </View>
              <FlatList
                data={COMMON_FOODS.filter((f) =>
                  f.name.toLowerCase().includes(foodSearch.toLowerCase())
                )}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.foodResultItem, { borderBottomColor: colors.border }]}
                    onPress={async () => {
                      setFoodModalVisible(false)
                      setFoodSearch('')
                      try {
                        const today = new Date().toISOString().split('T')[0]
                        await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
                          mealType: 'snack',
                          rawInput: item.name,
                          items: [{ name: item.name, qty: 1, unit: 'serving', calories: item.calories, protein: item.protein, carbs: item.carbs, fats: item.fats }],
                          source: 'manual',
                        })
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        loadData()
                      } catch (err) {
                        premiumAlert('Failed to save', 'Please try again.')
                        loadData()
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.foodResultName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={styles.foodResultCal}>{item.calories} kcal</Text>
                    <View style={styles.foodResultMacros}>
                      <Text style={[styles.foodResultMacroText, { color: colors.textTer }]}>P: {item.protein}g</Text>
                      <Text style={[styles.foodResultMacroText, { color: colors.textTer }]}>C: {item.carbs}g</Text>
                      <Text style={[styles.foodResultMacroText, { color: colors.textTer }]}>F: {item.fats}g</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[styles.foodResultEmpty, { color: colors.textTer }]}>No results found</Text>
                }
                style={styles.foodResultList}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Water Tracking */}
        <WaterTracker style={{ marginHorizontal: 4, marginBottom: 12 }} />


        <View style={{ height: SPACING.xxl + SPACING.xl }} />
      </ScrollView>

      {/* Nutrition Goal Setup Modal */}
      <NutritionGoalSetup
        visible={goalSetupVisible}
        onClose={() => setGoalSetupVisible(false)}
        onSave={handleGoalSave}
        memberWeight={member?.weight_kg}
        memberHeight={member?.height_cm}
      />

      {/* Step Goal Picker Modal */}
      <Modal visible={showStepGoalPicker} transparent animationType="fade" onRequestClose={() => setShowStepGoalPicker(false)}>
        <TouchableOpacity style={styles.insightModalOverlay} activeOpacity={1} onPress={() => setShowStepGoalPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.insightModalSheet, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.insightModalTitle, { color: colors.text, textAlign: 'center', marginBottom: SPACING.sm }]}>Daily Step Goal</Text>
            <Text style={{ color: colors.textTer, textAlign: 'center', fontSize: 13, fontFamily: FONT.regular, marginBottom: SPACING.lg }}>
              Choose your daily target
            </Text>
            <View style={{ gap: SPACING.sm }}>
              {STEP_GOAL_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.stepGoalOption,
                    { backgroundColor: colors.bgTer, borderColor: stepGoal === opt ? colors.accent : colors.border },
                    stepGoal === opt && { borderWidth: 2 },
                  ]}
                  onPress={() => handleStepGoalChange(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepGoalOptionText, { color: stepGoal === opt ? colors.accent : colors.text }]}>
                    {opt.toLocaleString()} steps
                  </Text>
                  <Text style={[styles.stepGoalOptionHint, { color: colors.textTer }]}>
                    {opt <= 5000 ? 'Light' : opt <= 7500 ? 'Moderate' : opt <= 10000 ? 'Active' : opt <= 12500 ? 'Very Active' : 'Athlete'}
                  </Text>
                  {stepGoal === opt && <Feather name="check" size={18} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* AI Insights Detail Modal */}
      <Modal visible={showInsightDetail} transparent animationType="fade" onRequestClose={() => setShowInsightDetail(false)}>
        <TouchableOpacity style={styles.insightModalOverlay} activeOpacity={1} onPress={() => setShowInsightDetail(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.insightModalSheet, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <View style={styles.insightModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Feather name="zap" size={16} color={colors.accent} />
                </View>
                <Text style={[styles.insightModalTitle, { color: colors.text }]}>AI Insights</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInsightDetail(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={20} color={colors.textSec} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.insightModalSubtitle, { color: colors.textTer }]}>
              Weekly health summary based on your activity
            </Text>

            {weeklyInsight?.items?.map((item, i) => {
              const statusColor = item.status === 'good' ? COLORS.green : item.status === 'neutral' ? COLORS.amber : COLORS.red
              const statusIcon = item.status === 'good' ? 'check-circle' : item.status === 'neutral' ? 'alert-circle' : 'alert-triangle'
              return (
                <View key={i} style={[styles.insightDetailRow, { borderBottomColor: colors.border, borderBottomWidth: i < weeklyInsight.items.length - 1 ? 1 : 0 }]}>
                  <View style={[styles.insightDetailIcon, { backgroundColor: statusColor + '15' }]}>
                    <Feather name={statusIcon} size={16} color={statusColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightDetailText, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.insightDetailHint, { color: colors.textTer }]}>
                      {item.status === 'good' ? 'Great progress!' : item.status === 'neutral' ? 'Room for improvement' : 'Needs attention'}
                    </Text>
                  </View>
                </View>
              )
            })}

            {/* Quick recommendations */}
            <View style={[styles.insightRecsBox, { backgroundColor: colors.accent + '08', borderColor: colors.accent + '20' }]}>
              <Text style={[styles.insightRecsTitle, { color: colors.accent }]}>Recommendations</Text>
              {[
                { icon: 'target', text: 'Aim for 10,000+ steps daily this week' },
                { icon: 'clock', text: 'Log meals consistently to improve tracking' },
                { icon: 'moon', text: 'Prioritize 7-8 hours of quality sleep' },
              ].map((rec, i) => (
                <View key={i} style={styles.insightRecRow}>
                  <Feather name={rec.icon} size={13} color={colors.accent} />
                  <Text style={[styles.insightRecText, { color: colors.textSec }]}>{rec.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.insightModalCloseBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowInsightDetail(false)}
            >
              <Text style={styles.insightModalCloseBtnText}>Got It</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// --- Step Ring Component ---
function StepRing({ progress, steps, stepGoal, isGoalMet, pulseAnim, glowAnim, colors }) {
  const themeColors = colors || COLORS
  const strokeWidth = 10
  const center = RING_SIZE / 2
  const radius = (RING_SIZE - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)
  const ringColor = isGoalMet ? COLORS.green : METABOLIC.steps

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isGoalMet ? 1.03 : 1.01],
  })

  const glowOpacity = isGoalMet
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] })
    : 0

  return (
    <Animated.View style={[styles.ringContainer, { transform: [{ scale: pulseScale }] }]}>
      {isGoalMet && (
        <Animated.View
          style={[
            styles.ringGlow,
            {
              width: RING_SIZE + 24,
              height: RING_SIZE + 24,
              borderRadius: (RING_SIZE + 24) / 2,
              opacity: glowOpacity,
            },
          ]}
        />
      )}
      {Svg && Circle ? (
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={themeColors.border || 'rgba(255,255,255,0.1)'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      ) : (
      <View style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: strokeWidth, borderColor: ringColor, justifyContent: 'center', alignItems: 'center' }} />
      )}
      {/* Center content */}
      <View style={styles.ringCenter}>
        <Text style={[styles.stepCount, { color: isGoalMet ? COLORS.green : themeColors.text }]}>
          {steps.toLocaleString()}
        </Text>
        <Text style={[styles.stepLabel, { color: themeColors.textSec }]}>steps</Text>
        <Text style={[styles.ringGoalText, { color: themeColors.textTer }]}>of {stepGoal >= 1000 ? `${(stepGoal / 1000)}k` : stepGoal}</Text>
        {isGoalMet && (
          <View style={styles.goalBadge}>
            <Feather name="check-circle" size={12} color={COLORS.green} />
            <Text style={styles.goalBadgeText}>Goal Met!</Text>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

// --- Calorie Ring Component ---
function CalorieRing({ caloriesRemaining, calorieGoal }) {
  const { colors } = useTheme()
  const strokeWidth = 10
  const center = RING_SIZE / 2
  const radius = (RING_SIZE - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min((calorieGoal - caloriesRemaining) / calorieGoal, 1)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View style={styles.ringContainer}>
      {Svg && Circle ? (
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      ) : (
      <View style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: strokeWidth, borderColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' }} />
      )}
      <View style={styles.ringCenter}>
        <Text style={[styles.calorieRingCount, { color: colors.text }]}>{caloriesRemaining >= 1000 ? `${(caloriesRemaining/1000).toFixed(1)}k` : caloriesRemaining}</Text>
        <Text style={[styles.calorieRingLabel, { color: colors.textSec }]}>kcal left</Text>
        <Text style={[styles.ringGoalText, { color: colors.textTer }]}>of {calorieGoal >= 1000 ? `${(calorieGoal/1000).toFixed(0)}k` : calorieGoal}</Text>
      </View>
    </View>
  )
}

// --- Macro Bar Component ---
function MacroBar({ label, value, goal: macroGoal, color, unit }) {
  const { colors } = useTheme()
  const progress = Math.min(value / macroGoal, 1)
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={[styles.macroLabel, { color: colors.textSec }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.text }]}>
          {value}{unit} <Text style={[styles.macroGoalText, { color: colors.textTer }]}>/ {macroGoal}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.bgTer }]}>
        <View style={[styles.macroFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 0,
  },
  heroAccentImage: {},
  heroAccentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.55)',
  },
  heroAccentOverlayLight: {
    backgroundColor: 'rgba(247,245,242,0.45)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: 128,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  syncBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSec,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Step Section
  stepSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  stepSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stepSourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncRow: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  syncText: {
    fontSize: 12,
    color: COLORS.textTer,
    marginBottom: SPACING.md,
  },
  syncHealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent,
    minHeight: 48,
  },
  syncHealthBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Ring
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(52,168,83,0.15)',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 24,
    fontFamily: FONT.numBlack,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  ringGoalText: {
    fontSize: 9,
    fontFamily: FONT.regular,
    color: '#64748B',
    marginTop: 1,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },

  // Activity Dashboard Link
  activityDashLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  activityDashIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDashTextWrap: {
    flex: 1,
    gap: 2,
  },
  activityDashTitle: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  activityDashDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // Nutrition Section
  nutritionSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  goalSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  goalSetupText: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalPromptCard: {
    ...ELITE_CARD,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  goalPromptIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPromptTextWrap: {
    flex: 1,
  },
  goalPromptTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  goalPromptDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Macro Bars
  macroSection: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  macroRow: {
    gap: SPACING.sm,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSec,
    flex: 1,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  macroGoalText: {
    fontWeight: '400',
    color: COLORS.textTer,
  },
  macroTrack: {
    height: 6,
    backgroundColor: COLORS.bgTer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: 6,
    borderRadius: 3,
  },

  // View Nutrition Button
  viewNutritionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 48,
  },
  viewNutritionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Meal Section
  mealSection: {
    marginBottom: SPACING.lg,
  },
  mealGrid: {
    gap: SPACING.sm,
  },
  mealSlot: {
    ...ELITE_CARD,
    padding: SPACING.md,
    minHeight: 80,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgTer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  mealIconLogged: {
    backgroundColor: 'rgba(52,168,83,0.12)',
  },
  mealSlotLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealLoggedInfo: {
    paddingLeft: SPACING.xxl + SPACING.sm,
  },
  mealLoggedCal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  mealLoggedMacros: {
    fontSize: 12,
    color: COLORS.textTer,
  },
  mealAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.xxl + SPACING.sm,
    gap: SPACING.xs,
    minHeight: 24,
  },
  mealAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Calorie Ring
  calorieRingCount: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: FONT.numBold,
    color: COLORS.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  calorieRingLabel: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: '#94A3B8',
    marginTop: 1,
  },

  // Food Search
  foodSearchContainer: {
    ...ELITE_CARD,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  foodSearchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: COLORS.text,
  },
  barcodeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Food Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: SPACING.lg,
  },
  foodModalContent: {
    ...ELITE_CARD,
    maxHeight: 420,
    overflow: 'hidden',
  },
  foodModalSearchRow: {
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  foodModalInput: {
    height: 48,
    fontSize: 14,
    color: COLORS.text,
  },
  foodResultList: {
    paddingVertical: SPACING.xs,
  },
  foodResultItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  foodResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  foodResultCal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  foodResultMacros: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  foodResultMacroText: {
    fontSize: 12,
    color: COLORS.textTer,
  },
  foodResultEmpty: {
    fontSize: 14,
    color: COLORS.textTer,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },

  // Mode Toggle
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  movementTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    fontWeight: '700',
    color: COLORS.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgTer,
    padding: 3,
  },
  segmentBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    fontWeight: '600',
    color: COLORS.textSec,
  },
  segmentTextActive: {
    fontWeight: '700',
    fontFamily: FONT.bold,
  },

  // Manual Panel
  manualPanel: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  timerBlock: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  timerLabel: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textSec,
    marginBottom: SPACING.sm,
  },
  timerDisplay: {
    fontSize: 44,
    fontFamily: FONT.mono,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  timerMinutes: {
    fontSize: 13,
    fontFamily: FONT.numMedium,
    color: COLORS.textTer,
    marginBottom: SPACING.md,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    minHeight: 48,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  timerBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  manualDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  manualStepBlock: {
    alignItems: 'center',
  },
  manualStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  stepAdjustBtn: {
    width: 60,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepAdjustText: {
    fontSize: 14,
    fontFamily: FONT.numBold,
    fontWeight: '700',
  },
  manualStepCount: {
    fontSize: 36,
    fontFamily: FONT.numBlack,
    fontWeight: '900',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    minWidth: 100,
    textAlign: 'center',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    maxWidth: 240,
  },
  manualInput: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    fontFamily: FONT.numSemibold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  manualAddBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // AI Insights Card
  aiInsightCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 2,
  },
  aiInsightTitle: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    fontWeight: '600',
  },
  aiInsightSubtitle: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },
  aiInsightList: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm + 2,
  },
  aiInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aiInsightDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  aiInsightText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    flex: 1,
  },
  aiInsightLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  aiInsightLinkText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    fontWeight: '500',
  },

  // AI Insights Detail Modal
  insightModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightModalSheet: {
    width: SCREEN_WIDTH - 40,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    maxHeight: '80%',
  },
  insightModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  insightModalTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    fontWeight: '600',
  },
  insightModalSubtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginBottom: SPACING.lg,
  },
  insightDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  insightDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightDetailText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    fontWeight: '500',
    lineHeight: 20,
  },
  insightDetailHint: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  insightRecsBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  insightRecsTitle: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  insightRecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 5,
  },
  insightRecText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    flex: 1,
  },
  insightModalCloseBtn: {
    marginTop: SPACING.lg,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  insightModalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONT.semibold,
    fontWeight: '600',
  },

  // Step Goal Badge + Picker
  stepGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  stepGoalBadgeText: {
    fontSize: 11,
    fontFamily: FONT.numSemibold,
    fontWeight: '600',
  },
  stepGoalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  stepGoalOptionText: {
    fontSize: 16,
    fontFamily: FONT.numSemibold,
    fontWeight: '600',
    flex: 1,
  },
  stepGoalOptionHint: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // Heart Rate Section
  heartSection: {
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heartTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    fontWeight: '600',
  },
  heartCards: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  heartCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 2,
  },
  heartIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heartValue: {
    fontSize: 22,
    fontFamily: FONT.numBold,
    fontWeight: '800',
    marginTop: 4,
  },
  heartUnit: {
    fontSize: 10,
    fontFamily: FONT.numMedium,
    marginTop: -2,
  },
  heartLabel: {
    fontSize: 10,
    fontFamily: FONT.medium,
    fontWeight: '500',
    marginTop: 2,
  },
  wearableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  wearableBannerText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    flex: 1,
    lineHeight: 17,
  },
})
