// Apple Wallet / Google Wallet integration for membership passes
import { Platform, Alert, Linking } from 'react-native'
import api from './api'

let WalletManager = null
try {
  WalletManager = require('react-native-wallet-manager').default
} catch (e) {
  console.warn('[Wallet] react-native-wallet-manager not available:', e.message)
}

/**
 * Check if the device supports adding passes to wallet.
 */
export async function canAddToWallet() {
  if (!WalletManager) return false
  try {
    if (Platform.OS === 'ios') {
      // Check if PassKit is available
      return await WalletManager.canAddPasses()
    }
    if (Platform.OS === 'android') {
      // Google Wallet — always available on Android with Google Play
      return true
    }
  } catch {
    return false
  }
  return false
}

/**
 * Generate and add a membership pass to the device wallet.
 *
 * For iOS: Generates a .pkpass file via backend and adds to Apple Wallet
 * For Android: Generates a Google Wallet pass JWT and opens Save to Wallet
 *
 * @param {object} params - { gymId, memberId, memberName, gymName, planName, expiryDate }
 */
export async function addMembershipToWallet({ gymId, memberId, memberName, gymName, planName, expiryDate }) {
  if (!WalletManager) {
    Alert.alert('Not Available', 'Wallet integration is not available on this device.')
    return false
  }

  try {
    if (Platform.OS === 'ios') {
      // Request .pkpass from backend
      const response = await api.get(
        `/gyms/${gymId}/members/${memberId}/wallet/apple-pass`,
        { responseType: 'base64' }
      )

      if (response.passData) {
        // Add the pass to Apple Wallet
        await WalletManager.addPassFromBase64(response.passData)
        return true
      }

      // Fallback: If backend doesn't support pass generation yet,
      // show a preview and link
      Alert.alert(
        'Coming Soon',
        'Apple Wallet pass generation will be available soon. Your membership QR code can be used for check-in.',
        [{ text: 'OK' }]
      )
      return false
    }

    if (Platform.OS === 'android') {
      // Request Google Wallet save link from backend
      const response = await api.get(
        `/gyms/${gymId}/members/${memberId}/wallet/google-pass`
      )

      if (response.saveUrl) {
        // Open the Google Wallet save link
        await Linking.openURL(response.saveUrl)
        return true
      }

      // Fallback
      Alert.alert(
        'Coming Soon',
        'Google Wallet pass integration will be available soon. Your membership QR code can be used for check-in.',
        [{ text: 'OK' }]
      )
      return false
    }
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Failed to add to wallet'

    // If backend endpoint doesn't exist yet, show graceful message
    if (err.response?.status === 404) {
      Alert.alert(
        'Coming Soon',
        'Wallet pass generation is being set up. Your membership QR code works for check-in in the meantime.',
        [{ text: 'OK' }]
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
