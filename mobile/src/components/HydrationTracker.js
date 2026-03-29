// HydrationTracker — Smart hydration tracker with visual water bottle fill animation
import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'

let Svg = null, Rect = null, Defs = null, LinearGradient = null, Stop = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Rect = svg.Rect
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
} catch {}

const BOTTLE_W = 50
const BOTTLE_H = 80
const ACCENT = '#38BDF8'

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

function WaterBottle({ glasses, goal }) {
  const fill = Math.min(1, glasses / Math.max(goal, 1))
  const waterH = fill * (BOTTLE_H - 12)

  if (!Svg || !Rect || !Defs || !LinearGradient || !Stop) {
    // Fallback: simple View-based progress bar
    return (
      <View style={styles.bottleFallback}>
        <View style={styles.bottleFallbackInner}>
          <View style={[styles.bottleFallbackFill, { height: `${fill * 100}%` }]} />
        </View>
      </View>
    )
  }

  return (
    <Svg width={BOTTLE_W} height={BOTTLE_H}>
      <Defs>
        <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#38BDF8" stopOpacity="1" />
          <Stop offset="1" stopColor="#0EA5E9" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      {/* Bottle outline */}
      <Rect x={2} y={2} width={BOTTLE_W - 4} height={BOTTLE_H - 4} rx={12} ry={12}
        fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth={2} />
      {/* Water fill from bottom */}
      {waterH > 0 && (
        <Rect
          x={5} y={BOTTLE_H - 5 - waterH} width={BOTTLE_W - 10} height={waterH}
          rx={8} ry={8} fill="url(#waterGrad)" opacity={0.85}
        />
      )}
    </Svg>
  )
}

export default function HydrationTracker({ style, glasses = 0, goal = 8, onAddGlass, lastGlassTime }) {
  const { colors, card, isDark } = useTheme()
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
      {/* Aesthetic hero accent */}
      <View style={[styles.heroAccent, { backgroundColor: isDark ? '#0a2a3a' : '#d4e8f0' }]}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=50' }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.heroAccentImage}
          resizeMode="cover"
        >
          <View style={[styles.heroAccentOverlay, !isDark && styles.heroAccentOverlayLight]} />
        </ImageBackground>
      </View>
      {/* Colored top accent */}
      <View style={styles.topAccent} />

      {/* Header */}
      <View style={styles.header}>
        <Feather name="droplet" size={18} color={ACCENT} />
        <Text style={[styles.title, { color: colors.text }]}>Hydration</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{glasses}/{goal}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <WaterBottle glasses={glasses} goal={goal} />
        <View style={styles.stats}>
          <Text style={[styles.countLarge, { color: colors.text }]}>{glasses}</Text>
          <Text style={[styles.countGoal, { color: colors.textSec }]}>of {goal} glasses</Text>
          {lastGlassLabel && (
            <Text style={[styles.lastGlass, { color: colors.textTer }]}>
              Last: {lastGlassLabel}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.addBtn, goalMet && styles.addBtnDone]}
            onPress={onAddGlass}
            activeOpacity={0.7}
            disabled={!onAddGlass}
          >
            <Feather name={goalMet ? 'check' : 'plus'} size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
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
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  heroAccentImage: {
    borderTopLeftRadius: ELITE_CARD.borderRadius || 22,
    borderTopRightRadius: ELITE_CARD.borderRadius || 22,
  },
  heroAccentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.55)',
  },
  heroAccentOverlayLight: {
    backgroundColor: 'rgba(247,245,242,0.72)',
  },
  topAccent: {
    height: 3,
    backgroundColor: ACCENT,
    borderTopLeftRadius: ELITE_CARD.borderRadius,
    borderTopRightRadius: ELITE_CARD.borderRadius,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  badge: {
    backgroundColor: 'rgba(56,189,248,0.15)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  body: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 20,
  },
  stats: { flex: 1, alignItems: 'flex-start', gap: 2 },
  countLarge: { fontSize: 36, fontWeight: '800', lineHeight: 40 },
  countGoal: { fontSize: 13, marginBottom: 4 },
  lastGlass: { fontSize: 11, marginBottom: 6 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  addBtnDone: { backgroundColor: '#22C55E' },
  nudgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  nudgeText: { fontSize: 12 },
  // Fallback bottle
  bottleFallback: { width: BOTTLE_W, height: BOTTLE_H, justifyContent: 'flex-end' },
  bottleFallbackInner: {
    width: BOTTLE_W - 4, height: BOTTLE_H - 4, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(56,189,248,0.25)',
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  bottleFallbackFill: {
    width: '100%', backgroundColor: ACCENT, opacity: 0.7,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
  },
})
