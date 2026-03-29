// HydrationTracker — Smart hydration tracker with progress ring
import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'

let Svg = null, Circle = null, Defs = null, LinearGradient = null, Stop = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
} catch {}

const ACCENT = '#38BDF8'
const RING_SIZE = 100
const STROKE_WIDTH = 8
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function getNudge(glasses, goal) {
  const hour = new Date().getHours()
  const pct = glasses / goal
  if (glasses >= goal) return { text: 'Goal reached! Stay hydrated', icon: 'check-circle' }
  if (hour < 12 && pct < 0.25) return { text: 'Start hydrating early!', icon: 'sunrise' }
  if (hour >= 12 && hour < 17 && pct < 0.5) return { text: "You're behind \u2014 drink up!", icon: 'alert-circle' }
  if (hour >= 17 && pct >= 0.7) return { text: 'Great hydration today!', icon: 'smile' }
  if (hour >= 17 && pct < 0.7) return { text: 'Catch up before bed!', icon: 'moon' }
  return { text: 'Keep sipping throughout the day', icon: 'droplet' }
}

function HydrationRing({ glasses, goal }) {
  const fill = Math.min(1, glasses / Math.max(goal, 1))
  const strokeDashoffset = CIRCUMFERENCE * (1 - fill)

  if (!Svg || !Circle) {
    // Fallback: text only
    return null
  }

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {Defs && LinearGradient && Stop && (
          <Defs>
            <LinearGradient id="hydGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#38BDF8" stopOpacity="1" />
              <Stop offset="1" stopColor="#0EA5E9" stopOpacity="1" />
            </LinearGradient>
          </Defs>
        )}
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke="rgba(56,189,248,0.12)" strokeWidth={STROKE_WIDTH} fill="none"
        />
        {/* Progress */}
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          stroke={Defs ? 'url(#hydGrad)' : ACCENT}
          strokeWidth={STROKE_WIDTH} fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      {/* Center: branded droplet */}
      <View style={styles.ringCenter}>
        <Feather name="droplet" size={28} color={ACCENT} />
        <Text style={styles.ringBrand}>VIRA</Text>
      </View>
    </View>
  )
}

export default function HydrationTracker({ style, glasses = 0, goal = 8, onAddGlass, lastGlassTime }) {
  const { colors, card } = useTheme()
  const nudge = useMemo(() => getNudge(glasses, goal), [glasses, goal])
  const goalMet = glasses >= goal

  const lastGlassLabel = useMemo(() => {
    if (!lastGlassTime) return null
    const mins = Math.round((Date.now() - lastGlassTime) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}min ago`
    return `${Math.floor(mins / 60)}h ago`
  }, [lastGlassTime])

  return (
    <View style={[styles.card, card, style]}>
      {/* Top accent */}
      <View style={styles.topAccent} />

      {/* Content row: Ring | Stats | Button */}
      <View style={styles.content}>
        <HydrationRing glasses={glasses} goal={goal} />

        <View style={styles.stats}>
          <View style={styles.countRow}>
            <Text style={[styles.countLarge, { color: colors.text }]}>{glasses}</Text>
            <Text style={[styles.countGoal, { color: colors.textSec }]}>/ {goal}</Text>
          </View>
          <Text style={[styles.label, { color: colors.textSec }]}>glasses today</Text>
          {lastGlassLabel && (
            <Text style={[styles.lastGlass, { color: colors.textTer }]}>
              Last: {lastGlassLabel}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, goalMet && styles.addBtnDone]}
          onPress={onAddGlass}
          activeOpacity={0.7}
          disabled={!onAddGlass}
        >
          <Feather name={goalMet ? 'check' : 'plus'} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Nudge */}
      <View style={styles.nudgeRow}>
        <Feather name={nudge.icon} size={13} color={goalMet ? '#22C55E' : ACCENT} />
        <Text style={[styles.nudgeText, { color: colors.textSec }]}>{nudge.text}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    overflow: 'hidden',
    padding: 0,
    marginBottom: SPACING.md,
  },
  topAccent: {
    height: 3,
    backgroundColor: ACCENT,
    borderTopLeftRadius: ELITE_CARD.borderRadius,
    borderTopRightRadius: ELITE_CARD.borderRadius,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ringBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 2,
  },
  stats: {
    flex: 1,
    gap: 2,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  countLarge: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  countGoal: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  lastGlass: {
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: {
    backgroundColor: '#22C55E',
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  nudgeText: {
    fontSize: 12,
  },
})
