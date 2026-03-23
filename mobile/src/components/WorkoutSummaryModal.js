import React, { useEffect, useRef, useMemo } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Animated, Share, Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const CONFETTI_COLORS = [COLORS.accent, COLORS.green, COLORS.amber, COLORS.cyan, '#F97316', '#8B5CF6']
const CONFETTI_COUNT = 18

// ── Confetti Dot ──────────────────────────────────────────────────
function ConfettiDot({ delay, color, startX, startY }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1800,
      delay,
      useNativeDriver: true,
    }).start()
  }, [])

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY - 60, startY + 220] })
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [startX, startX + (Math.random() - 0.5) * 80, startX + (Math.random() - 0.5) * 120] })
  const opacity = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.8, 0] })
  const scale = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.4] })

  return (
    <Animated.View
      style={[
        styles.confettiDot,
        {
          backgroundColor: color,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    />
  )
}

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ value, suffix, style, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current
  const [displayValue, setDisplayValue] = React.useState(0)

  useEffect(() => {
    anim.setValue(0)
    const timeout = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start()
    }, delay)

    const listener = anim.addListener(({ value: v }) => {
      setDisplayValue(Math.round(v * value))
    })

    return () => {
      clearTimeout(timeout)
      anim.removeListener(listener)
    }
  }, [value, delay])

  const formatted = value >= 1000 ? displayValue.toLocaleString() : String(displayValue)

  return (
    <Text style={style}>
      {formatted}{suffix ? <Text style={styles.statSuffix}> {suffix}</Text> : null}
    </Text>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ icon, value, label, suffix, borderColor, delay, colors }) {
  return (
    <View style={[styles.gridCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <View style={[styles.gridCardBorder, { backgroundColor: borderColor }]} />
      <View style={[styles.gridCardIcon, { backgroundColor: `${borderColor}20` }]}>
        <Feather name={icon} size={16} color={borderColor} />
      </View>
      <AnimatedCounter
        value={value}
        suffix={suffix}
        style={[styles.gridCardValue, { color: colors.text }]}
        delay={delay}
      />
      <Text style={[styles.gridCardLabel, { color: colors.textTer }]}>{label}</Text>
    </View>
  )
}

// ── Main Modal ────────────────────────────────────────────────────
export default function WorkoutSummaryModal({ visible, onClose, summary }) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()

  // Animations
  const checkScale = useRef(new Animated.Value(0)).current
  const titleOpacity = useRef(new Animated.Value(0)).current
  const contentOpacity = useRef(new Animated.Value(0)).current

  // Confetti positions (memoized so they don't change on re-render)
  const confettiDots = useMemo(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: Math.random() * (SCREEN_WIDTH - 40),
      startY: -20 + Math.random() * 30,
      delay: Math.random() * 600,
    })),
  [])

  useEffect(() => {
    if (visible) {
      checkScale.setValue(0)
      titleOpacity.setValue(0)
      contentOpacity.setValue(0)

      Animated.sequence([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
          delay: 200,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  if (!summary) return null

  const {
    name = 'Workout',
    duration_minutes = 0,
    exercises_count = 0,
    total_sets = 0,
    total_volume = 0,
    personal_records = [],
    calories_estimate,
  } = summary

  const calories = calories_estimate ?? duration_minutes * 7

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Just crushed ${name}! ${duration_minutes}min | ${exercises_count} exercises | ${total_volume.toLocaleString()}kg total volume \u{1F4AA} #IVIRA`,
      })
    } catch (_) {
      // user cancelled
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Confetti ─────────────────────────────── */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {confettiDots.map(dot => (
              <ConfettiDot
                key={dot.id}
                color={dot.color}
                startX={dot.startX}
                startY={dot.startY}
                delay={dot.delay}
              />
            ))}
          </View>

          {/* ── Celebration Header ────────────────────── */}
          <View style={styles.celebrationHeader}>
            <Animated.View
              style={[
                styles.checkCircle,
                { transform: [{ scale: checkScale }] },
              ]}
            >
              <Feather name="check" size={36} color="#FFF" />
            </Animated.View>

            <Animated.Text style={[styles.completeTitle, { color: colors.text, opacity: titleOpacity }]}>
              Workout Complete!
            </Animated.Text>
            <Animated.Text style={[styles.workoutName, { color: colors.textSec, opacity: titleOpacity }]}>
              {name}
            </Animated.Text>
          </View>

          {/* ── Stats Grid (2x2) ──────────────────────── */}
          <Animated.View style={[styles.statsGrid, { opacity: contentOpacity }]}>
            <StatCard
              icon="clock"
              value={duration_minutes}
              label="Duration"
              suffix="min"
              borderColor={COLORS.accent}
              delay={400}
              colors={colors}
            />
            <StatCard
              icon="activity"
              value={exercises_count}
              label="Exercises"
              borderColor={COLORS.green}
              delay={600}
              colors={colors}
            />
            <StatCard
              icon="layers"
              value={total_sets}
              label="Total Sets"
              borderColor={COLORS.amber}
              delay={800}
              colors={colors}
            />
            <StatCard
              icon="trending-up"
              value={total_volume}
              label="Volume"
              suffix="kg"
              borderColor={COLORS.cyan}
              delay={1000}
              colors={colors}
            />
          </Animated.View>

          {/* ── Calories Card ─────────────────────────── */}
          <Animated.View style={[styles.caloriesCard, { backgroundColor: colors.bgSec, borderColor: colors.border, opacity: contentOpacity }]}>
            <Text style={styles.caloriesEmoji}>{'\u{1F525}'}</Text>
            <AnimatedCounter
              value={calories}
              style={[styles.caloriesValue, { color: colors.text }]}
              delay={1200}
            />
            <Text style={[styles.caloriesLabel, { color: colors.textTer }]}>estimated calories burned</Text>
          </Animated.View>

          {/* ── Personal Records ──────────────────────── */}
          {personal_records.length > 0 && (
            <Animated.View style={[styles.prSection, { opacity: contentOpacity }]}>
              <Text style={[styles.prTitle, { color: colors.text }]}>
                New Personal Records! {'\u{1F3C6}'}
              </Text>
              {personal_records.map((pr, i) => (
                <View key={i} style={[styles.prCard, { borderColor: COLORS.amber }]}>
                  <View style={styles.prIcon}>
                    <Feather name="award" size={18} color={COLORS.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prExercise, { color: colors.text }]}>{pr.exercise_name}</Text>
                    <Text style={[styles.prDetail, { color: colors.textSec }]}>
                      {pr.weight_kg} kg x {pr.reps} reps
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* ── Action Buttons ────────────────────────── */}
          <Animated.View style={[styles.actions, { opacity: contentOpacity }]}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Feather name="share-2" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnText}>Share Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.bgTer }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: 'hidden',
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Celebration header
  celebrationHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: SPACING.xl,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    marginBottom: 6,
  },
  workoutName: {
    fontSize: 16,
    fontFamily: FONT.medium,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  gridCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - 10) / 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  gridCardBorder: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 2,
  },
  gridCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridCardValue: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: FONT.numExtraBold,
  },
  gridCardLabel: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 4,
  },
  statSuffix: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },

  // Calories
  caloriesCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  caloriesEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 42,
    fontWeight: '900',
    fontFamily: FONT.numBlack,
  },
  caloriesLabel: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginTop: 4,
  },

  // PRs
  prSection: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  prTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT.bold,
    marginBottom: SPACING.md,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
  },
  prIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(251,188,5,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prExercise: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  prDetail: {
    fontSize: 13,
    fontFamily: FONT.numMedium,
    marginTop: 2,
  },

  // Actions
  actions: {
    width: '100%',
    gap: 10,
    marginTop: SPACING.sm,
  },
  shareBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
    color: '#FFF',
  },
  doneBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
})
