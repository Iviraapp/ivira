import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
  Animated,
  Platform,
  TextInput,
  Switch,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../lib/api'
import Haptics from '../lib/haptics'
import SleepEngine, {
  SleepStage, STAGE_COLORS, STAGE_LABELS, AudioEvent,
  startTracking, stopTracking, isTracking as checkIsTracking,
  getLiveData, setSmartAlarm, subscribe, getSleepHistory,
} from '../lib/sleepEngine'

// ── Extracted sub-components ────────────────────────────────────
import { SLEEP_COLORS, SLEEP_TIPS, QUALITY_EMOJIS, QUALITY_LABELS, SOUNDSCAPES, STORAGE_KEY_LOGS, STORAGE_KEY_GOAL } from './sleep/SleepConstants'
import {
  calcDurationMinutes, formatDuration, formatTime12, getDayLabel,
  calcSleepScore, computeInsights, computeSleepDebt,
  getWeeklyBarData, generateDemoData,
  mapBackendLog, buildBackendPayload, serializeTags, parseTags,
} from './sleep/SleepHelpers'
import ScoreRing from './sleep/ScoreRing'
import GradientHypnogram from './sleep/GradientHypnogram'
import QuickStatsRow from './sleep/QuickStatsRow'
import SleepDebtIndicator from './sleep/SleepDebtIndicator'
import SleepNotesModal, { TagChips } from './sleep/SleepNotesModal'
import SleepSoundscapes from './sleep/SleepSoundscapes'
import TrendsTab from './sleep/TrendsTab'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BAR_CHART_HEIGHT = 140
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Time Picker Modal ──────────────────────────────────────────
function TimePickerModal({ visible, onClose, onSelect, initialHour, initialMin, title, colors, card }) {
  const [selectedHour, setSelectedHour] = useState(initialHour)
  const [selectedMin, setSelectedMin] = useState(initialMin)
  const [isPM, setIsPM] = useState(initialHour >= 12)

  useEffect(() => {
    if (visible) {
      setSelectedHour(initialHour)
      setSelectedMin(initialMin)
      setIsPM(initialHour >= 12)
    }
  }, [visible, initialHour, initialMin])

  const displayHour = selectedHour % 12 || 12

  const adjustHour = (delta) => {
    const newDisplay = ((displayHour - 1 + delta + 12) % 12) + 1
    setSelectedHour(isPM ? (newDisplay === 12 ? 12 : newDisplay + 12) : (newDisplay === 12 ? 0 : newDisplay))
  }

  const adjustMin = (delta) => {
    setSelectedMin((prev) => ((prev + delta + 60) % 60))
  }

  const toggleAMPM = () => {
    setIsPM(!isPM)
    setSelectedHour(prev => isPM ? (prev - 12 + 24) % 24 : (prev + 12) % 24)
  }

  const handleDone = () => {
    onSelect(selectedHour, selectedMin)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={tpStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[tpStyles.container, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <Text style={[tpStyles.title, { color: colors.text, fontFamily: FONT.semibold }]}>{title}</Text>

          <View style={tpStyles.pickerRow}>
            {/* Hour */}
            <View style={tpStyles.pickerCol}>
              <TouchableOpacity onPress={() => adjustHour(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-up" size={28} color={colors.textSec} />
              </TouchableOpacity>
              <View style={[tpStyles.valueBox, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                <Text style={[tpStyles.valueText, { color: colors.text, fontFamily: FONT.numBold }]}>
                  {displayHour.toString().padStart(2, '0')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => adjustHour(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-down" size={28} color={colors.textSec} />
              </TouchableOpacity>
            </View>

            <Text style={[tpStyles.colon, { color: colors.text, fontFamily: FONT.numBold }]}>:</Text>

            {/* Minute */}
            <View style={tpStyles.pickerCol}>
              <TouchableOpacity onPress={() => adjustMin(5)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-up" size={28} color={colors.textSec} />
              </TouchableOpacity>
              <View style={[tpStyles.valueBox, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                <Text style={[tpStyles.valueText, { color: colors.text, fontFamily: FONT.numBold }]}>
                  {selectedMin.toString().padStart(2, '0')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => adjustMin(-5)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-down" size={28} color={colors.textSec} />
              </TouchableOpacity>
            </View>

            {/* AM/PM */}
            <TouchableOpacity
              style={[tpStyles.ampmBtn, { backgroundColor: SLEEP_COLORS.primary + '20', borderColor: SLEEP_COLORS.primary + '40' }]}
              onPress={toggleAMPM}
            >
              <Text style={[tpStyles.ampmText, { color: SLEEP_COLORS.primary, fontFamily: FONT.semibold }]}>
                {isPM ? 'PM' : 'AM'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={tpStyles.actions}>
            <TouchableOpacity style={[tpStyles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[tpStyles.cancelText, { color: colors.textSec, fontFamily: FONT.medium }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tpStyles.doneBtn, { backgroundColor: SLEEP_COLORS.primary }]} onPress={handleDone}>
              <Text style={[tpStyles.doneText, { fontFamily: FONT.semibold }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH - 48,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pickerCol: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  valueBox: {
    width: 64,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  valueText: {
    fontSize: 28,
  },
  colon: {
    fontSize: 28,
    marginBottom: 4,
  },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginLeft: SPACING.sm,
  },
  ampmText: {
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15 },
  doneBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  doneText: { fontSize: 15, color: '#fff' },
})

// ── Goal Input Modal ───────────────────────────────────────────
function GoalModal({ visible, onClose, onSave, currentGoal, colors }) {
  const [value, setValue] = useState(String(currentGoal))

  useEffect(() => {
    if (visible) setValue(String(currentGoal))
  }, [visible, currentGoal])

  const handleSave = () => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 4 && num <= 12) {
      onSave(num)
      onClose()
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={tpStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[tpStyles.container, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <Text style={[tpStyles.title, { color: colors.text, fontFamily: FONT.semibold }]}>Sleep Goal</Text>
          <Text style={{ color: colors.textSec, textAlign: 'center', marginBottom: SPACING.md, fontFamily: FONT.regular, fontSize: 14 }}>
            Set your target sleep hours (4-12)
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg }}>
            <TextInput
              style={{
                width: 80,
                height: 56,
                borderRadius: RADIUS.md,
                backgroundColor: colors.bgTer,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontSize: 28,
                fontFamily: FONT.numBold,
                textAlign: 'center',
              }}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              maxLength={4}
              selectTextOnFocus
            />
            <Text style={{ color: colors.textSec, fontSize: 18, marginLeft: SPACING.sm, fontFamily: FONT.medium }}>hours</Text>
          </View>
          <View style={tpStyles.actions}>
            <TouchableOpacity style={[tpStyles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[tpStyles.cancelText, { color: colors.textSec, fontFamily: FONT.medium }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tpStyles.doneBtn, { backgroundColor: SLEEP_COLORS.primary }]} onPress={handleSave}>
              <Text style={[tpStyles.doneText, { fontFamily: FONT.semibold }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

// ── Weekly Bar Chart ───────────────────────────────────────────
function WeeklyBarChart({ data, goalHours, colors }) {
  const maxHours = Math.max(10, ...data.map(d => d.hours))
  const targetY = (1 - goalHours / maxHours) * BAR_CHART_HEIGHT
  const barAnimations = useRef(data.map(() => new Animated.Value(0))).current

  useEffect(() => {
    barAnimations.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: data[i].hours,
        duration: 800,
        delay: i * 80,
        useNativeDriver: false,
      }).start()
    })
  }, [data])

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.area}>
        {/* Goal line */}
        <View style={[chartStyles.goalLine, { top: targetY }]}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 1.5,
                backgroundColor: i % 2 === 0 ? SLEEP_COLORS.primary + '60' : 'transparent',
              }}
            />
          ))}
        </View>
        <Text style={[chartStyles.goalLabel, { color: SLEEP_COLORS.light, top: targetY - 16, fontFamily: FONT.numMedium }]}>
          {goalHours}h goal
        </Text>

        {/* Bars */}
        <View style={chartStyles.barsRow}>
          {data.map((bar, idx) => {
            const barHeight = barAnimations[idx].interpolate({
              inputRange: [0, maxHours],
              outputRange: [0, BAR_CHART_HEIGHT],
              extrapolate: 'clamp',
            })
            const barColor = bar.hours === 0
              ? colors.border
              : bar.hours >= goalHours
                ? '#22C55E'
                : bar.hours >= goalHours - 1
                  ? SLEEP_COLORS.primary
                  : '#F59E0B'

            return (
              <View key={idx} style={chartStyles.barCol}>
                <View style={chartStyles.barWrapper}>
                  <Animated.View
                    style={{
                      height: bar.hours > 0 ? barHeight : 3,
                      backgroundColor: barColor,
                      borderRadius: 5,
                      width: 28,
                      minHeight: bar.hours > 0 ? 4 : 3,
                    }}
                  />
                  {bar.hours > 0 && (
                    <Text style={[chartStyles.barValue, { color: colors.textTer, fontFamily: FONT.numMedium }]}>
                      {bar.hours.toFixed(1)}
                    </Text>
                  )}
                </View>
                <Text style={[chartStyles.barLabel, { color: colors.textTer, fontFamily: FONT.medium }]}>
                  {bar.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const chartStyles = StyleSheet.create({
  container: { marginTop: SPACING.sm },
  area: { height: BAR_CHART_HEIGHT + 40, position: 'relative' },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 11,
    zIndex: 2,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: BAR_CHART_HEIGHT,
    paddingHorizontal: SPACING.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: BAR_CHART_HEIGHT,
  },
  barValue: {
    fontSize: 10,
    marginTop: 2,
    position: 'absolute',
    top: -14,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 6,
  },
})

// ── Log Entry Card ─────────────────────────────────────────────
function SleepLogEntry({ log, colors, card, goalHours, allLogs }) {
  const duration = calcDurationMinutes(log.bedHour, log.bedMin, log.wakeHour, log.wakeMin)
  const score = calcSleepScore(log, allLogs, goalHours)
  const scoreColor = score >= 80 ? '#22C55E' : score >= 60 ? SLEEP_COLORS.primary : score >= 40 ? '#F59E0B' : '#EA4335'

  return (
    <View style={[styles.logCard, { ...card }]}>
      <View style={styles.logHeader}>
        <View>
          <Text style={[styles.logDate, { color: colors.text, fontFamily: FONT.semibold }]}>
            {getDayLabel(log.date)}
          </Text>
          <Text style={[styles.logDay, { color: colors.textTer, fontFamily: FONT.regular }]}>
            {new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
        </View>
        <View style={styles.logHeaderRight}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '40' }]}>
            <Text style={[styles.scoreBadgeText, { color: scoreColor, fontFamily: FONT.numSemibold }]}>{score}</Text>
          </View>
        </View>
      </View>

      <View style={styles.logBody}>
        <View style={styles.logStat}>
          <Feather name="moon" size={14} color={SLEEP_COLORS.primary} />
          <Text style={[styles.logStatText, { color: colors.text, fontFamily: FONT.numMedium }]}>
            {formatTime12(log.bedHour, log.bedMin)}
          </Text>
        </View>
        <View style={styles.logStat}>
          <Feather name="sunrise" size={14} color={SLEEP_COLORS.moon} />
          <Text style={[styles.logStatText, { color: colors.text, fontFamily: FONT.numMedium }]}>
            {formatTime12(log.wakeHour, log.wakeMin)}
          </Text>
        </View>
        <View style={styles.logStat}>
          <Feather name="clock" size={14} color={colors.textSec} />
          <Text style={[styles.logStatText, { color: colors.textSec, fontFamily: FONT.numMedium }]}>
            {formatDuration(duration)}
          </Text>
        </View>
        <Text style={{ fontSize: 18, marginLeft: 'auto' }}>
          {QUALITY_EMOJIS[log.quality - 1]}
        </Text>
      </View>
    </View>
  )
}

// ── Hypnogram (fallback for engine data) ────────────────────────
function Hypnogram({ epochs, colors, width: chartWidth }) {
  if (!epochs || epochs.length === 0) return null

  const GRAPH_HEIGHT = 120
  const stageY = {
    [SleepStage.AWAKE]: 10,
    [SleepStage.REM]: 35,
    [SleepStage.LIGHT]: 65,
    [SleepStage.DEEP]: 100,
  }

  const w = chartWidth || SCREEN_WIDTH - SPACING.md * 2 - SPACING.lg * 2
  const barWidth = Math.max(2, w / epochs.length)

  return (
    <View style={{ marginTop: SPACING.sm }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 40, height: GRAPH_HEIGHT, justifyContent: 'space-between', paddingVertical: 4 }}>
          {['Awake', 'REM', 'Light', 'Deep'].map(label => (
            <Text key={label} style={{ fontSize: 9, color: colors.textTer, fontFamily: FONT.medium, textAlign: 'right' }}>
              {label}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, height: GRAPH_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', overflow: 'hidden' }}>
          {epochs.map((epoch, i) => {
            const y = stageY[epoch.stage] || 65
            const color = STAGE_COLORS[epoch.stage] || SLEEP_COLORS.light
            return (
              <View
                key={i}
                style={{
                  width: barWidth,
                  height: y,
                  backgroundColor: color,
                  borderTopLeftRadius: 1,
                  borderTopRightRadius: 1,
                  opacity: 0.85,
                }}
              />
            )
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 40, marginTop: 4 }}>
        {epochs.length > 0 && (
          <>
            <Text style={{ fontSize: 9, color: colors.textTer, fontFamily: FONT.numMedium }}>
              {new Date(epochs[0].time || epochs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={{ fontSize: 9, color: colors.textTer, fontFamily: FONT.numMedium }}>
              {new Date(epochs[epochs.length - 1].time || epochs[epochs.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}

// ── Stage Breakdown Bar ───────────────────────────────────────
function StageBreakdown({ stageDurations, totalMs, colors }) {
  const total = Object.values(stageDurations).reduce((a, b) => a + b, 0) || 1
  const stages = [
    { key: SleepStage.DEEP, label: 'Deep', color: STAGE_COLORS[SleepStage.DEEP] },
    { key: SleepStage.REM, label: 'REM', color: STAGE_COLORS[SleepStage.REM] },
    { key: SleepStage.LIGHT, label: 'Light', color: STAGE_COLORS[SleepStage.LIGHT] },
    { key: SleepStage.AWAKE, label: 'Awake', color: STAGE_COLORS[SleepStage.AWAKE] },
  ]

  return (
    <View style={{ marginTop: SPACING.md }}>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        {stages.map(s => {
          const pct = (stageDurations[s.key] || 0) / total * 100
          if (pct < 0.5) return null
          return <View key={s.key} style={{ width: `${pct}%`, backgroundColor: s.color }} />
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm, gap: SPACING.md }}>
        {stages.map(s => {
          const mins = Math.round((stageDurations[s.key] || 0) / 60000)
          const pct = Math.round((stageDurations[s.key] || 0) / total * 100)
          return (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text style={{ fontSize: 11, color: colors.textSec, fontFamily: FONT.medium }}>
                {s.label}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.numMedium }}>
                {mins}m ({pct}%)
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Audio Events Timeline ─────────────────────────────────────
function AudioEventsCard({ events, colors, card }) {
  if (!events || events.length === 0) return null

  const ICONS = {
    [AudioEvent.SNORING]: { icon: 'volume-2', color: '#F59E0B', label: 'Snoring' },
    [AudioEvent.COUGHING]: { icon: 'alert-circle', color: '#EA4335', label: 'Coughing' },
    [AudioEvent.TALKING]: { icon: 'message-circle', color: '#6C63FF', label: 'Talking' },
    [AudioEvent.NOISE]: { icon: 'volume-1', color: '#94A3B8', label: 'Noise' },
  }

  return (
    <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md }}>
        <Feather name="mic" size={16} color={SLEEP_COLORS.primary} />
        <Text style={{ fontSize: 17, color: colors.text, fontFamily: FONT.semibold }}>Audio Events</Text>
        <View style={{ marginLeft: 'auto', backgroundColor: SLEEP_COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full }}>
          <Text style={{ fontSize: 11, color: SLEEP_COLORS.primary, fontFamily: FONT.numSemibold }}>{events.length}</Text>
        </View>
      </View>
      {events.slice(0, 10).map((event, idx) => {
        const info = ICONS[event.type] || ICONS[AudioEvent.NOISE]
        return (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: SPACING.sm, borderBottomWidth: idx < Math.min(events.length, 10) - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: info.color + '15', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name={info.icon} size={13} color={info.color} />
            </View>
            <Text style={{ fontSize: 13, color: colors.text, fontFamily: FONT.medium }}>{info.label}</Text>
            <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.numMedium, marginLeft: 'auto' }}>
              {new Date(event.time || event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ── Live Tracking View ────────────────────────────────────────
function LiveTrackingView({ colors, card, isDark, navigation, gymId, memberId, onSaveTags }) {
  const [tracking, setTracking] = useState(checkIsTracking())
  const [liveData, setLiveData] = useState(getLiveData())
  const [report, setReport] = useState(null)
  const [enableAudio, setEnableAudio] = useState(true)
  const [showAlarmPicker, setShowAlarmPicker] = useState(false)
  const [alarmHour, setAlarmHour] = useState(7)
  const [alarmMin, setAlarmMin] = useState(0)
  const [useSmartAlarm, setUseSmartAlarm] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [reportTags, setReportTags] = useState([])
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseAnim2 = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const unsub = subscribe((data) => {
      setLiveData(data)
      setTracking(data?.isTracking || false)
    })
    return unsub
  }, [])

  // Double-pulse animation when tracking
  useEffect(() => {
    if (tracking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      )
      const pulse2 = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim2, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim2, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
        ])
      )
      pulse.start()
      pulse2.start()
      return () => { pulse.stop(); pulse2.stop() }
    }
  }, [tracking])

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    let alarmTime = null
    if (useSmartAlarm) {
      const now = new Date()
      alarmTime = new Date(now)
      alarmTime.setDate(alarmTime.getDate() + 1)
      alarmTime.setHours(alarmHour, alarmMin, 0, 0)
      if (alarmTime - now > 16 * 60 * 60 * 1000) {
        alarmTime.setDate(alarmTime.getDate() - 1)
      }
    }
    await startTracking({ alarmTime, enableAudio })
    setTracking(true)
  }

  const handleStop = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const sleepReport = await stopTracking()
    setReport(sleepReport)
    setTracking(false)

    // Sync rich sleep data to backend
    if (sleepReport && gymId && memberId) {
      try {
        await api.post(`/gyms/${gymId}/members/${memberId}/sleep`, {
          bedtime: sleepReport.bedtime,
          wake_time: sleepReport.wakeTime,
          quality_rating: Math.min(5, Math.max(1, Math.round(sleepReport.score / 20))),
          notes: `IVIRA Engine: ${sleepReport.cycles} cycles, ${sleepReport.efficiency}% efficiency`,
          deep_minutes: Math.round(sleepReport.stageDurations.deep),
          rem_minutes: Math.round(sleepReport.stageDurations.rem),
          light_minutes: Math.round(sleepReport.stageDurations.light),
          awake_minutes: Math.round(sleepReport.stageDurations.awake),
          efficiency: sleepReport.efficiency,
          onset_latency: sleepReport.onsetLatency,
          awakenings: sleepReport.awakenings,
          sleep_cycles: sleepReport.cycles,
          snoring_minutes: sleepReport.audioSummary?.snoringMinutes || 0,
          audio_events_count: sleepReport.audioSummary?.totalEvents || 0,
          stage_timeline: sleepReport.stageTimeline,
          audio_events: sleepReport.audioEvents,
          source: 'ivira_engine',
        })
      } catch (err) {
        console.warn('Failed to sync engine report:', err.message)
      }
    }
  }

  const elapsed = liveData?.elapsedMs || 0
  const elapsedH = Math.floor(elapsed / 3600000)
  const elapsedM = Math.floor((elapsed % 3600000) / 60000)
  const elapsedS = Math.floor((elapsed % 60000) / 1000)

  const nightGradientBg = isDark ? 'rgba(108,99,255,0.06)' : 'rgba(108,99,255,0.04)'

  // ── Sleep Report View ───────────────────────────────
  if (report && !tracking) {
    const scoreColor = report.score >= 80 ? '#22C55E' : report.score >= 60 ? SLEEP_COLORS.primary : report.score >= 40 ? '#F59E0B' : '#EA4335'

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl }}>
        {/* Score Hero */}
        <View style={[{ padding: SPACING.xl, marginBottom: SPACING.md, alignItems: 'center' }, card]}>
          <Text style={{ fontSize: 13, color: colors.textSec, fontFamily: FONT.medium, marginBottom: SPACING.sm }}>
            Sleep Report
          </Text>
          <ScoreRing score={report.score} size={160} label={report.score >= 85 ? 'Excellent' : report.score >= 70 ? 'Good' : report.score >= 50 ? 'Fair' : 'Poor'} />

          {/* Quick Stats Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginTop: SPACING.lg }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.medium }}>Duration</Text>
              <Text style={{ fontSize: 18, color: colors.text, fontFamily: FONT.numBold }}>{formatDuration(report.totalMinutes)}</Text>
            </View>
            <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.medium }}>Efficiency</Text>
              <Text style={{ fontSize: 18, color: colors.text, fontFamily: FONT.numBold }}>{report.efficiency}%</Text>
            </View>
            <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.medium }}>Cycles</Text>
              <Text style={{ fontSize: 18, color: colors.text, fontFamily: FONT.numBold }}>{report.cycles}</Text>
            </View>
          </View>
        </View>

        {/* SVG Hypnogram */}
        <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
          <Text style={{ fontSize: 17, color: colors.text, fontFamily: FONT.semibold, marginBottom: SPACING.sm }}>
            Sleep Stages
          </Text>
          {report.stageTimeline && report.stageTimeline.length > 2 ? (
            <GradientHypnogram
              epochs={report.stageTimeline}
              width={SCREEN_WIDTH - SPACING.md * 2 - SPACING.lg * 2}
              startTime={report.bedtime}
              endTime={report.wakeTime}
              colors={colors}
            />
          ) : (
            <Hypnogram epochs={report.stageTimeline} colors={colors} />
          )}
          <StageBreakdown stageDurations={report.stageDurations} totalMs={report.totalMinutes * 60000} colors={colors} />
        </View>

        {/* Detailed Metrics */}
        <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
          <Text style={{ fontSize: 17, color: colors.text, fontFamily: FONT.semibold, marginBottom: SPACING.md }}>
            Details
          </Text>
          <View style={{ gap: SPACING.sm }}>
            {[
              { icon: 'clock', label: 'Time to fall asleep', value: `${report.onsetLatency} min`, color: report.onsetLatency <= 15 ? '#22C55E' : '#F59E0B' },
              { icon: 'eye-off', label: 'Awakenings', value: String(report.awakenings), color: report.awakenings <= 2 ? '#22C55E' : '#F59E0B' },
              { icon: 'moon', label: 'Bedtime', value: new Date(report.bedtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: SLEEP_COLORS.primary },
              { icon: 'sunrise', label: 'Wake time', value: new Date(report.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: SLEEP_COLORS.moon },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border }}>
                <Feather name={item.icon} size={16} color={item.color} />
                <Text style={{ fontSize: 14, color: colors.textSec, fontFamily: FONT.medium, marginLeft: SPACING.sm, flex: 1 }}>{item.label}</Text>
                <Text style={{ fontSize: 15, color: colors.text, fontFamily: FONT.numSemibold }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Audio Events */}
        <AudioEventsCard events={report.audioEvents} colors={colors} card={card} />

        {/* Sleep Notes */}
        <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
          <Text style={{ fontSize: 15, color: colors.text, fontFamily: FONT.semibold, marginBottom: SPACING.sm }}>
            Sleep Notes
          </Text>
          <TagChips tags={reportTags} onPress={() => setShowNotesModal(true)} />
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: SLEEP_COLORS.primary, marginBottom: SPACING.xl }}
          onPress={() => {
            if (onSaveTags && reportTags.length > 0) onSaveTags(reportTags)
            setReport(null)
          }}
        >
          <Feather name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONT.semibold }}>Done</Text>
        </TouchableOpacity>

        <SleepNotesModal
          visible={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          onSave={setReportTags}
          initialTags={reportTags}
        />
      </ScrollView>
    )
  }

  // ── Active Tracking View ────────────────────────────
  if (tracking) {
    const currentStage = liveData?.currentStage || SleepStage.AWAKE
    const stageColor = STAGE_COLORS[currentStage]

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl }}>
        {/* Tracking Hero with double pulse */}
        <View style={[{ padding: SPACING.xl, marginBottom: SPACING.md, alignItems: 'center' }, card]}>
          <View style={{ position: 'relative', width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>
            {/* Outer pulse ring */}
            <Animated.View style={{
              position: 'absolute', width: 140, height: 140, borderRadius: 70,
              borderWidth: 2, borderColor: stageColor + '30',
              opacity: pulseAnim2, transform: [{ scale: pulseAnim }],
            }} />
            {/* Inner circle */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={{
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: stageColor + '15',
                borderWidth: 3, borderColor: stageColor + '40',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Feather name="moon" size={32} color={stageColor} />
                <Text style={{ fontSize: 11, color: stageColor, fontFamily: FONT.semibold, marginTop: 4 }}>
                  {STAGE_LABELS[currentStage]}
                </Text>
              </View>
            </Animated.View>
          </View>

          <Text style={{ fontSize: 13, color: colors.textSec, fontFamily: FONT.medium, marginTop: SPACING.lg }}>
            Tracking sleep...
          </Text>
          <Text style={{ fontSize: 36, color: colors.text, fontFamily: FONT.numBold, marginTop: SPACING.xs }}>
            {String(elapsedH).padStart(2, '0')}:{String(elapsedM).padStart(2, '0')}:{String(elapsedS).padStart(2, '0')}
          </Text>

          {liveData?.alarmTime && !liveData.alarmTriggered && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, backgroundColor: SLEEP_COLORS.moon + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full }}>
              <Feather name="bell" size={13} color={SLEEP_COLORS.moon} />
              <Text style={{ fontSize: 12, color: SLEEP_COLORS.moon, fontFamily: FONT.numMedium }}>
                Smart alarm at {new Date(liveData.alarmTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {liveData?.alarmTriggered && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, backgroundColor: '#22C55E15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full }}>
              <Feather name="check-circle" size={13} color="#22C55E" />
              <Text style={{ fontSize: 12, color: '#22C55E', fontFamily: FONT.medium }}>Smart alarm triggered!</Text>
            </View>
          )}
        </View>

        {/* Live SVG Hypnogram */}
        {liveData?.epochs?.length > 2 && (
          <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
            <Text style={{ fontSize: 15, color: colors.text, fontFamily: FONT.semibold, marginBottom: SPACING.xs }}>
              Live Sleep Stages
            </Text>
            <GradientHypnogram
              epochs={liveData.epochs}
              width={SCREEN_WIDTH - SPACING.md * 2 - SPACING.lg * 2}
              colors={colors}
            />
          </View>
        )}

        {/* Stage Summary */}
        {liveData?.stageDurations && (
          <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
            <StageBreakdown stageDurations={liveData.stageDurations} totalMs={elapsed} colors={colors} />
          </View>
        )}

        {/* Audio Events */}
        {liveData?.audioEvents?.length > 0 && (
          <AudioEventsCard events={liveData.audioEvents} colors={colors} card={card} />
        )}

        {/* Stop Button */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: RADIUS.lg, backgroundColor: '#EA4335', marginTop: SPACING.sm }}
          onPress={handleStop}
        >
          <Feather name="square" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONT.semibold }}>Stop Tracking</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // ── Pre-Tracking Setup View ─────────────────────────
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl }}>
      {/* Hero */}
      <View style={[{ padding: SPACING.xl, marginBottom: SPACING.md, alignItems: 'center' }, card]}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: SLEEP_COLORS.primary + '12',
          justifyContent: 'center', alignItems: 'center',
          marginBottom: SPACING.md,
        }}>
          <Feather name="moon" size={36} color={SLEEP_COLORS.primary} />
        </View>
        <Text style={{ fontSize: 20, color: colors.text, fontFamily: FONT.semibold, marginBottom: 4 }}>
          Sleep Tracking
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSec, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 19 }}>
          Place your phone on the mattress. IVIRA uses motion sensors and audio to track sleep stages in real-time.
        </Text>
      </View>

      {/* Soundscapes */}
      <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
        <SleepSoundscapes colors={colors} />
      </View>

      {/* Smart Alarm */}
      <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SLEEP_COLORS.moon + '15', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="bell" size={16} color={SLEEP_COLORS.moon} />
            </View>
            <View>
              <Text style={{ fontSize: 15, color: colors.text, fontFamily: FONT.semibold }}>Smart Alarm</Text>
              <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.regular }}>Wakes you during light sleep</Text>
            </View>
          </View>
          <Switch
            value={useSmartAlarm}
            onValueChange={setUseSmartAlarm}
            trackColor={{ false: colors.border, true: SLEEP_COLORS.primary + '50' }}
            thumbColor={useSmartAlarm ? SLEEP_COLORS.primary : isDark ? '#555' : '#ccc'}
          />
        </View>
        {useSmartAlarm && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md, paddingVertical: SPACING.md, backgroundColor: nightGradientBg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SLEEP_COLORS.primary + '20' }}
            onPress={() => setShowAlarmPicker(true)}
          >
            <Text style={{ fontSize: 28, color: colors.text, fontFamily: FONT.numBold }}>
              {formatTime12(alarmHour, alarmMin)}
            </Text>
            <Feather name="edit-3" size={14} color={colors.textTer} style={{ marginLeft: SPACING.sm }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Audio Monitoring */}
      <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SLEEP_COLORS.light + '15', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="mic" size={16} color={SLEEP_COLORS.light} />
            </View>
            <View>
              <Text style={{ fontSize: 15, color: colors.text, fontFamily: FONT.semibold }}>Audio Detection</Text>
              <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.regular }}>Detects snoring & disturbances</Text>
            </View>
          </View>
          <Switch
            value={enableAudio}
            onValueChange={setEnableAudio}
            trackColor={{ false: colors.border, true: SLEEP_COLORS.primary + '50' }}
            thumbColor={enableAudio ? SLEEP_COLORS.primary : isDark ? '#555' : '#ccc'}
          />
        </View>
        <Text style={{ fontSize: 10, color: colors.textTer, fontFamily: FONT.regular, marginTop: SPACING.sm, marginLeft: 48 }}>
          All audio is processed on-device. No recordings are stored.
        </Text>
      </View>

      {/* How it works (collapsible) */}
      <CollapsibleSection title="How It Works" colors={colors} card={card}>
        {[
          { icon: 'smartphone', text: 'Place phone face-down on your mattress', color: SLEEP_COLORS.primary },
          { icon: 'activity', text: 'Accelerometer detects body movements', color: '#22C55E' },
          { icon: 'mic', text: 'Microphone identifies snoring & noise events', color: SLEEP_COLORS.light },
          { icon: 'bar-chart-2', text: 'AI classifies sleep stages: Light → Deep → REM', color: SLEEP_COLORS.deep },
          { icon: 'bell', text: 'Smart alarm wakes you at the optimal moment', color: SLEEP_COLORS.moon },
        ].map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step.color + '15', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name={step.icon} size={13} color={step.color} />
            </View>
            <Text style={{ fontSize: 13, color: colors.textSec, fontFamily: FONT.medium, flex: 1 }}>{step.text}</Text>
          </View>
        ))}
      </CollapsibleSection>

      {/* Start Button */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: RADIUS.lg, backgroundColor: SLEEP_COLORS.primary }}
        onPress={handleStart}
      >
        <Feather name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONT.semibold }}>Start Sleep Tracking</Text>
      </TouchableOpacity>

      {/* Alarm picker modal */}
      <TimePickerModal
        visible={showAlarmPicker}
        onClose={() => setShowAlarmPicker(false)}
        onSelect={(h, m) => { setAlarmHour(h); setAlarmMin(m) }}
        initialHour={alarmHour}
        initialMin={alarmMin}
        title="Set Wake-up Time"
        colors={colors}
        card={card}
      />
    </ScrollView>
  )
}

// ── Collapsible Section ──────────────────────────────────────
function CollapsibleSection({ title, children, colors, card }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={[{ padding: SPACING.lg, marginBottom: SPACING.md }, card]}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 15, color: colors.text, fontFamily: FONT.semibold }}>{title}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTer} />
      </TouchableOpacity>
      {expanded && <View style={{ marginTop: SPACING.sm }}>{children}</View>}
    </View>
  )
}

// ════════════════════════════════════════════════════════════════════
// ── Main Screen ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
export default function SleepTrackerScreen({ navigation }) {
  const { member, gymId } = useAuth()
  const { colors, card, isDark } = useTheme()

  const [activeTab, setActiveTab] = useState('today') // 'today' | 'track' | 'trends'
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [goalHours, setGoalHours] = useState(8)

  // Log entry state
  const [bedHour, setBedHour] = useState(22)
  const [bedMin, setBedMin] = useState(30)
  const [wakeHour, setWakeHour] = useState(6)
  const [wakeMin, setWakeMin] = useState(30)
  const [quality, setQuality] = useState(4)
  const [logTags, setLogTags] = useState([])
  const [logFormExpanded, setLogFormExpanded] = useState(false)

  // Modal state
  const [showBedPicker, setShowBedPicker] = useState(false)
  const [showWakePicker, setShowWakePicker] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const memberId = member?.id

  // ── Persistence ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      if (gymId && member?.id) {
        try {
          const res = await api.get(`/gyms/${gymId}/members/${member.id}/sleep/history`)
          const backendLogs = (res.data?.data || res.data || []).map(mapBackendLog)
          if (backendLogs.length > 0) {
            setLogs(backendLogs)
            await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(backendLogs)).catch(() => {})
          } else {
            const stored = await AsyncStorage.getItem(STORAGE_KEY_LOGS)
            setLogs(stored ? JSON.parse(stored) : generateDemoData())
          }
        } catch (apiErr) {
          console.warn('Sleep API fetch failed, using local data:', apiErr.message)
          const stored = await AsyncStorage.getItem(STORAGE_KEY_LOGS)
          setLogs(stored ? JSON.parse(stored) : generateDemoData())
        }
      } else {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_LOGS)
        if (stored) {
          setLogs(JSON.parse(stored))
        } else {
          setLogs(generateDemoData())
        }
      }
      const storedGoal = await AsyncStorage.getItem(STORAGE_KEY_GOAL)
      if (storedGoal) setGoalHours(parseFloat(storedGoal))
    } catch (err) {
      console.warn('Failed to load sleep data:', err.message)
      setLogs(generateDemoData())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, member?.id])

  const saveLogs = useCallback(async (newLogs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(newLogs))
    } catch (err) {
      console.warn('Failed to save sleep logs:', err.message)
    }
  }, [])

  const saveGoal = useCallback(async (hours) => {
    setGoalHours(hours)
    try {
      await AsyncStorage.setItem(STORAGE_KEY_GOAL, String(hours))
    } catch (err) {
      console.warn('Failed to save sleep goal:', err.message)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [loading])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    loadData()
  }, [loadData])

  // ── Log Sleep ──────────────────────────────────────────────────
  const handleLogSleep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const today = new Date().toISOString().split('T')[0]
    const notes = serializeTags(logTags, '')
    const newLog = {
      id: `sleep-${today}-${Date.now()}`,
      date: today,
      bedHour,
      bedMin,
      wakeHour,
      wakeMin,
      quality,
      notes,
      tags: logTags,
      createdAt: new Date().toISOString(),
    }

    const filtered = logs.filter(l => l.date !== today)
    const newLogs = [newLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
    setLogs(newLogs)
    saveLogs(newLogs)
    setLogFormExpanded(false)

    if (gymId && member?.id) {
      const payload = buildBackendPayload({ bedHour, bedMin, wakeHour, wakeMin, quality, notes })
      api.post(`/gyms/${gymId}/members/${member.id}/sleep`, payload).catch(err => {
        console.warn('Failed to sync sleep log to backend:', err.message)
      })
    }
  }, [bedHour, bedMin, wakeHour, wakeMin, quality, logTags, logs, saveLogs, gymId, member?.id])

  // ── Computed ───────────────────────────────────────────────────
  const weeklyBars = getWeeklyBarData(logs)
  const todayLog = logs.find(l => l.date === new Date().toISOString().split('T')[0])
  const todayScore = todayLog ? calcSleepScore(todayLog, logs, goalHours) : null
  const sleepDebt = computeSleepDebt(logs, goalHours, 7)
  const currentDuration = calcDurationMinutes(bedHour, bedMin, wakeHour, wakeMin)

  const nightGradientBg = isDark ? 'rgba(108,99,255,0.06)' : 'rgba(108,99,255,0.04)'
  const showLogForm = !todayLog || logFormExpanded

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={SLEEP_COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack() }}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Feather name="moon" size={18} color={SLEEP_COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONT.semibold }]}>Sleep Tracker</Text>
        </View>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowGoalModal(true) }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="target" size={20} color={SLEEP_COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar: Today | Track | Trends */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {[
          { key: 'today', label: 'Today', icon: 'sun' },
          { key: 'track', label: 'Track', icon: 'activity' },
          { key: 'trends', label: 'Trends', icon: 'trending-up' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && { borderBottomColor: SLEEP_COLORS.primary, borderBottomWidth: 2 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.key) }}
          >
            <Feather name={tab.icon} size={16} color={activeTab === tab.key ? SLEEP_COLORS.primary : colors.textTer} />
            <Text style={{
              fontSize: 13,
              color: activeTab === tab.key ? SLEEP_COLORS.primary : colors.textTer,
              fontFamily: activeTab === tab.key ? FONT.semibold : FONT.medium,
              marginLeft: 4,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Track Tab ───────────────────────────────────── */}
      {activeTab === 'track' && (
        <LiveTrackingView
          colors={colors}
          card={card}
          isDark={isDark}
          navigation={navigation}
          gymId={gymId}
          memberId={member?.id}
          onSaveTags={(tags) => {
            // Save tags from tracking report to today's log
            if (todayLog) {
              const updated = logs.map(l =>
                l.id === todayLog.id ? { ...l, tags, notes: serializeTags(tags, l.notes) } : l
              )
              setLogs(updated)
              saveLogs(updated)
            }
          }}
        />
      )}

      {/* ── Trends Tab ──────────────────────────────────── */}
      {activeTab === 'trends' && (
        <TrendsTab
          logs={logs}
          goalHours={goalHours}
          colors={colors}
          card={card}
        />
      )}

      {/* ── Today Tab ──────────────────────────────────── */}
      {activeTab === 'today' && (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SLEEP_COLORS.primary}
            progressBackgroundColor={colors.bgSec}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Score Ring ──────────────────────────────── */}
          {todayScore !== null && (
            <View style={[styles.scoreCard, { ...card, backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : card.backgroundColor }, { borderColor: SLEEP_COLORS.primary + '20' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONT.semibold }]}>
                Tonight&apos;s Sleep Score
              </Text>
              <View style={{ marginTop: SPACING.md, alignItems: 'center' }}>
                <ScoreRing score={todayScore} size={160} />
              </View>

              {/* Quick Stats Row */}
              <QuickStatsRow log={todayLog} colors={colors} />

              {/* SVG Hypnogram (if tracked data exists) */}
              {todayLog?.stageTimeline && todayLog.stageTimeline.length > 2 && (
                <View style={{ marginTop: SPACING.sm }}>
                  <GradientHypnogram
                    epochs={todayLog.stageTimeline}
                    width={SCREEN_WIDTH - SPACING.md * 2 - SPACING.lg * 2}
                    colors={colors}
                  />
                </View>
              )}

              {/* Bedtime → Wake summary */}
              {todayLog && (
                <View style={styles.todaySummary}>
                  <View style={styles.todayStat}>
                    <Feather name="moon" size={14} color={SLEEP_COLORS.primary} />
                    <Text style={[styles.todayStatText, { color: colors.textSec, fontFamily: FONT.numMedium }]}>
                      {formatTime12(todayLog.bedHour, todayLog.bedMin)}
                    </Text>
                  </View>
                  <Feather name="arrow-right" size={14} color={colors.textTer} />
                  <View style={styles.todayStat}>
                    <Feather name="sunrise" size={14} color={SLEEP_COLORS.moon} />
                    <Text style={[styles.todayStatText, { color: colors.textSec, fontFamily: FONT.numMedium }]}>
                      {formatTime12(todayLog.wakeHour, todayLog.wakeMin)}
                    </Text>
                  </View>
                  <Text style={[styles.todayDuration, { color: colors.text, fontFamily: FONT.numSemibold }]}>
                    {formatDuration(calcDurationMinutes(todayLog.bedHour, todayLog.bedMin, todayLog.wakeHour, todayLog.wakeMin))}
                  </Text>
                </View>
              )}

              {/* Sleep Notes / Tags */}
              <View style={{ marginTop: SPACING.md }}>
                <TagChips
                  tags={todayLog?.tags || []}
                  onPress={() => setShowNotesModal(true)}
                />
              </View>
            </View>
          )}

          {/* ── Sleep Debt ─────────────────────────────── */}
          <SleepDebtIndicator debtHours={sleepDebt} colors={colors} />

          {/* ── Manual Log Form (collapsible if today exists) ── */}
          {todayLog && !logFormExpanded ? (
            <TouchableOpacity
              style={[styles.expandLogBtn, { ...card }]}
              onPress={() => setLogFormExpanded(true)}
              activeOpacity={0.7}
            >
              <Feather name="edit-3" size={16} color={SLEEP_COLORS.primary} />
              <Text style={{ fontSize: 14, color: SLEEP_COLORS.primary, fontFamily: FONT.semibold, marginLeft: SPACING.sm }}>
                Update Sleep Log
              </Text>
              <Feather name="chevron-down" size={16} color={SLEEP_COLORS.primary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.logEntryCard, { ...card, backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : card.backgroundColor }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONT.semibold }]}>
                  {todayLog ? 'Update Sleep Log' : 'Log Your Sleep'}
                </Text>
                {todayLog && (
                  <TouchableOpacity onPress={() => setLogFormExpanded(false)}>
                    <Feather name="chevron-up" size={18} color={colors.textTer} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Time Selectors */}
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={[styles.timeBlock, { backgroundColor: nightGradientBg, borderColor: SLEEP_COLORS.primary + '30' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowBedPicker(true) }}
                >
                  <Feather name="moon" size={20} color={SLEEP_COLORS.primary} />
                  <Text style={[styles.timeLabel, { color: colors.textSec, fontFamily: FONT.medium }]}>Bedtime</Text>
                  <Text style={[styles.timeValue, { color: colors.text, fontFamily: FONT.numBold }]}>
                    {formatTime12(bedHour, bedMin)}
                  </Text>
                </TouchableOpacity>

                <View style={styles.timeDivider}>
                  <Feather name="arrow-right" size={18} color={colors.textTer} />
                  <Text style={[styles.durationPreview, { color: SLEEP_COLORS.light, fontFamily: FONT.numSemibold }]}>
                    {formatDuration(currentDuration)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.timeBlock, { backgroundColor: nightGradientBg, borderColor: SLEEP_COLORS.moon + '30' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowWakePicker(true) }}
                >
                  <Feather name="sunrise" size={20} color={SLEEP_COLORS.moon} />
                  <Text style={[styles.timeLabel, { color: colors.textSec, fontFamily: FONT.medium }]}>Wake Up</Text>
                  <Text style={[styles.timeValue, { color: colors.text, fontFamily: FONT.numBold }]}>
                    {formatTime12(wakeHour, wakeMin)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quality Rating */}
              <Text style={[styles.qualityTitle, { color: colors.textSec, fontFamily: FONT.medium }]}>Sleep Quality</Text>
              <View style={styles.qualityRow}>
                {QUALITY_EMOJIS.map((emoji, idx) => {
                  const rating = idx + 1
                  const isSelected = quality === rating
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuality(rating) }}
                      style={[
                        styles.qualityBtn,
                        {
                          backgroundColor: isSelected ? SLEEP_COLORS.primary + '20' : colors.bgTer,
                          borderColor: isSelected ? SLEEP_COLORS.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                      <Text style={[styles.qualityBtnLabel, {
                        color: isSelected ? SLEEP_COLORS.light : colors.textTer,
                        fontFamily: FONT.medium,
                      }]}>
                        {QUALITY_LABELS[idx]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Sleep Notes */}
              <View style={{ marginTop: SPACING.md }}>
                <TagChips tags={logTags} onPress={() => setShowNotesModal(true)} />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: SLEEP_COLORS.primary }]}
                onPress={handleLogSleep}
              >
                <Feather name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.saveBtnText, { fontFamily: FONT.semibold }]}>
                  {todayLog ? 'Update Sleep Log' : 'Save Sleep Log'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Weekly Chart ──────────────────────────────── */}
          <View style={[styles.chartCard, { ...card }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONT.semibold }]}>
                Weekly Overview
              </Text>
              <View style={[styles.goalPill, { backgroundColor: SLEEP_COLORS.primary + '15', borderColor: SLEEP_COLORS.primary + '30' }]}>
                <Feather name="target" size={12} color={SLEEP_COLORS.primary} />
                <Text style={[styles.goalPillText, { color: SLEEP_COLORS.primary, fontFamily: FONT.numMedium }]}>
                  {goalHours}h goal
                </Text>
              </View>
            </View>
            <WeeklyBarChart data={weeklyBars} goalHours={goalHours} colors={colors} />
          </View>

          {/* ── Sleep Tips ────────────────────────────────── */}
          <CollapsibleSection title="Sleep Hygiene Tips" colors={colors} card={card}>
            {SLEEP_TIPS.map((tip, idx) => (
              <View
                key={idx}
                style={[
                  styles.tipRow,
                  idx < SLEEP_TIPS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.tipIcon, { backgroundColor: SLEEP_COLORS.primary + '12' }]}>
                  <Feather
                    name={tip.icon === 'smartphone-off' ? 'smartphone' : tip.icon}
                    size={16}
                    color={SLEEP_COLORS.light}
                  />
                </View>
                <View style={styles.tipContent}>
                  <Text style={[styles.tipTitle, { color: colors.text, fontFamily: FONT.medium }]}>
                    {tip.title}
                  </Text>
                  <Text style={[styles.tipDesc, { color: colors.textTer, fontFamily: FONT.regular }]}>
                    {tip.desc}
                  </Text>
                </View>
              </View>
            ))}
          </CollapsibleSection>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
      )}

      {/* ── Modals ─────────────────────────────────────── */}
      <TimePickerModal
        visible={showBedPicker}
        onClose={() => setShowBedPicker(false)}
        onSelect={(h, m) => { setBedHour(h); setBedMin(m) }}
        initialHour={bedHour}
        initialMin={bedMin}
        title="Set Bedtime"
        colors={colors}
        card={card}
      />
      <TimePickerModal
        visible={showWakePicker}
        onClose={() => setShowWakePicker(false)}
        onSelect={(h, m) => { setWakeHour(h); setWakeMin(m) }}
        initialHour={wakeHour}
        initialMin={wakeMin}
        title="Set Wake Time"
        colors={colors}
        card={card}
      />
      <GoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSave={saveGoal}
        currentGoal={goalHours}
        colors={colors}
      />
      <SleepNotesModal
        visible={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onSave={(tags) => {
          setLogTags(tags)
          // If updating today's log inline, save tags immediately
          if (todayLog) {
            const updated = logs.map(l =>
              l.id === todayLog.id ? { ...l, tags, notes: serializeTags(tags, l.notes) } : l
            )
            setLogs(updated)
            saveLogs(updated)
          }
        }}
        initialTags={logTags}
      />
    </View>
  )
}

// ════════════════════════════════════════════════════════════════════
// ── Styles ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 56 : SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Score Card
  scoreCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  todaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  todayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayStatText: {
    fontSize: 13,
  },
  todayDuration: {
    fontSize: 14,
    marginLeft: SPACING.sm,
  },

  // Expand log button
  expandLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  // Log Entry Card
  logEntryCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 17,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  timeValue: {
    fontSize: 18,
  },
  timeDivider: {
    alignItems: 'center',
    gap: 2,
  },
  durationPreview: {
    fontSize: 11,
  },

  // Quality
  qualityTitle: {
    fontSize: 14,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  qualityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 2,
  },
  qualityBtnLabel: {
    fontSize: 9,
  },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
  },

  // Chart Card
  chartCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  goalPillText: {
    fontSize: 12,
  },

  // Log cards
  logCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logDate: {
    fontSize: 15,
  },
  logDay: {
    fontSize: 12,
    marginTop: 1,
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  scoreBadgeText: {
    fontSize: 13,
  },
  logBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logStatText: {
    fontSize: 13,
  },

  // Tips
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
})
