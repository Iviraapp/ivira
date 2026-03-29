// IVIRA Design System v3.0 — Premium Health & Fitness
// Rich surfaces, deliberate type hierarchy, unified color semantics

export const COLORS = {
  bg: '#0A0E1A',        // Rich ink
  bgSec: '#111827',     // Card surface
  bgTer: '#1A2236',     // Tertiary surface
  bgHover: '#1F2A40',   // Pressed states
  text: '#F8FAFC',      // Warm white
  textSec: '#94A3B8',   // Slate-400
  textTer: 'rgba(248,250,252,0.50)',
  border: 'rgba(148,163,184,0.08)',
  borderStrong: 'rgba(148,163,184,0.16)',
  accent: '#3B82F6',    // IVIRA Blue
  accentSoft: 'rgba(59,130,246,0.12)',
  accentGlow: 'rgba(59,130,246,0.25)',
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
  md: 20,
  lg: 28,
  xl: 32,
  xxl: 48,
}

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
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
  accent: '#3B82F6',
  accentSoft: 'rgba(59,130,246,0.08)',
  accentGlow: 'rgba(59,130,246,0.12)',
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

// Elite card presets (Premium Glass — depth via shadow, no borders)
export const ELITE_CARD = {
  backgroundColor: 'rgba(17, 24, 39, 0.65)',
  borderRadius: 22,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 6,
}

// Glass card with blue accent glow (shadow replaces border)
export const GLASS_CARD = {
  backgroundColor: 'rgba(59,130,246,0.06)',
  borderRadius: 22,
  shadowColor: 'rgba(59,130,246,0.35)',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 12,
  elevation: 4,
}

// Feature action card presets (shadow depth, no borders)
export const ACTION_CARDS = {
  emerald: {
    backgroundColor: 'rgba(59,130,246,0.10)',
    shadowColor: 'rgba(59,130,246,0.30)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  purple: {
    backgroundColor: 'rgba(139,92,246,0.10)',
    shadowColor: 'rgba(139,92,246,0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  amber: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    shadowColor: 'rgba(245,158,11,0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  cyan: {
    backgroundColor: 'rgba(6,182,212,0.10)',
    shadowColor: 'rgba(6,182,212,0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  orange: {
    backgroundColor: 'rgba(249,115,22,0.10)',
    shadowColor: 'rgba(249,115,22,0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  red: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    shadowColor: 'rgba(239,68,68,0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
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
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#E11D48', // Rose
]

// Active card glow — IVIRA Blue
export const ELITE_GLOW = {
  shadowColor: '#3B82F6',
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

// Shadow / Elevation system (richer depth for dark UI)
export const SHADOW = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 10 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 32, elevation: 16 },
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
