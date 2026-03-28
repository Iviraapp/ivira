// HealthContext — Single source of truth for health data across all screens
// Provides: steps, sleep, heart rate, HRV with real-time sync
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Platform, AppState } from 'react-native'
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
} from '../lib/healthKit'
import Haptics from '../lib/haptics'

let Pedometer = null
try { Pedometer = require('expo-sensors').Pedometer } catch (err) { console.warn('[HealthCtx] Pedometer load:', err?.message) }

const HealthContext = createContext(null)

const SYNC_INTERVAL = 30_000 // 30 seconds for steps
const HR_SYNC_INTERVAL = 120_000 // 2 minutes for heart rate
const DEFAULT_STEP_GOAL = 10000

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
  const stepSyncRef = useRef(null)
  const hrSyncRef = useRef(null)
  const permissionsGranted = useRef(false)
  const initialized = useRef(false)

  // Manual step mode
  const [stepMode, setStepModeState] = useState('auto') // 'auto' | 'manual'

  // Load saved preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedGoal = await getItem('ivira_step_goal')
        if (savedGoal) setStepGoalState(parseInt(savedGoal) || DEFAULT_STEP_GOAL)
        const savedMode = await getItem('ivira_step_mode')
        if (savedMode) setStepModeState(savedMode)
        if (savedMode === 'manual') {
          const today = new Date().toISOString().split('T')[0]
          const manualSteps = await getItem(`ivira_manual_steps_${today}`)
          if (manualSteps) {
            setSteps(parseInt(manualSteps) || 0)
            setStepSource('manual')
          }
        }
      } catch (err) { console.warn('[HealthCtx] loadPrefs:', err?.message) }
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
      } catch (err) { console.warn('[HealthCtx] permissions:', err?.message) }

      // Initial data fetch
      await fetchSteps()
      await fetchSleep()
      await fetchHeartData()

      // Start periodic sync
      stepSyncRef.current = setInterval(fetchSteps, SYNC_INTERVAL)
      hrSyncRef.current = setInterval(fetchHeartData, HR_SYNC_INTERVAL)
    }

    init()

    return () => {
      if (stepSyncRef.current) clearInterval(stepSyncRef.current)
      if (hrSyncRef.current) clearInterval(hrSyncRef.current)
    }
  }, [stepMode])

  // Re-fetch on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && stepMode === 'auto') {
        fetchSteps()
        fetchHeartData()
      }
    })
    return () => sub?.remove()
  }, [stepMode])

  // Fetch steps from native health API or pedometer
  const fetchSteps = useCallback(async () => {
    if (stepMode === 'manual') return

    try {
      const result = await getTodaySteps()
      if (result.source) {
        setSteps(prev => {
          const newMilestone = Math.floor(result.steps / 1000)
          if (newMilestone > lastMilestoneRef.current && lastMilestoneRef.current > 0) {
            lastMilestoneRef.current = newMilestone
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          } else {
            lastMilestoneRef.current = newMilestone
          }
          return result.steps
        })
        setStepSource('health')
        // Derive active minutes: ~100 steps per minute of walking
        setActiveMinutes(Math.floor(result.steps / 100))

        // Sync to backend
        if (gymId && memberId) {
          syncStepsToBackend(gymId, memberId, result.steps).catch(err => console.warn('[HealthCtx]', err?.message))
        }
        return
      }
    } catch (err) { console.warn('[HealthCtx] fetchSteps health:', err?.message) }

    // Fallback: Pedometer
    if (Pedometer) {
      try {
        const available = await Pedometer.isAvailableAsync()
        if (available) {
          const start = new Date()
          start.setHours(0, 0, 0, 0)
          const { steps: pedometerSteps } = await Pedometer.getStepCountAsync(start, new Date())
          setSteps(pedometerSteps || 0)
          setStepSource('pedometer')
          setActiveMinutes(Math.floor((pedometerSteps || 0) / 100))

          if (gymId && memberId && pedometerSteps > 0) {
            syncStepsToBackend(gymId, memberId, pedometerSteps).catch(err => console.warn('[HealthCtx]', err?.message))
          }
          return
        }
      } catch (err) { console.warn('[HealthCtx] fetchSteps pedometer:', err?.message) }
    }

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
          syncSleepToBackend(gymId, memberId, nativeSleep).catch(err => console.warn('[HealthCtx]', err?.message))
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
        } catch (err) { console.warn('[HealthCtx] parse sleep log:', err?.message) }
      }

      // Fallback: check backend for last sleep log
      if (gymId && memberId) {
        try {
          const today = new Date().toISOString().split('T')[0]
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
        } catch (err) { console.warn('[HealthCtx] backend sleep:', err?.message) }
      }

      setSleepData(null)
      setSleepSource('unavailable')
    } catch (err) {
      console.warn('[HealthCtx] fetchSleep:', err?.message)
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
    } catch (err) { console.warn('[HealthCtx] fetchHeartData:', err?.message) }
  }, [])

  // Manual step update
  const setManualSteps = useCallback(async (count) => {
    const today = new Date().toISOString().split('T')[0]
    setSteps(count)
    setStepSource('manual')
    setActiveMinutes(Math.floor(count / 100))
    await setItem(`ivira_manual_steps_${today}`, String(count))
    if (gymId && memberId) {
      syncStepsToBackend(gymId, memberId, count).catch(err => console.warn('[HealthCtx]', err?.message))
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
