import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
// react-native-svg — fallback if native module not linked
let Svg = null
let Circle = null
let Defs = null
let LinearGradient = null
let Stop = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
} catch {}
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import Haptics from '../lib/haptics'
import { getItem, setItem, deleteItem } from '../lib/storage'
import api from '../lib/api'
import {
  showFastingNotification,
  dismissFastingNotification,
  startHydrationReminders,
  stopHydrationReminders,
  scheduleFastingReminder,
  cancelFastingReminder,
} from '../lib/NotificationEngine'
import { getFastingCaloriesBurned } from '../utils/healthMath'
import { useTheme } from '../context/ThemeContext'
import { recordFastingStart } from '../lib/SmartNotificationEngine'

const PROTOCOLS = [
  { label: '16:8', fastHours: 16, eatHours: 8 },
  { label: '18:6', fastHours: 18, eatHours: 6 },
  { label: '20:4', fastHours: 20, eatHours: 4 },
]

const STORAGE_KEY_START = 'fasting_start_time'
const STORAGE_KEY_PROTOCOL = 'fasting_protocol'
const STORAGE_KEY_REMINDER_TIME = 'fasting_reminder_time'
const STORAGE_KEY_REMINDER_ENABLED = 'fasting_reminder_enabled'

const RING_SIZE = 160
const STROKE_WIDTH = 8
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// --- Metabolic phases with hour boundaries ---
const PHASES = [
  { label: 'Sugar Burning', color: '#3B82F6', startHour: 0, endHour: 12 },
  { label: 'Fat Burning', color: '#F59E0B', startHour: 12, endHour: 16 },
  { label: 'Ketosis & Autophagy', color: '#8B5CF6', startHour: 16, endHour: 24 },
]

function getPhase(elapsedHours) {
  if (elapsedHours >= 16) return PHASES[2]
  if (elapsedHours >= 12) return PHASES[1]
  return PHASES[0]
}

function formatHHMMSS(totalMs) {
  const totalSec = Math.max(0, Math.floor(totalMs / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.floor(totalMinutes % 60)
  return `${h}h ${m}m`
}

// Build multi-phase arc segments for the colorful ring
function getPhaseArcs(elapsedHours, targetHours) {
  const arcs = []
  let cumulativeAngle = 0

  for (const phase of PHASES) {
    if (phase.startHour >= targetHours) break

    // Phase boundaries clamped to the protocol target
    const phaseStart = phase.startHour
    const phaseEnd = Math.min(phase.endHour, targetHours)
    const phaseDuration = phaseEnd - phaseStart

    // How much of this phase is filled
    const filledHours = Math.max(0, Math.min(elapsedHours - phaseStart, phaseDuration))
    if (filledHours <= 0) break

    // Convert to ring proportions
    const phaseRingFraction = phaseDuration / targetHours
    const filledFraction = filledHours / targetHours

    arcs.push({
      color: phase.color,
      startAngle: cumulativeAngle,
      filledFraction,
      totalFraction: phaseRingFraction,
    })

    cumulativeAngle += phaseRingFraction
  }

  return arcs
}

// Default body stats — overridden by saved nutrition profile when available
const DEFAULT_BODY = { weightKg: 75, heightCm: 175, ageYears: 28, gender: 'male' }

export default function FastingTimer({ gymId, memberId, navigation }) {
  const { colors, card } = useTheme()
  const [isFasting, setIsFasting] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [selectedProtocol, setSelectedProtocol] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reminderTime, setReminderTime] = useState(null) // "HH:MM" string
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [bodyStats, setBodyStats] = useState(DEFAULT_BODY)
  const [isManualModalVisible, setIsManualModalVisible] = useState(false)
  const [manualDate, setManualDate] = useState('') // YYYY-MM-DD
  const [manualStartHour, setManualStartHour] = useState('')
  const [manualStartMin, setManualStartMin] = useState('')
  const [manualEndHour, setManualEndHour] = useState('')
  const [manualEndMin, setManualEndMin] = useState('')
  const [savingManual, setSavingManual] = useState(false)
  const intervalRef = useRef(null)

  const protocol = PROTOCOLS[selectedProtocol]
  const fastMs = protocol.fastHours * 60 * 60 * 1000
  const elapsedHours = elapsedMs / 3600000
  const progress = Math.min(elapsedMs / fastMs, 1)
  const completed = elapsedHours >= protocol.fastHours
  const remainingMs = Math.max(fastMs - elapsedMs, 0)
  const phase = getPhase(elapsedHours)
  const phaseArcs = getPhaseArcs(elapsedHours, protocol.fastHours)

  // Load persisted fasting state — try backend first, fall back to local storage
  useEffect(() => {
    async function loadState() {
      try {
        if (gymId && memberId) {
          const res = await api.get(`/gyms/${gymId}/members/${memberId}/health/fasting/active`)
          if (res.data?.active && res.data.state) {
            const serverStart = new Date(res.data.state.start_time)
            if (!isNaN(serverStart.getTime())) {
              const protoLabel = res.data.state.protocol || '16:8'
              const protoIdx = PROTOCOLS.findIndex(p => p.label === protoLabel)
              setStartTime(serverStart)
              setIsFasting(true)
              if (protoIdx >= 0) setSelectedProtocol(protoIdx)
              await setItem(STORAGE_KEY_START, serverStart.toISOString()).catch(() => {})
              await setItem(STORAGE_KEY_PROTOCOL, String(protoIdx >= 0 ? protoIdx : 0)).catch(() => {})
              setLoading(false)
              return
            }
          }
        }
      } catch {}

      try {
        const stored = await getItem(STORAGE_KEY_START)
        const storedProto = await getItem(STORAGE_KEY_PROTOCOL)
        if (stored) {
          const parsed = new Date(stored)
          if (!isNaN(parsed.getTime())) {
            setStartTime(parsed)
            setIsFasting(true)
          }
        }
        if (storedProto !== null && storedProto !== undefined) {
          const idx = parseInt(storedProto, 10)
          if (idx >= 0 && idx < PROTOCOLS.length) setSelectedProtocol(idx)
        }
      } catch {}
      setLoading(false)
    }
    loadState()
  }, [gymId, memberId])

  // Load persisted reminder state
  useEffect(() => {
    async function loadReminder() {
      try {
        const storedTime = await getItem(STORAGE_KEY_REMINDER_TIME)
        const storedEnabled = await getItem(STORAGE_KEY_REMINDER_ENABLED)
        if (storedTime) setReminderTime(storedTime)
        if (storedEnabled === 'true' && storedTime) {
          setReminderEnabled(true)
          const [h, m] = storedTime.split(':').map(Number)
          scheduleFastingReminder(h, m).catch(() => {})
        }
      } catch {}
    }
    loadReminder()
  }, [])

  // Load body stats from nutrition profile
  useEffect(() => {
    getItem('ivira_nutrition_profile').then(v => {
      if (v) {
        try {
          const p = JSON.parse(v)
          setBodyStats({
            weightKg: p.weight || DEFAULT_BODY.weightKg,
            heightCm: p.height || DEFAULT_BODY.heightCm,
            ageYears: p.age || DEFAULT_BODY.ageYears,
            gender: p.gender || DEFAULT_BODY.gender,
          })
        } catch {}
      }
    }).catch(() => {})
  }, [])

  // Compute estimated calories burned
  const elapsedSec = elapsedMs / 1000
  const caloriesBurned = isFasting
    ? getFastingCaloriesBurned(bodyStats.weightKg, bodyStats.heightCm, bodyStats.ageYears, bodyStats.gender, elapsedSec)
    : 0

  // Real-time 1-second ticker
  const lastNotifMinute = useRef(-1)
  const lastNotifPhase = useRef(null)

  useEffect(() => {
    if (isFasting && startTime) {
      const tick = () => {
        const now = Date.now() - startTime.getTime()
        setElapsedMs(now)

        const hrs = now / 3600000
        const currentPhase = getPhase(hrs)
        const currentMinute = Math.floor(now / 60000)

        const phaseChanged = currentPhase.label !== lastNotifPhase.current
        const fiveMinPassed = currentMinute - lastNotifMinute.current >= 5

        if (phaseChanged || fiveMinPassed) {
          lastNotifMinute.current = currentMinute
          lastNotifPhase.current = currentPhase.label
          showFastingNotification(now, currentPhase.label).catch(() => {})
        }
      }

      const initMs = Date.now() - startTime.getTime()
      const initPhase = getPhase(initMs / 3600000)
      lastNotifMinute.current = Math.floor(initMs / 60000)
      lastNotifPhase.current = initPhase.label
      showFastingNotification(initMs, initPhase.label).catch(() => {})

      tick()
      intervalRef.current = setInterval(tick, 1000)
      return () => clearInterval(intervalRef.current)
    }
    setElapsedMs(0)
    lastNotifMinute.current = -1
    lastNotifPhase.current = null
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [isFasting, startTime])

  const handleStartFast = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const now = new Date()
    setStartTime(now)
    setIsFasting(true)

    try {
      await setItem(STORAGE_KEY_START, now.toISOString())
      await setItem(STORAGE_KEY_PROTOCOL, String(selectedProtocol))
    } catch {}

    if (gymId && memberId) {
      api.post(`/gyms/${gymId}/members/${memberId}/health/fasting/start`, {
        protocol: protocol.label,
        start_time: now.toISOString(),
      }).catch(() => {})
    }

    showFastingNotification(0, PHASES[0].label).catch(() => {})
    startHydrationReminders(protocol.fastHours).catch(() => {})
    recordFastingStart().catch(() => {})
  }, [selectedProtocol, protocol, gymId, memberId])

  const handleEndFast = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const endTime = new Date()
    const durationMinutes = Math.floor(elapsedMs / 60000)
    const didComplete = elapsedHours >= protocol.fastHours

    try {
      await api.post(`/gyms/${gymId}/members/${memberId}/health/fasting/log`, {
        protocol: protocol.label,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        completed: didComplete,
      })
      Alert.alert(
        'Fast Logged',
        `Duration: ${formatDuration(durationMinutes)}\n${didComplete ? 'Completed!' : 'Ended early'}`,
      )
    } catch {
      Alert.alert('Error', 'Failed to log fast. Please try again.')
    }

    setIsFasting(false)
    setStartTime(null)
    setElapsedMs(0)

    dismissFastingNotification().catch(() => {})
    stopHydrationReminders().catch(() => {})

    // Schedule a daily reminder at the time the user originally started this fast
    if (startTime) {
      const h = startTime.getHours()
      const m = startTime.getMinutes()
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      setReminderTime(timeStr)
      setReminderEnabled(true)
      try {
        await setItem(STORAGE_KEY_REMINDER_TIME, timeStr)
        await setItem(STORAGE_KEY_REMINDER_ENABLED, 'true')
      } catch {}
      scheduleFastingReminder(h, m).catch(() => {})
    }

    try {
      await deleteItem(STORAGE_KEY_START)
      await deleteItem(STORAGE_KEY_PROTOCOL)
    } catch {}
  }, [elapsedMs, elapsedHours, protocol, startTime, gymId, memberId])

  // Protocol switch — allowed mid-fast (upgrade only, keeps elapsed time)
  const handleProtocolSelect = useCallback(
    async (idx) => {
      if (idx === selectedProtocol) return
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      if (isFasting) {
        const newProtocol = PROTOCOLS[idx]
        const currentElapsedHours = elapsedMs / 3600000

        // Only allow switching to a longer or equal protocol
        // (can't switch to 16:8 if you're already 17h in on 18:6)
        if (newProtocol.fastHours <= currentElapsedHours) {
          Alert.alert(
            'Cannot Switch',
            `You've already fasted ${formatDuration(Math.floor(currentElapsedHours * 60))}. The ${newProtocol.label} target (${newProtocol.fastHours}h) is already reached.`,
          )
          return
        }

        // Confirm the switch
        Alert.alert(
          `Switch to ${newProtocol.label}?`,
          `Your ${formatDuration(Math.floor(currentElapsedHours * 60))} progress stays. New target: ${newProtocol.fastHours}h.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Switch',
              onPress: async () => {
                setSelectedProtocol(idx)

                // Persist new protocol
                try { await setItem(STORAGE_KEY_PROTOCOL, String(idx)) } catch {}

                // Update backend
                if (gymId && memberId) {
                  api.post(`/gyms/${gymId}/members/${memberId}/health/fasting/start`, {
                    protocol: newProtocol.label,
                    start_time: startTime.toISOString(),
                  }).catch(() => {})
                }

                // Reschedule hydration reminders for the new duration
                startHydrationReminders(newProtocol.fastHours).catch(() => {})
              },
            },
          ],
        )
      } else {
        setSelectedProtocol(idx)
      }
    },
    [isFasting, selectedProtocol, elapsedMs, startTime, gymId, memberId],
  )

  const handleToggleReminder = useCallback(async (value) => {
    setReminderEnabled(value)
    try {
      await setItem(STORAGE_KEY_REMINDER_ENABLED, value ? 'true' : 'false')
    } catch {}
    if (value && reminderTime) {
      const [h, m] = reminderTime.split(':').map(Number)
      scheduleFastingReminder(h, m).catch(() => {})
    } else {
      cancelFastingReminder().catch(() => {})
    }
  }, [reminderTime])

  const openManualModal = useCallback(() => {
    // Pre-fill with today's date and reasonable defaults
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    setManualDate(`${yyyy}-${mm}-${dd}`)
    setManualStartHour('20')
    setManualStartMin('00')
    setManualEndHour('12')
    setManualEndMin('00')
    setIsManualModalVisible(true)
  }, [])

  const handleSaveManualFast = useCallback(async () => {
    const sH = parseInt(manualStartHour, 10)
    const sM = parseInt(manualStartMin, 10)
    const eH = parseInt(manualEndHour, 10)
    const eM = parseInt(manualEndMin, 10)

    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) {
      Alert.alert('Invalid Time', 'Please enter valid hours and minutes.')
      return
    }
    if (sH < 0 || sH > 23 || eH < 0 || eH > 23 || sM < 0 || sM > 59 || eM < 0 || eM > 59) {
      Alert.alert('Invalid Time', 'Hours must be 0-23 and minutes 0-59.')
      return
    }

    // Build start and end dates
    const dateParts = manualDate.split('-').map(Number)
    if (dateParts.length !== 3) {
      Alert.alert('Invalid Date', 'Please enter a valid date.')
      return
    }
    const manualStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], sH, sM, 0)
    let manualEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], eH, eM, 0)

    // If end is before start, assume end is on the next day (overnight fast)
    if (manualEnd <= manualStart) {
      manualEnd = new Date(manualEnd.getTime() + 86400000)
    }

    // Sanity: must not be in the future
    if (manualEnd > new Date()) {
      Alert.alert('Invalid Time', 'End time cannot be in the future.')
      return
    }

    const durationMs = manualEnd - manualStart
    const durationMinutes = Math.floor(durationMs / 60000)
    const durationHours = durationMs / 3600000
    const didComplete = durationHours >= protocol.fastHours

    if (durationMinutes < 30) {
      Alert.alert('Too Short', 'A fast must be at least 30 minutes.')
      return
    }

    setSavingManual(true)
    try {
      await api.post(`/gyms/${gymId}/members/${memberId}/health/fasting/log`, {
        protocol: protocol.label,
        start_time: manualStart.toISOString(),
        end_time: manualEnd.toISOString(),
        duration_minutes: durationMinutes,
        completed: didComplete,
        manual: true,
      })
      Alert.alert('Fast Logged', `Duration: ${formatDuration(durationMinutes)}\n${didComplete ? 'Completed!' : 'Ended early'}`)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setIsManualModalVisible(false)
    } catch {
      Alert.alert('Error', 'Failed to log fast. Please try again.')
    } finally {
      setSavingManual(false)
    }
  }, [manualDate, manualStartHour, manualStartMin, manualEndHour, manualEndMin, protocol, gymId, memberId])

  if (loading) return null

  // Determine which pills can be selected mid-fast
  const canSwitchTo = (idx) => {
    if (!isFasting) return true
    const target = PROTOCOLS[idx]
    // Can switch to any protocol whose target hasn't been passed yet
    return target.fastHours > elapsedHours
  }

  return (
    <View style={[styles.card, { backgroundColor: card.backgroundColor, borderColor: card.borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="clock" size={18} color={isFasting ? phase.color : COLORS.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Intermittent Fasting</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            navigation?.navigate?.('FastingLog')
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
        >
          <Feather name="bar-chart-2" size={14} color={colors.textTer} />
          <Text style={{ color: colors.textTer, fontSize: 12, fontWeight: '500' }}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Protocol Pills — switchable mid-fast */}
      <View style={styles.pills}>
        {PROTOCOLS.map((p, idx) => {
          const active = idx === selectedProtocol
          const reachable = canSwitchTo(idx)
          return (
            <TouchableOpacity
              key={p.label}
              style={[
                styles.pill,
                active && styles.pillActive,
                isFasting && !active && reachable && styles.pillUpgrade,
                isFasting && !reachable && styles.pillDone,
              ]}
              onPress={() => handleProtocolSelect(idx)}
              disabled={!reachable && isFasting}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pillText,
                active && styles.pillTextActive,
                isFasting && !reachable && { color: COLORS.green },
              ]}>
                {p.label}
                {isFasting && !reachable && !active ? ' \u2713' : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Daily Reminder Toggle — shown when not fasting and a reminder time exists */}
      {!isFasting && reminderTime && (
        <View style={styles.reminderRow}>
          <Feather name="bell" size={14} color={COLORS.textSec} />
          <Text style={styles.reminderLabel}>Daily Reminder</Text>
          <Text style={styles.reminderTime}>{reminderTime}</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: COLORS.borderStrong, true: COLORS.accent + '66' }}
            thumbColor={reminderEnabled ? COLORS.accent : COLORS.textTer}
          />
        </View>
      )}

      {/* Multi-Phase Progress Ring */}
      <View style={styles.ringContainer}>
        {Svg && Circle ? (
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Gradient definitions */}
            {Defs && LinearGradient && Stop && (
              <Defs>
                <LinearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#1E1E1E" stopOpacity="1" />
                  <Stop offset="1" stopColor="#2A2A2A" stopOpacity="1" />
                </LinearGradient>
              </Defs>
            )}

            {/* Track ring — subtle gradient */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={Defs ? 'url(#trackGrad)' : COLORS.borderStrong}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />

            {/* Phase segment markers (thin ticks at 12h and 16h boundaries) */}
            {isFasting && PHASES.slice(1).map((p) => {
              if (p.startHour >= protocol.fastHours) return null
              const angle = (p.startHour / protocol.fastHours) * 360 - 90
              const rad = (angle * Math.PI) / 180
              const cx = RING_SIZE / 2 + RING_RADIUS * Math.cos(rad)
              const cy = RING_SIZE / 2 + RING_RADIUS * Math.sin(rad)
              return (
                <Circle
                  key={p.label}
                  cx={cx}
                  cy={cy}
                  r={2.5}
                  fill={elapsedHours >= p.startHour ? p.color : COLORS.borderStrong}
                />
              )
            })}

            {/* Multi-phase colored arcs */}
            {isFasting && phaseArcs.map((arc, i) => {
              const startOffset = arc.startAngle * CIRCUMFERENCE
              const filledLength = arc.filledFraction * CIRCUMFERENCE
              const gapLength = CIRCUMFERENCE - filledLength

              return (
                <Circle
                  key={i}
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={arc.color}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={`${filledLength} ${gapLength}`}
                  strokeDashoffset={-startOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              )
            })}

            {/* Completion glow overlay */}
            {completed && (
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="#22C55E"
                strokeWidth={STROKE_WIDTH + 3}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                opacity={0.3}
              />
            )}
          </Svg>
        ) : (
          // Fallback when SVG unavailable
          <View style={[styles.ringFallback, {
            borderColor: completed ? '#22C55E' : phase.color,
          }]} />
        )}

        {/* Center text overlay */}
        <View style={styles.ringContent}>
          {isFasting ? (
            <>
              <Text style={[styles.elapsed, { fontVariant: ['tabular-nums'], color: colors.text }]}>
                {formatHHMMSS(elapsedMs)}
              </Text>
              <Text style={[styles.statusLabel, { color: phase.color }]}>
                {phase.label}
              </Text>
            </>
          ) : (
            <>
              <Feather name="zap" size={28} color={colors.textTer} />
              <Text style={[styles.readyText, { color: colors.textTer }]}>Ready</Text>
            </>
          )}
        </View>
      </View>

      {/* Phase + Calories pills */}
      {isFasting && (
        <View style={styles.statPills}>
          <View style={[styles.statPill, { backgroundColor: phase.color + '18' }]}>
            <Text style={[styles.statPillText, { color: phase.color }]}>
              {'\uD83D\uDD25'} {phase.label}
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.statPillText, { color: colors.accent }]}>
              {'\u26A1\uFE0F'}{' '}
              <Text style={styles.statPillCalNum}>
                {caloriesBurned.toFixed(1)}
              </Text>
              {' kcal'}
            </Text>
          </View>
        </View>
      )}

      {/* Remaining time */}
      {isFasting && (
        <Text style={[styles.remaining, { color: colors.textSec }]}>
          {completed
            ? 'Goal reached!'
            : `${formatHHMMSS(remainingMs)} remaining`}
        </Text>
      )}

      {/* Phase indicator bar */}
      {isFasting && (
        <View style={styles.phaseBar}>
          {PHASES.map((p, i) => {
            if (p.startHour >= protocol.fastHours) return null
            const isCurrentPhase = p.label === phase.label
            const isPassed = elapsedHours >= p.endHour
            return (
              <View key={p.label} style={styles.phaseItem}>
                <View style={[
                  styles.phaseDot,
                  {
                    backgroundColor: (isCurrentPhase || isPassed) ? p.color : COLORS.borderStrong,
                  },
                  isPassed && !isCurrentPhase && { opacity: 0.5 },
                ]} />
                <Text style={[
                  styles.phaseText,
                  { color: (isCurrentPhase || isPassed) ? p.color : COLORS.textTer },
                  isCurrentPhase && { fontWeight: '700' },
                  isPassed && !isCurrentPhase && { opacity: 0.5 },
                ]}>
                  {i === 0 ? '0-12h' : i === 1 ? '12-16h' : '16h+'}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Start / End Button */}
      <TouchableOpacity
        style={[
          styles.button,
          isFasting && styles.buttonEnd,
          isFasting && { backgroundColor: phase.color + '20', borderColor: phase.color },
        ]}
        onPress={isFasting ? handleEndFast : handleStartFast}
        activeOpacity={0.8}
      >
        <Feather
          name={isFasting ? 'stop-circle' : 'play'}
          size={16}
          color={isFasting ? phase.color : COLORS.text}
          style={{ marginRight: SPACING.xs }}
        />
        <Text style={[styles.buttonText, isFasting && { color: phase.color }]}>
          {isFasting ? 'End Fast' : 'Start Fast'}
        </Text>
      </TouchableOpacity>

      {/* Manual entry link — only when not fasting */}
      {!isFasting && (
        <TouchableOpacity onPress={openManualModal} activeOpacity={0.6} style={styles.manualLink}>
          <Feather name="edit-3" size={12} color={colors.textTer} style={{ marginRight: 4 }} />
          <Text style={[styles.manualLinkText, { color: colors.textTer }]}>
            Forgot to track? Add manually.
          </Text>
        </TouchableOpacity>
      )}

      {/* Manual Fast Entry Modal */}
      <Modal
        visible={isManualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsManualModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsManualModalVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark !== false ? '#0B0F19' : colors.bgSec }]}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Log a Past Fast</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSec }]}>
              Enter the start and end times of your fast
            </Text>

            {/* Date */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>DATE</Text>
              <View style={[styles.modalInputRow, { borderColor: colors.border }]}>
                <Feather name="calendar" size={15} color={colors.textTer} />
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  value={manualDate}
                  onChangeText={setManualDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTer}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Start Time */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>START TIME</Text>
              <View style={styles.modalTimeRow}>
                <View style={[styles.modalTimeBox, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalTimeInput, { color: colors.text }]}
                    value={manualStartHour}
                    onChangeText={(t) => setManualStartHour(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="HH"
                    placeholderTextColor={colors.textTer}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
                <Text style={[styles.modalTimeColon, { color: colors.textTer }]}>:</Text>
                <View style={[styles.modalTimeBox, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalTimeInput, { color: colors.text }]}
                    value={manualStartMin}
                    onChangeText={(t) => setManualStartMin(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="MM"
                    placeholderTextColor={colors.textTer}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
                <Text style={[styles.modalTimeHint, { color: colors.textTer }]}>24h</Text>
              </View>
            </View>

            {/* End Time */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>END TIME</Text>
              <View style={styles.modalTimeRow}>
                <View style={[styles.modalTimeBox, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalTimeInput, { color: colors.text }]}
                    value={manualEndHour}
                    onChangeText={(t) => setManualEndHour(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="HH"
                    placeholderTextColor={colors.textTer}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
                <Text style={[styles.modalTimeColon, { color: colors.textTer }]}>:</Text>
                <View style={[styles.modalTimeBox, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalTimeInput, { color: colors.text }]}
                    value={manualEndMin}
                    onChangeText={(t) => setManualEndMin(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="MM"
                    placeholderTextColor={colors.textTer}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
                <Text style={[styles.modalTimeHint, { color: colors.textTer }]}>next day if earlier</Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.modalSaveBtn, savingManual && { opacity: 0.6 }]}
              onPress={handleSaveManualFast}
              disabled={savingManual}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalSaveBtnText}>
                {savingManual ? 'Saving...' : 'Save Fast'}
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setIsManualModalVisible(false)}
              style={styles.modalCancelBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.textTer }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  pills: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  pillUpgrade: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  pillDone: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  pillText: {
    color: COLORS.textSec,
    fontSize: 13,
    fontWeight: '600',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  reminderLabel: {
    color: COLORS.textSec,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  reminderTime: {
    color: COLORS.textTer,
    fontSize: 13,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    marginRight: SPACING.xs,
  },
  pillTextActive: {
    color: COLORS.accent,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ringContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringFallback: {
    width: RING_SIZE - STROKE_WIDTH * 2,
    height: RING_SIZE - STROKE_WIDTH * 2,
    borderRadius: (RING_SIZE - STROKE_WIDTH * 2) / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: COLORS.borderStrong,
  },
  elapsed: {
    color: COLORS.text,
    fontSize: 22,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  readyText: {
    color: COLORS.textTer,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  remaining: {
    color: COLORS.textSec,
    fontSize: 13,
    marginBottom: SPACING.sm,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  phaseBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    width: '100%',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonEnd: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  statPills: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statPillCalNum: {
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },

  // Manual entry link
  manualLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  manualLinkText: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 24,
  },
  modalField: {
    marginBottom: 18,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTimeBox: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    width: 56,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTimeInput: {
    fontSize: 20,
    fontFamily: FONT.numBold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    padding: 0,
    width: '100%',
  },
  modalTimeColon: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalTimeHint: {
    fontSize: 11,
    fontWeight: '400',
    marginLeft: 4,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
})
