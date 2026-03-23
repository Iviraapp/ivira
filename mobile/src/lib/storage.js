import { Platform } from 'react-native'

// Web-safe storage wrapper
// On native, uses expo-secure-store (Keychain/Keystore)
// On web, falls back to localStorage

export async function getItem(key) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key)
  }
  const SecureStore = require('expo-secure-store')
  return SecureStore.getItemAsync(key)
}

export async function setItem(key, value) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value)
    return
  }
  const SecureStore = require('expo-secure-store')
  return SecureStore.setItemAsync(key, value)
}

export async function deleteItem(key) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key)
    return
  }
  const SecureStore = require('expo-secure-store')
  return SecureStore.deleteItemAsync(key)
}
