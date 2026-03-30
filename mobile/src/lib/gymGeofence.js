import { Platform } from 'react-native'
import { getItem, setItem } from './storage'

let Location = null
let TaskManager = null
let Notifications = null
try { Location = require('expo-location') } catch (err) { if (__DEV__) console.warn('[Geofence] Location load:', err?.message) }
try { TaskManager = require('expo-task-manager') } catch (err) { if (__DEV__) console.warn('[Geofence] TaskManager load:', err?.message) }
try { Notifications = require('expo-notifications') } catch (err) { if (__DEV__) console.warn('[Geofence] Notifications load:', err?.message) }

const GEOFENCE_TASK = 'IVIRA_GYM_GEOFENCE'
const GEOFENCE_RADIUS = 200 // meters
const COOLDOWN_KEY = 'ivira_geofence_last_notified'
const COOLDOWN_MS = 4 * 60 * 60 * 1000 // 4 hours between notifications

// Register the background task (must be called at module level for expo-task-manager)
if (TaskManager) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
      if (__DEV__) console.warn('[geofence] Task error:', error.message)
      return
    }

    if (!data?.eventType || !data?.region) return

    const GeofencingEventType = Location?.GeofencingEventType
    if (!GeofencingEventType) return

    if (data.eventType === GeofencingEventType.Enter) {
      // Check cooldown — don't spam notifications
      const lastNotified = await getItem(COOLDOWN_KEY)
      if (lastNotified && Date.now() - parseInt(lastNotified, 10) < COOLDOWN_MS) {
        return
      }

      // Send local notification
      if (Notifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'You\'re near your gym! 🎯',
            body: 'Ready for a workout? Open IVIRA to start tracking.',
            data: { type: 'gym_nearby', gymId: data.region.identifier },
            sound: true,
          },
          trigger: null, // immediate
        })
      }

      await setItem(COOLDOWN_KEY, String(Date.now()))
    }
  })
}

/**
 * Start monitoring the user's gym location.
 * Call this after login when gym info (with lat/lng) is available.
 */
export async function startGymGeofencing(gymInfo) {
  if (!Location || !TaskManager) {
    if (__DEV__) console.log('[geofence] Location or TaskManager not available')
    return false
  }

  const lat = parseFloat(gymInfo?.latitude)
  const lng = parseFloat(gymInfo?.longitude)

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    if (__DEV__) console.log('[geofence] Gym has no coordinates, skipping geofencing')
    return false
  }

  try {
    // Request background location permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
    if (fgStatus !== 'granted') {
      if (__DEV__) console.log('[geofence] Foreground location denied')
      return false
    }

    // On iOS, we need background permission for geofencing
    if (Platform.OS === 'ios') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
      if (bgStatus !== 'granted') {
        if (__DEV__) console.log('[geofence] Background location denied (iOS)')
        return false
      }
    }

    // On Android 10+, also need background permission
    if (Platform.OS === 'android') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
      if (bgStatus !== 'granted') {
        if (__DEV__) console.log('[geofence] Background location denied (Android)')
        // Still works with foreground on some devices, try anyway
      }
    }

    // Stop any existing geofencing first
    const isRunning = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK)
    }

    // Start geofencing
    await Location.startGeofencingAsync(GEOFENCE_TASK, [
      {
        identifier: gymInfo.id || 'gym',
        latitude: lat,
        longitude: lng,
        radius: GEOFENCE_RADIUS,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ])

    console.log(`[geofence] Monitoring gym at ${lat},${lng} (${GEOFENCE_RADIUS}m radius)`)
    return true
  } catch (err) {
    if (__DEV__) console.warn('[geofence] Setup failed:', err?.message)
    return false
  }
}

/**
 * Stop monitoring gym location.
 * Call on logout.
 */
export async function stopGymGeofencing() {
  if (!Location || !TaskManager) return

  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK)
      if (__DEV__) console.log('[geofence] Stopped monitoring')
    }
  } catch (err) {
    if (__DEV__) console.warn('[geofence] Stop failed:', err?.message)
  }
}

/**
 * Check if geofencing is currently active.
 */
export async function isGeofencingActive() {
  if (!TaskManager) return false
  try {
    return await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)
  } catch (err) {
    if (__DEV__) console.warn('[Geofence] isGeofencingActive:', err?.message)
    return false
  }
}
