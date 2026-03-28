import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useHealth } from '../context/HealthContext'
import api from '../lib/api'

const ACCENT = '#F59E0B'

const TIPS = [
  'Stretch for 5 minutes before your first workout.',
  'Focus on form over speed today.',
  'Try a new exercise to challenge your muscles.',
  'Remember to breathe deeply between sets.',
  'Consistency beats intensity every time.',
  'Fuel your body with protein within 30 min post-workout.',
  'Stay present — mind-muscle connection matters.',
  'Small wins compound into big results.',
  'Recovery is when growth happens. Rest well tonight.',
  'Set one intention for your session today.',
]

function getSleepEmoji(quality) {
  if (!quality) return '\u{1F634}'
  if (quality >= 80) return '\u{1F31F}'
  if (quality >= 60) return '\u{1F60C}'
  if (quality >= 40) return '\u{1F614}'
  return '\u{1F634}'
}

function formatSleepHours(data) {
  if (!data?.totalMinutes && !data?.hours) return null
  const hrs = data.hours ?? Math.round((data.totalMinutes / 60) * 10) / 10
  return `${hrs}h`
}

export default function MorningBriefing({ style, navigation }) {
  const { colors } = useTheme()
  const { member, gymId } = useAuth()
  const { sleepData, steps } = useHealth()
  const [dismissed, setDismissed] = useState(false)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const hour = now.getHours()

  useEffect(() => {
    if (hour >= 11 || !member || !gymId) return
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    let cancelled = false

    api.get(`/gyms/${gymId}/members/${member._id || member.id}/workout-sessions?date=${today}&limit=3`)
      .then(res => {
        if (!cancelled) setWorkouts(res.data || res || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [member, gymId])

  // Don't render after 11am or if dismissed
  if (hour >= 11 || dismissed || !member) return null

  const firstName = (member.name || 'there').split(' ')[0]
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const tip = TIPS[dayOfYear % TIPS.length]

  const sleepHrs = formatSleepHours(sleepData)
  const sleepQuality = sleepData?.quality ?? sleepData?.score ?? null
  const emoji = getSleepEmoji(sleepQuality)

  const workoutList = Array.isArray(workouts) ? workouts : []

  return (
    <View style={[styles.card, { backgroundColor: colors.bgSec || ELITE_CARD.backgroundColor }, style]}>
      {/* Amber top accent */}
      <View style={styles.accentBar} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="sunrise" size={18} color={ACCENT} />
          <Text style={[styles.greeting, { color: colors.text || COLORS.text }]}>
            Good morning, {firstName}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="x" size={18} color={colors.textSec || COLORS.textSec} />
        </TouchableOpacity>
      </View>

      {/* Stat pills row */}
      <View style={styles.pillsRow}>
        <View style={[styles.pill, { backgroundColor: colors.bgTer || COLORS.bgTer }]}>
          <Feather name="moon" size={13} color="#6C63FF" />
          <Text style={[styles.pillText, { color: colors.text || COLORS.text }]}>
            {sleepHrs ? `${sleepHrs} ${emoji}` : '--'}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.bgTer || COLORS.bgTer }]}>
          <Feather name="trending-up" size={13} color="#F97316" />
          <Text style={[styles.pillText, { color: colors.text || COLORS.text }]}>
            {steps != null ? steps.toLocaleString() : '--'}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.bgTer || COLORS.bgTer }]}>
          <Feather name="calendar" size={13} color={ACCENT} />
          <Text style={[styles.pillText, { color: colors.text || COLORS.text }]}>
            {loading ? '...' : `${workoutList.length} session${workoutList.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {/* First scheduled workout */}
      {workoutList.length > 0 && (
        <View style={styles.workoutRow}>
          <Feather name="activity" size={13} color={colors.accent || COLORS.accent} />
          <Text style={[styles.workoutText, { color: colors.textSec || COLORS.textSec }]} numberOfLines={1}>
            {workoutList[0].name || workoutList[0].title || 'Workout'}{workoutList[0].time ? ` \u00B7 ${workoutList[0].time}` : ''}
          </Text>
        </View>
      )}

      {/* Hydration reminder */}
      <View style={styles.hydrationRow}>
        <Feather name="droplet" size={13} color="#38BDF8" />
        <Text style={[styles.hydrationText, { color: colors.textSec || COLORS.textSec }]}>
          Start your day with water
        </Text>
      </View>

      {/* Motivational tip */}
      <Text style={[styles.tip, { color: colors.textTer || COLORS.textTer }]}>
        {tip}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    overflow: 'hidden',
    paddingTop: 0,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  accentBar: {
    height: 3,
    backgroundColor: ACCENT,
    marginHorizontal: -SPACING.md,
    marginBottom: SPACING.sm + 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  greeting: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full,
  },
  pillText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs + 2,
  },
  workoutText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  hydrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  hydrationText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  tip: {
    fontFamily: FONT.regular,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    opacity: 0.7,
  },
})
