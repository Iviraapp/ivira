import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import {
  COLORS,
  FONT,
  SPACING,
  RADIUS,
  ELITE_CARD,
  ELITE_CARD_LIGHT,
  TYPE,
  FEATURE,
} from '../lib/theme'

// ---------------------------------------------------------------------------
// Formulas (all client-side, zero external deps)
// ---------------------------------------------------------------------------

function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return 0
  const hM = heightCm / 100
  return Math.round((weightKg / (hM * hM)) * 10) / 10
}

function getBMIBadge(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' }
  if (bmi < 25) return { label: 'Normal', color: '#22C55E' }
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' }
  return { label: 'Obese', color: '#EF4444' }
}

function calcBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return 0
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

function calcTDEE(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55))
}

// Macro split ratios by goal  { protein%, carbs%, fat% }
const MACRO_SPLITS = {
  maintain: { p: 0.3, c: 0.4, f: 0.3 },
  cut: { p: 0.4, c: 0.3, f: 0.3 },
  bulk: { p: 0.3, c: 0.45, f: 0.25 },
}

function calcMacros(tdee, goal) {
  const split = MACRO_SPLITS[goal] || MACRO_SPLITS.maintain
  const offset = goal === 'cut' ? -500 : goal === 'bulk' ? 300 : 0
  const cals = Math.max(1200, tdee + offset)

  const proteinG = Math.round((cals * split.p) / 4)
  const carbsG = Math.round((cals * split.c) / 4)
  const fatG = Math.round((cals * split.f) / 9)

  return {
    calories: cals,
    protein: { grams: proteinG, kcal: proteinG * 4, pct: Math.round(split.p * 100) },
    carbs: { grams: carbsG, kcal: carbsG * 4, pct: Math.round(split.c * 100) },
    fat: { grams: fatG, kcal: fatG * 9, pct: Math.round(split.f * 100) },
  }
}

function calcWater(weightKg, activityLevel) {
  const base = weightKg * 0.033
  const extra = activityLevel === 'active' || activityLevel === 'very_active' ? 0.5 : 0
  return Math.round((base + extra) * 10) / 10
}

// Devine formula +/- 10 %
function calcIdealWeight(heightCm, gender) {
  const inches = heightCm / 2.54
  const base = gender === 'female'
    ? 45.5 + 2.3 * (inches - 60)
    : 50 + 2.3 * (inches - 60)
  const ideal = Math.max(base, 40) // floor for very short heights
  return {
    low: Math.round(ideal * 0.9 * 10) / 10,
    high: Math.round(ideal * 1.1 * 10) / 10,
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricPill({ label, value, unit, badge, badgeColor, colors }) {
  return (
    <View style={[s.pill, { backgroundColor: colors.bgTer }]}>
      <Text style={[TYPE.overline, { color: colors.textSec, marginBottom: 4 }]}>{label}</Text>
      <View style={s.pillValueRow}>
        <Text style={[s.pillValue, { color: colors.text }]}>{value}</Text>
        {unit ? <Text style={[s.pillUnit, { color: colors.textSec }]}>{unit}</Text> : null}
      </View>
      {badge ? (
        <View style={[s.badge, { backgroundColor: badgeColor + '22' }]}>
          <Text style={[s.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

function MacroBar({ label, grams, kcal, pct, color, colors }) {
  return (
    <View style={s.macroRow}>
      <View style={s.macroLabelCol}>
        <View style={[s.macroDot, { backgroundColor: color }]} />
        <Text style={[s.macroLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={s.macroBarTrack}>
        <View style={[s.macroBarBg, { backgroundColor: colors.bgTer }]} />
        <View style={[s.macroBarFill, { backgroundColor: color, width: `${Math.min(pct, 100)}%` }]} />
      </View>
      <View style={s.macroValues}>
        <Text style={[s.macroGrams, { color: colors.text }]}>{grams}g</Text>
        <Text style={[s.macroKcal, { color: colors.textSec }]}>{kcal} kcal</Text>
      </View>
    </View>
  )
}

function TargetRow({ icon, iconColor, label, value, sub, colors }) {
  return (
    <View style={s.targetRow}>
      <View style={[s.targetIcon, { backgroundColor: iconColor + '18' }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={s.targetTextCol}>
        <Text style={[s.targetLabel, { color: colors.textSec }]}>{label}</Text>
        <Text style={[s.targetValue, { color: colors.text }]}>{value}</Text>
        {sub ? <Text style={[s.targetSub, { color: colors.textTer }]}>{sub}</Text> : null}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BodyStatsCard({
  weightKg,
  heightCm,
  age,
  gender = 'male',
  activityLevel = 'moderate',
  goal = 'maintain',
  onEditPress,
}) {
  const { colors, isDark, card } = useTheme()

  const stats = useMemo(() => {
    if (!weightKg || !heightCm || !age) return null

    const bmi = calcBMI(weightKg, heightCm)
    const bmiInfo = getBMIBadge(bmi)
    const bmr = calcBMR(weightKg, heightCm, age, gender)
    const tdee = calcTDEE(bmr, activityLevel)
    const macros = calcMacros(tdee, goal)
    const water = calcWater(weightKg, activityLevel)
    const ideal = calcIdealWeight(heightCm, gender)

    return { bmi, bmiInfo, bmr, tdee, macros, water, ideal }
  }, [weightKg, heightCm, age, gender, activityLevel, goal])

  if (!stats) {
    return (
      <View style={[s.card, card, { borderTopWidth: 3, borderTopColor: COLORS.accent }]}>
        <View style={s.emptyState}>
          <Feather name="user" size={28} color={colors.textTer} />
          <Text style={[s.emptyText, { color: colors.textSec }]}>
            Complete your profile to see body stats
          </Text>
          {onEditPress ? (
            <TouchableOpacity style={s.emptyBtn} onPress={onEditPress} activeOpacity={0.7}>
              <Text style={s.emptyBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    )
  }

  const { bmi, bmiInfo, bmr, tdee, macros, water, ideal } = stats
  const goalLabel = goal === 'cut' ? 'Cut' : goal === 'bulk' ? 'Bulk' : 'Maintain'

  return (
    <View style={[s.card, card, { borderTopWidth: 3, borderTopColor: COLORS.accent }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[TYPE.h3, { color: colors.text }]}>Body Stats</Text>
        {onEditPress ? (
          <TouchableOpacity
            onPress={onEditPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <View style={[s.editBtn, { backgroundColor: colors.bgTer }]}>
              <Feather name="edit-2" size={14} color={colors.textSec} />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Section 1: Key Metrics */}
      <Text style={[TYPE.overline, s.sectionHeader, { color: colors.textSec }]}>KEY METRICS</Text>
      <View style={s.pillRow}>
        <MetricPill
          label="BMI"
          value={bmi}
          badge={bmiInfo.label}
          badgeColor={bmiInfo.color}
          colors={colors}
        />
        <MetricPill label="BMR" value={bmr.toLocaleString()} unit="kcal" colors={colors} />
        <MetricPill label="TDEE" value={tdee.toLocaleString()} unit="kcal" colors={colors} />
      </View>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* Section 2: Macro Targets */}
      <View style={s.sectionHeaderRow}>
        <Text style={[TYPE.overline, s.sectionHeader, { color: colors.textSec }]}>
          MACRO TARGETS
        </Text>
        <View style={[s.goalTag, { backgroundColor: COLORS.accentSoft }]}>
          <Text style={[s.goalTagText, { color: COLORS.accent }]}>{goalLabel}</Text>
        </View>
      </View>

      <MacroBar
        label="Protein"
        grams={macros.protein.grams}
        kcal={macros.protein.kcal}
        pct={macros.protein.pct}
        color={COLORS.green}
        colors={colors}
      />
      <MacroBar
        label="Carbs"
        grams={macros.carbs.grams}
        kcal={macros.carbs.kcal}
        pct={macros.carbs.pct}
        color={COLORS.amber}
        colors={colors}
      />
      <MacroBar
        label="Fats"
        grams={macros.fat.grams}
        kcal={macros.fat.kcal}
        pct={macros.fat.pct}
        color={COLORS.red}
        colors={colors}
      />

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* Section 3: Daily Targets */}
      <Text style={[TYPE.overline, s.sectionHeader, { color: colors.textSec }]}>DAILY TARGETS</Text>

      <TargetRow
        icon="droplet"
        iconColor={FEATURE.hydration}
        label="Water Intake"
        value={`${water} L`}
        sub={`${Math.round(water * 1000)} ml / day`}
        colors={colors}
      />
      <TargetRow
        icon="target"
        iconColor={COLORS.accent}
        label="Ideal Weight Range"
        value={`${ideal.low} - ${ideal.high} kg`}
        sub={`Devine formula (${gender})`}
        colors={colors}
      />
      <TargetRow
        icon="zap"
        iconColor={
          goal === 'cut' ? COLORS.cyan : goal === 'bulk' ? COLORS.green : COLORS.amber
        }
        label="Calorie Target"
        value={`${macros.calories.toLocaleString()} kcal`}
        sub={
          goal === 'cut'
            ? `TDEE - 500 (deficit)`
            : goal === 'bulk'
            ? `TDEE + 300 (surplus)`
            : `Maintenance`
        }
        colors={colors}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section headers
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
    borderRadius: 1,
  },

  // Goal tag
  goalTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  goalTagText: {
    fontFamily: FONT.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Metric pills
  pillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pill: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  pillValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pillValue: {
    fontFamily: FONT.numBold,
    fontSize: 20,
    lineHeight: 24,
  },
  pillUnit: {
    fontFamily: FONT.numMedium,
    fontSize: 11,
    marginLeft: 2,
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontFamily: FONT.semibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Macro bars
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  macroLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 76,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  macroLabel: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },
  macroBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: SPACING.sm,
    position: 'relative',
  },
  macroBarBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 3,
  },
  macroBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  macroValues: {
    alignItems: 'flex-end',
    width: 64,
  },
  macroGrams: {
    fontFamily: FONT.numSemibold,
    fontSize: 13,
    lineHeight: 16,
  },
  macroKcal: {
    fontFamily: FONT.numRegular,
    fontSize: 10,
    lineHeight: 14,
  },

  // Target rows
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  targetTextCol: {
    flex: 1,
  },
  targetLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
    lineHeight: 14,
    marginBottom: 2,
  },
  targetValue: {
    fontFamily: FONT.numBold,
    fontSize: 16,
    lineHeight: 20,
  },
  targetSub: {
    fontFamily: FONT.regular,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  emptyBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
})
