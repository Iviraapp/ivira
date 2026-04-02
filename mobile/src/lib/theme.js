// IVIRA Design System v4.0 — Premium Revamp
// Accent: Emerald #00E5A0 | Display: Plus Jakarta Sans | Numbers: Inter

export const COLORS = {
  bg:           '#07080F',
  bgSec:        '#0E1018',
  bgTer:        '#13161F',
  bgHover:      '#181C27',
  text:         '#F0F2F8',
  textSec:      'rgba(240,242,248,0.55)',
  textTer:      'rgba(240,242,248,0.28)',
  border:       'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  accent:       '#00E5A0',   // Emerald — primary brand
  accentSoft:   'rgba(0,229,160,0.10)',
  accentGlow:   'rgba(0,229,160,0.20)',
  purple:       '#6C63FF',   // Circles / social
  purpleSoft:   'rgba(108,99,255,0.12)',
  orange:       '#F97316',   // Steps / activity
  orangeSoft:   'rgba(249,115,22,0.12)',
  sleep:        '#6C63FF',
  nutrition:    '#00E5A0',
  danger:       '#FF4D6D',
  warn:         '#FFB547',
  green:        '#00E5A0',
  amber:        '#FFB547',
  red:          '#FF4D6D',
  cyan:         '#38BDF8',
}

export const COLORS_LIGHT = {
  bg:           '#F7F5F2',
  bgSec:        '#FFFFFF',
  bgTer:        '#EDE9E3',
  bgHover:      '#E5E0D8',
  text:         '#0F172A',
  textSec:      '#64748B',
  textTer:      'rgba(15,23,42,0.40)',
  border:       'rgba(15,23,42,0.06)',
  borderStrong: 'rgba(15,23,42,0.12)',
  accent:       '#00B37A',
  accentSoft:   'rgba(0,179,122,0.08)',
  accentGlow:   'rgba(0,179,122,0.15)',
  purple:       '#5B53EF',
  purpleSoft:   'rgba(91,83,239,0.10)',
  orange:       '#EA6E00',
  orangeSoft:   'rgba(234,110,0,0.10)',
  sleep:        '#5B53EF',
  nutrition:    '#00B37A',
  danger:       '#E0003B',
  warn:         '#D97706',
  green:        '#00B37A',
  amber:        '#D97706',
  red:          '#E0003B',
  cyan:         '#0284C7',
}

export const FONT = {
  regular:      'PlusJakartaSans_400Regular',
  medium:       'PlusJakartaSans_500Medium',
  semibold:     'PlusJakartaSans_600SemiBold',
  bold:         'PlusJakartaSans_700Bold',
  extraBold:    'PlusJakartaSans_800ExtraBold',
  numRegular:   'Inter_400Regular',
  numMedium:    'Inter_500Medium',
  numSemibold:  'Inter_600SemiBold',
  numBold:      'Inter_700Bold',
  numExtraBold: 'Inter_800ExtraBold',
  numBlack:     'Inter_900Black',
  mono:         'SpaceMono_700Bold',
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
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 9999,
}

export const SHADOW = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 6,  elevation: 3 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 20, elevation: 10 },
}

export const CARD = {
  backgroundColor: '#13161F',
  borderRadius: 20,
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.07)',
}

export const CARD_LIGHT = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderWidth: 0.5,
  borderColor: 'rgba(15,23,42,0.07)',
  ...SHADOW.sm,
}

export const FEATURE = {
  sleep:     '#6C63FF',
  activity:  '#F97316',
  fasting:   '#8B5CF6',
  nutrition: '#00E5A0',
  heart:     '#FF4D6D',
  steps:     '#F97316',
  hydration: '#38BDF8',
  circles:   '#6C63FF',
}

export const STATUS = {
  success: { dark: '#00E5A0', light: '#00B37A' },
  warning: { dark: '#FFB547', light: '#D97706' },
  error:   { dark: '#FF4D6D', light: '#E0003B' },
  info:    { dark: '#38BDF8', light: '#0284C7' },
}

// Backward-compatible aliases — used by 26+ existing screens
export const ELITE_CARD = { ...CARD, ...SHADOW.md }
export const ELITE_CARD_LIGHT = { ...CARD_LIGHT, ...SHADOW.md }
export const ELITE_GLOW = { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 }
export const GLASS_CARD = { ...CARD, backgroundColor: 'rgba(19,22,31,0.85)' }
export const CARD_ACCENTS = [COLORS.accent, COLORS.purple, COLORS.orange, COLORS.cyan, COLORS.red, COLORS.amber]
export const METABOLIC = { activity: FEATURE.activity, fasting: FEATURE.fasting, nutrition: FEATURE.nutrition, sleep: FEATURE.sleep, heart: FEATURE.heart }
