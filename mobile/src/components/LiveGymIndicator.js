/**
 * Live Gym Indicator — shows how many members are at the gym right now.
 * Fetches today's check-ins and displays a pulsing "X people here now" pill.
 */
import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function LiveGymIndicator({ style }) {
  const { colors } = useTheme()
  const { gymId } = useAuth()
  const [count, setCount] = useState(null)
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!gymId) return
    const today = new Date().toISOString().split('T')[0]
    api.get(`/gyms/${gymId}/checkins?date=${today}&limit=1`)
      .then(res => {
        const total = res.data?.total || res.data?.checkins?.length || 0
        setCount(total)
      })
      .catch(() => setCount(null))
  }, [gymId])

  useEffect(() => {
    if (count == null || count === 0) return
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [count])

  if (count == null || count === 0) return null

  return (
    <View style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: '#22C55E' }, style]}>
      <View style={styles.row}>
        <Animated.View style={[styles.liveDot, { transform: [{ scale: pulse }] }]} />
        <View style={styles.textWrap}>
          <Text style={[styles.count, { color: colors.text }]}>{count} {count === 1 ? 'person' : 'people'} here now</Text>
          <Text style={[styles.sub, { color: colors.textSec }]}>Checked in at your gym today</Text>
        </View>
        <Feather name="users" size={20} color={colors.accent} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  textWrap: {
    flex: 1,
  },
  count: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  sub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
})
