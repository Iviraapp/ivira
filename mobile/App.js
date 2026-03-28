import 'react-native-gesture-handler'
import React, { useEffect } from 'react'
import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enableAutoSessionTracking: true,
})
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet, View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { HealthProvider } from './src/context/HealthContext'
import AppNavigator from './src/navigation/AppNavigator'
import NotificationManager from './src/components/NotificationManager'
import ErrorBoundary from './src/components/ErrorBoundary'
import { preloadInterstitialAd } from './src/components/AdBanner'
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

  // Preload interstitial ads on app start
  useEffect(() => {
    const cleanup = preloadInterstitialAd()
    return cleanup
  }, [])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaProvider>
        <AuthProvider>
          <HealthProviderBridge>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <NotificationManager />
            <AppNavigator />
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
