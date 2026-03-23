import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { COLORS } from '../lib/theme'

export default function SplashScreen({ onFinish }) {
  const pulseScale = useRef(new Animated.Value(0.8)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const glowOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in logo
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    // Fade in glow behind logo
    Animated.timing(glowOpacity, {
      toValue: 0.2,
      duration: 600,
      useNativeDriver: true,
    }).start()

    // Logo Pulse: 0.8 → 1.0 → 0.8 looping
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    )
    pulse.start()

    // Auto-finish after 2.5s
    const timer = setTimeout(() => {
      pulse.stop()
      if (onFinish) onFinish()
    }, 2500)

    return () => {
      clearTimeout(timer)
      pulse.stop()
    }
  }, [])

  return (
    <View style={styles.container}>
      {/* Astro-Purple radial glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <Animated.View
        style={{
          transform: [{ scale: pulseScale }],
          opacity: logoOpacity,
        }}
      >
        <Text style={styles.logo}>I V I R A</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.accentGlow,
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 8,
    textAlign: 'center',
    marginTop: 4,
  },
})
