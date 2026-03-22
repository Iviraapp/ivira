import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const ThemeContext = createContext()

const THEMES = {
  dark: {
    // Backgrounds
    bg: '#000000', bgSec: '#111111', bgTer: '#1A1A1A', bgHover: '#222222',
    bgInput: '#111111',
    // Text — white at full opacity, secondary at 60%
    text: '#FFFFFF', textSec: 'rgba(255,255,255,0.6)', textTer: 'rgba(255,255,255,0.4)',
    // Monochrome accent for general UI
    accent: '#FFFFFF', accentSoft: 'rgba(255,255,255,0.08)',
    // Brand purple — ONLY for active nav + primary CTA buttons
    brandAccent: '#7C3AED', brandAccentSoft: 'rgba(124,58,237,0.12)',
    // Status colors
    green: '#34A853', amber: '#FBBC05', red: '#EA4335', cyan: '#4285F4',
    // Borders
    border: '#262626', borderFocus: 'rgba(255,255,255,0.3)',
    borderStrong: '#333333',
    // Brand gradient (logo only)
    grad: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
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
    // Backgrounds
    bg: '#FFFFFF', bgSec: '#F8F9FA', bgTer: '#F1F3F4', bgHover: '#E8EAED',
    bgInput: '#F8F9FA',
    // Text — black at full opacity, secondary at 60%
    text: '#000000', textSec: 'rgba(0,0,0,0.6)', textTer: 'rgba(0,0,0,0.4)',
    // Monochrome accent for general UI
    accent: '#000000', accentSoft: 'rgba(0,0,0,0.05)',
    // Brand purple — ONLY for active nav + primary CTA buttons
    brandAccent: '#7C3AED', brandAccentSoft: 'rgba(124,58,237,0.08)',
    // Status colors
    green: '#34A853', amber: '#FBBC05', red: '#EA4335', cyan: '#4285F4',
    // Borders
    border: '#E5E7EB', borderFocus: 'rgba(0,0,0,0.2)',
    borderStrong: '#D1D5DB',
    // Brand gradient (logo only)
    grad: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
    // Preview
    previewBg: '#ffffff', previewText: '#333',
    // Navigation
    navBg: 'rgba(255,255,255,0.95)', sidebarBg: '#FFFFFF',
    // Status
    statusActive: '#34A853', statusExpired: '#EA4335', statusInactive: 'rgba(0,0,0,0.4)',
    // Card & brand
    cardBg: '#FFFFFF', brandLight: '#F8FAFC',
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
