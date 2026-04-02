// QuickFoodChat — Journable-style chat food logger
// "Type what you ate" → AI parses → confirm → log
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
  ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Haptics from '../lib/haptics'
import { premiumAlert } from './PremiumAlert'

// Try to import voice recognition (optional dependency)
let Voice = null
try { Voice = require('@react-native-voice/voice').default } catch {}

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

  // Confirmation state
  const [pendingItems, setPendingItems] = useState(null) // items awaiting confirmation
  const [pendingRawInput, setPendingRawInput] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const hasVoice = Voice !== null

  // Set up voice listeners
  useEffect(() => {
    if (!Voice) return

    const onResults = (e) => {
      const text = e?.value?.[0]
      if (text) setInput(text)
      setIsListening(false)
    }
    const onError = () => {
      setIsListening(false)
    }

    Voice.onSpeechResults = onResults
    Voice.onSpeechError = onError

    return () => {
      Voice.destroy?.().then(Voice.removeAllListeners?.())
    }
  }, [])

  // Pulse animation for mic
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isListening])

  function getDefaultMealType() {
    const h = new Date().getHours()
    if (h < 11) return 'breakfast'
    if (h < 15) return 'lunch'
    if (h < 20) return 'dinner'
    return 'snack'
  }

  const startListening = useCallback(async () => {
    if (!Voice) return
    try {
      await Voice.start('en-US')
      setIsListening(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (err) {
      premiumAlert('Voice Error', 'Could not start voice recognition. Please type your food instead.')
    }
  }, [])

  const stopListening = useCallback(async () => {
    if (!Voice) return
    try {
      await Voice.stop()
    } catch {}
    setIsListening(false)
  }, [])

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

      if (items.length === 0) {
        premiumAlert('Could not parse', `Couldn't identify food in "${text}". Try being more specific.`)
        setLoading(false)
        return
      }

      // Step 2: Show confirmation card instead of auto-logging
      const parsed = items.map((i, idx) => ({
        _key: idx,
        name: i.name,
        quantity: i.quantity || 1,
        unit: i.unit || 'serving',
        calories: i.calories || 0,
        protein: i.protein || 0,
        carbs: i.carbs || 0,
        fats: i.fats || i.fat || 0,
      }))

      setPendingItems(parsed)
      setPendingRawInput(text)
      setInput('')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to parse meal'
      premiumAlert('Parse Failed', msg)
    } finally {
      setLoading(false)
    }
  }, [input, gymId, member?.id, mealType, onLogged])

  const handleConfirmLog = useCallback(async () => {
    if (!pendingItems?.length || !gymId || !member?.id) return

    setConfirmLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
        mealType,
        rawInput: pendingRawInput,
        items: pendingItems.map(i => ({
          name: i.name,
          qty: i.quantity,
          unit: i.unit,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fats: i.fats,
        })),
        source: 'chat',
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      const totalCals = pendingItems.reduce((s, i) => s + (i.calories * i.quantity), 0)
      const totalProt = pendingItems.reduce((s, i) => s + (i.protein * i.quantity), 0)

      setResult({
        text: pendingRawInput,
        items: pendingItems,
        total: { calories: totalCals, protein: totalProt },
      })

      setPendingItems(null)
      setPendingRawInput('')

      setTimeout(() => setResult(null), 4000)
      onLogged?.()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to log meal'
      premiumAlert('Log Failed', msg)
    } finally {
      setConfirmLoading(false)
    }
  }, [pendingItems, pendingRawInput, gymId, member?.id, mealType, onLogged])

  const handleCancelConfirm = useCallback(() => {
    setPendingItems(null)
    setPendingRawInput('')
    Haptics.selectionAsync()
  }, [])

  const removeItem = useCallback((key) => {
    setPendingItems(prev => {
      const next = prev.filter(i => i._key !== key)
      if (next.length === 0) {
        setPendingRawInput('')
        return null
      }
      return next
    })
    Haptics.selectionAsync()
  }, [])

  const updateItemQty = useCallback((key, qty) => {
    const num = parseFloat(qty) || 0
    setPendingItems(prev => prev.map(i => i._key === key ? { ...i, quantity: num } : i))
  }, [])

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

          {/* Input + mic + send */}
          <View style={[styles.inputRow, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={isListening ? 'Listening...' : 'e.g. "2 roti, dal, coffee with milk"'}
              placeholderTextColor={colors.textTer}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline={false}
              editable={!loading && !isListening}
            />

            {/* Mic button (only if Voice is available) */}
            {hasVoice && (
              <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
                <TouchableOpacity
                  style={[
                    styles.micBtn,
                    { backgroundColor: isListening ? '#EF4444' : colors.bgHover },
                  ]}
                  onPress={isListening ? stopListening : startListening}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Feather name="mic" size={16} color={isListening ? '#FFF' : colors.textSec} />
                </TouchableOpacity>
              </Animated.View>
            )}

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

          {/* Confirmation card */}
          {pendingItems && (
            <View style={[styles.confirmCard, { backgroundColor: isDark ? colors.bgSec : '#FFFBF5', borderColor: 'rgba(249,115,22,0.2)' }]}>
              <View style={styles.confirmHeader}>
                <Feather name="clipboard" size={14} color="#F97316" />
                <Text style={[styles.confirmTitle, { color: colors.text }]}>Review before logging</Text>
              </View>

              {pendingItems.map(item => (
                <View key={item._key} style={[styles.confirmItem, { borderColor: colors.border }]}>
                  <View style={styles.confirmItemInfo}>
                    <Text style={[styles.confirmItemName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.confirmItemMacros, { color: colors.textSec }]}>
                      {item.calories} cal  ·  {item.protein}g protein
                    </Text>
                  </View>

                  <View style={styles.confirmItemActions}>
                    <View style={[styles.qtyBox, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.qtyInput, { color: colors.text }]}
                        value={String(item.quantity)}
                        onChangeText={(v) => updateItemQty(item._key, v)}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeItem(item._key)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={16} color={colors.textTer} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Totals row */}
              <View style={[styles.confirmTotals, { borderColor: colors.border }]}>
                <Text style={[styles.confirmTotalLabel, { color: colors.textSec }]}>Total</Text>
                <Text style={[styles.confirmTotalValue, { color: colors.text }]}>
                  {pendingItems.reduce((s, i) => s + Math.round(i.calories * i.quantity), 0)} cal  ·  {pendingItems.reduce((s, i) => s + Math.round(i.protein * i.quantity), 0)}g protein
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  style={[styles.confirmCancelBtn, { borderColor: colors.border }]}
                  onPress={handleCancelConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.confirmCancelText, { color: colors.textSec }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmLogBtn, { backgroundColor: '#F97316' }]}
                  onPress={handleConfirmLog}
                  disabled={confirmLoading}
                  activeOpacity={0.7}
                >
                  {confirmLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#FFF" />
                      <Text style={styles.confirmLogText}>Edit & Log</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

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
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Confirmation card
  confirmCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  confirmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  confirmItemInfo: {
    flex: 1,
    gap: 2,
    marginRight: 10,
  },
  confirmItemName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  confirmItemMacros: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },
  confirmItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    minWidth: 44,
  },
  qtyInput: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  removeBtn: {
    padding: 4,
  },
  confirmTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  confirmTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  confirmTotalValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  confirmLogBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmLogText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT.bold,
    color: '#FFF',
  },
  // Result toast
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
