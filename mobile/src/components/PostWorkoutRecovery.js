/**
 * Post-Workout Recovery — shows a recovery timer card with phase-based tips
 * after completing a workout. Auto-hides after 2 hours or on dismiss.
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const PHASES = [
  { max: 5, tip: 'Cool down — stretch now', icon: 'wind', color: '#34D399' },
  { max: 30, tip: 'Protein window — refuel within 30min', icon: 'zap', color: '#FBBF24' },
  { max: 60, tip: 'Rehydrate — drink 500ml water', icon: 'droplet', color: '#38BDF8' },
  { max: 120, tip: 'Recovery mode — rest and recover', icon: 'heart', color: '#A78BFA' },
]

const ACCENT = '#3B82F6'
const TWO_HOURS = 120

export default function PostWorkoutRecovery({ style }) {
  const { colors, card } = useTheme()
  const { gymId, member } = useAuth()
  const [workout, setWorkout] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!gymId || !member?.id) return
    api.get(`/gyms/${gymId}/members/${member.id}/workout-sessions?limit=1`)
      .then(res => {
        const sessions = res.data?.sessions || res.data || []
        if (sessions.length > 0) setWorkout(sessions[0])
      })
      .catch(() => {})
  }, [gymId, member?.id])

  const endTime = workout?.completed_at || workout?.ended_at
  const endMs = endTime ? new Date(endTime).getTime() : 0
  const isToday = endMs > 0 && new Date(endMs).toDateString() === new Date().toDateString()

  useEffect(() => {
    if (!endMs || !isToday) return
    const update = () => setElapsed(Math.floor((Date.now() - endMs) / 60000))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [endMs, isToday])

  if (dismissed || !isToday || elapsed >= TWO_HOURS || !endMs) return null

  const phase = PHASES.find(p => elapsed < p.max) || PHASES[PHASES.length - 1]
  const progress = Math.min(elapsed / TWO_HOURS, 1)
  const name = workout.name || workout.workout_type || 'Workout'
  const hrs = Math.floor(elapsed / 60)
  const mins = elapsed % 60
  const badge = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`

  return (
    <View style={[styles.container, card, { borderTopWidth: 3, borderTopColor: ACCENT }, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
          <Feather name="activity" size={16} color={ACCENT} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Post-Workout Recovery</Text>
        <View style={[styles.badge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
          <Text style={[styles.badgeText, { color: ACCENT }]}>{badge}</Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={18} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      <View style={styles.phaseRow}>
        <View style={[styles.phaseIcon, { backgroundColor: `${phase.color}18` }]}>
          <Feather name={phase.icon} size={18} color={phase.color} />
        </View>
        <Text style={[styles.phaseTip, { color: colors.text }]}>{phase.tip}</Text>
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: ACCENT }]} />
      </View>

      <Text style={[styles.workoutName, { color: colors.textSec }]} numberOfLines={1}>
        Completed: {name}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FONT.numSemibold,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  phaseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseTip: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.bold,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.10)',
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  workoutName: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },
})
