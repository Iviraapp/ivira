/**
 * IVIRA Advanced Sleep Engine
 *
 * Pillow-grade sleep tracking using phone sensors:
 * 1. Accelerometer-based actigraphy (motion → sleep stages)
 * 2. Audio event detection (snoring, coughing, ambient noise)
 * 3. Smart wake-up alarm (triggers during light sleep in a 30-min window)
 * 4. Sleep cycle classification (Awake → Light → Deep → REM)
 */
import { Platform } from 'react-native'
import { Accelerometer } from 'expo-sensors'
import { Audio } from 'expo-av'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Constants ──────────────────────────────────────────────────────
const ACCEL_INTERVAL_MS = 1000           // Sample accelerometer every 1s
const EPOCH_DURATION_MS = 30 * 1000      // 30-second epochs for stage classification
const AUDIO_SAMPLE_INTERVAL_MS = 60000   // Analyze audio every 60s
const SMART_ALARM_WINDOW_MS = 30 * 60000 // 30-minute smart wake window

const STORAGE_KEY_SESSION = 'ivira_sleep_session'
const STORAGE_KEY_HISTORY = 'ivira_sleep_engine_history'
const BACKGROUND_TASK = 'IVIRA_SLEEP_TRACKING'

// Motion energy thresholds (calibrated for phone-on-mattress placement)
const MOTION_THRESHOLD_AWAKE = 0.08      // High movement → awake
const MOTION_THRESHOLD_LIGHT = 0.03      // Moderate movement → light sleep
const MOTION_THRESHOLD_DEEP = 0.008      // Nearly still → deep sleep
// REM is detected by periodic bursts of small movements after deep sleep

// Audio thresholds (dB approximations from metering)
const AUDIO_THRESHOLD_SNORE = -25        // Rhythmic breathing pattern
const AUDIO_THRESHOLD_NOISE = -15        // Coughing, talking, disturbance

// Sleep cycle timing (typical adult cycle ≈ 90 minutes)
const CYCLE_DURATION_MS = 90 * 60000
const DEEP_SLEEP_PEAK_MS = 40 * 60000   // Deep sleep peaks ~40min into cycle
const REM_PEAK_MS = 75 * 60000          // REM peaks ~75min into cycle

// ── Sleep Stage Enum ───────────────────────────────────────────────
export const SleepStage = {
  AWAKE: 'awake',
  LIGHT: 'light',
  DEEP: 'deep',
  REM: 'rem',
}

export const STAGE_COLORS = {
  [SleepStage.AWAKE]: '#FF6B6B',
  [SleepStage.LIGHT]: '#A5A0FF',
  [SleepStage.DEEP]: '#3D348B',
  [SleepStage.REM]: '#6C63FF',
}

export const STAGE_LABELS = {
  [SleepStage.AWAKE]: 'Awake',
  [SleepStage.LIGHT]: 'Light',
  [SleepStage.DEEP]: 'Deep',
  [SleepStage.REM]: 'REM',
}

// ── Audio Event Types ──────────────────────────────────────────────
export const AudioEvent = {
  SNORING: 'snoring',
  COUGHING: 'coughing',
  TALKING: 'talking',
  NOISE: 'noise',
  SILENCE: 'silence',
}

// ── Background Task ──────────────────────────────────────────────
// Register background task so tracking continues when app is backgrounded
try {
  TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[SleepEngine] Background task error:', error)
      return
    }
    // The background task fires periodically — classify any buffered data
    if (_isTracking) {
      classifyEpoch()
      checkSmartAlarm()
      notifyListeners()
    }
  })
} catch (e) {
  console.warn('[SleepEngine] Failed to define background task:', e.message)
}

// ── State ──────────────────────────────────────────────────────────
let _isTracking = false
let _accelSubscription = null
let _audioRecording = null
let _epochTimer = null
let _audioTimer = null
let _smartAlarmTimer = null

// Buffers for epoch analysis
let _accelBuffer = []        // Raw accelerometer readings within current epoch
let _epochHistory = []       // Classified epochs: { timestamp, stage, motionEnergy, audioLevel }
let _audioEvents = []        // Detected audio events: { timestamp, type, level }
let _sleepStartTime = null
let _alarmTime = null        // Target alarm time (user-set)
let _alarmTriggered = false
let _listeners = new Set()   // UI update callbacks

// ── Public API ─────────────────────────────────────────────────────

/**
 * Start sleep tracking session.
 * Places the phone on the mattress — accelerometer detects body movement,
 * microphone detects breathing patterns and disturbances.
 */
export async function startTracking(options = {}) {
  if (_isTracking) return { success: false, reason: 'Already tracking' }

  const { alarmTime, enableAudio = true } = options

  _isTracking = true
  _sleepStartTime = new Date()
  _alarmTime = alarmTime ? new Date(alarmTime) : null
  _alarmTriggered = false
  _accelBuffer = []
  _epochHistory = []
  _audioEvents = []

  // 1. Start accelerometer with background delivery
  Accelerometer.setUpdateInterval(ACCEL_INTERVAL_MS)
  _accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
    _accelBuffer.push({
      timestamp: Date.now(),
      energy: Math.sqrt(x * x + y * y + z * z) - 1, // Remove gravity (≈1g at rest)
    })
  })

  // 2. Classify epochs every 30 seconds
  _epochTimer = setInterval(() => {
    classifyEpoch()
    checkSmartAlarm()
    notifyListeners()
  }, EPOCH_DURATION_MS)

  // 3. Audio monitoring (if permitted)
  if (enableAudio) {
    await startAudioMonitoring()
  }

  // 4. Show persistent notification to keep app alive in background (Android)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('sleep-tracking', {
        name: 'Sleep Tracking',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: [],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.SECRET,
      })
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Sleep tracking active',
          body: 'IVIRA is monitoring your sleep. Tap to open.',
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.LOW,
        },
        trigger: null,
        identifier: 'sleep-tracking-active',
      })
    } catch (err) {
      console.warn('[SleepEngine] Failed to show tracking notification:', err.message)
    }
  }

  // Persist session start
  await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
    startTime: _sleepStartTime.toISOString(),
    alarmTime: _alarmTime?.toISOString() || null,
    enableAudio,
  }))

  notifyListeners()
  return { success: true }
}

/**
 * Stop tracking and return the complete sleep report.
 */
export async function stopTracking() {
  if (!_isTracking) return null

  // Final epoch classification
  classifyEpoch()

  // Clean up sensors
  _accelSubscription?.remove()
  _accelSubscription = null
  clearInterval(_epochTimer)
  _epochTimer = null
  clearInterval(_audioTimer)
  _audioTimer = null
  clearTimeout(_smartAlarmTimer)
  _smartAlarmTimer = null

  // Stop audio
  await stopAudioMonitoring()

  // Dismiss tracking notification (Android)
  if (Platform.OS === 'android') {
    try {
      await Notifications.dismissNotificationAsync('sleep-tracking-active')
    } catch (err) { console.warn('[SleepEngine]', err?.message) }
  }

  _isTracking = false

  const report = generateSleepReport()

  // Save to history
  try {
    const historyRaw = await AsyncStorage.getItem(STORAGE_KEY_HISTORY)
    const history = historyRaw ? JSON.parse(historyRaw) : []
    history.unshift(report)
    // Keep last 30 nights
    if (history.length > 30) history.length = 30
    await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
  } catch (e) {
    console.warn('[SleepEngine] Failed to save history:', e)
  }

  // Clear session
  await AsyncStorage.removeItem(STORAGE_KEY_SESSION)
  notifyListeners()

  return report
}

/**
 * Check if currently tracking.
 */
export function isTracking() {
  return _isTracking
}

/**
 * Get real-time sleep data for the UI.
 */
export function getLiveData() {
  if (!_isTracking && _epochHistory.length === 0) return null

  const now = Date.now()
  const elapsed = _sleepStartTime ? now - _sleepStartTime.getTime() : 0
  const currentStage = _epochHistory.length > 0
    ? _epochHistory[_epochHistory.length - 1].stage
    : SleepStage.AWAKE

  // Calculate stage durations
  const stageDurations = { awake: 0, light: 0, deep: 0, rem: 0 }
  _epochHistory.forEach(e => {
    stageDurations[e.stage] = (stageDurations[e.stage] || 0) + EPOCH_DURATION_MS
  })

  return {
    isTracking: _isTracking,
    startTime: _sleepStartTime?.toISOString(),
    elapsedMs: elapsed,
    currentStage,
    epochs: [..._epochHistory],
    stageDurations,
    audioEvents: [..._audioEvents],
    alarmTime: _alarmTime?.toISOString(),
    alarmTriggered: _alarmTriggered,
    sleepCycles: countSleepCycles(),
  }
}

/**
 * Set a smart alarm. The alarm fires when you're in light sleep
 * within a 30-minute window before your target wake time.
 */
export function setSmartAlarm(targetTime) {
  _alarmTime = targetTime ? new Date(targetTime) : null
  _alarmTriggered = false
}

/**
 * Subscribe to real-time updates.
 */
export function subscribe(callback) {
  _listeners.add(callback)
  return () => _listeners.delete(callback)
}

/**
 * Get sleep history from local storage.
 */
export async function getSleepHistory() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.warn('[SleepEngine]', err?.message)
    return []
  }
}

/**
 * Resume a tracking session that was interrupted (app restart).
 */
export async function resumeSession() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSION)
    if (!raw) return false
    const session = JSON.parse(raw)
    // Only resume if session started less than 12 hours ago
    const elapsed = Date.now() - new Date(session.startTime).getTime()
    if (elapsed > 12 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(STORAGE_KEY_SESSION)
      return false
    }
    return await startTracking({
      alarmTime: session.alarmTime,
      enableAudio: session.enableAudio,
    })
  } catch (err) {
    console.warn('[SleepEngine]', err?.message)
    return false
  }
}

// ── Epoch Classification (Actigraphy) ──────────────────────────────

function classifyEpoch() {
  // Handle data gaps — if no accelerometer data, the phone was likely in deep sleep
  // (OS suspended the app). Fill gaps with Deep Sleep epochs since the user wasn't moving the phone.
  if (_accelBuffer.length === 0) {
    if (_epochHistory.length > 0 && _isTracking) {
      const lastEpoch = _epochHistory[_epochHistory.length - 1]
      const gapMs = Date.now() - lastEpoch.timestamp
      // If gap > 2 epochs (>60s), phone was suspended = user is deeply asleep
      if (gapMs > EPOCH_DURATION_MS * 2) {
        const gapEpochs = Math.floor(gapMs / EPOCH_DURATION_MS)
        for (let i = 0; i < gapEpochs; i++) {
          _epochHistory.push({
            timestamp: lastEpoch.timestamp + (i + 1) * EPOCH_DURATION_MS,
            stage: SleepStage.DEEP,
            motionEnergy: 0,
            maxEnergy: 0,
            variance: 0,
            interpolated: true,
          })
        }
      }
    }
    return
  }

  // Calculate motion energy for this epoch
  const energies = _accelBuffer.map(s => Math.abs(s.energy))
  const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length
  const maxEnergy = Math.max(...energies)
  const variance = energies.reduce((sum, e) => sum + (e - avgEnergy) ** 2, 0) / energies.length

  // Time since sleep start (for cycle-aware classification)
  const elapsed = Date.now() - (_sleepStartTime?.getTime() || Date.now())
  const cyclePosition = elapsed % CYCLE_DURATION_MS

  let stage = SleepStage.LIGHT // default

  if (avgEnergy > MOTION_THRESHOLD_AWAKE || maxEnergy > 0.15) {
    // High motion → Awake
    stage = SleepStage.AWAKE
  } else if (avgEnergy < MOTION_THRESHOLD_DEEP && variance < 0.0001) {
    // Very still → could be Deep or REM
    // Use cycle timing to differentiate:
    // Deep sleep peaks in first half of cycle, REM in second half
    if (cyclePosition < DEEP_SLEEP_PEAK_MS + 10 * 60000) {
      stage = SleepStage.DEEP
    } else if (cyclePosition > REM_PEAK_MS - 15 * 60000) {
      // REM has characteristic small twitches (slightly higher variance than deep)
      stage = variance > 0.00002 ? SleepStage.REM : SleepStage.DEEP
    } else {
      stage = SleepStage.DEEP
    }
  } else if (avgEnergy < MOTION_THRESHOLD_LIGHT) {
    // Moderate stillness → Light sleep
    // But check if we should be in REM based on cycle timing + micro-movements
    if (cyclePosition > REM_PEAK_MS - 15 * 60000 && variance > 0.00005 && variance < 0.001) {
      stage = SleepStage.REM
    } else {
      stage = SleepStage.LIGHT
    }
  }

  // Context smoothing: avoid impossible transitions
  // (can't go from Awake → Deep instantly, must pass through Light)
  if (_epochHistory.length > 0) {
    const prevStage = _epochHistory[_epochHistory.length - 1].stage
    if (prevStage === SleepStage.AWAKE && stage === SleepStage.DEEP) {
      stage = SleepStage.LIGHT
    }
    if (prevStage === SleepStage.AWAKE && stage === SleepStage.REM) {
      stage = SleepStage.LIGHT
    }
    // Sleep onset: first 5 minutes must be Awake or Light
    if (elapsed < 5 * 60000 && (stage === SleepStage.DEEP || stage === SleepStage.REM)) {
      stage = SleepStage.LIGHT
    }
  }

  _epochHistory.push({
    timestamp: Date.now(),
    stage,
    motionEnergy: avgEnergy,
    maxEnergy,
    variance,
  })

  // Clear buffer for next epoch
  _accelBuffer = []
}

// ── Audio Monitoring ───────────────────────────────────────────────

async function startAudioMonitoring() {
  try {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) {
      console.warn('[SleepEngine] Microphone permission not granted')
      return
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    })

    // Sample audio periodically to detect events
    _audioTimer = setInterval(async () => {
      await sampleAudio()
    }, AUDIO_SAMPLE_INTERVAL_MS)

    // First sample immediately
    await sampleAudio()
  } catch (err) {
    console.warn('[SleepEngine] Audio monitoring failed:', err.message)
  }
}

async function sampleAudio() {
  try {
    // Record a short 5-second clip and analyze its metering
    const recording = new Audio.Recording()
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.LOW_QUALITY,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.LOW,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      isMeteringEnabled: true,
    })

    await recording.startAsync()

    // Collect metering data over 5 seconds
    const meterReadings = []
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const status = await recording.getStatusAsync()
      if (status.metering != null) {
        meterReadings.push(status.metering)
      }
    }

    await recording.stopAndUnloadAsync()

    // Delete the recording file — we only need the metering data (privacy!)
    const uri = recording.getURI()
    if (uri) {
      try {
        const FileSystem = require('expo-file-system')
        await FileSystem.deleteAsync(uri, { idempotent: true })
      } catch (err) { console.warn('[SleepEngine]', err?.message) }
    }

    // Analyze metering pattern
    if (meterReadings.length > 0) {
      const avgLevel = meterReadings.reduce((a, b) => a + b, 0) / meterReadings.length
      const maxLevel = Math.max(...meterReadings)
      const levelVariance = meterReadings.reduce((s, l) => s + (l - avgLevel) ** 2, 0) / meterReadings.length

      let eventType = AudioEvent.SILENCE

      if (maxLevel > AUDIO_THRESHOLD_NOISE) {
        // Loud disturbance — coughing or talking
        if (levelVariance > 50) {
          eventType = AudioEvent.COUGHING // Sharp spikes
        } else {
          eventType = AudioEvent.TALKING // Sustained noise
        }
      } else if (avgLevel > AUDIO_THRESHOLD_SNORE) {
        // Rhythmic breathing pattern = potential snoring
        // Check for rhythmic pattern (variance in a specific range)
        if (levelVariance > 5 && levelVariance < 40) {
          eventType = AudioEvent.SNORING
        } else if (avgLevel > AUDIO_THRESHOLD_SNORE + 5) {
          eventType = AudioEvent.NOISE
        }
      }

      if (eventType !== AudioEvent.SILENCE) {
        _audioEvents.push({
          timestamp: Date.now(),
          type: eventType,
          avgLevel,
          maxLevel,
          duration: 5000,
        })
      }
    }
  } catch (err) {
    // Audio sampling can fail silently — not critical
    console.warn('[SleepEngine] Audio sample error:', err.message)
  }
}

async function stopAudioMonitoring() {
  if (_audioRecording) {
    try {
      await _audioRecording.stopAndUnloadAsync()
    } catch (err) { console.warn('[SleepEngine]', err?.message) }
    _audioRecording = null
  }
}

// ── Smart Alarm ────────────────────────────────────────────────────

function checkSmartAlarm() {
  if (!_alarmTime || _alarmTriggered) return

  const now = Date.now()
  const alarmMs = _alarmTime.getTime()
  const windowStart = alarmMs - SMART_ALARM_WINDOW_MS

  // Are we within the 30-minute window before the alarm?
  if (now >= windowStart && now <= alarmMs) {
    const currentStage = _epochHistory.length > 0
      ? _epochHistory[_epochHistory.length - 1].stage
      : null

    // Trigger if in Light sleep or Awake (never during Deep/REM)
    if (currentStage === SleepStage.LIGHT || currentStage === SleepStage.AWAKE) {
      triggerSmartAlarm()
    }
  }

  // Failsafe: always trigger at the exact alarm time
  if (now >= alarmMs) {
    triggerSmartAlarm()
  }
}

async function triggerSmartAlarm() {
  if (_alarmTriggered) return
  _alarmTriggered = true

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Good morning!',
        body: 'IVIRA detected light sleep — the perfect time to wake up.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Immediately
    })
  } catch (err) {
    console.warn('[SleepEngine] Failed to trigger alarm notification:', err)
  }

  notifyListeners()
}

// ── Sleep Report Generation ────────────────────────────────────────

function generateSleepReport() {
  const endTime = new Date()
  const totalMs = endTime.getTime() - (_sleepStartTime?.getTime() || endTime.getTime())
  const totalMinutes = Math.round(totalMs / 60000)

  // Calculate stage durations
  const stageDurations = { awake: 0, light: 0, deep: 0, rem: 0 }
  _epochHistory.forEach(e => {
    stageDurations[e.stage] = (stageDurations[e.stage] || 0) + EPOCH_DURATION_MS / 60000
  })

  // Sleep efficiency = (total - awake) / total * 100
  const sleepMinutes = totalMinutes - stageDurations.awake
  const efficiency = totalMinutes > 0 ? Math.round((sleepMinutes / totalMinutes) * 100) : 0

  // Sleep onset latency (time to first non-awake epoch)
  const firstAsleep = _epochHistory.find(e => e.stage !== SleepStage.AWAKE)
  const onsetLatency = firstAsleep
    ? Math.round((firstAsleep.timestamp - (_sleepStartTime?.getTime() || 0)) / 60000)
    : totalMinutes

  // Count awakenings (transitions from sleep → awake)
  let awakenings = 0
  for (let i = 1; i < _epochHistory.length; i++) {
    if (_epochHistory[i].stage === SleepStage.AWAKE && _epochHistory[i - 1].stage !== SleepStage.AWAKE) {
      awakenings++
    }
  }

  // Count sleep cycles
  const cycles = countSleepCycles()

  // Audio event summary
  const audioSummary = {
    snoring: _audioEvents.filter(e => e.type === AudioEvent.SNORING).length,
    coughing: _audioEvents.filter(e => e.type === AudioEvent.COUGHING).length,
    talking: _audioEvents.filter(e => e.type === AudioEvent.TALKING).length,
    noise: _audioEvents.filter(e => e.type === AudioEvent.NOISE).length,
    totalEvents: _audioEvents.length,
    snoringMinutes: _audioEvents.filter(e => e.type === AudioEvent.SNORING).length, // each sample ≈ 1 min
  }

  // Calculate sleep score (0-100)
  const score = calculateAdvancedSleepScore({
    totalMinutes,
    efficiency,
    deepMinutes: stageDurations.deep,
    remMinutes: stageDurations.rem,
    onsetLatency,
    awakenings,
    cycles,
  })

  return {
    id: `sleep-${Date.now()}`,
    date: _sleepStartTime?.toISOString().split('T')[0],
    bedtime: _sleepStartTime?.toISOString(),
    wakeTime: endTime.toISOString(),
    totalMinutes,
    sleepMinutes,
    efficiency,
    onsetLatency,
    awakenings,
    cycles,
    score,
    stageDurations,
    stageTimeline: _epochHistory.map(e => ({
      time: e.timestamp,
      stage: e.stage,
      energy: e.motionEnergy,
    })),
    audioEvents: _audioEvents.map(e => ({
      time: e.timestamp,
      type: e.type,
      level: e.avgLevel,
    })),
    audioSummary,
    source: 'ivira_engine',
  }
}

function countSleepCycles() {
  // A cycle = Light → Deep → REM sequence
  let cycles = 0
  let hadDeep = false
  for (const e of _epochHistory) {
    if (e.stage === SleepStage.DEEP) hadDeep = true
    if (e.stage === SleepStage.REM && hadDeep) {
      cycles++
      hadDeep = false
    }
  }
  return cycles
}

function calculateAdvancedSleepScore(data) {
  let score = 0

  // Duration (0-25 points): Ideal 7-9 hours
  if (data.totalMinutes >= 420 && data.totalMinutes <= 540) {
    score += 25
  } else if (data.totalMinutes >= 360 && data.totalMinutes < 420) {
    score += 20
  } else if (data.totalMinutes > 540 && data.totalMinutes <= 600) {
    score += 20
  } else if (data.totalMinutes >= 300 && data.totalMinutes < 360) {
    score += 12
  } else {
    score += 5
  }

  // Efficiency (0-25 points): >90% is excellent
  if (data.efficiency >= 90) score += 25
  else if (data.efficiency >= 85) score += 20
  else if (data.efficiency >= 80) score += 15
  else if (data.efficiency >= 70) score += 10
  else score += 5

  // Deep sleep (0-20 points): Should be 15-25% of total
  const deepPct = data.totalMinutes > 0 ? (data.deepMinutes / data.totalMinutes) * 100 : 0
  if (deepPct >= 15 && deepPct <= 25) score += 20
  else if (deepPct >= 10 && deepPct < 15) score += 15
  else if (deepPct >= 5 && deepPct < 10) score += 8
  else score += 3

  // REM sleep (0-15 points): Should be 20-25% of total
  const remPct = data.totalMinutes > 0 ? (data.remMinutes / data.totalMinutes) * 100 : 0
  if (remPct >= 20 && remPct <= 30) score += 15
  else if (remPct >= 15 && remPct < 20) score += 12
  else if (remPct >= 10 && remPct < 15) score += 8
  else score += 3

  // Sleep onset (0-10 points): <15 min is ideal
  if (data.onsetLatency <= 15) score += 10
  else if (data.onsetLatency <= 30) score += 7
  else if (data.onsetLatency <= 45) score += 4
  else score += 1

  // Awakenings (0-5 points): Fewer is better
  if (data.awakenings <= 1) score += 5
  else if (data.awakenings <= 3) score += 3
  else score += 1

  return Math.min(100, Math.max(0, score))
}

// ── Helpers ────────────────────────────────────────────────────────

function notifyListeners() {
  const data = getLiveData()
  _listeners.forEach(cb => {
    try { cb(data) } catch (err) { console.warn('[SleepEngine]', err?.message) }
  })
}

// ── Exports ────────────────────────────────────────────────────────

export default {
  startTracking,
  stopTracking,
  isTracking,
  getLiveData,
  setSmartAlarm,
  subscribe,
  getSleepHistory,
  resumeSession,
  SleepStage,
  STAGE_COLORS,
  STAGE_LABELS,
  AudioEvent,
}
