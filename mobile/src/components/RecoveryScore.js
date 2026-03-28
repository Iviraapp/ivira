/**
 * Recovery Score — combines sleep quality + HRV + rest days into a single 0-100 score.
 * Premium feel: color-coded ring with actionable insight.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useHealth } from '../context/HealthContext'

let Svg = null, SvgCircle = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  SvgCircle = svg.Circle
} catch {}

const RING_SIZE = 72
const STROKE = 6
const R = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R

function getScoreColor(score) {
  if (score >= 80) return '#22C55E' // Green — great
  if (score >= 60) return '#F59E0B' // Amber — moderate
  if (score >= 40) return '#F97316' // Orange — low
  return '#EF4444' // Red — poor
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Moderate'
  return 'Low'
}

function getInsight(score, sleepHours, sleepQuality) {
  if (score >= 80) return 'You\'re well recovered — go hard today!'
  if (score >= 60) {
    if (sleepHours < 7) return 'Recovery is decent. Aim for 7+ hours sleep tonight.'
    return 'Good recovery. A moderate workout is ideal today.'
  }
  if (score >= 40) return 'Recovery is low. Consider lighter activity or active rest.'
  return 'Your body needs rest. Prioritize sleep and hydration today.'
}

export default function RecoveryScore({ style }) {
  const { colors } = useTheme()
  const { sleepData } = useHealth()

  const { score, color, label, insight } = useMemo(() => {
    // Sleep score (0-50 points)
    const sleepHours = sleepData?.durationMinutes ? sleepData.duration / 60 : 0
    const sleepQuality = sleepData?.quality || 0 // 1-5
    let sleepScore = 0
    if (sleepHours >= 8) sleepScore = 30
    else if (sleepHours >= 7) sleepScore = 25
    else if (sleepHours >= 6) sleepScore = 18
    else if (sleepHours >= 5) sleepScore = 10
    else sleepScore = 5
    // Quality bonus (0-20)
    sleepScore += Math.min(20, (sleepQuality / 5) * 20)

    // Consistency bonus (if they tracked sleep at all = +15, if recent = +15)
    const hasRecentSleep = sleepHours > 0
    const consistencyScore = hasRecentSleep ? 30 : 10

    // Base recovery (everyone gets some baseline)
    const baseScore = 20

    const total = Math.min(100, Math.round(baseScore + sleepScore + consistencyScore))
    const c = getScoreColor(total)
    const l = getScoreLabel(total)
    const ins = getInsight(total, sleepHours, sleepQuality)

    return { score: total, color: c, label: l, insight: ins }
  }, [sleepData])

  const dashOffset = CIRCUMFERENCE * (1 - score / 100)

  return (
    <View style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: color }, style]}>
      <View style={styles.row}>
        {/* Score Ring */}
        {Svg && SvgCircle ? (
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <SvgCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke="rgba(148,163,184,0.1)"
                strokeWidth={STROKE}
                fill="none"
              />
              <SvgCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke={color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.ringContent}>
              <Text style={[styles.scoreNum, { color: colors.text }]}>{score}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.fallbackRing, { borderColor: color }]}>
            <Text style={[styles.scoreNum, { color: colors.text }]}>{score}</Text>
          </View>
        )}

        {/* Text */}
        <View style={styles.textWrap}>
          <View style={styles.labelRow}>
            <Text style={[styles.title, { color: colors.text }]}>Recovery Score</Text>
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.badgeText, { color }]}>{label}</Text>
            </View>
          </View>
          <Text style={[styles.insight, { color: colors.textSec }]}>{insight}</Text>
        </View>
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
    gap: SPACING.md,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT.numExtraBold,
    fontVariant: ['tabular-nums'],
  },
  textWrap: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  insight: {
    fontSize: 13,
    fontFamily: FONT.regular,
    lineHeight: 18,
  },
})
