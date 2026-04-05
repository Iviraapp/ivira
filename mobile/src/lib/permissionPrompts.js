import { Platform } from 'react-native'

let Camera, Location, Notifications
try { Camera = require('expo-camera') } catch {}
try { Location = require('expo-location') } catch {}
try { Notifications = require('expo-notifications') } catch {}

export async function requestLocationPermission() {
  if (!Location) return true
  try {
    const { status: existing } = await Location.getForegroundPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === 'granted'
  } catch { return false }
}

export async function requestNotificationPermission() {
  if (!Notifications || Platform.OS === 'web') return true
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch { return false }
}

export async function requestCameraPermission() {
  if (!Camera) return true
  try {
    const { status: existing } = await Camera.getCameraPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Camera.requestCameraPermissionsAsync()
    return status === 'granted'
  } catch { return false }
}

export async function requestMicrophonePermission() {
  // Microphone is requested by expo-av when recording starts
  return true
}
