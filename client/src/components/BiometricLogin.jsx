import { useState, useEffect } from 'react'
import { isNative, platform, hapticNotification } from '../lib/native'

export default function BiometricLogin({ onSuccess, onFallback }) {
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isNative) setAvailable(true)
  }, [])

  if (!available) return null

  const label = platform === 'ios' ? 'Sign in with Face ID' : 'Sign in with Fingerprint'
  const icon = platform === 'ios' ? '\u{1F464}' : '\u{1F446}'

  const handleBiometric = async () => {
    setLoading(true)
    try {
      // Attempt biometric auth
      // In production, this would use @capacitor-community/biometric-auth
      // For now, simulate success if token exists in storage
      const { Preferences } = await import('@capacitor/preferences')
      const { value: token } = await Preferences.get({ key: 'ivira_token' })

      if (token) {
        await hapticNotification('Success')
        onSuccess(token)
      } else {
        onFallback()
      }
    } catch {
      onFallback()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleBiometric}
      disabled={loading}
      style={{
        width: '100%',
        padding: '14px 24px',
        marginTop: 16,
        background: 'transparent',
        border: '1px solid #1F1F1F',
        borderRadius: 10,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {loading ? 'Authenticating...' : label}
    </button>
  )
}
