/**
 * SmartNotificationEngine — Adaptive notifications based on user behavior patterns.
 *
 * Tracks:
 *  - App open times (when the user typically launches the app)
 *  - Water intake patterns (when they drink, how often, daily totals)
 *  - Meal logging times (breakfast, lunch, dinner patterns)
 *  - Workout / check-in times (when they go to the gym)
 *  - Fasting window patterns (when they start/end fasts)
 *
 * Uses a rolling 14-day window to learn patterns and schedule notifications
 * at optimal times — not arbitrary intervals but aligned with the user's rhythm.
 */
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getItem, setItem } from './storage'

let Notifications = null
let _loaded = false

async function loadNotifications() {
  if (_loaded) return
  _loaded = true
  try {
    Notifications = await import('expo-notifications')
  } catch (err) {
    console.warn('[SmartNotifs] expo-notifications not available:', err?.message)
  }
}

// ── Storage keys ─────────────────────────────────────────────────────
const PATTERNS_KEY = 'ivira_smart_patterns'
const PREFS_KEY = 'ivira_notification_prefs'

// ── Default preferences ──────────────────────────────────────────────
const DEFAULT_PREFS = {
  enabled: true,
  workout_reminders: true,
  water_reminders: true,
  meal_reminders: true,
  streak_motivation: true,
  smart_timing: true, // Use learned patterns vs fixed times
  quiet_hours_start: 22, // 10 PM
  quiet_hours_end: 7,    // 7 AM
}

// ── Pattern data structure ───────────────────────────────────────────
function emptyPatterns() {
  return {
    app_opens: [],       // [{ hour, minute, day_of_week, date }]
    water_logs: [],      // [{ hour, minute, ml, date }]
    meals: [],           // [{ hour, minute, meal_type, date }]
    workouts: [],        // [{ hour, minute, day_of_week, date }]
    fasting_starts: [],  // [{ hour, minute, date }]
    last_updated: null,
  }
}

// ── Persistence ──────────────────────────────────────────────────────
async function loadPatterns() {
  try {
    const raw = await getItem(PATTERNS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) { console.warn('[SmartNotifs]', err?.message) }
  return emptyPatterns()
}

async function savePatterns(patterns) {
  patterns.last_updated = new Date().toISOString()
  await setItem(PATTERNS_KEY, JSON.stringify(patterns))
}

export async function loadPrefs() {
  try {
    const raw = await getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch (err) { console.warn('[SmartNotifs]', err?.message) }
  return { ...DEFAULT_PREFS }
}

export async function savePrefs(prefs) {
  await setItem(PREFS_KEY, JSON.stringify(prefs))
}

// ── Trim old entries (keep last 14 days) ─────────────────────────────
function trimToWindow(entries, days = 14) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return entries.filter(e => e.date >= cutoffStr)
}

// ── Pattern recording ────────────────────────────────────────────────

export async function recordAppOpen() {
  const patterns = await loadPatterns()
  const now = new Date()
  patterns.app_opens = trimToWindow([...patterns.app_opens, {
    hour: now.getHours(),
    minute: now.getMinutes(),
    day_of_week: now.getDay(),
    date: now.toISOString().split('T')[0],
  }])
  await savePatterns(patterns)
}

export async function recordWaterIntake(ml) {
  const patterns = await loadPatterns()
  const now = new Date()
  patterns.water_logs = trimToWindow([...patterns.water_logs, {
    hour: now.getHours(),
    minute: now.getMinutes(),
    ml,
    date: now.toISOString().split('T')[0],
  }])
  await savePatterns(patterns)
}

export async function recordMeal(mealType) {
  const patterns = await loadPatterns()
  const now = new Date()
  patterns.meals = trimToWindow([...patterns.meals, {
    hour: now.getHours(),
    minute: now.getMinutes(),
    meal_type: mealType,
    date: now.toISOString().split('T')[0],
  }])
  await savePatterns(patterns)
}

// Vira AI notification channel
async function setupViraChannel() {
  await loadNotifications()
  if (!Notifications || Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync('vira-coach', {
      name: 'Vira AI Coach',
      importance: Notifications.AndroidImportance?.HIGH || 4,
      sound: 'default',
      vibrationPattern: [0, 250, 100, 250],
      lightColor: '#00e5a0',
    })
  } catch (e) {
    if (__DEV__) console.warn('[SmartNotifs] Vira channel setup:', e?.message)
  }
}
setupViraChannel()

export async function recordWorkout() {
  const patterns = await loadPatterns()
  const now = new Date()
  patterns.workouts = trimToWindow([...patterns.workouts, {
    hour: now.getHours(),
    minute: now.getMinutes(),
    day_of_week: now.getDay(),
    date: now.toISOString().split('T')[0],
  }])
  await savePatterns(patterns)

  // Vira: schedule post-workout recovery tip (90 min after workout)
  await loadNotifications()
  if (Notifications) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vira Recovery Tip',
          body: 'Great workout! Stretch, hydrate, and aim for 7+ hours of sleep tonight for optimal recovery.',
          data: { action: 'open_vira_chat' },
          ...(Platform.OS === 'android' ? { channelId: 'vira-coach' } : {}),
        },
        trigger: { seconds: 5400 }, // 90 minutes
      })
    } catch {}
  }
}

export async function recordFastingStart() {
  const patterns = await loadPatterns()
  const now = new Date()
  patterns.fasting_starts = trimToWindow([...patterns.fasting_starts, {
    hour: now.getHours(),
    minute: now.getMinutes(),
    date: now.toISOString().split('T')[0],
  }])
  await savePatterns(patterns)
}

// ── Pattern analysis ─────────────────────────────────────────────────

/**
 * Find the most common hour for a set of time entries.
 * Returns { hour, minute, confidence } where confidence = count / total.
 * Groups by hour, picks the mode, averages the minutes within that hour.
 */
function findPeakTime(entries) {
  if (entries.length < 3) return null // Not enough data

  const hourCounts = {}
  const hourMinutes = {}

  for (const e of entries) {
    hourCounts[e.hour] = (hourCounts[e.hour] || 0) + 1
    if (!hourMinutes[e.hour]) hourMinutes[e.hour] = []
    hourMinutes[e.hour].push(e.minute)
  }

  let peakHour = 0
  let maxCount = 0
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > maxCount) {
      maxCount = count
      peakHour = parseInt(hour, 10)
    }
  }

  const avgMinute = Math.round(
    hourMinutes[peakHour].reduce((s, m) => s + m, 0) / hourMinutes[peakHour].length
  )

  return {
    hour: peakHour,
    minute: avgMinute,
    confidence: maxCount / entries.length,
  }
}

/**
 * Find peak workout days of the week.
 * Returns array of day numbers (0=Sun, 1=Mon, etc.) sorted by frequency.
 */
function findWorkoutDays(workouts) {
  if (workouts.length < 3) return null
  const dayCounts = {}
  for (const w of workouts) {
    dayCounts[w.day_of_week] = (dayCounts[w.day_of_week] || 0) + 1
  }
  return Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([day]) => parseInt(day, 10))
}

/**
 * Analyze water drinking gaps — find the longest period without water today.
 * Returns the hour when they typically have a gap (need a nudge).
 */
function findWaterGapHour(waterLogs) {
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = waterLogs.filter(w => w.date === today).map(w => w.hour).sort((a, b) => a - b)

  if (todayLogs.length < 2) return null

  let maxGap = 0
  let gapAfterHour = null
  for (let i = 1; i < todayLogs.length; i++) {
    const gap = todayLogs[i] - todayLogs[i - 1]
    if (gap > maxGap) {
      maxGap = gap
      gapAfterHour = todayLogs[i - 1]
    }
  }

  if (maxGap >= 3) {
    return gapAfterHour + Math.floor(maxGap / 2)
  }
  return null
}

/**
 * Calculate daily water intake average over the last 7 days.
 */
function avgDailyWater(waterLogs) {
  const dailyTotals = {}
  for (const w of waterLogs) {
    dailyTotals[w.date] = (dailyTotals[w.date] || 0) + (w.ml || 250)
  }
  const values = Object.values(dailyTotals)
  if (values.length === 0) return 0
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length)
}

/**
 * Get a full behavior analysis from stored patterns.
 */
export async function analyzePatterns() {
  const patterns = await loadPatterns()

  return {
    peakAppOpen: findPeakTime(patterns.app_opens),
    peakWorkoutTime: findPeakTime(patterns.workouts),
    workoutDays: findWorkoutDays(patterns.workouts),
    peakMealTimes: {
      breakfast: findPeakTime(patterns.meals.filter(m => m.meal_type === 'breakfast')),
      lunch: findPeakTime(patterns.meals.filter(m => m.meal_type === 'lunch')),
      dinner: findPeakTime(patterns.meals.filter(m => m.meal_type === 'dinner')),
    },
    peakFastingStart: findPeakTime(patterns.fasting_starts),
    waterGapHour: findWaterGapHour(patterns.water_logs),
    avgDailyWaterMl: avgDailyWater(patterns.water_logs),
    totalDataPoints: patterns.app_opens.length + patterns.water_logs.length +
      patterns.meals.length + patterns.workouts.length,
  }
}

// ── Android notification channels ────────────────────────────────────

async function setupSmartChannels() {
  await loadNotifications()
  if (!Notifications || Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync('smart-workout', {
    name: 'Workout Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
  })

  await Notifications.setNotificationChannelAsync('smart-water', {
    name: 'Smart Water Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  })

  await Notifications.setNotificationChannelAsync('smart-meal', {
    name: 'Meal Logging Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  })

  await Notifications.setNotificationChannelAsync('smart-motivation', {
    name: 'Motivation & Streaks',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 300, 200, 300],
  })
}

// ── Notification content ─────────────────────────────────────────────

const WORKOUT_MESSAGES = [
  { title: 'Gym Time', body: 'You usually train around now. Ready to crush it?' },
  { title: 'Your Body is Waiting', body: 'Your regular workout window is open. Let\'s go!' },
  { title: 'Consistency Wins', body: 'Time to move — your body knows this schedule.' },
  { title: 'Training Hour', body: 'This is your peak gym time. Don\'t skip today.' },
]

const WATER_NUDGE_MESSAGES = [
  { title: 'Hydration Gap', body: 'It\'s been a while since your last sip. Your body needs water.' },
  { title: 'Water Break', body: 'You\'re behind your usual hydration pace today. Quick sip?' },
  { title: 'Drink Up', body: 'Your water intake is lower than usual. Refill that bottle.' },
]

const WATER_GOAL_MESSAGES = [
  { title: 'Low Water Day', body: 'You\'re averaging {avg}ml/day but today you\'re behind. Time to catch up.' },
  { title: 'Hydration Check', body: 'Your daily average is {avg}ml. Don\'t let today pull it down.' },
]

const MEAL_LOG_MESSAGES = {
  breakfast: [
    { title: 'Log Breakfast', body: 'You usually eat around now. Quick-log your morning meal for accurate tracking.' },
    { title: 'Morning Fuel', body: 'Time to log what you ate. Tracking builds awareness.' },
  ],
  lunch: [
    { title: 'Log Lunch', body: 'Lunch time! Tap to log your meal and keep your nutrition on track.' },
    { title: 'Midday Check', body: 'Don\'t forget to log lunch — your nutrition streak depends on it.' },
  ],
  dinner: [
    { title: 'Log Dinner', body: 'Evening meal time. Capture it for your daily nutrition summary.' },
    { title: 'Last Meal', body: 'Log dinner before the day ends. Your future self will thank you.' },
  ],
}

const STREAK_MESSAGES = [
  { min: 3, title: '{n}-Day Streak!', body: 'You\'re building momentum. Don\'t break the chain today.' },
  { min: 7, title: 'One Week Strong!', body: '{n} days straight. You\'re in the habit-forming zone now.' },
  { min: 14, title: 'Two Weeks In!', body: '{n}-day streak. This is no longer luck — it\'s discipline.' },
  { min: 30, title: 'Monthly Champion!', body: '{n} days of consistency. You\'re in the top 5% of IVIRA users.' },
  { min: 50, title: 'Unstoppable!', body: '{n}-day streak. You\'ve proven this is who you are now.' },
]

const REST_DAY_MESSAGES = [
  { title: 'Active Recovery', body: 'No gym today? Take a 20-min walk or stretch. Recovery is training too.' },
  { title: 'Rest Day Tip', body: 'Your body rebuilds on rest days. Hydrate extra and eat your protein.' },
]

function pickMessage(arr, seed) {
  return arr[Math.abs(seed) % arr.length]
}

// ── Smart scheduling ─────────────────────────────────────────────────

function isQuietHours(hour, prefs) {
  const { quiet_hours_start, quiet_hours_end } = prefs
  if (quiet_hours_start > quiet_hours_end) {
    // Wraps midnight: e.g. 22-7
    return hour >= quiet_hours_start || hour < quiet_hours_end
  }
  return hour >= quiet_hours_start && hour < quiet_hours_end
}

/**
 * Schedule all smart notifications based on learned patterns.
 * Called once daily (or on app open). Cancels previous smart notifs and reschedules.
 */
export async function scheduleSmartNotifications(member) {
  await loadNotifications()
  if (!Notifications) return
  if (Constants.appOwnership === 'expo') return
  if (Platform.OS === 'web') return

  const prefs = await loadPrefs()
  if (!prefs.enabled) return

  await setupSmartChannels()

  // Cancel all existing smart notifications
  await cancelSmartNotifications()

  const analysis = await analyzePatterns()
  const today = new Date()
  const dayOfWeek = today.getDay()
  const currentHour = today.getHours()
  const seed = today.getDate() + today.getMonth() * 31

  // ── Workout reminder ────────────────────────────────────────────
  if (prefs.workout_reminders && analysis.peakWorkoutTime) {
    const { hour, minute } = analysis.peakWorkoutTime
    const isWorkoutDay = analysis.workoutDays?.includes(dayOfWeek) ?? true

    if (isWorkoutDay && !isQuietHours(hour, prefs) && hour > currentHour) {
      // Schedule 30 min before usual workout time
      let reminderHour = hour
      let reminderMinute = minute - 30
      if (reminderMinute < 0) {
        reminderMinute += 60
        reminderHour -= 1
      }
      if (reminderHour >= 0 && reminderHour > currentHour) {
        const secondsUntil = getSecondsUntilTime(reminderHour, reminderMinute)
        if (secondsUntil > 0) {
          const msg = pickMessage(WORKOUT_MESSAGES, seed)
          await Notifications.scheduleNotificationAsync({
            identifier: 'smart-workout-daily',
            content: {
              title: msg.title,
              body: msg.body,
              ...(Platform.OS === 'android' && { channelId: 'smart-workout' }),
            },
            trigger: { type: 'timeInterval', seconds: secondsUntil, repeats: false },
          })
        }
      }
    } else if (!isWorkoutDay && prefs.workout_reminders) {
      // Rest day message at their usual app-open time
      const openTime = analysis.peakAppOpen
      if (openTime && openTime.hour > currentHour && !isQuietHours(openTime.hour, prefs)) {
        const secondsUntil = getSecondsUntilTime(openTime.hour, openTime.minute + 15)
        if (secondsUntil > 0) {
          const msg = pickMessage(REST_DAY_MESSAGES, seed)
          await Notifications.scheduleNotificationAsync({
            identifier: 'smart-restday',
            content: {
              title: msg.title,
              body: msg.body,
              ...(Platform.OS === 'android' && { channelId: 'smart-motivation' }),
            },
            trigger: { type: 'timeInterval', seconds: secondsUntil, repeats: false },
          })
        }
      }
    }
  }

  // ── Smart water reminders ───────────────────────────────────────
  if (prefs.water_reminders) {
    // Schedule water reminders every 2h during waking hours
    const startHour = prefs.quiet_hours_end || 7
    const endHour = prefs.quiet_hours_start || 22
    let waterIndex = 0

    for (let h = startHour + 1; h < endHour; h += 2) {
      if (h <= currentHour) continue

      const secondsUntil = getSecondsUntilTime(h, 0)
      if (secondsUntil > 0 && waterIndex < 6) {
        const msg = pickMessage(WATER_NUDGE_MESSAGES, seed + waterIndex)
        await Notifications.scheduleNotificationAsync({
          identifier: `smart-water-${waterIndex}`,
          content: {
            title: msg.title,
            body: msg.body,
            ...(Platform.OS === 'android' && { channelId: 'smart-water' }),
            categoryIdentifier: 'hydration',
          },
          trigger: { type: 'timeInterval', seconds: secondsUntil, repeats: false },
        })
        waterIndex++
      }
    }
  }

  // ── Meal logging reminders ──────────────────────────────────────
  if (prefs.meal_reminders) {
    const mealSlots = [
      { type: 'breakfast', fallbackHour: 9, fallbackMinute: 0 },
      { type: 'lunch', fallbackHour: 13, fallbackMinute: 0 },
      { type: 'dinner', fallbackHour: 20, fallbackMinute: 30 },
    ]

    for (const slot of mealSlots) {
      const learned = analysis.peakMealTimes[slot.type]
      const hour = learned ? learned.hour : slot.fallbackHour
      const minute = learned ? learned.minute : slot.fallbackMinute

      // Remind 30 min after usual meal time (to log it)
      let logHour = hour
      let logMinute = minute + 30
      if (logMinute >= 60) {
        logMinute -= 60
        logHour += 1
      }

      if (logHour > currentHour && !isQuietHours(logHour, prefs)) {
        const secondsUntil = getSecondsUntilTime(logHour, logMinute)
        if (secondsUntil > 0) {
          const messages = MEAL_LOG_MESSAGES[slot.type] || MEAL_LOG_MESSAGES.lunch
          const msg = pickMessage(messages, seed)
          await Notifications.scheduleNotificationAsync({
            identifier: `smart-meal-${slot.type}`,
            content: {
              title: msg.title,
              body: msg.body,
              ...(Platform.OS === 'android' && { channelId: 'smart-meal' }),
            },
            trigger: { type: 'timeInterval', seconds: secondsUntil, repeats: false },
          })
        }
      }
    }
  }

  // ── Streak motivation ───────────────────────────────────────────
  if (prefs.streak_motivation && member?.streak) {
    const streak = member.streak
    // Find the highest applicable streak message
    const applicable = STREAK_MESSAGES.filter(s => streak >= s.min)
    if (applicable.length > 0) {
      const template = applicable[applicable.length - 1] // Highest tier
      const openTime = analysis.peakAppOpen
      const motivationHour = openTime ? openTime.hour : 8
      const motivationMinute = openTime ? openTime.minute : 0

      if (motivationHour > currentHour && !isQuietHours(motivationHour, prefs)) {
        const secondsUntil = getSecondsUntilTime(motivationHour, motivationMinute)
        if (secondsUntil > 60) {
          await Notifications.scheduleNotificationAsync({
            identifier: 'smart-streak',
            content: {
              title: template.title.replace('{n}', String(streak)),
              body: template.body.replace('{n}', String(streak)),
              ...(Platform.OS === 'android' && { channelId: 'smart-motivation' }),
            },
            trigger: { type: 'timeInterval', seconds: secondsUntil, repeats: false },
          })
        }
      }
    }
  }
}

/**
 * Cancel all smart notifications.
 */
export async function cancelSmartNotifications() {
  await loadNotifications()
  if (!Notifications) return

  const prefixes = ['smart-workout', 'smart-restday', 'smart-water-', 'smart-meal-', 'smart-streak']
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of scheduled) {
      if (prefixes.some(p => n.identifier?.startsWith(p))) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch (err) { console.warn('[SmartNotifs]', err?.message) }
}

// ── Helpers ──────────────────────────────────────────────────────────

function getSecondsUntilTime(targetHour, targetMinute) {
  const now = new Date()
  const target = new Date()
  target.setHours(targetHour, Math.max(0, targetMinute), 0, 0)
  const diff = Math.floor((target - now) / 1000)
  return diff > 0 ? diff : 0
}

/**
 * Get a human-readable summary of learned patterns (for settings/debug screen).
 */
export async function getPatternSummary() {
  const analysis = await analyzePatterns()
  const summary = []

  if (analysis.peakAppOpen) {
    const t = analysis.peakAppOpen
    summary.push({
      label: 'Usual app time',
      value: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
      confidence: t.confidence,
    })
  }

  if (analysis.peakWorkoutTime) {
    const t = analysis.peakWorkoutTime
    summary.push({
      label: 'Workout time',
      value: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
      confidence: t.confidence,
    })
  }

  if (analysis.workoutDays) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    summary.push({
      label: 'Gym days',
      value: analysis.workoutDays.slice(0, 4).map(d => dayNames[d]).join(', '),
    })
  }

  if (analysis.avgDailyWaterMl > 0) {
    summary.push({
      label: 'Avg daily water',
      value: `${(analysis.avgDailyWaterMl / 1000).toFixed(1)}L`,
    })
  }

  for (const [meal, time] of Object.entries(analysis.peakMealTimes)) {
    if (time) {
      summary.push({
        label: `${meal.charAt(0).toUpperCase() + meal.slice(1)} time`,
        value: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        confidence: time.confidence,
      })
    }
  }

  summary.push({
    label: 'Data points',
    value: String(analysis.totalDataPoints),
  })

  return summary
}
