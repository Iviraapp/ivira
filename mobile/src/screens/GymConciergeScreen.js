import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

let Svg = null
let Circle = null
let Defs = null
let LinearGradient = null
let Stop = null
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Circle = svg.Circle
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
} catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Animated pulsing ring for the concierge badge
function PulseRing() {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
  }, [])
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] })
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })
  return (
    <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
  )
}

export default function GymConciergeScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, card, isDark } = useTheme()
  const { connectGym } = useAuth()

  const [inviteCode, setInviteCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState([])

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const cardFade = useRef(new Animated.Value(0)).current
  const cardSlide = useRef(new Animated.Value(60)).current

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const GOALS = [
    { key: 'weight_loss', label: 'Weight Loss', icon: 'trending-down', color: '#EF4444' },
    { key: 'muscle_gain', label: 'Muscle Gain', icon: 'zap', color: '#F97316' },
    { key: 'hiit', label: 'HIIT / Cardio', icon: 'activity', color: '#22C55E' },
    { key: 'yoga', label: 'Yoga & Flexibility', icon: 'sun', color: '#8B5CF6' },
    { key: 'sports', label: 'Sports Training', icon: 'award', color: '#3B82F6' },
    { key: 'general', label: 'General Fitness', icon: 'heart', color: '#EC4899' },
  ]

  const toggleGoal = (key) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
  }

  const handleLinkGym = async () => {
    const code = inviteCode.trim()
    if (!code) {
      Alert.alert('Enter Code', 'Please enter your gym invite code.')
      return
    }
    setLinking(true)
    try {
      await connectGym(code)
      Alert.alert('Connected!', 'You are now linked to your gym. Check in anytime!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err) {
      Alert.alert('Invalid Code', err.response?.data?.message || 'Could not link this gym code. Please check and try again.')
    } finally {
      setLinking(false)
    }
  }

  const handleConciergeChat = () => {
    const goalLabels = selectedGoals.map(k => GOALS.find(g => g.key === k)?.label).filter(Boolean)
    Alert.alert(
      'Request Received!',
      `Our concierge team will match you with the best gyms near you${goalLabels.length ? ` for ${goalLabels.join(', ')}` : ''}. You'll get personalized offers within 24 hours.`,
      [{ text: 'Got it' }]
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroBadgeWrap}>
            <PulseRing />
            <View style={styles.heroBadge}>
              <Feather name="map-pin" size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Find Your Gym</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSec }]}>
            Link an existing membership or let us match you with the perfect facility
          </Text>
        </Animated.View>

        {/* Section 1: Link Existing Gym */}
        <Animated.View style={[
          styles.section,
          card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(0,82,255,0.12)' }]}>
              <Feather name="link" size={18} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Link Existing Membership</Text>
              <Text style={[styles.sectionDesc, { color: colors.textSec }]}>
                Got a gym invite code? Enter it below.
              </Text>
            </View>
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            <Feather name="hash" size={16} color={colors.textTer} style={{ marginRight: SPACING.sm }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. GYM-XXXXXX"
              placeholderTextColor={colors.textTer}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleLinkGym}
            />
            {inviteCode.length > 0 && (
              <TouchableOpacity onPress={() => setInviteCode('')}>
                <Feather name="x" size={16} color={colors.textTer} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.linkBtn, linking && { opacity: 0.6 }]}
            onPress={handleLinkGym}
            disabled={linking}
            activeOpacity={0.8}
          >
            {linking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.linkBtnText}>Connect to Gym</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTer }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Section 2: IVIRA Concierge */}
        <Animated.View style={[
          styles.conciergeCard,
          { opacity: cardFade, transform: [{ translateY: cardSlide }] },
        ]}>
          {/* Gradient border effect */}
          <View style={styles.conciergeInner}>
            {/* Badge */}
            <View style={styles.conciergeBadgeRow}>
              <View style={styles.conciergeBadge}>
                <Feather name="star" size={12} color="#FFFFFF" />
              </View>
              <Text style={styles.conciergeBadgeText}>I V I R A CONCIERGE</Text>
            </View>

            <Text style={styles.conciergeHeadline}>
              Looking for a facility?
            </Text>
            <Text style={styles.conciergeSub}>
              Let our team match you with the best local gyms and exclusive member-only packages.
            </Text>

            {/* Goals Selector */}
            <Text style={[styles.goalsLabel, { color: 'rgba(255,255,255,0.7)' }]}>
              What are your goals?
            </Text>
            <View style={styles.goalsGrid}>
              {GOALS.map(goal => {
                const selected = selectedGoals.includes(goal.key)
                return (
                  <TouchableOpacity
                    key={goal.key}
                    style={[
                      styles.goalChip,
                      selected && { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.4)' },
                    ]}
                    onPress={() => toggleGoal(goal.key)}
                    activeOpacity={0.7}
                  >
                    <Feather name={goal.icon} size={14} color={selected ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                    <Text style={[
                      styles.goalChipText,
                      selected && { color: '#FFFFFF' },
                    ]}>
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.conciergeBtn}
              onPress={handleConciergeChat}
              activeOpacity={0.8}
            >
              <Feather name="message-circle" size={18} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.conciergeBtnText}>Chat with our Team</Text>
            </TouchableOpacity>

            {/* Trust signal */}
            <View style={styles.trustRow}>
              <Feather name="shield" size={12} color="rgba(255,255,255,0.4)" />
              <Text style={styles.trustText}>5,000+ partner gyms</Text>
            </View>
          </View>
        </Animated.View>

        {/* How it works */}
        <View style={styles.howSection}>
          <Text style={[styles.howTitle, { color: colors.text }]}>How it works</Text>
          {[
            { step: '1', icon: 'message-circle', text: 'Tell us your goals and preferences' },
            { step: '2', icon: 'search', text: 'We match you with nearby partner gyms' },
            { step: '3', icon: 'gift', text: 'Receive exclusive offers on your app' },
            { step: '4', icon: 'check-circle', text: 'Tap to activate and start training' },
          ].map((item, i) => (
            <View key={i} style={[styles.howRow, { borderColor: colors.border }]}>
              <View style={[styles.howStepCircle, { backgroundColor: colors.bgTer }]}>
                <Text style={[styles.howStepNum, { color: COLORS.accent }]}>{item.step}</Text>
              </View>
              <Feather name={item.icon} size={16} color={colors.textSec} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.howText, { color: colors.textSec }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  heroBadgeWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Section card
  section: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginTop: 2,
    lineHeight: 18,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.medium,
    letterSpacing: 1.5,
    height: '100%',
  },

  // Link button
  linkBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT.bold,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl * 2,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    marginHorizontal: SPACING.md,
    letterSpacing: 1,
  },

  // Concierge card — blue gradient
  conciergeCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  conciergeInner: {
    backgroundColor: '#0A1628',
    borderWidth: 1,
    borderColor: 'rgba(0,82,255,0.25)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    // Faux gradient via layered shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },

  conciergeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 8,
  },
  conciergeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conciergeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    color: COLORS.accent,
    letterSpacing: 1.5,
  },

  conciergeHeadline: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  conciergeSub: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },

  // Goals
  goalsLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    color: 'rgba(255,255,255,0.5)',
  },

  // Concierge CTA
  conciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    marginBottom: SPACING.md,
  },
  conciergeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
    color: COLORS.accent,
  },

  // Trust
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: 'rgba(255,255,255,0.4)',
  },

  // How it works
  howSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  howTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
    marginBottom: SPACING.md,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  howStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  howStepNum: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT.numExtraBold,
  },
  howText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    flex: 1,
    lineHeight: 20,
  },
})
