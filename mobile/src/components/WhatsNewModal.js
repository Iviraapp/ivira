import React, { useState, useEffect } from 'react'
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { getItem, setItem } from '../lib/storage'
import Constants from 'expo-constants'

const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0'
const WHATS_NEW_KEY = 'ivira_whats_new_seen'

const FEATURES = [
  { icon: 'shield', color: '#10B981', title: 'Permissions & Privacy', desc: 'New consent screen — you control exactly what IVIRA accesses' },
  { icon: 'video', color: '#8B5CF6', title: 'AI Form Check', desc: 'Record a set, get AI form analysis with score and tips' },
  { icon: 'users', color: '#6C63FF', title: 'Circles', desc: 'Accountability groups with streaks, reactions, and leaderboards' },
  { icon: 'lock', color: '#3B82F6', title: 'Password Login', desc: 'Set a password to skip OTP — sign in faster' },
  { icon: 'map-pin', color: '#F97316', title: 'Smart Geofencing', desc: 'Get notified when you\'re near your gym — one tap to check in' },
  { icon: 'zap', color: '#10B981', title: 'Vira AI Coach', desc: 'Context-aware coaching that reads your sleep, steps, and form scores' },
]

export default function WhatsNewModal({ isLoggedIn }) {
  const [visible, setVisible] = useState(false)
  const { colors } = useTheme()

  useEffect(() => {
    // Only show after user is logged in — not during onboarding
    if (!isLoggedIn) return
    getItem(WHATS_NEW_KEY).then(seen => {
      if (seen !== CURRENT_VERSION) setVisible(true)
    }).catch(() => {})
  }, [isLoggedIn])

  const handleDismiss = () => {
    setVisible(false)
    setItem(WHATS_NEW_KEY, CURRENT_VERSION).catch(() => {})
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.bgSec || '#0E1018' }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
            <View style={s.badge}>
              <Text style={s.badgeText}>NEW IN v{CURRENT_VERSION}</Text>
            </View>
            <Text style={[s.title, { color: colors.text }]}>What's New</Text>
            <Text style={[s.subtitle, { color: colors.textSec }]}>Here's what we've been building for you</Text>

            {FEATURES.map((f, i) => (
              <View key={i} style={[s.feature, { borderColor: colors.border }]}>
                <View style={[s.featureIcon, { backgroundColor: f.color + '15' }]}>
                  <Feather name={f.icon} size={18} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.featureTitle, { color: colors.text }]}>{f.title}</Text>
                  <Text style={[s.featureDesc, { color: colors.textSec }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 24, paddingTop: 0 }}>
            <TouchableOpacity style={s.cta} onPress={handleDismiss} activeOpacity={0.85}>
              <Text style={s.ctaText}>Let's go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { borderRadius: 24, maxHeight: '80%', width: '100%', overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  badge: { backgroundColor: COLORS.accent + '18', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  badgeText: { fontSize: 11, color: COLORS.accent, fontWeight: '700', fontFamily: FONT.bold, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', fontFamily: FONT.extraBold, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: FONT.regular, marginBottom: 24 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '700', fontFamily: FONT.bold, marginBottom: 2 },
  featureDesc: { fontSize: 12, fontFamily: FONT.regular, lineHeight: 17 },
  cta: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', fontFamily: FONT.bold, color: '#07080F' },
})
