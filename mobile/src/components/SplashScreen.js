import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { COLORS } from '../lib/theme'

let Svg = null, Path = null, SvgCircle = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Path = svg.Path
  SvgCircle = svg.Circle
} catch {}

export default function SplashScreen({ onFinish }) {
  const pulseScale = useRef(new Animated.Value(0.8)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const glowOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    Animated.timing(glowOpacity, {
      toValue: 0.25,
      duration: 600,
      useNativeDriver: true,
    }).start()

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
      {/* Emerald radial glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <Animated.View
        style={{
          transform: [{ scale: pulseScale }],
          opacity: logoOpacity,
          alignItems: 'center',
        }}
      >
        {/* VIRA Emphasis Wordmark */}
        <View style={styles.wordmarkRow}>
          <Text style={[styles.logo, { opacity: 0.45 }]}>I</Text>
          <Text style={styles.logo}>VIRA</Text>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.accentGlow,
  },
  pulseWrap: {
    marginBottom: 16,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -1,
  },
})