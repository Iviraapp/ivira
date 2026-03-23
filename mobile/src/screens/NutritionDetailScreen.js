// NutritionDetailScreen — Comprehensive nutrition breakdown
// Tabs: Overview | Calories | Nutrients | Macros
// All premium features (nutrient detail, macros chart, export) are FREE
import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Share,
  Dimensions, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Svg, { Circle, G, Path, Line, Text as SvgText } from 'react-native-svg'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AdBanner from '../components/AdBanner'
import Haptics from '../lib/haptics'

const { width: SW } = Dimensions.get('window')

const TABS = ['Overview', 'Calories', 'Nutrients', 'Macros']

// Day navigation: today ± N days
function useDayNav() {
  const [offset, setOffset] = useState(0)
  const date = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d
  }, [offset])
  const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday'
    : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  return { date, label, prev: () => setOffset(o => o - 1), next: () => setOffset(o => Math.min(0, o + 1)), canNext: offset < 0 }
}

// Seed-based demo data per date
function getDemoDay(date) {
  const ds = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  let h = 0; for (let i = 0; i < ds.length; i++) h = ((h << 5) - h + ds.charCodeAt(i)) | 0
  const r = (min, max) => { h = (h * 16807 + 12345) & 0x7fffffff; return min + (h % (max - min + 1)) }

  const meals = r(2, 5)
  const cal = r(1200, 2400)
  const protein = r(40, 160)
  const carbs = r(80, 300)
  const fat = r(20, 80)
  const fiber = r(8, 40)
  const sugar = r(15, 80)
  const satFat = Math.round(fat * 0.35)
  const polyFat = Math.round(fat * 0.25)
  const monoFat = Math.round(fat * 0.3)
  const transFat = r(0, 2)
  const sodium = r(800, 2800)
  const cholesterol = r(100, 400)
  const potassium = r(1500, 4000)
  const vitA = r(30, 120)
  const vitC = r(20, 150)
  const calcium = r(400, 1200)
  const iron = r(6, 22)
  const water = r(3, 10)
  const exercise = r(0, 500)

  // Top foods per macro
  const topProtein = [
    { name: 'Paneer Tikka', g: r(18, 28) },
    { name: 'Egg Bhurji (2 eggs)', g: r(12, 18) },
    { name: 'Dal Tadka', g: r(8, 14) },
  ]
  const topCarbs = [
    { name: 'Steamed Rice', g: r(40, 65) },
    { name: 'Chapati (2)', g: r(30, 45) },
    { name: 'Poha', g: r(25, 38) },
  ]
  const topFat = [
    { name: 'Ghee (1 tbsp)', g: r(10, 15) },
    { name: 'Peanut Chutney', g: r(8, 14) },
    { name: 'Coconut Curry', g: r(6, 12) },
  ]

  return {
    cal, protein, carbs, fat, fiber, sugar, satFat, polyFat, monoFat, transFat,
    sodium, cholesterol, potassium, vitA, vitC, calcium, iron, water, exercise, meals,
    topProtein, topCarbs, topFat,
  }
}

// Goals
const GOALS = {
  cal: 2000, protein: 120, carbs: 250, fat: 65, fiber: 30, sugar: 50,
  satFat: 20, polyFat: 16, monoFat: 22, transFat: 2,
  sodium: 2300, cholesterol: 300, potassium: 3500,
  vitA: 100, vitC: 90, calcium: 1000, iron: 18,
}

// Donut chart for macros
function DonutChart({ protein, carbs, fat, size = 160 }) {
  const total = protein + carbs + fat || 1
  const pPct = protein / total
  const cPct = carbs / total
  const fPct = fat / total
  const cx = size / 2, cy = size / 2, r = size / 2 - 12, sw = 22
  const circumference = 2 * Math.PI * r

  const segments = [
    { pct: cPct, color: '#14B8A6' },
    { pct: fPct, color: '#8B5CF6' },
    { pct: pPct, color: '#F97316' },
  ]

  let offset = 0
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
      {segments.map((seg, i) => {
        const dash = seg.pct * circumference
        const gap = circumference - dash
        const rot = offset * 360 - 90
        offset += seg.pct
        return (
          <Circle
            key={i} cx={cx} cy={cy} r={r}
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            fill="none"
            rotation={rot} origin={`${cx}, ${cy}`}
          />
        )
      })}
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize={24} fontWeight="700">
        {total}
      </SvgText>
      <SvgText x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>
        cal logged
      </SvgText>
    </Svg>
  )
}

// Calorie ring (Goal - Food + Exercise = Remaining)
function CalorieRing({ goal, food, exercise, size = 180 }) {
  const net = food - exercise
  const remaining = Math.max(0, goal - net)
  const pct = Math.min(1, net / goal)
  const over = net > goal
  const cx = size / 2, cy = size / 2, r = size / 2 - 16, sw = 14
  const circumference = 2 * Math.PI * r
  const dash = pct * circumference

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={over ? COLORS.red : COLORS.accent}
          strokeWidth={sw}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          fill="none"
          rotation={-90} origin={`${cx}, ${cy}`}
        />
        <SvgText x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize={32} fontWeight="800">
          {remaining.toLocaleString()}
        </SvgText>
        <SvgText x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={12}>
          Remaining
        </SvgText>
      </Svg>
    </View>
  )
}

// Nutrient row
function NutrientRow({ name, total, goal, left, color, colors: c }) {
  const pct = goal > 0 ? Math.min(1, total / goal) : 0
  return (
    <View style={[styles.nutrientRow, { borderBottomColor: c.border }]}>
      <View style={styles.nutrientLeft}>
        <View style={[styles.nutrientDot, { backgroundColor: color || c.accent }]} />
        <Text style={[styles.nutrientName, { color: c.text }]}>{name}</Text>
      </View>
      <Text style={[styles.nutrientVal, { color: c.textSec }]}>{total}</Text>
      <Text style={[styles.nutrientVal, { color: c.accent }]}>{goal}</Text>
      <Text style={[styles.nutrientVal, { color: left > 0 ? c.textSec : COLORS.red }]}>{left}</Text>
    </View>
  )
}

// Progress bar for overview
function NutrientCard({ icon, name, current, goal, unit, color, tip, foods, colors: c }) {
  const pct = goal > 0 ? Math.min(1, current / goal) : 0
  return (
    <View style={[styles.nutrientCard, { backgroundColor: c.bgSec, borderColor: c.border }]}>
      <View style={styles.nutrientCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name={icon} size={18} color={color} />
          <Text style={[styles.nutrientCardName, { color: c.text }]}>{name}</Text>
          <Text style={[styles.nutrientCardVal, { color: c.text }]}>{current}{unit}</Text>
        </View>
        <Text style={{ color: c.textTer, fontSize: 12 }}>Goal: {goal}{unit}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.bgTer }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      {tip ? <Text style={[styles.nutrientTip, { color: c.textSec }]}>{tip}</Text> : null}
      {foods ? <Text style={[styles.nutrientFoods, { color: c.textTer }]}>{foods}</Text> : null}
    </View>
  )
}

export default function NutritionDetailScreen({ navigation, route }) {
  const { colors, card } = useTheme()
  const { isDemo } = useAuth()
  const [tab, setTab] = useState(route?.params?.tab || 0)
  const day = useDayNav()

  const data = useMemo(() => getDemoDay(day.date), [day.date])

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const lines = [
      'Nutrient,Total,Goal,Remaining',
      `Calories,${data.cal},${GOALS.cal},${GOALS.cal - data.cal}`,
      `Protein (g),${data.protein},${GOALS.protein},${GOALS.protein - data.protein}`,
      `Carbohydrates (g),${data.carbs},${GOALS.carbs},${GOALS.carbs - data.carbs}`,
      `Fat (g),${data.fat},${GOALS.fat},${GOALS.fat - data.fat}`,
      `Fiber (g),${data.fiber},${GOALS.fiber},${GOALS.fiber - data.fiber}`,
      `Sugar (g),${data.sugar},${GOALS.sugar},${GOALS.sugar - data.sugar}`,
      `Saturated Fat (g),${data.satFat},${GOALS.satFat},${GOALS.satFat - data.satFat}`,
      `Sodium (mg),${data.sodium},${GOALS.sodium},${GOALS.sodium - data.sodium}`,
      `Cholesterol (mg),${data.cholesterol},${GOALS.cholesterol},${GOALS.cholesterol - data.cholesterol}`,
      `Potassium (mg),${data.potassium},${GOALS.potassium},${GOALS.potassium - data.potassium}`,
      `Iron (mg),${data.iron},${GOALS.iron},${GOALS.iron - data.iron}`,
      `Calcium (mg),${data.calcium},${GOALS.calcium},${GOALS.calcium - data.calcium}`,
    ]
    const csv = lines.join('\n')
    try {
      await Share.share({ message: csv, title: `Nutrition Report — ${day.label}` })
    } catch {}
  }, [data, day.label])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
        <TouchableOpacity onPress={handleExport}>
          <Text style={[styles.exportBtn, { color: colors.accent }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === i && styles.tabActive]}
            onPress={() => { setTab(i); Haptics.selectionAsync() }}
          >
            <Text style={[styles.tabText, { color: tab === i ? colors.accent : colors.textTer }]}>{t}</Text>
            {tab === i && <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Day nav */}
      <View style={styles.dayNav}>
        <TouchableOpacity onPress={day.prev} style={styles.dayArrow}>
          <Feather name="chevron-left" size={20} color={colors.textSec} />
        </TouchableOpacity>
        <Text style={[styles.dayLabel, { color: colors.text }]}>{day.label}</Text>
        <TouchableOpacity onPress={day.next} disabled={!day.canNext} style={styles.dayArrow}>
          <Feather name="chevron-right" size={20} color={day.canNext ? colors.textSec : colors.bgTer} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ===== OVERVIEW TAB ===== */}
        {tab === 0 && (
          <View style={styles.tabContent}>
            <NutrientCard
              icon="target" name="Protein" current={data.protein} goal={GOALS.protein} unit="g"
              color="#F97316"
              tip="Protein builds muscle and keeps you fuller between meals."
              foods="Try: Paneer, eggs, Greek yogurt, dal, chicken, or fish"
              colors={colors}
            />
            <NutrientCard
              icon="zap" name="Fiber" current={data.fiber} goal={GOALS.fiber} unit="g"
              color="#8B5CF6"
              tip="Fiber helps digestion, fills you up, and prevents glucose spikes."
              foods="Try: Vegetables, guava, beans, brown rice, and oats"
              colors={colors}
            />
            <NutrientCard
              icon="loader" name="Carbohydrates" current={data.carbs} goal={GOALS.carbs} unit="g"
              color="#14B8A6"
              tip="Carbs fuel your workouts and sustain energy throughout the day."
              foods="Try: Roti, rice, fruits, sweet potato, and millets"
              colors={colors}
            />
            <NutrientCard
              icon="droplet" name="Fat" current={data.fat} goal={GOALS.fat} unit="g"
              color="#FBBC05"
              tip="Healthy fats support hormone balance and vitamin absorption."
              foods="Try: Ghee, nuts, coconut, avocado, and olive oil"
              colors={colors}
            />

            <TouchableOpacity
              style={[styles.viewAllBtn, { borderColor: colors.accent }]}
              onPress={() => setTab(2)}
            >
              <Text style={[styles.viewAllText, { color: colors.accent }]}>View All Nutrients</Text>
              <Feather name="external-link" size={14} color={colors.accent} />
            </TouchableOpacity>

            <AdBanner />
          </View>
        )}

        {/* ===== CALORIES TAB ===== */}
        {tab === 1 && (
          <View style={styles.tabContent}>
            {/* Calorie equation */}
            <View style={[styles.eqCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              <View style={styles.eqRow}>
                <View style={styles.eqCol}>
                  <Text style={[styles.eqNum, { color: colors.text }]}>{GOALS.cal.toLocaleString()}</Text>
                  <Text style={[styles.eqLabel, { color: colors.textTer }]}>Goal</Text>
                </View>
                <Text style={[styles.eqOp, { color: colors.textTer }]}>-</Text>
                <View style={styles.eqCol}>
                  <Text style={[styles.eqNum, { color: colors.text }]}>{data.cal.toLocaleString()}</Text>
                  <Text style={[styles.eqLabel, { color: colors.textTer }]}>Food</Text>
                </View>
                <Text style={[styles.eqOp, { color: colors.textTer }]}>+</Text>
                <View style={styles.eqCol}>
                  <Text style={[styles.eqNum, { color: colors.text }]}>{data.exercise}</Text>
                  <Text style={[styles.eqLabel, { color: colors.textTer }]}>Exercise</Text>
                </View>
                <Text style={[styles.eqOp, { color: colors.textTer }]}>=</Text>
                <View style={styles.eqCol}>
                  <Text style={[styles.eqNum, { color: colors.accent, fontWeight: '800' }]}>
                    {(GOALS.cal - data.cal + data.exercise).toLocaleString()}
                  </Text>
                  <Text style={[styles.eqLabel, { color: colors.textTer }]}>Remaining</Text>
                </View>
              </View>
            </View>

            {/* Ring */}
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <CalorieRing goal={GOALS.cal} food={data.cal} exercise={data.exercise} />
            </View>

            {/* Breakdown cards */}
            <View style={styles.calCards}>
              <CalStatCard icon="flag" label="Base Goal" value={GOALS.cal} color={colors.textSec} colors={colors} />
              <CalStatCard icon="coffee" label="Food" value={data.cal} color="#F97316" colors={colors} />
              <CalStatCard icon="zap" label="Exercise" value={data.exercise} color={COLORS.green} colors={colors} />
              <CalStatCard icon="droplet" label="Water" value={`${data.water} glasses`} color="#4285F4" colors={colors} />
            </View>

            <AdBanner />
          </View>
        )}

        {/* ===== NUTRIENTS TAB ===== */}
        {tab === 2 && (
          <View style={styles.tabContent}>
            <View style={[styles.nutrientTable, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              {/* Header */}
              <View style={[styles.nutrientRow, styles.nutrientHeader, { borderBottomColor: colors.border, backgroundColor: colors.bgTer }]}>
                <View style={styles.nutrientLeft}>
                  <Text style={[styles.nutrientHeaderText, { color: colors.textTer }]}> </Text>
                </View>
                <Text style={[styles.nutrientHeaderText, { color: colors.textTer }]}>Total</Text>
                <Text style={[styles.nutrientHeaderText, { color: colors.accent }]}>Goal</Text>
                <Text style={[styles.nutrientHeaderText, { color: colors.textTer }]}>Left</Text>
              </View>

              <NutrientRow name="Protein" total={data.protein} goal={GOALS.protein} left={GOALS.protein - data.protein} color="#F97316" colors={colors} />
              <NutrientRow name="Carbohydrates" total={data.carbs} goal={GOALS.carbs} left={GOALS.carbs - data.carbs} color="#14B8A6" colors={colors} />
              <NutrientRow name="Fiber" total={data.fiber} goal={GOALS.fiber} left={GOALS.fiber - data.fiber} color="#8B5CF6" colors={colors} />
              <NutrientRow name="Sugar" total={data.sugar} goal={GOALS.sugar} left={GOALS.sugar - data.sugar} color="#EA4335" colors={colors} />
              <NutrientRow name="Fat" total={data.fat} goal={GOALS.fat} left={GOALS.fat - data.fat} color="#FBBC05" colors={colors} />
              <NutrientRow name="Saturated Fat" total={data.satFat} goal={GOALS.satFat} left={GOALS.satFat - data.satFat} color="#FBBC05" colors={colors} />
              <NutrientRow name="Polyunsaturated Fat" total={data.polyFat} goal={GOALS.polyFat} left={GOALS.polyFat - data.polyFat} color="#FBBC05" colors={colors} />
              <NutrientRow name="Monounsaturated Fat" total={data.monoFat} goal={GOALS.monoFat} left={GOALS.monoFat - data.monoFat} color="#FBBC05" colors={colors} />
              <NutrientRow name="Trans Fat" total={data.transFat} goal={GOALS.transFat} left={GOALS.transFat - data.transFat} color="#EA4335" colors={colors} />

              {/* Divider */}
              <View style={[styles.nutrientDivider, { backgroundColor: colors.border }]} />

              <NutrientRow name="Sodium (mg)" total={data.sodium} goal={GOALS.sodium} left={GOALS.sodium - data.sodium} color="#94A3B8" colors={colors} />
              <NutrientRow name="Cholesterol (mg)" total={data.cholesterol} goal={GOALS.cholesterol} left={GOALS.cholesterol - data.cholesterol} color="#94A3B8" colors={colors} />
              <NutrientRow name="Potassium (mg)" total={data.potassium} goal={GOALS.potassium} left={GOALS.potassium - data.potassium} color="#94A3B8" colors={colors} />
              <NutrientRow name="Vitamin A (%)" total={data.vitA} goal={GOALS.vitA} left={GOALS.vitA - data.vitA} color="#F97316" colors={colors} />
              <NutrientRow name="Vitamin C (%)" total={data.vitC} goal={GOALS.vitC} left={GOALS.vitC - data.vitC} color="#34A853" colors={colors} />
              <NutrientRow name="Calcium (mg)" total={data.calcium} goal={GOALS.calcium} left={GOALS.calcium - data.calcium} color="#94A3B8" colors={colors} />
              <NutrientRow name="Iron (mg)" total={data.iron} goal={GOALS.iron} left={GOALS.iron - data.iron} color="#EA4335" colors={colors} />
            </View>

            <AdBanner />
          </View>
        )}

        {/* ===== MACROS TAB ===== */}
        {tab === 3 && (
          <View style={styles.tabContent}>
            {/* Donut */}
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <DonutChart protein={data.protein * 4} carbs={data.carbs * 4} fat={data.fat * 9} />
            </View>

            {/* Macro percentages */}
            <View style={[styles.macroLegend, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              {[
                { name: 'Carbohydrates', g: data.carbs, color: '#14B8A6', goalPct: 45 },
                { name: 'Fat', g: data.fat, color: '#8B5CF6', goalPct: 25 },
                { name: 'Protein', g: data.protein, color: '#F97316', goalPct: 30 },
              ].map(m => {
                const total = (data.protein * 4) + (data.carbs * 4) + (data.fat * 9)
                const cal = m.name === 'Fat' ? m.g * 9 : m.g * 4
                const pct = total > 0 ? Math.round((cal / total) * 100) : 0
                return (
                  <View key={m.name} style={[styles.macroRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                      <Text style={[styles.macroName, { color: colors.text }]}>{m.name} ({m.g}g)</Text>
                    </View>
                    <Text style={[styles.macroPct, { color: colors.textSec }]}>{pct}%</Text>
                    <Text style={[styles.macroPct, { color: colors.accent }]}>{m.goalPct}%</Text>
                  </View>
                )
              })}
              <View style={[styles.macroRow, styles.macroHeaderRow]}>
                <View style={{ flex: 1 }} />
                <Text style={[styles.macroHeaderText, { color: colors.textTer }]}>Total</Text>
                <Text style={[styles.macroHeaderText, { color: colors.textTer }]}>Goal</Text>
              </View>
            </View>

            {/* Foods highest in each macro — FREE (this is premium in MFP) */}
            {[
              { title: 'Foods Highest In Carbohydrates', items: data.topCarbs, color: '#14B8A6', unit: 'g carbs' },
              { title: 'Foods Highest In Fat', items: data.topFat, color: '#8B5CF6', unit: 'g fat' },
              { title: 'Foods Highest In Protein', items: data.topProtein, color: '#F97316', unit: 'g protein' },
            ].map(section => (
              <View key={section.title} style={[styles.topFoodsCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
                <Text style={[styles.topFoodsTitle, { color: colors.text }]}>{section.title}</Text>
                {section.items.map((item, idx) => (
                  <View key={idx} style={[styles.topFoodRow, { borderTopColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={[styles.topFoodRank, { color: colors.textTer }]}>{idx + 1}.</Text>
                      <Text style={[styles.topFoodName, { color: colors.text }]}>{item.name}</Text>
                    </View>
                    <Text style={[styles.topFoodVal, { color: section.color }]}>{item.g} {section.unit}</Text>
                  </View>
                ))}
              </View>
            ))}

            <AdBanner />
          </View>
        )}

      </ScrollView>
    </View>
  )
}

function CalStatCard({ icon, label, value, color, colors: c }) {
  return (
    <View style={[styles.calStatCard, { backgroundColor: c.bgSec, borderColor: c.border }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.calStatLabel, { color: c.textTer }]}>{label}</Text>
      <Text style={[styles.calStatVal, { color: c.text }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  exportBtn: { fontSize: 14, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabActive: {},
  tabIndicator: {
    position: 'absolute', bottom: -1, height: 2.5, width: '80%', borderRadius: 2,
  },
  dayNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 20,
  },
  dayArrow: { padding: 6 },
  dayLabel: { fontSize: 15, fontWeight: '600', minWidth: 100, textAlign: 'center' },
  scroll: { flex: 1 },
  tabContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Nutrient cards (Overview)
  nutrientCard: {
    borderRadius: RADIUS.lg, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  nutrientCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  nutrientCardName: { fontSize: 16, fontWeight: '700' },
  nutrientCardVal: { fontSize: 16, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  nutrientTip: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  nutrientFoods: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderWidth: 1, borderRadius: RADIUS.md, marginTop: 4, marginBottom: 8,
  },
  viewAllText: { fontSize: 14, fontWeight: '600' },

  // Calorie equation
  eqCard: {
    borderRadius: RADIUS.lg, borderWidth: 1, padding: 16,
  },
  eqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  eqCol: { alignItems: 'center' },
  eqNum: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  eqLabel: { fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  eqOp: { fontSize: 18, fontWeight: '300' },

  calCards: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16,
  },
  calStatCard: {
    borderRadius: RADIUS.md, borderWidth: 1, padding: 14, width: (SW - 42) / 2,
    gap: 4,
  },
  calStatLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  calStatVal: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Nutrients table
  nutrientTable: {
    borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden',
  },
  nutrientRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nutrientHeader: { paddingVertical: 10 },
  nutrientHeaderRow: { borderBottomWidth: 0 },
  nutrientLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nutrientDot: { width: 6, height: 6, borderRadius: 3 },
  nutrientName: { fontSize: 14, fontWeight: '500' },
  nutrientVal: { width: 55, textAlign: 'right', fontSize: 14, fontVariant: ['tabular-nums'] },
  nutrientHeaderText: { width: 55, textAlign: 'right', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  nutrientDivider: { height: 1, marginVertical: 4 },

  // Macros
  macroLegend: {
    borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden', marginTop: 8,
  },
  macroRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  macroHeaderRow: {
    paddingVertical: 8, borderBottomWidth: 0,
  },
  macroHeaderText: { width: 50, textAlign: 'right', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  macroDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  macroName: { fontSize: 14, fontWeight: '500' },
  macroPct: { width: 50, textAlign: 'right', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // Top foods
  topFoodsCard: {
    borderRadius: RADIUS.lg, borderWidth: 1, marginTop: 12, padding: 16,
  },
  topFoodsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  topFoodRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  topFoodRank: { fontSize: 12, marginRight: 8, fontWeight: '600' },
  topFoodName: { fontSize: 13, fontWeight: '500' },
  topFoodVal: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
})
