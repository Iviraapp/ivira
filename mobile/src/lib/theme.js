// IVIRA — COCA-inspired theme
export const COLORS = {
  bg: '#050505',       // Deep Obsidian
  bgSec: '#121212',    // Nero Grey (cards)
  bgTer: '#1A1A1A',
  bgHover: '#222222',
  text: '#FFFFFF',
  textSec: '#94A3B8',  // Slate-400
  textTer: 'rgba(255,255,255,0.60)',  // 60% white
  border: '#1E1E1E',
  borderStrong: '#2A2A2A',
  accent: '#0052FF',   // COCA Blue
  accentSoft: 'rgba(0,82,255,0.12)',
  accentGlow: 'rgba(0,82,255,0.3)',
  green: '#34A853',
  amber: '#FBBC05',
  red: '#EA4335',
  cyan: '#4285F4',
}

export const FONT = {
  // Plus Jakarta Sans — primary display/body
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
  // Inter — numerical data (steps, kcal, timers)
  numRegular: 'Inter_400Regular',
  numMedium: 'Inter_500Medium',
  numSemibold: 'Inter_600SemiBold',
  numBold: 'Inter_700Bold',
  numExtraBold: 'Inter_800ExtraBold',
  numBlack: 'Inter_900Black',
  mono: 'SpaceMono_700Bold',
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 24,
  full: 9999,
}

export const COLORS_LIGHT = {
  bg: '#F4F1EC',          // Warm parchment off-white
  bgSec: '#FFFFFF',       // Pure white cards
  bgTer: '#EDE9E3',       // Warm stone gray
  bgHover: '#E5E0D8',     // Pressed state
  text: '#1A1714',         // Near-black warm
  textSec: '#6B6560',      // Warm medium gray
  textTer: 'rgba(26,23,20,0.42)', // Warm muted
  border: 'rgba(0,0,0,0.06)',     // Ultra-subtle dividers
  borderStrong: 'rgba(0,0,0,0.10)',
  accent: '#0052FF',       // COCA Blue stays
  accentSoft: 'rgba(0,82,255,0.08)',
  accentGlow: 'rgba(0,82,255,0.12)',
  green: '#2D9F4E',
  amber: '#E5A100',
  red: '#DC3626',
  cyan: '#3B7FE3',
}

// Metabolic Gradient System
export const METABOLIC = {
  activity: '#F97316',      // Flame Orange
  activityGlow: 'rgba(249,115,22,0.3)',
  fasting: '#8B5CF6',       // Purple
  fastingGlow: 'rgba(139,92,246,0.3)',
  nutrition: '#14B8A6',     // Teal
  nutritionGlow: 'rgba(20,184,166,0.3)',
  steps: '#F97316',         // Flame Orange for movement
  stepsGlow: 'rgba(249,115,22,0.25)',
}

// Elite card presets (Glassmorphism)
export const ELITE_CARD = {
  backgroundColor: 'rgba(26, 26, 26, 0.8)',
  borderRadius: 24,
  borderWidth: 1.5,
  borderColor: 'rgba(255,255,255,0.12)',
}

export const ELITE_CARD_LIGHT = {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  borderWidth: 0,
  borderColor: 'transparent',
  // Soft warm shadow replaces borders in light mode
  shadowColor: 'rgba(26,23,20,0.08)',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 12,
  elevation: 3,
}

// Vibrant card accent palette — matches web CARD_ACCENTS
export const CARD_ACCENTS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#E11D48', // Rose
]

// Active card glow — COCA Blue
export const ELITE_GLOW = {
  shadowColor: '#0052FF',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 12,
}
