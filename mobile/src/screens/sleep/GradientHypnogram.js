import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SLEEP_COLORS, STAGE_Y, STAGE_FILL } from './SleepConstants'
import { formatTime12 } from './SleepHelpers'

let Svg, Path, Rect, Defs, LinearGradient, Stop, G, SvgText
try {
  const svg = require('react-native-svg')
  Svg = svg.default || svg.Svg
  Path = svg.Path
  Rect = svg.Rect
  Defs = svg.Defs
  LinearGradient = svg.LinearGradient
  Stop = svg.Stop
  G = svg.G
  SvgText = svg.Text
} catch {}

const CHART_H = 120
const LABEL_W = 42
const PADDING_R = 8

const STAGE_ORDER = ['awake', 'rem', 'light', 'deep']
const STAGE_SHORT = { awake: 'Awake', rem: 'REM', light: 'Light', deep: 'Deep' }

export default function GradientHypnogram({ epochs, colors, width = 320, startTime, endTime }) {
  if (!epochs || epochs.length < 2) return null

  const chartW = width - LABEL_W - PADDING_R
  const barW = Math.max(1, chartW / epochs.length)

  // Build SVG path for area fill
  const points = epochs.map((ep, i) => {
    const x = LABEL_W + i * barW
    const stage = (ep.stage || ep).toLowerCase()
    const y = STAGE_Y[stage] !== undefined ? (STAGE_Y[stage] / 100) * CHART_H : CHART_H * 0.1
    return { x, y, stage }
  })

  // Stepped path (not smooth — sleep stages are discrete)
  let pathD = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i - 1].y} L ${points[i].x} ${points[i].y}`
  }
  // Close for area fill
  const areaD = pathD + ` L ${points[points.length - 1].x + barW} ${points[points.length - 1].y} L ${points[points.length - 1].x + barW} ${CHART_H} L ${LABEL_W} ${CHART_H} Z`

  // Time labels
  const startLabel = startTime ? formatTimeShort(startTime) : ''
  const endLabel = endTime ? formatTimeShort(endTime) : ''

  if (!Svg) {
    // Fallback: simple colored bars
    return (
      <View style={styles.fallback}>
        <View style={styles.fallbackRow}>
          {epochs.slice(0, 60).map((ep, i) => {
            const stage = (ep.stage || ep).toLowerCase()
            return (
              <View key={i} style={[styles.fallbackBar, {
                backgroundColor: STAGE_FILL[stage] || SLEEP_COLORS.light,
                height: `${STAGE_Y[stage] || 50}%`,
              }]} />
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Svg width={width} height={CHART_H + 28}>
        <Defs>
          <LinearGradient id="hypnoGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={SLEEP_COLORS.primary} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={SLEEP_COLORS.deep} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <Path d={areaD} fill="url(#hypnoGrad)" />

        {/* Colored bars per epoch */}
        {epochs.map((ep, i) => {
          const stage = (ep.stage || ep).toLowerCase()
          const y = (STAGE_Y[stage] !== undefined ? STAGE_Y[stage] / 100 : 0.1) * CHART_H
          return (
            <Rect
              key={i}
              x={LABEL_W + i * barW}
              y={y}
              width={Math.max(barW - 0.5, 1)}
              height={CHART_H - y}
              fill={STAGE_FILL[stage] || SLEEP_COLORS.light}
              opacity={0.7}
              rx={barW > 3 ? 1 : 0}
            />
          )
        })}

        {/* Stage line */}
        <Path d={pathD} stroke={SLEEP_COLORS.primary} strokeWidth={1.5} fill="none" opacity={0.8} />

        {/* Y-axis labels */}
        {STAGE_ORDER.map((stage, i) => (
          <SvgText
            key={stage}
            x={2}
            y={(STAGE_Y[stage] / 100) * CHART_H + 4}
            fontSize={9}
            fill="rgba(255,255,255,0.4)"
            fontWeight="500"
          >
            {STAGE_SHORT[stage]}
          </SvgText>
        ))}

        {/* X-axis time labels */}
        {startLabel ? (
          <SvgText x={LABEL_W} y={CHART_H + 16} fontSize={10} fill="rgba(255,255,255,0.35)">
            {startLabel}
          </SvgText>
        ) : null}
        {endLabel ? (
          <SvgText x={width - PADDING_R - 40} y={CHART_H + 16} fontSize={10} fill="rgba(255,255,255,0.35)" textAnchor="end">
            {endLabel}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  )
}

function formatTimeShort(t) {
  if (typeof t === 'string') {
    const d = new Date(t)
    return formatTime12(d.getHours(), d.getMinutes())
  }
  if (t instanceof Date) return formatTime12(t.getHours(), t.getMinutes())
  return ''
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  fallback: { height: CHART_H, marginVertical: 8 },
  fallbackRow: { flexDirection: 'row', flex: 1, alignItems: 'flex-end' },
  fallbackBar: { flex: 1, marginHorizontal: 0.5, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
})
