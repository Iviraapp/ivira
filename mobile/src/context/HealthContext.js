// HealthContext — Single source of truth for health data across all screens
// Provides: steps, sleep, heart rate, HRV with real-time sync
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Platform, AppState } from 'react-native'
import * as Sentry from '@sentry/react-native'
import { getItem, setItem } from '../lib/storage'
import {
  requestHealthPermissions,
  requestExtendedPermissions,
  requestSleepPermissions,
  getTodaySteps,
  getLastNightSleep,
  getLatestHeartRate,
  getRestingHeartRate,
  getHRV,
  syncStepsToBackend,
  syncSleepToBackend,
  isWearableConnected,
  subscribeToSteps,
} from '../lib/healthKit'
import Haptics from '../lib/haptics'

let Pedometer = null
try { Pedometer = require('expo-sensors').Pedometer } catch (err) { if (__DEV__) console.warn('[HealthCtx] Pedometer load:', err?.message) }

const HealthContext = createContext(null)

const SYNC_INTERVAL = 15_000 // 15 seconds for near-real-time step updates
const HR_SYNC_INTERVAL = 300_000 // 5 minutes for heart rate
const DEFAULT_STEP_GOAL = 10000
const STEPS_PER_ACTIVE_MINUTE = 115 // average walking cadence

// Local date helper (avoids UTC timezone bugs for date keys)
function localDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HealthProvider({ children, gymId, memberId }) {
  // Steps
  const [steps, setSteps] = useState(0)
  const [stepSource, setStepSource] = useState(null) // 'health', 'pedometer', 'manual', null
  const [stepGoal, setStepGoalState] = useState(DEFAULT_STEP_GOAL)
  const lastMilestoneRef = useRef(0)

  // Sleep
  const [sleepData, setSleepData] = useState(null)
  const [sleepSource, setSleepSource] = useState(null)

  // Heart rate
  const [heartRate, setHeartRate] = useState(null)
  const [restingHR, setRestingHR] = useState(null)
  const [hrv, setHrv] = useState(null)
  const [wearableConnected, setWearableConnected] = useState(false)

  // Active time (derived from steps)
  const [activeMinutes, setActiveMinutes] = useState(0)

  // Sync refs
  const stepSyncRef = useRef(null) // Legacy polling (kept as fallback)
  const stepSubRef = useRef(null)  // Native subscription unsubscribe fn
  const hrSyncRef = useRef(null)
  const permissionsGranted = useRef(false)
  const initialized = useRef(false)

  // Manual step mode
  const [stepMode, setStepModeState] = useState('auto') // 'auto' | 'manual'

  // Load saved preferences and persisted steps
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedGoal = await getItem('ivira_step_goal')
        if (savedGoal) setStepGoalState(parseInt(savedGoal) || DEFAULT_STEP_GOAL)
        const savedMode = await getItem('ivira_step_mode')
        if (savedMode) setStepModeState(savedMode)

        const today = localDateKey()
        if (savedMode === 'manual') {
          const manualSteps = await getItem(`ivira_manual_steps_${today}`)
          if (manualSteps) {
            setSteps(parseInt(manualSteps) || 0)
            setStepSource('manual')
          }
        } else {
          // Load persisted auto-mode steps so we don't show 0 on restart
          const savedSteps = await getItem(`ivira_steps_${today}`)
          if (savedSteps) {
            const parsed = parseInt(savedSteps) || 0
            if (parsed > 0) {
              setSteps(parsed)
              lastMilestoneRef.current = Math.floor(parsed / 1000)
            }
          }
        }
      } catch (err) { if (__DEV__) console.warn('[HealthCtx] loadPrefs:', err?.message) }
    }
    loadPrefs()
  }, [])

  // Initialize health tracking
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      if (stepMode === 'manual') return

      // Request permissions
      try {
        const granted = await requestHealthPermissions()
        if (granted) {
          permissionsGranted.current = true
          await requestExtendedPermissions()
          await requestSleepPermissions()
        }
      } catch (err) {
        if (__DEV__) console.warn('[HealthCtx] permissions:', err?.message)
        Sentry.captureMessage('Health permissions request failed', 'warning')
      }

      // Initial data fetch
      const stepResult = await fetchSteps()
      if (!stepResult) {
        await new Promise(r => setTimeout(r, 2000))
        await fetchSteps()
      }
      await fetchSleep()
      await fetchHeartData()

      // Delayed retry — ensures auth token is loaded before syncing
      setTimeout(async () => {
        const token = await getItem('ivira_member_token')
        if (token && gymId && memberId) {
          const result = await getTodaySteps().catch(() => null)
          if (result?.steps > 0) {
            syncStepsToBackend(gymId, memberId, result.steps).catch(() => {})
          }
        }
      }, 3000)

      // Subscribe to real-time step updates (iOS: push, Android: change tokens)
      stepSubRef.current = subscribeToSteps(({ steps: newSteps, source }) => {
        if (newSteps > 0) {
          setSteps(prev => {
            const safe = Math.max(prev, newSteps)
            const newMilestone = Math.floor(safe / 1000)
            if (newMilestone > lastMilestoneRef.current && lastMilestoneRef.current > 0) {
              lastMilestoneRef.current = newMilestone
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            } else {
              lastMilestoneRef.current = newMilestone
            }
            const today = localDateKey()
            setItem(`ivira_steps_${today}`, String(safe)).catch(() => {})
            return safe
          })
          setStepSource(source)
          setActiveMinutes(Math.floor(newSteps / STEPS_PER_ACTIVE_MINUTE))
          getItem('ivira_member_token').then(token => {
            if (gymId && memberId && newSteps > 0 && token) {
              syncStepsToBackend(gymId, memberId, newSteps).catch(() => {})
            }
          }).catch(() => {})
        }
      })

      // Heart rate still uses polling (no subscription API available)
      hrSyncRef.current = setInterval(fetchHeartData, HR_SYNC_INTERVAL)
    }

    init()

    return () => {
      stepSubRef.current?.() // Unsubscribe from step updates
      if (hrSyncRef.current) clearInterval(hrSyncRef.current)
    }
  }, [stepMode])

  // Pause subscriptions when backgrounded, resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && stepMode === 'auto') {
        // Resume: fetch immediately + heart rate polling
        fetchSteps()
        fetchHeartData()
        if (!hrSyncRef.current) hrSyncRef.current = setInterval(fetchHeartData, HR_SYNC_INTERVAL)
      } else if (state === 'background') {
        // Pause heart rate polling (step subscription handles itself)
        if (hrSyncRef.current) { clearInterval(hrSyncRef.current); hrSyncRef.current = null }
      }
    })
    return () => sub?.remove()
  }, [stepMode, fetchSteps, fetchHeartData])

  // Fetch steps from native health API or pedometer
  const pedometerAvailable = useRef(null) // cache pedometer availability

  const fetchSteps = useCallback(async () => {
    if (stepMode === 'manual') return

    const updateSteps = (newSteps, source) => {
      setSteps(prev => {
        // Monotonic guard — steps should only go up during a day
        const safe = Math.max(prev, newSteps)
        const newMilestone = Math.floor(safe / 1000)
        if (newMilestone > lastMilestoneRef.current && lastMilestoneRef.current > 0) {
          lastMilestoneRef.current = newMilestone
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } else {
          lastMilestoneRef.current = newMilestone
        }
        // Persist to storage so steps survive app restart
        const today = localDateKey()
        setItem(`ivira_steps_${today}`, String(safe)).catch(() => {})
        return safe
      })
      setStepSource(source)
      setActiveMinutes(Math.floor(newSteps / STEPS_PER_ACTIVE_MINUTE))

      if (gymId && memberId && newSteps > 0) {
        getItem('ivira_member_token').then(token => {
          if (token) {
            syncStepsToBackend(gymId, memberId, newSteps).catch(err => { if (__DEV__) console.warn('[HealthCtx]', err?.message) })
          }
        }).catch(() => {})
      }
    }

    // Try native health API first (Health Connect / HealthKit)
    try {
      const result = await getTodaySteps()
      if (result.source && result.steps > 0) {
        updateSteps(result.steps, 'health')
        return // Success — don't fall through to pedometer (prevents double counting)
      }
    } catch (err) { if (__DEV__) console.warn('[HealthCtx] fetchSteps health:', err?.message) }

    // Fallback: Pedometer (only if health API returned no source)
    if (Pedometer) {
      try {
        if (pedometerAvailable.current === null) {
          pedometerAvailable.current = await Pedometer.isAvailableAsync()
        }
        if (pedometerAvailable.current) {
          const start = new Date()
          start.setHours(0, 0, 0, 0)
          const { steps: pedometerSteps } = await Pedometer.getStepCountAsync(start, new Date())
          updateSteps(pedometerSteps || 0, 'pedometer')
          return
        }
      } catch (err) { if (__DEV__) console.warn('[HealthCtx] fetchSteps pedometer:', err?.message) }
    }

    // Neither available
    setStepSource('unavailable')
  }, [stepMode, gymId, memberId])

  // Fetch sleep — Health Connect/HealthKit first, then fallback to local engine data
  const fetchSleep = useCallback(async () => {
    try {
      // Try native health API first
      const nativeSleep = await getLastNightSleep()
      if (nativeSleep) {
        setSleepData(nativeSleep)
        setSleepSource(nativeSleep.source)
        if (gymId && memberId) {
          syncSleepToBackend(gymId, memberId, nativeSleep).catch(err => { if (__DEV__) console.warn('[HealthCtx]', err?.message) })
        }
        return
      }

      // Fallback: check local sleep engine data (from SleepTrackerScreen)
      const lastSleepLog = await getItem('ivira_last_sleep_log')
      if (lastSleepLog) {
        try {
          const parsed = JSON.parse(lastSleepLog)
          // Only use if from last 24 hours
          const logAge = Date.now() - new Date(parsed.wakeTime || parsed.date).getTime()
          if (logAge < 24 * 60 * 60 * 1000) {
            setSleepData({
              bedtime: parsed.bedtime,
              wakeTime: parsed.wakeTime,
              durationMinutes: parsed.durationMinutes || parsed.duration,
              quality: parsed.quality || parsed.score ? Math.round(parsed.score / 20) : 3,
              source: 'sleep_engine',
              stages: parsed.stages || null,
              score: parsed.score || null,
            })
            setSleepSource('sleep_engine')
            return
          }
        } catch (err) { if (__DEV__) console.warn('[HealthCtx] parse sleep log:', err?.message) }
      }

      // Fallback: check sleep engine history (ivira_sleep_engine_history)
      // The sleep engine writes to different storage keys than ivira_last_sleep_log
      try {
        const engineHistoryRaw = await getItem('ivira_sleep_engine_history')
        if (engineHistoryRaw) {
          const engineHistory = JSON.parse(engineHistoryRaw)
          if (Array.isArray(engineHistory) && engineHistory.length > 0) {
            const latest = engineHistory[0] // history is unshift'd, so newest is first
            const logAge = Date.now() - new Date(latest.wakeTime || latest.endTime || latest.date).getTime()
            if (logAge < 24 * 60 * 60 * 1000) {
              // Convert score (0-100) to quality (1-5)
              const quality = latest.score != null
                ? Math.max(1, Math.min(5, Math.round(latest.score / 20)))
                : 3
              setSleepData({
                bedtime: latest.bedtime || latest.startTime,
                wakeTime: latest.wakeTime || latest.endTime,
                durationMinutes: latest.totalMinutes || latest.durationMinutes || latest.sleepMinutes,
                quality,
                source: 'sleep_engine',
                stages: latest.stageTimeline || latest.stages || null,
                score: latest.score || null,
                stageDurations: latest.stageDurations || null,
                efficiency: latest.efficiency || null,
                audioSummary: latest.audioSummary || null,
              })
              setSleepSource('sleep_engine')
              return
            }
          }
        }
      } catch (err) { if (__DEV__) console.warn('[HealthCtx] parse sleep engine history:', err?.message) }

      // Fallback: check active sleep session (ivira_sleep_session)
      try {
        const activeSessionRaw = await getItem('ivira_sleep_session')
        if (activeSessionRaw) {
          const session = JSON.parse(activeSessionRaw)
          const sessionAge = Date.now() - new Date(session.startTime).getTime()
          // If there's an active session less than 12 hours old, show in-progress sleep
          if (sessionAge < 12 * 60 * 60 * 1000) {
            const durationMinutes = Math.round(sessionAge / 60000)
            setSleepData({
              bedtime: session.startTime,
              wakeTime: null,
              durationMinutes,
              quality: null, // still in progress
              source: 'sleep_engine_active',
              inProgress: true,
            })
            setSleepSource('sleep_engine_active')
            return
          }
        }
      } catch (err) { if (__DEV__) console.warn('[HealthCtx] parse active sleep session:', err?.message) }

      // Fallback: check backend for last sleep log
      if (gymId && memberId) {
        try {
          const today = localDateKey()
          const res = await (await import('../lib/api')).default.get(
            `/gyms/${gymId}/members/${memberId}/sleep?date=${today}`
          )
          if (res.data?.bedtime) {
            const bedtime = new Date(res.data.bedtime)
            const wakeTime = new Date(res.data.wake_time)
            setSleepData({
              bedtime: res.data.bedtime,
              wakeTime: res.data.wake_time,
              durationMinutes: Math.round((wakeTime - bedtime) / 60000),
              quality: res.data.quality_rating || 3,
              source: 'backend',
            })
            setSleepSource('backend')
            return
          }
        } catch (err) { if (__DEV__) console.warn('[HealthCtx] backend sleep:', err?.message) }
      }

      setSleepData(null)
      setSleepSource('unavailable')
    } catch (err) {
      if (__DEV__) console.warn('[HealthCtx] fetchSleep:', err?.message)
      Sentry.captureException(err, { extra: { context: 'health_fetch_sleep_failed' } })
      setSleepData(null)
      setSleepSource('unavailable')
    }
  }, [gymId, memberId])

  // Fetch heart rate data
  const fetchHeartData = useCallback(async () => {
    try {
      const [hr, rhr, hrvData, wearable] = await Promise.all([
        getLatestHeartRate(),
        getRestingHeartRate(),
        getHRV(),
        isWearableConnected(),
      ])
      if (hr) setHeartRate(hr)
      if (rhr) setRestingHR(rhr)
      if (hrvData) setHrv(hrvData)
      setWearableConnected(wearable)
    } catch (err) {
      if (__DEV__) console.warn('[HealthCtx] fetchHeartData:', err?.message)
      Sentry.captureException(err, { extra: { context: 'health_fetch_heart_data_failed' } })
    }
  }, [])

  // Manual step update
  const setManualSteps = useCallback(async (count) => {
    const today = localDateKey()
    setSteps(count)
    setStepSource('manual')
    setActiveMinutes(Math.floor(count / 100))
    await setItem(`ivira_manual_steps_${today}`, String(count))
    const token = await getItem('ivira_member_token')
    if (gymId && memberId && count > 0 && token) {
      syncStepsToBackend(gymId, memberId, count).catch(err => { if (__DEV__) console.warn('[HealthCtx]', err?.message) })
    }
  }, [gymId, memberId])

  // Set step mode
  const setStepMode = useCallback(async (mode) => {
    setStepModeState(mode)
    await setItem('ivira_step_mode', mode)
    if (mode === 'auto') {
      // Restart auto tracking
      initialized.current = false
      fetchSteps()
    }
  }, [fetchSteps])

  // Set step goal
  const setStepGoal = useCallback(async (goal) => {
    setStepGoalState(goal)
    await setItem('ivira_step_goal', String(goal))
  }, [])

  // Force refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSteps(), fetchSleep(), fetchHeartData()])
  }, [fetchSteps, fetchSleep, fetchHeartData])

  const value = {
    // Steps
    steps,
    stepSource,
    stepGoal,
    stepMode,
    activeMinutes,
    setManualSteps,
    setStepMode,
    setStepGoal,

    // Sleep
    sleepData,
    sleepSource,
    fetchSleep,

    // Heart
    heartRate,
    restingHR,
    hrv,
    wearableConnected,

    // Actions
    refreshAll,
    fetchSteps,
    fetchHeartData,
  }

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  )
}

export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) {
    // Return safe defaults if used outside provider
    return {
      steps: 0, stepSource: null, stepGoal: 10000, stepMode: 'auto', activeMinutes: 0,
      setManualSteps: () => {}, setStepMode: () => {}, setStepGoal: () => {},
      sleepData: null, sleepSource: null, fetchSleep: () => {},
      heartRate: null, restingHR: null, hrv: null, wearableConnected: false,
      refreshAll: () => {}, fetchSteps: () => {}, fetchHeartData: () => {},
    }
  }
  return ctx
}

export default HealthContext
