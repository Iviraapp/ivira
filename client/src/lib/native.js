import { Capacitor } from '@capacitor/core'

// Check if running natively
export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

// ---- Status Bar ----
export async function configureStatusBar() {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#000000' })
  } catch {}
}

// ---- Haptics ----
export async function hapticImpact(style = 'Medium') {
  if (!isNative) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle[style] })
  } catch {}
}

export async function hapticNotification(type = 'Success') {
  if (!isNative) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType[type] })
  } catch {}
}

// ---- Push Notifications ----
export async function registerPushNotifications(onToken, onNotification) {
  if (!isNative) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return

    await PushNotifications.register()

    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Token:', token.value)
      if (onToken) onToken(token.value)
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification)
      if (onNotification) onNotification(notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Action:', action)
    })
  } catch (err) {
    console.error('[Push] Setup error:', err)
  }
}

// ---- Splash Screen ----
export async function hideSplash() {
  if (!isNative) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 300 })
  } catch {}
}

// ---- Biometric Auth ----
export async function checkBiometricAvailability() {
  if (!isNative) return { available: false, type: 'none' }
  try {
    return {
      available: true,
      type: platform === 'ios' ? 'faceId' : 'fingerprint',
    }
  } catch {
    return { available: false, type: 'none' }
  }
}

// ---- Health Data ----
export async function getHealthSteps() {
  // Health data requires native plugins - return mock for now
  // Real implementation needs @capacitor-community/health or native bridge
  if (!isNative) return null
  return {
    available: false,
    steps: 0,
    calories: 0,
    message: 'Health integration requires native build',
  }
}
