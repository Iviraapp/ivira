import React, { useEffect, useRef } from 'react'
import { View, Animated } from 'react-native'
import { COLORS, RADIUS, SPACING } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'

function SkeletonBlock({ width, height = 14, radius = 8, style }) {
  const pulse = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [])
  const { colors } = useTheme()
  return (
    <Animated.View style={[{
      width, height, borderRadius: radius,
      backgroundColor: colors.bgTer || 'rgba(255,255,255,0.08)',
      opacity: pulse,
    }, style]} />
  )
}

export function HomeScreenSkeleton() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: SPACING.lg, paddingTop: 60 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
        <View>
          <SkeletonBlock width={100} height={12} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={150} height={28} />
        </View>
        <SkeletonBlock width={40} height={40} radius={20} />
      </View>
      {/* Check-in card */}
      <SkeletonBlock width="100%" height={90} radius={20} style={{ marginBottom: 16 }} />
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <SkeletonBlock width="48%" height={80} radius={14} />
        <SkeletonBlock width="48%" height={80} radius={14} />
      </View>
      {/* Circle card */}
      <SkeletonBlock width="100%" height={160} radius={20} style={{ marginBottom: 16 }} />
      {/* AI card */}
      <SkeletonBlock width="100%" height={120} radius={20} />
    </View>
  )
}

export function ListSkeleton({ rows = 5 }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: SPACING.lg }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <SkeletonBlock width={44} height={44} radius={12} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="70%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="45%" height={10} />
          </View>
        </View>
      ))}
    </View>
  )
}

export default SkeletonBlock
