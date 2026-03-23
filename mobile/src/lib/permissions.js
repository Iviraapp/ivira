// Centralized permission requests for all device features
import { Platform, Alert, Linking } from 'react-native'

/**
 * Request all necessary permissions on app launch.
 * Silently skips permissions that aren't available on the device.
 */
export async function requestAllPermissions() {
  const results = {}

  // 1. Activity Recognition (Android) — needed for step counter
  if (Platform.OS === 'android') {
    try {
      const { PermissionsAndroid } = require('react-native')
      const activityResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Step Counter',
          message: 'I V I R A needs access to your activity data to count steps and track daily movement.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not Now',
        },
      )
      results.activityRecognition = activityResult === PermissionsAndroid.RESULTS.GRANTED
    } catch (e) {
      results.activityRecognition = false
    }

    // Body Sensors (Android) — for heart rate, etc.
    try {
      const { PermissionsAndroid } = require('react-native')
      const sensorResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BODY_SENSORS,
        {
          title: 'Body Sensors',
          message: 'I V I R A can read fitness sensor data to enhance your workout tracking.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not Now',
        },
      )
      results.bodySensors = sensorResult === PermissionsAndroid.RESULTS.GRANTED
    } catch (e) {
      results.bodySensors = false
    }
  }

  // 2. Camera — needed for QR check-in and barcode scanning
  try {
    let Camera = null
    try { Camera = require('expo-camera').Camera } catch {}
    if (Camera) {
      const { status } = await Camera.requestCameraPermissionsAsync()
      results.camera = status === 'granted'
    }
  } catch (e) {
    results.camera = false
  }

  // 3. Location — needed for GPS-verified check-ins
  try {
    let Location = null
    try { Location = require('expo-location') } catch {}
    if (Location) {
      const { status } = await Location.requestForegroundPermissionsAsync()
      results.location = status === 'granted'
    }
  } catch (e) {
    results.location = false
  }

  // 4. Notifications
  try {
    let Notifications = null
    try { Notifications = require('expo-notifications') } catch {}
    if (Notifications) {
      const { status } = await Notifications.requestPermissionsAsync()
      results.notifications = status === 'granted'
    }
  } catch (e) {
    results.notifications = false
  }

  console.log('[Permissions] Results:', results)
  return results
}

/**
 * Check if a specific permission is granted.
 */
export async function checkPermission(type) {
  try {
    if (type === 'camera') {
      const Camera = require('expo-camera').Camera
      const { status } = await Camera.getCameraPermissionsAsync()
      return status === 'granted'
    }
    if (type === 'location') {
      const Location = require('expo-location')
      const { status } = await Location.getForegroundPermissionsAsync()
      return status === 'granted'
    }
    if (type === 'notifications') {
      const Notifications = require('expo-notifications')
      const { status } = await Notifications.getPermissionsAsync()
      return status === 'granted'
    }
  } catch {
    return false
  }
  return false
}

/**
 * Show alert directing user to settings when permission is denied.
 */
export function showPermissionDeniedAlert(permissionName) {
  Alert.alert(
    `${permissionName} Access Required`,
    `Please enable ${permissionName.toLowerCase()} access in your device settings to use this feature.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  )
}
