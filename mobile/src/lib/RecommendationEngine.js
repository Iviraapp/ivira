/**
 * RecommendationEngine — consumes nutrition profile + body stats and
 * produces a full "Action Plan" payload for the reveal screen.
 */
import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateWaterIntake,
  FITNESS_GOALS,
  ACTIVITY_LEVELS,
} from './healthCalculator'

// Fasting protocol recommendation based on goal
const FASTING_MAP = {
  weight_loss: { protocol: '16:8', reason: 'A 16-hour fast maximises fat oxidation while keeping energy levels stable for your workouts.' },
  fat_loss: { protocol: '18:6', reason: 'Extended fasting windows push your body deeper into ketosis, accelerating stubborn fat breakdown.' },
  muscle_building: { protocol: '16:8', reason: 'A moderate fast preserves muscle protein synthesis while boosting growth hormone overnight.' },
  lean_bulk: { protocol: '16:8', reason: 'Time-restricted eating keeps insulin sensitivity high so surplus calories build lean tissue, not fat.' },
  maintenance: { protocol: '16:8', reason: 'A daily 16-hour fast supports metabolic flexibility and long-term body composition maintenance.' },
}

/**
 * Generate a complete action plan from a nutrition profile.
 *
 * @param {Object} profile - { age, gender, weight, height, activityLevel, goalKey }
 * @returns {Object} Full action plan payload
 */
export function generateActionPlan(profile) {
  const { age, gender, weight, height, activityLevel, goalKey } = profile

  const macros = calculateMacros({
    weightKg: weight,
    heightCm: height,
    ageYears: age,
    gender,
    activityLevel,
    goalKey,
  })

  if (!macros) return null

  const waterMl = calculateWaterIntake(weight, activityLevel)
  const goal = FITNESS_GOALS.find(g => g.key === goalKey) || FITNESS_GOALS[4]
  const activity = ACTIVITY_LEVELS.find(l => l.key === activityLevel)
  const fasting = FASTING_MAP[goalKey] || FASTING_MAP.maintenance

  // Build human-readable summary
  const direction = macros.deficit > 0
    ? `${macros.deficit} kcal deficit`
    : macros.surplus > 0
      ? `${macros.surplus} kcal surplus`
      : 'at maintenance'

  const planSummary = `${macros.tdee} TDEE · ${direction} · ${activity?.label || 'Moderate'}`

  return {
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    proteinPct: macros.proteinPct,
    carbsPct: macros.carbsPct,
    fatPct: macros.fatPct,
    bmr: macros.bmr,
    tdee: macros.tdee,
    deficit: macros.deficit,
    surplus: macros.surplus,
    waterMl,
    goalLabel: goal.label,
    goalKey: goal.key,
    goalColor: goal.color,
    activityLabel: activity?.label || 'Moderate',
    planSummary,
    recommendedFast: fasting.protocol,
    fastingReason: fasting.reason,
  }
}
