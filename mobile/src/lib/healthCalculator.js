// --- BMI ---

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export function getBMICategory(bmi) {
  if (!bmi) return null
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' }
  if (bmi < 25) return { label: 'Normal', color: '#22C55E' }
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' }
  return { label: 'Obese', color: '#EA4335' }
}

// --- BMR (Mifflin-St Jeor — most accurate for general population) ---

export function calculateBMR(weightKg, heightCm, ageYears, gender = 'male') {
  if (!weightKg || !heightCm || !ageYears) return 0
  // Mifflin-St Jeor: 10W + 6.25H - 5A + offset
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears)
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

// --- TDEE ---

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise', multiplier: 1.2 },
  { key: 'light', label: 'Lightly Active', desc: '1-3 days/week light exercise', multiplier: 1.375 },
  { key: 'moderate', label: 'Moderately Active', desc: '3-5 days/week gym', multiplier: 1.55 },
  { key: 'active', label: 'Very Active', desc: '6-7 days/week intense training', multiplier: 1.725 },
  { key: 'very_active', label: 'Athlete', desc: '2x/day training or physical job', multiplier: 1.9 },
]

export function calculateTDEE(bmr, activityLevel = 'moderate') {
  const level = ACTIVITY_LEVELS.find(l => l.key === activityLevel)
  return Math.round(bmr * (level?.multiplier || 1.55))
}

// --- Fitness Goals ---

export const FITNESS_GOALS = [
  {
    key: 'weight_loss',
    label: 'Weight Loss',
    desc: 'Lose ~0.5 kg/week with sustainable deficit',
    icon: 'trending-down',
    color: '#3B82F6',
    calorieOffset: -500,
    proteinPerKg: 2.2,
    fatPerKg: 0.8,
  },
  {
    key: 'fat_loss',
    label: 'Aggressive Fat Loss',
    desc: 'Maximize fat burn, preserve muscle',
    icon: 'zap',
    color: '#F59E0B',
    calorieOffset: -650,
    proteinPerKg: 2.4,
    fatPerKg: 0.7,
  },
  {
    key: 'muscle_building',
    label: 'Muscle Building',
    desc: 'Caloric surplus for muscle growth',
    icon: 'award',
    color: '#22C55E',
    calorieOffset: 350,
    proteinPerKg: 2.0,
    fatPerKg: 1.0,
  },
  {
    key: 'lean_bulk',
    label: 'Lean Bulk',
    desc: 'Slow gains with minimal fat',
    icon: 'target',
    color: '#8B5CF6',
    calorieOffset: 200,
    proteinPerKg: 2.2,
    fatPerKg: 0.9,
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    desc: 'Maintain current weight & performance',
    icon: 'minus',
    color: '#64748B',
    calorieOffset: 0,
    proteinPerKg: 1.6,
    fatPerKg: 1.0,
  },
]

// --- Macro Calculator ---

/**
 * Calculate daily macros based on body stats and fitness goal.
 *
 * @param {Object} params
 * @param {number} params.weightKg - Body weight in kg
 * @param {number} params.heightCm - Height in cm
 * @param {number} params.ageYears - Age in years
 * @param {string} params.gender - 'male' or 'female'
 * @param {string} params.activityLevel - One of ACTIVITY_LEVELS keys
 * @param {string} params.goalKey - One of FITNESS_GOALS keys
 * @returns {Object} { calories, protein, carbs, fat, bmr, tdee, goalLabel }
 */
export function calculateMacros({ weightKg, heightCm, ageYears, gender, activityLevel, goalKey }) {
  if (!weightKg || !heightCm || !ageYears) return null

  const bmr = calculateBMR(weightKg, heightCm, ageYears, gender)
  const tdee = calculateTDEE(bmr, activityLevel)
  const goal = FITNESS_GOALS.find(g => g.key === goalKey) || FITNESS_GOALS[4] // default maintenance

  const targetCalories = Math.max(1200, tdee + goal.calorieOffset) // Floor at 1200 kcal safety

  // Protein & fat from body weight
  const proteinGrams = Math.round(goal.proteinPerKg * weightKg)
  const fatGrams = Math.round(goal.fatPerKg * weightKg)

  // Remaining calories go to carbs
  const proteinCals = proteinGrams * 4
  const fatCals = fatGrams * 9
  const carbCals = Math.max(0, targetCalories - proteinCals - fatCals)
  const carbGrams = Math.round(carbCals / 4)

  // Recalculate total (may differ slightly from target due to rounding)
  const actualCalories = (proteinGrams * 4) + (carbGrams * 4) + (fatGrams * 9)

  return {
    calories: actualCalories,
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams,
    bmr,
    tdee,
    goalLabel: goal.label,
    goalKey: goal.key,
    deficit: goal.calorieOffset < 0 ? Math.abs(goal.calorieOffset) : 0,
    surplus: goal.calorieOffset > 0 ? goal.calorieOffset : 0,
    // Macro percentages
    proteinPct: Math.round((proteinGrams * 4 / actualCalories) * 100),
    carbsPct: Math.round((carbGrams * 4 / actualCalories) * 100),
    fatPct: Math.round((fatGrams * 9 / actualCalories) * 100),
  }
}

// --- Water Intake Recommendation ---

export function calculateWaterIntake(weightKg, activityLevel = 'moderate') {
  if (!weightKg) return 2500 // default ml
  // Base: 35ml per kg, adjust for activity
  const base = weightKg * 35
  const multipliers = { sedentary: 0.9, light: 1.0, moderate: 1.1, active: 1.2, very_active: 1.3 }
  return Math.round(base * (multipliers[activityLevel] || 1.1))
}
