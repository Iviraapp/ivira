import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Image, RefreshControl, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { COLORS, FONT, SPACING, RADIUS, SHADOW, FEATURE } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useHealth } from '../context/HealthContext'
import Haptics from '../lib/haptics'
import api from '../lib/api'
import { getItem } from '../lib/storage'
import { getWorkoutSuggestion } from '../lib/aiCoach'
import { premiumAlert } from '../components/PremiumAlert'

const { width: W } = Dimensions.get('window')
const STEP_GOAL = 10000

export default function HomeScreen({ navigation, route }) {
  const { colors, isDark, card } = useTheme()
  const { member, gymId, gymInfo } = useAuth()
  const { steps, activeMinutes, sleepData, fetchSteps, fetchSleep } = useHealth()

  const [profilePhoto, setProfilePhoto] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [streak, setStreak] = useState(member?.streak || 0)
  const [checkinCount, setCheckinCount] = useState(member?.checkin_count || 0)
  const [fastingHours, setFastingHours] = useState(null)

  // Nutrition
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 })
  const [nutritionGoal, setNutritionGoal] = useState({ calories: 2000, protein: 120, carbs: 250, fats: 65 })

  // Circle activity
  const [circleActivity, setCircleActivity] = useState([])
  const [circleInfo, setCircleInfo] = useState(null)

  // Classes
  const [classes, setClasses] = useState([])
  const [bookedClasses, setBookedClasses] = useState({})

  // AI workout
  const [aiWorkout, setAiWorkout] = useState(null)
  const [aiDismissed, setAiDismissed] = useState(false)

  // Greeting
  const greeting = getGreeting()
  const firstName = (member?.name || 'there').split(' ')[0]

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current
  const cardAnim   = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardAnim,   { toValue: 1, damping: 18, stiffness: 120, useNativeDriver: true }),
    ]).start()
  }, [])

  // Profile photo
  useEffect(() => {
    if (member?.photo_url) setProfilePhoto(member.photo_url)
    else getItem('ivira_profile_photo').then(uri => uri && setProfilePhoto(uri)).catch(() => {})
  }, [member?.photo_url])

  // Fasting elapsed
  useEffect(() => {
    const check = async () => {
      try {
        const raw = await AsyncStorage.getItem('fasting_start_time')
        if (raw) {
          const h = Math.floor((Date.now() - parseInt(raw, 10)) / 3600000)
          setFastingHours(h > 0 ? h : null)
        }
      } catch {}
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    if (!gymId || !member?.id) return
    const today = new Date().toISOString().split('T')[0]
    try {
      const [nutritionRes, goalRes, classesRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/daily?date=${today}`).catch(() => ({ data: {} })),
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/goal`).catch(() => ({ data: null })),
        api.get(`/gyms/${gymId}/classes`).catch(() => ({ data: [] })),
      ])
      if (nutritionRes.data?.totals) setNutrition(nutritionRes.data.totals)
      if (goalRes.data) setNutritionGoal(goalRes.data)
      const cls = Array.isArray(nutritionRes.data) ? [] :
        Array.isArray(classesRes.data) ? classesRes.data :
        Array.isArray(classesRes.data?.classes) ? classesRes.data.classes : []
      setClasses(cls.slice(0, 5))
    } catch {}

    // Circle activity (pods)
    try {
      const podRes = await api.get(`/gyms/${gymId}/members/${member.id}/pods/activity`).catch(() => ({ data: [] }))
      setCircleActivity(Array.isArray(podRes.data) ? podRes.data.slice(0, 4) : [])
    } catch {}
  }, [gymId, member?.id])

  useFocusEffect(useCallback(() => { fetchData() }, [fetchData]))

  // AI workout
  useEffect(() => {
    getWorkoutSuggestion({ memberId: member?.id, name: member?.name, gymId })
      .then(setAiWorkout).catch(() => {})
  }, [member?.id, gymId])

  // Handle nutrition param from barcode scanner
  useEffect(() => {
    if (route?.params?.nutritionLogged) {
      const item = route.params.nutritionLogged
      navigation?.setParams?.({ nutritionLogged: null })
      setNutrition(prev => ({
        calories: (prev.calories || 0) + (item.calories || 0),
        protein:  (prev.protein  || 0) + (item.protein  || 0),
        carbs:    (prev.carbs    || 0) + (item.carbs    || 0),
        fats:     (prev.fats     || 0) + (item.fats     || 0),
      }))
    }
  }, [route?.params?.nutritionLogged])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchData(), fetchSteps?.(), fetchSleep?.()]).catch(() => {})
    setRefreshing(false)
  }

  const calProgress = Math.min((nutrition.calories || 0) / (nutritionGoal.calories || 2000), 1)
  const stepProgress = Math.min((steps || 0) / STEP_GOAL, 1)
  const sleepScore = sleepData?.score || sleepData?.quality || null
  const sleepHours = sleepData?.durationMinutes ? (sleepData.durationMinutes / 60).toFixed(1) : null

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top']}>

      {/* ── Header ── */}
      <Animated.View style={[s.header, { opacity: headerFade }]}>
        <View>
          <Text style={[s.greeting, { color: colors.textSec }]}>{greeting}</Text>
          <Text style={[s.name, { color: colors.text }]}>{firstName}</Text>
        </View>
        <View style={s.headerRight}>
          {streak > 0 && (
            <View style={s.streakPill}>
              <Text style={s.streakEmoji}>🔥</Text>
              <Text style={s.streakText}>{streak}d</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.notifBtn, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}
            onPress={() => navigation.navigate('Profile', { screen: 'NotificationSettings' })}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={18} color={colors.textSec} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.avatarBtn, { backgroundColor: colors.bgTer, borderColor: COLORS.accent + '50' }]}
            onPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })}
            activeOpacity={0.7}
          >
            {profilePhoto
              ? <Image source={{ uri: profilePhoto }} style={s.avatarImg} />
              : <Text style={[s.avatarInitial, { color: colors.text }]}>{(member?.name || 'M').charAt(0).toUpperCase()}</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />}
      >

        {/* ── Check-in hero card ── */}
        <TouchableOpacity
          style={[s.checkinCard, { backgroundColor: colors.bgTer, borderColor: COLORS.accent + '30' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('CheckIn') }}
          activeOpacity={0.85}
        >
          <View style={s.checkinTopBar} />
          <View style={s.checkinRow}>
            <View style={s.qrPreview}>
              <Feather name="maximize" size={24} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.checkinTitle, { color: colors.text }]}>Tap to Check In</Text>
              <Text style={[s.checkinSub, { color: colors.textSec }]}>QR · NFC · GPS — refreshes every 30s</Text>
            </View>
            <View style={s.checkinArrow}>
              <Feather name="chevron-right" size={18} color={COLORS.accent} />
            </View>
          </View>
          <View style={s.checkinMethods}>
            <CheckinChip icon="maximize" label="QR" active />
            <CheckinChip icon="rss" label="NFC" />
            <CheckinChip icon="map-pin" label="GPS" />
            {checkinCount > 0 && (
              <View style={{ marginLeft: 'auto' }}>
                <Text style={[s.checkinCount, { color: colors.textSec }]}>{checkinCount} total check-ins</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ── Stats row ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow} style={s.statsScroll}>
          <StatTile
            value={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : (steps || 0).toString()}
            label="steps"
            color={FEATURE.steps}
            progress={stepProgress}
            colors={colors}
            onPress={() => navigation.navigate('ActivityDashboard')}
          />
          {sleepScore && (
            <StatTile
              value={sleepHours ? `${sleepHours}h` : `${sleepScore}`}
              label={sleepHours ? 'sleep' : 'sleep score'}
              color={FEATURE.sleep}
              colors={colors}
              onPress={() => navigation.navigate('SleepTracker')}
            />
          )}
          <StatTile
            value={(nutrition.calories || 0).toString()}
            label="kcal"
            color={FEATURE.nutrition}
            progress={calProgress}
            colors={colors}
            onPress={() => navigation.navigate('NutritionLog')}
          />
          {fastingHours && (
            <StatTile
              value={`${fastingHours}h`}
              label="fasting"
              color={FEATURE.fasting}
              colors={colors}
              onPress={() => navigation.navigate('FastingLog')}
            />
          )}
          {activeMinutes > 0 && (
            <StatTile
              value={`${activeMinutes}m`}
              label="active"
              color={FEATURE.activity}
              colors={colors}
            />
          )}
        </ScrollView>

        {/* ── Circle live activity ── */}
        <CircleActivityCard
          activity={circleActivity}
          colors={colors}
          onProveSet={() => navigation.navigate('Circles', { screen: 'WorkoutAnalyzer' })}
          onViewCircle={() => navigation.navigate('Circles')}
        />

        {/* ── AI workout suggestion ── */}
        {!aiDismissed && aiWorkout && (
          <AIWorkoutCard
            workout={aiWorkout}
            colors={colors}
            isDark={isDark}
            onStart={() => navigation.navigate('WorkoutTracker')}
            onDismiss={() => setAiDismissed(true)}
            onRefresh={() => getWorkoutSuggestion({ memberId: member?.id, name: member?.name, gymId }).then(setAiWorkout).catch(() => {})}
          />
        )}

        {/* ── Today's classes ── */}
        {classes.length > 0 && (
          <ClassesStrip classes={classes} bookedClasses={bookedClasses} setBookedClasses={setBookedClasses} gymId={gymId} colors={colors} />
        )}

        {/* ── Quick actions grid ── */}
        <QuickActions navigation={navigation} colors={colors} />

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function CheckinChip({ icon, label, active }) {
  return (
    <View style={[s.chip, active && s.chipActive]}>
      <Feather name={icon} size={11} color={active ? COLORS.bg : COLORS.accent} />
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </View>
  )
}

function StatTile({ value, label, color, progress, onPress, colors }) {
  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper style={[s.statTile, { backgroundColor: colors.bgTer, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={[s.statKey, { color: colors.textTer }]}>{label}</Text>
      {progress !== undefined && (
        <View style={[s.statTrack, { backgroundColor: colors.border }]}>
          <View style={[s.statFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
        </View>
      )}
    </Wrapper>
  )
}

function CircleActivityCard({ activity, colors, onProveSet, onViewCircle }) {
  const hasActivity = activity && activity.length > 0
  return (
    <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}>
      <View style={s.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.cardTitle, { color: colors.text }]}>My Circle</Text>
          <View style={s.liveBadge}><Text style={s.liveText}>LIVE</Text></View>
        </View>
        <TouchableOpacity onPress={onViewCircle} activeOpacity={0.7}>
          <Text style={[s.seeAll, { color: COLORS.accent }]}>View all</Text>
        </TouchableOpacity>
      </View>

      {hasActivity ? (
        activity.slice(0, 3).map((item, i, arr) => (
          <View key={i} style={[s.proofRow, { borderBottomColor: colors.border }, i === arr.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={[s.proofAvatar, { backgroundColor: COLORS.accentSoft }]}>
              <Text style={[s.proofInitial, { color: COLORS.accent }]}>
                {(item.member_name || item.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.proofName, { color: colors.text }]}>{item.member_name || item.name}</Text>
              <Text style={[s.proofMeta, { color: colors.textSec }]}>
                {item.exercise || item.workout_type} · {item.reps ? `${item.reps} reps` : item.duration_min ? `${item.duration_min} min` : ''}
              </Text>
            </View>
            {item.form_score && (
              <Text style={[s.proofScore, { color: item.form_score >= 80 ? COLORS.accent : COLORS.warn }]}>
                {item.form_score}
              </Text>
            )}
          </View>
        ))
      ) : (
        <View style={s.emptyCircle}>
          <Feather name="users" size={28} color={colors.textTer} />
          <Text style={[s.emptyText, { color: colors.textSec }]}>No Circle activity yet today</Text>
          <Text style={[s.emptySubText, { color: colors.textTer }]}>Be the first to post a set</Text>
        </View>
      )}

      <View style={[s.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.primaryBtn} onPress={onProveSet} activeOpacity={0.85}>
          <Feather name="video" size={14} color={COLORS.bg} />
          <Text style={s.primaryBtnText}>Prove my set</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.ghostBtn, { borderColor: colors.borderStrong }]} onPress={onViewCircle} activeOpacity={0.7}>
          <Text style={[s.ghostBtnText, { color: colors.textSec }]}>View Circle</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function AIWorkoutCard({ workout, colors, isDark, onStart, onDismiss, onRefresh }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, damping: 18, stiffness: 120, useNativeDriver: true }).start()
  }, [])
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
      <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: COLORS.accent + '25', borderLeftWidth: 3, borderLeftColor: COLORS.accent }]}>
        <View style={s.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.aiIconWrap, { backgroundColor: COLORS.accentSoft }]}>
              <Feather name="activity" size={14} color={COLORS.accent} />
            </View>
            <Text style={[s.cardTitle, { color: colors.text }]}>AI Workout</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="refresh-cw" size={15} color={colors.textSec} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 4 }}>
              <Feather name="x" size={15} color={colors.textSec} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Text style={[s.workoutType, { color: colors.text }]}>{workout.type}</Text>
          <View style={[s.durationPill, { backgroundColor: COLORS.accentSoft }]}>
            <Feather name="clock" size={11} color={COLORS.accent} />
            <Text style={[s.durationText, { color: COLORS.accent }]}>{workout.duration} min</Text>
          </View>
        </View>
        <Text style={[s.workoutReason, { color: colors.textSec }]}>{workout.reason}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={onStart} activeOpacity={0.85}>
          <Feather name="play" size={14} color={COLORS.bg} />
          <Text style={s.primaryBtnText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

function ClassesStrip({ classes, bookedClasses, setBookedClasses, gymId, colors }) {
  const [booking, setBooking] = useState(null)

  const book = async (cls) => {
    if (bookedClasses[cls.id]) return
    setBooking(cls.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await api.post(`/gyms/${gymId}/bookings`, { service_id: cls.id })
      setBookedClasses(prev => ({ ...prev, [cls.id]: true }))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      premiumAlert('Reserved!', `You're booked for ${cls.name}`)
    } catch (e) {
      premiumAlert('Booking failed', e?.response?.data?.message || 'Please try again.')
    } finally {
      setBooking(null)
    }
  }

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Today's Classes</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.classesRow} style={s.classesScroll}>
        {classes.map(cls => {
          const booked = !!bookedClasses[cls.id]
          const loading = booking === cls.id
          return (
            <View key={cls.id} style={[s.classCard, { backgroundColor: colors.bgTer, borderColor: booked ? COLORS.accent + '50' : colors.borderStrong }]}>
              <View style={[s.classTimePill, { backgroundColor: COLORS.purpleSoft }]}>
                <Text style={[s.classTimeText, { color: COLORS.purple }]}>{cls.time}</Text>
              </View>
              <Text style={[s.className, { color: colors.text }]} numberOfLines={1}>{cls.name}</Text>
              <Text style={[s.classTrainer, { color: colors.textSec }]} numberOfLines={1}>{cls.trainer}</Text>
              <Text style={[s.classSpots, { color: (cls.spots ?? 10) <= 3 ? COLORS.danger : COLORS.accent }]}>
                {cls.spots ?? 10} spots
              </Text>
              <TouchableOpacity
                style={[s.bookBtn, { backgroundColor: booked ? COLORS.accentSoft : COLORS.accent }, loading && { opacity: 0.6 }]}
                onPress={() => book(cls)}
                disabled={booked || loading}
                activeOpacity={0.8}
              >
                <Text style={[s.bookBtnText, { color: booked ? COLORS.accent : COLORS.bg }]}>
                  {loading ? '...' : booked ? 'Reserved' : 'Reserve'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function QuickActions({ navigation, colors }) {
  const actions = [
    { icon: 'activity',   label: 'Workout',    color: COLORS.accent,  onPress: () => navigation.navigate('WorkoutTracker') },
    { icon: 'maximize',   label: 'Scan Food',  color: COLORS.orange,  onPress: () => navigation.navigate('BarcodeScanner') },
    { icon: 'moon',       label: 'Sleep',      color: COLORS.purple,  onPress: () => navigation.navigate('SleepTracker') },
    { icon: 'camera',     label: 'AI Food',    color: COLORS.danger,  onPress: () => navigation.navigate('FoodScanner') },
    { icon: 'target',     label: 'Challenges', color: FEATURE.fasting, onPress: () => navigation.navigate('Challenges') },
    { icon: 'award',      label: 'Score',      color: COLORS.cyan,    onPress: () => navigation.navigate('FitnessScore') },
    { icon: 'bar-chart-2',label: 'Leaderboard',color: COLORS.cyan,    onPress: () => navigation.navigate('CityLeaderboard') },
    { icon: 'book-open',  label: 'Recipes',    color: COLORS.green,   onPress: () => navigation.navigate('Recipes') },
  ]
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={[s.sectionTitle, { color: colors.text, marginBottom: SPACING.sm }]}>Quick Access</Text>
      <View style={s.actionsGrid}>
        {actions.map(a => (
          <TouchableOpacity key={a.label} style={[s.actionTile, { backgroundColor: colors.bgTer, borderColor: colors.border }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); a.onPress() }} activeOpacity={0.7}>
            <View style={[s.actionIcon, { backgroundColor: a.color + '1A' }]}>
              <Feather name={a.icon} size={20} color={a.color} />
            </View>
            <Text style={[s.actionLabel, { color: colors.text }]} numberOfLines={1}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  greeting: { fontSize: 13, fontFamily: FONT.medium },
  name: { fontSize: 26, fontFamily: FONT.extraBold, letterSpacing: -0.8, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.amber + '1F', borderWidth: 0.5, borderColor: COLORS.amber + '4D', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  streakEmoji: { fontSize: 13 },
  streakText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.amber },
  notifBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarInitial: { fontSize: 15, fontFamily: FONT.bold },

  scroll: { paddingHorizontal: SPACING.lg },

  // Check-in card
  checkinCard: { borderRadius: RADIUS.xl, borderWidth: 1, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOW.sm },
  checkinTopBar: { height: 2.5, backgroundColor: COLORS.accent },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  qrPreview: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.accent + '30' },
  checkinTitle: { fontSize: 16, fontFamily: FONT.bold },
  checkinSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  checkinArrow: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  checkinMethods: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.accent + '40', backgroundColor: 'transparent' },
  chipActive: { backgroundColor: COLORS.accent },
  chipText: { fontSize: 11, fontFamily: FONT.semibold, color: COLORS.accent },
  chipTextActive: { color: COLORS.bg },
  checkinCount: { fontSize: 11, fontFamily: FONT.medium },

  // Stats
  statsRow: { gap: 10, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  statsScroll: { marginHorizontal: -SPACING.lg },
  statTile: { borderRadius: RADIUS.md, borderWidth: 0.5, padding: 14, minWidth: 90 },
  statVal: { fontSize: 26, fontFamily: FONT.numExtraBold, letterSpacing: -1, lineHeight: 28 },
  statKey: { fontSize: 11, fontFamily: FONT.medium, marginTop: 3 },
  statTrack: { height: 3, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 2 },

  // Card
  card: { borderRadius: RADIUS.xl, borderWidth: 0.5, padding: 18, marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: FONT.bold },
  seeAll: { fontSize: 12, fontFamily: FONT.semibold },
  liveBadge: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  liveText: { fontSize: 9, fontFamily: FONT.bold, color: COLORS.accent, letterSpacing: 1 },

  // Circle activity
  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  proofAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  proofInitial: { fontSize: 13, fontFamily: FONT.bold },
  proofName: { fontSize: 13, fontFamily: FONT.semibold },
  proofMeta: { fontSize: 11, fontFamily: FONT.regular, marginTop: 1 },
  proofScore: { fontSize: 20, fontFamily: FONT.numExtraBold, letterSpacing: -0.5 },
  emptyCircle: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyText: { fontSize: 14, fontFamily: FONT.semibold },
  emptySubText: { fontSize: 12, fontFamily: FONT.regular },

  // Buttons
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 0.5 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.accent, paddingVertical: 10, borderRadius: 12 },
  primaryBtnText: { fontSize: 13, fontFamily: FONT.bold, color: COLORS.bg },
  ghostBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 0.5 },
  ghostBtnText: { fontSize: 13, fontFamily: FONT.semibold },

  // AI workout
  aiIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  workoutType: { fontSize: 22, fontFamily: FONT.extraBold, letterSpacing: -0.5 },
  durationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  durationText: { fontSize: 12, fontFamily: FONT.semibold },
  workoutReason: { fontSize: 13, fontFamily: FONT.regular, fontStyle: 'italic', lineHeight: 19, marginBottom: SPACING.md },

  // Classes
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, letterSpacing: -0.3 },
  classesScroll: { marginHorizontal: -SPACING.lg },
  classesRow: { gap: 10, paddingHorizontal: SPACING.lg },
  classCard: { borderRadius: RADIUS.md, borderWidth: 0.5, padding: 14, width: 160 },
  classTimePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, alignSelf: 'flex-start', marginBottom: 8 },
  classTimeText: { fontSize: 10, fontFamily: FONT.bold },
  className: { fontSize: 14, fontFamily: FONT.bold, marginBottom: 2 },
  classTrainer: { fontSize: 11, fontFamily: FONT.regular, marginBottom: 6 },
  classSpots: { fontSize: 11, fontFamily: FONT.semibold, marginBottom: 8 },
  bookBtn: { paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  bookBtnText: { fontSize: 12, fontFamily: FONT.bold },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: { width: (W - SPACING.lg * 2 - 30) / 4, borderRadius: RADIUS.md, borderWidth: 0.5, padding: 12, alignItems: 'center', gap: 8 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontFamily: FONT.semibold, textAlign: 'center' },
})
