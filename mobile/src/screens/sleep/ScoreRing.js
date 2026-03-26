import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { SLEEP_COLORS } from './SleepConstants'

let Svg, Circle, Defs, LinearGradient, Stop
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
} catch {}

const SIZE = 160
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ScoreRing({ score = 0, size = SIZE, label }) {
  const animValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    animValue.setValue(0)
    Animated.timing(animValue, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start()
  }, [score])

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  })

  const scoreColor = score >= 85 ? '#22C55E' : score >= 70 ? SLEEP_COLORS.primary : score >= 50 ? '#F59E0B' : '#EF4444'
  const qualityLabel = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'

  const r = (size - STROKE) / 2
  const circ = 2 * Math.PI * r

  if (!Svg) {
    // Fallback without SVG
    return (
      <View style={[styles.fallback, { width: size, height: size, borderColor: scoreColor }]}>
        <Text style={[styles.scoreText, { fontSize: size * 0.28 }]}>{score}</Text>
        <Text style={styles.maxText}>/ 100</Text>
        <Text style={[styles.qualityText, { color: scoreColor }]}>{qualityLabel}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={SLEEP_COLORS.primary} />
            <Stop offset="100%" stopColor={scoreColor} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(108,99,255,0.12)" strokeWidth={STROKE} fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#scoreGrad)" strokeWidth={STROKE} fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text style={[styles.scoreText, { fontSize: size * 0.28, color: '#FFFFFF' }]}>{score}</Text>
        <Text style={styles.maxText}>/ 100</Text>
      </View>
      <Text style={[styles.qualityText, { color: scoreColor }]}>{label || qualityLabel}</Text>
    </View>
  )
}

const AnimatedCircle = Circle ? Animated.createAnimatedComponent(Circle) : View

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  centerContent: {
    position: 'absolute', top: 0, left: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  scoreText: { fontWeight: '800', color: '#FFFFFF' },
  maxText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: -2 },
  qualityText: { fontSize: 15, fontWeight: '700', marginTop: 10, letterSpacing: 0.5 },
  fallback: {
    borderWidth: 6, borderRadius: 999, justifyContent: 'center', alignItems: 'center',
  },
})
