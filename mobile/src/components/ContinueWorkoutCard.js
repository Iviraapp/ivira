/**
 * Continue Workout Card — shows last workout with a 1-tap resume button.
 * Fetches from workout session history API.
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function ContinueWorkoutCard({ style, onStartWorkout }) {
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const [lastWorkout, setLastWorkout] = useState(null)

  useEffect(() => {
    if (!gymId || !member?.id) return
    api.get(`/gyms/${gymId}/members/${member.id}/workout-sessions?limit=1`)
      .then(res => {
        const sessions = res.data?.sessions || res.data || []
        if (sessions.length > 0) setLastWorkout(sessions[0])
      })
      .catch(() => {})
  }, [gymId, member?.id])

  if (!lastWorkout) return null

  const daysSince = Math.floor((Date.now() - new Date(lastWorkout.completed_at || lastWorkout.created_at).getTime()) / 86400000)
  const name = lastWorkout.name || lastWorkout.workout_type || 'Workout'
  const isInProgress = lastWorkout.status === 'in_progress'

  return (
    <TouchableOpacity
      style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: '#F97316' }, style]}
      activeOpacity={0.7}
      onPress={onStartWorkout}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
          <Feather name={isInProgress ? 'play' : 'repeat'} size={18} color="#F97316" />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isInProgress ? 'Resume Workout' : 'Continue Training'}
          </Text>
          <Text style={[styles.sub, { color: colors.textSec }]} numberOfLines={1}>
            {isInProgress ? `${name} — in progress` : `Last: ${name} · ${daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}`}
          </Text>
        </View>
        <View style={[styles.btn, { backgroundColor: '#F97316' }]}>
          <Feather name="arrow-right" size={16} color="#FFF" />
        </View>
      </View>
    </TouchableOpacity>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  sub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
