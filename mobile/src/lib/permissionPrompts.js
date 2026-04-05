import { Platform } from 'react-native'
import { premiumAlert } from '../components/PremiumAlert'

let Camera, Location, Notifications
try { Camera = require('expo-camera') } catch {}
try { Location = require('expo-location') } catch {}
try { Notifications = require('expo-notifications') } catch {}

// Request camera permission with context explanation
export async function requestCameraPermission() {
  if (!Camera) return true
  const { status: existing } = await Camera.getCameraPermissionsAsync()
  if (existing === 'granted') return true

  return new Promise(resolve => {
    premiumAlert(
      'Camera Access',
      'IVIRA needs your camera to scan barcodes, take food photos, and record workout form.',
      [
        { text: 'Not now', onPress: () => resolve(false) },
        { text: 'Allow Camera', onPress: async () => {
          const { status } = await Camera.requestCameraPermissionsAsync()
          resolve(status === 'granted')
        }},
      ]
    )
  })
}

// Request location permission with context
export async function requestLocationPermission() {
  if (!Location) return true
  const { status: existing } = await Location.getForegroundPermissionsAsync()
  if (existing === 'granted') return true

  return new Promise(resolve => {
    premiumAlert(
      'Location Access',
      'IVIRA uses your location to verify gym check-ins. Your location is only accessed when you check in — never in the background.',
      [
        { text: 'Not now', onPress: () => resolve(false) },
        { text: 'Allow Location', onPress: async () => {
          const { status } = await Location.requestForegroundPermissionsAsync()
          resolve(status === 'granted')
        }},
      ]
    )
  })
}

// Request notification permission — call after first successful action
export async function requestNotificationPermission() {
  if (!Notifications || Platform.OS === 'web') return true
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  return new Promise(resolve => {
    premiumAlert(
      'Stay on Track',
      'Get workout reminders, streak alerts, and notifications when you\'re near your gym.',
      [
        { text: 'Maybe later', onPress: () => resolve(false) },
        { text: 'Enable', onPress: async () => {
          const { status } = await Notifications.requestPermissionsAsync()
          resolve(status === 'granted')
        }},
      ]
    )
  })
}

// Request microphone — call when starting sleep tracking
export async function requestMicrophonePermission() {
  // Microphone is requested by the sleep engine when it starts recording
  // Just show an explanation
  return new Promise(resolve => {
    premiumAlert(
      'Microphone for Sleep',
      'IVIRA uses the microphone during sleep tracking to detect snoring and disturbances. Audio is processed on-device only — never uploaded.',
      [
        { text: 'Cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ]
    )
  })
}
