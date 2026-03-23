// Vira AI — Maximum Viewability Theme
// Golden Ratio spacing: φ = 1.618, base = 8
export const G = 8
export const PHI = 1.618
export const GR = {
  xs: Math.round(G),              // 8
  sm: Math.round(G * PHI),        // 13
  md: Math.round(G * PHI ** 2),   // 21
  lg: Math.round(G * PHI ** 3),   // 34
  xl: Math.round(G * PHI ** 4),   // 55
}

// Rule 1: Adaptive Glassmorphism
// Light: bg-white/70, Dark: bg-slate-950/70 + backdrop-blur-md
export const V_LIGHT = {
  bg: '#F8FAFC',                        // slate-50
  card: 'rgba(255,255,255,0.70)',       // bg-white/70
  cardSolid: '#FFFFFF',
  border: 'rgba(139,92,246,0.10)',      // violet-500/10
  text: '#0F172A',                      // slate-900
  textSec: '#475569',                   // slate-600
  textTer: '#94A3B8',                   // slate-400
}

export const V_DARK = {
  bg: '#020617',                        // slate-950
  card: 'rgba(2,6,23,0.70)',            // bg-slate-950/70
  cardSolid: '#0E0E1A',
  border: 'rgba(139,92,246,0.10)',      // violet-500/10
  text: '#F8FAFC',                      // slate-50
  textSec: 'rgba(248,250,252,0.60)',
  textTer: 'rgba(248,250,252,0.32)',
}

// Default: dark mode
export const V = {
  ...V_DARK,
  accent: '#8B5CF6',
  accentSoft: 'rgba(139,92,246,0.10)',
  accentGlow: 'rgba(139,92,246,0.25)',
  green: '#34D399', red: '#F87171', amber: '#FBBF24', teal: '#2DD4BF',
  blue: '#3B82F6',
  // User message border (Rule 4)
  userBorder: 'rgba(139,92,246,0.30)',  // violet-500/30
}

// Rule 1: Adaptive Glassmorphism factory — backdrop-blur-md (12px)
export const glass = (accent) => ({
  background: V.card,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${accent ? `${accent}18` : V.border}`,
  borderRadius: GR.md, // 21px — golden ratio
})

// Persona accent map
export const PERSONA = {
  mental_health: { accent: '#8B5CF6', label: 'Mental Wellness', tone: 'reflective' },
  hypertension:  { accent: '#3B82F6', label: 'Heart Health',    tone: 'instructional' },
  pharmacy:      { accent: '#14B8A6', label: 'Pharmacy',        tone: 'efficient' },
  general:       { accent: '#8B5CF6', label: 'General',         tone: 'supportive' },
}

export const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'dark thoughts',
  'hurt myself', 'self harm', 'chest pain', 'can\'t breathe', 'emergency',
  'heart attack', 'overdose',
]

export const CARD_ACCENTS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#06B6D4', '#10B981', '#6366F1', '#E11D48',
]

export const FONT = "'Inter', -apple-system, sans-serif"
export const FONT_D = "'Satoshi', 'Inter', -apple-system, sans-serif"
export const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"
