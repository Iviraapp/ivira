import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet, View, ActivityIndicator } from 'react-native'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
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
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <NotificationManager />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  )
}

export default function App() {
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
        <ActivityIndicator size="large" color="#0052FF" />
      </View>
    )
  }

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
  },
})
