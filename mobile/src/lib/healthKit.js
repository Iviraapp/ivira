// HealthKit (iOS) / Health Connect (Android) integration
// Uses platform-safe fallbacks and demo data when native APIs unavailable
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from './api'

export const DEMO_STEPS = 0 // No fake step data — show empty state
const isExpoGo = Constants.appOwnership === 'expo'

// Safely try to load optional native modules at startup.
// We hide the module name from Metro's static analysis so it won't
// fail the bundle when the package isn't installed.
let AppleHealthKit = null
try {
  // iOS only — react-native-health is not installed for Android builds
  const iosModule = 'react-native-' + 'health'
  AppleHealthKit = require(iosModule).default
} catch (err) { console.warn('[HealthKit] AppleHealthKit load:', err?.message) }

let HealthConnect = null
try {
  HealthConnect = require('react-native-health-connect')
} catch (err) { console.warn('[HealthKit] HealthConnect load:', err?.message) }

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
  } catch (err) {
    console.warn('[HealthKit] isHealthConnectAvailable:', err?.message)
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
    return { steps: 0, source: null }
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

export const DEMO_SLEEP = null // No fake sleep data

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
    return null
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

// ── Heart Rate / HRV / Resting HR ─────────────────────────────

export const DEMO_HEART_RATE = null // No fake heart rate data
export const DEMO_RESTING_HR = null // No fake resting HR data
export const DEMO_HRV = null // No fake HRV data

/**
 * Request extended health permissions including heart rate data.
 * Call this instead of requestHealthPermissions() when you need HR data.
 */
export async function requestExtendedPermissions() {
  if (isExpoGo || Platform.OS === 'web') return true

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        const permissions = {
          permissions: {
            read: [
              AppleHealthKit.Constants.Permissions.StepCount,
              AppleHealthKit.Constants.Permissions.SleepAnalysis,
              AppleHealthKit.Constants.Permissions.HeartRate,
              AppleHealthKit.Constants.Permissions.HeartRateVariability,
              AppleHealthKit.Constants.Permissions.RestingHeartRate,
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
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
          { accessType: 'read', recordType: 'RestingHeartRate' },
        ])
        return granted.length > 0
      } catch {
        return false
      }
    }
  } catch (err) {
    console.warn('[HealthKit] Extended permission failed:', err.message)
  }
  return false
}

/**
 * Get the most recent heart rate reading.
 * Returns { bpm, timestamp, source } or null.
 */
export async function getLatestHeartRate() {
  if (isExpoGo || Platform.OS === 'web') {
    return null
  }

  const now = new Date()
  const lookback = new Date(now.getTime() - 4 * 60 * 60 * 1000) // last 4 hours

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getHeartRateSamples(
          { startDate: lookback.toISOString(), endDate: now.toISOString(), ascending: false, limit: 1 },
          (err, results) => {
            if (err || !results || results.length === 0) {
              resolve(null)
              return
            }
            const sample = results[0]
            resolve({
              bpm: Math.round(sample.value),
              timestamp: sample.endDate || sample.startDate,
              source: 'apple_health',
            })
          }
        )
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) return null

      const result = await HealthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: lookback.toISOString(),
          endTime: now.toISOString(),
        },
      })
      const records = result?.records || []
      if (records.length === 0) return null

      const latest = records[records.length - 1]
      const samples = latest.samples || []
      const lastSample = samples[samples.length - 1]
      return {
        bpm: lastSample?.beatsPerMinute || 0,
        timestamp: latest.endTime || latest.startTime,
        source: 'health_connect',
      }
    }
  } catch (err) {
    console.warn('[HealthKit] Failed to fetch heart rate:', err.message)
  }
  return null
}

/**
 * Get resting heart rate.
 * Returns { bpm, source } or null.
 */
export async function getRestingHeartRate() {
  if (isExpoGo || Platform.OS === 'web') {
    return null
  }

  const now = new Date()
  const lookback = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getRestingHeartRate(
          { startDate: lookback.toISOString(), endDate: now.toISOString() },
          (err, results) => {
            if (err || !results || results.length === 0) {
              resolve(null)
              return
            }
            resolve({
              bpm: Math.round(results[results.length - 1].value),
              source: 'apple_health',
            })
          }
        )
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) return null

      const result = await HealthConnect.readRecords('RestingHeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: lookback.toISOString(),
          endTime: now.toISOString(),
        },
      })
      const records = result?.records || []
      if (records.length === 0) return null
      return {
        bpm: records[records.length - 1].beatsPerMinute || 0,
        source: 'health_connect',
      }
    }
  } catch (err) {
    console.warn('[HealthKit] Failed to fetch resting HR:', err.message)
  }
  return null
}

/**
 * Get heart rate variability (HRV).
 * Returns { ms, source } or null.
 * iOS returns SDNN, Android returns RMSSD — both are valid HRV metrics.
 */
export async function getHRV() {
  if (isExpoGo || Platform.OS === 'web') {
    return null
  }

  const now = new Date()
  const lookback = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getHeartRateVariabilitySamples(
          { startDate: lookback.toISOString(), endDate: now.toISOString(), ascending: false, limit: 1 },
          (err, results) => {
            if (err || !results || results.length === 0) {
              resolve(null)
              return
            }
            resolve({
              ms: Math.round(results[0].value * 1000), // Apple returns seconds, convert to ms
              source: 'apple_health',
            })
          }
        )
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) return null

      const result = await HealthConnect.readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: {
          operator: 'between',
          startTime: lookback.toISOString(),
          endTime: now.toISOString(),
        },
      })
      const records = result?.records || []
      if (records.length === 0) return null
      return {
        ms: Math.round(records[records.length - 1].heartRateVariabilityMillis || 0),
        source: 'health_connect',
      }
    }
  } catch (err) {
    console.warn('[HealthKit] Failed to fetch HRV:', err.message)
  }
  return null
}

/**
 * Get heart rate samples for charting (last N hours).
 * Returns array of { bpm, timestamp }.
 */
export async function getHeartRateSamples(hours = 24) {
  if (isExpoGo || Platform.OS === 'web') {
    return []
  }

  const now = new Date()
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000)

  try {
    if (Platform.OS === 'ios' && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getHeartRateSamples(
          { startDate: start.toISOString(), endDate: now.toISOString(), ascending: true, limit: 200 },
          (err, results) => {
            if (err || !results) {
              resolve([])
              return
            }
            resolve(results.map(s => ({
              bpm: Math.round(s.value),
              timestamp: s.endDate || s.startDate,
            })))
          }
        )
      })
    }

    if (Platform.OS === 'android' && HealthConnect) {
      const ready = await ensureHealthConnectReady()
      if (!ready) return []

      const result = await HealthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: now.toISOString(),
        },
      })
      const samples = []
      for (const record of (result?.records || [])) {
        for (const s of (record.samples || [])) {
          samples.push({ bpm: s.beatsPerMinute, timestamp: s.time || record.startTime })
        }
      }
      return samples
    }
  } catch (err) {
    console.warn('[HealthKit] Failed to fetch HR samples:', err.message)
  }
  return []
}

/**
 * Check if a wearable device is connected (has reported HR data recently).
 */
export async function isWearableConnected() {
  const hr = await getLatestHeartRate()
  if (!hr || !hr.source) return false
  // Check if data is from the last 4 hours
  const age = Date.now() - new Date(hr.timestamp).getTime()
  return age < 4 * 60 * 60 * 1000
}

export default {
  requestHealthPermissions,
  requestExtendedPermissions,
  requestSleepPermissions,
  getTodaySteps,
  getLastNightSleep,
  getLatestHeartRate,
  getRestingHeartRate,
  getHRV,
  getHeartRateSamples,
  isWearableConnected,
  syncStepsToBackend,
  syncSleepToBackend,
  DEMO_STEPS,
  DEMO_SLEEP,
  DEMO_HEART_RATE,
  DEMO_RESTING_HR,
  DEMO_HRV,
}
