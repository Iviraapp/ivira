/**
 * Churn Risk Alert — shows a motivational nudge when the member
 * hasn't been active recently. Fetches churn score from backend.
 * Only visible to gym owners viewing their own risk, or self-awareness for members.
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const NUDGE_MESSAGES = {
  high: { icon: 'alert-triangle', color: '#EF4444', title: 'We miss you!', body: 'It\'s been a while since your last visit. Even 20 minutes counts — come back today!' },
  medium: { icon: 'clock', color: '#F59E0B', title: 'Stay on track', body: 'Your activity has dipped recently. A quick workout can reignite your momentum.' },
  low: null, // Don't show for low risk
}

export default function ChurnRiskAlert({ style, onPress }) {
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const [nudge, setNudge] = useState(null)

  useEffect(() => {
    if (!gymId || !member?.id) return
    api.get(`/gyms/${gymId}/churn/members/${member.id}`)
      .then(res => {
        const risk = res.data?.riskLevel || res.data?.risk_level
        if (risk && NUDGE_MESSAGES[risk]) {
          setNudge(NUDGE_MESSAGES[risk])
        }
      })
      .catch(() => {}) // silently fail — churn endpoint may not be available for members
  }, [gymId, member?.id])

  if (!nudge) return null

  return (
    <TouchableOpacity
      style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: nudge.color }, style]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: nudge.color + '18' }]}>
          <Feather name={nudge.icon} size={18} color={nudge.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{nudge.title}</Text>
          <Text style={[styles.body, { color: colors.textSec }]}>{nudge.body}</Text>
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
    alignItems: 'flex-start',
    gap: SPACING.sm + 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontFamily: FONT.regular,
    lineHeight: 18,
  },
})
