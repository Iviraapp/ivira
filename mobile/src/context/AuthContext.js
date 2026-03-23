import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Platform } from 'react-native'
import { getItem, setItem, deleteItem } from '../lib/storage'
import api from '../lib/api'

const AuthContext = createContext(null)

// Demo data for testing without a backend
const DEMO_MEMBER = {
  id: 'demo-001',
  name: 'Arjun Mehta',
  phone: '+919876543210',
  email: 'arjun@demo.com',
  plan_name: 'Pro Quarterly',
  status: 'active',
  membership_start: '2025-12-01',
  membership_end: '2026-06-01',
  total_checkins: 142,
  monthly_checkins: 18,
  streak: 7,
  joined_at: '2024-08-15',
  gymId: 'demo-gym',
}

// Default member for B2C users who sign up without a gym
const GLOBAL_MEMBER = {
  id: 'global-001',
  name: '',
  phone: '',
  email: '',
  plan_name: 'Free',
  status: 'active',
  membership_start: new Date().toISOString().split('T')[0],
  membership_end: null,
  total_checkins: 0,
  monthly_checkins: 0,
  streak: 0,
  joined_at: new Date().toISOString().split('T')[0],
}

const DEMO_GYM = {
  id: 'demo-gym',
  gym_name: 'Iron Temple Fitness',
  city: 'Bengaluru',
  area: 'Koramangala',
  accent_color: '#0052FF',
  phone: '+919900112233',
}

export function AuthProvider({ children }) {
  const [member, setMember] = useState(null)
  const [gymId, setGymId] = useState(null)
  const [gymInfo, setGymInfo] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabledState] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    restoreSession()
    checkBiometrics()
  }, [])

  const checkBiometrics = async () => {
    if (Platform.OS === 'web') return
    try {
      const LocalAuth = await import('expo-local-authentication')
      const compatible = await LocalAuth.hasHardwareAsync()
      const enrolled = await LocalAuth.isEnrolledAsync()
      setBiometricAvailable(compatible && enrolled)
    } catch {
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
      const storedDemo = await getItem('ivira_demo_mode')
      const storedBiometric = await getItem('ivira_biometric_enabled')

      if (storedDemo === 'true') {
        setIsDemo(true)
        setToken('demo-token')
        setGymId('demo-gym')
        setMember(DEMO_MEMBER)
        setGymInfo(DEMO_GYM)
      } else if (storedToken && storedGymId) {
        setToken(storedToken)
        setGymId(storedGymId)
        if (storedMember) setMember(JSON.parse(storedMember))

        try {
          const res = await api.get(`/gyms/${storedGymId}/members/me`)
          const memberData = res.data?.member || res.data
          setMember(memberData)
          await setItem('ivira_member_data', JSON.stringify(memberData))
        } catch {}

        try {
          const gymRes = await api.get(`/gyms/${storedGymId}`)
          setGymInfo(gymRes.data?.gym || gymRes.data)
        } catch {}
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
        } catch {}
      }
    } catch {} finally {
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
    } catch {
      return false
    }
  }

  const loginDemo = useCallback(async () => {
    await setItem('ivira_demo_mode', 'true')
    setIsDemo(true)
    setToken('demo-token')
    setGymId('demo-gym')
    setMember(DEMO_MEMBER)
    setGymInfo(DEMO_GYM)
  }, [])

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
    } catch {}
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
    } catch {}
  }, [])

  const logout = useCallback(async () => {
    await deleteItem('ivira_member_token')
    await deleteItem('ivira_gym_id')
    await deleteItem('ivira_member_data')
    await deleteItem('ivira_demo_mode')
    setToken(null)
    setGymId(null)
    setMember(null)
    setGymInfo(null)
    setIsDemo(false)
  }, [])

  // B2C: request OTP for email-based login
  const requestOtp = useCallback(async (email) => {
    await setItem('ivira_pending_email', email)
    try {
      const res = await api.post('/auth/b2c/otp/request', { email })
      return { success: true, message: res.data?.message }
    } catch (err) {
      // If backend is unreachable, fall back to mock for dev/QA
      if (!err.response) {
        console.warn('[Auth] Backend unreachable, using mock OTP flow')
        return { success: true, mock: true }
      }
      throw err
    }
  }, [])

  // B2C: verify OTP for email-based login
  const verifyOtp = useCallback(async (email, otp) => {
    try {
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
      setIsDemo(false)

      // Fetch gym info if linked
      if (resolvedGymId) {
        try {
          const gymRes = await api.get(`/gyms/${resolvedGymId}`)
          setGymInfo(gymRes.data?.gym || gymRes.data)
        } catch {}
      }
    } catch (err) {
      // Fallback: accept mock OTP 123456 when backend is unreachable
      if (!err.response && otp === '123456') {
        console.warn('[Auth] Backend unreachable, using mock OTP verification')
        const newToken = `b2c-token-${Date.now()}`
        const memberData = { ...GLOBAL_MEMBER, email }

        await setItem('ivira_member_token', newToken)
        await setItem('ivira_gym_id', '')
        await setItem('ivira_member_data', JSON.stringify(memberData))
        await deleteItem('ivira_pending_email')

        setToken(newToken)
        setGymId(null)
        setMember(memberData)
        setGymInfo(null)
        setIsDemo(false)
        return
      }
      throw err
    }
  }, [])

  // B2C: connect to a gym via gym code
  const connectGym = useCallback(async (gymCode) => {
    // TODO: POST /api/auth/connect-gym with gymCode
    // For now, mock — set gymId and fetch gym info
    const resolvedGymId = gymCode

    await setItem('ivira_gym_id', resolvedGymId)
    setGymId(resolvedGymId)

    try {
      const gymRes = await api.get(`/gyms/${resolvedGymId}`)
      setGymInfo(gymRes.data?.gym || gymRes.data)
    } catch {}
  }, [])

  const hasGym = gymId !== null

  const refreshProfile = useCallback(async () => {
    if (isDemo) return
    if (!gymId) return
    try {
      const res = await api.get(`/gyms/${gymId}/members/me`)
      const memberData = res.data?.member || res.data
      setMember(memberData)
      await setItem('ivira_member_data', JSON.stringify(memberData))
    } catch {}
  }, [gymId, isDemo])

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
      loginDemo,
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
