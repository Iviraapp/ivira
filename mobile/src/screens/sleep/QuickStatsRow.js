import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SLEEP_COLORS } from './SleepConstants'
import { formatDuration } from './SleepHelpers'

export default function QuickStatsRow({ log, colors }) {
  const duration = log?.deepMinutes != null
    ? (log.deepMinutes + log.remMinutes + log.lightMinutes + (log.awakeMinutes || 0))
    : null
  const totalMin = duration || (log ? require('./SleepHelpers').calcDurationMinutes(log.bedHour, log.bedMin, log.wakeHour, log.wakeMin) : 0)

  const stats = [
    {
      icon: 'clock', label: 'Duration',
      value: formatDuration(totalMin),
      color: SLEEP_COLORS.primary,
    },
    {
      icon: 'percent', label: 'Efficiency',
      value: log?.efficiency != null ? `${log.efficiency}%` : '-',
      color: '#22C55E',
    },
    {
      icon: 'moon', label: 'Deep',
      value: log?.deepMinutes != null ? `${Math.round((log.deepMinutes / totalMin) * 100)}%` : '-',
      color: SLEEP_COLORS.deep,
    },
    {
      icon: 'eye', label: 'REM',
      value: log?.remMinutes != null ? `${Math.round((log.remMinutes / totalMin) * 100)}%` : '-',
      color: SLEEP_COLORS.rem,
    },
  ]

  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.pill, { backgroundColor: colors?.bgSec || 'rgba(108,99,255,0.08)' }]}>
          <Feather name={s.icon} size={12} color={s.color} style={styles.pillIcon} />
          <Text style={[styles.pillValue, { color: colors?.text || '#FFF' }]}>{s.value}</Text>
          <Text style={[styles.pillLabel, { color: colors?.textTer || 'rgba(255,255,255,0.45)' }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12, gap: 6 },
  pill: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12, alignItems: 'center',
  },
  pillIcon: { marginBottom: 4 },
  pillValue: { fontSize: 14, fontWeight: '700' },
  pillLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
})
