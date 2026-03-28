import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'
import { setItem } from '../lib/storage'

const { width: W, height: H } = Dimensions.get('window')
const ONBOARDING_KEY = 'ivira_onboarding_seen'

// ── Slide config ─────────────────────────────────────────────────────
const SLIDES = [
  {
    tagline: 'BALANCE STARTS HERE',
    title: 'IVI',
    titleAccent: 'RA',
    subtitle: 'Track workouts, nutrition, and recovery — your complete health companion.',
    // Visual scene config
    bgBase: '#08060F',
    orbs: [
      { x: W * 0.15, y: H * 0.12, size: 260, color: 'rgba(16,185,129,0.25)', delay: 0 },
      { x: W * 0.6, y: H * 0.08, size: 200, color: 'rgba(139,92,246,0.2)', delay: 800 },
      { x: W * 0.35, y: H * 0.32, size: 180, color: 'rgba(249,115,22,0.18)', delay: 400 },
      { x: W * 0.7, y: H * 0.28, size: 140, color: 'rgba(16,185,129,0.12)', delay: 1200 },
    ],
    icon: 'activity',
    iconSize: 160,
    shapes: [
      { type: 'ring', x: W * 0.5, y: H * 0.22, size: 200, color: 'rgba(16,185,129,0.08)' },
      { type: 'ring', x: W * 0.2, y: H * 0.35, size: 120, color: 'rgba(139,92,246,0.06)' },
      { type: 'diamond', x: W * 0.78, y: H * 0.15, size: 24, color: 'rgba(255,255,255,0.08)' },
      { type: 'diamond', x: W * 0.12, y: H * 0.28, size: 16, color: 'rgba(255,255,255,0.05)' },
    ],
  },
  {
    tagline: 'YOUR BODY, YOUR DATA',
    title: 'Move',
    titleAccent: 'Smart',
    subtitle: 'AI-powered coaching, step tracking, and fasting timers to keep you on track.',
    bgBase: '#060D1A',
    orbs: [
      { x: W * 0.6, y: H * 0.1, size: 280, color: 'rgba(34,197,94,0.2)', delay: 200 },
      { x: W * 0.1, y: H * 0.2, size: 220, color: 'rgba(16,185,129,0.22)', delay: 600 },
      { x: W * 0.45, y: H * 0.35, size: 160, color: 'rgba(20,184,166,0.18)', delay: 0 },
      { x: W * 0.8, y: H * 0.3, size: 120, color: 'rgba(34,197,94,0.1)', delay: 1000 },
    ],
    icon: 'trending-up',
    iconSize: 160,
    shapes: [
      { type: 'ring', x: W * 0.4, y: H * 0.18, size: 240, color: 'rgba(34,197,94,0.06)' },
      { type: 'ring', x: W * 0.75, y: H * 0.32, size: 100, color: 'rgba(16,185,129,0.05)' },
      { type: 'diamond', x: W * 0.88, y: H * 0.12, size: 20, color: 'rgba(255,255,255,0.06)' },
      { type: 'diamond', x: W * 0.25, y: H * 0.38, size: 14, color: 'rgba(255,255,255,0.04)' },
    ],
  },
  {
    tagline: 'COMMUNITY POWERED',
    title: 'Train',
    titleAccent: 'Together',
    subtitle: 'Check in with NFC, join classes, and connect with your gym community.',
    bgBase: '#0A0614',
    orbs: [
      { x: W * 0.3, y: H * 0.08, size: 300, color: 'rgba(139,92,246,0.22)', delay: 0 },
      { x: W * 0.7, y: H * 0.2, size: 200, color: 'rgba(236,72,153,0.18)', delay: 400 },
      { x: W * 0.15, y: H * 0.3, size: 180, color: 'rgba(16,185,129,0.15)', delay: 800 },
      { x: W * 0.55, y: H * 0.38, size: 140, color: 'rgba(139,92,246,0.1)', delay: 1200 },
    ],
    icon: 'users',
    iconSize: 160,
    shapes: [
      { type: 'ring', x: W * 0.55, y: H * 0.25, size: 220, color: 'rgba(139,92,246,0.07)' },
      { type: 'ring', x: W * 0.15, y: H * 0.15, size: 140, color: 'rgba(236,72,153,0.05)' },
      { type: 'diamond', x: W * 0.9, y: H * 0.1, size: 22, color: 'rgba(255,255,255,0.07)' },
      { type: 'diamond', x: W * 0.08, y: H * 0.42, size: 18, color: 'rgba(255,255,255,0.05)' },
    ],
  },
]

// ── Animated floating orb ────────────────────────────────────────────
function FloatingOrb({ x, y, size, color, delay }) {
  const float = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 5000 + delay, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 5000 + delay, useNativeDriver: true }),
      ])
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 3000 + delay * 0.5, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 3000 + delay * 0.5, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -30] })
  const translateX = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 15, 0] })

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      transform: [{ translateY }, { translateX }, { scale: pulse }],
    }} />
  )
}

// ── Decorative shape (ring or diamond) ───────────────────────────────
function Shape({ type, x, y, size, color }) {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (type === 'diamond') {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 12000, useNativeDriver: true })
      ).start()
    }
  }, [])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '405deg'] })

  if (type === 'ring') {
    return (
      <View style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
      }} />
    )
  }

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      backgroundColor: color,
      transform: [{ rotate }],
      borderRadius: 4,
    }} />
  )
}

// ── Center icon with glow ────────────────────────────────────────────
function CenterIcon({ name, size }) {
  const breathe = useRef(new Animated.Value(1)).current
  const glow = useRef(new Animated.Value(0.08)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.08, duration: 2500, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.14, duration: 2000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.06, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View style={{
      position: 'absolute',
      top: H * 0.2,
      alignSelf: 'center',
      transform: [{ scale: breathe }],
      opacity: glow,
    }}>
      <Feather name={name} size={size} color="#FFFFFF" />
    </Animated.View>
  )
}

// ── Particle dots floating upward ────────────────────────────────────
function Particles() {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * W,
      delay: Math.random() * 4000,
      size: 2 + Math.random() * 3,
      anim: new Animated.Value(0),
      opacity: 0.1 + Math.random() * 0.2,
    }))
  ).current

  useEffect(() => {
    particles.forEach(p => {
      const animate = () => {
        p.anim.setValue(0)
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 6000 + p.delay,
          useNativeDriver: true,
        }).start(() => animate())
      }
      setTimeout(animate, p.delay)
    })
  }, [])

  return (
    <>
      {particles.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [H * 0.5, -H * 0.1] })
        const opacity = p.anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, p.opacity, p.opacity, 0] })
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: '#FFFFFF',
              transform: [{ translateY }],
              opacity,
            }}
          />
        )
      })}
    </>
  )
}

// ── Bottom gradient (native, no expo-linear-gradient) ────────────────
function BottomGradient() {
  return (
    <View style={styles.gradient} pointerEvents="none">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0)' }} />
      <View style={{ flex: 0.8, backgroundColor: 'rgba(0,0,0,0.1)' }} />
      <View style={{ flex: 0.8, backgroundColor: 'rgba(0,0,0,0.25)' }} />
      <View style={{ flex: 0.8, backgroundColor: 'rgba(0,0,0,0.42)' }} />
      <View style={{ flex: 0.8, backgroundColor: 'rgba(0,0,0,0.58)' }} />
      <View style={{ flex: 0.8, backgroundColor: 'rgba(0,0,0,0.72)' }} />
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }} />
      <View style={{ flex: 1.2, backgroundColor: 'rgba(0,0,0,0.93)' }} />
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.98)' }} />
    </View>
  )
}

// ── Pagination dot ───────────────────────────────────────────────────
function Dot({ active }) {
  const w = useRef(new Animated.Value(active ? 28 : 8)).current
  const o = useRef(new Animated.Value(active ? 1 : 0.25)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(w, { toValue: active ? 28 : 8, damping: 15, stiffness: 180, useNativeDriver: false }),
      Animated.timing(o, { toValue: active ? 1 : 0.25, duration: 250, useNativeDriver: false }),
    ]).start()
  }, [active])

  return <Animated.View style={[styles.dot, { width: w, opacity: o }]} />
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }) {
  const insets = useSafeAreaInsets()
  const [activeSlide, setActiveSlide] = useState(0)

  const sceneFade = useRef(new Animated.Value(0)).current
  const titleSlide = useRef(new Animated.Value(50)).current
  const titleFade = useRef(new Animated.Value(0)).current
  const subFade = useRef(new Animated.Value(0)).current
  const subSlide = useRef(new Animated.Value(30)).current
  const ctaFade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Reset
    sceneFade.setValue(0)
    titleSlide.setValue(50)
    titleFade.setValue(0)
    subFade.setValue(0)
    subSlide.setValue(30)
    ctaFade.setValue(0)

    Animated.stagger(120, [
      Animated.timing(sceneFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(titleSlide, { toValue: 0, damping: 16, stiffness: 90, useNativeDriver: true }),
        Animated.timing(titleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(subSlide, { toValue: 0, damping: 16, stiffness: 90, useNativeDriver: true }),
        Animated.timing(subFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(ctaFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [activeSlide])

  const slide = SLIDES[activeSlide]
  const isLast = activeSlide === SLIDES.length - 1

  const handleNext = () => {
    if (isLast) handleComplete()
    else setActiveSlide(prev => prev + 1)
  }

  const handleComplete = async () => {
    try { await setItem(ONBOARDING_KEY, 'true') } catch {}
    onComplete()
  }

  return (
    <View style={[styles.container, { backgroundColor: slide.bgBase }]}>
      {/* Animated scene */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: sceneFade }]}>
        {/* Floating orbs */}
        {slide.orbs.map((orb, i) => (
          <FloatingOrb key={`${activeSlide}-orb-${i}`} {...orb} />
        ))}

        {/* Geometric shapes */}
        {slide.shapes.map((s, i) => (
          <Shape key={`${activeSlide}-shape-${i}`} {...s} />
        ))}

        {/* Center icon */}
        <CenterIcon name={slide.icon} size={slide.iconSize} />

        {/* Particle dots */}
        <Particles key={`particles-${activeSlide}`} />
      </Animated.View>

      {/* Bottom gradient */}
      <BottomGradient />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={handleComplete}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Bottom content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: titleFade, transform: [{ translateY: titleSlide }] }]}>
          {slide.tagline}
        </Animated.Text>

        {/* Big title */}
        <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: titleFade }}>
          <Text style={styles.title}>
            {slide.title}
            <Text style={styles.titleAccent}>{slide.titleAccent}</Text>
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subFade, transform: [{ translateY: subSlide }] }]}>
          {slide.subtitle}
        </Animated.Text>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => <Dot key={i} active={i === activeSlide} />)}
        </View>

        {/* CTA */}
        <Animated.View style={{ opacity: ctaFade }}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{isLast ? 'Start Moving' : 'Next'}</Text>
            <Feather name={isLast ? 'arrow-right' : 'chevron-right'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  )
}

export { ONBOARDING_KEY }

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Bottom gradient
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.58,
  },

  // Skip
  skipBtn: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },

  // Content
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.xl,
  },

  // Typography
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT.bold,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 68,
    fontWeight: '900',
    fontFamily: FONT.extraBold,
    color: '#FFFFFF',
    letterSpacing: -3,
    lineHeight: 72,
    marginBottom: SPACING.md,
  },
  titleAccent: {
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 23,
    marginBottom: SPACING.lg + 4,
    maxWidth: 300,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  dot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
})
