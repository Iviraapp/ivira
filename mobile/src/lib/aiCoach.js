/**
 * Vira AI Engine — local, deterministic, offline-friendly.
 * Generates personalized fitness insights without backend calls.
 * Locale-aware: adapts greetings, food references, and cultural phrases
 * based on device language/region (Hindi, Tamil, Telugu, Kannada, Malayalam, English).
 */
// Platform/NativeModules no longer needed — region is set from gym city

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function pick(arr, seed) {
  return arr[Math.abs(Math.round(seed)) % arr.length]
}

function dayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}

// More granular seed that changes every few hours for variety
function hourSlot() {
  const now = new Date()
  return dayOfYear() * 6 + Math.floor(now.getHours() / 4)
}

function pctChange(current, previous) {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

function firstName(name) {
  if (!name) return 'Champ'
  return name.split(' ')[0]
}

// ---------------------------------------------------------------------------
// Region Detection — determines regional flavor for greetings & food refs
// ---------------------------------------------------------------------------
// Uses gym city (IP/location-based) rather than device locale, because not
// everyone speaks the language their phone is set to.

let _regionOverride = null

// City → region mapping for Indian cities
const CITY_REGION_MAP = {
  // North India (Hindi belt)
  delhi: 'north', 'new delhi': 'north', noida: 'north', gurgaon: 'north', gurugram: 'north',
  mumbai: 'north', pune: 'north', nagpur: 'north', nashik: 'north', thane: 'north',
  ahmedabad: 'north', surat: 'north', vadodara: 'north', rajkot: 'north',
  jaipur: 'north', lucknow: 'north', kanpur: 'north', patna: 'north',
  chandigarh: 'north', ludhiana: 'north', amritsar: 'north',
  kolkata: 'north', bhopal: 'north', indore: 'north',
  // Tamil Nadu
  chennai: 'tamil', coimbatore: 'tamil', madurai: 'tamil', trichy: 'tamil',
  salem: 'tamil', tirunelveli: 'tamil', erode: 'tamil', vellore: 'tamil',
  // Telangana / Andhra Pradesh
  hyderabad: 'telugu', visakhapatnam: 'telugu', vijayawada: 'telugu',
  warangal: 'telugu', guntur: 'telugu', tirupati: 'telugu', vizag: 'telugu',
  // Karnataka
  bengaluru: 'kannada', bangalore: 'kannada', mysuru: 'kannada', mysore: 'kannada',
  mangalore: 'kannada', hubli: 'kannada', dharwad: 'kannada', belgaum: 'kannada',
  // Kerala
  kochi: 'malayalam', thiruvananthapuram: 'malayalam', kozhikode: 'malayalam',
  thrissur: 'malayalam', ernakulam: 'malayalam', calicut: 'malayalam',
}

/**
 * Set region based on gym city. Call this when gym info is loaded.
 * @param {string} city - Gym's city name
 */
export function setCoachRegion(city) {
  if (!city) { _regionOverride = 'international'; return }
  _regionOverride = CITY_REGION_MAP[city.toLowerCase().trim()] || 'international'
}

/** @deprecated Use setCoachRegion(city) instead */
export function setCoachLocale(locale) {
  // Keep for backwards compatibility but map to region
  const loc = (locale || 'en').toLowerCase().split(/[_-]/)[0]
  if (loc === 'hi' || loc === 'mr' || loc === 'gu' || loc === 'bn' || loc === 'pa') _regionOverride = 'north'
  else if (loc === 'ta') _regionOverride = 'tamil'
  else if (loc === 'te') _regionOverride = 'telugu'
  else if (loc === 'kn') _regionOverride = 'kannada'
  else if (loc === 'ml') _regionOverride = 'malayalam'
  else _regionOverride = 'international'
}

function getRegion() {
  return _regionOverride || 'international'
}

// ---------------------------------------------------------------------------
// getDailyInsight
// ---------------------------------------------------------------------------

// Region-specific greetings — native language sprinkled in for warmth
const GREETINGS_BY_REGION = {
  north: {
    morning: [
      (n) => `Suprabhat, ${n}!`,
      (n) => `Good morning, ${n}. Aaj ka din strong hoga.`,
      (n) => `Morning, ${n}. Uthke workout karo!`,
      (n) => `Rise & grind, ${n}.`,
      (n) => `Namaste, ${n}. New day, new energy.`,
    ],
    afternoon: [
      (n) => `Afternoon, ${n}. Lunch ke baad energy lagao.`,
      (n) => `Hey ${n}, dopahar ka session?`,
      (n) => `Keep going, ${n}. Ruk mat.`,
      (n) => `Post-lunch power, ${n}.`,
    ],
    evening: [
      (n) => `Shubh sandhya, ${n}.`,
      (n) => `Evening, ${n}. Din ka best session abhi hoga.`,
      (n) => `Good evening, ${n}. End strong.`,
      (n) => `${n}, shaam ko workout = achi neend.`,
      (n) => `Wind-down time, ${n}.`,
    ],
  },
  tamil: {
    morning: [
      (n) => `Kalai vanakkam, ${n}!`,
      (n) => `Good morning, ${n}. Innaiku strong ah irupom.`,
      (n) => `Morning, ${n}. Let's crush it today.`,
      (n) => `Rise & grind, ${n}.`,
      (n) => `Vanakkam, ${n}. New day, new energy.`,
    ],
    afternoon: [
      (n) => `Afternoon, ${n}. Lunch ku appram energy use pannunga.`,
      (n) => `Hey ${n}, afternoon session?`,
      (n) => `Keep going, ${n}. Niruthaadheenga.`,
      (n) => `Post-lunch power, ${n}.`,
    ],
    evening: [
      (n) => `Maalai vanakkam, ${n}.`,
      (n) => `Evening, ${n}. Ipo workout pannaalam.`,
      (n) => `Good evening, ${n}. End the day strong.`,
      (n) => `${n}, evening workout = nalla thookkam.`,
      (n) => `Wind-down time, ${n}.`,
    ],
  },
  telugu: {
    morning: [
      (n) => `Subhodayam, ${n}!`,
      (n) => `Good morning, ${n}. Ee roju strong ga undham.`,
      (n) => `Morning, ${n}. Let's go!`,
      (n) => `Rise & grind, ${n}.`,
      (n) => `Namaskaram, ${n}. New day, new energy.`,
    ],
    afternoon: [
      (n) => `Afternoon, ${n}. Lunch tarvatha energy pettandi.`,
      (n) => `Hey ${n}, afternoon session?`,
      (n) => `Keep going, ${n}. Aagakandi.`,
      (n) => `Post-lunch power, ${n}.`,
    ],
    evening: [
      (n) => `Shubha sandhya, ${n}.`,
      (n) => `Evening, ${n}. Best session ippudu cheyandi.`,
      (n) => `Good evening, ${n}. End strong.`,
      (n) => `${n}, saayantram workout = manchiga nidra.`,
      (n) => `Wind-down time, ${n}.`,
    ],
  },
  kannada: {
    morning: [
      (n) => `Shubhodaya, ${n}!`,
      (n) => `Good morning, ${n}. Ivattu strong aagi irbeku.`,
      (n) => `Morning, ${n}. Let's crush it!`,
      (n) => `Rise & grind, ${n}.`,
      (n) => `Namaskara, ${n}. New day, new energy.`,
    ],
    afternoon: [
      (n) => `Afternoon, ${n}. Oota aadmele energy use maadi.`,
      (n) => `Hey ${n}, afternoon session?`,
      (n) => `Keep going, ${n}. Nilsbaardi.`,
      (n) => `Post-lunch power, ${n}.`,
    ],
    evening: [
      (n) => `Shubha sandhyeya, ${n}.`,
      (n) => `Evening, ${n}. Eega workout maadona.`,
      (n) => `Good evening, ${n}. End the day strong.`,
      (n) => `${n}, sandhye workout = olleya nidde.`,
      (n) => `Wind-down time, ${n}.`,
    ],
  },
  malayalam: {
    morning: [
      (n) => `Suprabhatham, ${n}!`,
      (n) => `Good morning, ${n}. Innu strong aayirikkum.`,
      (n) => `Morning, ${n}. Let's go!`,
      (n) => `Rise & grind, ${n}.`,
      (n) => `Namaskaaram, ${n}. New day, new energy.`,
    ],
    afternoon: [
      (n) => `Afternoon, ${n}. Oonu kazhinjaal energy use cheyyoo.`,
      (n) => `Hey ${n}, afternoon session?`,
      (n) => `Keep going, ${n}. Nilkkaruth.`,
      (n) => `Post-lunch power, ${n}.`,
    ],
    evening: [
      (n) => `Shubha sandhya, ${n}.`,
      (n) => `Evening, ${n}. Ippo workout cheyyaam.`,
      (n) => `Good evening, ${n}. End strong.`,
      (n) => `${n}, vaikkunneram workout = nalla urangal.`,
      (n) => `Wind-down time, ${n}.`,
    ],
  },
  international: {
    morning: [
      (n) => `Morning, ${n}.`,
      (n) => `Rise & grind, ${n}.`,
      (n) => `Good morning, ${n}.`,
      (n) => `New day, new energy, ${n}.`,
      (n) => `Let's get it, ${n}.`,
    ],
    afternoon: [
      (n) => `Afternoon, ${n}.`,
      (n) => `Post-lunch power, ${n}.`,
      (n) => `Hey ${n}, afternoon session?`,
      (n) => `Keep going, ${n}.`,
    ],
    evening: [
      (n) => `Evening, ${n}.`,
      (n) => `End the day strong, ${n}.`,
      (n) => `Evening session? Perfect, ${n}.`,
      (n) => `Good evening, ${n}.`,
      (n) => `Wind-down time, ${n}.`,
    ],
  },
}

function getGreetingMap() {
  const region = getRegion()
  return GREETINGS_BY_REGION[region] || GREETINGS_BY_REGION.international
}

const STREAK_INSIGHTS = [
  (s) => `${s}-day streak \u{1F525} \u2014 your consistency is in the top 10%. Push for ${s + 3}.`,
  (s) => `${s} days running. That kind of discipline builds champions.`,
  (s) => `Streak: ${s} days. Don\u2019t break the chain \u{1F4AA}`,
  (s) => `${s} consecutive days \u2014 most members drop off at ${Math.max(s - 2, 3)}. You\u2019re different.`,
  (s) => `${s}-day streak! Even Dhoni needed consistency to hit those finishes.`,
  (s) => `${s} days strong. Cricket legends train daily \u2014 so do you.`,
  (s) => `${s}-day streak. Sachin didn\u2019t score centuries by skipping nets.`,
]

// Region-specific food comparisons for calorie insights
const FOOD_REFS = {
  north: { meal: 'dal chawal', cal: 250, snack: 'samosas', snackCal: 80 },
  tamil: { meal: 'idli sambar', cal: 200, snack: 'murukku', snackCal: 100 },
  telugu: { meal: 'pesarattu', cal: 220, snack: 'punugulu', snackCal: 90 },
  kannada: { meal: 'bisi bele bath', cal: 280, snack: 'mangalore bajji', snackCal: 110 },
  malayalam: { meal: 'puttu kadala', cal: 240, snack: 'pazham pori', snackCal: 120 },
  international: { meal: 'rice & chicken', cal: 300, snack: 'energy bars', snackCal: 150 },
}

function getCalorieInsights() {
  const region = getRegion()
  const food = FOOD_REFS[region] || FOOD_REFS.international
  return [
    (kcal, pct) => `You\u2019ve burned ${kcal.toLocaleString()} kcal this week. That\u2019s ${Math.abs(pct)}% ${pct >= 0 ? 'more' : 'less'} than last week.`,
    (kcal) => `${kcal.toLocaleString()} kcal torched this week. That\u2019s like burning off ${Math.round(kcal / food.cal)} plates of ${food.meal}.`,
    (kcal) => `Weekly burn: ${kcal.toLocaleString()} kcal. Your metabolism is thanking you.`,
    (kcal, pct) => pct > 0
      ? `${Math.abs(pct)}% more calories burned than last week \u2014 solid progress.`
      : `Slightly lower burn this week, but showing up still counts.`,
    (kcal) => `${kcal.toLocaleString()} kcal this week \u2014 that\u2019s ${Math.round(kcal / food.snackCal)} ${food.snack} obliterated.`,
    (kcal) => `You burned ${kcal.toLocaleString()} kcal. Pair that with good protein and you\u2019re golden.`,
  ]
}

const EXPIRY_INSIGHTS = [
  (d, c) => `Your membership renews in ${d} days. You\u2019ve checked in ${c} times this month \u2014 solid.`,
  (d) => `${d} days left on your plan. Make every session count.`,
  (d, c) => `Renewal in ${d} days \u2014 at ${c} check-ins, you\u2019re getting great value per visit.`,
  (d) => d <= 7
    ? `Heads up: membership expires in ${d} days. Renew to keep the momentum.`
    : `${d} days left. That\u2019s ${d} chances to get stronger.`,
  (d) => d <= 3
    ? `\u26A0\uFE0F Only ${d} days left on your plan. Renew today so you don\u2019t miss a beat.`
    : `${d} days until renewal. You\u2019re on a good run \u2014 keep it going.`,
]

function getFastingInsights() {
  const region = getRegion()
  const drinkTip = {
    north: 'Nimbu pani (no sugar) can help you push through.',
    tamil: 'Nannari sherbet (no sugar) or green tea can help.',
    telugu: 'Buttermilk or green tea — stay hydrated.',
    kannada: 'Majjige (buttermilk) or black coffee to push through.',
    malayalam: 'Sambharam or black coffee helps during fasting.',
    international: 'Black coffee or green tea are your friends.',
  }
  return [
    () => `You\u2019re in a fasting window \u2014 your body is tapping into fat stores right now.`,
    () => `Fasting mode active. Stay hydrated \u2014 ${drinkTip[region] || drinkTip.international}`,
    () => `Intermittent fasting + training = elite recovery. Keep going.`,
    () => `Fasting window on. Your insulin is low \u2014 prime fat-burning zone.`,
    () => `Still fasting? ${drinkTip[region] || drinkTip.international}`,
  ]
}

const TIME_INSIGHTS = {
  morning: [
    'Morning workouts spike your metabolism for the next 14 hours.',
    'Cortisol peaks in the AM \u2014 your body is primed for intensity.',
    'Early grind. While others sleep, you build.',
    'A quick stretch before breakfast? Small habit, big results.',
    'Morning light + movement = better sleep tonight. Science backs it.',
  ],
  afternoon: [
    'Your muscles are warmed up by now \u2014 great time for heavy lifts.',
    'Afternoon sessions have the lowest injury risk. Smart choice.',
    'Post-lunch window: your grip strength peaks between 2\u20136 PM.',
    'Body temp is higher now. Flexibility and power both peak in the PM.',
    'Lunch was fuel. Now put it to work.',
  ],
  evening: [
    'Evening session? Perfect. Your body recovers best with evening workouts.',
    'PM workouts improve sleep quality. Win-win.',
    'Core temperature peaks in the evening \u2014 ideal for flexibility work.',
    'End the day by investing in yourself. Tomorrow you\u2019ll thank tonight.',
    'Evening training + good dinner = overnight muscle repair.',
  ],
}

/**
 * Returns a personalized greeting + insight string.
 * @param {Object} member - { name, streak, checkin_count, membership }
 * @param {Object} stats  - { weeklyCalories, lastWeekCalories, isFasting, daysUntilExpiry, recentCheckins }
 * @returns {string}
 */
export function getDailyInsight(member, stats = {}) {
  const tod = getTimeOfDay()
  const name = firstName(member?.name)
  const slot = hourSlot()
  const seed = slot + (member?.streak || 0)
  const streak = member?.streak || 0
  const checkins = member?.checkin_count || stats?.recentCheckins || 0
  const daysLeft = stats?.daysUntilExpiry ?? 0
  const isFasting = stats?.isFasting || false
  const weeklyCal = stats?.weeklyCalories || 0
  const lastWeekCal = stats?.lastWeekCalories || 0

  const greetingMap = getGreetingMap()
  const greeting = pick(greetingMap[tod], seed)(name)

  let insight = ''

  if (isFasting) {
    insight = pick(getFastingInsights(), seed)()
  } else {
    // Build pool of available insight categories and rotate through them
    // so the user doesn't always see streak messages
    const categories = []

    if (streak >= 3) {
      categories.push(() => pick(STREAK_INSIGHTS, seed)(streak))
    }
    if (weeklyCal > 0) {
      const pct = pctChange(weeklyCal, lastWeekCal)
      const calorieInsights = getCalorieInsights()
      categories.push(() => pick(calorieInsights, seed)(weeklyCal, pct))
    }
    if (daysLeft > 0 && daysLeft <= 30) {
      categories.push(() => pick(EXPIRY_INSIGHTS, seed)(daysLeft, checkins))
    }
    // Time-of-day insights are always available as variety
    categories.push(() => pick(TIME_INSIGHTS[tod], seed))

    // Use hour slot to rotate across categories instead of always picking the first
    const categoryIndex = slot % categories.length
    insight = categories[categoryIndex]()
  }

  return `${greeting} ${insight}`
}

// ---------------------------------------------------------------------------
// getWorkoutSuggestion
// ---------------------------------------------------------------------------

const MUSCLE_GROUPS = {
  upper: ['Chest', 'Back', 'Shoulders', 'Arms', 'Upper Body', 'Push', 'Pull'],
  lower: ['Legs', 'Glutes', 'Quads', 'Hamstrings', 'Lower Body', 'Leg Day'],
  cardio: ['Cardio', 'HIIT', 'Running', 'Cycling', 'Zumba', 'Jump Rope', 'Cricket'],
  core: ['Core', 'Abs', 'Plank'],
  flexibility: ['Yoga', 'Stretching', 'Mobility', 'Power Yoga', 'Surya Namaskar'],
  full: ['Full Body', 'CrossFit', 'Functional', 'Circuit'],
}

function classifyWorkout(workoutName) {
  if (!workoutName) return 'full'
  const lower = workoutName.toLowerCase()
  for (const [group, keywords] of Object.entries(MUSCLE_GROUPS)) {
    if (keywords.some(k => lower.includes(k.toLowerCase()))) return group
  }
  return 'full'
}

const SUGGESTIONS = {
  weight_loss: [
    { type: 'Cardio HIIT', duration: 30, base: 'Burn fat with intervals.' },
    { type: 'Zumba / Dance', duration: 45, base: 'Dance the calories away \u2014 pick your favourite beats.' },
    { type: 'Jump Rope + Core', duration: 25, base: '10 min rope, 15 min abs. Simple, effective.' },
    { type: 'Stair Climber + Stretching', duration: 35, base: 'Low impact, high calorie burn.' },
    { type: 'Cricket Fielding Drills', duration: 30, base: 'Sprints, dives, throws \u2014 cardio disguised as fun.' },
    { type: 'Tabata Circuit', duration: 20, base: '4 min rounds, 20s on / 10s off. Maximum afterburn.' },
  ],
  muscle_gain: [
    { type: 'Upper Body Strength', duration: 45, base: 'Bench, rows, OHP \u2014 compound movements first.' },
    { type: 'Lower Body Power', duration: 50, base: 'Squats, deadlifts, lunges. Fuel with extra protein tonight.' },
    { type: 'Push / Pull Split', duration: 40, base: 'Push day: chest, shoulders, triceps.' },
    { type: 'Back & Biceps', duration: 40, base: 'Pull-ups, barbell rows, curls. Eat within 30 min post-workout.' },
    { type: 'Leg Day + Core', duration: 50, base: 'Never skip leg day. Your future self will thank you.' },
    { type: 'Shoulder & Traps', duration: 35, base: 'OHP, lateral raises, shrugs. Add extra protein to dinner.' },
  ],
  general: [
    { type: 'Full Body Circuit', duration: 40, base: '8 stations, 45s each, 3 rounds.' },
    { type: 'Functional Training', duration: 35, base: 'Everyday movements, real-world strength.' },
    { type: 'Yoga Flow', duration: 50, base: 'Surya Namaskar sequence + warrior poses. Great for recovery day.' },
    { type: 'Swim + Stretch', duration: 45, base: 'Full body, zero joint impact.' },
    { type: 'Sports Conditioning', duration: 40, base: 'Agility ladder, med ball, box jumps.' },
    { type: 'Mobility & Core', duration: 30, base: 'Hip openers, thoracic twists, planks. Injury prevention day.' },
  ],
}

const FOLLOW_UP = {
  upper: ['lower', 'cardio', 'core', 'flexibility'],
  lower: ['upper', 'cardio', 'core', 'flexibility'],
  cardio: ['upper', 'lower', 'core', 'flexibility'],
  core: ['upper', 'lower', 'cardio'],
  flexibility: ['upper', 'lower', 'cardio', 'full'],
  full: ['cardio', 'flexibility', 'core'],
}

const REASON_TEMPLATES = [
  (last, type) => `You did ${last} yesterday. Today: ${type.toLowerCase()} to balance it out.`,
  (last, type) => `After ${last}, your body needs variety \u2014 ${type.toLowerCase()} is perfect.`,
  (last, type) => `Smart sequencing: ${last} \u2192 ${type.toLowerCase()} keeps progress steady.`,
  (_last, type) => `Today\u2019s focus: ${type.toLowerCase()}. Trust the process.`,
  (last) => `Recovery from ${last} + new stimulus = growth.`,
  (last, type) => `${last} was solid. Now hit ${type.toLowerCase()} to stay balanced.`,
]

/**
 * Returns a smart workout suggestion.
 *
 * Supports two calling conventions:
 *   1) getWorkoutSuggestion(member, recentWorkouts, goals)
 *   2) getWorkoutSuggestion({ memberId, name, gymId }) — legacy from HomeScreen
 *
 * @returns {Promise<{ type: string, duration: string, reason: string, intensity?: string }>}
 */
export async function getWorkoutSuggestion(memberOrOpts, recentWorkouts = [], goals = {}) {
  // Normalise legacy single-object call
  const member = memberOrOpts?.name
    ? memberOrOpts
    : { name: memberOrOpts?.name || 'Member' }

  const seed = hourSlot() + (member?.name?.length || 0)
  const goal = goals?.primary || 'general'
  const pool = SUGGESTIONS[goal] || SUGGESTIONS.general

  const lastWorkout = recentWorkouts?.[0]
  const lastGroup = lastWorkout ? classifyWorkout(lastWorkout.name || lastWorkout.type) : null

  let suggestion
  if (lastGroup && FOLLOW_UP[lastGroup]) {
    const preferred = pool.filter(s => classifyWorkout(s.type) !== lastGroup)
    suggestion = preferred.length > 0 ? pick(preferred, seed) : pick(pool, seed)
  } else {
    suggestion = pick(pool, seed)
  }

  const lastLabel = lastWorkout?.name || lastWorkout?.type || 'your last session'
  const reason = pick(REASON_TEMPLATES, seed)(lastLabel, suggestion.type)

  return {
    type: suggestion.type,
    duration: suggestion.duration,
    reason,
    intensity: 'moderate',
  }
}

// ---------------------------------------------------------------------------
// getRecoveryTip
// ---------------------------------------------------------------------------

// Region-aware protein/recovery food suggestions
function getProteinFood() {
  const region = getRegion()
  const foods = {
    north: 'paneer tikka or dal with rice',
    tamil: 'egg dosa or sundal with curd rice',
    telugu: 'pesarattu or egg curry with rice',
    kannada: 'ragi mudde or egg bhurji with roti',
    malayalam: 'meen curry or egg roast with rice',
    international: 'grilled chicken or eggs with rice',
  }
  return foods[region] || foods.international
}

function getRecoveryDrink() {
  const region = getRegion()
  const drinks = {
    north: 'haldi doodh',
    tamil: 'turmeric milk or kashayam',
    telugu: 'pasupu palu (turmeric milk)',
    kannada: 'haldi halu',
    malayalam: 'uluva kashayam (fenugreek water)',
    international: 'warm turmeric milk',
  }
  return drinks[region] || drinks.international
}

function getPostWorkoutSnack() {
  const region = getRegion()
  const snacks = {
    north: 'eggs, curd rice, or a whey shake',
    tamil: 'idli with sambar or a banana shake',
    telugu: 'pesarattu or boiled eggs with ragi malt',
    kannada: 'ragi kanji or curd rice with pickle',
    malayalam: 'puttu with kadala or banana shake',
    international: 'protein shake or eggs with toast',
  }
  return snacks[region] || snacks.international
}

function getHydrationTip() {
  const region = getRegion()
  const tips = {
    north: 'coconut water or nimbu pani',
    tamil: 'ilaneer (coconut water) or nannari sherbet',
    telugu: 'coconut water or majjiga (buttermilk)',
    kannada: 'elaneer or majjige (buttermilk)',
    malayalam: 'karikkin vellam (tender coconut) or sambharam',
    international: 'coconut water or electrolyte drink',
  }
  return tips[region] || tips.international
}

function getRecoveryTips() {
  return {
    upper: [
      { tip: 'Stretch your chest and shoulders tonight \u2014 arms overhead, hold 30s.', icon: 'heart' },
      { tip: 'Foam roll your upper back for 5 min. It releases tension fast.', icon: 'heart' },
      { tip: 'Cold shower on your shoulders can reduce inflammation post-push day.', icon: 'droplet' },
      { tip: `Have a protein-rich dinner \u2014 ${getProteinFood()} does the job.`, icon: 'heart' },
      { tip: 'Arm circles and band pull-aparts before bed loosen tight shoulders.', icon: 'heart' },
    ],
    lower: [
      { tip: 'Stretch your hamstrings tonight \u2014 you did heavy legs yesterday.', icon: 'heart' },
      { tip: 'Elevate your legs for 10 min before bed. Reduces soreness by morning.', icon: 'moon' },
      { tip: 'Foam roll your quads and calves \u2014 5 min each side.', icon: 'heart' },
      { tip: 'Magnesium-rich foods (banana, dark chocolate) help with muscle cramps.', icon: 'heart' },
      { tip: 'Hot water bag on sore quads tonight. Old-school but effective.', icon: 'heart' },
    ],
    cardio: [
      { tip: `Rehydrate well \u2014 ${getHydrationTip()} beats plain water post-cardio.`, icon: 'droplet' },
      { tip: 'Gentle walk tonight helps flush lactic acid after today\u2019s cardio.', icon: 'heart' },
      { tip: 'Stretch your hip flexors \u2014 they tighten up after running/cycling.', icon: 'heart' },
      { tip: 'ORS or electrolyte water if you sweated a lot. Hydration is recovery.', icon: 'droplet' },
    ],
    core: [
      { tip: 'Your abs need 48h to recover fully. Do upper or lower body tomorrow.', icon: 'clock' },
      { tip: 'Deep breathing exercises tonight activate your deep core muscles for recovery.', icon: 'wind' },
      { tip: 'Gentle spinal twists before bed help decompress after core work.', icon: 'heart' },
    ],
    flexibility: [
      { tip: `Great yoga session. Have warm ${getRecoveryDrink()} tonight for joint recovery.`, icon: 'heart' },
      { tip: 'After stretching, your muscles are primed for strength work tomorrow.', icon: 'trending-up' },
      { tip: 'Keep sipping warm water through the evening \u2014 flexibility and hydration go together.', icon: 'droplet' },
    ],
    full: [
      { tip: 'Full body day demands full recovery. Sleep 7+ hours tonight.', icon: 'moon' },
      { tip: `Eat within 45 min \u2014 ${getPostWorkoutSnack()}. Your muscles need it.`, icon: 'heart' },
      { tip: 'Light walk + foam rolling tonight. Tomorrow should be an easy day or rest.', icon: 'heart' },
      { tip: `Post-workout ${getRegion() === 'international' ? 'protein shake' : 'chai with extra milk'} = easy protein top-up.`, icon: 'heart' },
    ],
  }
}

const LONG_SESSION_TIPS = [
  { tip: 'That was a long session. Prioritise sleep \u2014 8 hours minimum tonight.', icon: 'moon' },
  { tip: 'Extended workout detected. Add an extra 20g protein to your next meal.', icon: 'heart' },
  { tip: 'Long session done. Banana + handful of peanuts is the perfect quick recovery snack.', icon: 'heart' },
]

/**
 * Returns a recovery tip based on last workout type and duration.
 * @param {Object} lastWorkout - { name, type, duration_min }
 * @returns {{ tip: string, icon: string }}
 */
export function getRecoveryTip(lastWorkout) {
  if (!lastWorkout) {
    return { tip: 'No recent workout logged. When you\u2019re ready, start with a warm-up walk.', icon: 'activity' }
  }

  const seed = hourSlot()
  const group = classifyWorkout(lastWorkout.name || lastWorkout.type)
  const durationMin = lastWorkout.duration_min || 0

  if (durationMin >= 60 && seed % 3 === 0) {
    return pick(LONG_SESSION_TIPS, seed)
  }

  const allTips = getRecoveryTips()
  const tips = allTips[group] || allTips.full
  return pick(tips, seed)
}

// ---------------------------------------------------------------------------
// getWeeklyInsight (two formats)
// ---------------------------------------------------------------------------

// Status-tagged templates for HealthScreen backward compatibility
const WEEKLY_WORKOUT_LINES = [
  (w) => ({ label: `${w} workout${w > 1 ? 's' : ''} logged \u2014 ${w >= 5 ? 'beast mode!' : w >= 3 ? 'on track for your goal' : 'every rep counts'}`, status: w >= 3 ? 'good' : 'neutral' }),
  (w) => ({ label: `${w} session${w > 1 ? 's' : ''} completed this week`, status: w >= 3 ? 'good' : 'neutral' }),
]

// ---------------------------------------------------------------------------
// Starter insights for new users (no tracking data yet)
// ---------------------------------------------------------------------------
const STARTER_TIPS_GENERAL = [
  { label: 'Start by logging your first meal to track nutrition', status: 'neutral' },
  { label: 'Set a daily step goal to stay active throughout the day', status: 'neutral' },
  { label: 'Aim for 7\u20139 hours of sleep for optimal recovery', status: 'good' },
  { label: 'Consistency matters more than intensity \u2014 build habits slowly', status: 'good' },
  { label: 'Drink at least 8 glasses of water daily', status: 'neutral' },
  { label: 'Try to move for at least 30 minutes each day', status: 'neutral' },
]

const STARTER_TIPS_BY_GOAL = {
  weight_loss: [
    { label: 'Track your meals to maintain a calorie deficit', status: 'attention' },
    { label: 'Combine cardio with strength training for best results', status: 'good' },
    { label: 'Focus on protein to stay full and preserve muscle', status: 'neutral' },
  ],
  muscle_gain: [
    { label: 'Aim for 1.6\u20132.2g protein per kg of bodyweight', status: 'attention' },
    { label: 'Progressive overload is key \u2014 increase weights gradually', status: 'good' },
    { label: 'Rest days are when your muscles actually grow', status: 'neutral' },
  ],
  general_fitness: [
    { label: 'Mix cardio, strength, and flexibility for balanced fitness', status: 'good' },
    { label: 'Start with 3\u20134 workouts per week and build up', status: 'neutral' },
    { label: 'Track your progress to stay motivated', status: 'neutral' },
  ],
  endurance: [
    { label: 'Build a base with steady-state cardio before adding intervals', status: 'good' },
    { label: 'Fuel properly \u2014 complex carbs are your friend', status: 'neutral' },
    { label: 'Increase weekly distance by no more than 10%', status: 'attention' },
  ],
}

// ---------------------------------------------------------------------------
// Stage 2: Sparse Data (1-7 days) — mix real data with educational tips
// ---------------------------------------------------------------------------
const SPARSE_EDUCATION_TIPS = {
  nutrition: [
    { label: 'Track your meals to understand your eating patterns', status: 'neutral' },
    { label: 'Protein at every meal supports muscle recovery', status: 'neutral' },
    { label: 'Eating within 30 min post-workout maximises recovery', status: 'good' },
  ],
  sleep: [
    { label: 'Consistent sleep schedules improve recovery by 23%', status: 'neutral' },
    { label: 'Blue light before bed reduces melatonin — try a book instead', status: 'neutral' },
    { label: 'Even 20 min extra sleep boosts next-day performance', status: 'good' },
  ],
  activity: [
    { label: 'A 10-minute walk after meals improves digestion and blood sugar', status: 'neutral' },
    { label: 'Morning sunlight + movement resets your circadian rhythm', status: 'good' },
    { label: 'Active recovery days (walking, stretching) prevent burnout', status: 'neutral' },
  ],
}

function _getSparseInsights(profile, dailyData) {
  const d = dayOfYear()
  const items = []

  // Use whatever real data exists
  if (dailyData?.calories > 0) {
    const proteinVal = dailyData.protein || 0
    if (proteinVal > 0) {
      items.push({ label: `Nice! You hit ${proteinVal}g protein today. Keep it up`, status: 'good' })
    } else {
      items.push({ label: `${dailyData.calories} kcal logged today — tracking is the first step`, status: 'good' })
    }
  } else {
    items.push(SPARSE_EDUCATION_TIPS.nutrition[d % SPARSE_EDUCATION_TIPS.nutrition.length])
  }

  if (dailyData?.sleep > 0) {
    const hrs = dailyData.sleep
    const status = hrs >= 7 && hrs <= 9 ? 'good' : hrs >= 6 ? 'neutral' : 'attention'
    items.push({ label: `${hrs} hours last night. The sweet spot is 7–9h`, status })
  } else {
    items.push(SPARSE_EDUCATION_TIPS.sleep[d % SPARSE_EDUCATION_TIPS.sleep.length])
  }

  if (dailyData?.steps > 0) {
    const stepGoal = dailyData.stepGoal || 10000
    const remaining = Math.max(0, stepGoal - dailyData.steps)
    if (remaining > 0) {
      items.push({ label: `${dailyData.steps.toLocaleString()} steps so far — ${remaining.toLocaleString()} more to hit your goal`, status: 'neutral' })
    } else {
      items.push({ label: `${dailyData.steps.toLocaleString()} steps — goal smashed! Keep moving`, status: 'good' })
    }
  } else {
    items.push(SPARSE_EDUCATION_TIPS.activity[d % SPARSE_EDUCATION_TIPS.activity.length])
  }

  if (dailyData?.workouts > 0) {
    items.push({ label: `Great first workout! Try for 3 sessions this week`, status: 'good' })
  } else {
    // Add a goal-specific tip
    const goalKey = profile?.goal?.toLowerCase?.()?.replace(/\s+/g, '_') || 'general_fitness'
    const goalTips = STARTER_TIPS_BY_GOAL[goalKey] || STARTER_TIPS_BY_GOAL.general_fitness
    items.push(goalTips[(d + 1) % goalTips.length])
  }

  return items.slice(0, 4)
}

// ---------------------------------------------------------------------------
// Stage 1: No Data (Day 0) — actionable prompts & educational tips
// ---------------------------------------------------------------------------
const STAGE1_PROMPTS = [
  { label: 'Log your first meal to start tracking nutrition', status: 'neutral', action: 'log_meal' },
  { label: 'Track tonight\'s sleep to start building your sleep profile', status: 'neutral', action: 'log_sleep' },
  { label: 'Take a 10-minute walk today — every step counts', status: 'good', action: 'log_steps' },
  { label: 'Consistent sleep schedules improve recovery by 23%', status: 'good' },
  { label: 'Set your step goal to stay motivated', status: 'neutral', action: 'set_step_goal' },
  { label: 'Drinking water before meals helps control portions', status: 'neutral' },
]

function _getStage1Insights(profile) {
  const d = dayOfYear()
  const items = []

  // Always start with an actionable prompt
  items.push(STAGE1_PROMPTS[d % 3]) // Rotate between meal, sleep, steps prompts

  // Add goal-specific advice
  const goalKey = profile?.goal?.toLowerCase?.()?.replace(/\s+/g, '_') || 'general_fitness'
  const goalTips = STARTER_TIPS_BY_GOAL[goalKey] || STARTER_TIPS_BY_GOAL.general_fitness
  items.push(goalTips[d % goalTips.length])

  // Add weight-based tip if available
  if (profile?.weight && profile?.height) {
    const heightM = profile.height > 100 ? profile.height / 100 : profile.height
    const bmi = profile.weight / (heightM * heightM)
    if (bmi < 18.5) {
      items.push({ label: 'Focus on nutrient-dense meals to reach a healthy weight', status: 'attention' })
    } else if (bmi >= 25) {
      items.push({ label: 'Small daily calorie adjustments lead to sustainable results', status: 'neutral' })
    } else {
      items.push({ label: 'Your weight is in a healthy range — focus on staying active', status: 'good' })
    }
  } else {
    items.push(STAGE1_PROMPTS[3 + (d % 3)]) // Educational tip
  }

  // Fill last slot
  const remaining = 4 - items.length
  for (let i = 0; i < remaining; i++) {
    items.push(STARTER_TIPS_GENERAL[(d + i) % STARTER_TIPS_GENERAL.length])
  }

  return items.slice(0, 4)
}

/**
 * Progressive insight system — returns contextual insights based on data maturity.
 *
 * @param {Object} params
 * @param {Object} [params.profile] - { name, weight, height, goal, interests }
 * @param {Object} [params.dailyData] - { steps, calories, protein, sleep, workouts, stepGoal }
 * @param {Object} [params.weeklyData] - aggregated weekly stats (if available)
 * @param {number} [params.dataAge] - days since first activity (0 = no data)
 * @returns {Promise<{ weekLabel: string, items: Array<{ label: string, status: string, action?: string }> }>}
 */
export async function getProgressiveInsights({ profile, dailyData, weeklyData, dataAge }) {
  if (!dataAge || dataAge === 0) {
    return { weekLabel: 'Getting Started', items: _getStage1Insights(profile) }
  }
  if (dataAge <= 7) {
    return { weekLabel: 'Early Progress', items: _getSparseInsights(profile, dailyData) }
  }
  // Stage 3: rich data — delegate to existing getWeeklyInsight
  if (weeklyData) {
    const result = await getWeeklyInsight(weeklyData, profile)
    // getWeeklyInsight returns { title, insights } for rich data — normalize to { weekLabel, items }
    if (result.items) return result // already in starter format
    return {
      weekLabel: result.title || 'Your Week',
      items: (result.insights || []).map(label => ({ label, status: 'good' })),
    }
  }
  // Fallback: has been around 7+ days but no weekly data available yet
  return { weekLabel: 'Keep Going', items: _getSparseInsights(profile, dailyData) }
}

function _getStarterInsights(profile) {
  const d = dayOfYear()
  const items = []

  // Add weight-based tip if available
  if (profile?.weight && profile?.height) {
    const heightM = profile.height > 100 ? profile.height / 100 : profile.height
    const bmi = profile.weight / (heightM * heightM)
    if (bmi < 18.5) {
      items.push({ label: 'Focus on nutrient-dense meals to reach a healthy weight', status: 'attention' })
    } else if (bmi >= 25) {
      items.push({ label: 'Small daily calorie adjustments lead to sustainable results', status: 'neutral' })
    } else {
      items.push({ label: 'Your weight is in a healthy range \u2014 focus on staying active', status: 'good' })
    }
  }

  // Add goal-specific tips
  const goalKey = profile?.goal?.toLowerCase?.()?.replace(/\s+/g, '_') || 'general_fitness'
  const goalTips = STARTER_TIPS_BY_GOAL[goalKey] || STARTER_TIPS_BY_GOAL.general_fitness
  items.push(goalTips[d % goalTips.length])

  // Fill remaining slots from general tips (rotate daily)
  const remaining = 4 - items.length
  for (let i = 0; i < remaining; i++) {
    items.push(STARTER_TIPS_GENERAL[(d + i) % STARTER_TIPS_GENERAL.length])
  }

  return items.slice(0, 4)
}

/**
 * Generates a weekly trend summary.
 *
 * When called with no weeklyData (new user), returns personalized starter
 * tips based on profile data in { weekLabel, items } format.
 *
 * When called with weeklyData object, returns { title, insights } format.
 *
 * @param {Object} [weeklyData]
 * @param {Object} [profile] - { name, weight, height, goal, interests }
 * @returns {Promise<Object>}
 */
export async function getWeeklyInsight(weeklyData, profile) {
  // No tracking data yet — show personalized starter tips based on profile
  if (!weeklyData) {
    const items = _getStarterInsights(profile)
    return { weekLabel: 'Getting Started', items }
  }

  // New rich format
  const insights = []
  const d = dayOfYear()

  const w = weeklyData.workouts || 0
  if (w > 0) {
    insights.push(pick(WEEKLY_WORKOUT_LINES, d)(w).label)
  } else {
    insights.push('No workouts logged this week. Fresh start tomorrow?')
  }

  if (weeklyData.avgCalories) {
    insights.push(`Avg ${weeklyData.avgCalories.toLocaleString()} kcal/day.`)
  }

  if (weeklyData.totalCalories) {
    const food = FOOD_REFS[getRegion()] || FOOD_REFS.international
    const count = Math.round(weeklyData.totalCalories / food.snackCal)
    insights.push(`Total burn: ${weeklyData.totalCalories.toLocaleString()} kcal \u2014 that\u2019s about ${count} ${food.snack} worth.`)
  }

  if (typeof weeklyData.stepsPctChange === 'number') {
    const dir = weeklyData.stepsPctChange >= 0 ? 'up' : 'down'
    insights.push(`Steps ${dir} ${Math.abs(weeklyData.stepsPctChange)}% vs last week.`)
  }

  if (weeklyData.proteinAvg) {
    const lines = [
      `Avg protein: ${weeklyData.proteinAvg}g/day. ${weeklyData.proteinAvg >= 80 ? 'Hitting targets.' : 'Try adding an extra egg or curd serving.'}`,
      `${weeklyData.proteinAvg}g protein daily \u2014 ${weeklyData.proteinAvg >= 100 ? 'excellent intake.' : `room to grow. Try more ${getProteinFood()}.`}`,
    ]
    insights.push(pick(lines, d))
  }

  if (weeklyData.topWorkout) {
    insights.push(`Most frequent: ${weeklyData.topWorkout}.`)
  }

  if (weeklyData.streak && weeklyData.streak >= 7) {
    insights.push(`${weeklyData.streak}-day streak! You\u2019re building a real habit.`)
  }

  return {
    title: 'Your Week',
    insights: insights.slice(0, 4),
  }
}
