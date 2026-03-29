import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Platform } from 'react-native'
import { getItem, setItem, deleteItem } from '../lib/storage'
import api from '../lib/api'
import { registerForPushNotifications, setupNotificationHandlers } from '../lib/pushNotifications'
import { startGymGeofencing, stopGymGeofencing } from '../lib/gymGeofence'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [member, setMember] = useState(null)
  const [gymId, setGymId] = useState(null)
  const [gymInfo, setGymInfo] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabledState] = useState(false)

  useEffect(() => {
    restoreSession()
    checkBiometrics()
    setupNotificationHandlers()
  }, [])

  const checkBiometrics = async () => {
    if (Platform.OS === 'web') return
    try {
      const LocalAuth = await import('expo-local-authentication')
      const compatible = await LocalAuth.hasHardwareAsync()
      const enrolled = await LocalAuth.isEnrolledAsync()
      setBiometricAvailable(compatible && enrolled)
    } catch (err) {
      console.warn('[Auth] checkBiometrics:', err?.message)
      setBiometricAvailable(false)
    }
  }

  const setBiometricEnabled = useCallback(async (val) => {
    setBiometricEnabledState(val)
    await setItem('ivira_biometric_enabled', val ? 'true' : 'false')
  }, [])

  const restoreSession = async () => {
    try {
      const storedToken = await getItem('ivira_member_token')
      const storedGymId = await getItem('ivira_gym_id')
      const storedMember = await getItem('ivira_member_data')
      const storedBiometric = await getItem('ivira_biometric_enabled')

      // Clean up any leftover demo mode from previous versions
      await deleteItem('ivira_demo_mode')

      if (storedToken && storedGymId) {
        setToken(storedToken)
        setGymId(storedGymId)
        if (storedMember) setMember(JSON.parse(storedMember))

        try {
          const res = await api.get(`/gyms/${storedGymId}/members/me`)
          const memberData = res.data?.member || res.data
          setMember(memberData)
          await setItem('ivira_member_data', JSON.stringify(memberData))
        } catch (e) {
          console.warn('[auth] Failed to refresh member profile:', e?.message)
        }

        try {
          const gymRes = await api.get(`/gyms/${storedGymId}`)
          setGymInfo(gymRes.data?.gym || gymRes.data)
        } catch (e) {
          console.warn('[auth] Failed to fetch gym info:', e?.message)
        }
      } else if (storedToken) {
        // B2C user without a gym
        setToken(storedToken)
        setGymId(null)
        if (storedMember) setMember(JSON.parse(storedMember))
      }
      // Restore biometric preference — only enable if hardware is available
      if (storedBiometric === 'true') {
        try {
          if (Platform.OS !== 'web') {
            const LocalAuth = await import('expo-local-authentication')
            const compatible = await LocalAuth.hasHardwareAsync()
            const enrolled = await LocalAuth.isEnrolledAsync()
            if (compatible && enrolled) setBiometricEnabledState(true)
          }
        } catch (e) {
          console.warn('[auth] Failed to restore biometric preference:', e?.message)
        }
      }
    } catch (e) {
      console.warn('[auth] Session restore failed:', e?.message)
    } finally {
      setLoading(false)
    }
  }

  const authenticateWithBiometrics = async () => {
    if (!biometricEnabled || !biometricAvailable || Platform.OS === 'web') return false
    try {
      const LocalAuth = await import('expo-local-authentication')
      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Sign in to IVIRA',
        cancelLabel: 'Use PIN instead',
        disableDeviceFallback: false,
      })
      return result.success
    } catch (err) {
      console.warn('[Auth] biometric auth:', err?.message)
      return false
    }
  }

  const login = useCallback(async (gymIdVal, phone, otpCode) => {
    const res = await api.post(`/gyms/${gymIdVal}/members/otp/verify`, {
      phone,
      otp: otpCode,
    })

    const { token: newToken, member: memberData } = res.data

    await setItem('ivira_member_token', newToken)
    await setItem('ivira_gym_id', gymIdVal)
    await setItem('ivira_member_data', JSON.stringify(memberData))

    setToken(newToken)
    setGymId(gymIdVal)
    setMember(memberData)

    try {
      const gymRes = await api.get(`/gyms/${gymIdVal}`)
      setGymInfo(gymRes.data?.gym || gymRes.data)
    } catch (e) {
      console.warn('[auth] Failed to fetch gym info after login:', e?.message)
    }
  }, [])

  const loginWithEmail = useCallback(async (gymIdVal, email, password) => {
    const res = await api.post(`/gyms/${gymIdVal}/members/otp/verify`, {
      email,
      password,
    })

    const { token: newToken, member: memberData } = res.data

    await setItem('ivira_member_token', newToken)
    await setItem('ivira_gym_id', gymIdVal)
    await setItem('ivira_member_data', JSON.stringify(memberData))

    setToken(newToken)
    setGymId(gymIdVal)
    setMember(memberData)

    try {
      const gymRes = await api.get(`/gyms/${gymIdVal}`)
      setGymInfo(gymRes.data?.gym || gymRes.data)
    } catch (e) {
      console.warn('[auth] Failed to fetch gym info after email login:', e?.message)
    }
  }, [])

  // Start geofencing whenever gym info becomes available
  useEffect(() => {
    if (gymInfo?.latitude && gymInfo?.longitude) {
      startGymGeofencing(gymInfo).catch(err => console.warn('[Auth]', err?.message))
    }
  }, [gymInfo?.id])

  const logout = useCallback(async () => {
    // Blacklist token server-side so it can't be reused even if intercepted
    try {
      await api.post('/auth/logout')
    } catch (_) {
      // Fails silently — offline or already expired, local clear still proceeds
    }
    await stopGymGeofencing()
    await deleteItem('ivira_member_token')
    await deleteItem('ivira_gym_id')
    await deleteItem('ivira_member_data')
    await deleteItem('ivira_biometric_enabled')
    setToken(null)
    setGymId(null)
    setMember(null)
    setGymInfo(null)
  }, [])

  // B2C: request OTP for email-based login
  const requestOtp = useCallback(async (email) => {
    await setItem('ivira_pending_email', email)
    const res = await api.post('/auth/b2c/otp/request', { email })
    return { success: true, message: res.data?.message }
  }, [])

  // B2C: verify OTP for email-based login
  const verifyOtp = useCallback(async (email, otp) => {
    const res = await api.post('/auth/b2c/otp/verify', { email, otp })
    const { token: newToken, member: memberData, gymId: resolvedGymId } = res.data

    await setItem('ivira_member_token', newToken)
    await setItem('ivira_gym_id', resolvedGymId || '')
    await setItem('ivira_member_data', JSON.stringify(memberData))
    await deleteItem('ivira_pending_email')

    setToken(newToken)
    setGymId(resolvedGymId || null)
    setMember(memberData)
    setGymInfo(null)

    // Fetch gym info if linked
    if (resolvedGymId) {
      try {
        const gymRes = await api.get(`/gyms/${resolvedGymId}`)
        setGymInfo(gymRes.data?.gym || gymRes.data)
      } catch (e) {
        console.warn('[auth] Failed to fetch gym info after OTP verify:', e?.message)
      }
    }

    // Register for push notifications after successful login
    registerForPushNotifications().catch(e =>
      console.warn('[auth] Push registration failed:', e?.message)
    )
  }, [])

  // B2C: connect to a gym via invite code
  const connectGym = useCallback(async (gymCode) => {
    const res = await api.post('/auth/connect-gym', { code: gymCode })
    const { token: newToken, gymId: resolvedGymId, gymName } = res.data

    // Store new token with gymId claim
    await setItem('ivira_member_token', newToken)
    await setItem('ivira_gym_id', resolvedGymId)

    setToken(newToken)
    setGymId(resolvedGymId)

    // Fetch full gym info
    try {
      const gymRes = await api.get(`/gyms/${resolvedGymId}`)
      setGymInfo(gymRes.data?.gym || gymRes.data)
    } catch (err) {
      console.warn('[Auth] connectGym fetch gym:', err?.message)
      setGymInfo({ id: resolvedGymId, gym_name: gymName })
    }
  }, [])

  const hasGym = gymId !== null && gymId !== ''
  const isDemo = false // Demo mode removed — always real data

  const refreshProfile = useCallback(async () => {
    try {
      let memberData
      if (gymId) {
        const res = await api.get(`/gyms/${gymId}/members/me`)
        memberData = res.data?.member || res.data
      } else {
        // B2C user without a gym — use B2C profile endpoint
        const res = await api.get('/auth/b2c/profile')
        memberData = res.data?.member || res.data
      }
      setMember(memberData)
      await setItem('ivira_member_data', JSON.stringify(memberData))
    } catch (e) {
      console.warn('[auth] Failed to refresh profile:', e?.message)
    }
  }, [gymId])

  return (
    <AuthContext.Provider value={{
      member,
      gymId,
      gymInfo,
      token,
      loading,
      biometricAvailable,
      biometricEnabled,
      setBiometricEnabled,
      isDemo,
      hasGym,
      login,
      loginWithEmail,
      logout,
      refreshProfile,
      authenticateWithBiometrics,
      requestOtp,
      verifyOtp,
      connectGym,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
