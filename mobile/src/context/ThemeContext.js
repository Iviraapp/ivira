import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { getItem, setItem } from '../lib/storage'
import { COLORS, COLORS_LIGHT, ELITE_CARD, ELITE_CARD_LIGHT, ELITE_GLOW } from '../lib/theme'

const STORAGE_KEY = 'ivira_theme_mode'
const MODES = ['dark', 'light', 'auto'] // auto = time-based (dark at night, light during day)

// Time-based theme: 6 AM - 6 PM = light, 6 PM - 6 AM = dark
function getTimeBasedScheme() {
  const hour = new Date().getHours()
  return (hour >= 6 && hour < 18) ? 'light' : 'dark'
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('auto')
  const [timeScheme, setTimeScheme] = useState(getTimeBasedScheme())

  useEffect(() => {
    getItem(STORAGE_KEY).then(stored => {
      if (stored && MODES.includes(stored)) setModeState(stored)
    }).catch(() => {})
  }, [])

  // Update time-based scheme every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeScheme(getTimeBasedScheme())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const setMode = (newMode) => {
    if (!MODES.includes(newMode)) return
    setModeState(newMode)
    setItem(STORAGE_KEY, newMode).catch(() => {})
  }

  const resolvedScheme = mode === 'auto' ? timeScheme : mode
  const isDark = resolvedScheme === 'dark'

  const value = {
    mode,
    setMode,
    resolvedScheme,
    isDark,
    colors: isDark ? COLORS : COLORS_LIGHT,
    card: isDark ? ELITE_CARD : ELITE_CARD_LIGHT,
    glow: ELITE_GLOW,
  }

  // Always render — use computed value even before storage loads.
  // The default 'system' mode is correct for first render.
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return {
      mode: 'system', setMode: () => {}, resolvedScheme: 'dark', isDark: true,
      colors: COLORS || {},
      card: ELITE_CARD || {},
      glow: ELITE_GLOW || {},
    }
  }
  return ctx
}
