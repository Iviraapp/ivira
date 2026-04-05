import { Platform } from 'react-native'

let Camera = null
let Location = null
let Notifications = null

try {
  const cam = require('expo-camera')
  Camera = cam.Camera || cam.default || cam
} catch {}

try {
  Location = require('expo-location')
} catch {}

try {
  Notifications = require('expo-notifications')
} catch {}

export async function requestCameraPermission() {
  try {
    if (Camera?.requestCameraPermissionsAsync) {
      const { status } = await Camera.requestCameraPermissionsAsync()
      return status === 'granted'
    }
    // Fallback: try the module-level function
    const cam = require('expo-camera')
    if (cam.requestCameraPermissionsAsync) {
      const { status } = await cam.requestCameraPermissionsAsync()
      return status === 'granted'
    }
  } catch {}
  return true // Don't block if we can't check
}

export async function requestLocationPermission() {
  try {
    if (Location?.requestForegroundPermissionsAsync) {
      const { status: existing } = await Location.getForegroundPermissionsAsync()
      if (existing === 'granted') return true
      const { status } = await Location.requestForegroundPermissionsAsync()
      return status === 'granted'
    }
  } catch (err) {
    if (__DEV__) console.warn('[Permissions] Location request failed:', err?.message)
  }
  return true
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return true
  try {
    if (Notifications?.requestPermissionsAsync) {
      const { status: existing } = await Notifications.getPermissionsAsync()
      if (existing === 'granted') return true
      const { status } = await Notifications.requestPermissionsAsync()
      return status === 'granted'
    }
  } catch (err) {
    if (__DEV__) console.warn('[Permissions] Notification request failed:', err?.message)
  }
  return true
}

export async function requestMicrophonePermission() {
  try {
    const { Audio } = require('expo-av')
    if (Audio?.requestPermissionsAsync) {
      const { status } = await Audio.requestPermissionsAsync()
      return status === 'granted'
    }
  } catch {}
  return true
}
