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
import Svg, { Circle as SvgCircle, Path, Text as SvgText, Line, Rect, G } from 'react-native-svg'

const { width: W, height: H } = Dimensions.get('window')
const ONBOARDING_KEY = 'ivira_onboarding_seen'

// ── Slide config ─────────────────────────────────────────────────────
const SLIDES = [
  {
    tagline: 'ONE NUMBER',
    title: 'Your fitness',
    titleAccent: '\nscore, daily.',
    subtitle: 'Steps, sleep, workouts, and nutrition — combined into one score that tells you exactly where you stand.',
    bgBase: '#07080F',
    accentColor: '#10B981',
  },
  {
    tagline: 'ACCOUNTABILITY',
    title: 'Prove it.',
    titleAccent: '\nTogether.',
    subtitle: 'Your Circle watches you show up. AI verifies your form. Your streak speaks for itself.',
    bgBase: '#07080F',
    accentColor: '#8B5CF6',
  },
  {
    tagline: 'AI COACHING',
    title: 'Vira knows',
    titleAccent: '\nyour body.',
    subtitle: "Reads your sleep, adapts your workout, nudges you when you're near the gym.",
    bgBase: '#07080F',
    accentColor: '#10B981',
  },
]

// ── Slide 1 Visual — Fitness Score Ring ──────────────────────────────
function Slide1Visual() {
  const cx = W / 2, cy = H * 0.28, r = 88, ir = 66
  const circ = 2 * Math.PI * r
  const progress = circ * 0.75 // 270 degrees

  const pills = [
    { label: '8,420 steps', x: cx - 120, y: cy - 80, bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
    { label: '7.2h sleep', x: cx + 40, y: cy - 80, bg: 'rgba(16,185,129,0.12)', color: '#34D399' },
    { label: '1,840 kcal', x: cx - 120, y: cy + 80, bg: 'rgba(251,191,36,0.12)', color: '#FBBF24' },
    { label: '14h fast', x: cx + 50, y: cy + 80, bg: 'rgba(249,115,22,0.12)', color: '#FB923C' },
  ]

  return (
    <View style={{ position: 'absolute', width: W, height: H * 0.58 }}>
      {/* Grid lines */}
      <Svg width={W} height={H * 0.58} style={StyleSheet.absoluteFillObject}>
        <Line x1={W*0.33} y1={0} x2={W*0.33} y2={H*0.58} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <Line x1={W*0.66} y1={0} x2={W*0.66} y2={H*0.58} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <Line x1={0} y1={H*0.19} x2={W} y2={H*0.19} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <Line x1={0} y1={H*0.38} x2={W} y2={H*0.38} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />

        {/* Outer ring */}
        <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth={1} />
        {/* Inner ring */}
        <SvgCircle cx={cx} cy={cy} r={ir} fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        {/* Progress arc */}
        <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke="#10B981" strokeWidth={3}
          strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />

        {/* Score text */}
        <SvgText x={cx} y={cy + 2} textAnchor="middle" fontSize={28} fontWeight="bold" fill="#FFFFFF">74</SvgText>
        <SvgText x={cx} y={cy + 18} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.3)" letterSpacing={2}>SCORE</SvgText>

        {/* Cardinal dots */}
        <SvgCircle cx={cx} cy={cy - r - 6} r={3} fill="#10B981" />
        <SvgCircle cx={cx + r + 6} cy={cy} r={3} fill="#10B981" />
        <SvgCircle cx={cx} cy={cy + r + 6} r={3} fill="#10B981" />
        <SvgCircle cx={cx - r - 6} cy={cy} r={3} fill="#10B981" />
      </Svg>

      {/* Stat pills */}
      {pills.map((p, i) => (
        <View key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          backgroundColor: p.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
        }}>
          <Text style={{ fontSize: 11, color: p.color, fontWeight: '600', fontFamily: FONT.bold }}>{p.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Slide 2 Visual — Circles/Social ─────────────────────────────────
function Slide2Visual() {
  const cx = W / 2, cy = H * 0.24

  return (
    <View style={{ position: 'absolute', width: W, height: H * 0.58 }}>
      <Svg width={W} height={H * 0.58} style={StyleSheet.absoluteFillObject}>
        {/* Grid */}
        <Line x1={W*0.33} y1={0} x2={W*0.33} y2={H*0.58} stroke="rgba(139,92,246,0.06)" strokeWidth={0.5} />
        <Line x1={W*0.66} y1={0} x2={W*0.66} y2={H*0.58} stroke="rgba(139,92,246,0.06)" strokeWidth={0.5} />
        <Line x1={0} y1={H*0.19} x2={W} y2={H*0.19} stroke="rgba(139,92,246,0.06)" strokeWidth={0.5} />
        <Line x1={0} y1={H*0.38} x2={W} y2={H*0.38} stroke="rgba(139,92,246,0.06)" strokeWidth={0.5} />

        {/* Dashed connecting lines */}
        <Line x1={cx - 80} y1={cy} x2={cx - 36} y2={cy} stroke="rgba(139,92,246,0.2)" strokeWidth={1} strokeDasharray="4,4" />
        <Line x1={cx + 36} y1={cy} x2={cx + 80} y2={cy} stroke="rgba(139,92,246,0.2)" strokeWidth={1} strokeDasharray="4,4" />

        {/* Left member */}
        <SvgCircle cx={cx - 100} cy={cy} r={24} fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.2)" strokeWidth={1} />
        <SvgText x={cx - 100} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#34D399">R</SvgText>

        {/* Center (YOU) */}
        <SvgCircle cx={cx} cy={cy} r={36} fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)" strokeWidth={1.5} />
        <SvgText x={cx} y={cy + 5} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#A78BFA">N</SvgText>
        <SvgText x={cx} y={cy + 22} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.3)" letterSpacing={2}>YOU</SvgText>

        {/* Right member */}
        <SvgCircle cx={cx + 100} cy={cy} r={24} fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.2)" strokeWidth={1} />
        <SvgText x={cx + 100} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#FB923C">A</SvgText>
      </Svg>

      {/* Streak badge */}
      <View style={{ position: 'absolute', left: cx + 20, top: cy - 50,
        backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
        flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 10 }}>🔥</Text>
        <Text style={{ fontSize: 10, color: '#FBBF24', fontWeight: '700', fontFamily: FONT.bold }}>7d</Text>
      </View>

      {/* AI Verified pill */}
      <View style={{ position: 'absolute', left: cx - 55, top: cy + 60,
        backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5,
        flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ fontSize: 10 }}>✓</Text>
        <Text style={{ fontSize: 11, color: '#34D399', fontWeight: '600', fontFamily: FONT.bold }}>AI VERIFIED SET</Text>
      </View>

      {/* Prove My Set card */}
      <View style={{ position: 'absolute', left: W * 0.1, right: W * 0.1, top: cy + 100,
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.08)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.15)',
          alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14 }}>▶</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '700', fontFamily: FONT.bold }}>Prove my set</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: FONT.regular }}>Record · AI analyses form · Share</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 14, color: '#34D399', fontWeight: '800', fontFamily: FONT.bold }}>86</Text>
        </View>
      </View>
    </View>
  )
}

// ── Slide 3 Visual — Vira AI Chat + Geofence ────────────────────────
function Slide3Visual() {
  const cx = W / 2

  return (
    <View style={{ position: 'absolute', width: W, height: H * 0.58 }}>
      {/* Grid */}
      <Svg width={W} height={H * 0.58} style={StyleSheet.absoluteFillObject}>
        <Line x1={W*0.33} y1={0} x2={W*0.33} y2={H*0.58} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <Line x1={W*0.66} y1={0} x2={W*0.66} y2={H*0.58} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <Line x1={0} y1={H*0.19} x2={W} y2={H*0.19} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
        <Line x1={0} y1={H*0.38} x2={W} y2={H*0.38} stroke="rgba(16,185,129,0.06)" strokeWidth={0.5} />
      </Svg>

      {/* Vira message */}
      <View style={{ position: 'absolute', left: 24, right: 60, top: H * 0.08 }}>
        <Text style={{ fontSize: 8, color: '#34D399', fontWeight: '700', fontFamily: FONT.bold, marginBottom: 4, letterSpacing: 1 }}>VIRA</Text>
        <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 14, borderTopLeftRadius: 4,
          padding: 12, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.15)' }}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, fontFamily: FONT.regular }}>
            You slept 5.8h — going heavy today risks injury. Try mobility.
          </Text>
        </View>
      </View>

      {/* User reply */}
      <View style={{ position: 'absolute', right: 24, left: 80, top: H * 0.19 }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderTopRightRadius: 4,
          padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: FONT.regular }}>
            Ok what's today's workout then?
          </Text>
        </View>
      </View>

      {/* Vira response with workout */}
      <View style={{ position: 'absolute', left: 24, right: 40, top: H * 0.27 }}>
        <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 14, borderTopLeftRadius: 4,
          padding: 12, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.15)' }}>
          <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '700', fontFamily: FONT.bold, marginBottom: 4 }}>
            Mobility & Core · 30 min
          </Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 16, fontFamily: FONT.regular, marginBottom: 8 }}>
            Foam roll → hip openers → dead bugs → planks
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, color: '#07080F', fontWeight: '700', fontFamily: FONT.bold }}>Start</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 10, color: '#A78BFA', fontFamily: FONT.regular }}>based on last night's sleep</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Geofence ring */}
      <Svg width={W} height={120} style={{ position: 'absolute', top: H * 0.44, left: 0 }}>
        <SvgCircle cx={cx} cy={60} r={50} fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth={1} strokeDasharray="6,4" />
        <SvgCircle cx={cx} cy={60} r={30} fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth={1} strokeDasharray="4,3" />
        <SvgText x={cx} y={63} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.25)" fontWeight="bold">GYM</SvgText>
      </Svg>

      {/* Proximity pills */}
      <View style={{ position: 'absolute', left: W * 0.06, top: H * 0.46,
        backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text style={{ fontSize: 10, color: '#34D399', fontWeight: '600', fontFamily: FONT.bold }}>Almost there! 🎯</Text>
      </View>
      <View style={{ position: 'absolute', right: W * 0.06, top: H * 0.46,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontFamily: FONT.bold }}>Tap to check in</Text>
      </View>
    </View>
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
function Dot({ active, color }) {
  const w = useRef(new Animated.Value(active ? 20 : 6)).current
  const o = useRef(new Animated.Value(active ? 1 : 0.25)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(w, { toValue: active ? 20 : 6, damping: 15, stiffness: 180, useNativeDriver: false }),
      Animated.timing(o, { toValue: active ? 1 : 0.25, duration: 250, useNativeDriver: false }),
    ]).start()
  }, [active])

  return <Animated.View style={[styles.dot, { width: w, opacity: o, backgroundColor: active ? color : 'rgba(255,255,255,0.15)' }]} />
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
        {activeSlide === 0 && <Slide1Visual />}
        {activeSlide === 1 && <Slide2Visual />}
        {activeSlide === 2 && <Slide3Visual />}
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
        <Animated.Text style={[styles.tagline, { color: slide.accentColor, opacity: titleFade, transform: [{ translateY: titleSlide }] }]}>
          {slide.tagline}
        </Animated.Text>

        {/* Big title */}
        <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: titleFade }}>
          <Text style={styles.title}>
            {slide.title}
            <Text style={[styles.titleAccent, { color: slide.accentColor }]}>{slide.titleAccent}</Text>
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subFade, transform: [{ translateY: subSlide }] }]}>
          {slide.subtitle}
        </Animated.Text>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => <Dot key={i} active={i === activeSlide} color={slide.accentColor} />)}
        </View>

        {/* CTA */}
        <Animated.View style={{ opacity: ctaFade }}>
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              isLast
                ? { backgroundColor: slide.accentColor, shadowColor: slide.accentColor }
                : { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowOpacity: 0 },
            ]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, { color: isLast ? '#07080F' : '#FFFFFF' }]}>
              {isLast ? 'Start Moving' : 'Next'}
            </Text>
            <Feather name={isLast ? 'arrow-right' : 'chevron-right'} size={20} color={isLast ? '#07080F' : '#FFFFFF'} />
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
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: SPACING.md,
  },
  titleAccent: {},
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 21,
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
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
})
