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
import api from '../lib/api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ── Animated accent line ─────────────────────────────────────────────
function GlowLine() {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start()
  }, [])
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  })
  return (
    <View style={styles.glowLineWrap}>
      <Animated.View style={[styles.glowLine, { transform: [{ translateX }] }]} />
    </View>
  )
}

// ── Pulsing icon ring ────────────────────────────────────────────────
function PulseRing({ color }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start()
  }, [])
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] })
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] })
  return (
    <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity, borderColor: color }]} />
  )
}

// ── Form data ────────────────────────────────────────────────────────

const FACILITY_TYPES = [
  { key: 'gym', label: 'Gym', icon: 'trending-up' },
  { key: 'fitness_centre', label: 'Fitness Centre', icon: 'activity' },
  { key: 'boxing', label: 'Boxing', icon: 'zap' },
  { key: 'mma', label: 'MMA', icon: 'shield' },
  { key: 'yoga', label: 'Yoga Studio', icon: 'sun' },
  { key: 'crossfit', label: 'CrossFit', icon: 'repeat' },
  { key: 'swimming', label: 'Swimming', icon: 'droplet' },
  { key: 'sports', label: 'Sports Academy', icon: 'award' },
  { key: 'dance', label: 'Dance / Zumba', icon: 'music' },
  { key: 'pilates', label: 'Pilates', icon: 'wind' },
  { key: 'calisthenics', label: 'Calisthenics', icon: 'maximize' },
  { key: 'martial_arts', label: 'Martial Arts', icon: 'target' },
]

const FITNESS_GOALS = [
  { key: 'weight_loss', label: 'Weight Loss', icon: 'trending-down' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: 'trending-up' },
  { key: 'flexibility', label: 'Flexibility', icon: 'wind' },
  { key: 'endurance', label: 'Endurance', icon: 'heart' },
  { key: 'stress_relief', label: 'Stress Relief', icon: 'coffee' },
  { key: 'competition', label: 'Competition Prep', icon: 'award' },
  { key: 'general_fitness', label: 'General Fitness', icon: 'activity' },
  { key: 'rehab', label: 'Rehab / Recovery', icon: 'plus-circle' },
]

const EXPERIENCE_LEVELS = [
  { key: 'beginner', label: 'Beginner', sub: 'New to fitness' },
  { key: 'intermediate', label: 'Intermediate', sub: '1-3 years' },
  { key: 'advanced', label: 'Advanced', sub: '3+ years' },
]

const PREFERRED_TIMINGS = [
  { key: 'early_morning', label: 'Early Morning', sub: '5-7 AM' },
  { key: 'morning', label: 'Morning', sub: '7-10 AM' },
  { key: 'afternoon', label: 'Afternoon', sub: '12-4 PM' },
  { key: 'evening', label: 'Evening', sub: '4-8 PM' },
  { key: 'late_night', label: 'Late Night', sub: '8-11 PM' },
]

const BUDGET_RANGES = [
  { key: 'budget', label: '< ₹2K/mo' },
  { key: 'moderate', label: '₹2K - 4K/mo' },
  { key: 'premium', label: '₹4K - 8K/mo' },
  { key: 'elite', label: '₹8K+/mo' },
]

const CITIES = ['Bengaluru', 'Hyderabad', 'Chennai', 'Mumbai']

// ── Reusable chip selector ───────────────────────────────────────────
function ChipGroup({ items, selected, onToggle, multi = true }) {
  return (
    <View style={styles.chipGrid}>
      {items.map(item => {
        const isSelected = multi ? selected.includes(item.key) : selected === item.key
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.chip, isSelected && styles.chipActive]}
            onPress={() => onToggle(item.key)}
            activeOpacity={0.7}
          >
            {item.icon && (
              <Feather
                name={item.icon}
                size={13}
                color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
              />
            )}
            <View style={item.sub ? { marginLeft: item.icon ? 0 : 0 } : undefined}>
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {item.label}
              </Text>
              {item.sub && (
                <Text style={[styles.chipSub, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                  {item.sub}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ── Section label ────────────────────────────────────────────────────
function FormSection({ number, title, required }) {
  return (
    <View style={styles.formSectionRow}>
      <View style={styles.formSectionNum}>
        <Text style={styles.formSectionNumText}>{number}</Text>
      </View>
      <Text style={styles.formSectionTitle}>{title}</Text>
      {required && <Text style={styles.formRequired}>*</Text>}
    </View>
  )
}

export default function MembershipActivationScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, card, isDark } = useTheme()
  const { connectGym, member } = useAuth()

  // Path A state
  const [inviteCode, setInviteCode] = useState('')
  const [linking, setLinking] = useState(false)

  // Path B — intake form state
  const [facilityTypes, setFacilityTypes] = useState([])
  const [fitnessGoals, setFitnessGoals] = useState([])
  const [experience, setExperience] = useState(null)
  const [timings, setTimings] = useState([])
  const [budget, setBudget] = useState(null)
  const [city, setCity] = useState(null)
  const [area, setArea] = useState('')
  const [name, setName] = useState(member?.name || '')
  const [phone, setPhone] = useState(member?.phone || '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Animations
  const heroFade = useRef(new Animated.Value(0)).current
  const heroSlide = useRef(new Animated.Value(30)).current
  const pathAFade = useRef(new Animated.Value(0)).current
  const pathASlide = useRef(new Animated.Value(40)).current
  const pathBFade = useRef(new Animated.Value(0)).current
  const pathBSlide = useRef(new Animated.Value(50)).current

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(heroFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, damping: 20, stiffness: 130, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pathAFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(pathASlide, { toValue: 0, damping: 20, stiffness: 130, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pathBFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(pathBSlide, { toValue: 0, damping: 20, stiffness: 130, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const toggleMulti = (list, setList) => (key) => {
    setList(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const handleLinkGym = async () => {
    const code = inviteCode.trim()
    if (!code) {
      Alert.alert('Enter Code', 'Please enter your gym activation code.')
      return
    }
    setLinking(true)
    try {
      await connectGym(code)
      Alert.alert('Welcome!', 'Your membership is now active. Check in anytime!', [
        { text: 'Let\'s Go', onPress: () => navigation.goBack() },
      ])
    } catch (err) {
      Alert.alert('Invalid Code', err.response?.data?.message || 'Could not activate this code. Please check with your gym owner.')
    } finally {
      setLinking(false)
    }
  }

  const handleSubmitForm = async () => {
    // Validate required fields
    if (facilityTypes.length === 0) {
      Alert.alert('Required', 'Please select at least one facility type you\'re looking for.')
      return
    }
    if (fitnessGoals.length === 0) {
      Alert.alert('Required', 'Please select at least one fitness goal.')
      return
    }
    if (!city) {
      Alert.alert('Required', 'Please select your city.')
      return
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name so we can reach you.')
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Required', 'Please enter a valid phone number.')
      return
    }

    setSubmitting(true)

    const payload = {
      facility_types: facilityTypes,
      fitness_goals: fitnessGoals,
      experience_level: experience,
      preferred_timings: timings,
      budget_range: budget,
      city,
      area: area.trim(),
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      source: 'discovery',
    }

    try {
      await api.post('/concierge/inquiries', {
        name: name.trim(),
        phone: phone.trim(),
        discipline: facilityTypes[0] || 'gym',
        inquiry_type: 'discovery',
        message: `Goals: ${fitnessGoals.join(', ')}. Experience: ${experience}. ${notes.trim()}`,
        source: 'app_discovery',
      })

      const facilityLabels = facilityTypes.map(k => FACILITY_TYPES.find(f => f.key === k)?.label).filter(Boolean)
      const goalLabels = fitnessGoals.map(k => FITNESS_GOALS.find(g => g.key === k)?.label).filter(Boolean)

      Alert.alert(
        'We\'re On It!',
        `Our concierge team will find the best ${facilityLabels.slice(0, 2).join(' & ')} options${area ? ` near ${area}` : ` in ${city}`} for ${goalLabels.slice(0, 2).join(' & ')}.\n\nExpect a call on ${phone} within 24 hours with personalized recommendations and exclusive deals.`,
        [{ text: 'Got it', onPress: () => navigation.goBack() }]
      )
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formProgress = [
    facilityTypes.length > 0,
    fitnessGoals.length > 0,
    experience !== null,
    timings.length > 0,
    budget !== null,
    city !== null,
    name.trim().length > 0,
    phone.trim().length >= 10,
  ].filter(Boolean).length
  const totalSteps = 8

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.bgTer }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          <View style={styles.heroIconWrap}>
            <PulseRing color={COLORS.accent} />
            <View style={styles.heroIcon}>
              <Feather name="maximize" size={26} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Activate Your Membership
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSec }]}>
            Join your facility or discover the perfect gym for your journey
          </Text>
        </Animated.View>

        {/* ─── PATH A: Gym Owner Path ──────────────────────────────── */}
        <Animated.View style={[
          styles.pathCard,
          card,
          { opacity: pathAFade, transform: [{ translateY: pathASlide }] },
        ]}>
          <GlowLine />

          <View style={styles.pathLabelRow}>
            <View style={[styles.pathLabelBadge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Text style={[styles.pathLabelText, { color: COLORS.accent }]}>A</Text>
            </View>
            <Text style={[styles.pathLabelTitle, { color: colors.textSec }]}>GYM OWNER PATH</Text>
          </View>

          <View style={styles.pathHeader}>
            <View style={[styles.pathIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Feather name="key" size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pathTitle, { color: colors.text }]}>Join Your Facility</Text>
              <Text style={[styles.pathDesc, { color: colors.textSec }]}>
                Enter the activation code from your gym owner
              </Text>
            </View>
          </View>

          <View style={[styles.inputRow, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgTer,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
          }]}>
            <Feather name="hash" size={16} color={colors.textTer} style={{ marginRight: SPACING.sm }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="GYM-XXXXXX"
              placeholderTextColor={colors.textTer}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleLinkGym}
            />
            {inviteCode.length > 0 && (
              <TouchableOpacity onPress={() => setInviteCode('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={16} color={colors.textTer} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, linking && { opacity: 0.6 }]}
            onPress={handleLinkGym}
            disabled={linking}
            activeOpacity={0.8}
          >
            {linking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Activate Membership</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, {
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
            }]}
            onPress={() => Alert.alert('Coming Soon', 'Gym credential login will be available shortly.')}
            activeOpacity={0.7}
          >
            <Feather name="log-in" size={16} color={colors.textSec} style={{ marginRight: 8 }} />
            <Text style={[styles.secondaryBtnText, { color: colors.textSec }]}>
              Login with Gym Credentials
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTer }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ─── PATH B: IVIRA Discovery — Full Intake Form ──────────── */}
        <Animated.View style={[
          styles.discoveryCard,
          { opacity: pathBFade, transform: [{ translateY: pathBSlide }] },
        ]}>
          <View style={styles.discoveryInner}>
            {/* Header */}
            <View style={styles.pathLabelRow}>
              <View style={[styles.pathLabelBadge, { backgroundColor: 'rgba(139,92,246,0.2)' }]}>
                <Text style={[styles.pathLabelText, { color: '#A78BFA' }]}>B</Text>
              </View>
              <Text style={[styles.pathLabelTitle, { color: 'rgba(255,255,255,0.5)' }]}>IVIRA DISCOVERY</Text>
            </View>

            <Text style={styles.discoveryHeadline}>Find a New Home</Text>
            <Text style={styles.discoverySub}>
              Tell us what you're looking for and our concierge team will match you with the perfect facility and exclusive deals
            </Text>

            {/* Progress indicator */}
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(formProgress / totalSteps) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{formProgress}/{totalSteps}</Text>
            </View>

            {/* ── 1. What type of facility? ────────────────────────── */}
            <FormSection number="1" title="What type of facility?" required />
            <ChipGroup
              items={FACILITY_TYPES}
              selected={facilityTypes}
              onToggle={toggleMulti(facilityTypes, setFacilityTypes)}
            />

            {/* ── 2. What are your fitness goals? ──────────────────── */}
            <FormSection number="2" title="What are your fitness goals?" required />
            <ChipGroup
              items={FITNESS_GOALS}
              selected={fitnessGoals}
              onToggle={toggleMulti(fitnessGoals, setFitnessGoals)}
            />

            {/* ── 3. Experience level ──────────────────────────────── */}
            <FormSection number="3" title="Your experience level" />
            <ChipGroup
              items={EXPERIENCE_LEVELS}
              selected={experience}
              onToggle={(key) => setExperience(prev => prev === key ? null : key)}
              multi={false}
            />

            {/* ── 4. Preferred workout times ───────────────────────── */}
            <FormSection number="4" title="Preferred workout times" />
            <ChipGroup
              items={PREFERRED_TIMINGS}
              selected={timings}
              onToggle={toggleMulti(timings, setTimings)}
            />

            {/* ── 5. Monthly budget ────────────────────────────────── */}
            <FormSection number="5" title="Monthly budget" />
            <ChipGroup
              items={BUDGET_RANGES}
              selected={budget}
              onToggle={(key) => setBudget(prev => prev === key ? null : key)}
              multi={false}
            />

            {/* ── 6. Location ──────────────────────────────────────── */}
            <FormSection number="6" title="Location" required />

            <Text style={styles.fieldLabel}>City</Text>
            <View style={styles.chipGrid}>
              {CITIES.map(c => {
                const isSelected = city === c
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setCity(prev => prev === c ? null : c)}
                    activeOpacity={0.7}
                  >
                    <Feather name="map-pin" size={13} color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.45)'} />
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={styles.fieldLabel}>Preferred Area (optional)</Text>
            <View style={styles.formInput}>
              <Feather name="navigation" size={14} color="rgba(255,255,255,0.35)" />
              <TextInput
                style={styles.formInputText}
                placeholder="e.g. Koramangala, HSR Layout..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={area}
                onChangeText={setArea}
                autoCorrect={false}
              />
            </View>

            {/* Divider */}
            <View style={styles.discoveryDivider} />

            {/* ── 7. Contact details ───────────────────────────────── */}
            <View style={styles.contactHeader}>
              <View style={styles.conciergeBadge}>
                <Feather name="phone" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.contactHeaderText}>CONTACT DETAILS</Text>
            </View>

            <Text style={styles.fieldLabel}>Your name *</Text>
            <View style={styles.formInput}>
              <Feather name="user" size={14} color="rgba(255,255,255,0.35)" />
              <TextInput
                style={styles.formInputText}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <Text style={styles.fieldLabel}>Phone number *</Text>
            <View style={styles.formInput}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={styles.formInputText}
                placeholder="9876543210"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <Text style={styles.fieldLabel}>Anything else? (optional)</Text>
            <View style={[styles.formInput, { minHeight: 70, alignItems: 'flex-start', paddingTop: 12 }]}>
              <Feather name="message-square" size={14} color="rgba(255,255,255,0.35)" style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.formInputText, { minHeight: 50, textAlignVertical: 'top' }]}
                placeholder="Specific requirements, injuries, preferences..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={notes}
                onChangeText={setNotes}
                multiline
                autoCorrect={false}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmitForm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <>
                  <Feather name="send" size={18} color={COLORS.accent} style={{ marginRight: 10 }} />
                  <Text style={styles.submitBtnText}>Submit & Get Matched</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Trust */}
            <View style={styles.trustRow}>
              <Feather name="shield" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={styles.trustText}>5,000+ partner gyms across India</Text>
            </View>
            <View style={[styles.trustRow, { marginTop: 4 }]}>
              <Feather name="clock" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={styles.trustText}>Expect a call within 24 hours</Text>
            </View>
          </View>
        </Animated.View>

        {/* How it works */}
        <View style={styles.howSection}>
          <Text style={[styles.howTitle, { color: colors.text }]}>How it works</Text>
          {[
            { step: '1', icon: 'edit-3', text: 'Fill out what you\'re looking for above' },
            { step: '2', icon: 'search', text: 'Our team finds the best matching facilities' },
            { step: '3', icon: 'phone-call', text: 'We call you with curated options & deals' },
            { step: '4', icon: 'check-circle', text: 'Pick your gym and start training' },
          ].map((item, i) => (
            <View key={i} style={[styles.howRow, { borderColor: colors.border }]}>
              <View style={[styles.howStep, { backgroundColor: isDark ? colors.bgTer : colors.bgTer }]}>
                <Text style={[styles.howStepNum, { color: COLORS.accent }]}>{item.step}</Text>
              </View>
              <Feather name={item.icon} size={15} color={colors.textSec} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.howText, { color: colors.textSec }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  heroIconWrap: {
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
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    fontSize: 24,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: FONT.regular,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // Path card
  pathCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  glowLineWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  glowLine: {
    width: 80,
    height: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 1,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // Path labels
  pathLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  pathLabelBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathLabelText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: FONT.extraBold,
  },
  pathLabelTitle: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    letterSpacing: 2,
  },

  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pathIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  pathDesc: {
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
    height: 50,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.medium,
    letterSpacing: 2,
    height: '100%',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: SPACING.sm,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT.bold,
  },
  secondaryBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl * 2,
    marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT.bold,
    marginHorizontal: SPACING.md,
    letterSpacing: 1.5,
  },

  // Discovery card
  discoveryCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  discoveryInner: {
    backgroundColor: '#0A1628',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  discoveryHeadline: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  discoverySub: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },

  // Progress bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.xl,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT.numBold,
    color: 'rgba(255,255,255,0.4)',
  },

  // Form section headers
  formSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  formSectionNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSectionNumText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: FONT.numExtraBold,
    color: COLORS.accent,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT.bold,
    color: '#FFFFFF',
    flex: 1,
  },
  formRequired: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    color: 'rgba(255,255,255,0.45)',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipSub: {
    fontSize: 10,
    fontFamily: FONT.regular,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 1,
  },

  // Field label
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },

  // Form text inputs
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    minHeight: 46,
    marginBottom: SPACING.xs,
  },
  formInputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: '#FFFFFF',
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    color: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },

  // Discovery divider
  discoveryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: SPACING.lg,
  },

  // Contact header
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  conciergeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    color: COLORS.accent,
    letterSpacing: 1.5,
  },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 16,
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
    color: 'rgba(255,255,255,0.35)',
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
  howStep: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  howStepNum: {
    fontSize: 12,
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
