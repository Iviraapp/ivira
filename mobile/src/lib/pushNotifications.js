import { Platform } from 'react-native'
import { getItem, setItem } from './storage'
import api from './api'

let Notifications = null
let Device = null
try {
  Notifications = require('expo-notifications')
  Device = require('expo-device')
} catch {}

const PROJECT_ID = 'e554db55-7b14-4d81-b288-723ac43503c6'

export async function registerForPushNotifications() {
  if (!Notifications || !Device || !Device.isDevice) {
    console.warn('[push] Not a physical device, skipping push registration')
    return null
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('[push] Push permission denied')
      return null
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    })
    const pushToken = tokenData.data

    // Check if we already registered this token
    const storedToken = await getItem('ivira_push_token')
    if (storedToken === pushToken) return pushToken

    // Register with backend — uses gym-scoped endpoint
    const gymId = await getItem('ivira_gym_id')
    if (gymId) {
      await api.post(`/gyms/${gymId}/push/register`, {
        deviceToken: pushToken,
        platform: Platform.OS,
        deviceInfo: {
          device_name: Device.modelName || 'Unknown',
          os_version: Device.osVersion || '',
        },
      })
    }

    await setItem('ivira_push_token', pushToken)
    return pushToken
  } catch (err) {
    console.warn('[push] Registration failed:', err?.message)
    return null
  }
}

export function setupNotificationHandlers() {
  if (!Notifications) return

  // Handle notification when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}
