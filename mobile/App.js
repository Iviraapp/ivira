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
import { StyleSheet, View, ActivityIndicator, Text, ScrollView } from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { HealthProvider } from './src/context/HealthContext'
import AppNavigator from './src/navigation/AppNavigator'
import NotificationManager from './src/components/NotificationManager'
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

// ── Debug Error Boundary ───────────────────────────────────────────
// Catches JS render errors and displays them on-screen so we can
// diagnose crashes on standalone APKs without adb/logcat.
class CrashScreen extends React.Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
  }

  render() {
    if (this.state.error) {
      return (
        <View style={debugStyles.root}>
          <ScrollView contentContainerStyle={debugStyles.scroll}>
            <Text style={debugStyles.title}>App Crash Detected</Text>
            <Text style={debugStyles.label}>Error:</Text>
            <Text style={debugStyles.msg}>{String(this.state.error)}</Text>
            <Text style={debugStyles.label}>Stack:</Text>
            <Text style={debugStyles.stack}>
              {this.state.error?.stack || 'No stack trace'}
            </Text>
            {this.state.info?.componentStack && (
              <>
                <Text style={debugStyles.label}>Component Stack:</Text>
                <Text style={debugStyles.stack}>
                  {this.state.info.componentStack}
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      )
    }
    return this.props.children
  }
}

const debugStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a0000', paddingTop: 60, paddingHorizontal: 16 },
  scroll: { paddingBottom: 80 },
  title: { color: '#FF4444', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  label: { color: '#FF8888', fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  msg: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  stack: { color: '#CCCCCC', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
})

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
        <ActivityIndicator size="large" color="#0055FF" />
      </View>
    )
  }

  return (
    <CrashScreen>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </CrashScreen>
  )
}

export default Sentry.wrap(App)

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
})
