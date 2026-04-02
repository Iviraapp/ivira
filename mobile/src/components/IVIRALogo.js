/**
 * IVIRA Logo Component v2 — fixed viewBox + clipping
 * Style: Stacked · Supertitle
 * Font: Bebas Neue + Plus Jakarta Sans
 * Accent: #00e5a0
 *
 * Usage:
 *   <IVIRALogo />                         — dark, full lockup
 *   <IVIRALogo variant="light" />         — light version
 *   <IVIRALogo size="sm" showTagline={false} />  — header compact
 *   <IVIRAWordmark />                     — inline iVIRA header mark
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const SIZES = {
  sm: { super: 8,  vira: 30, tagline: 8,  gap: 2,  superSpacing: 4,  viraSpacing: 1.5 },
  md: { super: 11, vira: 48, tagline: 10, gap: 4,  superSpacing: 6,  viraSpacing: 2   },
  lg: { super: 14, vira: 64, tagline: 12, gap: 6,  superSpacing: 8,  viraSpacing: 3   },
}

const VARIANTS = {
  dark: {
    accent:   '#00e5a0',
    wordmark: '#f0f2f8',
    tagline:  'rgba(240,242,248,0.38)',
    ghost:    'rgba(240,242,248,0.15)',
  },
  light: {
    accent:   '#00b37a',
    wordmark: '#07080f',
    tagline:  'rgba(7,8,15,0.38)',
    ghost:    'rgba(7,8,15,0.14)',
  },
  accent: {
    accent:   'rgba(7,8,15,0.55)',
    wordmark: '#07080f',
    tagline:  'rgba(7,8,15,0.45)',
    ghost:    'rgba(7,8,15,0.2)',
  },
}

export default function IVIRALogo({
  variant = 'dark',
  size = 'md',
  showTagline = true,
  showSupertitle = true,
  style,
}) {
  const sz = SIZES[size] || SIZES.md
  const c  = VARIANTS[variant] || VARIANTS.dark

  return (
    <View style={[styles.root, style]}>
      {showSupertitle && (
        <Text style={[styles.supertitle, {
          fontSize:      sz.super,
          letterSpacing: sz.superSpacing,
          color:         c.accent,
          marginBottom:  sz.gap,
        }]}>
          YOU ARE THE
        </Text>
      )}

      <Text style={[styles.vira, {
        fontSize:      sz.vira,
        letterSpacing: sz.viraSpacing,
        color:         c.wordmark,
        lineHeight:    sz.vira * 1.05,
      }]}>
        VIRA
      </Text>

      {showTagline && (
        <Text style={[styles.tagline, {
          fontSize:    sz.tagline,
          color:       c.tagline,
          marginTop:   sz.gap,
        }]}>
          TRAIN. PROVE. LEAD.
        </Text>
      )}
    </View>
  )
}

// ─── Inline header wordmark ──────────────────────────────────
export function IVIRAWordmark({ variant = 'dark', size = 'md', style }) {
  const sz = SIZES[size] || SIZES.md
  const c  = VARIANTS[variant] || VARIANTS.dark
  const fs = sz.vira * 0.72

  return (
    <View style={[styles.wordmarkRow, style]}>
      <Text style={[styles.wordmarkI, { fontSize: fs, color: c.ghost, lineHeight: fs * 1.05 }]}>
        i
      </Text>
      <Text style={[styles.wordmarkVIRA, { fontSize: fs, color: c.wordmark, letterSpacing: sz.viraSpacing, lineHeight: fs * 1.05 }]}>
        VIRA
      </Text>
    </View>
  )
}

// ─── Splash screen ───────────────────────────────────────────
export function IVIRASplash({ variant = 'dark' }) {
  return (
    <View style={styles.splashRoot}>
      <IVIRALogo variant={variant} size="lg" showTagline showSupertitle />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'flex-start',
  },
  supertitle: {
    fontFamily:    'BebasNeue_400Regular',
    textTransform: 'uppercase',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  vira: {
    fontFamily:         'BebasNeue_400Regular',
    includeFontPadding: false,
    textAlignVertical:  'center',
  },
  tagline: {
    fontFamily:         'PlusJakartaSans_500Medium',
    letterSpacing:      3.5,
    textTransform:      'uppercase',
    includeFontPadding: false,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
  },
  wordmarkI: {
    fontFamily:         'BebasNeue_400Regular',
    includeFontPadding: false,
  },
  wordmarkVIRA: {
    fontFamily:         'BebasNeue_400Regular',
    includeFontPadding: false,
  },
  splashRoot: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
})

/**
 * INSTALL BEBAS NEUE IN EXPO
 * ──────────────────────────
 * npx expo install @expo-google-fonts/bebas-neue
 *
 * Then in App.js add to useFonts():
 *   import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
 *   ...
 *   useFonts({ BebasNeue_400Regular, ...rest })
 *
 * IMPORTANT — includeFontPadding: false
 * ──────────────────────────────────────
 * Always set includeFontPadding: false on Android for Bebas Neue.
 * Without it, Android adds extra top padding that breaks alignment.
 *
 * BRAND COLORS
 * ────────────
 * Emerald (dark bg)   #00e5a0
 * Emerald (light bg)  #00b37a
 * Background          #07080f
 * White text          #f0f2f8
 * Dark text           #07080f
 */
