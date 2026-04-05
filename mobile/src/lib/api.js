import axios from 'axios'
import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'
import { getItem, setItem, deleteItem } from './storage'

const API_BASE = Constants.expoConfig?.extra?.apiBase || 'https://api.ivira.app/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await getItem('ivira_member_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    console.warn('[api] Failed to attach auth token:', e?.message)
  }
  return config
})

let isRefreshing = false
let refreshQueue = []

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // If network error (no response), queue for offline retry
    if (!err.response && err.message?.includes('Network')) {
      const { enqueue } = await import('./offlineQueue')
      if (err.config && err.config.method !== 'get') {
        enqueue(err.config.method, err.config.url, err.config.data ? JSON.parse(err.config.data) : undefined)
      }
      return Promise.reject(new Error('You\'re offline. This action will be saved and retried when you reconnect.'))
    }
    if (err.response?.status === 401) {
      const originalRequest = err.config
      if (originalRequest._retry) {
        // Already retried — logout
        await deleteItem('ivira_member_token')
        await deleteItem('ivira_member_data')
        return Promise.reject(err)
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then(newToken => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const token = await getItem('ivira_member_token')
        const res = await axios.post(`${API_BASE}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const newToken = res.data.token
        await setItem('ivira_member_token', newToken)

        // Resolve queued requests
        refreshQueue.forEach(q => q.resolve(newToken))
        refreshQueue = []

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshErr) {
        Sentry.captureException(refreshErr, { extra: { context: 'token_refresh_failed' } })
        refreshQueue.forEach(q => q.reject(refreshErr))
        refreshQueue = []
        await deleteItem('ivira_member_token')
        await deleteItem('ivira_member_data')
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
