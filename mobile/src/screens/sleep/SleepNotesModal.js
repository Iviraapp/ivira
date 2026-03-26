import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SLEEP_TAGS, SLEEP_COLORS } from './SleepConstants'

export default function SleepNotesModal({ visible, onClose, onSave, initialTags = [] }) {
  const [selected, setSelected] = useState(new Set(initialTags))

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Sleep Notes</Text>
          <Text style={styles.subtitle}>What affected your sleep?</Text>

          <View style={styles.grid}>
            {SLEEP_TAGS.map(tag => {
              const active = selected.has(tag.id)
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.chip, active && { backgroundColor: tag.color + '25', borderColor: tag.color }]}
                  onPress={() => toggle(tag.id)}
                  activeOpacity={0.7}
                >
                  <Feather name={tag.icon} size={14} color={active ? tag.color : 'rgba(255,255,255,0.4)'} />
                  <Text style={[styles.chipLabel, active && { color: tag.color }]}>{tag.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => { onSave([...selected]); onClose() }}
            >
              <Feather name="check" size={16} color="#FFF" />
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Inline tag chips for display (non-modal)
export function TagChips({ tags, onPress, colors }) {
  if (!tags || tags.length === 0) {
    return (
      <TouchableOpacity style={styles.addTagBtn} onPress={onPress} activeOpacity={0.7}>
        <Feather name="plus" size={12} color={SLEEP_COLORS.primary} />
        <Text style={[styles.addTagText, { color: SLEEP_COLORS.primary }]}>Add sleep notes</Text>
      </TouchableOpacity>
    )
  }
  return (
    <TouchableOpacity style={styles.tagsRow} onPress={onPress} activeOpacity={0.7}>
      {tags.map(id => {
        const tag = SLEEP_TAGS.find(t => t.id === id)
        if (!tag) return null
        return (
          <View key={id} style={[styles.miniChip, { backgroundColor: tag.color + '20' }]}>
            <Feather name={tag.icon} size={10} color={tag.color} />
            <Text style={[styles.miniLabel, { color: tag.color }]}>{tag.label}</Text>
          </View>
        )
      })}
      <View style={styles.editIcon}>
        <Feather name="edit-2" size={10} color="rgba(255,255,255,0.3)" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#131620', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: SLEEP_COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveText: { color: '#FFF', fontWeight: '700' },
  addTagBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addTagText: { fontSize: 12, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingVertical: 4 },
  miniChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  miniLabel: { fontSize: 10, fontWeight: '600' },
  editIcon: { marginLeft: 2 },
})
