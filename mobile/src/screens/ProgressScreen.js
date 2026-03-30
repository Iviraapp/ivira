// ProgressScreen — Steps, Weight & Nutrition progress tracking
// Inspired by fitness trackers but with our own dark glassmorphic design
// All features free — no premium gates
import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Share,
  FlatList, Dimensions, Platform, Modal,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import Haptics from '../lib/haptics'

const { width: SW } = Dimensions.get('window')
const CHART_W = SW - 64
const CHART_H = 160

const TABS = ['Steps', 'Weight', 'Nutrition']
const DATE_RANGES = [
  { label: '1 Week', days: 7 },
  { label: '1 Month', days: 30 },
  { label: '2 Months', days: 60 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
  { label: 'All', days: 730 },
]

// Returns empty data (no demo generation)
function generateData(type, days) {
  return []
}

function formatDateEntry(d) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return {
    full: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
    day: days[d.getDay()],
  }
}

function formatShortMonth(d) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${m[d.getMonth()]} ${d.getDate()}`
}

// Bar chart component
function BarChart({ data, goal, unit, color, colors: c }) {
  if (!data.length) return null
  const maxVal = Math.max(...data.map(d => d.value), goal || 0)
  const barCount = Math.min(data.length, 12)
  const slice = data.slice(0, barCount).reverse()
  const barW = Math.max(8, Math.min(28, (CHART_W - 40) / barCount - 4))
  const gridLines = 4
  const chartInnerH = CHART_H - 24

  return (
    <View style={[styles.chartWrap, { backgroundColor: c.bgSec, borderColor: c.border }]}>
      <Svg width={CHART_W} height={CHART_H}>
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = 4 + (chartInnerH / gridLines) * i
          const val = Math.round(maxVal * (1 - i / gridLines))
          return (
            <G key={i}>
              <Line x1={36} y1={y} x2={CHART_W} y2={y} stroke={c.border} strokeWidth={0.5} />
              <SvgText x={32} y={y + 4} textAnchor="end" fill={c.textTer} fontSize={9}>
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </SvgText>
            </G>
          )
        })}

        {/* Goal line */}
        {goal > 0 && (
          <Line
            x1={36} y1={4 + chartInnerH * (1 - goal / maxVal)}
            x2={CHART_W} y2={4 + chartInnerH * (1 - goal / maxVal)}
            stroke={COLORS.red} strokeWidth={1} strokeDasharray="4,3"
          />
        )}

        {/* Bars */}
        {slice.map((item, i) => {
          const pct = maxVal > 0 ? item.value / maxVal : 0
          const bh = Math.max(2, pct * chartInnerH)
          const x = 40 + i * ((CHART_W - 44) / barCount) + (barW / 2)
          const y = 4 + chartInnerH - bh
          return (
            <G key={i}>
              <Rect
                x={x} y={y} width={barW} height={bh}
                rx={barW / 2} fill={item.value >= (goal || Infinity) ? COLORS.green : color}
              />
              {i % Math.max(1, Math.floor(barCount / 5)) === 0 && (
                <SvgText
                  x={x + barW / 2} y={CHART_H - 2}
                  textAnchor="middle" fill={c.textTer} fontSize={8}
                >
                  {formatShortMonth(item.date)}
                </SvgText>
              )}
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

export default function ProgressScreen({ navigation }) {
  const { colors, card } = useTheme()
  const [tab, setTab] = useState(0)
  const [rangeIdx, setRangeIdx] = useState(1) // default 1 Month
  const [pickerVisible, setPickerVisible] = useState(false)

  const range = DATE_RANGES[rangeIdx]
  const tabName = TABS[tab]

  const data = useMemo(() => generateData(tabName, range.days), [tabName, range.days])

  const stats = useMemo(() => {
    if (!data.length) return { avg: 0, best: 0, bestDate: '', total: 0 }
    const values = data.map(d => d.value)
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    const bestVal = Math.max(...values)
    const bestEntry = data.find(d => d.value === bestVal)
    const bestDate = bestEntry ? formatShortMonth(bestEntry.date) : ''
    const total = Math.round(values.reduce((a, b) => a + b, 0))
    return { avg, best: bestVal, bestDate, total }
  }, [data])

  const goal = tab === 0 ? 10000 : tab === 1 ? 75 : 2000
  const unit = tab === 0 ? 'steps' : tab === 1 ? 'kg' : 'kcal'
  const barColor = tab === 0 ? COLORS.accent : tab === 1 ? '#14B8A6' : '#F97316'

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const header = `Date,${tabName}\n`
    const rows = data.map(d => `${d.dateStr},${d.value}`).join('\n')
    try {
      await Share.share({ message: header + rows, title: `${tabName} Progress — ${range.label}` })
    } catch {}
  }, [data, tabName, range.label])

  const renderEntry = useCallback(({ item }) => {
    const { full, day } = formatDateEntry(item.date)
    return (
      <View style={[styles.entryRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.entryDate, { color: colors.text }]}>{full}</Text>
          <Text style={[styles.entryDay, { color: colors.textTer }]}>{day}</Text>
        </View>
        <Text style={[styles.entryValue, { color: colors.text }]}>
          {tab === 1 ? item.value.toFixed(1) : item.value.toLocaleString()}
        </Text>
      </View>
    )
  }, [colors, tab])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
        <TouchableOpacity onPress={handleExport}>
          <Feather name="share" size={20} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      {/* Tabs + Range */}
      <View style={styles.tabRow}>
        <View style={[styles.tabBar, { borderColor: colors.border }]}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === i && { backgroundColor: colors.accent }]}
              onPress={() => { setTab(i); Haptics.selectionAsync() }}
            >
              <Text style={[styles.tabBtnText, { color: tab === i ? '#fff' : colors.textSec }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.rangeBtn}
          onPress={() => { setPickerVisible(true); Haptics.selectionAsync() }}
        >
          <Text style={[styles.rangeBtnText, { color: colors.accent }]}>{range.label}</Text>
          <Feather name="chevron-down" size={14} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: colors.text }]}>
            {tab === 1 ? stats.avg.toFixed(1) : stats.avg.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTer }]}>AVERAGE</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: colors.text }]}>
            {tab === 1 ? stats.best.toFixed(1) : stats.best.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTer }]}>BEST ({stats.bestDate.toUpperCase()})</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statCol}>
          <Text style={[styles.statVal, { color: colors.text }]}>
            {stats.total >= 100000 ? `${(stats.total / 1000).toFixed(0)}k` : stats.total.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTer }]}>TOTAL</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <BarChart data={data} goal={goal} unit={unit} color={barColor} colors={colors} />
      </View>

      {/* Entries list */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Entries</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.dateStr}
        renderItem={renderEntry}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Date Range Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[styles.pickerSheet, { backgroundColor: colors.bgSec }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Feather name="x" size={22} color={colors.textSec} />
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select a Date Range</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Feather name="check" size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingVertical: 8 }}>
              {DATE_RANGES.map((dr, i) => (
                <TouchableOpacity
                  key={dr.label}
                  style={[styles.pickerOption, i === rangeIdx && { backgroundColor: colors.accentSoft }]}
                  onPress={() => {
                    setRangeIdx(i)
                    Haptics.selectionAsync()
                    setPickerVisible(false)
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    { color: i === rangeIdx ? colors.accent : colors.textSec },
                    i === rangeIdx && { fontWeight: '700', fontSize: 17 },
                  ]}>
                    {dr.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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

  tabRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  tabBar: {
    flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden',
  },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
  },
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  rangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  rangeBtnText: { fontSize: 14, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
  statDivider: { width: 1, height: 32, marginHorizontal: 4 },

  chartWrap: {
    borderRadius: RADIUS.lg, borderWidth: 1, padding: 12,
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryDate: { fontSize: 14, fontWeight: '500' },
  entryDay: { fontSize: 12, marginTop: 2 },
  entryValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Picker
  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600' },
  pickerOption: {
    paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
    borderRadius: RADIUS.md, marginHorizontal: 12, marginVertical: 2,
  },
  pickerOptionText: { fontSize: 15, fontWeight: '500' },
})
