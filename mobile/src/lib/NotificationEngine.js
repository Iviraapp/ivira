import { Platform, UIManager } from 'react-native'
import Constants from 'expo-constants'

let Notifications = null
let TaskManager = null
let _modulesChecked = false

// Check if native modules are actually available (not just JS packages)
function isNativeModuleAvailable(moduleName) {
  try {
    if (Platform.OS === 'web') return false
    // expo-task-manager requires native binary — unavailable in Expo Go
    const { NativeModules } = require('react-native')
    return !!NativeModules[moduleName]
  } catch (err) {
    console.warn('[NotificationEngine]', err?.message)
    return false
  }
}

// Lazy-load to avoid crashes in Expo Go
async function loadModules() {
  if (_modulesChecked) return
  _modulesChecked = true

  try {
    Notifications = await import('expo-notifications')
  } catch (err) {
    console.warn('[NotificationEngine] expo-notifications not available:', err?.message)
  }

  if (isNativeModuleAvailable('ExpoTaskManager')) {
    try {
      TaskManager = await import('expo-task-manager')
    } catch (err) {
      console.warn('[NotificationEngine] expo-task-manager not available:', err?.message)
    }
  } else {
    console.warn('[NotificationEngine] ExpoTaskManager native module not found — skipping (expected in Expo Go)')
  }
}

const FASTING_CHANNEL_ID = 'fasting-timer'
const HYDRATION_CHANNEL_ID = 'hydration-reminders'
const FASTING_REMINDER_CHANNEL_ID = 'fasting-reminder'
const FASTING_NOTIFICATION_ID = 'fasting-ongoing'
const FASTING_DAILY_REMINDER_ID = 'fasting-daily-reminder'
const HYDRATION_TASK_NAME = 'HYDRATION_REMINDER_TASK'
const HYDRATION_INTERVAL_MS = 2 * 60 * 60 * 1000 // 2 hours

// Coaching-style hydration messages
const HYDRATION_MESSAGES = [
  { title: 'Hydration Check', body: 'Hydration is the key to autophagy. Have some water now.' },
  { title: 'Water Break', body: 'Your cells are working hard right now. Fuel them with water.' },
  { title: 'Stay Sharp', body: 'Dehydration kills focus. Take 8 sips of water right now.' },
  { title: 'Hydrate or Die-drate', body: 'Fat oxidation needs water. Keep sipping to keep burning.' },
  { title: 'Coach Says', body: 'The best fasters are the best hydrators. Drink up.' },
  { title: 'Water Time', body: 'Electrolytes + water = peak fasting performance. Go.' },
  { title: 'Reminder', body: 'Your body is deep in fat-burning mode. Water accelerates it.' },
]

/**
 * Set up Android notification channels for fasting and hydration.
 */
async function setupChannels() {
  await loadModules()
  if (!Notifications || Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync(FASTING_CHANNEL_ID, {
    name: 'Fasting Timer',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: null,
    vibrationPattern: null,
  })

  await Notifications.setNotificationChannelAsync(FASTING_REMINDER_CHANNEL_ID, {
    name: 'Fasting Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
  })

  await Notifications.setNotificationChannelAsync(HYDRATION_CHANNEL_ID, {
    name: 'Hydration Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
  })
}

/**
 * Show or update the persistent lock screen notification for active fasting.
 */
export async function showFastingNotification(elapsedMs, phase) {
  await loadModules()
  if (!Notifications) return
  if (Constants.appOwnership === 'expo') return // Not supported in Expo Go

  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  await Notifications.scheduleNotificationAsync({
    identifier: FASTING_NOTIFICATION_ID,
    content: {
      title: `⏱ ${timeStr} — ${phase}`,
      body: 'Your fast is in progress. Tap to open IVIRA.',
      sticky: true, // Android: cannot be swiped away
      autoDismiss: false,
      priority: 'low',
      ...(Platform.OS === 'android' && { channelId: FASTING_CHANNEL_ID }),
    },
    trigger: null, // Show immediately
  })
}

/**
 * Dismiss the persistent fasting notification.
 */
export async function dismissFastingNotification() {
  await loadModules()
  if (!Notifications) return

  try {
    await Notifications.dismissNotificationAsync(FASTING_NOTIFICATION_ID)
  } catch (err) { console.warn('[NotificationEngine]', err?.message) }
  try {
    await Notifications.cancelScheduledNotificationAsync(FASTING_NOTIFICATION_ID)
  } catch (err) { console.warn('[NotificationEngine]', err?.message) }
}

/**
 * Schedule recurring hydration reminders every 2 hours.
 * Uses scheduled notifications (more reliable than background tasks in Expo).
 */
export async function startHydrationReminders(fastDurationHours = 16) {
  await loadModules()
  if (!Notifications) return
  if (Constants.appOwnership === 'expo') return

  // Cancel any existing hydration reminders first
  await stopHydrationReminders()

  await setupChannels()

  // Schedule reminders at 2h, 4h, 6h, etc. up to the fast duration
  const maxReminders = Math.floor(fastDurationHours / 2)
  for (let i = 1; i <= maxReminders; i++) {
    const msg = HYDRATION_MESSAGES[(i - 1) % HYDRATION_MESSAGES.length]
    await Notifications.scheduleNotificationAsync({
      identifier: `hydration-${i}`,
      content: {
        title: msg.title,
        body: msg.body,
        ...(Platform.OS === 'android' && { channelId: HYDRATION_CHANNEL_ID }),
        categoryIdentifier: 'hydration',
      },
      trigger: {
        type: 'timeInterval',
        seconds: i * 2 * 60 * 60, // 2h, 4h, 6h...
        repeats: false,
      },
    })
  }
}

/**
 * Cancel all scheduled hydration reminders.
 */
export async function stopHydrationReminders() {
  await loadModules()
  if (!Notifications) return

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of scheduled) {
      if (n.identifier?.startsWith('hydration-')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch (err) { console.warn('[NotificationEngine]', err?.message) }
}

/**
 * Register notification categories with action buttons (e.g., "Drink Water").
 */
export async function registerNotificationCategories() {
  await loadModules()
  if (!Notifications) return
  if (Constants.appOwnership === 'expo') return

  await Notifications.setNotificationCategoryAsync('hydration', [
    {
      identifier: 'DRINK_WATER',
      buttonTitle: '💧 Drink Water',
      options: { opensAppToForeground: false },
    },
  ])
}

/**
 * Handle notification response (e.g., "Drink Water" button tap).
 * Returns the action identifier if it's a hydration action, null otherwise.
 */
export function isHydrationAction(response) {
  return response?.actionIdentifier === 'DRINK_WATER'
}

/**
 * Schedule a daily fasting reminder notification at the given hour and minute.
 * Fires every day so the user is reminded to start their fast.
 */
export async function scheduleFastingReminder(hour, minute) {
  await loadModules()
  if (!Notifications) return
  if (Constants.appOwnership === 'expo') return

  // Cancel any existing fasting reminder first
  await cancelFastingReminder()

  await setupChannels()

  await Notifications.scheduleNotificationAsync({
    identifier: FASTING_DAILY_REMINDER_ID,
    content: {
      title: 'Time to Fast',
      body: 'Time to start your fast! Tap to begin your fasting window.',
      ...(Platform.OS === 'android' && { channelId: FASTING_REMINDER_CHANNEL_ID }),
    },
    trigger: {
      type: 'daily',
      hour,
      minute,
      repeats: true,
    },
  })
}

/**
 * Cancel the scheduled daily fasting reminder.
 */
export async function cancelFastingReminder() {
  await loadModules()
  if (!Notifications) return

  try {
    await Notifications.cancelScheduledNotificationAsync(FASTING_DAILY_REMINDER_ID)
  } catch (err) { console.warn('[NotificationEngine]', err?.message) }
}

// Initialize channels on module load (fire-and-forget)
if (Platform.OS !== 'web') {
  setupChannels().catch(err => console.warn('[NotificationEngine]', err?.message))
  registerNotificationCategories().catch(err => console.warn('[NotificationEngine]', err?.message))
}
