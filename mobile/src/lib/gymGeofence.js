import { Platform } from 'react-native'
import { getItem, setItem } from './storage'

let Location = null
let TaskManager = null
let Notifications = null
try { Location = require('expo-location') } catch (err) { if (__DEV__) console.warn('[Geofence] Location load:', err?.message) }
try { TaskManager = require('expo-task-manager') } catch (err) { if (__DEV__) console.warn('[Geofence] TaskManager load:', err?.message) }
try { Notifications = require('expo-notifications') } catch (err) { if (__DEV__) console.warn('[Geofence] Notifications load:', err?.message) }

const GEOFENCE_TASK = 'IVIRA_GYM_GEOFENCE'
const OUTER_RADIUS = 250
const INNER_RADIUS = 50
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

      const isInner = data.region?.identifier?.endsWith('_inner')
      const isOuter = data.region?.identifier?.endsWith('_outer')

      // Send local notification
      if (Notifications) {
        if (isInner) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'You\'re at the gym 🏋️',
              body: 'Ready for a workout? Open IVIRA to start tracking.',
              data: { action: 'open_checkin' },
              sound: false,
            },
            trigger: null,
          })
        } else if (isOuter) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'You\'re near your gym 🎯',
              body: 'Ready for a workout? Open IVIRA to start tracking.',
              data: { action: 'open_checkin' },
              sound: true,
              categoryIdentifier: 'gym_nearby',
            },
            trigger: null,
          })
        }
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
        identifier: `${gymInfo.id}_outer`,
        latitude: lat,
        longitude: lng,
        radius: OUTER_RADIUS,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
      {
        identifier: `${gymInfo.id}_inner`,
        latitude: lat,
        longitude: lng,
        radius: INNER_RADIUS,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ])

    console.log(`[geofence] Monitoring gym at ${lat},${lng} (outer=${OUTER_RADIUS}m, inner=${INNER_RADIUS}m)`)
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
