import { useState, useEffect, useCallback } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { COLORS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import LoginScreen from '../screens/LoginScreen'
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/OnboardingScreen'
import ProfileSetupScreen, { PROFILE_SETUP_KEY } from '../screens/ProfileSetupScreen'
import TabNavigator from './TabNavigator'
import SplashScreen from '../components/SplashScreen'
import { getItem } from '../lib/storage'
import { View, ActivityIndicator, Text, StyleSheet, Platform, Animated } from 'react-native'

// Biometric auth
let LocalAuthentication = null
try {
  LocalAuthentication = require('expo-local-authentication')
} catch {}

const Stack = createNativeStackNavigator()

function PrestigeSplash({ onFinish }) {
  const [logoScale] = useState(new Animated.Value(0.3))
  const [logoOpacity] = useState(new Animated.Value(0))
  const [bgOpacity] = useState(new Animated.Value(0))

  useEffect(() => {
    Animated.sequence([
      // Logo scale-in (500ms)
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 14,
          stiffness: 120,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Background fade-in (300ms)
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(onFinish, 200)
    })
  }, [])

  return (
    <View style={styles.loading}>
      {/* Astro-Purple radial glow */}
      <Animated.View style={[styles.splashGlow, { opacity: bgOpacity }]} />

      <Animated.View style={{
        transform: [{ scale: logoScale }],
        opacity: logoOpacity,
      }}>
        <Text style={styles.logoPrestige}>IVIRA</Text>
      </Animated.View>

      <Animated.View style={{ opacity: bgOpacity, marginTop: 32 }}>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </Animated.View>
    </View>
  )
}

function BiometricGate({ children }) {
  const { biometricEnabled } = useAuth()
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  const authenticate = useCallback(async () => {
    // Skip biometric gate entirely if user hasn't opted in
    if (!biometricEnabled || Platform.OS === 'web' || !LocalAuthentication) {
      setAuthed(true)
      setChecking(false)
      return
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()

      if (!hasHardware || !isEnrolled) {
        setAuthed(true)
        setChecking(false)
        return
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock IVIRA',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      })

      setAuthed(result.success)
      if (!result.success) {
        setTimeout(authenticate, 1000)
      }
    } catch (e) {
      console.warn('[biometric] Auth failed, retrying:', e?.message)
      // Don't fail open — retry instead
      setTimeout(authenticate, 1500)
    } finally {
      setChecking(false)
    }
  }, [biometricEnabled])

  useEffect(() => {
    authenticate()
  }, [authenticate])

  if (checking || !authed) {
    return (
      <View style={styles.loading}>
        <Text style={styles.logoPrestige}>IVIRA</Text>
        {checking && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: 24 }} />}
        {!checking && !authed && (
          <Text style={styles.biometricHint}>Authentication required</Text>
        )}
      </View>
    )
  }

  return children
}

export default function AppNavigator() {
  const { token, member, loading } = useAuth()
  const { colors, isDark } = useTheme()
  const [showSplash, setShowSplash] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(null) // null = loading, true/false
  const [showProfileSetup, setShowProfileSetup] = useState(null) // null = loading, true/false

  useEffect(() => {
    getItem(ONBOARDING_KEY).then(val => {
      setShowOnboarding(val !== 'true')
    }).catch(() => setShowOnboarding(true))
  }, [])

  // Check if profile setup is needed after login
  useEffect(() => {
    if (!token || !member) {
      setShowProfileSetup(false)
      return
    }
    getItem(PROFILE_SETUP_KEY).then(val => {
      if (val === 'true') {
        setShowProfileSetup(false)
      } else {
        // Show if both weight and fitness_goal are missing
        const needsSetup = !member.weight && !member.fitness_goal
        setShowProfileSetup(needsSetup)
      }
    }).catch(() => setShowProfileSetup(false))
  }, [token, member])

  if (loading || showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
  }

  if (token && showProfileSetup) {
    return <ProfileSetupScreen onComplete={() => setShowProfileSetup(false)} />
  }

  // On web, skip NavigationContainer if it causes issues
  if (Platform.OS === 'web') {
    return token ? <TabNavigator /> : <LoginScreen />
  }

  const content = (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.text,
          background: colors.bg,
          card: colors.bgSec,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )

  // Wrap with biometric gate only when logged in
  if (token) {
    return <BiometricGate>{content}</BiometricGate>
  }

  return content
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.15,
  },
  logoPrestige: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  logoTagline: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 4,
  },
  biometricHint: {
    fontSize: 14,
    color: COLORS.textTer,
    marginTop: 16,
  },
})
