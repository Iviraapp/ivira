// Offline Queue — Persists failed API calls and retries on reconnect
// Prevents data loss for workouts, nutrition logs, sleep data, check-ins
import { Platform } from 'react-native'
import { getItem, setItem } from './storage'
import api from './api'

const QUEUE_KEY = 'ivira_offline_queue'
const MAX_RETRIES = 5
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000] // exponential backoff

let _processing = false
let _listeners = []

// Get the current queue
async function getQueue() {
  try {
    const raw = await getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Save the queue
async function saveQueue(queue) {
  await setItem(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Add an API call to the offline queue.
 * Will be retried automatically when network is available.
 */
export async function enqueue(method, url, data, options = {}) {
  const queue = await getQueue()
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method,
    url,
    data,
    options,
    retries: 0,
    createdAt: new Date().toISOString(),
    lastAttempt: null,
  })
  await saveQueue(queue)
  notifyListeners()

  // Try to process immediately
  processQueue()
}

/**
 * Process all queued items with retry logic.
 */
export async function processQueue() {
  if (_processing) return
  _processing = true

  try {
    const queue = await getQueue()
    if (queue.length === 0) {
      _processing = false
      return
    }

    const remaining = []
    for (const item of queue) {
      try {
        if (item.method === 'post') {
          await api.post(item.url, item.data)
        } else if (item.method === 'put') {
          await api.put(item.url, item.data)
        } else if (item.method === 'patch') {
          await api.patch(item.url, item.data)
        } else if (item.method === 'delete') {
          await api.delete(item.url)
        }
        // Success — don't re-add to queue
        console.log(`[OfflineQueue] Synced: ${item.method.toUpperCase()} ${item.url}`)
      } catch (err) {
        const status = err?.response?.status
        // Don't retry 4xx errors (bad request, unauthorized, etc.) except 408 and 429
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          console.warn(`[OfflineQueue] Dropping ${item.url}: ${status} error`)
          continue
        }

        item.retries += 1
        item.lastAttempt = new Date().toISOString()

        if (item.retries < MAX_RETRIES) {
          remaining.push(item)
        } else {
          console.warn(`[OfflineQueue] Max retries exceeded for ${item.url}, dropping`)
        }
      }
    }

    await saveQueue(remaining)
    notifyListeners()

    // If items remain, schedule retry
    if (remaining.length > 0) {
      const nextDelay = RETRY_DELAYS[Math.min(remaining[0].retries - 1, RETRY_DELAYS.length - 1)]
      setTimeout(() => processQueue(), nextDelay)
    }
  } finally {
    _processing = false
  }
}

/**
 * Get the number of pending items.
 */
export async function getPendingCount() {
  const queue = await getQueue()
  return queue.length
}

/**
 * Clear the entire queue.
 */
export async function clearQueue() {
  await saveQueue([])
  notifyListeners()
}

/**
 * Subscribe to queue changes.
 */
export function onQueueChange(listener) {
  _listeners.push(listener)
  return () => {
    _listeners = _listeners.filter(l => l !== listener)
  }
}

function notifyListeners() {
  getPendingCount().then(count => {
    _listeners.forEach(l => l(count))
  })
}

/**
 * Safe API call with offline queue fallback.
 * If the API call fails due to network error, it's queued for retry.
 */
export async function safeApiCall(method, url, data, options = {}) {
  try {
    let res
    if (method === 'post') res = await api.post(url, data)
    else if (method === 'put') res = await api.put(url, data)
    else if (method === 'patch') res = await api.patch(url, data)
    else if (method === 'delete') res = await api.delete(url)
    return { success: true, data: res?.data }
  } catch (err) {
    const status = err?.response?.status
    const isNetworkError = !status || status >= 500 || status === 408 || status === 429

    if (isNetworkError && options.queueOnFail !== false) {
      await enqueue(method, url, data, options)
      return { success: false, queued: true, error: err.message }
    }

    return { success: false, queued: false, error: err.message, status }
  }
}

// Auto-process queue on app start and network reconnect
if (Platform.OS !== 'web') {
  // Process on import (app start)
  setTimeout(() => processQueue(), 3000)

  // Listen for network changes
  try {
    const NetInfo = require('@react-native-community/netinfo')
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        processQueue()
      }
    })
  } catch {
    // NetInfo not installed — process on interval as fallback
    setInterval(() => processQueue(), 60_000)
  }
}

export default { enqueue, processQueue, getPendingCount, clearQueue, onQueueChange, safeApiCall }
