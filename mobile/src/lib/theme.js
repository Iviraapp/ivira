// IVIRA Design System v2.0 — Premium Health & Fitness
// Rich surfaces, deliberate type hierarchy, unified color semantics

export const COLORS = {
  bg: '#0A0E1A',        // Rich ink (was #050505)
  bgSec: '#111827',     // Card surface (was #121212)
  bgTer: '#1A2236',     // Tertiary (was #1A1A1A)
  bgHover: '#1F2A40',   // Pressed (was #222222)
  text: '#F8FAFC',      // Warm white (was #FFFFFF)
  textSec: '#94A3B8',   // Slate-400
  textTer: 'rgba(248,250,252,0.50)',
  border: 'rgba(148,163,184,0.08)',
  borderStrong: 'rgba(148,163,184,0.16)',
  accent: '#10B981',    // IVIRA Emerald
  accentSoft: 'rgba(16,185,129,0.12)',
  accentGlow: 'rgba(16,185,129,0.25)',
  green: '#34D399',     // Emerald-400
  amber: '#FBBF24',     // Amber-400
  red: '#F87171',       // Red-400
  cyan: '#38BDF8',      // Sky-400
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
  bg: '#F7F5F2',
  bgSec: '#FFFFFF',
  bgTer: '#EDE9E3',
  bgHover: '#E5E0D8',
  text: '#0F172A',
  textSec: '#64748B',
  textTer: 'rgba(15,23,42,0.40)',
  border: 'rgba(15,23,42,0.06)',
  borderStrong: 'rgba(15,23,42,0.12)',
  accent: '#10B981',
  accentSoft: 'rgba(16,185,129,0.08)',
  accentGlow: 'rgba(16,185,129,0.12)',
  green: '#16A34A',
  amber: '#D97706',
  red: '#DC2626',
  cyan: '#0284C7',
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

// Elite card presets (Premium Glass)
export const ELITE_CARD = {
  backgroundColor: 'rgba(17, 24, 39, 0.65)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(16,185,129,0.08)',
}

// Glass card with emerald accent glow
export const GLASS_CARD = {
  backgroundColor: 'rgba(16,185,129,0.06)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(16,185,129,0.15)',
}

// Feature action card presets
export const ACTION_CARDS = {
  emerald: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.20)',
  },
  purple: {
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderColor: 'rgba(139,92,246,0.15)',
  },
  amber: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.15)',
  },
  cyan: {
    backgroundColor: 'rgba(6,182,212,0.10)',
    borderColor: 'rgba(6,182,212,0.15)',
  },
  orange: {
    backgroundColor: 'rgba(249,115,22,0.10)',
    borderColor: 'rgba(249,115,22,0.15)',
  },
  red: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.12)',
  },
}

export const ELITE_CARD_LIGHT = {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  borderWidth: 0,
  borderColor: 'transparent',
  shadowColor: 'rgba(15,23,42,0.06)',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 16,
  elevation: 3,
}

// Vibrant card accent palette — 3px top border colors
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
  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 12,
}

// Typography Scale — use these for consistent hierarchy
export const TYPE = {
  displayLg: { fontFamily: 'Inter_800ExtraBold', fontSize: 48, lineHeight: 52 },
  displayMd: { fontFamily: 'Inter_700Bold', fontSize: 36, lineHeight: 40 },
  displaySm: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 32 },
  h1: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, lineHeight: 22 },
  bodyLg: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, lineHeight: 24 },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 18 },
  label: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, lineHeight: 18 },
  labelSm: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  numLg: { fontFamily: 'Inter_800ExtraBold', fontSize: 32, lineHeight: 36 },
  numMd: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 26 },
  numSm: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 20 },
}

// Shadow / Elevation system
export const SHADOW = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.20, shadowRadius: 24, elevation: 12 },
}

// Unified semantic status colors
export const STATUS = {
  success: { dark: '#34D399', light: '#16A34A' },
  warning: { dark: '#FBBF24', light: '#D97706' },
  error: { dark: '#F87171', light: '#DC2626' },
  info: { dark: '#38BDF8', light: '#0284C7' },
}

// Feature domain colors
export const FEATURE = {
  sleep: '#6C63FF',
  activity: '#F97316',
  fasting: '#8B5CF6',
  nutrition: '#14B8A6',
  heart: '#EF4444',
  steps: '#F97316',
  hydration: '#38BDF8',
}
