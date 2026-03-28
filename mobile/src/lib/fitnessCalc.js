/**
 * IVIRA Fitness Calculation Utility Module
 *
 * Wraps @finegym/fitness-calc with simplified helper functions
 * tailored for the IVIRA mobile app.
 */

// Try-catch import so the app doesn't crash if the package is missing
let fitnessCalc = null;
try {
  fitnessCalc = require('@finegym/fitness-calc');
} catch (e) {
  console.warn('[fitnessCalc] @finegym/fitness-calc not available, using built-in formulas');
}

// ---------------------------------------------------------------------------
// IVIRA Theme Colors
// ---------------------------------------------------------------------------
const IVIRA_COLORS = {
  primary: '#1A3A8F',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  orange: '#F97316',
  teal: '#14B8A6',
  pink: '#EC4899',
  muted: '#6B7280',
};

// ---------------------------------------------------------------------------
// 1. BMI
// ---------------------------------------------------------------------------

/**
 * Calculate Body Mass Index with category and IVIRA theme color.
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @returns {{ value: number, category: string, color: string }}
 */
export function calcBMI(weightKg, heightCm) {
  if (fitnessCalc) {
    const result = fitnessCalc.calculateBMI(weightKg, heightCm);
    return _mapBMIResult(result);
  }
  // Fallback
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const value = Math.round(bmi * 10) / 10;
  return _categorizeBMI(value);
}

/**
 * @param {{ bmi: number, category: string }} result
 * @returns {{ value: number, category: string, color: string }}
 */
function _mapBMIResult(result) {
  const cat = result.category;
  if (cat.startsWith('underweight')) {
    return { value: result.bmi, category: 'Underweight', color: IVIRA_COLORS.info };
  }
  if (cat === 'normal') {
    return { value: result.bmi, category: 'Normal', color: IVIRA_COLORS.success };
  }
  if (cat === 'overweight') {
    return { value: result.bmi, category: 'Overweight', color: IVIRA_COLORS.warning };
  }
  return { value: result.bmi, category: 'Obese', color: IVIRA_COLORS.danger };
}

/**
 * @param {number} value
 * @returns {{ value: number, category: string, color: string }}
 */
function _categorizeBMI(value) {
  if (value < 18.5) return { value, category: 'Underweight', color: IVIRA_COLORS.info };
  if (value < 25) return { value, category: 'Normal', color: IVIRA_COLORS.success };
  if (value < 30) return { value, category: 'Overweight', color: IVIRA_COLORS.warning };
  return { value, category: 'Obese', color: IVIRA_COLORS.danger };
}

// ---------------------------------------------------------------------------
// 2. BMR (Mifflin-St Jeor)
// ---------------------------------------------------------------------------

/**
 * Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @param {number} age - Age in years
 * @param {'male'|'female'} gender
 * @returns {number} BMR in kcal/day
 */
export function calcBMR(weightKg, heightCm, age, gender) {
  if (fitnessCalc) {
    const result = fitnessCalc.calculateBMR(weightKg, heightCm, age, gender, 'mifflin_st_jeor');
    return result.bmr;
  }
  // Fallback: Mifflin-St Jeor
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

// ---------------------------------------------------------------------------
// 3. TDEE
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculate Total Daily Energy Expenditure.
 * @param {number} bmr - Basal Metabolic Rate in kcal/day
 * @param {'sedentary'|'light'|'moderate'|'active'|'very_active'} activityLevel
 * @returns {number} TDEE in kcal/day
 */
export function calcTDEE(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (!multiplier) {
    throw new Error(`Unknown activity level: ${activityLevel}. Use: sedentary, light, moderate, active, very_active`);
  }
  return Math.round(bmr * multiplier);
}

// ---------------------------------------------------------------------------
// 4. Macros
// ---------------------------------------------------------------------------

/** @type {Record<string, { proteinRatio: number, carbsRatio: number, fatsRatio: number }>} */
const MACRO_GOALS = {
  maintain: { proteinRatio: 0.30, carbsRatio: 0.40, fatsRatio: 0.30 },
  cut: { proteinRatio: 0.40, carbsRatio: 0.30, fatsRatio: 0.30 },
  bulk: { proteinRatio: 0.30, carbsRatio: 0.50, fatsRatio: 0.20 },
};

/**
 * Calculate daily macronutrient targets in grams.
 * @param {number} tdee - Total Daily Energy Expenditure in kcal
 * @param {'maintain'|'cut'|'bulk'} goal
 * @returns {{ protein: number, carbs: number, fats: number }}
 */
export function calcMacros(tdee, goal) {
  const config = MACRO_GOALS[goal];
  if (!config) {
    throw new Error(`Unknown goal: ${goal}. Use: maintain, cut, bulk`);
  }

  // Adjust calories based on goal
  let calories = tdee;
  if (goal === 'cut') calories = Math.round(tdee * 0.8);
  if (goal === 'bulk') calories = Math.round(tdee * 1.15);

  return {
    protein: Math.round((calories * config.proteinRatio) / 4),
    carbs: Math.round((calories * config.carbsRatio) / 4),
    fats: Math.round((calories * config.fatsRatio) / 9),
  };
}

// ---------------------------------------------------------------------------
// 5. One-Rep Max
// ---------------------------------------------------------------------------

/**
 * Estimate one-rep max from a lift using the Epley formula.
 * Useful for PR display in the app.
 * @param {number} weight - Weight lifted
 * @param {number} reps - Number of reps performed (1-30)
 * @returns {number} Estimated 1RM
 */
export function calcOneRepMax(weight, reps) {
  if (fitnessCalc) {
    const result = fitnessCalc.calculateOneRepMax(weight, reps, 'epley');
    return result.oneRepMax;
  }
  // Fallback: Epley formula
  if (reps === 1) return Math.round(weight * 10) / 10;
  const orm = weight * (1 + reps / 30);
  return Math.round(orm * 10) / 10;
}

// ---------------------------------------------------------------------------
// 6. Heart Rate Zones
// ---------------------------------------------------------------------------

/** @type {string[]} */
const HR_ZONE_COLORS = [
  IVIRA_COLORS.success,  // Zone 1 - Recovery (green)
  IVIRA_COLORS.info,     // Zone 2 - Endurance (blue)
  IVIRA_COLORS.warning,  // Zone 3 - Aerobic (amber)
  IVIRA_COLORS.orange,   // Zone 4 - Threshold (orange)
  IVIRA_COLORS.danger,   // Zone 5 - Maximum (red)
];

/**
 * Calculate heart rate training zones.
 * Uses the Karvonen method when restingHR is provided, otherwise standard %MHR.
 * @param {number} age - Age in years
 * @param {number} [restingHR] - Resting heart rate in bpm
 * @returns {Array<{ zone: number, name: string, min: number, max: number, color: string }>}
 */
export function calcHeartRateZones(age, restingHR) {
  if (fitnessCalc) {
    const model = restingHR ? 'karvonen' : 'standard';
    const result = fitnessCalc.calculateHeartRateZones(age, restingHR, model);
    return result.zones.map((z, i) => ({
      zone: i + 1,
      name: z.name,
      min: z.min,
      max: z.max,
      color: HR_ZONE_COLORS[i] || IVIRA_COLORS.muted,
    }));
  }

  // Fallback
  const maxHR = Math.round(208 - 0.7 * age); // Tanaka formula
  const zoneDefs = [
    { name: 'Zone 1 - Recovery', minPct: 0.50, maxPct: 0.60 },
    { name: 'Zone 2 - Endurance', minPct: 0.60, maxPct: 0.70 },
    { name: 'Zone 3 - Aerobic', minPct: 0.70, maxPct: 0.80 },
    { name: 'Zone 4 - Threshold', minPct: 0.80, maxPct: 0.90 },
    { name: 'Zone 5 - Maximum', minPct: 0.90, maxPct: 1.00 },
  ];

  return zoneDefs.map((def, i) => {
    let min, max;
    if (restingHR) {
      // Karvonen method
      const hrr = maxHR - restingHR;
      min = Math.round(hrr * def.minPct + restingHR);
      max = Math.round(hrr * def.maxPct + restingHR);
    } else {
      min = Math.round(maxHR * def.minPct);
      max = Math.round(maxHR * def.maxPct);
    }
    return { zone: i + 1, name: def.name, min, max, color: HR_ZONE_COLORS[i] };
  });
}

// ---------------------------------------------------------------------------
// 7. Body Fat (US Navy Method)
// ---------------------------------------------------------------------------

/**
 * Estimate body fat percentage using the US Navy method.
 * @param {'male'|'female'} gender
 * @param {number} waist - Waist circumference in cm
 * @param {number} neck - Neck circumference in cm
 * @param {number} height - Height in cm
 * @param {number} [hip] - Hip circumference in cm (required for females)
 * @returns {number} Body fat percentage
 */
export function calcBodyFat(gender, waist, neck, height, hip) {
  if (fitnessCalc) {
    const measurements = { waistCm: waist, neckCm: neck, heightCm: height };
    if (hip) measurements.hipCm = hip;
    // weightKg is required by the package but only used for mass breakdown;
    // pass a dummy value since we only need the percentage
    const result = fitnessCalc.calculateBodyFat(gender, 70, measurements, 'us_navy');
    return result.bodyFatPercentage;
  }

  // Fallback: US Navy formula
  let bf;
  if (gender === 'male') {
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  } else {
    if (!hip) throw new Error('Hip measurement is required for females');
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
  }
  return Math.round(Math.max(0, Math.min(bf, 70)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// 8. Calories Burned
// ---------------------------------------------------------------------------

/**
 * MET value mapping for common activities to @finegym/fitness-calc activity keys.
 * @type {Record<string, string|number>}
 */
const ACTIVITY_MAP = {
  running: 'running_6mph',
  cycling: 'cycling_moderate',
  swimming: 'swimming_moderate',
  yoga: 'yoga',
  strength: 'weight_training_moderate',
  walking: 'walking_brisk',
  hiit: 'hiit',
};

/** Fallback MET values when the package is unavailable */
const FALLBACK_METS = {
  running: 9.8,
  cycling: 6.8,
  swimming: 8.3,
  yoga: 3.0,
  strength: 5.0,
  walking: 4.3,
  hiit: 8.0,
};

/**
 * Estimate calories burned for a common activity.
 * @param {'running'|'cycling'|'swimming'|'yoga'|'strength'|'walking'|'hiit'} activity
 * @param {number} durationMin - Duration in minutes
 * @param {number} weightKg - Body weight in kilograms
 * @returns {number} Estimated calories burned
 */
export function calcCaloriesBurned(activity, durationMin, weightKg) {
  if (fitnessCalc) {
    const mapped = ACTIVITY_MAP[activity];
    if (!mapped) {
      throw new Error(`Unknown activity: ${activity}. Use: running, cycling, swimming, yoga, strength, walking, hiit`);
    }
    const result = fitnessCalc.calculateCaloriesBurned(weightKg, durationMin, mapped);
    return result.totalCalories;
  }

  // Fallback: MET formula  calories = MET * 3.5 * weightKg * durationMin / 200
  const met = FALLBACK_METS[activity];
  if (!met) {
    throw new Error(`Unknown activity: ${activity}. Use: running, cycling, swimming, yoga, strength, walking, hiit`);
  }
  return Math.round((met * 3.5 * weightKg * durationMin) / 200);
}

// ---------------------------------------------------------------------------
// 9. Ideal Weight
// ---------------------------------------------------------------------------

/**
 * Calculate ideal weight range using the average of multiple formulas.
 * @param {number} heightCm - Height in centimeters
 * @param {'male'|'female'} gender
 * @returns {{ min: number, max: number }} Ideal weight range in kg
 */
export function calcIdealWeight(heightCm, gender) {
  if (fitnessCalc) {
    const result = fitnessCalc.calculateIdealWeight(heightCm, gender);
    const values = [result.robinson, result.miller, result.devine, result.hamwi];
    return {
      min: Math.round(Math.min(...values) * 10) / 10,
      max: Math.round(Math.max(...values) * 10) / 10,
    };
  }

  // Fallback: Devine + Hamwi to get a range
  const inchesOver5Feet = Math.max(0, heightCm / 2.54 - 60);
  let devine, hamwi;
  if (gender === 'male') {
    devine = 50 + 2.3 * inchesOver5Feet;
    hamwi = 48 + 2.7 * inchesOver5Feet;
  } else {
    devine = 45.5 + 2.3 * inchesOver5Feet;
    hamwi = 45.5 + 2.2 * inchesOver5Feet;
  }
  return {
    min: Math.round(Math.min(devine, hamwi) * 10) / 10,
    max: Math.round(Math.max(devine, hamwi) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// 10. Water Intake
// ---------------------------------------------------------------------------

/**
 * Calculate recommended daily water intake.
 * @param {number} weightKg - Body weight in kilograms
 * @param {'sedentary'|'light'|'moderate'|'active'|'very_active'} activityLevel
 * @returns {number} Recommended water intake in liters per day
 */
export function calcWaterIntake(weightKg, activityLevel = 'moderate') {
  if (fitnessCalc) {
    const result = fitnessCalc.calculateWaterIntake(weightKg, activityLevel);
    return result.liters;
  }

  // Fallback: base 0.033 L per kg, adjusted by activity
  const waterMultipliers = {
    sedentary: 1.0,
    light: 1.12,
    moderate: 1.25,
    active: 1.4,
    very_active: 1.55,
  };
  const multiplier = waterMultipliers[activityLevel];
  if (!multiplier) {
    throw new Error(`Unknown activity level: ${activityLevel}. Use: sedentary, light, moderate, active, very_active`);
  }
  return Math.round(weightKg * 0.033 * multiplier * 10) / 10;
}
