import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Easing,
  RefreshControl,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { recordMeal } from '../lib/SmartNotificationEngine'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const RING_SIZE = 160
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS = { breakfast: '\u2600\uFE0F', lunch: '\uD83C\uDF5B', dinner: '\uD83C\uDF19', snack: '\uD83C\uDF4E' }
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

const QUICK_SUGGESTIONS = [
  { label: 'Breakfast Thali', icon: 'sunrise' },
  { label: 'Protein Shake', icon: 'zap' },
  { label: 'Rice & Curry', icon: 'sun' },
  { label: 'Salad Bowl', icon: 'heart' },
  { label: 'Paneer Tikka', icon: 'star' },
]

// --- Typing Indicator (3 bouncing dots) ---
function TypingIndicator({ colors }) {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const bounce = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -8, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      )
    const a1 = bounce(dot1, 0)
    const a2 = bounce(dot2, 150)
    const a3 = bounce(dot3, 300)
    a1.start(); a2.start(); a3.start()
    return () => { a1.stop(); a2.stop(); a3.stop() }
  }, [dot1, dot2, dot3])

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.badge}>
        <Feather name="zap" size={10} color={COLORS.accent} />
        <Text style={[typingStyles.badgeText, { color: COLORS.accent }]}>Vira AI</Text>
      </View>
      <View style={typingStyles.dots}>
        {[dot1, dot2, dot3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              typingStyles.dot,
              { backgroundColor: COLORS.accent, transform: [{ translateY: anim }] },
            ]}
          />
        ))}
      </View>
      <Text style={[typingStyles.label, { color: colors.textTer }]}>Analyzing your meal...</Text>
    </View>
  )
}

const typingStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: SPACING.xl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '500' },
})

export default function NutritionScreen({ navigation }) {
  const { member, gymId } = useAuth()
  const { colors, card } = useTheme()

  const [daily, setDaily] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logText, setLogText] = useState('')
  const [logMealType, setLogMealType] = useState('lunch')
  const [estimating, setEstimating] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [estimatedItems, setEstimatedItems] = useState([])
  const [estimatedTotal, setEstimatedTotal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('today') // today | weekly

  const pulseAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  // Pulse animation for calorie ring
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // Animate progress when data loads
  useEffect(() => {
    if (daily && goal) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start()
    }
  }, [daily, goal, progressAnim])

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [dailyRes, weeklyRes, goalRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/daily?date=${today}`),
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/weekly`),
        api.get(`/gyms/${gymId}/members/${member.id}/nutrition/goal`),
      ])
      setDaily(dailyRes.data)
      setWeekly(weeklyRes.data)
      setGoal(goalRes.data)
    } catch (err) {
      // Show zeros on error
      setDaily({ totals: { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }, meals: [] })
      setWeekly({ days: [] })
      setGoal(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEstimate = useCallback(async () => {
    if (!logText.trim()) {
      Alert.alert('Empty Input', 'Type what you ate, e.g. "2 roti, dal, rice"')
      return
    }
    setEstimating(true)
    try {
      const res = await api.post(`/gyms/${gymId}/nutrition/estimate`, {
        input: logText.trim(),
        source: 'ai',
      })
      const result = res.data
      setEstimatedItems(result.items || [])
      setEstimatedTotal(result.total || {})
      setShowReview(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (err) {
      Alert.alert('Estimation Failed', err.response?.data?.message || 'Could not estimate nutrition.')
    } finally {
      setEstimating(false)
    }
  }, [logText, gymId])

  const handleSaveMeal = useCallback(async () => {
    setSaving(true)
    try {
      await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
        mealType: logMealType,
        rawInput: logText.trim(),
        items: estimatedItems,
        source: 'ai',
      })
      // Record pattern for smart notifications
      recordMeal(logMealType).catch(err => console.warn('[Nutrition]', err?.message))
      // Update local state
      const newMeal = {
        id: Date.now().toString(),
        meal_type: logMealType,
        raw_input: logText.trim(),
        items: estimatedItems,
        total_calories: estimatedTotal.calories,
        total_protein: estimatedTotal.protein,
        total_carbs: estimatedTotal.carbs,
        total_fats: estimatedTotal.fats,
        logged_at: new Date().toISOString(),
      }
      setDaily(prev => ({
        ...prev,
        meals: [...(prev?.meals || []), newMeal],
        totals: {
          calories: (prev?.totals?.calories || 0) + (estimatedTotal.calories || 0),
          protein: (prev?.totals?.protein || 0) + (estimatedTotal.protein || 0),
          carbs: (prev?.totals?.carbs || 0) + (estimatedTotal.carbs || 0),
          fats: (prev?.totals?.fats || 0) + (estimatedTotal.fats || 0),
          fiber: (prev?.totals?.fiber || 0) + (estimatedTotal.fiber || 0),
        },
      }))

      setShowReview(false)
      setLogText('')
      setEstimatedItems([])
      setEstimatedTotal(null)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Check if goal met
      const newCals = (daily?.totals?.calories || 0) + (estimatedTotal?.calories || 0)
      if (goal && newCals >= goal.calorie_goal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert('Goal Reached!', `You've hit your ${goal.calorie_goal} cal target for today!`)
      }
    } catch (err) {
      Alert.alert('Save Failed', err.response?.data?.message || 'Could not save meal.')
    } finally {
      setSaving(false)
    }
  }, [logText, logMealType, estimatedItems, estimatedTotal, gymId, member?.id, daily, goal])

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    )
  }

  const totals = daily?.totals || { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  const goals = goal || { calorie_goal: 2000, protein_goal: 120, carb_goal: 250, fat_goal: 65 }
  const calProgress = Math.min(totals.calories / goals.calorie_goal, 1)
  const remaining = Math.max(goals.calorie_goal - totals.calories, 0)

  const macros = [
    { label: 'Protein', value: totals.protein, goal: goals.protein_goal, color: '#10B981', unit: 'g' },
    { label: 'Carbs', value: totals.carbs, goal: goals.carb_goal, color: '#4285F4', unit: 'g' },
    { label: 'Fats', value: totals.fats, goal: goals.fat_goal, color: '#FBBC05', unit: 'g' },
  ]

  const weeklyDays = weekly?.days || []
  const maxWeeklyCal = Math.max(...weeklyDays.map(d => d.calories || 0), goals.calorie_goal)

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              try {
                await loadData()
              } catch (err) { console.warn('[Nutrition] refresh:', err?.message) }
              setRefreshing(false)
            }}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.text }]}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          {['today', 'weekly'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: colors.bgTer }]]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: colors.textTer }, activeTab === tab && [styles.tabTextActive, { color: colors.text }]]}>
                {tab === 'today' ? 'Today' : 'This Week'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'today' ? (
          <>
            {/* Calorie Ring */}
            <View style={styles.ringSection}>
              <CalorieRing
                progress={calProgress}
                calories={totals.calories}
                remaining={remaining}
                goal={goals.calorie_goal}
                pulseAnim={pulseAnim}
              />
            </View>

            {/* Macro Bars */}
            <View style={[styles.macroSection, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              {macros.map(macro => (
                <MacroBar key={macro.label} {...macro} />
              ))}
            </View>

            {/* AI-Powered Quick Log */}
            <View style={[styles.logSection, card, { borderColor: colors.border }]}>
              <View style={styles.logHeader}>
                <View style={styles.logTitleRow}>
                  <Feather name="zap" size={18} color={COLORS.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: SPACING.sm }]}>AI Meal Logger</Text>
                </View>
                <View style={styles.aiBadgeSmall}>
                  <View style={[styles.aiBadgeDot, { backgroundColor: COLORS.green }]} />
                  <Text style={styles.aiBadgeLabel}>AI</Text>
                </View>
              </View>

              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealTypeBtn, { backgroundColor: colors.bgTer }, logMealType === type && [styles.mealTypeBtnActive, { backgroundColor: colors.accentSoft }]]}
                    onPress={() => setLogMealType(type)}
                  >
                    <Text style={styles.mealTypeIcon}>{MEAL_ICONS[type]}</Text>
                    <Text style={[styles.mealTypeLabel, { color: colors.textTer }, logMealType === type && styles.mealTypeLabelActive]}>
                      {MEAL_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* AI Chat-style Input */}
              <View style={[styles.aiInputWrapper, { backgroundColor: colors.bgTer, borderColor: logText.trim() ? COLORS.accent : colors.border }]}>
                <Feather name="edit-3" size={16} color={logText.trim() ? COLORS.accent : colors.textTer} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.aiInput, { color: colors.text }]}
                  placeholder={"Describe your meal... e.g., '2 rotis with dal and a glass of lassi'"}
                  placeholderTextColor={colors.textTer}
                  value={logText}
                  onChangeText={setLogText}
                  multiline
                  maxLength={300}
                />
              </View>

              {/* Quick Suggestion Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
                {QUICK_SUGGESTIONS.map(chip => (
                  <TouchableOpacity
                    key={chip.label}
                    style={[styles.chip, { backgroundColor: colors.bgTer, borderColor: colors.border }]}
                    onPress={() => {
                      setLogText(chip.label)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name={chip.icon} size={12} color={COLORS.accent} />
                    <Text style={[styles.chipText, { color: colors.textSec }]}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Typing Indicator when Estimating */}
              {estimating && <TypingIndicator colors={colors} />}

              <View style={styles.logActionRow}>
                <TouchableOpacity
                  style={[styles.scanBarcodeBtn, { backgroundColor: colors.bgTer, borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    navigation?.navigate?.('BarcodeScanner', { mealType: logMealType })
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="camera" size={18} color={COLORS.accent} />
                  <Text style={[styles.scanBarcodeBtnText, { color: COLORS.accent }]}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.estimateBtn, estimating && styles.btnDisabled]}
                  onPress={handleEstimate}
                  disabled={estimating}
                  activeOpacity={0.85}
                >
                  {estimating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="zap" size={18} color="#fff" />
                      <Text style={[styles.estimateBtnText, { color: '#fff' }]}>Estimate with AI</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Today's Meals */}
            {(daily?.meals?.length > 0) && (
              <View style={styles.mealsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Meals</Text>
                {daily.meals.map((meal, i) => (
                  <View key={meal.id || i} style={[styles.mealCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
                    <View style={styles.mealCardHeader}>
                      <Text style={styles.mealCardIcon}>{MEAL_ICONS[meal.meal_type] || '\uD83C\uDF7D\uFE0F'}</Text>
                      <View style={styles.mealCardInfo}>
                        <Text style={[styles.mealCardType, { color: colors.text }]}>{MEAL_LABELS[meal.meal_type] || meal.meal_type}</Text>
                        <Text style={[styles.mealCardInput, { color: colors.textTer }]} numberOfLines={1}>{meal.raw_input}</Text>
                      </View>
                      <Text style={[styles.mealCardCal, { color: colors.text }]}>{meal.total_calories} cal</Text>
                    </View>
                    <View style={styles.mealCardMacros}>
                      <Text style={[styles.mealMacro, { color: colors.textSec }]}>P: {meal.total_protein}g</Text>
                      <Text style={[styles.mealMacro, { color: colors.textSec }]}>C: {meal.total_carbs}g</Text>
                      <Text style={[styles.mealMacro, { color: colors.textSec }]}>F: {meal.total_fats}g</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Weekly View */
          <View style={styles.weeklySection}>
            {/* Weekly Bar Chart */}
            <View style={[styles.chartContainer, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Calorie Trend</Text>
              <View style={styles.chartBars}>
                {weeklyDays.map((day, i) => {
                  const barHeight = maxWeeklyCal > 0 ? (day.calories / maxWeeklyCal) * 120 : 0
                  const isToday = i === weeklyDays.length - 1
                  const dayLabel = new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2)
                  const metGoal = day.calories >= goals.calorie_goal

                  return (
                    <View key={day.date} style={styles.barCol}>
                      <Text style={[styles.barValue, { color: colors.textTer }]}>{day.calories > 0 ? day.calories : ''}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: Math.max(barHeight, 4),
                              backgroundColor: metGoal ? COLORS.green : isToday ? COLORS.accent : colors.borderStrong,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, { color: colors.textTer }, isToday && [styles.barLabelActive, { color: colors.text }]]}>{dayLabel}</Text>
                    </View>
                  )
                })}
              </View>
              {/* Goal line indicator */}
              <View style={styles.goalLineRow}>
                <View style={styles.goalLineDot} />
                <Text style={[styles.goalLineText, { color: colors.textSec }]}>Goal: {goals.calorie_goal} cal</Text>
              </View>
            </View>

            {/* Weekly Averages */}
            {weekly?.averages && (
              <View style={[styles.avgCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
                <Text style={[styles.avgTitle, { color: colors.text }]}>7-Day Averages</Text>
                <View style={styles.avgRow}>
                  <AvgStat label="Calories" value={Math.round(weekly.averages.calories)} unit="cal" />
                  <AvgStat label="Protein" value={Math.round(weekly.averages.protein)} unit="g" />
                  <AvgStat label="Carbs" value={Math.round(weekly.averages.carbs)} unit="g" />
                  <AvgStat label="Fats" value={Math.round(weekly.averages.fats)} unit="g" />
                </View>
              </View>
            )}

            {/* Daily Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Breakdown</Text>
              {weeklyDays.map(day => {
                const dateStr = new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                return (
                  <View key={day.date} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.breakdownDate, { color: colors.textSec }]}>{dateStr}</Text>
                    <View style={styles.breakdownMacros}>
                      <Text style={[styles.breakdownCal, { color: colors.text }]}>{day.calories} cal</Text>
                      <Text style={[styles.breakdownDetail, { color: colors.textTer }]}>P:{day.protein}g C:{day.carbs}g F:{day.fats}g</Text>
                    </View>
                    <Text style={[styles.breakdownMeals, { color: colors.textTer }]}>{day.meal_count || 0} meals</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xxl + SPACING.xl }} />
      </ScrollView>

      {/* AI Review Modal */}
      <Modal visible={showReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, card, { borderColor: colors.border }]}>
            {/* Modal Header with AI Badge */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>AI Estimation</Text>
                <Text style={[styles.modalMealType, { color: colors.textSec, marginBottom: 0 }]}>
                  {MEAL_ICONS[logMealType]} {MEAL_LABELS[logMealType]}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowReview(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={colors.textTer} />
              </TouchableOpacity>
            </View>

            {/* Vira AI Badge + Confidence */}
            <View style={styles.aiBannerRow}>
              <View style={styles.aiBadgeLarge}>
                <Feather name="zap" size={12} color={COLORS.accent} />
                <Text style={styles.aiBadgeLargeText}>Vira AI</Text>
              </View>
              <View style={styles.confidenceRow}>
                <View style={[styles.confidenceDot, { backgroundColor: COLORS.green }]} />
                <Text style={[styles.confidenceText, { color: COLORS.green }]}>High accuracy</Text>
              </View>
            </View>

            {/* Macro Summary Card */}
            {estimatedTotal && (
              <View style={[styles.macroSummaryCard, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                <Text style={[styles.macroSummaryCalories, { color: colors.text }]}>
                  {estimatedTotal.calories}
                  <Text style={[styles.macroSummaryUnit, { color: colors.textTer }]}> cal</Text>
                </Text>
                <View style={styles.macroSummaryBars}>
                  {[
                    { label: 'Protein', value: estimatedTotal.protein, color: '#10B981', max: Math.max(estimatedTotal.protein, estimatedTotal.carbs, estimatedTotal.fats) },
                    { label: 'Carbs', value: estimatedTotal.carbs, color: '#4285F4', max: Math.max(estimatedTotal.protein, estimatedTotal.carbs, estimatedTotal.fats) },
                    { label: 'Fat', value: estimatedTotal.fats, color: '#FBBC05', max: Math.max(estimatedTotal.protein, estimatedTotal.carbs, estimatedTotal.fats) },
                  ].map(m => (
                    <View key={m.label} style={styles.macroSummaryBarRow}>
                      <Text style={[styles.macroSummaryBarLabel, { color: colors.textSec }]}>{m.label}</Text>
                      <View style={[styles.macroSummaryBarTrack, { backgroundColor: colors.bg }]}>
                        <View style={[styles.macroSummaryBarFill, { width: `${m.max > 0 ? Math.min((m.value / m.max) * 100, 100) : 0}%`, backgroundColor: m.color }]} />
                      </View>
                      <Text style={[styles.macroSummaryBarValue, { color: colors.text }]}>{m.value}g</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Item Breakdown */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {estimatedItems.map((item, i) => (
                <View key={i} style={[styles.reviewItem, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                  <View style={styles.reviewItemHeader}>
                    <Text style={[styles.reviewItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.reviewItemQty, { color: colors.textSec }]}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                  <View style={styles.reviewItemMacros}>
                    <Text style={[styles.reviewMacro, { color: COLORS.accent }]}>{item.calories} cal</Text>
                    <Text style={[styles.reviewMacro, { color: colors.textTer }]}>P:{item.protein}g</Text>
                    <Text style={[styles.reviewMacro, { color: colors.textTer }]}>C:{item.carbs}g</Text>
                    <Text style={[styles.reviewMacro, { color: colors.textTer }]}>F:{item.fats}g</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Log This Meal Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSaveMeal}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.saveBtnInner}>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Log This Meal</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

// --- Calorie Ring Component ---
function CalorieRing({ progress, calories, remaining, goal, pulseAnim }) {
  const { colors } = useTheme()
  const strokeWidth = 8
  const radius = RING_SIZE / 2
  const circumference = 2 * Math.PI * (radius - strokeWidth)
  const rotation = progress * 360
  const isComplete = progress >= 1

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isComplete ? 1.04 : 1.01],
  })

  const ringColor = isComplete ? COLORS.green : COLORS.accent

  return (
    <Animated.View style={[styles.ringContainer, { transform: [{ scale: pulseScale }] }]}>
      {/* Background ring */}
      <View
        style={[
          styles.calorieRingBg,
          {
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: radius,
            borderWidth: strokeWidth,
            borderColor: colors.bgTer,
          },
        ]}
      />
      {/* Progress ring using two half-circles */}
      <View style={[styles.ringHalf, { width: RING_SIZE / 2, height: RING_SIZE, right: 0, overflow: 'hidden' }]}>
        <View
          style={[
            styles.calorieRingBg,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: ringColor,
              right: RING_SIZE / 2,
              transform: [{ rotateZ: `${rotation > 180 ? rotation - 180 : 0}deg` }],
            },
          ]}
        />
      </View>
      <View style={[styles.ringHalf, { width: RING_SIZE / 2, height: RING_SIZE, left: 0, overflow: 'hidden' }]}>
        <View
          style={[
            styles.calorieRingBg,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderColor: ringColor,
              left: RING_SIZE / 2,
              transform: [{ rotateZ: `${rotation > 180 ? 180 : rotation}deg` }],
            },
          ]}
        />
      </View>
      {/* Center text */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringCalories, { color: colors.text }, isComplete && { color: COLORS.green }]}>{calories}</Text>
        <Text style={[styles.ringLabel, { color: colors.textTer }]}>cal eaten</Text>
        <View style={[styles.ringDivider, { backgroundColor: colors.borderStrong }]} />
        <Text style={[styles.ringRemaining, { color: colors.textSec }]}>{remaining} left</Text>
        <Text style={[styles.ringGoalText, { color: colors.textTer }]}>of {goal}</Text>
      </View>
    </Animated.View>
  )
}

// --- Macro Bar Component ---
function MacroBar({ label, value, goal, color, unit }) {
  const { colors } = useTheme()
  const progress = Math.min(value / goal, 1)
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={[styles.macroLabel, { color: colors.textSec }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.text }]}>
          {value}{unit} <Text style={[styles.macroGoalText, { color: colors.textTer }]}>/ {goal}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.bgTer }]}>
        <View style={[styles.macroFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

// --- Avg Stat Component ---
function AvgStat({ label, value, unit }) {
  const { colors } = useTheme()
  return (
    <View style={styles.avgStatItem}>
      <Text style={[styles.avgStatValue, { color: colors.text }]}>{value}<Text style={[styles.avgStatUnit, { color: colors.textTer }]}> {unit}</Text></Text>
      <Text style={[styles.avgStatLabel, { color: colors.textTer }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.lg,
    padding: 3,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.bgTer,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTer,
  },
  tabTextActive: {
    color: COLORS.text,
  },

  // Calorie Ring
  ringSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
  },
  calorieRingBg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringHalf: {
    position: 'absolute',
    top: 0,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCalories: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 12,
    color: COLORS.textTer,
    marginTop: 1,
  },
  ringDivider: {
    width: 30,
    height: 1,
    backgroundColor: COLORS.borderStrong,
    marginVertical: SPACING.xs + 2,
  },
  ringRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSec,
  },
  ringGoalText: {
    fontSize: 11,
    color: COLORS.textTer,
  },

  // Macro Bars
  macroSection: {
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  macroRow: {
    gap: SPACING.sm,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSec,
    flex: 1,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  macroGoalText: {
    fontWeight: '400',
    color: COLORS.textTer,
  },
  macroTrack: {
    height: 6,
    backgroundColor: COLORS.bgTer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: 6,
    borderRadius: 3,
  },

  // Quick Log (AI-Powered)
  logSection: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  aiBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  mealTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgTer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mealTypeBtnActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  mealTypeIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  mealTypeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTer,
  },
  mealTypeLabelActive: {
    color: COLORS.accent,
  },
  aiInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    minHeight: 56,
  },
  aiInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
    minHeight: 32,
  },
  chipScroll: {
    marginBottom: SPACING.md,
  },
  chipContainer: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  scanBarcodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minHeight: 48,
  },
  scanBarcodeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  estimateBtn: {
    flex: 1.5,
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: 48,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  estimateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Today's Meals
  mealsSection: {
    marginBottom: SPACING.lg,
  },
  mealCard: {
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  mealCardIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  mealCardInfo: {
    flex: 1,
  },
  mealCardType: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealCardInput: {
    fontSize: 12,
    color: COLORS.textTer,
    marginTop: 2,
  },
  mealCardCal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  mealCardMacros: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingLeft: 36,
  },
  mealMacro: {
    fontSize: 12,
    color: COLORS.textSec,
    fontWeight: '500',
  },

  // Weekly
  weeklySection: {},
  chartContainer: {
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 9,
    color: COLORS.textTer,
    marginBottom: SPACING.xs,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '70%',
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textTer,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  barLabelActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  goalLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  goalLineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginRight: SPACING.sm,
  },
  goalLineText: {
    fontSize: 12,
    color: COLORS.textSec,
  },

  // Averages
  avgCard: {
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  avgTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  avgRow: {
    flexDirection: 'row',
  },
  avgStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  avgStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  avgStatUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textTer,
  },
  avgStatLabel: {
    fontSize: 11,
    color: COLORS.textTer,
    marginTop: 2,
    fontWeight: '500',
  },

  // Breakdown
  breakdownSection: {
    marginBottom: SPACING.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownDate: {
    fontSize: 13,
    color: COLORS.textSec,
    width: 80,
    fontWeight: '500',
  },
  breakdownMacros: {
    flex: 1,
  },
  breakdownCal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  breakdownDetail: {
    fontSize: 11,
    color: COLORS.textTer,
    marginTop: 2,
  },
  breakdownMeals: {
    fontSize: 12,
    color: COLORS.textTer,
    fontWeight: '500',
  },

  // AI Review Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modalMealType: {
    fontSize: 13,
    color: COLORS.textSec,
    marginBottom: SPACING.md,
    marginTop: 2,
  },
  aiBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  aiBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  aiBadgeLargeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  confidenceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  macroSummaryCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  macroSummaryCalories: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: SPACING.sm,
  },
  macroSummaryUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
  macroSummaryBars: {
    gap: SPACING.sm,
  },
  macroSummaryBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  macroSummaryBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 52,
  },
  macroSummaryBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroSummaryBarFill: {
    height: 6,
    borderRadius: 3,
  },
  macroSummaryBarValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },
  modalScroll: {
    maxHeight: 180,
  },
  reviewItem: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  reviewItemQty: {
    fontSize: 13,
    color: COLORS.textSec,
  },
  reviewItemMacros: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  reviewMacro: {
    fontSize: 12,
    color: COLORS.textTer,
  },

  // Save
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    minHeight: 54,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  saveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
