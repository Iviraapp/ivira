import { useEffect, useState, useCallback } from 'react'
import { isNative, platform, configureStatusBar, registerPushNotifications, hideSplash, hapticImpact, hapticNotification } from '../lib/native'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export function useNative() {
  const { gym } = useAuth()
  const gymId = gym?.id
  const [pushToken, setPushToken] = useState(null)

  // Initialize native features on mount
  useEffect(() => {
    if (!isNative) return

    configureStatusBar()
    hideSplash()

    // Register push notifications
    registerPushNotifications(
      // onToken
      (token) => {
        setPushToken(token)
        // Send token to backend (fire-and-forget)
        if (gymId) {
          api.post(`/gyms/${gymId}/push/register`, {
            deviceToken: token,
            platform: platform,
          }).catch(() => {})
        }
      },
      // onNotification
      (notification) => {
        // Handle in-app notification display
        console.log('[Native] Notification:', notification)
      }
    )
  }, [gymId])

  const triggerHaptic = useCallback((style) => hapticImpact(style), [])
  const triggerSuccess = useCallback(() => hapticNotification('Success'), [])
  const triggerError = useCallback(() => hapticNotification('Error'), [])

  return {
    isNative,
    platform,
    pushToken,
    triggerHaptic,
    triggerSuccess,
    triggerError,
  }
}
