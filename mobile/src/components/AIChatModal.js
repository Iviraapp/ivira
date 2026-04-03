/**
 * AIChatModal v2 — Vira AI
 *
 * Improvements over v1:
 *  1. Context-aware welcome message (streak, form score, check-in, sleep)
 *  2. Health + Circle context passed to /ai/coach on every message
 *  3. Quick prompt chips — contextual, disappear after first send
 *  4. Dynamic header subtitle (streak + today's status)
 *  5. VIRA brand avatar (not just ✨)
 *  6. Dynamic input placeholder based on day's data
 *  7. Today's snapshot card shown in empty chat
 *  8. Workout analyzer form scores piped in via AsyncStorage
 *  9. Proactive push notification helpers exported
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, Animated, Keyboard,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useHealth } from '../context/HealthContext'
import { COLORS, FONT, SPACING, RADIUS, FEATURE } from '../lib/theme'
import api from '../lib/api'

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator({ colors }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 280, useNativeDriver: true }),
        ])
      )
    )
    anims.forEach(a => a.start())
    return () => anims.forEach(a => a.stop())
  }, [])

  return (
    <View style={[s.aiBubble, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
      <View style={s.typingRow}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[s.typingDot, { backgroundColor: colors.textSec, transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  )
}

// ── Vira avatar — brand mark ──────────────────────────────────
function ViraAvatar() {
  return (
    <View style={s.viraAvatar}>
      <Text style={s.viraAvatarText}>V</Text>
    </View>
  )
}

// ── Today snapshot card (shown in empty chat) ─────────────────
function TodaySnapshot({ steps, calories, calorieGoal, sleepScore, streak, colors }) {
  const items = [
    steps > 0        && { icon: 'navigation', label: `${steps >= 1000 ? (steps/1000).toFixed(1)+'k' : steps} steps`, color: FEATURE.steps },
    calories > 0     && { icon: 'zap',        label: `${calories} / ${calorieGoal} kcal`, color: FEATURE.nutrition },
    sleepScore > 0   && { icon: 'moon',       label: `Sleep ${sleepScore}/100`, color: FEATURE.sleep },
    streak > 0       && { icon: 'trending-up',label: `${streak} day streak`, color: COLORS.warn },
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <View style={[s.snapshotCard, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
      <Text style={[s.snapshotLabel, { color: colors.textTer }]}>Today's snapshot</Text>
      <View style={s.snapshotRow}>
        {items.map((item, i) => (
          <View key={i} style={[s.snapshotItem, { backgroundColor: item.color + '15' }]}>
            <Feather name={item.icon} size={12} color={item.color} />
            <Text style={[s.snapshotText, { color: item.color }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── Quick prompt chips ────────────────────────────────────────
function buildChips({ steps, calories, calorieGoal, lastFormScore, streak, sleepScore, fastingHours, checkedInToday }) {
  const chips = []

  // Most contextual first
  if (lastFormScore && lastFormScore < 80) {
    chips.push(`Fix my ${lastFormScore < 70 ? 'form' : 'technique'} — I scored ${lastFormScore}`)
  }
  if (lastFormScore && lastFormScore >= 80) {
    chips.push('What exercise should I do next?')
  }
  if (calories > 0 && calories < calorieGoal * 0.5) {
    chips.push(`I'm at ${calories} kcal — what should I eat?`)
  }
  if (sleepScore && sleepScore < 70) {
    chips.push('I slept badly — should I still train?')
  }
  if (fastingHours && fastingHours > 0) {
    chips.push(`I'm ${fastingHours}h into my fast — tips?`)
  }
  if (checkedInToday) {
    chips.push('What should I eat post-workout?')
    chips.push('Best recovery for today\'s session')
  }
  if (streak >= 7) {
    chips.push(`I'm on a ${streak}-day streak — how do I keep it?`)
  }

  // Always-available fallbacks
  chips.push('Build me a workout plan')
  chips.push('What\'s best for fat loss?')
  chips.push('How do I improve my Circle rank?')
  chips.push('High protein meal ideas')

  // Return max 4 unique chips
  return [...new Set(chips)].slice(0, 4)
}

// ── Context-aware welcome message ────────────────────────────
function buildWelcome(member, context) {
  const name = (member?.name || '').split(' ')[0] || 'Champ'
  const { streak, lastFormScore, checkedInToday, sleepScore, calories, calorieGoal, circleRank } = context

  if (lastFormScore !== null && lastFormScore !== undefined) {
    if (lastFormScore >= 90) return `${lastFormScore}/100 on your last set — elite form, ${name}. What are we working on next?`
    if (lastFormScore >= 75) return `${lastFormScore}/100 on form — solid. Want drills to push that higher?`
    return `I saw your last set was ${lastFormScore}/100. I know exactly what to fix — just ask.`
  }
  if (streak >= 30) return `${streak} days, ${name}. That's top 1% discipline. What can I help with today?`
  if (streak >= 7)  return `${streak}-day streak 🔥 You're in the zone, ${name}. Workout, nutrition, or recovery?`
  if (checkedInToday) return `Good session today, ${name}. Recovery tips, nutrition, or planning tomorrow?`
  if (sleepScore && sleepScore < 65) return `Tough night, ${name}. ${sleepScore}/100 sleep — I can help you train smart today.`
  if (calories > 0 && calorieGoal > 0 && calories > calorieGoal * 0.9) return `You've fuelled well today, ${name}. Ready to talk training?`
  if (circleRank === 1) return `You're leading your Circle, ${name}. Let's keep that top spot.`
  if (circleRank > 1)   return `You're #${circleRank} in your Circle. Want to know what it takes to move up?`
  return `Hey ${name}. Workouts, nutrition, recovery, or your Circle — ask me anything.`
}

// ── Dynamic input placeholder ────────────────────────────────
function buildPlaceholder({ steps, calories, calorieGoal, lastFormScore }) {
  if (lastFormScore && lastFormScore < 80) return `Form score was ${lastFormScore} — ask me how to fix it...`
  if (calories > 0 && calories < calorieGoal * 0.4) return `You're at ${calories} kcal — ask me what to eat...`
  if (steps > 0 && steps < 5000) return `${steps} steps so far — ask me about staying active...`
  return 'Ask about workouts, diet, recovery...'
}

// ── Header subtitle ────────────────────────────────────────────
function buildSubtitle({ streak, checkedInToday, sleepScore, colors }) {
  if (checkedInToday && streak > 0) return `${streak}-day streak · Checked in today`
  if (checkedInToday) return 'Checked in today · Ready to help'
  if (sleepScore && sleepScore >= 80) return `Sleep score ${sleepScore} · Great recovery`
  if (streak > 0) return `${streak}-day streak · Keep it going`
  return 'Your AI fitness coach'
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function AIChatModal({ visible, onClose }) {
  const { colors, isDark } = useTheme()
  const { member, gymId, gymInfo } = useAuth()
  const { steps, sleepData } = useHealth()
  const insets = useSafeAreaInsets()

  // Health context state
  const [nutrition, setNutrition]         = useState({ calories: 0 })
  const [nutritionGoal, setNutritionGoal] = useState({ calories: 2000 })
  const [fastingHours, setFastingHours]   = useState(null)
  const [lastFormScore, setLastFormScore] = useState(null)
  const [lastExercise, setLastExercise]   = useState(null)
  const [lastFormIssues, setLastFormIssues] = useState([])
  const [lastFormTips, setLastFormTips]   = useState([])
  const [circleInfo, setCircleInfo]       = useState(null)
  const [checkedInToday, setCheckedInToday] = useState(false)
  const [contextReady, setContextReady]   = useState(false)

  // Chat state
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chipsVisible, setChipsVisible] = useState(true)
  const scrollRef = useRef(null)

  // Load all context when modal opens
  useEffect(() => {
    if (!visible) return
    loadContext()
  }, [visible])

  const loadContext = async () => {
    try {
      // Load nutrition
      if (gymId && member?.id) {
        const today = new Date().toISOString().split('T')[0]
        const [nutRes, goalRes, checkinRes, podRes] = await Promise.all([
          api.get(`/gyms/${gymId}/members/${member.id}/nutrition/daily?date=${today}`).catch(() => null),
          api.get(`/gyms/${gymId}/members/${member.id}/nutrition/goal`).catch(() => null),
          api.get(`/gyms/${gymId}/members/${member.id}/checkins?limit=1`).catch(() => null),
          api.get(`/gyms/${gymId}/members/${member.id}/pods`).catch(() => null),
        ])
        if (nutRes?.data?.totals) setNutrition(nutRes.data.totals)
        if (goalRes?.data) setNutritionGoal(goalRes.data)

        // Check if checked in today
        const checkins = checkinRes?.data || []
        const todayStr = new Date().toDateString()
        const todayCheckin = Array.isArray(checkins)
          ? checkins.some(c => new Date(c.created_at || c.timestamp).toDateString() === todayStr)
          : false
        setCheckedInToday(todayCheckin)

        // Circle info
        const pods = Array.isArray(podRes?.data) ? podRes.data : podRes?.data?.pods || []
        if (pods.length > 0) setCircleInfo(pods[0])
      }

      // Load fasting
      const fastStart = await AsyncStorage.getItem('fasting_start_time').catch(() => null)
      if (fastStart) {
        const h = Math.floor((Date.now() - parseInt(fastStart, 10)) / 3600000)
        setFastingHours(h > 0 ? h : null)
      }

      // Load last workout analyzer result
      const lastAnalysis = await AsyncStorage.getItem('vira_last_analysis').catch(() => null)
      if (lastAnalysis) {
        const parsed = JSON.parse(lastAnalysis)
        // Only use if within last 24h
        if (parsed?.timestamp && (Date.now() - parsed.timestamp) < 86400000) {
          setLastFormScore(parsed.form_score || null)
          setLastExercise(parsed.exercise || null)
          setLastFormIssues(parsed.issues || [])
          setLastFormTips(parsed.tips || [])
        }
      }
    } catch (e) {
      console.warn('[ViraAI] loadContext:', e?.message)
    } finally {
      setContextReady(true)
    }
  }

  // Build context object for API
  const buildContext = useCallback(() => ({
    member_name:            (member?.name || '').split(' ')[0],
    streak:                 member?.streak || 0,
    steps_today:            steps || 0,
    sleep_score:            sleepData?.score || null,
    sleep_hours:            sleepData?.durationMinutes ? +(sleepData.durationMinutes / 60).toFixed(1) : null,
    calories_today:         nutrition?.calories || 0,
    calorie_goal:           nutritionGoal?.calorie_goal || nutritionGoal?.calories || 2000,
    protein_today:          nutrition?.protein || 0,
    last_checkin_today:     checkedInToday,
    gym_name:               gymInfo?.name || null,
    gym_city:               gymInfo?.city || null,
    fasting_hours:          fastingHours,
    last_form_score:        lastFormScore,
    last_exercise:          lastExercise,
    last_form_issues:       lastFormIssues,
    last_form_tips:         lastFormTips,
    circle_name:            circleInfo?.name || null,
    circle_rank:            circleInfo?.city_rank || null,
    circle_points:          circleInfo?.my_points || null,
    circle_members_active:  circleInfo?.active_today || null,
  }), [member, steps, sleepData, nutrition, nutritionGoal, checkedInToday, gymInfo, fastingHours, lastFormScore, lastExercise, lastFormIssues, lastFormTips, circleInfo])

  // Set initial messages once context is ready
  useEffect(() => {
    if (!contextReady || !visible) return
    const ctx = buildContext()
    const welcome = buildWelcome(member, {
      streak:         ctx.streak,
      lastFormScore:  ctx.last_form_score,
      checkedInToday: ctx.last_checkin_today,
      sleepScore:     ctx.sleep_score,
      calories:       ctx.calories_today,
      calorieGoal:    ctx.calorie_goal,
      circleRank:     ctx.circle_rank,
    })
    setMessages([{ id: '0', role: 'ai', text: welcome }])
    setChipsVisible(true)
  }, [contextReady, visible])

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setMessages([])
      setInput('')
      setIsTyping(false)
      setContextReady(false)
      setChipsVisible(true)
    }
  }, [visible])

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || isTyping) return

    setInput('')
    setChipsVisible(false)
    Keyboard.dismiss()

    const userMsg = { id: Date.now().toString(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)
    scrollToBottom()

    try {
      const history = messages
        .filter(m => m.id !== '0')
        .slice(-16)
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))

      const res = await api.post('/ai/coach', {
        message: trimmed,
        history,
        context: buildContext(),
      })

      const aiText = res.data?.reply || 'Sorry, I couldn\'t generate a response. Please try again.'
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: aiText }])
    } catch (err) {
      const errText = err.response?.data?.message || 'Vira AI is temporarily unavailable. Check your connection.'
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: errText }])
    } finally {
      setIsTyping(false)
      scrollToBottom()
    }
  }

  const ctx = buildContext()
  const chips = buildChips({
    steps:          ctx.steps_today,
    calories:       ctx.calories_today,
    calorieGoal:    ctx.calorie_goal,
    lastFormScore:  ctx.last_form_score,
    streak:         ctx.streak,
    sleepScore:     ctx.sleep_score,
    fastingHours:   ctx.fasting_hours,
    checkedInToday: ctx.last_checkin_today,
  })
  const subtitle = buildSubtitle({
    streak: ctx.streak,
    checkedInToday: ctx.last_checkin_today,
    sleepScore: ctx.sleep_score,
    colors,
  })
  const placeholder = buildPlaceholder({
    steps:       ctx.steps_today,
    calories:    ctx.calories_today,
    calorieGoal: ctx.calorie_goal,
    lastFormScore: ctx.last_form_score,
  })

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.55)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kv}
        >
          <View style={[s.container, { backgroundColor: colors.bg }]}>

            {/* ── Header ── */}
            <View style={[s.header, { borderBottomColor: colors.border }]}>
              <View style={s.headerLeft}>
                <View style={[s.headerIconWrap, { backgroundColor: COLORS.accentSoft }]}>
                  <Text style={[s.headerIconText, { color: COLORS.accent }]}>V</Text>
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: colors.text }]}>Vira AI</Text>
                  <Text style={[s.headerSub, { color: colors.textSec }]}>{subtitle}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[s.closeBtn, { backgroundColor: colors.bgTer }]}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={colors.textSec} />
              </TouchableOpacity>
            </View>

            {/* ── Messages ── */}
            <ScrollView
              ref={scrollRef}
              style={s.msgList}
              contentContainerStyle={s.msgContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={scrollToBottom}
              showsVerticalScrollIndicator={false}
            >

              {messages.map((msg, idx) => (
                <View key={msg.id}>
                  <View style={[s.msgRow, msg.role === 'user' ? s.msgRowUser : s.msgRowAI]}>
                    {msg.role === 'ai' && <ViraAvatar />}
                    <View style={
                      msg.role === 'ai'
                        ? [s.aiBubble, { backgroundColor: colors.bgTer, borderColor: colors.border }]
                        : [s.userBubble, { backgroundColor: COLORS.accent }]
                    }>
                      <Text style={[s.msgText, { color: msg.role === 'ai' ? colors.text : '#07080f' }]}>
                        {msg.text}
                      </Text>
                    </View>
                  </View>

                  {/* Today snapshot after first AI message */}
                  {idx === 0 && msg.role === 'ai' && (
                    <TodaySnapshot
                      steps={ctx.steps_today}
                      calories={ctx.calories_today}
                      calorieGoal={ctx.calorie_goal}
                      sleepScore={ctx.sleep_score}
                      streak={ctx.streak}
                      colors={colors}
                    />
                  )}

                  {/* Quick chips after first AI message */}
                  {idx === 0 && msg.role === 'ai' && chipsVisible && (
                    <View style={s.chipsWrap}>
                      {chips.map((chip, ci) => (
                        <TouchableOpacity
                          key={ci}
                          style={[s.chip, { borderColor: colors.borderStrong, backgroundColor: colors.bgTer }]}
                          onPress={() => sendMessage(chip)}
                          activeOpacity={0.75}
                        >
                          <Text style={[s.chipText, { color: colors.textSec }]}>{chip}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {isTyping && (
                <View style={[s.msgRow, s.msgRowAI]}>
                  <ViraAvatar />
                  <TypingIndicator colors={colors} />
                </View>
              )}
            </ScrollView>

            {/* ── Disclaimer ── */}
            <View style={s.disclaimer}>
              <Feather name="shield" size={10} color={colors.textTer} />
              <Text style={[s.disclaimerText, { color: colors.textTer }]}>
                Not medical advice. Consult a doctor for health concerns.
              </Text>
            </View>

            {/* ── Input bar ── */}
            <View style={[s.inputBar, {
              borderTopColor: colors.border,
              backgroundColor: colors.bg,
              paddingBottom: Math.max(insets.bottom, 14),
            }]}>
              <TextInput
                style={[s.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
                placeholder={placeholder}
                placeholderTextColor={colors.textTer}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                onPress={() => sendMessage()}
                style={[s.sendBtn, { backgroundColor: input.trim() ? COLORS.accent : colors.bgTer }]}
                disabled={!input.trim() || isTyping}
                activeOpacity={0.75}
              >
                <Feather name="send" size={16} color={input.trim() ? '#07080f' : colors.textTer} />
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Proactive Vira push notification helpers
// Import and call these from SmartNotificationEngine.js
// ─────────────────────────────────────────────────────────────

let _Notifications = null
async function getNotifications() {
  if (_Notifications) return _Notifications
  try { _Notifications = (await import('expo-notifications')).default || await import('expo-notifications'); return _Notifications } catch { return null }
}

/**
 * Schedule a Vira recovery tip 30 min after check-in.
 * Call this from recordWorkout() in SmartNotificationEngine.
 */
export async function schedulePostCheckinRecovery(lastWorkoutType = 'workout') {
  const Notif = await getNotifications()
  if (!Notif) return
  const tips = {
    upper:  'Great upper body session! Stretch your chest & shoulders now — 30s each side.',
    lower:  'Legs done! Elevate them for 10 min and foam roll your quads tonight.',
    cardio: 'Cardio complete! Rehydrate with coconut water or nimbu pani — you earned it.',
    full:   'Full body day done. Eat within 45 min and aim for 8h sleep tonight.',
    default:'Good session! Recovery starts now — hydrate, stretch, and sleep well.',
  }
  const tip = tips[lastWorkoutType] || tips.default
  try {
    await Notif.scheduleNotificationAsync({
      identifier: 'vira-recovery',
      content: {
        title: 'Vira Recovery Tip',
        body: tip,
        ...(Platform.OS === 'android' && { channelId: 'vira-coach' }),
      },
      trigger: { type: 'timeInterval', seconds: 30 * 60, repeats: false },
    })
  } catch (e) { console.warn('[Vira]', e?.message) }
}

/**
 * Schedule a streak-at-risk notification at 11 PM if member hasn't checked in.
 * Call this from your daily scheduler or after login.
 */
export async function scheduleStreakAlert(streakDays = 0) {
  const Notif = await getNotifications()
  if (!Notif || streakDays < 2) return
  const body = streakDays >= 30
    ? `${streakDays} days on the line 🔥 Don't break it tonight. Quick check-in before midnight?`
    : streakDays >= 7
    ? `${streakDays}-day streak — don't lose it now. Tap to check in.`
    : `You've been consistent for ${streakDays} days. Keep it going today!`
  try {
    await Notif.scheduleNotificationAsync({
      identifier: 'vira-streak',
      content: {
        title: 'Streak Alert 🔥',
        body,
        ...(Platform.OS === 'android' && { channelId: 'vira-coach' }),
      },
      trigger: { type: 'daily', hour: 23, minute: 0, repeats: false },
    })
  } catch (e) { console.warn('[Vira]', e?.message) }
}

/**
 * Fire a Circle rank change notification immediately.
 * Call this when polling /pods/leaderboard detects a rank change.
 */
export async function notifyCircleRankChange(newRank, circleName = 'your Circle') {
  const Notif = await getNotifications()
  if (!Notif) return
  const body = newRank === 1
    ? `You're now #1 in ${circleName}! Defend that top spot.`
    : `Someone just passed you. You're #${newRank} in ${circleName} — push back!`
  try {
    await Notif.scheduleNotificationAsync({
      identifier: 'vira-circle',
      content: {
        title: 'Circle Update',
        body,
        ...(Platform.OS === 'android' && { channelId: 'vira-coach' }),
      },
      trigger: null,
    })
  } catch (e) { console.warn('[Vira]', e?.message) }
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1 },
  kv: { flex: 1 },
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconText: { fontSize: 20, fontFamily: FONT.extraBold },
  headerTitle: { fontSize: 16, fontFamily: FONT.bold },
  headerSub: { fontSize: 11, fontFamily: FONT.medium, marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Messages
  msgList: { flex: 1 },
  msgContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },

  // Vira avatar
  viraAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, marginBottom: 2, flexShrink: 0,
  },
  viraAvatarText: { fontSize: 14, fontFamily: FONT.extraBold, color: '#07080f' },

  // Bubbles
  aiBubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderTopLeftRadius: 4, borderWidth: 0.5,
  },
  userBubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomRightRadius: 4,
  },
  msgText: { fontSize: 14.5, fontFamily: FONT.regular, lineHeight: 22 },

  // Typing
  typingRow: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Today snapshot
  snapshotCard: {
    borderRadius: RADIUS.md, borderWidth: 0.5,
    padding: 12, marginBottom: 14, marginLeft: 36,
  },
  snapshotLabel: { fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  snapshotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  snapshotItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  snapshotText: { fontSize: 11, fontFamily: FONT.semibold },

  // Quick chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14, marginLeft: 36 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5 },
  chipText: { fontSize: 12, fontFamily: FONT.medium },

  // Disclaimer
  disclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5 },
  disclaimerText: { fontSize: 10, fontFamily: FONT.regular },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: 10,
    borderTopWidth: 0.5, gap: 10,
  },
  input: {
    flex: 1, height: 44, borderRadius: 22,
    paddingHorizontal: 16, fontSize: 15,
    fontFamily: FONT.regular, borderWidth: 0.5,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
