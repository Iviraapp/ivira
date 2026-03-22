import { useState, useEffect, createContext, useContext } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ivira_owner_token'))
  const [gymId, setGymId] = useState(() => localStorage.getItem('ivira_gym_id'))
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && gymId) {
      api.get(`/gyms/${gymId}`)
        .then((res) => setGym(res.data))
        .catch(() => { logout() })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token, gymId])

  const requestOtp = async (email) => {
    const res = await api.post('/auth/otp/email/request', { email })
    return res.data
  }

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/otp/email/verify', { email, otp })
    const { token: t, gymId: gid, gym: g } = res.data
    localStorage.setItem('ivira_owner_token', t)
    localStorage.setItem('ivira_gym_id', gid)
    setToken(t)
    setGymId(gid)
    setGym(g)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('ivira_owner_token')
    localStorage.removeItem('ivira_gym_id')
    setToken(null)
    setGymId(null)
    setGym(null)
  }

  return (
    <AuthContext.Provider value={{ token, gymId, gym, loading, requestOtp, verifyOtp, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
