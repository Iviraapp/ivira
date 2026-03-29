import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from './PremiumAlert'
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import {
  calculateMacros,
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
  calculateWaterIntake,
} from '../lib/healthCalculator'
import { getItem, setItem } from '../lib/storage'

const STORAGE_KEY = 'ivira_nutrition_profile'

/**
 * NutritionGoalSetup — Multi-step modal for setting fitness goal & calculating macros.
 *
 * Steps: 1. Body stats (age, gender) → 2. Activity level → 3. Goal → 4. Results
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - onSave: (macros) => void — called with the calculated macro plan
 * - memberWeight: number (kg, from profile)
 * - memberHeight: number (cm, from profile)
 */
export default function NutritionGoalSetup({ visible, onClose, onSave, memberWeight, memberHeight }) {
  const { colors, card, isDark } = useTheme()
  const [step, setStep] = useState(1)

  // Step 1: Body info
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('male')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')

  // Step 2: Activity
  const [activityLevel, setActivityLevel] = useState('moderate')

  // Step 3: Goal
  const [goalKey, setGoalKey] = useState('maintenance')

  // Pre-fill from member data
  useEffect(() => {
    if (visible) {
      if (memberWeight) setWeight(String(Math.round(memberWeight)))
      if (memberHeight) setHeight(String(Math.round(memberHeight)))

      // Restore previous settings
      getItem(STORAGE_KEY).then(stored => {
        if (stored) {
          try {
            const data = JSON.parse(stored)
            if (data.age) setAge(String(data.age))
            if (data.gender) setGender(data.gender)
            if (data.activityLevel) setActivityLevel(data.activityLevel)
            if (data.goalKey) setGoalKey(data.goalKey)
            if (data.weight && !memberWeight) setWeight(String(data.weight))
            if (data.height && !memberHeight) setHeight(String(data.height))
          } catch {}
        }
      }).catch(() => {})

      setStep(1)
    }
  }, [visible, memberWeight, memberHeight])

  const macros = useMemo(() => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age, 10)
    if (!w || !h || !a) return null
    return calculateMacros({
      weightKg: w,
      heightCm: h,
      ageYears: a,
      gender,
      activityLevel,
      goalKey,
    })
  }, [weight, height, age, gender, activityLevel, goalKey])

  const waterMl = useMemo(() => {
    const w = parseFloat(weight)
    return calculateWaterIntake(w, activityLevel)
  }, [weight, activityLevel])

  const handleNext = () => {
    if (step === 1) {
      if (!age || !weight || !height) {
        premiumAlert('Missing Info', 'Please fill in your age, weight, and height.')
        return
      }
      if (parseInt(age, 10) < 13 || parseInt(age, 10) > 100) {
        premiumAlert('Invalid Age', 'Please enter an age between 13 and 100.')
        return
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setStep(s => Math.min(s + 1, 4))
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setStep(s => Math.max(s - 1, 1))
  }

  const handleSave = async () => {
    if (!macros) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Persist profile
    const profile = {
      age: parseInt(age, 10),
      gender,
      weight: parseFloat(weight),
      height: parseFloat(height),
      activityLevel,
      goalKey,
    }
    await setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {})

    onSave?.({
      calorie_goal: macros.calories,
      protein_goal: macros.protein,
      carb_goal: macros.carbs,
      fat_goal: macros.fat,
      water_ml: waterMl,
      goal_type: goalKey,
      bmr: macros.bmr,
      tdee: macros.tdee,
    })
    onClose()
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(s => (
        <View
          key={s}
          style={[
            styles.stepDot,
            { backgroundColor: s <= step ? COLORS.accent : colors.border },
            s === step && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  )

  // --- Step 1: Body Stats ---
  const renderBodyStats = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconWrap, { backgroundColor: colors.bgTer }]}>
        <Feather name="user" size={24} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>About You</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        We'll use this to calculate your daily requirements
      </Text>

      {/* Gender toggle */}
      <View style={styles.genderRow}>
        {['male', 'female'].map(g => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderBtn,
              { backgroundColor: colors.bgTer, borderColor: colors.border },
              gender === g && styles.genderBtnActive,
            ]}
            onPress={() => { setGender(g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
            activeOpacity={0.7}
          >
            <Feather
              name={g === 'male' ? 'user' : 'user'}
              size={16}
              color={gender === g ? '#FFF' : colors.textSec}
            />
            <Text style={[
              styles.genderLabel,
              { color: gender === g ? '#FFF' : colors.textSec },
            ]}>
              {g === 'male' ? 'Male' : 'Female'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inputs */}
      <View style={styles.inputRow}>
        <View style={styles.inputField}>
          <Text style={[styles.inputLabel, { color: colors.textSec }]}>AGE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="25"
            placeholderTextColor={colors.textTer}
            maxLength={3}
          />
          <Text style={[styles.inputUnit, { color: colors.textTer }]}>years</Text>
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputField}>
          <Text style={[styles.inputLabel, { color: colors.textSec }]}>WEIGHT</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="70"
            placeholderTextColor={colors.textTer}
            maxLength={5}
          />
          <Text style={[styles.inputUnit, { color: colors.textTer }]}>kg</Text>
        </View>
        <View style={styles.inputField}>
          <Text style={[styles.inputLabel, { color: colors.textSec }]}>HEIGHT</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholder="170"
            placeholderTextColor={colors.textTer}
            maxLength={5}
          />
          <Text style={[styles.inputUnit, { color: colors.textTer }]}>cm</Text>
        </View>
      </View>
    </View>
  )

  // --- Step 2: Activity Level ---
  const renderActivity = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconWrap, { backgroundColor: colors.bgTer }]}>
        <Feather name="activity" size={24} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Activity Level</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        How active are you on a typical week?
      </Text>

      {ACTIVITY_LEVELS.map(level => (
        <TouchableOpacity
          key={level.key}
          style={[
            styles.optionCard,
            { backgroundColor: colors.bgTer, borderColor: colors.border },
            activityLevel === level.key && styles.optionCardActive,
          ]}
          onPress={() => {
            setActivityLevel(level.key)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>{level.label}</Text>
            <Text style={[styles.optionDesc, { color: colors.textSec }]}>{level.desc}</Text>
          </View>
          <View style={[
            styles.radioOuter,
            { borderColor: activityLevel === level.key ? COLORS.accent : colors.border },
          ]}>
            {activityLevel === level.key && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )

  // --- Step 3: Fitness Goal ---
  const renderGoal = () => (
    <View style={styles.stepContent}>
      <View style={[styles.stepIconWrap, { backgroundColor: colors.bgTer }]}>
        <Feather name="target" size={24} color={COLORS.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Your Goal</Text>
      <Text style={[styles.stepDesc, { color: colors.textSec }]}>
        What are you training for?
      </Text>

      {FITNESS_GOALS.map(g => (
        <TouchableOpacity
          key={g.key}
          style={[
            styles.goalCard,
            { backgroundColor: colors.bgTer, borderColor: colors.border },
            goalKey === g.key && { borderColor: g.color, borderWidth: 2 },
          ]}
          onPress={() => {
            setGoalKey(g.key)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.goalIconWrap, { backgroundColor: g.color + '18' }]}>
            <Feather name={g.icon} size={18} color={g.color} />
          </View>
          <View style={styles.goalTextWrap}>
            <Text style={[styles.goalLabel, { color: colors.text }]}>{g.label}</Text>
            <Text style={[styles.goalDesc, { color: colors.textSec }]}>{g.desc}</Text>
          </View>
          {goalKey === g.key && (
            <Feather name="check-circle" size={20} color={g.color} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )

  // --- Step 4: Results ---
  const renderResults = () => {
    if (!macros) return null
    const goal = FITNESS_GOALS.find(g => g.key === goalKey)

    return (
      <View style={styles.stepContent}>
        <View style={[styles.stepIconWrap, { backgroundColor: (goal?.color || COLORS.accent) + '18' }]}>
          <Feather name="check" size={24} color={goal?.color || COLORS.accent} />
        </View>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Your Daily Plan</Text>
        <Text style={[styles.stepDesc, { color: colors.textSec }]}>
          Based on your stats and {goal?.label?.toLowerCase()} goal
        </Text>

        {/* Calorie card */}
        <View style={[styles.calorieCard, card]}>
          <Text style={[styles.calorieValue, { color: colors.text }]}>{macros.calories}</Text>
          <Text style={[styles.calorieUnit, { color: colors.textSec }]}>kcal / day</Text>
          <View style={styles.calorieBreakdown}>
            <View style={styles.calorieBreakdownItem}>
              <Text style={[styles.breakdownLabel, { color: colors.textTer }]}>BMR</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{macros.bmr}</Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.calorieBreakdownItem}>
              <Text style={[styles.breakdownLabel, { color: colors.textTer }]}>TDEE</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{macros.tdee}</Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.calorieBreakdownItem}>
              <Text style={[styles.breakdownLabel, { color: colors.textTer }]}>
                {macros.deficit > 0 ? 'DEFICIT' : macros.surplus > 0 ? 'SURPLUS' : 'ADJ'}
              </Text>
              <Text style={[styles.breakdownValue, {
                color: macros.deficit > 0 ? COLORS.red : macros.surplus > 0 ? COLORS.green : colors.textSec,
              }]}>
                {macros.deficit > 0 ? `-${macros.deficit}` : macros.surplus > 0 ? `+${macros.surplus}` : '0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Macro bars */}
        <View style={styles.macroGrid}>
          {[
            { label: 'Protein', grams: macros.protein, pct: macros.proteinPct, color: '#3B82F6' },
            { label: 'Carbs', grams: macros.carbs, pct: macros.carbsPct, color: '#F59E0B' },
            { label: 'Fat', grams: macros.fat, pct: macros.fatPct, color: '#EA4335' },
          ].map(m => (
            <View key={m.label} style={[styles.macroCard, { backgroundColor: colors.bgTer }]}>
              <View style={[styles.macroColorDot, { backgroundColor: m.color }]} />
              <Text style={[styles.macroGrams, { color: colors.text }]}>{m.grams}g</Text>
              <Text style={[styles.macroLabel, { color: colors.textSec }]}>{m.label}</Text>
              <Text style={[styles.macroPct, { color: m.color }]}>{m.pct}%</Text>
            </View>
          ))}
        </View>

        {/* Water */}
        <View style={[styles.waterRow, { backgroundColor: colors.bgTer }]}>
          <Feather name="droplet" size={16} color="#3B82F6" />
          <Text style={[styles.waterLabel, { color: colors.text }]}>
            Water: {(waterMl / 1000).toFixed(1)}L / day
          </Text>
        </View>
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            {step > 1 ? (
              <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="arrow-left" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
            {renderStepIndicator()}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="x" size={22} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && renderBodyStats()}
            {step === 2 && renderActivity()}
            {step === 3 && renderGoal()}
            {step === 4 && renderResults()}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {step < 4 ? (
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.text }]} onPress={handleNext} activeOpacity={0.85}>
                <Text style={[styles.nextBtnText, { color: colors.bg }]}>Continue</Text>
                <Feather name="arrow-right" size={18} color={colors.bg} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Feather name="check" size={18} color="#FFF" />
                <Text style={styles.saveBtnText}>Apply This Plan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '92%',
    minHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    width: 24,
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: FONT.bold,
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: FONT.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },

  // Gender
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  genderBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  genderLabel: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    marginBottom: SPACING.md,
  },
  inputField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  input: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    borderWidth: 1,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 11,
    fontFamily: FONT.medium,
    textAlign: 'center',
    marginTop: 4,
  },

  // Activity & Option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  optionCardActive: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  optionLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
  },

  // Goal cards
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
    width: '100%',
    gap: SPACING.md,
  },
  goalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextWrap: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginBottom: 2,
  },
  goalDesc: {
    fontSize: 12,
    fontFamily: FONT.regular,
  },

  // Results
  calorieCard: {
    width: '100%',
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  calorieValue: {
    fontSize: 48,
    fontFamily: FONT.numExtraBold,
    fontVariant: ['tabular-nums'],
  },
  calorieUnit: {
    fontSize: 14,
    fontFamily: FONT.medium,
    marginBottom: SPACING.md,
  },
  calorieBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  calorieBreakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 10,
    fontFamily: FONT.semibold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: 16,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  breakdownDivider: {
    width: 1,
    height: 28,
  },

  // Macro grid
  macroGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.md,
  },
  macroCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  macroColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  macroGrams: {
    fontSize: 20,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  macroLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    marginBottom: 2,
  },
  macroPct: {
    fontSize: 12,
    fontFamily: FONT.numSemibold,
  },

  // Water
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  waterLabel: {
    fontSize: 14,
    fontFamily: FONT.medium,
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: FONT.bold,
  },
})
