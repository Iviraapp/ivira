// Sleep Tracker constants, colors, config
export const SLEEP_COLORS = {
  primary: '#6C63FF',
  primaryGlow: 'rgba(108,99,255,0.25)',
  primaryDark: 'rgba(108,99,255,0.12)',
  deep: '#3D348B',
  light: '#A5A0FF',
  rem: '#6C63FF',
  awake: '#FF6B6B',
  moon: '#FFD93D',
  star: '#FFE169',
  debtGreen: '#22C55E',
  debtAmber: '#F59E0B',
  debtRed: '#EF4444',
}

export const STAGE_Y = { awake: 10, rem: 35, light: 65, deep: 95 }
export const STAGE_FILL = {
  awake: SLEEP_COLORS.awake,
  rem: SLEEP_COLORS.rem,
  light: SLEEP_COLORS.light,
  deep: SLEEP_COLORS.deep,
}

export const QUALITY_EMOJIS = ['😫', '😴', '😐', '🙂', '😊']
export const QUALITY_LABELS = ['Terrible', 'Poor', 'Fair', 'Good', 'Great']

export const STORAGE_KEY_LOGS = 'ivira_sleep_logs'
export const STORAGE_KEY_GOAL = 'ivira_sleep_goal'
export const STORAGE_KEY_TAGS = 'ivira_sleep_tags'

export const SLEEP_TAGS = [
  { id: 'caffeine', label: 'Caffeine', icon: 'coffee', color: '#8B5CF6' },
  { id: 'alcohol', label: 'Alcohol', icon: 'droplet', color: '#F59E0B' },
  { id: 'exercise', label: 'Exercise', icon: 'activity', color: '#22C55E' },
  { id: 'stress', label: 'Stress', icon: 'alert-circle', color: '#EF4444' },
  { id: 'late_meal', label: 'Late Meal', icon: 'sunset', color: '#F97316' },
  { id: 'screen', label: 'Screen Time', icon: 'smartphone', color: '#3B82F6' },
  { id: 'melatonin', label: 'Melatonin', icon: 'moon', color: '#A78BFA' },
  { id: 'travel', label: 'Travel', icon: 'navigation', color: '#06B6D4' },
]

export const SOUNDSCAPES = [
  { id: 'rain', label: 'Rain', icon: 'cloud-rain', color: '#3B82F6' },
  { id: 'ocean', label: 'Ocean', icon: 'droplet', color: '#06B6D4' },
  { id: 'white_noise', label: 'White Noise', icon: 'volume-2', color: '#8B5CF6' },
  { id: 'forest', label: 'Forest', icon: 'feather', color: '#22C55E' },
  { id: 'wind', label: 'Wind', icon: 'wind', color: '#94A3B8' },
  { id: 'fire', label: 'Fireplace', icon: 'zap', color: '#F97316' },
]

export const SLEEP_TIPS = [
  { icon: 'smartphone', title: 'No screens 1hr before bed', desc: 'Blue light suppresses melatonin' },
  { icon: 'thermometer', title: 'Cool room 18-20°C', desc: 'A cool room improves sleep onset' },
  { icon: 'coffee', title: 'No caffeine after 2 PM', desc: 'Caffeine half-life is 5-6 hours' },
  { icon: 'sun', title: 'Morning sunlight', desc: '10 min of sun sets your circadian rhythm' },
  { icon: 'moon', title: 'Consistent schedule', desc: 'Same bed/wake time, even weekends' },
  { icon: 'wind', title: '4-7-8 breathing', desc: 'Breathe in 4s, hold 7s, exhale 8s' },
]
