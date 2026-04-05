import 'react-native-gesture-handler'
import React, { useEffect } from 'react'
import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enableAutoSessionTracking: true,
  enableNativeCrashHandling: true,
  enableAutoPerformanceTracing: true,
})
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet, View, ActivityIndicator, Platform, Linking } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { HealthProvider } from './src/context/HealthContext'
import AppNavigator from './src/navigation/AppNavigator'
import WhatsNewModal from './src/components/WhatsNewModal'
import NotificationManager from './src/components/NotificationManager'
import { PremiumAlertOverlay } from './src/components/PremiumAlert'
import ErrorBoundary from './src/components/ErrorBoundary'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter'
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono'
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'

/** Bridge: HealthProvider needs gymId/memberId from AuthContext */
function HealthProviderBridge({ children }) {
  const { member, gymId } = useAuth()
  return (
    <HealthProvider gymId={gymId} memberId={member?.id}>
      {children}
    </HealthProvider>
  )
}

/** Inner shell that has access to ThemeContext for dynamic StatusBar + background */
function ThemedApp() {
  const { colors, isDark } = useTheme()

  useEffect(() => {
    // Handle notification tap → navigate to CheckIn
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      if (data?.action === 'open_checkin') {
        import('./src/lib/storage').then(({ setItem }) => {
          setItem('ivira_pending_nav', 'CheckIn').catch(() => {})
        })
      }
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    try {
      Notifications.setNotificationCategoryAsync?.('gym_nearby', [
        { identifier: 'CHECK_IN', buttonTitle: 'Check In', options: { opensAppToForeground: true } },
      ])
    } catch {}
  }, [])

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const Constants = require('expo-constants')
        const currentVersion = Constants.default?.expoConfig?.version || '1.0.0'
        const res = await fetch(`https://api.ivira.app/api/v1/app-version?platform=${Platform.OS}`)
        const data = await res.json()
        if (data.version?.force_update && data.version.version !== currentVersion) {
          // Show non-dismissable update alert
          const { premiumAlert } = require('./src/components/PremiumAlert')
          premiumAlert('Update Required', `A new version (${data.version.version}) is available. Please update to continue using IVIRA.`, [
            { text: 'Update Now', onPress: () => {
              Linking.openURL(data.version.download_url || 'https://api.ivira.app/downloads/ivira-latest.apk')
            }},
          ])
        }
      } catch {}
    }
    checkVersion()
  }, [])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaProvider>
        <AuthProvider>
          <HealthProviderBridge>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NotificationManager />
            <AppNavigator />
            <WhatsNewModal />
            <PremiumAlertOverlay />
          </HealthProviderBridge>
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  )
}

function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    SpaceMono_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BebasNeue_400Regular,
  })

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default Sentry.wrap(App)

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
})
