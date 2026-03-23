import { useEffect, useRef } from 'react'
import { Platform, AppState } from 'react-native'
import Constants from 'expo-constants'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { isHydrationAction } from '../lib/NotificationEngine'
import {
  recordAppOpen,
  scheduleSmartNotifications,
} from '../lib/SmartNotificationEngine'

export default function NotificationManager() {
  const { gymId, member } = useAuth()
  const listenersRef = useRef([])
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    if (Platform.OS === 'web') return
    setupNotifications()

    // Record app open on launch
    recordAppOpen().catch(() => {})

    // Record app open when returning from background
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        recordAppOpen().catch(() => {})
        // Re-schedule smart notifications on each foreground
        scheduleSmartNotifications(member).catch(() => {})
      }
      appStateRef.current = nextState
    })

    return () => {
      listenersRef.current.forEach(sub => sub?.remove?.())
      appStateSub?.remove?.()
    }
  }, [gymId, member?.id])

  // Schedule smart notifications whenever member data changes
  useEffect(() => {
    if (Platform.OS === 'web') return
    if (Constants.appOwnership === 'expo') return
    scheduleSmartNotifications(member).catch(() => {})
  }, [member?.streak, member?.id])

  const setupNotifications = async () => {
    const isExpoGo = Constants.appOwnership === 'expo'
    if (isExpoGo) {
      console.warn('[Notifications] Push notifications disabled in Expo Go. Please use a dev build.')
      return
    }

    try {
      const Notifications = await import('expo-notifications')

      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Always show alerts for remote pushes and hydration
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }
        },
      })

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      if (finalStatus !== 'granted') return

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'ivira' })

      if (gymId && member?.id) {
        try {
          await api.post(`/gyms/${gymId}/push/register`, {
            token: tokenData.data,
            platform: Platform.OS,
          })
        } catch {}
      }

      // Android notification channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'IVIRA',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0052FF',
        })

        await Notifications.setNotificationChannelAsync('announcements', {
          name: 'Gym Announcements',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        })

        await Notifications.setNotificationChannelAsync('milestones', {
          name: 'Milestone Celebrations',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 300, 200, 300],
        })
      }

      // Handle notifications received while app is foregrounded
      const sub1 = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request?.content?.data
        if (data?.type === 'announcement' || data?.type === 'milestone') {
          console.log(`[Notifications] Received ${data.type}:`, data.title)
        }
      })

      // Handle notification tap / action button press
      const sub2 = Notifications.addNotificationResponseReceivedListener(async (response) => {
        // Handle "Drink Water" button tap from hydration reminders
        if (isHydrationAction(response)) {
          if (gymId && member?.id) {
            try {
              await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
                mealType: 'snack',
                rawInput: 'Water',
                items: [{
                  name: 'Water',
                  qty: 1,
                  unit: 'glass (250ml)',
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fats: 0,
                }],
                source: 'hydration_notification',
              })
              console.log('[Notifications] Water intake logged via notification action')
            } catch (err) {
              console.warn('[Notifications] Failed to log water intake:', err.message)
            }
          }
          return
        }

        // Handle taps on remote push notifications
        const data = response.notification?.request?.content?.data
        if (data?.type === 'announcement') {
          console.log('[Notifications] User tapped announcement:', data.title)
        } else if (data?.type === 'milestone') {
          console.log('[Notifications] User tapped milestone:', data.title)
        }
      })

      listenersRef.current = [sub1, sub2]
    } catch (err) {
      console.warn('[Notifications] Setup failed:', err.message)
    }
  }

  return null
}
