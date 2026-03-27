import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Haptics from '../lib/haptics'
import AdBanner from '../components/AdBanner'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MEAL_COLORS = {
  breakfast: '#F97316',
  lunch: '#34A853',
  dinner: '#8B5CF6',
  snack: '#FBBC05',
}

const MEAL_ICONS = {
  breakfast: 'sunrise',
  lunch: 'sun',
  dinner: 'moon',
  snack: 'coffee',
}

const CALORIE_GOAL = 2000

// Removed demo data generator — real API data or empty state only


// --- Sub-components ---

function MonthlyStatsCard({ daysData, colors, card }) {
  const days = Object.values(daysData)
  const totalDaysInRange = days.length
  if (totalDaysInRange === 0) {
    return (
      <View style={[styles.statsCard, card]}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>Monthly Overview</Text>
        <Text style={[styles.statsEmpty, { color: colors.textTer }]}>No data for this month</Text>
      </View>
    )
  }

  const totalMeals = days.reduce((s, d) => s + d.mealCount, 0)
  const avgCalories = Math.round(days.reduce((s, d) => s + d.calories, 0) / totalDaysInRange)
  const bestDay = days.reduce((best, d) => d.calories > best.calories ? d : best, days[0])
  const worstDay = days.reduce((worst, d) => d.calories < worst.calories ? d : worst, days[0])

  // Consistency: count of days that have data out of possible days in month up to today
  const now = new Date()
  const [y, m] = [bestDay.date.split('-')[0], bestDay.date.split('-')[1]]
  const monthEnd = new Date(parseInt(y), parseInt(m), 0).getDate()
  const lastDay = (parseInt(y) === now.getFullYear() && parseInt(m) - 1 === now.getMonth())
    ? now.getDate()
    : monthEnd
  const consistency = Math.round((totalDaysInRange / lastDay) * 100)

  const formatShortDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`
  }

  const stats = [
    { label: 'Meals Logged', value: String(totalMeals), icon: 'list' },
    { label: 'Avg Calories', value: String(avgCalories), icon: 'zap' },
    { label: 'Best Day', value: `${bestDay.calories} cal`, sub: formatShortDate(bestDay.date), icon: 'trending-up' },
    { label: 'Consistency', value: `${consistency}%`, icon: 'check-circle' },
  ]

  return (
    <View style={[styles.statsCard, card]}>
      <Text style={[styles.statsTitle, { color: colors.text }]}>Monthly Overview</Text>
      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statItem, { borderColor: colors.border }]}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name={s.icon} size={14} color={colors.accent} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textTer }]}>{s.label}</Text>
            {s.sub && <Text style={[styles.statSub, { color: colors.textSec }]}>{s.sub}</Text>}
          </View>
        ))}
      </View>
    </View>
  )
}

function WeeklySummaryRow({ daysData, selectedDate, colors }) {
  // Get the week containing selectedDate (or current date)
  const ref = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  const dayOfWeek = ref.getDay()
  const weekStart = new Date(ref)
  weekStart.setDate(ref.getDate() - dayOfWeek)

  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (daysData[key]) weekDays.push(daysData[key])
  }

  if (weekDays.length === 0) return null

  const avg = (field) => Math.round(weekDays.reduce((s, d) => s + d[field], 0) / weekDays.length)

  const macros = [
    { label: 'Calories', value: avg('calories'), unit: 'kcal', color: colors.accent },
    { label: 'Protein', value: avg('protein'), unit: 'g', color: '#34A853' },
    { label: 'Carbs', value: avg('carbs'), unit: 'g', color: '#F97316' },
    { label: 'Fat', value: avg('fat'), unit: 'g', color: '#FBBC05' },
  ]

  return (
    <View style={[styles.weekRow, { borderColor: colors.border }]}>
      <Text style={[styles.weekLabel, { color: colors.textSec }]}>Weekly Avg ({weekDays.length} days)</Text>
      <View style={styles.weekMacros}>
        {macros.map((m, i) => (
          <View key={i} style={styles.weekMacroItem}>
            <View style={[styles.weekMacroDot, { backgroundColor: m.color }]} />
            <Text style={[styles.weekMacroValue, { color: colors.text }]}>{m.value}</Text>
            <Text style={[styles.weekMacroUnit, { color: colors.textTer }]}>{m.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function MealTypeBadge({ type, colors }) {
  const color = MEAL_COLORS[type] || colors.textSec
  return (
    <View style={[styles.mealBadge, { backgroundColor: color + '18', borderColor: color + '30' }]}>
      <Feather name={MEAL_ICONS[type] || 'circle'} size={11} color={color} />
      <Text style={[styles.mealBadgeText, { color }]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
    </View>
  )
}

// Macro targets (customizable later from user profile)
const MACRO_TARGETS = { protein: 120, carbs: 250, fat: 65, fiber: 30 }

function MacroProgressBar({ label, value, target, color, unit, colors }) {
  const pct = Math.min(value / target, 1)
  const isOver = value > target
  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarLabelRow}>
        <View style={[styles.macroBarDot, { backgroundColor: color }]} />
        <Text style={[styles.macroBarLabel, { color: colors.textSec }]}>{label}</Text>
        <Text style={[styles.macroBarValue, { color: colors.text }]}>
          {value}{unit}
        </Text>
        <Text style={[styles.macroBarTarget, { color: colors.textTer }]}>
          / {target}{unit}
        </Text>
      </View>
      <View style={[styles.macroBarTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${pct * 100}%`, backgroundColor: isOver ? COLORS.red : color },
          ]}
        />
      </View>
    </View>
  )
}

function DailySummarySection({ dayData, colors }) {
  const calPct = Math.min(dayData.calories / CALORIE_GOAL, 1)
  const calStatus = dayData.calories > CALORIE_GOAL
    ? { text: `${dayData.calories - CALORIE_GOAL} over target`, color: COLORS.red }
    : dayData.calories >= CALORIE_GOAL * 0.8
      ? { text: 'On target', color: COLORS.green }
      : { text: `${CALORIE_GOAL - dayData.calories} remaining`, color: COLORS.accent }

  return (
    <View style={[styles.dailySummary, { borderColor: colors.border }]}>
      {/* Calorie summary */}
      <View style={styles.dailySummaryCalRow}>
        <View>
          <Text style={[styles.dailySummaryCal, { color: colors.text }]}>
            {dayData.calories.toLocaleString()}
          </Text>
          <Text style={[styles.dailySummaryCalUnit, { color: colors.textTer }]}>
            of {CALORIE_GOAL.toLocaleString()} kcal
          </Text>
        </View>
        <View style={[styles.dailySummaryStatus, { backgroundColor: calStatus.color + '18' }]}>
          <Feather
            name={dayData.calories >= CALORIE_GOAL * 0.8 && dayData.calories <= CALORIE_GOAL ? 'check-circle' : 'alert-circle'}
            size={12}
            color={calStatus.color}
          />
          <Text style={[styles.dailySummaryStatusText, { color: calStatus.color }]}>
            {calStatus.text}
          </Text>
        </View>
      </View>

      {/* Calorie progress */}
      <View style={[styles.calProgressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.calProgressFill,
            {
              width: `${calPct * 100}%`,
              backgroundColor: dayData.calories > CALORIE_GOAL ? COLORS.red : COLORS.green,
            },
          ]}
        />
      </View>

      {/* Macro progress bars */}
      <View style={styles.macroProgressSection}>
        <MacroProgressBar label="Protein" value={dayData.protein} target={MACRO_TARGETS.protein} color="#34A853" unit="g" colors={colors} />
        <MacroProgressBar label="Carbs" value={dayData.carbs} target={MACRO_TARGETS.carbs} color="#F97316" unit="g" colors={colors} />
        <MacroProgressBar label="Fat" value={dayData.fat} target={MACRO_TARGETS.fat} color="#FBBC05" unit="g" colors={colors} />
        {dayData.fiber > 0 && (
          <MacroProgressBar label="Fiber" value={dayData.fiber} target={MACRO_TARGETS.fiber} color="#8B5CF6" unit="g" colors={colors} />
        )}
      </View>

      {/* Water + Meals row */}
      <View style={styles.dailySummaryExtraRow}>
        {dayData.water > 0 && (
          <View style={styles.dailySummaryExtra}>
            <Feather name="droplet" size={13} color="#3B82F6" />
            <Text style={[styles.dailySummaryExtraText, { color: colors.textSec }]}>
              {dayData.water} glasses
            </Text>
          </View>
        )}
        <View style={styles.dailySummaryExtra}>
          <Feather name="list" size={13} color={colors.accent} />
          <Text style={[styles.dailySummaryExtraText, { color: colors.textSec }]}>
            {dayData.mealCount} meals logged
          </Text>
        </View>
      </View>
    </View>
  )
}

function ExpandedMeals({ dayData, colors }) {
  return (
    <View style={styles.expandedContainer}>
      {/* Daily summary at top */}
      <DailySummarySection dayData={dayData} colors={colors} />

      {/* Individual meals */}
      <Text style={[styles.mealsHeading, { color: colors.textSec }]}>Meals</Text>
      {dayData.meals.map((meal, mi) => (
        <View key={mi} style={[styles.mealSection, { borderColor: colors.border }]}>
          <View style={styles.mealHeader}>
            <MealTypeBadge type={meal.type} colors={colors} />
            <Text style={[styles.mealTime, { color: colors.textTer }]}>{meal.time}</Text>
          </View>
          {meal.items.map((item, ii) => (
            <View key={ii} style={styles.mealItemRow}>
              <Text style={[styles.mealItemName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.mealItemMacros}>
                <Text style={[styles.mealItemCal, { color: colors.accent }]}>
                  {item.calories} kcal
                </Text>
                <View style={styles.mealItemMacroRow}>
                  <Text style={[styles.mealItemMacroLabel, { color: '#34A853' }]}>
                    P {item.protein}g
                  </Text>
                  <Text style={[styles.mealItemMacroDivider, { color: colors.border }]}> · </Text>
                  <Text style={[styles.mealItemMacroLabel, { color: '#F97316' }]}>
                    C {item.carbs}g
                  </Text>
                  <Text style={[styles.mealItemMacroDivider, { color: colors.border }]}> · </Text>
                  <Text style={[styles.mealItemMacroLabel, { color: '#FBBC05' }]}>
                    F {item.fat}g
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {/* Meal subtotal */}
          <View style={[styles.mealSubtotal, { borderColor: colors.border }]}>
            <Text style={[styles.mealSubtotalLabel, { color: colors.textTer }]}>Subtotal</Text>
            <Text style={[styles.mealSubtotalValue, { color: colors.text }]}>
              {meal.items.reduce((s, i) => s + i.calories, 0)} kcal
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function DayCard({ dayData, isExpanded, onToggle, colors, card }) {
  const date = new Date(dayData.date + 'T00:00:00')
  const dayName = DAY_NAMES[date.getDay()]
  const monthName = SHORT_MONTHS[date.getMonth()]
  const dayNum = date.getDate()

  const calProgress = Math.min(dayData.calories / CALORIE_GOAL, 1)
  const progressColor = calProgress > 1 ? COLORS.red : calProgress > 0.8 ? COLORS.green : COLORS.accent

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        onToggle()
      }}
    >
      <View style={[styles.dayCard, card, { borderColor: isExpanded ? colors.accent + '40' : card.borderColor }]}>
        {/* Main row */}
        <View style={styles.dayMainRow}>
          {/* Date column */}
          <View style={styles.dayDateCol}>
            <Text style={[styles.dayName, { color: colors.textSec }]}>{dayName}</Text>
            <Text style={[styles.dayNum, { color: colors.text }]}>{dayNum}</Text>
            <Text style={[styles.dayMonth, { color: colors.textTer }]}>{monthName}</Text>
          </View>

          {/* Center: calories + progress */}
          <View style={styles.dayCenterCol}>
            <View style={styles.dayCalRow}>
              <Text style={[styles.dayCal, { color: colors.text }]}>{dayData.calories}</Text>
              <Text style={[styles.dayCalUnit, { color: colors.textTer }]}>kcal</Text>
              <View style={[styles.mealCountBadge, { backgroundColor: colors.accentSoft }]}>
                <Feather name="list" size={10} color={colors.accent} />
                <Text style={[styles.mealCountText, { color: colors.accent }]}>{dayData.mealCount}</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${calProgress * 100}%`, backgroundColor: progressColor },
                ]}
              />
            </View>
            {/* Macro mini */}
            <View style={styles.dayMacroRow}>
              <Text style={[styles.dayMacroText, { color: '#34A853' }]}>P {dayData.protein}g</Text>
              <Text style={[styles.dayMacroDot, { color: colors.border }]}> / </Text>
              <Text style={[styles.dayMacroText, { color: '#F97316' }]}>C {dayData.carbs}g</Text>
              <Text style={[styles.dayMacroDot, { color: colors.border }]}> / </Text>
              <Text style={[styles.dayMacroText, { color: '#FBBC05' }]}>F {dayData.fat}g</Text>
            </View>
          </View>

          {/* Expand icon */}
          <Feather
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textTer}
            style={styles.expandIcon}
          />
        </View>

        {/* Expanded meals */}
        {isExpanded && <ExpandedMeals dayData={dayData} colors={colors} />}
      </View>
    </TouchableOpacity>
  )
}

// --- Main Screen ---
export default function NutritionLogScreen({ navigation }) {
  const { colors, card } = useTheme()
  const { member, gymInfo } = useAuth()

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [daysData, setDaysData] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  const fetchMonthData = useCallback(async (year, month) => {
    const gymId = gymInfo?.id
    const memberId = member?.id

    if (gymId && memberId) {
      try {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const today = new Date()
        const result = {}

        // Fetch each day's nutrition data
        const promises = []
        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(year, month, day)
          if (d > today) break
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          promises.push(
            api.get(`/gyms/${gymId}/members/${memberId}/nutrition/daily?date=${dateStr}`)
              .then(res => {
                if (res.data?.data) {
                  result[dateStr] = res.data.data
                }
              })
              .catch(() => {})
          )
        }
        await Promise.all(promises)

        if (Object.keys(result).length > 0) {
          return result
        }
      } catch {}
    }

    // No API data available — return empty
    return {}
  }, [gymInfo, member])

  const loadMonth = useCallback(async (year, month) => {
    setLoading(true)
    const data = await fetchMonthData(year, month)
    setDaysData(data)
    setExpandedDay(null)
    setLoading(false)
  }, [fetchMonthData])

  useEffect(() => {
    loadMonth(currentMonth.year, currentMonth.month)
  }, [currentMonth, loadMonth])

  const goToPrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const goToNextMonth = () => {
    const now = new Date()
    const { year, month } = currentMonth
    if (year === now.getFullYear() && month === now.getMonth()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await loadMonth(currentMonth.year, currentMonth.month)
    setRefreshing(false)
  }, [currentMonth, loadMonth])

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return currentMonth.year === now.getFullYear() && currentMonth.month === now.getMonth()
  }, [currentMonth])

  // Sort days newest first
  const sortedDays = useMemo(() => {
    return Object.values(daysData).sort((a, b) => b.date.localeCompare(a.date))
  }, [daysData])

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.bgSec }]}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition Log</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Navigator */}
      <View style={[styles.monthNav, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {MONTHS[currentMonth.month]} {currentMonth.year}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.monthArrow}
          disabled={isCurrentMonth}
        >
          <Feather name="chevron-right" size={22} color={isCurrentMonth ? colors.textTer : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <>
            {/* Monthly Stats */}
            <MonthlyStatsCard daysData={daysData} colors={colors} card={card} />

            <AdBanner style={{ marginBottom: 8 }} />

            {/* Weekly Summary */}
            <WeeklySummaryRow
              daysData={daysData}
              selectedDate={expandedDay}
              colors={colors}
            />

            {/* Day list */}
            {sortedDays.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentSoft || (colors.accent + '12') }]}>
                  <Feather name="book-open" size={48} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Meals Logged</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textTer }]}>
                  Start logging meals to see your nutrition history
                </Text>

                <View style={styles.emptyTips}>
                  {[
                    { icon: 'plus-circle', text: 'Tap + on the Health screen to add your first meal', color: colors.accent },
                    { icon: 'trending-up', text: 'Tracking helps you spot patterns and stay on target', color: '#34A853' },
                    { icon: 'target', text: 'Set macro goals to get personalised daily feedback', color: '#F97316' },
                  ].map((tip, i) => (
                    <View key={i} style={[styles.emptyTipRow, { borderColor: colors.border }]}>
                      <View style={[styles.emptyTipIcon, { backgroundColor: tip.color + '12' }]}>
                        <Feather name={tip.icon} size={16} color={tip.color} />
                      </View>
                      <Text style={[styles.emptyTipText, { color: colors.textSec }]}>
                        {tip.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              sortedDays.map((day) => (
                <DayCard
                  key={day.date}
                  dayData={day}
                  isExpanded={expandedDay === day.date}
                  onToggle={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                  colors={colors}
                  card={card}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.text,
  },

  // Month navigator
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  monthArrow: {
    padding: SPACING.xs,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: COLORS.text,
  },

  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },
  loadingWrap: {
    paddingTop: 100,
    alignItems: 'center',
  },

  // Monthly stats card
  statsCard: {
    ...ELITE_CARD,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statsTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsEmpty: {
    fontSize: 14,
    color: COLORS.textTer,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statItem: {
    width: '47%',
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textTer,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    color: COLORS.textSec,
    marginTop: 1,
  },

  // Weekly summary
  weekRow: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  weekLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSec,
    marginBottom: SPACING.sm,
  },
  weekMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekMacroItem: {
    alignItems: 'center',
  },
  weekMacroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  weekMacroValue: {
    fontSize: 15,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
  },
  weekMacroUnit: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: COLORS.textTer,
    marginTop: 1,
  },

  // Day card
  dayCard: {
    ...ELITE_CARD,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  dayMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayDateCol: {
    width: 48,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  dayName: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textSec,
  },
  dayNum: {
    fontSize: 22,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    lineHeight: 26,
  },
  dayMonth: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: COLORS.textTer,
  },
  dayCenterCol: {
    flex: 1,
  },
  dayCalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  dayCal: {
    fontSize: 20,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
  },
  dayCalUnit: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textTer,
    marginLeft: 3,
  },
  mealCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.sm,
    gap: 3,
  },
  mealCountText: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  dayMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayMacroText: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },
  dayMacroDot: {
    fontSize: 11,
  },
  expandIcon: {
    marginLeft: SPACING.sm,
  },

  // Expanded meals
  expandedContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },

  // Daily summary (inside expanded day)
  dailySummary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  dailySummaryCalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dailySummaryCal: {
    fontSize: 28,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  dailySummaryCalUnit: {
    fontSize: 12,
    fontFamily: FONT.medium,
    marginTop: 1,
  },
  dailySummaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  dailySummaryStatusText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
  },
  calProgressTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.md,
  },
  calProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  macroProgressSection: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  macroBarRow: {
    gap: 4,
  },
  macroBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  macroBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  macroBarLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    flex: 1,
  },
  macroBarValue: {
    fontSize: 13,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  macroBarTarget: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    marginLeft: 2,
  },
  macroBarTrack: {
    height: 4,
    borderRadius: 2,
  },
  macroBarFill: {
    height: 4,
    borderRadius: 2,
  },
  dailySummaryExtraRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  dailySummaryExtra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dailySummaryExtraText: {
    fontSize: 12,
    fontFamily: FONT.medium,
  },

  mealsHeading: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  mealSection: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  mealBadgeText: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    letterSpacing: 0.3,
  },
  mealTime: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    color: COLORS.textTer,
  },
  mealItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingLeft: SPACING.xs,
  },
  mealItemName: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  mealItemMacros: {
    alignItems: 'flex-end',
  },
  mealItemCal: {
    fontSize: 13,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  mealItemMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  mealItemMacroLabel: {
    fontSize: 10,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },
  mealItemMacroDivider: {
    fontSize: 10,
  },
  mealSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingTop: 6,
    marginTop: 4,
  },
  mealSubtotalLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
  },
  mealSubtotalValue: {
    fontSize: 12,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.textTer,
    textAlign: 'center',
  },
  emptyTips: {
    width: '100%',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  emptyTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTipText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    flex: 1,
  },
})
