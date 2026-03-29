/**
 * Profile Completion Bar — nudges users to complete missing profile fields.
 * Shows progress and what's missing, tappable to navigate to profile.
 */
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const PROFILE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'photo_url', label: 'Photo' },
  { key: 'date_of_birth', label: 'Birthday' },
  { key: 'gender', label: 'Gender' },
  { key: 'weight_kg', label: 'Weight' },
  { key: 'height_cm', label: 'Height' },
]

export default function ProfileCompletionBar({ style, onPress }) {
  const { colors, card } = useTheme()
  const { member } = useAuth()

  if (!member) return null

  const filled = PROFILE_FIELDS.filter(f => {
    const val = member[f.key]
    return val !== null && val !== undefined && val !== ''
  })
  const pct = Math.round((filled.length / PROFILE_FIELDS.length) * 100)

  // Don't show if profile is complete
  if (pct >= 100) return null

  const missing = PROFILE_FIELDS.filter(f => {
    const val = member[f.key]
    return val === null || val === undefined || val === ''
  })
  const missingLabels = missing.slice(0, 3).map(f => f.label).join(', ')

  return (
    <TouchableOpacity
      style={[styles.container, card, { borderTopWidth: 3, borderTopColor: COLORS.cyan }, style]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Feather name="user" size={14} color={COLORS.cyan} />
        <Text style={[styles.title, { color: colors.text }]}>Complete Your Profile</Text>
        <Text style={[styles.pct, { color: COLORS.cyan }]}>{pct}%</Text>
      </View>
      <View style={styles.trackOuter}>
        <View style={[styles.trackFill, { width: `${pct}%` }]} />
      </View>
      <Text style={[styles.hint, { color: colors.textTer }]}>
        Add: {missingLabels}{missing.length > 3 ? ` +${missing.length - 3} more` : ''}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    flex: 1,
  },
  pct: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONT.numBold,
  },
  trackOuter: {
    height: 6,
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
  },
  hint: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },
})
