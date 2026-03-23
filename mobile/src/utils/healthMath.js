/**
 * Revised Harris-Benedict BMR and fasting calorie estimator.
 *
 * Men:   BMR = 88.362 + (13.397 × W) + (4.799 × H) - (5.677 × A)
 * Women: BMR = 447.593 + (9.247 × W) + (3.098 × H) - (4.330 × A)
 */

export function getHarrisBenedictBMR(weightKg, heightCm, ageYears, gender) {
  if (gender === 'female') {
    return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears
  }
  return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
}

/**
 * Estimate resting calories burned during a fast.
 *
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} ageYears
 * @param {'male'|'female'} gender
 * @param {number} fastingDurationSeconds – elapsed seconds since fast began
 * @returns {number} estimated kcal burned (fractional)
 */
export function getFastingCaloriesBurned(
  weightKg,
  heightCm,
  ageYears,
  gender,
  fastingDurationSeconds,
) {
  const MAX_FASTING_SECONDS = 86400 // Cap at 24 hours
  const clampedSeconds = Math.min(fastingDurationSeconds, MAX_FASTING_SECONDS)
  const bmr = getHarrisBenedictBMR(weightKg, heightCm, ageYears, gender)
  const perSecond = bmr / 86400 // 24 × 60 × 60
  return perSecond * clampedSeconds
}
