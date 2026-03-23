// HealthKit (iOS) / Health Connect (Android) integration
// Uses platform-safe fallbacks and demo data when native APIs unavailable
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from './api'

export const DEMO_STEPS = 6847
const isExpoGo = Constants.appOwnership === 'expo'

// Safely try to load optional native modules at startup.
// We hide the module name from Metro's static analysis so it won't
// fail the bundle when the package isn't installed.
let AppleHealthKit = null
try {
  // iOS only — react-native-health is not installed for Android builds
  const iosModule = 'react-native-' + 'health'
  AppleHealthKit = require(iosModule).default
} catch {}

let HealthConnect = null
try {
  HealthConnect = require('react-native-health-connect')
} catch {}

// ──────────────────────────────────────────────────────────────
// Singleton Health Connect initializer.
// Every call to ensureHealthConnectReady() returns the SAME
// promise, so initialize() is invoked exactly once regardless of
// how many useEffect hooks or functions call it concurrently.
// This eliminates the lateinit race condition.
// ──────────────────────────────────────────────────────────────
let _hcInitPromise = null
let _hcReady = false

function ensureHealthConnectReady() {
  if (_hcReady) return Promise.resolve(true)
  if (_hcInitPromise) return _hcInitPromise

  _hcInitPromise = (async () => {
    try {
      const result = await HealthConnect.initialize()
      _hcReady = !!result
      return _hcReady
    } catch (err) {
      console.warn('[HealthKit] Health Connect initialize failed:', err.message)
      _hcReady = false
      _hcInitPromise = null // Allow retry on next call
      return false
    }
  })()

  return _hcInitPromise
}

/**
 * Request permission to read step count data.
 * Returns true if granted, false otherwise.
 */
export async function requestHealthPermissions() {
  if (isExpoGo || Platform.OS === 'web') {
    console.warn('[HealthKit] Running in Expo Go or web — using demo data')
    return true
  }

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        const permissions = {
          permissions: {
            read: [AppleHealthKit.Constants.Permissions.StepCount],
          },
        }
        AppleHealthKit.initHealthKit(permissions, (err) => {
          if (err) {
            console.warn('[HealthKit] Permission denied:', err)
            resolve(false)
          } else {
            resolve(true)
          }
        })
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) {
        console.warn('[HealthKit] Health Connect not ready — app may not be installed')
        return false
      }

      try {
        const granted = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
        ])
        console.log('[HealthKit] Health Connect permissions granted:', granted.length)
        return granted.length > 0
      } catch (permErr) {
        console.warn('[HealthKit] Health Connect permission request failed:', permErr.message)
        return false
      }
    }

    if (Platform.OS === 'android' && !HealthConnect) {
      console.warn('[HealthKit] react-native-health-connect module not loaded')
      return false
    }
  } catch (err) {
    console.warn('[HealthKit] Native health module not available:', err.message)
    return false
  }

  return false
}

/**
 * Check if Health Connect is available on this device.
 * Samsung phones with Android 14+ have it built-in; older phones need the app installed.
 */
export async function isHealthConnectAvailable() {
  if (Platform.OS !== 'android' || !HealthConnect) return false
  try {
    const status = await HealthConnect.getSdkStatus()
    // SDK_AVAILABLE = 3, SDK_UNAVAILABLE = 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2
    return status === 3
  } catch {
    return false
  }
}

/**
 * Get today's total step count.
 * Returns { steps: number, source: 'health_connect'|'apple_health'|null }.
 * source is null when native APIs are unavailable (caller should use fallback).
 */
export async function getTodaySteps() {
  if (isExpoGo || Platform.OS === 'web') {
    return { steps: DEMO_STEPS, source: null }
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getStepCount(
          { date: startOfDay.toISOString(), includeManuallyAdded: true },
          (err, result) => {
            if (err || !result) {
              console.warn('[HealthKit] Step query failed:', err)
              resolve({ steps: 0, source: null })
            } else {
              resolve({ steps: Math.round(result.value || 0), source: 'apple_health' })
            }
          }
        )
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) {
        console.warn('[HealthKit] Health Connect not ready for step read')
        return { steps: 0, source: null }
      }

      const result = await HealthConnect.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        },
      })
      const totalSteps = (result?.records || []).reduce(
        (sum, record) => sum + (record.count || 0),
        0
      )
      console.log('[HealthKit] Health Connect steps:', totalSteps, 'records:', result?.records?.length)
      return { steps: totalSteps, source: 'health_connect' }
    }
  } catch (err) {
    console.warn('[HealthKit] Failed to fetch steps:', err.message)
    return { steps: 0, source: null }
  }

  return { steps: 0, source: null }
}

/**
 * Sync step count to the backend.
 */
export async function syncStepsToBackend(gymId, memberId, steps) {
  try {
    const today = new Date().toISOString().split('T')[0]
    await api.post(`/gyms/${gymId}/members/${memberId}/health/steps`, {
      steps,
      date: today,
      source: Platform.OS === 'ios' ? 'apple_health' : Platform.OS === 'android' ? 'health_connect' : 'manual',
    })
    return true
  } catch (err) {
    console.warn('[HealthKit] Failed to sync steps:', err)
    return false
  }
}

// ── Sleep Tracking ──────────────────────────────────────────────

export const DEMO_SLEEP = {
  bedtime: (() => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23, 15, 0, 0); return d.toISOString() })(),
  wakeTime: (() => { const d = new Date(); d.setHours(6, 42, 0, 0); return d.toISOString() })(),
  durationMinutes: 447,
  quality: 4,
  source: null,
}

/**
 * Request permission to read sleep data.
 * Call after requestHealthPermissions() for steps.
 */
export async function requestSleepPermissions() {
  if (isExpoGo || Platform.OS === 'web') return true

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        const permissions = {
          permissions: {
            read: [
              AppleHealthKit.Constants.Permissions.StepCount,
              AppleHealthKit.Constants.Permissions.SleepAnalysis,
            ],
          },
        }
        AppleHealthKit.initHealthKit(permissions, (err) => {
          resolve(!err)
        })
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) return false

      try {
        const granted = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'SleepSession' },
        ])
        return granted.length > 0
      } catch {
        return false
      }
    }
  } catch (err) {
    console.warn('[HealthKit] Sleep permission failed:', err.message)
  }
  return false
}

/**
 * Get last night's sleep data.
 * Returns { bedtime, wakeTime, durationMinutes, quality, source } or null.
 */
export async function getLastNightSleep() {
  if (isExpoGo || Platform.OS === 'web') {
    return { ...DEMO_SLEEP }
  }

  const now = new Date()
  // Look back 24 hours for sleep data
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getSleepSamples(
          {
            startDate: yesterday.toISOString(),
            endDate: now.toISOString(),
            limit: 10,
          },
          (err, results) => {
            if (err || !results || results.length === 0) {
              console.warn('[HealthKit] Sleep query failed or empty:', err)
              resolve(null)
              return
            }

            // Filter for ASLEEP samples (value === 'ASLEEP' or 'INBED')
            const asleepSamples = results.filter(s =>
              s.value === 'ASLEEP' || s.value === 'INBED' || s.value === 'CORE' || s.value === 'DEEP' || s.value === 'REM'
            )

            if (asleepSamples.length === 0) {
              resolve(null)
              return
            }

            // Find earliest bedtime and latest wake time
            const bedtime = asleepSamples.reduce((earliest, s) =>
              new Date(s.startDate) < new Date(earliest) ? s.startDate : earliest,
              asleepSamples[0].startDate
            )
            const wakeTime = asleepSamples.reduce((latest, s) =>
              new Date(s.endDate) > new Date(latest) ? s.endDate : latest,
              asleepSamples[0].endDate
            )

            const durationMinutes = Math.round((new Date(wakeTime) - new Date(bedtime)) / 60000)

            // Estimate quality from duration (7-9h = good)
            let quality = 3
            if (durationMinutes >= 420 && durationMinutes <= 540) quality = 5
            else if (durationMinutes >= 360 && durationMinutes < 420) quality = 4
            else if (durationMinutes > 540 && durationMinutes <= 600) quality = 4
            else if (durationMinutes < 300) quality = 2
            else if (durationMinutes > 600) quality = 3

            resolve({
              bedtime,
              wakeTime,
              durationMinutes,
              quality,
              source: 'apple_health',
            })
          }
        )
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) return null

      const result = await HealthConnect.readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: yesterday.toISOString(),
          endTime: now.toISOString(),
        },
      })

      const sessions = result?.records || []
      if (sessions.length === 0) return null

      // Take the most recent session
      const latest = sessions[sessions.length - 1]
      const bedtime = latest.startTime
      const wakeTime = latest.endTime
      const durationMinutes = Math.round((new Date(wakeTime) - new Date(bedtime)) / 60000)

      let quality = 3
      if (durationMinutes >= 420 && durationMinutes <= 540) quality = 5
      else if (durationMinutes >= 360 && durationMinutes < 420) quality = 4
      else if (durationMinutes > 540 && durationMinutes <= 600) quality = 4
      else if (durationMinutes < 300) quality = 2

      return {
        bedtime,
        wakeTime,
        durationMinutes,
        quality,
        source: 'health_connect',
      }
    }
  } catch (err) {
    console.warn('[HealthKit] Failed to fetch sleep:', err.message)
  }

  return null
}

/**
 * Sync sleep data to the backend.
 */
export async function syncSleepToBackend(gymId, memberId, sleepData) {
  try {
    await api.post(`/gyms/${gymId}/members/${memberId}/sleep`, {
      bedtime: sleepData.bedtime,
      wake_time: sleepData.wakeTime,
      quality_rating: sleepData.quality,
      notes: sleepData.source ? `Auto-synced from ${sleepData.source}` : undefined,
    })
    return true
  } catch (err) {
    console.warn('[HealthKit] Failed to sync sleep:', err)
    return false
  }
}

export default {
  requestHealthPermissions,
  requestSleepPermissions,
  getTodaySteps,
  getLastNightSleep,
  syncStepsToBackend,
  syncSleepToBackend,
  DEMO_STEPS,
  DEMO_SLEEP,
}
