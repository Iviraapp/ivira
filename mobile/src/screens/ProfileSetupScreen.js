import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from '../components/PremiumAlert'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { setItem } from '../lib/storage'
import api from '../lib/api'

const PROFILE_SETUP_KEY = 'ivira_profile_setup_done'
const { width: SCREEN_W } = Dimensions.get('window')

const GOALS = [
  { key: 'Weight Loss', icon: 'trending-down', desc: 'Burn fat & slim down' },
  { key: 'Muscle Gain', icon: 'zap', desc: 'Build strength & size' },
  { key: 'General Fitness', icon: 'heart', desc: 'Stay healthy & active' },
  { key: 'Endurance', icon: 'wind', desc: 'Boost stamina & cardio' },
  { key: 'Flexibility', icon: 'move', desc: 'Improve mobility & balance' },
]

const GENDERS = [
  { key: 'male', label: 'Male', icon: 'user' },
  { key: 'female', label: 'Female', icon: 'user' },
  { key: 'other', label: 'Other', icon: 'users' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TOTAL_STEPS = 4

export { PROFILE_SETUP_KEY }

// ── Progress bar ──────────────────────────────────────────────────
function ProgressBar({ step, total, colors }) {
  const progress = useRef(new Animated.Value(step / total)).current
  useEffect(() => {
    Animated.spring(progress, {
      toValue: step / total,
      damping: 20,
      stiffness: 150,
      useNativeDriver: false,
    }).start()
  }, [step])

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.bgTer || 'rgba(255,255,255,0.08)' }]}>
      <Animated.View style={[styles.progressFill, { width, backgroundColor: COLORS.accent }]} />
    </View>
  )
}

// ── Step 1: Name & Gender ─────────────────────────────────────────
function StepBasics({ name, setName, gender, setGender, colors }) {
  return (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconCircle, { backgroundColor: colors.accentSoft }]}>
        <Feather name="user" size={28} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What should we call you?</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        Your name helps personalize your experience
      </Text>

      <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        <Feather name="user" size={16} color={colors.textTer} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Your name"
          placeholderTextColor={colors.textTer}
          value={name}
          onChangeText={(text) => setName(text.replace(/[^a-zA-Z\s]/g, ''))}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
        />
      </View>

      <Text style={[styles.fieldLabel, { color: colors.textSec, marginTop: SPACING.xl }]}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => {
          const selected = gender === g.key
          return (
            <TouchableOpacity
              key={g.key}
              style={[
                styles.genderCard,
                {
                  backgroundColor: selected ? COLORS.accent : colors.bgSec,
                  borderColor: selected ? COLORS.accent : colors.border,
                },
              ]}
              onPress={() => setGender(selected ? '' : g.key)}
              activeOpacity={0.7}
            >
              <Feather
                name={g.icon}
                size={20}
                color={selected ? '#FFFFFF' : colors.textSec}
              />
              <Text style={[styles.genderLabel, { color: selected ? '#FFFFFF' : colors.textSec }]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ── Step 2: Fitness Goal ──────────────────────────────────────────
function StepGoal({ fitnessGoal, setFitnessGoal, colors }) {
  return (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconCircle, { backgroundColor: colors.accentSoft }]}>
        <Feather name="target" size={28} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What's your goal?</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        We'll tailor your experience to help you get there
      </Text>

      <View style={styles.goalsList}>
        {GOALS.map((goal) => {
          const selected = fitnessGoal === goal.key
          return (
            <TouchableOpacity
              key={goal.key}
              style={[
                styles.goalCard,
                {
                  backgroundColor: selected ? `${COLORS.accent}18` : colors.bgSec,
                  borderColor: selected ? COLORS.accent : colors.border,
                },
              ]}
              onPress={() => setFitnessGoal(selected ? '' : goal.key)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.goalIconWrap,
                { backgroundColor: selected ? COLORS.accent : colors.bgTer || 'rgba(255,255,255,0.06)' },
              ]}>
                <Feather name={goal.icon} size={18} color={selected ? '#FFFFFF' : colors.textSec} />
              </View>
              <View style={styles.goalTextCol}>
                <Text style={[styles.goalTitle, { color: selected ? COLORS.accent : colors.text }]}>
                  {goal.key}
                </Text>
                <Text style={[styles.goalDesc, { color: colors.textTer }]}>{goal.desc}</Text>
              </View>
              {selected && (
                <Feather name="check-circle" size={20} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ── Step 3: Body Stats ────────────────────────────────────────────
function StepBody({ weight, setWeight, weightUnit, setWeightUnit, height, setHeight, colors }) {
  return (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconCircle, { backgroundColor: colors.accentSoft }]}>
        <Feather name="activity" size={28} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Your body stats</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        Used for calorie estimates and progress tracking
      </Text>

      {/* Weight with unit toggle */}
      <Text style={[styles.fieldLabel, { color: colors.textSec }]}>Weight</Text>
      <View style={styles.weightRow}>
        <View style={[styles.inputWrap, styles.weightInput, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <Feather name="trending-down" size={16} color={colors.textTer} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={weightUnit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
            placeholderTextColor={colors.textTer}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.unitToggle, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.unitBtn, weightUnit === 'kg' && styles.unitBtnActive]}
            onPress={() => setWeightUnit('kg')}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitBtnText, weightUnit === 'kg' && styles.unitBtnTextActive]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitBtn, weightUnit === 'lbs' && styles.unitBtnActive]}
            onPress={() => setWeightUnit('lbs')}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitBtnText, weightUnit === 'lbs' && styles.unitBtnTextActive]}>lbs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Height */}
      <Text style={[styles.fieldLabel, { color: colors.textSec, marginTop: SPACING.lg }]}>Height (cm)</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        <Feather name="maximize-2" size={16} color={colors.textTer} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="e.g. 175"
          placeholderTextColor={colors.textTer}
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  )
}

// ── Step 4: Date of Birth ─────────────────────────────────────────
function StepDob({ dobDay, setDobDay, dobMonth, setDobMonth, dobYear, setDobYear, colors }) {
  return (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconCircle, { backgroundColor: colors.accentSoft }]}>
        <Feather name="calendar" size={28} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Date of birth</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        Optional — helps with age-appropriate recommendations
      </Text>

      <View style={styles.dobRow}>
        {/* Day */}
        <View style={styles.dobCol}>
          <Text style={[styles.dobLabel, { color: colors.textTer }]}>Day</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, styles.dobInput, { color: colors.text }]}
              placeholder="DD"
              placeholderTextColor={colors.textTer}
              value={dobDay}
              onChangeText={(t) => {
                const cleaned = t.replace(/\D/g, '').slice(0, 2)
                setDobDay(cleaned)
              }}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
        </View>

        {/* Month */}
        <View style={[styles.dobCol, { flex: 1.5 }]}>
          <Text style={[styles.dobLabel, { color: colors.textTer }]}>Month</Text>
          <View style={styles.monthChipsWrap}>
            <View style={styles.monthChipsRow}>
              {MONTHS.map((m, i) => {
                const selected = dobMonth === String(i + 1)
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.monthChip,
                      {
                        backgroundColor: selected ? COLORS.accent : colors.bgSec,
                        borderColor: selected ? COLORS.accent : colors.border,
                      },
                    ]}
                    onPress={() => setDobMonth(selected ? '' : String(i + 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthChipText, { color: selected ? '#FFFFFF' : colors.textSec }]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        {/* Year */}
        <View style={styles.dobCol}>
          <Text style={[styles.dobLabel, { color: colors.textTer }]}>Year</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, styles.dobInput, { color: colors.text }]}
              placeholder="YYYY"
              placeholderTextColor={colors.textTer}
              value={dobYear}
              onChangeText={(t) => {
                const cleaned = t.replace(/\D/g, '').slice(0, 4)
                setDobYear(cleaned)
              }}
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ProfileSetupScreen({ onComplete }) {
  const { colors } = useTheme()
  const { member, refreshProfile } = useAuth()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  // Form state
  const [name, setName] = useState(member?.name || member?.first_name || '')
  const [gender, setGender] = useState(member?.gender || '')
  const [fitnessGoal, setFitnessGoal] = useState('')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [height, setHeight] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')

  const animateTransition = (nextStep) => {
    const direction = nextStep > step ? 1 : -1
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -direction * 40, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep)
      slideAnim.setValue(direction * 40)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start()
    })
  }

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      premiumAlert('Name required', 'Please enter your name to continue.')
      return
    }
    if (step < TOTAL_STEPS) {
      animateTransition(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) animateTransition(step - 1)
  }

  const buildDob = () => {
    if (!dobYear || !dobMonth || !dobDay) return null
    const y = dobYear.padStart(4, '0')
    const m = dobMonth.padStart(2, '0')
    const d = dobDay.padStart(2, '0')
    // Basic validation
    const date = new Date(`${y}-${m}-${d}`)
    if (isNaN(date.getTime())) return null
    if (date > new Date()) return null
    return `${y}-${m}-${d}`
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {}
      if (name.trim()) payload.name = name.trim()
      if (gender) payload.gender = gender
      if (fitnessGoal) payload.fitness_goal = fitnessGoal
      if (weight) payload.weight = parseFloat(weight)
      if (weightUnit) payload.weight_unit = weightUnit
      if (height) payload.height = parseFloat(height)
      const dob = buildDob()
      if (dob) payload.date_of_birth = dob

      const res = await api.patch('/auth/b2c/profile', payload)

      // Update member data from response if available
      if (res.data?.member) {
        // refreshProfile will pick it up
      }

      await setItem(PROFILE_SETUP_KEY, 'true')
      try { await refreshProfile() } catch {}
      onComplete()
    } catch (err) {
      // API failed — save locally and proceed anyway so user isn't stuck
      console.warn('[ProfileSetup] API save failed:', err?.response?.data?.error || err?.message)
      await setItem(PROFILE_SETUP_KEY, 'true')
      try { await refreshProfile() } catch {}
      onComplete()
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    await setItem(PROFILE_SETUP_KEY, 'true')
    onComplete()
  }

  const isLastStep = step === TOTAL_STEPS
  const btnLabel = isLastStep ? 'Finish' : 'Continue'

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <Text style={[styles.stepIndicator, { color: colors.textTer }]}>
          {step} of {TOTAL_STEPS}
        </Text>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipTouchable}>
          <Text style={[styles.skipText, { color: colors.textTer }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <ProgressBar step={step} total={TOTAL_STEPS} colors={colors} />
      </View>

      {/* Step content */}
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <StepBasics
            name={name} setName={setName}
            gender={gender} setGender={setGender}
            colors={colors}
          />
        )}
        {step === 2 && (
          <StepGoal
            fitnessGoal={fitnessGoal} setFitnessGoal={setFitnessGoal}
            colors={colors}
          />
        )}
        {step === 3 && (
          <StepBody
            weight={weight} setWeight={setWeight}
            weightUnit={weightUnit} setWeightUnit={setWeightUnit}
            height={height} setHeight={setHeight}
            colors={colors}
          />
        )}
        {step === 4 && (
          <StepDob
            dobDay={dobDay} setDobDay={setDobDay}
            dobMonth={dobMonth} setDobMonth={setDobMonth}
            dobYear={dobYear} setDobYear={setDobYear}
            colors={colors}
          />
        )}
      </Animated.ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>{btnLabel}</Text>
              <Feather name={isLastStep ? 'check' : 'arrow-right'} size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },
  skipTouchable: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  skipText: {
    fontSize: 14,
    fontFamily: FONT.medium,
  },

  // Progress
  progressWrap: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: SPACING.lg + 8,
    paddingTop: SPACING.lg,
  },

  // Step shared
  stepContent: {
    flex: 1,
  },
  stepIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  stepTitle: {
    fontSize: 26,
    fontFamily: FONT.bold,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  stepDesc: {
    fontSize: 15,
    fontFamily: FONT.regular,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },

  // Inputs
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md + 2,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: 15,
  },

  // Gender
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    gap: SPACING.sm,
  },
  genderLabel: {
    fontSize: 14,
    fontFamily: FONT.semibold,
  },

  // Goals
  goalsList: {
    gap: SPACING.sm,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    gap: SPACING.md,
  },
  goalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextCol: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginBottom: 2,
  },
  goalDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // Weight
  weightRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  weightInput: {
    flex: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: RADIUS.md + 2,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: COLORS.accent,
  },
  unitBtnText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: 'rgba(255,255,255,0.4)',
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
  },

  // DOB
  dobRow: {
    gap: SPACING.md,
  },
  dobCol: {
    flex: 1,
  },
  dobLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dobInput: {
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  monthChipsWrap: {
    marginTop: SPACING.xs,
  },
  monthChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  monthChipText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg + 8,
    paddingTop: SPACING.md,
  },

  // CTA
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    width: '100%',
    minHeight: 56,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT.bold,
  },
})
