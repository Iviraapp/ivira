// WaterTracker — Quick water intake logging
// Preset buttons in ml (Indian standard), change unit option
import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { getItem, setItem } from '../lib/storage'
import Haptics from '../lib/haptics'
import { recordWaterIntake } from '../lib/SmartNotificationEngine'

const PRESETS_ML = [250, 500, 750]
const DAILY_GOAL_ML = 2500 // 2.5L default
const STORAGE_KEY_PREFIX = 'ivira_water_'

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export default function WaterTracker({ style, compact }) {
  const { colors } = useTheme()
  const [totalMl, setTotalMl] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [customMl, setCustomMl] = useState('')

  // Load today's water
  useEffect(() => {
    const key = STORAGE_KEY_PREFIX + getToday()
    getItem(key).then(val => {
      if (val) setTotalMl(parseInt(val, 10) || 0)
    }).catch(() => {})
  }, [])

  const addWater = useCallback(async (ml) => {
    const newTotal = totalMl + ml
    setTotalMl(newTotal)
    const key = STORAGE_KEY_PREFIX + getToday()
    await setItem(key, String(newTotal))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Record pattern for smart notifications
    recordWaterIntake(ml).catch(() => {})
  }, [totalMl])

  const handlePreset = (ml) => addWater(ml)
  const handleCustom = () => {
    const ml = parseInt(customMl, 10)
    if (ml > 0) {
      addWater(ml)
      setCustomMl('')
      setModalVisible(false)
    }
  }

  const glasses = Math.round(totalMl / 250)
  const pct = Math.min(1, totalMl / DAILY_GOAL_ML)
  const liters = (totalMl / 1000).toFixed(1)

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Feather name="droplet" size={18} color="#4285F4" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.compactTitle, { color: colors.text }]}>Water</Text>
          <Text style={[styles.compactVal, { color: colors.textSec }]}>{liters}L / {(DAILY_GOAL_ML / 1000).toFixed(1)}L</Text>
        </View>
        <View style={[styles.compactBar, { backgroundColor: colors.bgTer }]}>
          <View style={[styles.compactBarFill, { width: `${pct * 100}%` }]} />
        </View>
        <Feather name="plus" size={16} color={colors.accent} style={{ marginLeft: 8 }} />

        {/* Inline water modal */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={[styles.modal, { backgroundColor: colors.bgSec }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={22} color={colors.textSec} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Water</Text>
                <TouchableOpacity onPress={handleCustom}>
                  <Feather name="check" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Current intake */}
              <View style={styles.modalStats}>
                <Feather name="droplet" size={32} color="#4285F4" />
                <Text style={[styles.modalTotal, { color: colors.text }]}>{liters}L</Text>
                <Text style={[styles.modalGoal, { color: colors.textTer }]}>of {(DAILY_GOAL_ML / 1000).toFixed(1)}L goal ({glasses} glasses)</Text>
              </View>

              {/* Presets */}
              <View style={styles.presetRow}>
                {PRESETS_ML.map(ml => (
                  <TouchableOpacity
                    key={ml}
                    style={[styles.presetBtn, { borderColor: colors.border }]}
                    onPress={() => handlePreset(ml)}
                  >
                    <Text style={[styles.presetText, { color: colors.text }]}>+{ml}ml</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom input */}
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.customInput, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
                  value={customMl}
                  onChangeText={setCustomMl}
                  placeholder="Custom ml"
                  placeholderTextColor={colors.textTer}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={[styles.customUnit, { color: colors.textSec }]}>ml</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </TouchableOpacity>
    )
  }

  // Full version
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgSec, borderColor: colors.border }, style]}>
      <View style={styles.headerRow}>
        <Feather name="droplet" size={18} color="#4285F4" />
        <Text style={[styles.title, { color: colors.text }]}>Water Intake</Text>
        <Text style={[styles.subtitle, { color: colors.textTer }]}>{liters}L / {(DAILY_GOAL_ML / 1000).toFixed(1)}L</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.bgTer }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={[styles.glassText, { color: colors.textTer }]}>{glasses} glasses today</Text>

      <View style={styles.btnRow}>
        {PRESETS_ML.map(ml => (
          <TouchableOpacity
            key={ml}
            style={[styles.addBtn, { borderColor: colors.border }]}
            onPress={() => handlePreset(ml)}
          >
            <Text style={[styles.addBtnText, { color: colors.text }]}>+{ml}ml</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addBtn, styles.customBtn, { borderColor: colors.accent }]}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="edit-2" size={14} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.lg, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  subtitle: { fontSize: 12 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#4285F4', borderRadius: 4 },
  glassText: { fontSize: 11, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 8 },
  addBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1,
    alignItems: 'center',
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  customBtn: { flex: 0, paddingHorizontal: 14 },

  // Compact
  compactWrap: {
    flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1,
    padding: 14,
  },
  compactTitle: { fontSize: 13, fontWeight: '600' },
  compactVal: { fontSize: 11, marginTop: 1 },
  compactBar: { width: 60, height: 4, borderRadius: 2, overflow: 'hidden' },
  compactBarFill: { height: '100%', backgroundColor: '#4285F4', borderRadius: 2 },

  // Modal
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modal: { width: '85%', borderRadius: 20, padding: 20 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12, marginBottom: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalStats: { alignItems: 'center', marginBottom: 24, gap: 8 },
  modalTotal: { fontSize: 36, fontWeight: '800' },
  modalGoal: { fontSize: 13 },
  presetRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  presetBtn: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1,
    alignItems: 'center',
  },
  presetText: { fontSize: 14, fontWeight: '600' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.md,
    borderWidth: 1, fontSize: 16, textAlign: 'center',
  },
  customUnit: { fontSize: 14, fontWeight: '600' },
})
