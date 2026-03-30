import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Image,
  RefreshControl,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Haptics from '../lib/haptics'
import { premiumAlert } from '../components/PremiumAlert'

// react-native-svg — fallback if native module not linked
let Svg = null
let Circle = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
} catch {}
// Safe native module loading — all optional, all guarded
const MotiView = View  // Removed moti dependency to prevent reanimated native crashes

let QRCode = null
if (Platform.OS !== 'web') {
  try { QRCode = require('react-native-qrcode-svg').default } catch {}
}

// NFC for tap-and-go check-in — defer loading to avoid native crash on init
let NfcManager = null
let NfcTech = null
let _nfcLoaded = false
function loadNfc() {
  if (_nfcLoaded) return
  _nfcLoaded = true
  try {
    const nfc = require('react-native-nfc-manager')
    NfcManager = nfc.default
    NfcTech = nfc.NfcTech
  } catch {}
}

// Pedometer for step tracking — fallback if health APIs unavailable
let Pedometer = null
try {
  Pedometer = require('expo-sensors').Pedometer
} catch {}

import { useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, ELITE_GLOW, GLASS_CARD, ACTION_CARDS } from '../lib/theme'
import { generateNonce, formatDate } from '../lib/utils'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getItem } from '../lib/storage'
import { useTheme } from '../context/ThemeContext'
// demo data imports removed — real API data used instead
import FastingTimer from '../components/FastingTimer'
// AdBanner removed from HomeScreen — kills premium feel
let showInterstitialAd = () => {}
try { showInterstitialAd = require('../components/AdBanner').showInterstitialAd } catch {}
import { canAddToWallet, addMembershipToWallet } from '../lib/wallet'
import { syncSleepToBackend } from '../lib/healthKit'
import { useHealth } from '../context/HealthContext'
import { requestAllPermissions } from '../lib/permissions'
// DailyQuote removed
// LiveGymIndicator, ProfileCompletionBar, ContinueWorkoutCard, WeeklyWellnessReport, ChurnRiskAlert removed from HomeScreen
// ProfileCompletionBar → Profile screen, WeeklyWellnessReport → Health screen, WorkoutHeatMap → Activity dashboard
import DashboardSummary from '../components/DashboardSummary'
// MorningBriefing, PostWorkoutRecovery removed from HomeScreen — cluttered layout
import HydrationTracker from '../components/HydrationTracker'
// WorkoutHeatMap moved to Activity dashboard
// BodyCompositionTimeline, AccountabilityBuddy, NutritionInsights moved to Health tab
// FeaturedExercises removed — wger data kept in WorkoutTracker only

import { getDailyInsight, getRecoveryTip, getWorkoutSuggestion, setCoachRegion } from '../lib/aiCoach'
import { recordWorkout } from '../lib/SmartNotificationEngine'

const REFRESH_INTERVAL = 30 // seconds
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const QR_SIZE = SCREEN_WIDTH * 0.55

// Mini calorie ring constants
const MINI_RING_SIZE = 80
const MINI_STROKE = 5
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2
const MINI_CIRCUMFERENCE = 2 * Math.PI * MINI_RADIUS

// Step counter ring constants
const STEP_RING_SIZE = 120
const STEP_STROKE = 8
const STEP_RADIUS = (STEP_RING_SIZE - STEP_STROKE) / 2
const STEP_CIRCUMFERENCE = 2 * Math.PI * STEP_RADIUS
const STEP_GOAL = 10000
// DEMO_STEPS and DEMO_CLASSES removed — real API data used instead

// Movement tips removed — consolidated into MorningBriefing and DashboardSummary

export default function HomeScreen({ navigation, route }) {
  const { member, gymId, gymInfo, gym, refreshProfile } = useAuth()
  const { colors, isDark, card } = useTheme()

  const [qrData, setQrData] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [qrModalVisible, setQrModalVisible] = useState(false)
  const [nfcAvailable, setNfcAvailable] = useState(false)
  const [badges, setBadges] = useState([])
  const [dailyGoalStatus, setDailyGoalStatus] = useState({ checkedIn: false, workedOut: false, loggedMeal: false })
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false)
  const [quickLogVisible, setQuickLogVisible] = useState(false)

  // Class booking state
  const [classes, setClasses] = useState([])
  const [classSpots, setClassSpots] = useState({})
  const [bookedClasses, setBookedClasses] = useState({})
  const [classDetailModal, setClassDetailModal] = useState(null)
  const [bookingClassId, setBookingClassId] = useState(null)

  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState(null)

  // Nutrition state
  const [nutritionTotals, setNutritionTotals] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 })
  const [nutritionGoal, setNutritionGoal] = useState({ calories: 2000, protein: 120, carbs: 250, fats: 65 })

  // Health data from shared context (real-time sync across all screens)
  const { steps: stepCount, stepSource, activeMinutes, sleepData, sleepSource, fetchSleep, fetchSteps, refreshAll } = useHealth()
  const [activeSeconds, setActiveSeconds] = useState(0)
  const lastMilestoneRef = useRef(0)
  const healthSyncRef = useRef(null)

  // Sleep modal state
  const [sleepLogModalVisible, setSleepLogModalVisible] = useState(false)
  const [manualSleepForm, setManualSleepForm] = useState({ bedHour: '23', bedMin: '00', wakeHour: '06', wakeMin: '30', quality: 4 })

  // Wallet state
  const [walletAvailable, setWalletAvailable] = useState(false)
  const [addingToWallet, setAddingToWallet] = useState(false)

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false)

  // AI Workout suggestion state
  const [aiWorkout, setAiWorkout] = useState(null)
  const [aiWorkoutLoading, setAiWorkoutLoading] = useState(true)
  const [aiWorkoutDismissed, setAiWorkoutDismissed] = useState(false)
  const aiCardAnim = useRef(new Animated.Value(0)).current

  // Vira AI insight state
  const [aiInsight, setAiInsight] = useState('')
  const [aiInsightDisplayed, setAiInsightDisplayed] = useState('')
  const [recoveryTip, setRecoveryTip] = useState(null)
  const aiInsightFade = useRef(new Animated.Value(0)).current
  const aiBadgeGlow = useRef(new Animated.Value(0.6)).current

  const breatheAnim = useRef(new Animated.Value(1)).current
  const countdownRef = useRef(null)
  const modalSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current

  // Load profile photo
  useEffect(() => {
    if (member?.photo_url) {
      setProfilePhoto(member.photo_url)
    } else {
      getItem('ivira_profile_photo').then(uri => { if (uri) setProfilePhoto(uri) }).catch(err => console.warn('[HomeScreen]', err?.message))
    }
  }, [member?.photo_url])

  // Listen for nutrition logged from barcode scanner — update Today's Fuel instantly
  useEffect(() => {
    if (route?.params?.nutritionLogged) {
      const item = route.params.nutritionLogged
      navigation?.setParams?.({ nutritionLogged: null })
      setNutritionTotals(prev => ({
        calories: (prev?.calories || 0) + (item.calories || 0),
        protein: (prev?.protein || 0) + (item.protein || 0),
        carbs: (prev?.carbs || 0) + (item.carbs || 0),
        fats: (prev?.fats || 0) + (item.fats || 0),
      }))
      setDailyGoalStatus(prev => ({ ...prev, loggedMeal: true }))
    }
  }, [route?.params?.nutritionLogged])

  // Listen for NFC-first check-in trigger from center FAB
  useEffect(() => {
    if (route?.params?.openNFC) {
      navigation?.setParams?.({ openNFC: false })
      // Try NFC first, fall back to QR modal
      if (Platform.OS !== 'web') {
        loadNfc()
        setNfcAvailable(!!NfcManager)
        if (NfcManager) {
          handleNfcCheckIn()
          return
        }
      }
      // NFC unavailable — open QR modal instead
      openQRModal()
    }
    if (route?.params?.openQR) {
      openQRModal()
      navigation?.setParams?.({ openQR: false })
    }
  }, [route?.params?.openNFC, route?.params?.openQR])

  // Fetch badges
  useEffect(() => {
    if (!gymId || !member?.id) return
    api.get(`/gyms/${gymId}/members/${member.id}/badges`)
      .then(res => {
        if (res.data?.length) setBadges(res.data)
      })
      .catch(err => console.warn('[HomeScreen]', err?.message))
  }, [gymId, member?.id])

  // Request all device permissions on first load + check wallet
  useEffect(() => {
    requestAllPermissions().catch(err => console.warn('[HomeScreen]', err?.message))
    canAddToWallet().then(setWalletAvailable).catch(err => console.warn('[HomeScreen]', err?.message))
  }, [])

  // Step tracking is now handled by HealthContext (shared across all screens)
  // The old per-screen polling has been removed to prevent duplicate fetches
  // and ensure step count is always in sync.

  // Legacy cleanup (remove old step tracking refs)
  useEffect(() => {
    // No-op — step tracking moved to HealthContext
    return () => {
      if (healthSyncRef.current) clearInterval(healthSyncRef.current)
    }
  }, [])

  // Active time — derived from HealthContext activeMinutes
  useEffect(() => {
    setActiveSeconds(activeMinutes * 60)
  }, [activeMinutes])

  // Sleep data now comes from HealthContext (shared across all screens)
  // No per-screen fetch needed — HealthContext handles Health Connect + engine fallback

  // Fetch AI workout suggestion
  const fetchAiWorkout = useCallback(async () => {
    setAiWorkoutLoading(true)
    try {
      const suggestion = await getWorkoutSuggestion({
        memberId: member?.id,
        name: member?.name,
        gymId,
      })
      setAiWorkout(suggestion)
      setAiWorkoutDismissed(false)
      // Animate card entrance
      aiCardAnim.setValue(0)
      Animated.spring(aiCardAnim, {
        toValue: 1,
        damping: 16,
        stiffness: 120,
        useNativeDriver: true,
      }).start()
    } catch {
      setAiWorkout(null)
    } finally {
      setAiWorkoutLoading(false)
    }
  }, [member?.id, gymId])

  useEffect(() => {
    fetchAiWorkout()
  }, [fetchAiWorkout])

  // Fetch daily goal status + nutrition — extracted so it can be called on focus
  const fetchNutrition = useCallback(() => {
    if (!gymId || !member?.id) {
      setDailyGoalStatus({ checkedIn: true, workedOut: false, loggedMeal: false })
      return
    }
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      api.get(`/gyms/${gymId}/members/${member.id}/health/workouts/daily?date=${today}`).catch(() => ({ data: [] })),
      api.get(`/gyms/${gymId}/members/${member.id}/nutrition/daily?date=${today}`).catch(() => ({ data: { meals: [] } })),
      api.get(`/gyms/${gymId}/members/${member.id}/nutrition/goal`).catch(() => ({ data: null })),
    ]).then(([workoutRes, nutritionRes, goalRes]) => {
      const workouts = workoutRes.data?.workouts || workoutRes.data || []
      const meals = nutritionRes.data?.meals || []
      setDailyGoalStatus({
        checkedIn: true,
        workedOut: Array.isArray(workouts) && workouts.length > 0,
        loggedMeal: meals.length > 0,
      })
      if (nutritionRes.data?.totals) {
        setNutritionTotals(nutritionRes.data.totals)
      }
      if (goalRes.data) {
        setNutritionGoal(goalRes.data)
      }
    })
  }, [gymId, member?.id])

  // Refetch nutrition every time screen regains focus (e.g., after barcode scan)
  useFocusEffect(
    useCallback(() => {
      fetchNutrition()
    }, [fetchNutrition])
  )

  // Initial fetch
  useEffect(() => {
    fetchNutrition()
  }, [gymId, member?.id])

  // Fetch today's classes from API
  useEffect(() => {
    if (!gymId) return
    api.get(`/gyms/${gymId}/classes`)
      .then(res => {
        const raw = res.data
        const data = Array.isArray(raw) ? raw : Array.isArray(raw?.classes) ? raw.classes : []
        setClasses(data)
        const map = {}
        data.forEach(cls => { map[cls.id] = cls.spots })
        setClassSpots(map)
      })
      .catch(err => console.warn('[HomeScreen]', err?.message))
  }, [gymId])

  // --- QR generation ---
  // Request a signed JWT token from backend for kiosk scanning
  const generateQR = useCallback(async () => {
    if (!gymId || !member?.id || !member?.phone) return
    try {
      const res = await api.post(`/gyms/${gymId}/qr/generate`, {
        phone: member.phone,
      })
      const { token: qrToken } = res.data
      setQrData(qrToken)
      setCountdown(REFRESH_INTERVAL)
    } catch {
      // Fallback — generate local QR data if backend unreachable
      const nonce = generateNonce()
      const timestamp = Date.now()
      setQrData(JSON.stringify({ gymId, memberId: member.id, nonce, timestamp }))
      setCountdown(REFRESH_INTERVAL)
    }
  }, [gymId, member?.id, member?.phone])

  useEffect(() => {
    generateQR()
    const qrInterval = setInterval(generateQR, REFRESH_INTERVAL * 1000)
    return () => clearInterval(qrInterval)
  }, [generateQR])

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1))
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.02,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [breatheAnim])

  useEffect(() => {
    if (qrModalVisible) {
      Animated.spring(modalSlide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start()
    } else {
      modalSlide.setValue(SCREEN_WIDTH)
    }
  }, [qrModalVisible])

  // NFC tap-and-go check-in
  // Flow: Member taps phone on gym's NFC kiosk → phone reads kiosk tag UID →
  //       app sends tag_uid + member JWT → backend verifies + checks in
  const nfcInitialized = useRef(false)
  const [nfcScanning, setNfcScanning] = useState(false)
  const handleNfcCheckIn = useCallback(async () => {
    loadNfc()
    if (!NfcManager || Platform.OS === 'web') {
      premiumAlert('NFC Unavailable', 'NFC is not supported on this device.')
      return
    }
    try {
      // Initialize NFC on first use only
      if (!nfcInitialized.current) {
        await NfcManager.start()
        const isSupported = await NfcManager.isSupported()
        if (!isSupported) {
          premiumAlert('NFC Unavailable', 'This device does not support NFC.')
          return
        }
        nfcInitialized.current = true
      }

      setNfcScanning(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Read the NFC kiosk tag
      await NfcManager.requestTechnology(NfcTech.Ndef)
      const tag = await NfcManager.getTag()

      if (!tag) {
        premiumAlert('NFC Read Failed', 'Hold your phone closer to the NFC tag and try again.')
        return
      }

      // Extract kiosk tag UID — this proves physical presence at the gym
      const tagUid = tag.id || tag.ndefMessage?.[0]?.payload?.toString() || ''

      if (!tagUid) {
        premiumAlert('Invalid Tag', 'Could not read NFC tag. Try again.')
        return
      }

      if (gymId) {
        // Send tag_uid (kiosk identity) — member identity comes from JWT
        const startMs = Date.now()
        const res = await api.post(`/gyms/${gymId}/checkins/nfc`, { tag_uid: tagUid })
        const elapsed = Date.now() - startMs

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setQrModalVisible(false)

        const memberName = res.data?.checkin?.member_name || member?.name || ''
        premiumAlert(
          'Checked In!',
          `${memberName} — NFC check-in complete (${elapsed}ms)`,
        )

        // Show interstitial ad after check-in (natural transition)
        setTimeout(() => showInterstitialAd(), 1500)

        // Record workout pattern for smart notifications
        recordWorkout().catch(err => console.warn('[HomeScreen]', err?.message))

        // Refresh profile to update check-in count
        refreshProfile?.()
      }
    } catch (err) {
      if (err.message === 'cancelled') return
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'NFC check-in failed'
      premiumAlert('Check-in Failed', msg)
    } finally {
      setNfcScanning(false)
      NfcManager?.cancelTechnologyRequest?.().catch(err => console.warn('[HomeScreen]', err?.message))
    }
  }, [gymId, member?.name])

  // GPS proximity check-in — member taps button when near the gym
  const [gpsChecking, setGpsChecking] = useState(false)
  const handleGpsCheckin = useCallback(async () => {
    if (!gymId) {
      premiumAlert('No Gym', 'You need to be connected to a gym to check in.')
      return
    }
    setGpsChecking(true)
    try {
      let Location
      try { Location = require('expo-location') } catch {}
      if (!Location) {
        premiumAlert('Location Unavailable', 'Location services are not available on this device.')
        return
      }
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        premiumAlert('Permission Denied', 'Location permission is required for GPS check-in.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const res = await api.post(`/gyms/${gymId}/checkins/gps`, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setQrModalVisible(false)
      const name = res.data?.checkin?.member_name || member?.name || ''
      const dist = res.data?.checkin?.distance_meters || 0
      premiumAlert('Checked In!', `${name} — GPS check-in (${dist}m from gym)`)
      setTimeout(() => showInterstitialAd(), 1500)
      recordWorkout().catch(err => console.warn('[HomeScreen]', err?.message))
      refreshProfile?.()
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'GPS check-in failed'
      premiumAlert('Check-in Failed', msg)
    } finally {
      setGpsChecking(false)
    }
  }, [gymId, member?.name])

  const openQRModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    generateQR()
    // Eagerly load NFC so the button renders in the modal
    if (Platform.OS !== 'web') {
      loadNfc()
      setNfcAvailable(!!NfcManager)
    }
    setQrModalVisible(true)
  }

  // --- Membership calculations ---
  const membership = member?.membership || member?.active_membership || member
  const expiryDate = (membership?.end_date || membership?.membership_end)
    ? new Date(membership.end_date || membership.membership_end)
    : null
  const daysRemaining = expiryDate
    ? Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)))
    : 0
  const isActive = (membership?.status === 'active' || member?.status === 'active') && daysRemaining > 0

  const progress = countdown / REFRESH_INTERVAL
  const checkinCount = member?.checkin_count || member?.total_checkins || member?.monthly_checkins || 0
  const streak = member?.streak || 0

  // --- Vira AI insight (region set from gym city, not device locale) ---
  useEffect(() => {
    setCoachRegion(gymInfo?.city)
    const insight = getDailyInsight(
      { name: member?.name, streak, checkin_count: checkinCount },
      { daysUntilExpiry: daysRemaining, recentCheckins: checkinCount },
    )
    setAiInsight(insight)

    // Recovery tip based on last workout (demo fallback)
    const lastWorkout = member?.last_workout || (dailyGoalStatus.workedOut ? { name: 'Full Body', duration_min: 45 } : null)
    setRecoveryTip(getRecoveryTip(lastWorkout))

    // Typing animation — reveal text letter by letter
    setAiInsightDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i += 1
      if (i <= insight.length) {
        setAiInsightDisplayed(insight.slice(0, i))
      } else {
        clearInterval(timer)
      }
    }, 22)

    // Fade in the badge
    Animated.timing(aiInsightFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()

    // Glow pulse on badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(aiBadgeGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(aiBadgeGlow, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
      ])
    ).start()

    return () => clearInterval(timer)
  }, [member?.name, streak, checkinCount, daysRemaining])

  // --- Milestone celebration ---
  useEffect(() => {
    const milestones = [7, 14, 30, 50, 100, 200, 365]
    if (streak > 0 && milestones.includes(streak) && lastMilestoneRef.current !== streak) {
      lastMilestoneRef.current = streak
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const messages = {
        7: 'One full week! You\'re building a habit.',
        14: 'Two weeks strong! Consistency is key.',
        30: 'A whole month! You\'re in the top 10%.',
        50: '50 days! You\'re unstoppable.',
        100: '100 days! Legendary dedication.',
        200: '200 days! Elite athlete status.',
        365: 'One full year! Absolute champion.',
      }
      setTimeout(() => {
        premiumAlert(
          `${streak}-Day Streak!`,
          messages[streak] || `${streak} days of consistency!`,
          [{ text: 'Keep Going!', style: 'default' }],
        )
      }, 1000)
    }
  }, [streak])

  // --- Hydration state ---
  const [waterGlasses, setWaterGlasses] = useState(0)

  // --- Nutrition calculations ---
  const caloriesConsumed = nutritionTotals?.calories || 0
  const calorieGoal = nutritionGoal?.calorie_goal || 2000
  const caloriesRemaining = Math.max(0, calorieGoal - caloriesConsumed)
  const calProgress = Math.min(caloriesConsumed / calorieGoal, 1)
  const calStrokeDashoffset = MINI_CIRCUMFERENCE * (1 - calProgress)

  const macros = [
    { label: 'Protein', value: nutritionTotals?.protein || 0, goal: nutritionGoal?.protein_goal || 120, color: COLORS.cyan },
    { label: 'Carbs', value: nutritionTotals?.carbs || 0, goal: nutritionGoal?.carb_goal || 250, color: COLORS.amber },
    { label: 'Fat', value: nutritionTotals?.fats || 0, goal: nutritionGoal?.fat_goal || 65, color: COLORS.red },
  ]

  // --- Daily goals ---
  const dailyGoals = [
    { label: 'Check In', done: dailyGoalStatus.checkedIn, icon: 'check-circle' },
    { label: 'Workout', done: dailyGoalStatus.workedOut, icon: 'activity', onPress: () => setWorkoutModalVisible(true) },
    { label: 'Log Meal', done: dailyGoalStatus.loggedMeal, icon: 'coffee', onPress: () => navigation?.navigate?.('Health', { screen: 'Nutrition' }) },
  ]

  // --- Class booking handler ---
  const handleBookClass = useCallback(async (cls) => {
    if (bookedClasses[cls.id]) return
    setBookingClassId(cls.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await api.post(`/gyms/${gymId}/bookings`, { service_id: cls.id })
      setBookedClasses(prev => ({ ...prev, [cls.id]: true }))
      setClassSpots(prev => ({ ...prev, [cls.id]: Math.max(0, (prev[cls.id] ?? cls.spots) - 1) }))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      premiumAlert('Reserved!', `You're booked for ${cls.name} at ${cls.time}.`)
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      premiumAlert('Booking failed', err?.response?.data?.message || 'Please try again.')
    } finally {
      setBookingClassId(null)
    }
  }, [bookedClasses, gymId])

  // --- CRED-style grouped action sections with hero images ---
  const actionSections = [
    {
      title: 'QUICK ACTIONS',
      items: [
        { label: 'Workouts', icon: 'activity', bg: '#F97316', onPress: () => navigation?.navigate?.('WorkoutTracker') },
        { label: 'Scan Food', icon: 'camera', bg: '#EA4335', onPress: () => navigation?.navigate?.('FoodScanner') },
        { label: 'Classes', icon: 'calendar', bg: '#3B82F6', onPress: () => navigation?.navigate?.('Community', { screen: 'CommunityMain', params: { tab: 'community' } }) },
        { label: 'Sleep', icon: 'moon', bg: '#6366F1', onPress: () => navigation?.navigate?.('SleepTracker') },
      ],
    },
    {
      title: 'DISCOVER',
      items: [
        { label: 'Trainers', icon: 'users', bg: '#34D399', onPress: () => navigation?.navigate?.('Community', { screen: 'CommunityMain', params: { tab: 'marketplace' } }) },
        { label: 'Challenges', icon: 'target', bg: '#8B5CF6', onPress: () => navigation?.navigate?.('Challenges') },
        { label: 'Recipes', icon: 'book-open', bg: '#14B8A6', onPress: () => navigation?.navigate?.('Recipes') },
        { label: 'Yoga', icon: 'sunrise', bg: '#EC4899', onPress: () => navigation?.navigate?.('Yoga') },
      ],
    },
    {
      title: 'TRACK',
      items: [
        { label: 'Score', icon: 'award', bg: '#3B82F6', onPress: () => navigation?.navigate?.('FitnessScore') },
        { label: 'Achievements', icon: 'star', bg: '#F59E0B', onPress: () => navigation?.navigate?.('Achievements') },
        { label: 'Leaderboard', icon: 'bar-chart-2', bg: '#06B6D4', onPress: () => navigation?.navigate?.('CityLeaderboard') },
        { label: 'Find Gyms', icon: 'map-pin', bg: '#EF4444', onPress: () => navigation?.navigate?.('GymDiscovery') },
        ...(gymId ? [{ label: 'Revenue', icon: 'dollar-sign', bg: '#34D399', onPress: () => navigation?.navigate?.('RevenueDashboard') }] : []),
      ],
    },
  ]

  const formatActiveTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0')
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Sticky Header — 3-column: Logo | Streak Pill | Profile */}
      <View style={[styles.stickyHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {/* Left: IVIRA Logo — VIRA Emphasis */}
        <View style={styles.headerLeft}>
          <Text style={[styles.headerLogo, { color: colors.accent, opacity: 0.45 }]}>I</Text>
          <Text style={[styles.headerLogo, { color: colors.accent }]}>VIRA</Text>
        </View>

        {/* Center: Streak Pill */}
        {streak > 0 ? (
          <View style={styles.streakPill}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakPillText}>{streak} Day Streak</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.streakPillEmpty, { borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setQrModalVisible(true)
            }}
          >
            <Feather name="activity" size={13} color={colors.textTer} />
            <Text style={[styles.streakPillEmptyText, { color: colors.textTer }]}>Start your journey</Text>
          </TouchableOpacity>
        )}

        {/* Right: Profile Avatar */}
        <TouchableOpacity
          style={[
            styles.headerProfileWrap,
            { backgroundColor: colors.bgTer, borderColor: colors.borderStrong },
            streak > 0 && styles.headerProfileGlow,
          ]}
          activeOpacity={0.7}
          onPress={() => navigation?.navigate?.('Profile')}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={{ width: 33, height: 33, borderRadius: 16.5 }} />
          ) : (
            <Text style={[styles.headerProfileInitial, { color: colors.text }]}>
              {(member?.name || 'M').charAt(0).toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              try {
                await Promise.all([
                  fetchNutrition(),
                  fetchAiWorkout(),
                  fetchSleep?.(),
                  fetchSteps?.(),
                ])
              } catch {}
              setRefreshing(false)
            }}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* Vira AI Greeting */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 140, delay: 100 }}
        >
          <View style={styles.welcomeSection}>
            {/* AI Badge */}
            <Animated.View style={[styles.aiBadge, { opacity: aiBadgeGlow }]}>
              <Feather name="activity" size={11} color={colors.accent} />
              <Text style={[styles.aiBadgeText, { color: colors.accent }]}>Vira AI</Text>
            </Animated.View>

            {/* Personalized insight with typing animation */}
            <Animated.Text
              style={[styles.aiInsightText, { color: colors.text, opacity: aiInsightFade }]}
              numberOfLines={3}
            >
              {aiInsightDisplayed}
            </Animated.Text>

            {/* Recovery tip — shown if available and they worked out recently */}
            {recoveryTip && recoveryTip.icon !== 'activity' && (
              <Animated.View style={[styles.recoveryTipRow, { opacity: aiInsightFade }]}>
                <Feather
                  name={recoveryTip.icon === 'moon' ? 'moon' : recoveryTip.icon === 'droplet' ? 'droplet' : recoveryTip.icon === 'clock' ? 'clock' : recoveryTip.icon === 'wind' ? 'wind' : recoveryTip.icon === 'trending-up' ? 'trending-up' : 'heart'}
                  size={13}
                  color={colors.textSec}
                />
                <Text style={[styles.recoveryTipText, { color: colors.textSec }]}>{recoveryTip.tip}</Text>
              </Animated.View>
            )}
          </View>
        </MotiView>

        {/* Dashboard Summary — consolidated daily snapshot */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 140, delay: 200 }}
        >
        <DashboardSummary
          sleepData={sleepData}
          stepCount={stepCount}
          stepGoal={STEP_GOAL}
          caloriesConsumed={caloriesConsumed}
          calorieGoal={calorieGoal}
          workoutsDone={dailyGoalStatus.workedOut ? 1 : 0}
          waterGlasses={waterGlasses}
          waterGoal={8}
          fastingHours={0}
          streak={streak}
          onPressSleep={() => navigation?.navigate?.('SleepTracker')}
          onPressSteps={() => navigation?.navigate?.('ActivityDashboard')}
          onPressNutrition={() => navigation?.navigate?.('NutritionLog')}
          onPressWorkout={() => navigation?.navigate?.('WorkoutTracker')}
          onPressWater={() => {}}
          onPressFasting={() => {}}
        />
        </MotiView>

        {/* Feature Highlights — discoverable key features */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 140, delay: 250 }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featureHighlightsRow}
          >
            {[
              {
                title: 'Scan Food',
                desc: 'Scan any barcode to log nutrition instantly',
                icon: 'maximize',
                color: '#F97316',
                onPress: () => navigation?.navigate?.('FoodScanner'),
              },
              {
                title: 'Track Sleep',
                desc: 'Detailed sleep analysis with smart alarm',
                icon: 'moon',
                color: '#8B5CF6',
                onPress: () => navigation?.navigate?.('SleepTracker'),
              },
              {
                title: 'Count Steps',
                desc: 'Auto step counting all day',
                icon: 'activity',
                color: '#10B981',
                onPress: () => navigation?.navigate?.('ActivityDashboard'),
              },
              {
                title: 'Log Water',
                desc: 'Stay hydrated with reminders',
                icon: 'droplet',
                color: '#3B82F6',
                onPress: () => setWaterGlasses(prev => (prev || 0) + 1),
              },
            ].map((feature) => (
              <TouchableOpacity
                key={feature.title}
                style={[styles.featureCard, { borderColor: feature.color + '26' }]}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  feature.onPress()
                }}
              >
                <View style={[styles.featureIconCircle, { backgroundColor: feature.color + '1A' }]}>
                  <Feather name={feature.icon} size={22} color={feature.color} />
                </View>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSec }]} numberOfLines={2}>{feature.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </MotiView>

        {/* Hydration — interactive, quick engagement */}
        <HydrationTracker
          style={{ marginHorizontal: 0 }}
          glasses={waterGlasses || 0}
          goal={8}
          onAddGlass={() => setWaterGlasses(prev => (prev || 0) + 1)}
        />

        {/* Smart Workout — AI Suggestion Card */}
        {!aiWorkoutDismissed && aiWorkout && (
          <Animated.View style={{
            opacity: aiCardAnim,
            transform: [
              { translateY: aiCardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              { scale: aiCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            ],
          }}>
          <View style={[styles.aiWorkoutCard, card]}>
            {/* Accent left border glow */}
            <View style={[styles.aiWorkoutAccentBorder, { backgroundColor: colors.accent || COLORS.accent }]} />
            {/* Header */}
            <View style={styles.aiWorkoutHeader}>
              <View style={styles.aiWorkoutHeaderLeft}>
                <View style={[styles.aiWorkoutIconWrap, { backgroundColor: (colors.accent || COLORS.accent) + '20' }]}>
                  <Feather name="activity" size={16} color={colors.accent || COLORS.accent} />
                </View>
                <View>
                  <Text style={[styles.aiWorkoutTitle, { color: colors.text }]}>AI Workout</Text>
                  <Text style={[styles.aiWorkoutSubtitle, { color: colors.textSec || COLORS.textSec }]}>Suggested for you</Text>
                </View>
              </View>
              <View style={styles.aiWorkoutHeaderActions}>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    fetchAiWorkout()
                  }}
                >
                  <Feather name="refresh-cw" size={16} color={colors.textSec || COLORS.textSec} />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  style={{ marginLeft: 12 }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setAiWorkoutDismissed(true)
                  }}
                >
                  <Feather name="x" size={16} color={colors.textSec || COLORS.textSec} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Body */}
            <View style={styles.aiWorkoutBody}>
              <Text style={[styles.aiWorkoutType, { color: colors.text }]}>{aiWorkout.type}</Text>
              <View style={[styles.aiWorkoutDurationPill, { backgroundColor: (colors.accent || COLORS.accent) + '18' }]}>
                <Feather name="clock" size={12} color={colors.accent || COLORS.accent} />
                <Text style={[styles.aiWorkoutDurationText, { color: colors.accent || COLORS.accent }]}>
                  {aiWorkout.duration} min
                </Text>
              </View>
            </View>
            <Text style={[styles.aiWorkoutReason, { color: colors.textSec || COLORS.textSec }]}>
              {aiWorkout.reason}
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.aiWorkoutBtn, { backgroundColor: colors.accent || COLORS.accent }]}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                setWorkoutModalVisible(true)
              }}
            >
              <Feather name="play" size={16} color="#FFF" />
              <Text style={styles.aiWorkoutBtnText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
          </Animated.View>
        )}

        {/* Movement/Sleep/Readiness cards replaced by DashboardSummary above */}

        {/* Intermittent Fasting — with Astro-Purple glow */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 140, delay: 300 }}
        >
          <View style={styles.fastingGlowWrap}>
            <FastingTimer gymId={gymId} memberId={member?.id} navigation={navigation} />
          </View>
        </MotiView>

        {/* CRED-style Grouped Action Sections */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 140, delay: 400 }}
        >
        {actionSections.map((section) => (
          <View key={section.title} style={styles.credSection}>
            <Text style={[styles.credSectionTitle, { color: colors.textTer }]}>{section.title}</Text>
            <View style={[styles.credSectionCard, card]}>
              <View style={[styles.credGrid, { padding: SPACING.md }]}>
                {section.items.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={styles.credTile}
                    onPress={action.onPress}
                    activeOpacity={0.65}
                  >
                    <View style={[styles.credIconWrap, { backgroundColor: action.bg + (isDark ? '20' : '28') }]}>
                      <Feather name={action.icon} size={22} color={action.bg} />
                    </View>
                    <Text style={[styles.credTileLabel, { color: colors.text }]} numberOfLines={1}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}
        </MotiView>

        {/* Daily Motivation — removed per user request */}

        {/* Daily Goals Row */}
        <View style={styles.dailyGoalsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Goals</Text>
          <View style={[styles.dailyGoalsRow, GLASS_CARD]}>
            {dailyGoals.map((goal) => {
              const Wrapper = goal.onPress ? TouchableOpacity : View
              return (
                <Wrapper key={goal.label} style={styles.goalItem} onPress={goal.onPress} activeOpacity={0.7}>
                  <View style={[
                    styles.goalCircle,
                    { borderColor: colors.borderStrong },
                    goal.done && styles.goalCircleDone,
                  ]}>
                    <Feather
                      name={goal.done ? 'check' : goal.icon}
                      size={18}
                      color={goal.done ? colors.text : colors.textTer}
                    />
                  </View>
                  <Text style={[
                    styles.goalLabel,
                    { color: colors.textTer },
                    goal.done && styles.goalLabelDone,
                  ]}>
                    {goal.label}
                  </Text>
                </Wrapper>
              )
            })}
          </View>
        </View>

        {/* Today's Classes Strip */}
        <View style={styles.classesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Classes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classesStrip}
          >
            {(Array.isArray(classes) ? classes : []).map((cls) => {
              const spots = classSpots[cls.id] ?? cls.spots
              const isBooked = bookedClasses[cls.id]
              const isBooking = bookingClassId === cls.id
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.classCard, { backgroundColor: colors.bgSec, borderColor: isBooked ? colors.accent : colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => setClassDetailModal(cls)}
                >
                  <Text style={[styles.className, { color: colors.text }]}>{cls.name}</Text>
                  <Text style={[styles.classTrainer, { color: colors.textSec }]}>{cls.trainer}</Text>
                  <View style={styles.classFooter}>
                    <View style={styles.classTimeRow}>
                      <Feather name="clock" size={12} color={colors.textTer} />
                      <Text style={[styles.classTime, { color: colors.textTer }]}>{cls.time}</Text>
                    </View>
                    <Text style={[
                      styles.classSpots,
                      spots <= 3 && { color: COLORS.red },
                    ]}>
                      {spots} spots
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.classBookBtn,
                      { backgroundColor: isBooked ? colors.accentSoft : colors.accent },
                      isBooking && { opacity: 0.6 },
                    ]}
                    activeOpacity={0.7}
                    onPress={(e) => {
                      e.stopPropagation?.()
                      if (!isBooked && !isBooking) handleBookClass(cls)
                    }}
                    disabled={isBooked || isBooking}
                  >
                    {isBooking ? (
                      <Text style={[styles.classBookBtnText, { color: '#fff' }]}>...</Text>
                    ) : isBooked ? (
                      <View style={styles.classBookedRow}>
                        <Feather name="check" size={12} color={colors.accent} />
                        <Text style={[styles.classBookBtnText, { color: colors.accent }]}>Reserved</Text>
                      </View>
                    ) : (
                      <Text style={[styles.classBookBtnText, { color: '#fff' }]}>Reserve</Text>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Class Detail Modal */}
        <Modal
          visible={!!classDetailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setClassDetailModal(null)}
        >
          <TouchableOpacity
            style={styles.classModalOverlay}
            activeOpacity={1}
            onPress={() => setClassDetailModal(null)}
          >
            <View style={[styles.classModalContent, { backgroundColor: colors.bgSec }]}>
              {classDetailModal && (
                <>
                  <View style={styles.classModalHeader}>
                    <Text style={[styles.classModalTitle, { color: colors.text }]}>{classDetailModal.name}</Text>
                    <TouchableOpacity onPress={() => setClassDetailModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Feather name="x" size={22} color={colors.textSec} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.classModalMeta}>
                    <View style={styles.classModalMetaItem}>
                      <Feather name="user" size={14} color={colors.accent} />
                      <Text style={[styles.classModalMetaText, { color: colors.textSec }]}>{classDetailModal.trainer}</Text>
                    </View>
                    <View style={styles.classModalMetaItem}>
                      <Feather name="clock" size={14} color={colors.accent} />
                      <Text style={[styles.classModalMetaText, { color: colors.textSec }]}>{classDetailModal.time} · {classDetailModal.duration}</Text>
                    </View>
                    <View style={styles.classModalMetaItem}>
                      <Feather name="users" size={14} color={(classSpots[classDetailModal.id] ?? classDetailModal.spots) <= 3 ? COLORS.red : colors.accent} />
                      <Text style={[styles.classModalMetaText, { color: (classSpots[classDetailModal.id] ?? classDetailModal.spots) <= 3 ? COLORS.red : colors.textSec }]}>
                        {classSpots[classDetailModal.id] ?? classDetailModal.spots} spots left
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.classModalDesc, { color: colors.textSec }]}>{classDetailModal.description}</Text>
                  <TouchableOpacity
                    style={[
                      styles.classModalBookBtn,
                      { backgroundColor: bookedClasses[classDetailModal.id] ? colors.accentSoft : colors.accent },
                      bookingClassId === classDetailModal.id && { opacity: 0.6 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!bookedClasses[classDetailModal.id] && bookingClassId !== classDetailModal.id) {
                        handleBookClass(classDetailModal)
                      }
                    }}
                    disabled={!!bookedClasses[classDetailModal.id] || bookingClassId === classDetailModal.id}
                  >
                    {bookingClassId === classDetailModal.id ? (
                      <Text style={[styles.classModalBookBtnText, { color: '#fff' }]}>Reserving...</Text>
                    ) : bookedClasses[classDetailModal.id] ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="check-circle" size={16} color={colors.accent} />
                        <Text style={[styles.classModalBookBtnText, { color: colors.accent }]}>Reserved</Text>
                      </View>
                    ) : (
                      <Text style={[styles.classModalBookBtnText, { color: '#fff' }]}>Reserve Spot</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Membership Status Card — only show when user has subscription data */}
        {(membership?.plan_name || membership?.end_date || membership?.membership_end || expiryDate) && (
        <View style={[styles.membershipCard, { backgroundColor: card.backgroundColor, borderColor: card.borderColor }]}>
          <View style={styles.membershipHeader}>
            <Text style={[styles.membershipTitle, { color: colors.text }]}>Membership</Text>
            <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeExpired]}>
              <Text style={[styles.statusText, isActive ? styles.statusActive : styles.statusExpired]}>
                {isActive ? 'Active' : 'Expired'}
              </Text>
            </View>
          </View>
          <View style={styles.membershipDetails}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSec }]}>PLAN</Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                {membership?.plan_name || membership?.name || '\u2014'}
              </Text>
            </View>
            <View style={[styles.detailItem, styles.detailItemCenter]}>
              <Text style={[styles.detailLabel, { color: colors.textSec }]}>EXPIRES</Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                {expiryDate ? formatDate(membership.end_date || membership.membership_end) : '\u2014'}
              </Text>
            </View>
            <View style={[styles.detailItem, styles.detailItemEnd]}>
              <Text style={[styles.detailLabel, { color: colors.textSec }]}>DAYS LEFT</Text>
              <Text style={[styles.detailValueDays, !isActive && styles.detailValueWarn]}>
                {expiryDate ? daysRemaining : '\u2014'}
              </Text>
            </View>
          </View>

          {/* Add to Wallet */}
          {walletAvailable && isActive && (
            <TouchableOpacity
              style={[styles.walletBtn, { borderColor: colors.border }]}
              onPress={async () => {
                setAddingToWallet(true)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                await addMembershipToWallet({
                  gymId,
                  memberId: member?.id,
                  memberName: member?.name,
                  gymName: gym?.name,
                  planName: membership?.plan_name || membership?.name,
                  expiryDate: membership?.end_date || membership?.membership_end,
                })
                setAddingToWallet(false)
              }}
              activeOpacity={0.7}
              disabled={addingToWallet}
            >
              <Feather
                name={Platform.OS === 'ios' ? 'credit-card' : 'smartphone'}
                size={14}
                color={COLORS.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.walletBtnText}>
                {addingToWallet
                  ? 'Adding...'
                  : Platform.OS === 'ios'
                    ? 'Add to Apple Wallet'
                    : 'Add to Google Wallet'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Badges</Text>
            <View style={styles.badgesRow}>
              {badges.map((badge) => (
                <View key={badge.badge_type} style={styles.badgeItem}>
                  <View style={[styles.badgeCircle, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
                    <Text style={styles.badgeEmoji}>{badge.badge_icon}</Text>
                  </View>
                  <Text style={[styles.badgeName, { color: colors.textSec }]} numberOfLines={1}>{badge.badge_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Workout Log Modal */}
      <WorkoutLogModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        gymId={gymId}
        memberId={member?.id}
        onSuccess={() => setDailyGoalStatus(prev => ({ ...prev, workedOut: true }))}
      />

      {/* QR Check-in Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.bgSec, transform: [{ translateY: modalSlide }] },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setQrModalVisible(false)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={24} color={colors.textSec} />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Check In</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSec }]}>
              {nfcAvailable ? 'Tap NFC or show QR at the kiosk' : 'Show this QR code at the kiosk'}
            </Text>

            <Animated.View style={[styles.qrCardModal, { transform: [{ scale: breatheAnim }] }]}>
              <View style={styles.qrRingContainer}>
                <CountdownRing progress={progress} size={QR_SIZE + 40} />
                <View style={styles.qrInner}>
                  {qrData ? (
                    QRCode ? (
                      <QRCode
                        value={qrData}
                        size={QR_SIZE}
                        backgroundColor="#FFFFFF"
                        color="#000000"
                      />
                    ) : (
                      <View style={{
                        width: QR_SIZE,
                        height: QR_SIZE,
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', fontFamily: FONT.mono }}>
                          {qrData.slice(0, 20)}...
                        </Text>
                        <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>QR Preview (native only)</Text>
                      </View>
                    )
                  ) : (
                    <View style={[styles.qrPlaceholder, { width: QR_SIZE, height: QR_SIZE }]} />
                  )}
                </View>
              </View>
              <Text style={[styles.countdownText, { color: colors.textTer }]}>{countdown}s</Text>
            </Animated.View>

            <View style={styles.modalInstructions}>
              <Feather name="monitor" size={16} color={colors.textTer} style={{ marginRight: 8 }} />
              <Text style={[styles.modalInstructionText, { color: colors.textTer }]}>
                Show this QR to the front desk to check in
              </Text>
            </View>

            {/* NFC tap-and-go */}
            {nfcAvailable && Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[styles.nfcBtn, { backgroundColor: colors.accentSoft }, nfcScanning && styles.nfcBtnScanning]}
                onPress={handleNfcCheckIn}
                activeOpacity={0.7}
                disabled={nfcScanning}
              >
                <Feather
                  name={nfcScanning ? 'loader' : 'rss'}
                  size={16}
                  color={COLORS.accent}
                  style={{ marginRight: SPACING.xs }}
                />
                <Text style={styles.nfcBtnText}>
                  {nfcScanning ? 'Hold near NFC reader...' : 'Tap NFC to Check In'}
                </Text>
              </TouchableOpacity>
            )}

            {/* GPS proximity check-in */}
            <TouchableOpacity
              style={[styles.nfcBtn, { backgroundColor: colors.accentSoft, marginTop: SPACING.xs }, gpsChecking && styles.nfcBtnScanning]}
              onPress={handleGpsCheckin}
              activeOpacity={0.7}
              disabled={gpsChecking}
            >
              <Feather
                name={gpsChecking ? 'loader' : 'map-pin'}
                size={16}
                color={COLORS.accent}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.nfcBtnText}>
                {gpsChecking ? 'Getting location...' : 'Location Check-in'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Quick Log Modal */}
      <QuickLogModal
        visible={quickLogVisible}
        onClose={() => setQuickLogVisible(false)}
        gymId={gymId}
        memberId={member?.id}
        onSuccess={(item) => {
          setNutritionTotals(prev => ({
            calories: (prev?.calories || 0) + (item.calories || 0),
            protein: (prev?.protein || 0) + (item.protein || 0),
            carbs: (prev?.carbs || 0) + (item.carbs || 0),
            fats: (prev?.fats || 0) + (item.fats || 0),
          }))
          setDailyGoalStatus(prev => ({ ...prev, loggedMeal: true }))
        }}
      />

      {/* Manual Sleep Log Modal */}
      <Modal visible={sleepLogModalVisible} animationType="slide" transparent onRequestClose={() => setSleepLogModalVisible(false)}>
        <View style={styles.sleepModalOverlay}>
          <View style={[styles.sleepModalContent, { backgroundColor: colors.bgSec }]}>
            <View style={styles.sleepModalHeader}>
              <Text style={[styles.sleepModalTitle, { color: colors.text }]}>Log Sleep</Text>
              <TouchableOpacity onPress={() => setSleepLogModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={22} color={colors.textTer} />
              </TouchableOpacity>
            </View>

            {/* Bedtime input */}
            <Text style={[styles.sleepInputLabel, { color: colors.textSec }]}>Bedtime</Text>
            <View style={styles.sleepTimeRow}>
              <TextInput
                style={[styles.sleepTimeInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
                value={manualSleepForm.bedHour}
                onChangeText={v => setManualSleepForm(f => ({ ...f, bedHour: v.replace(/\D/g, '').slice(0, 2) }))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="23"
                placeholderTextColor={colors.textTer}
              />
              <Text style={[styles.sleepTimeColon, { color: colors.text }]}>:</Text>
              <TextInput
                style={[styles.sleepTimeInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
                value={manualSleepForm.bedMin}
                onChangeText={v => setManualSleepForm(f => ({ ...f, bedMin: v.replace(/\D/g, '').slice(0, 2) }))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="00"
                placeholderTextColor={colors.textTer}
              />
            </View>

            {/* Wake time input */}
            <Text style={[styles.sleepInputLabel, { color: colors.textSec, marginTop: 16 }]}>Wake Time</Text>
            <View style={styles.sleepTimeRow}>
              <TextInput
                style={[styles.sleepTimeInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
                value={manualSleepForm.wakeHour}
                onChangeText={v => setManualSleepForm(f => ({ ...f, wakeHour: v.replace(/\D/g, '').slice(0, 2) }))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="06"
                placeholderTextColor={colors.textTer}
              />
              <Text style={[styles.sleepTimeColon, { color: colors.text }]}>:</Text>
              <TextInput
                style={[styles.sleepTimeInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
                value={manualSleepForm.wakeMin}
                onChangeText={v => setManualSleepForm(f => ({ ...f, wakeMin: v.replace(/\D/g, '').slice(0, 2) }))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="30"
                placeholderTextColor={colors.textTer}
              />
            </View>

            {/* Quality rating */}
            <Text style={[styles.sleepInputLabel, { color: colors.textSec, marginTop: 16 }]}>Sleep Quality</Text>
            <View style={styles.sleepQualityInput}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setManualSleepForm(f => ({ ...f, quality: star }))}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="star"
                    size={28}
                    color={star <= manualSleepForm.quality ? '#EAB308' : 'rgba(255,255,255,0.15)'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.sleepSubmitBtn}
              activeOpacity={0.8}
              onPress={async () => {
                const now = new Date()
                const yesterday = new Date(now)
                yesterday.setDate(yesterday.getDate() - 1)

                const bedH = parseInt(manualSleepForm.bedHour) || 23
                const bedM = parseInt(manualSleepForm.bedMin) || 0
                const wakeH = parseInt(manualSleepForm.wakeHour) || 6
                const wakeM = parseInt(manualSleepForm.wakeMin) || 30

                const bedtime = new Date(yesterday)
                bedtime.setHours(bedH, bedM, 0, 0)
                // If bedtime hour is before noon, it was this morning (not yesterday)
                if (bedH < 12) bedtime.setDate(bedtime.getDate() + 1)

                const wakeTime = new Date(now)
                wakeTime.setHours(wakeH, wakeM, 0, 0)

                const durationMinutes = Math.round((wakeTime - bedtime) / 60000)
                if (durationMinutes <= 0 || durationMinutes > 1440) {
                  premiumAlert('Invalid Times', 'Please check your bedtime and wake time.')
                  return
                }

                const newSleep = {
                  bedtime: bedtime.toISOString(),
                  wakeTime: wakeTime.toISOString(),
                  durationMinutes,
                  quality: manualSleepForm.quality,
                  source: 'manual',
                }

                // Sleep data will update via HealthContext on next sync
                setSleepLogModalVisible(false)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                // Sync to backend
                if (gymId && member?.id) {
                  syncSleepToBackend(gymId, member.id, newSleep)
                }
              }}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={styles.sleepSubmitBtnText}>Save Sleep Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// --- Quick Log Modal ---
function QuickLogModal({ visible, onClose, gymId, memberId, onSuccess }) {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [saving, setSaving] = useState(false)

  const handleLog = async () => {
    if (!name || !calories) {
      premiumAlert('Missing Info', 'Please enter a food name and calories.')
      return
    }
    const item = {
      name,
      calories: parseInt(calories, 10) || 0,
      protein: parseInt(protein, 10) || 0,
      carbs: parseInt(carbs, 10) || 0,
      fats: parseInt(fats, 10) || 0,
      qty: 1,
    }
    setSaving(true)
    try {
      await api.post(`/gyms/${gymId}/members/${memberId}/nutrition/log`, {
        type: 'snack',
        items: [item],
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSuccess(item)
      onClose()
      resetFields()
    } catch {
      premiumAlert('Failed to log', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const resetFields = () => {
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFats('')
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={quickLogStyles.overlay}>
        <View style={[quickLogStyles.sheet, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <View style={[quickLogStyles.handle, { backgroundColor: colors.borderStrong }]} />
          <TouchableOpacity style={quickLogStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.textSec} />
          </TouchableOpacity>
          <Text style={[quickLogStyles.title, { color: colors.text }]}>Quick Log</Text>

          <TextInput
            style={[quickLogStyles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
            placeholder="Food Name"
            placeholderTextColor={colors.textTer}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[quickLogStyles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
            placeholder="Calories"
            placeholderTextColor={colors.textTer}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
          <View style={quickLogStyles.macroRow}>
            <TextInput
              style={[quickLogStyles.input, quickLogStyles.macroInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
              placeholder="Protein (g)"
              placeholderTextColor={colors.textTer}
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
            <TextInput
              style={[quickLogStyles.input, quickLogStyles.macroInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
              placeholder="Carbs (g)"
              placeholderTextColor={colors.textTer}
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
            <TextInput
              style={[quickLogStyles.input, quickLogStyles.macroInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
              placeholder="Fats (g)"
              placeholderTextColor={colors.textTer}
              keyboardType="numeric"
              value={fats}
              onChangeText={setFats}
            />
          </View>

          <TouchableOpacity
            style={quickLogStyles.logBtn}
            onPress={handleLog}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Feather name="check" size={18} color={colors.text} />
            <Text style={[quickLogStyles.logBtnText, { color: colors.text }]}>
              {saving ? 'Logging...' : 'Log Meal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const quickLogStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    ...ELITE_CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.bgTer,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  macroInput: {
    flex: 1,
  },
  logBtn: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    minHeight: 48,
  },
  logBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
})

// --- Workout Log Modal ---
const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'CrossFit', 'Functional']

function WorkoutLogModal({ visible, onClose, gymId, memberId, onSuccess }) {
  const { colors } = useTheme()
  const [workoutType, setWorkoutType] = useState('Strength')
  const [duration, setDuration] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!duration) {
      premiumAlert('Missing Info', 'Please enter a duration.')
      return
    }
    setSaving(true)
    try {
      await api.post(`/gyms/${gymId}/members/${memberId}/health/workouts`, {
        workout_type: workoutType.toLowerCase(),
        duration_minutes: parseInt(duration, 10),
        calories_burned: calories ? parseInt(calories, 10) : undefined,
        notes: notes || undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSuccess()
      onClose()
      setDuration('')
      setCalories('')
      setNotes('')
    } catch {
      premiumAlert('Failed to save', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.workoutModalSheet, { backgroundColor: colors.bgSec }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={24} color={colors.textSec} />
          </TouchableOpacity>

          <Text style={[styles.modalTitle, { color: colors.text }]}>Log Workout</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
            <View style={styles.workoutChipRow}>
              {WORKOUT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.workoutChip, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }, workoutType === type && styles.workoutChipSelected]}
                  onPress={() => setWorkoutType(type)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.workoutChipText, { color: colors.textSec }, workoutType === type && [styles.workoutChipTextSelected, { color: colors.text }]]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.workoutInputLabel, { color: colors.textSec }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.workoutInput, { backgroundColor: colors.bg, borderColor: colors.borderStrong, color: colors.text }]}
              placeholder="e.g. 45"
              placeholderTextColor={colors.textTer}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />

            <Text style={[styles.workoutInputLabel, { color: colors.textSec }]}>Calories Burned (optional)</Text>
            <TextInput
              style={[styles.workoutInput, { backgroundColor: colors.bg, borderColor: colors.borderStrong, color: colors.text }]}
              placeholder="e.g. 350"
              placeholderTextColor={colors.textTer}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />

            <Text style={[styles.workoutInputLabel, { color: colors.textSec }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.workoutInput, { height: 80, textAlignVertical: 'top', backgroundColor: colors.bg, borderColor: colors.borderStrong, color: colors.text }]}
              placeholder="How did it go?"
              placeholderTextColor={colors.textTer}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={styles.workoutSaveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={[styles.workoutSaveBtnText, { color: colors.text }]}>
                {saving ? 'Saving...' : 'Save Workout'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// --- Countdown ring built with View transforms ---
function CountdownRing({ progress, size }) {
  const { colors } = useTheme()
  const strokeWidth = 3
  const radius = size / 2
  const rotation = (1 - progress) * 360

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <View
        style={[
          styles.ringCircle,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: strokeWidth,
            borderColor: colors.borderStrong,
          },
        ]}
      />
      <View style={[styles.ringHalf, { width: size / 2, height: size, left: size / 2, overflow: 'hidden' }]}>
        <View
          style={[
            styles.ringCircle,
            {
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: COLORS.accent,
              left: -(size / 2),
              transform: [{ rotateZ: `${rotation > 180 ? rotation - 180 : 0}deg` }],
            },
          ]}
        />
      </View>
      <View style={[styles.ringHalf, { width: size / 2, height: size, left: 0, overflow: 'hidden' }]}>
        <View
          style={[
            styles.ringCircle,
            {
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: COLORS.accent,
              left: size / 2,
              transform: [{ rotateZ: `${rotation > 180 ? 180 : rotation}deg` }],
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Sticky Header — 3-column
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  streakFlame: {
    fontSize: 14,
  },
  streakPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
    fontFamily: FONT.semibold,
  },
  streakPillEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakPillEmptyText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textTer,
  },
  headerProfileWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgTer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
  },
  headerProfileGlow: {
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  headerProfileInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 128, // pb-32 — safe area for bottom nav
  },

  // Welcome
  welcomeSection: {
    marginBottom: SPACING.lg,
  },
  welcomeLabel: {
    fontSize: 14,
    color: COLORS.textSec,
    marginBottom: 2,
    fontFamily: FONT.regular,
  },
  memberName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONT.bold,
    letterSpacing: -0.5,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    marginBottom: 8,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
  aiInsightText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONT.bold,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  recoveryTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  recoveryTipText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    lineHeight: 18,
    flex: 1,
  },

  // Today's Fuel
  fuelCard: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  fuelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  fuelTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    fontFamily: FONT.semibold,
    letterSpacing: -0.3,
  },
  fuelBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  fuelRingWrap: {
    width: MINI_RING_SIZE,
    height: MINI_RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuelRingContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuelRingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  fuelRingLabel: {
    fontSize: 9,
    color: COLORS.textTer,
    fontWeight: '500',
    fontFamily: FONT.medium,
    lineHeight: 11,
    marginTop: 1,
  },
  macroBars: {
    flex: 1,
    gap: SPACING.sm + 2,
  },
  macroRow: {
    gap: 3,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSec,
  },
  macroValue: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textTer,
    fontVariant: ['tabular-nums'],
  },
  macroTrack: {
    height: 6,
    backgroundColor: COLORS.borderStrong,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  fuelScanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    marginTop: SPACING.sm,
  },
  fuelScanLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fuelActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  fuelActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    minHeight: 40,
  },
  fuelActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Fasting glow wrapper
  fastingGlowWrap: {
    marginBottom: SPACING.lg,
    ...ELITE_GLOW,
  },

  // CRED-style grouped action sections
  credSection: {
    marginBottom: SPACING.md,
  },
  credSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  credSectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  credGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  credTile: {
    alignItems: 'center',
    width: '25%',
    paddingVertical: SPACING.sm + 2,
  },
  credIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  credTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    textAlign: 'center',
  },

  // Daily Goals
  dailyGoalsCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontFamily: FONT.semibold,
    letterSpacing: -0.3,
  },
  dailyGoalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...ELITE_CARD,
    padding: SPACING.lg,
  },
  goalItem: {
    alignItems: 'center',
  },
  goalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  goalCircleDone: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(52,168,83,0.15)',
  },
  goalLabel: {
    fontSize: 12,
    color: COLORS.textTer,
    fontWeight: '500',
  },
  goalLabelDone: {
    color: COLORS.green,
  },

  // Today's Classes
  classesSection: {
    marginBottom: SPACING.xl,
  },
  classesStrip: {
    paddingRight: SPACING.lg,
    gap: SPACING.sm,
  },
  classCard: {
    ...ELITE_CARD,
    padding: SPACING.md,
    width: 180,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  classTrainer: {
    fontSize: 12,
    color: COLORS.textSec,
    marginBottom: SPACING.sm,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classTime: {
    fontSize: 12,
    color: COLORS.textTer,
    fontWeight: '500',
  },
  classSpots: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '600',
  },
  classBookBtn: {
    marginTop: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  classBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT.semibold,
  },
  classBookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Class Detail Modal
  classModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  classModalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  classModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  classModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  classModalMeta: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  classModalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classModalMetaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  classModalDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  classModalBookBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classModalBookBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.semibold,
  },

  // Membership Card
  membershipCard: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  badgeActive: {
    backgroundColor: 'rgba(52,168,83,0.15)',
  },
  badgeExpired: {
    backgroundColor: 'rgba(234,67,53,0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    color: COLORS.green,
  },
  statusExpired: {
    color: COLORS.red,
  },
  membershipDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailItemCenter: {
    alignItems: 'center',
  },
  detailItemEnd: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textSec,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailValueDays: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  detailValueWarn: {
    color: COLORS.red,
  },

  // Wallet
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  walletBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
    fontFamily: FONT.medium,
  },

  // Badges
  badgesSection: {
    marginBottom: SPACING.lg,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  badgeItem: {
    alignItems: 'center',
    width: 72,
  },
  badgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ELITE_CARD.backgroundColor,
    borderWidth: 1,
    borderColor: ELITE_CARD.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: 11,
    color: COLORS.textSec,
    fontWeight: '500',
    textAlign: 'center',
  },

  // QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.bgSec,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    marginBottom: SPACING.lg,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.lg,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSec,
    marginBottom: SPACING.xl,
  },
  qrCardModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  qrRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  qrInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    backgroundColor: '#F0F0F0',
    borderRadius: RADIUS.md,
  },
  countdownText: {
    fontSize: 12,
    color: COLORS.textTer,
    marginTop: SPACING.xs,
    fontVariant: ['tabular-nums'],
  },
  modalInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    minWidth: 200,
  },
  modalInstructionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  nfcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
    minWidth: 200,
    height: 48,
    marginTop: SPACING.sm,
  },
  nfcBtnScanning: {
    borderColor: COLORS.accentGlow,
    opacity: 0.8,
  },
  nfcBtnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },

  // Workout Modal
  workoutModalSheet: {
    backgroundColor: COLORS.bgSec,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignItems: 'center',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  workoutChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  workoutChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTer || 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  workoutChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  workoutChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSec,
  },
  workoutChipTextSelected: {
    color: COLORS.text,
  },
  workoutInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSec,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  workoutInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    minHeight: 48,
  },
  workoutSaveBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  workoutSaveBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },

  // Countdown ring
  ringWrap: {
    position: 'relative',
  },
  ringCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringHalf: {
    position: 'absolute',
    top: 0,
  },

  // Movement / Step Counter
  movementCard: {
    ...GLASS_CARD,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  movementCardGoalMet: {
    borderColor: 'rgba(34,197,94,0.4)',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  movementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  movementTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    fontFamily: FONT.semibold,
    letterSpacing: -0.3,
  },
  movementBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepRingWrap: {
    width: STEP_RING_SIZE,
    height: STEP_RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  stepRingContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepRingFallback: {
    width: STEP_RING_SIZE,
    height: STEP_RING_SIZE,
    borderRadius: STEP_RING_SIZE / 2,
    borderWidth: STEP_STROKE,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  stepCountText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F97316',
    fontFamily: FONT.numExtraBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.textTer,
    fontWeight: '500',
    marginTop: -2,
  },
  movementStats: {
    flex: 1,
  },
  movementActiveTime: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F97316',
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  movementDistance: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  movementSubLabel: {
    fontSize: 10,
    color: COLORS.textTer,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: FONT.semibold,
  },
  movementGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  movementGoalText: {
    fontSize: 13,
    color: COLORS.textTer,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },

  // Step source badge
  stepSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  stepSourceText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTer,
    fontFamily: FONT.semibold,
    letterSpacing: 0.2,
  },

  // Connect health prompt (demo mode)
  movementConnectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONT.semibold,
    marginBottom: 4,
  },
  movementConnectSub: {
    fontSize: 12,
    color: COLORS.textSec,
    fontFamily: FONT.regular,
    lineHeight: 18,
    marginBottom: 8,
  },
  movementConnectHint: {
    fontSize: 11,
    color: COLORS.textTer,
    fontFamily: FONT.medium,
    fontStyle: 'italic',
  },

  // Movement suggestions
  movementSuggestions: {
    marginTop: SPACING.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    lineHeight: 18,
    flex: 1,
  },
  movementViewProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: SPACING.xs,
  },
  movementViewProgressText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },

  // Feature Highlights Row
  featureHighlightsRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: 12,
  },
  featureCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
    gap: 10,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
    lineHeight: 17,
    opacity: 0.8,
  },

  // AI Workout Suggestion Card
  aiWorkoutCard: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    paddingLeft: SPACING.lg + 4,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  aiWorkoutAccentBorder: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    borderRadius: 2,
    opacity: 0.85,
  },
  aiWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  aiWorkoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aiWorkoutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiWorkoutTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  aiWorkoutSubtitle: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  aiWorkoutHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiWorkoutBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  aiWorkoutType: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT.bold,
    letterSpacing: -0.5,
  },
  aiWorkoutDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiWorkoutDurationText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  aiWorkoutReason: {
    fontSize: 13,
    fontFamily: FONT.regular,
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: SPACING.md,
    opacity: 0.85,
  },
  aiWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  aiWorkoutBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: 0.2,
  },

  // ── Sleep Card Styles ────────────────────────────────────────
  sleepBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepTimeText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT.bold,
    letterSpacing: -0.5,
  },
  sleepQualityRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 10,
    marginBottom: 2,
  },
  sleepFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  sleepFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  sleepFooterDivider: {
    width: 1,
    height: 20,
    alignSelf: 'center',
  },
  sleepFooterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  sleepLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sleepLogBtnText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },

  // ── Sleep Log Modal ──────────────────────────────────────────
  sleepModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sleepModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.lg,
  },
  sleepModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sleepModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONT.bold,
    letterSpacing: -0.5,
  },
  sleepInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sleepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sleepTimeInput: {
    width: 64,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FONT.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sleepTimeColon: {
    fontSize: 24,
    fontWeight: '700',
  },
  sleepQualityInput: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  sleepSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  sleepSubmitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: 0.2,
  },
})
