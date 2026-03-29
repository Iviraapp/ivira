import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../lib/api'
import { identify, events as analyticsEvents } from '../lib/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ivira_token'))
  const [gym, setGym] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ivira_gym')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const isAuthenticated = !!token && !!gym
  // Role: 'admin' (gym owner, default) or 'staff' (limited permissions)
  const userRole = gym?.user_role || gym?.role || 'admin'
  const isAdmin = userRole === 'admin' || userRole === 'owner'

  const login = useCallback((newToken, gymData) => {
    localStorage.setItem('ivira_token', newToken)
    localStorage.setItem('ivira_gym', JSON.stringify(gymData))
    setToken(newToken)
    setGym(gymData)
    // Track login + identify visitor
    analyticsEvents.login({ gym_id: gymData?.id, role: gymData?.user_role || 'owner' })
    if (gymData?.id) identify(gymData.id, gymData?.user_role || 'owner')
  }, [])

  const logout = useCallback(async () => {
    // Call backend to blacklist the token (best-effort)
    try {
      await api.post('/auth/logout')
    } catch (_) {}

    // Clear ALL IVIRA tokens and cached data
    const keysToRemove = [
      'ivira_token', 'ivira_gym',
      'ivira_member_token',
      'ivira_trainer_token',
      'ivira_admin_token',
      'ivira_cached_qr',
      'ivira_todays_plan',
      'ivira_todays_plan_date',
      'ivira_biometric_enabled',
    ]
    keysToRemove.forEach(k => localStorage.removeItem(k))
    setToken(null)
    setGym(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!gym?.id) return
    try {
      const { data } = await api.get(`/gyms/${gym.id}`)
      const updated = data.gym || data
      localStorage.setItem('ivira_gym', JSON.stringify(updated))
      setGym(updated)
    } catch {}
  }, [gym?.id])

  // Auto-refresh token (check every 6 hours)
  useEffect(() => {
    if (!token) return
    const interval = setInterval(async () => {
      try {
        const { data } = await api.post('/auth/refresh')
        if (data.token) {
          localStorage.setItem('ivira_token', data.token)
          setToken(data.token)
        }
      } catch {}
    }, 6 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <AuthContext.Provider value={{ token, gym, isAuthenticated, loading, login, logout, refreshProfile, setGym, userRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
