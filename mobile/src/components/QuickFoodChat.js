// QuickFoodChat — Journable-style chat food logger
// "Type what you ate" → AI parses → instant nutrition log
import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Haptics from '../lib/haptics'
import { premiumAlert } from './PremiumAlert'

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
  { key: 'lunch', label: 'Lunch', icon: 'sun' },
  { key: 'dinner', label: 'Dinner', icon: 'moon' },
  { key: 'snack', label: 'Snack', icon: 'coffee' },
]

export default function QuickFoodChat({ style, onLogged }) {
  const { colors, card, isDark } = useTheme()
  const { gymId, member } = useAuth()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [mealType, setMealType] = useState(getDefaultMealType())
  const [expanded, setExpanded] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current

  function getDefaultMealType() {
    const h = new Date().getHours()
    if (h < 11) return 'breakfast'
    if (h < 15) return 'lunch'
    if (h < 20) return 'dinner'
    return 'snack'
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    if (!gymId || !member?.id) {
      premiumAlert('Not Connected', 'Connect to a gym first to log meals.')
      return
    }

    setLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      // Step 1: AI estimates nutrition
      const estimate = await api.post(`/gyms/${gymId}/nutrition/estimate`, {
        input: text,
        source: 'ai',
      }, { timeout: 15000 })

      const data = estimate.data
      const items = data.items || []
      const total = data.total || {}

      if (items.length === 0) {
        premiumAlert('Could not parse', `Couldn't identify food in "${text}". Try being more specific.`)
        setLoading(false)
        return
      }

      // Step 2: Auto-log to nutrition diary
      await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
        mealType,
        rawInput: text,
        items: items.map(i => ({
          name: i.name,
          qty: i.quantity || 1,
          unit: i.unit || 'serving',
          calories: i.calories || 0,
          protein: i.protein || 0,
          carbs: i.carbs || 0,
          fats: i.fats || i.fat || 0,
        })),
        source: 'chat',
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Show result briefly
      setResult({
        text,
        items,
        total: {
          calories: total.calories || items.reduce((s, i) => s + (i.calories || 0), 0),
          protein: total.protein || items.reduce((s, i) => s + (i.protein || 0), 0),
        },
      })
      setInput('')

      // Auto-dismiss result after 4s
      setTimeout(() => setResult(null), 4000)

      onLogged?.()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to log meal'
      premiumAlert('Log Failed', msg)
    } finally {
      setLoading(false)
    }
  }, [input, gymId, member?.id, mealType, onLogged])

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1
    setExpanded(!expanded)
    Animated.spring(slideAnim, { toValue, useNativeDriver: false, tension: 80, friction: 12 }).start()
  }

  return (
    <View style={[styles.container, card, style]}>
      {/* Accent bar */}
      <View style={[styles.accent, { backgroundColor: '#F97316' }]} />

      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={[styles.chatIcon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
            <Feather name="message-circle" size={16} color="#F97316" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Log what you ate</Text>
            <Text style={[styles.headerSub, { color: colors.textTer }]}>Type naturally — AI handles the rest</Text>
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTer} />
      </TouchableOpacity>

      {/* Expandable input area */}
      {expanded && (
        <View style={styles.body}>
          {/* Meal type chips */}
          <View style={styles.mealRow}>
            {MEAL_TYPES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.mealChip,
                  { backgroundColor: mealType === m.key ? colors.accent + '18' : colors.bgTer,
                    borderColor: mealType === m.key ? colors.accent + '40' : 'transparent' },
                ]}
                onPress={() => { setMealType(m.key); Haptics.selectionAsync() }}
                activeOpacity={0.7}
              >
                <Feather name={m.icon} size={12} color={mealType === m.key ? colors.accent : colors.textTer} />
                <Text style={[styles.mealChipText, { color: mealType === m.key ? colors.accent : colors.textSec }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input + send */}
          <View style={[styles.inputRow, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder='e.g. "2 roti, dal, coffee with milk"'
              placeholderTextColor={colors.textTer}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() ? '#F97316' : colors.bgHover }]}
              onPress={handleSend}
              disabled={loading || !input.trim()}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="arrow-up" size={18} color={input.trim() ? '#FFF' : colors.textTer} />
              )}
            </TouchableOpacity>
          </View>

          {/* Result toast */}
          {result && (
            <View style={[styles.resultCard, { backgroundColor: isDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.15)' }]}>
              <Feather name="check-circle" size={14} color="#F97316" />
              <View style={styles.resultText}>
                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                  {result.items.map(i => i.name).join(', ')}
                </Text>
                <Text style={[styles.resultMacros, { color: colors.textSec }]}>
                  {result.total.calories} cal · {result.total.protein}g protein
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    padding: 0,
    marginBottom: SPACING.md,
  },
  accent: {
    height: 3,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  mealChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.regular,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  resultMacros: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },
})
