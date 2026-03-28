import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const ThemeContext = createContext()

// Instantly.ai-inspired blue mesh gradient for light mode backgrounds
const MESH_GRADIENT = `
  radial-gradient(ellipse 80% 60% at 10% 20%, rgba(99,132,255,0.28), transparent 55%),
  radial-gradient(ellipse 70% 50% at 80% 10%, rgba(120,160,255,0.22), transparent 50%),
  radial-gradient(ellipse 60% 80% at 50% 80%, rgba(150,130,255,0.18), transparent 55%),
  radial-gradient(ellipse 90% 60% at 90% 60%, rgba(100,170,255,0.15), transparent 50%),
  linear-gradient(135deg, #e8eeff 0%, #dce4fc 25%, #d0dcfa 50%, #c8d8f8 75%, #e0e8ff 100%)
`
const MESH_GRADIENT_DARK = `
  radial-gradient(ellipse 80% 60% at 10% 20%, rgba(16,185,129,0.20), transparent 55%),
  radial-gradient(ellipse 70% 50% at 80% 10%, rgba(59,130,246,0.12), transparent 50%),
  radial-gradient(ellipse 60% 80% at 50% 80%, rgba(99,102,241,0.10), transparent 55%),
  linear-gradient(135deg, #050508 0%, #0A0A14 50%, #080812 100%)
`

const THEMES = {
  dark: {
    // Backgrounds
    bg: '#000000', bgSec: '#111111', bgTer: '#1A1A1A', bgHover: '#222222',
    bgInput: '#111111',
    bgMesh: MESH_GRADIENT_DARK,
    // Text — white at full opacity, secondary at 60%
    text: '#FFFFFF', textSec: 'rgba(255,255,255,0.6)', textTer: 'rgba(255,255,255,0.4)',
    // Monochrome accent for general UI
    accent: '#FFFFFF', accentSoft: 'rgba(255,255,255,0.08)',
    // Brand blue — ONLY for active nav + primary CTA buttons
    brandAccent: '#10B981', brandAccentSoft: 'rgba(16,185,129,0.15)',
    // Status colors
    green: '#34A853', amber: '#FBBC05', red: '#EA4335', cyan: '#4285F4',
    // Borders
    border: '#262626', borderFocus: 'rgba(255,255,255,0.3)',
    borderStrong: '#333333',
    // Brand gradient (logo only)
    grad: 'linear-gradient(135deg, #10B981, #3B82F6)',
    // Preview
    previewBg: '#ffffff', previewText: '#333',
    // Navigation
    navBg: 'rgba(0,0,0,0.92)', sidebarBg: '#000000',
    // Status
    statusActive: '#34A853', statusExpired: '#EA4335', statusInactive: 'rgba(255,255,255,0.4)',
    // Card & brand
    cardBg: '#121212', brandDark: '#050505',
  },
  light: {
    // Backgrounds — soft blue tints inspired by Instantly.ai
    bg: '#F4F7FF', bgSec: '#EEF2FF', bgTer: '#E8EDFF', bgHover: '#DDE5FF',
    bgInput: '#FFFFFF',
    bgMesh: MESH_GRADIENT,
    // Text
    text: '#0F172A', textSec: '#475569', textTer: '#94A3B8',
    // Monochrome accent for general UI
    accent: '#10B981', accentSoft: 'rgba(16,185,129,0.08)',
    // Brand blue — ONLY for active nav + primary CTA buttons
    brandAccent: '#10B981', brandAccentSoft: 'rgba(16,185,129,0.08)',
    // Status colors
    green: '#34A853', amber: '#FBBC05', red: '#EA4335', cyan: '#4285F4',
    // Borders
    border: 'rgba(16,185,129,0.12)', borderFocus: 'rgba(16,185,129,0.3)',
    borderStrong: 'rgba(16,185,129,0.18)',
    // Brand gradient
    grad: 'linear-gradient(135deg, #10B981, #3B82F6)',
    // Preview
    previewBg: '#ffffff', previewText: '#333',
    // Navigation
    navBg: 'rgba(255,255,255,0.85)', sidebarBg: '#F8FAFF',
    // Status
    statusActive: '#34A853', statusExpired: '#EA4335', statusInactive: '#94A3B8',
    // Card & brand
    cardBg: 'rgba(255,255,255,0.85)', brandLight: '#F8FAFC',
  },
}

// Density multipliers for padding/gaps
const DENSITY = {
  compact: 1,
  roomy: 1.5,
}

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('ivira_theme') || 'system')
  const [density, setDensity] = useState(() => localStorage.getItem('ivira_density') || 'compact')
  const [tick, setTick] = useState(0)
  const resolved = mode === 'system' ? getSystemTheme() : mode
  const theme = THEMES[resolved] || THEMES.dark
  const dMul = DENSITY[density] || 1

  useEffect(() => {
    localStorage.setItem('ivira_theme', mode)
  }, [mode])

  useEffect(() => {
    localStorage.setItem('ivira_density', density)
  }, [density])

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => setTick(t => t + 1) // force re-render when system theme changes
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  // Sync document root class and color-scheme with resolved theme
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(resolved)
    root.style.colorScheme = resolved
  }, [resolved])

  // Spacing helper: returns px value scaled by density
  const sp = useMemo(() => {
    return (base) => Math.round(base * dMul)
  }, [dMul])

  return (
    <ThemeContext.Provider value={{
      mode, setMode, resolved, theme, isDark: resolved === 'dark',
      density, setDensity, dMul, sp,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
