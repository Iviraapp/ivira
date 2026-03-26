import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SLEEP_COLORS } from './SleepConstants'

export default function SleepDebtIndicator({ debtHours = 0, colors }) {
  const maxDebt = 10
  const pct = Math.min(debtHours / maxDebt, 1)
  const barColor = debtHours <= 2 ? SLEEP_COLORS.debtGreen
    : debtHours <= 5 ? SLEEP_COLORS.debtAmber
    : SLEEP_COLORS.debtRed
  const label = debtHours <= 1 ? 'Well rested' : debtHours <= 3 ? 'Slight deficit' : debtHours <= 5 ? 'Sleep deficit' : 'Significant debt'

  return (
    <View style={[styles.container, { backgroundColor: colors?.bgSec || 'rgba(108,99,255,0.06)' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="battery-charging" size={14} color={barColor} />
          <Text style={[styles.title, { color: colors?.text || '#FFF' }]}>Sleep Debt</Text>
        </View>
        <Text style={[styles.value, { color: barColor }]}>
          {debtHours <= 0.5 ? 'None' : `${debtHours.toFixed(1)}h`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(pct * 100, 2)}%`, backgroundColor: barColor }]} />
        {/* Zone markers */}
        <View style={[styles.zoneMarker, { left: '20%' }]} />
        <View style={[styles.zoneMarker, { left: '50%' }]} />
      </View>
      <Text style={[styles.label, { color: colors?.textTer || 'rgba(255,255,255,0.4)' }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 14, borderRadius: 14, marginVertical: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '800' },
  track: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden', position: 'relative',
  },
  fill: { height: '100%', borderRadius: 3 },
  zoneMarker: { position: 'absolute', top: 0, width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
  label: { fontSize: 11, fontWeight: '500', marginTop: 6, textAlign: 'center' },
})
