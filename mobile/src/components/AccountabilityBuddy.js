import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import {
  COLORS,
  SPACING,
  RADIUS,
  FONT,
  ELITE_CARD,
} from '../lib/theme'

const PINK = '#EC4899'
const GREEN = '#22C55E'
const AMBER = '#F59E0B'
const GRAY = '#6B7280'

export default function AccountabilityBuddy({ style }) {
  const { colors, card } = useTheme()
  const { gymId, member } = useAuth()
  const [buddy, setBuddy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noBuddy, setNoBuddy] = useState(false)

  useEffect(() => {
    if (!gymId || !member?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/gyms/${gymId}/members/${member.id}/buddy`)
        if (!cancelled && res.data?.buddy) {
          setBuddy(res.data.buddy)
          setNoBuddy(false)
        } else if (!cancelled) {
          setNoBuddy(true)
        }
      } catch {
        if (!cancelled) setNoBuddy(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [gymId, member?.id])

  if (loading) return null

  const hour = new Date().getHours()
  const showNudge = buddy && !buddy.todayCompleted && hour >= 17

  // --- No buddy paired: compact CTA ---
  if (noBuddy || !buddy) {
    return (
      <View style={[s.card, card, { borderTopColor: PINK }, style]}>
        <View style={s.ctaRow}>
          <Feather name="users" size={20} color={PINK} />
          <Text style={[s.ctaText, { color: colors.textSec }]}>
            Pair with a gym buddy for accountability
          </Text>
          <TouchableOpacity style={s.ctaBtn} activeOpacity={0.7}>
            <Text style={s.ctaBtnText}>Find Buddy</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // --- Buddy paired: full card ---
  const initial = buddy.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <View style={[s.card, card, { borderTopColor: PINK }, style]}>
      {/* Header */}
      <View style={s.header}>
        <Feather name="users" size={16} color={PINK} />
        <Text style={[s.headerText, { color: colors.text }]}>
          Accountability Buddy
        </Text>
      </View>

      {/* Main row */}
      <View style={s.mainRow}>
        {buddy.photo_url ? (
          <Image source={{ uri: buddy.photo_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarLetter}>{initial}</Text>
          </View>
        )}

        <View style={s.infoCol}>
          <Text style={[s.buddyName, { color: colors.text }]} numberOfLines={1}>
            {buddy.name}
          </Text>
          <View style={s.statusRow}>
            <Feather
              name={buddy.todayCompleted ? 'check-circle' : 'clock'}
              size={13}
              color={buddy.todayCompleted ? GREEN : AMBER}
            />
            <Text
              style={[
                s.statusText,
                { color: buddy.todayCompleted ? GREEN : AMBER },
              ]}
            >
              {buddy.todayCompleted ? 'Worked out' : 'Not yet today'}
            </Text>
          </View>
        </View>

        {/* Streak badge */}
        <View style={s.streakBadge}>
          <Feather name="zap" size={13} color={AMBER} />
          <Text style={[s.streakNum, { color: colors.text }]}>
            {buddy.streak || 0}
          </Text>
        </View>
      </View>

      {/* Status dots */}
      <View style={s.dotsRow}>
        <View style={[s.dot, { backgroundColor: GREEN }]} />
        <View
          style={[
            s.dot,
            { backgroundColor: buddy.todayCompleted ? GREEN : GRAY },
          ]}
        />
        <Text style={[s.dotsLabel, { color: colors.textTer }]}>
          You &amp; {buddy.name?.split(' ')[0]}
        </Text>
      </View>

      {/* Bottom section */}
      {showNudge ? (
        <View style={s.nudgeRow}>
          <Text style={[s.nudgeText, { color: colors.textSec }]}>
            Send a reminder?
          </Text>
          <TouchableOpacity style={s.nudgeBtn} activeOpacity={0.7}>
            <Feather name="bell" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : buddy.streak > 0 ? (
        <Text style={[s.celebText, { color: colors.textSec }]}>
          {buddy.streak} day streak together
        </Text>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    borderTopWidth: 3,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  headerText: { fontFamily: FONT.semibold, fontSize: 15, marginLeft: 8 },

  // CTA state
  ctaRow: { flexDirection: 'row', alignItems: 'center' },
  ctaText: { flex: 1, fontFamily: FONT.regular, fontSize: 13, marginHorizontal: SPACING.sm },
  ctaBtn: {
    backgroundColor: PINK,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  ctaBtnText: { fontFamily: FONT.semibold, fontSize: 13, color: '#FFF' },

  // Main row
  mainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarFallback: { backgroundColor: PINK + '22', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: FONT.semibold, fontSize: 16, color: PINK },
  infoCol: { flex: 1 },
  buddyName: { fontFamily: FONT.semibold, fontSize: 14, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontFamily: FONT.medium, fontSize: 12, marginLeft: 4 },

  // Streak
  streakBadge: { flexDirection: 'row', alignItems: 'center' },
  streakNum: { fontFamily: FONT.numBold, fontSize: 16, marginLeft: 3 },

  // Dots
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  dotsLabel: { fontFamily: FONT.regular, fontSize: 11, marginLeft: 2 },

  // Nudge
  nudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nudgeText: { fontFamily: FONT.regular, fontSize: 13 },
  nudgeBtn: {
    backgroundColor: AMBER,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Celebration
  celebText: { fontFamily: FONT.medium, fontSize: 13, textAlign: 'center' },
})
