/**
 * ThemeToggle — drop into ProfileScreen settings section
 *
 * Usage:
 *   import ThemeToggle from '../components/ThemeToggle'
 *   <ThemeToggle />
 */

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { COLORS, FONT, RADIUS, SPACING } from '../lib/theme'
import Haptics from '../lib/haptics'

const OPTIONS = [
  { id: 'light',  label: 'Light',  icon: 'sun'         },
  { id: 'system', label: 'Auto',   icon: 'smartphone'  },
  { id: 'dark',   label: 'Dark',   icon: 'moon'        },
]

export default function ThemeToggle() {
  const { mode, setMode, colors, isDark } = useTheme()

  return (
    <View style={[s.row, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}>
      <View style={s.left}>
        <View style={[s.iconWrap, { backgroundColor: isDark ? 'rgba(108,99,255,0.15)' : 'rgba(91,83,239,0.1)' }]}>
          <Feather name={isDark ? 'moon' : 'sun'} size={16} color={isDark ? '#6C63FF' : '#5B53EF'} />
        </View>
        <Text style={[s.label, { color: colors.text }]}>Appearance</Text>
      </View>

      <View style={[s.segmented, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        {OPTIONS.map(opt => {
          const active = mode === opt.id
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.segment, active && { backgroundColor: COLORS.accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setMode(opt.id)
              }}
              activeOpacity={0.75}
            >
              <Feather
                name={opt.icon}
                size={13}
                color={active ? '#07080F' : colors.textTer}
              />
              <Text style={[s.segLabel, { color: active ? '#07080F' : colors.textTer }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   14,
    borderRadius:   RADIUS.lg,
    borderWidth:    0.5,
    marginBottom:   10,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    fontSize:   14,
    fontFamily: FONT.semibold,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius:  RADIUS.sm,
    borderWidth:   0.5,
    overflow:      'hidden',
    padding:       3,
    gap:           2,
  },
  segment: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: 10,
    paddingVertical:    6,
    borderRadius:   6,
  },
  segLabel: {
    fontSize:   11,
    fontFamily: FONT.semibold,
  },
})
