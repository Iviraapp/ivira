// Apple Wallet / Google Wallet integration for membership passes
// When added, the OS automatically shows the pass on the lock screen near the gym
import { Platform, Alert, Linking } from 'react-native'
import api from './api'

let WalletManager = null
try {
  WalletManager = require('react-native-wallet-manager').default
} catch (e) {
  // Not available — will use Linking.openURL fallback for Google Wallet
}

/**
 * Check if the device supports adding passes to wallet.
 * Google Wallet works via URL even without WalletManager.
 */
export async function canAddToWallet() {
  if (Platform.OS === 'android') return true  // Google Wallet via URL always works
  if (Platform.OS === 'ios' && WalletManager) {
    try { return await WalletManager.canAddPasses() } catch { return false }
  }
  return false
}

/**
 * Generate and add a membership pass to the device wallet.
 *
 * Android: Opens "Save to Google Wallet" URL (geofence + barcode + NFC)
 * iOS: Downloads .pkpass and adds to Apple Wallet (geofence + barcode + NFC)
 */
export async function addMembershipToWallet({ gymId, memberId, memberName, gymName, planName, expiryDate }) {
  try {
    if (Platform.OS === 'android') {
      // Request Google Wallet "Save" URL from backend
      const response = await api.get(
        `/gyms/${gymId}/members/${memberId}/wallet/google-pass`
      )

      if (response.data?.saveUrl) {
        await Linking.openURL(response.data.saveUrl)
        return true
      }

      Alert.alert(
        'Setup Required',
        'Google Wallet pass is being configured. Your QR code works for check-in in the meantime.',
      )
      return false
    }

    if (Platform.OS === 'ios') {
      // Request .pkpass from backend
      const response = await api.get(
        `/gyms/${gymId}/members/${memberId}/wallet/apple-pass`
      )

      if (response.data?.passData && WalletManager) {
        await WalletManager.addPassFromBase64(response.data.passData)
        return true
      }

      // Apple certs not yet configured — show message
      Alert.alert(
        'Coming Soon',
        'Apple Wallet pass will be available soon. Your QR code works for check-in.',
      )
      return false
    }
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to add to wallet'

    if (err.response?.status === 404 || msg.includes('not configured')) {
      Alert.alert(
        'Setup in Progress',
        'Wallet pass generation is being set up. Your QR code works for check-in in the meantime.',
      )
    } else {
      Alert.alert('Wallet Error', msg)
    }
    return false
  }

  return false
}

export default {
  canAddToWallet,
  addMembershipToWallet,
}
