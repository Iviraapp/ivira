import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { getItem, setItem } from '../lib/storage'
import { generateActionPlan } from '../lib/RecommendationEngine'
import Haptics from '../lib/haptics'

const { width: SCREEN_W } = Dimensions.get('window')

const MACRO_COLORS = {
  protein: '#3B82F6',
  carbs: '#22C55E',
  fat: '#F59E0B',
}

export default function ActionPlanScreen({ navigation, route }) {
  const { colors, card, isDark } = useTheme()
  const { member, gymId, isDemo } = useAuth()
  const [plan, setPlan] = useState(null)

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(40)).current
  const calScale = useRef(new Animated.Value(0.6)).current
  const barWidth = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadPlan()
  }, [])

  useEffect(() => {
    if (plan) {
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(slideUp, { toValue: 0, damping: 18, stiffness: 100, useNativeDriver: true }),
        ]),
        Animated.spring(calScale, { toValue: 1, damping: 12, stiffness: 90, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 700, useNativeDriver: false }),
      ]).start()
    }
  }, [plan])

  const loadPlan = async () => {
    // Check if profile was passed via route, otherwise load from storage
    let profile = route?.params?.profile
    if (!profile) {
      const stored = await getItem('ivira_nutrition_profile').catch(() => null)
      if (stored) {
        try { profile = JSON.parse(stored) } catch {}
      }
    }
    if (!profile) {
      // Fallback — shouldn't happen if navigated correctly
      profile = { age: 28, gender: 'male', weight: 75, height: 175, activityLevel: 'moderate', goalKey: 'weight_loss' }
    }
    const result = generateActionPlan(profile)
    setPlan(result)
  }

  const handleAccept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (plan) {
      const goal = {
        calorie_goal: plan.calories,
        protein_goal: plan.protein,
        carb_goal: plan.carbs,
        fat_goal: plan.fat,
        water_ml: plan.waterMl,
        goal_type: plan.goalKey,
        bmr: plan.bmr,
        tdee: plan.tdee,
      }
      await setItem('ivira_custom_nutrition_goal', JSON.stringify(goal)).catch(() => {})
    }
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }

  if (!plan) return null

  const macroBarTotal = plan.proteinPct + plan.carbsPct + plan.fatPct

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B0F19' : colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() && navigation.goBack()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Your Optimal Protocol</Text>
          <Text style={[styles.headerSub, { color: colors.textSec }]}>
            Personalised to your body &amp; goals
          </Text>
        </Animated.View>

        {/* Calorie Target Card */}
        <Animated.View style={[
          styles.calorieCard,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,82,255,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,82,255,0.12)' },
          { opacity: fadeIn, transform: [{ scale: calScale }] },
        ]}>
          <Text style={[styles.calorieNumber, { color: colors.text }]}>
            {plan.calories}
          </Text>
          <Text style={[styles.calorieUnit, { color: COLORS.accent }]}>kcal / day</Text>
          <Text style={[styles.calorieSummary, { color: colors.textSec }]}>
            {plan.planSummary}
          </Text>
        </Animated.View>

        {/* Fuel Mix — Macro Bar */}
        <Animated.View style={[styles.section, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>The Fuel Mix</Text>

          {/* Segmented Bar */}
          <View style={styles.macroBarContainer}>
            <Animated.View style={[styles.macroBar, { transform: [{ scaleX: barWidth }] }]}>
              <View style={[styles.macroSegment, { flex: plan.proteinPct, backgroundColor: MACRO_COLORS.protein, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }]} />
              <View style={[styles.macroSegment, { flex: plan.carbsPct, backgroundColor: MACRO_COLORS.carbs }]} />
              <View style={[styles.macroSegment, { flex: plan.fatPct, backgroundColor: MACRO_COLORS.fat, borderTopRightRadius: 20, borderBottomRightRadius: 20 }]} />
            </Animated.View>
          </View>

          {/* Macro Grid */}
          <View style={styles.macroGrid}>
            {[
              { label: 'PROTEIN', grams: plan.protein, pct: plan.proteinPct, color: MACRO_COLORS.protein },
              { label: 'CARBS', grams: plan.carbs, pct: plan.carbsPct, color: MACRO_COLORS.carbs },
              { label: 'FATS', grams: plan.fat, pct: plan.fatPct, color: MACRO_COLORS.fat },
            ].map(m => (
              <View key={m.label} style={styles.macroCol}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={[styles.macroGrams, { color: colors.text }]}>{m.grams}g</Text>
                <Text style={styles.macroPct}>{m.pct}%</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Fasting Recommendation */}
        <Animated.View style={[styles.section, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fasting Protocol</Text>

          <View style={[styles.fastingCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.fastingHeader}>
              <View style={styles.fastingPill}>
                <Feather name="clock" size={14} color="#FFFFFF" />
                <Text style={styles.fastingPillText}>{plan.recommendedFast}</Text>
              </View>
              <Text style={[styles.fastingLabel, { color: colors.textSec }]}>Recommended</Text>
            </View>
            <Text style={[styles.fastingReason, { color: colors.textTer }]}>
              {plan.fastingReason}
            </Text>
          </View>
        </Animated.View>

        {/* Water & Extras */}
        <Animated.View style={[styles.section, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hydration</Text>
          <View style={[styles.waterCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)', borderColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)' }]}>
            <Feather name="droplet" size={20} color="#3B82F6" />
            <View style={styles.waterContent}>
              <Text style={[styles.waterAmount, { color: colors.text }]}>
                {(plan.waterMl / 1000).toFixed(1)}L
              </Text>
              <Text style={[styles.waterLabel, { color: colors.textSec }]}>daily water target</Text>
            </View>
          </View>
        </Animated.View>

        {/* BMR/TDEE Breakdown */}
        <Animated.View style={[styles.section, { opacity: fadeIn }]}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>BMR</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{plan.bmr}</Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>TDEE</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{plan.tdee}</Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>{plan.deficit > 0 ? 'DEFICIT' : plan.surplus > 0 ? 'SURPLUS' : 'BALANCE'}</Text>
              <Text style={[styles.breakdownValue, { color: plan.deficit > 0 ? '#3B82F6' : plan.surplus > 0 ? '#22C55E' : colors.textSec }]}>
                {plan.deficit > 0 ? `-${plan.deficit}` : plan.surplus > 0 ? `+${plan.surplus}` : '0'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Spacer for button clearance */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Accept Plan Button — fixed at bottom */}
      <View style={[styles.buttonContainer, { backgroundColor: isDark ? '#0B0F19' : colors.bg }]}>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
          <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.acceptBtnText}>Accept Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONT.bold,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Calorie Card
  calorieCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
  },
  calorieNumber: {
    fontSize: 56,
    fontFamily: FONT.numExtraBold,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    lineHeight: 62,
  },
  calorieUnit: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  calorieSummary: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 16,
  },

  // Macro Bar
  macroBarContainer: {
    height: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  macroBar: {
    flexDirection: 'row',
    height: '100%',
    transformOrigin: 'left',
  },
  macroSegment: {
    height: '100%',
  },

  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCol: {
    flex: 1,
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  macroGrams: {
    fontSize: 18,
    fontFamily: FONT.numBold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  macroPct: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSec,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Fasting Card
  fastingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  fastingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  fastingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  fastingPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT.numBold,
    fontWeight: '700',
  },
  fastingLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  fastingReason: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Water
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  waterContent: {
    flex: 1,
  },
  waterAmount: {
    fontSize: 20,
    fontFamily: FONT.numBold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Breakdown Row
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 32,
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  breakdownValue: {
    fontSize: 18,
    fontFamily: FONT.numBold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Button Container
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT.semibold,
    fontWeight: '600',
  },
})
