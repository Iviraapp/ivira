import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'
import { setItem } from '../lib/storage'

let Camera, Location, Notifications, MediaLibrary
try { Camera = require('expo-camera') } catch {}
try { Location = require('expo-location') } catch {}
try { Notifications = require('expo-notifications') } catch {}
try { MediaLibrary = require('expo-media-library') } catch {}

export const PERMISSIONS_KEY = 'ivira_permissions_done'

const PERMS = [
  { id: 'camera', icon: 'camera', title: 'Camera', desc: 'Scan barcodes, take food photos, record workout form', color: '#10B981' },
  { id: 'location', icon: 'map-pin', title: 'Location', desc: 'GPS check-in at your gym', color: '#3B82F6' },
  { id: 'notifications', icon: 'bell', title: 'Notifications', desc: 'Workout reminders, streak alerts, gym proximity', color: '#F97316' },
  { id: 'microphone', icon: 'mic', title: 'Microphone', desc: 'Sleep tracking detects snoring (on-device only)', color: '#8B5CF6' },
  { id: 'activity', icon: 'activity', title: 'Health & Activity', desc: 'Track steps and sleep via Health Connect', color: '#EF4444' },
]

export default function PermissionsScreen({ onComplete }) {
  const [granted, setGranted] = useState({})
  const [requesting, setRequesting] = useState(null)

  const requestPerm = async (id) => {
    setRequesting(id)
    try {
      if (id === 'camera' && Camera) {
        const { status } = await Camera.requestCameraPermissionsAsync()
        setGranted(p => ({ ...p, camera: status === 'granted' }))
      } else if (id === 'location' && Location) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        setGranted(p => ({ ...p, location: status === 'granted' }))
      } else if (id === 'notifications' && Notifications) {
        const { status } = await Notifications.requestPermissionsAsync()
        setGranted(p => ({ ...p, notifications: status === 'granted' }))
      } else if (id === 'microphone') {
        // Microphone permission is requested when sleep tracking starts
        setGranted(p => ({ ...p, microphone: true }))
      } else if (id === 'activity') {
        // Health Connect permissions are requested when health features are used
        try {
          const { requestHealthPermissions } = require('../lib/permissions')
          await requestHealthPermissions()
          setGranted(p => ({ ...p, activity: true }))
        } catch {
          setGranted(p => ({ ...p, activity: true }))
        }
      }
    } catch {
      setGranted(p => ({ ...p, [id]: true })) // Don't block on failure
    }
    setRequesting(null)
  }

  const grantAll = async () => {
    for (const p of PERMS) {
      if (!granted[p.id]) await requestPerm(p.id)
    }
  }

  const handleContinue = async () => {
    await setItem(PERMISSIONS_KEY, 'true').catch(() => {})
    onComplete()
  }

  const allDone = PERMS.every(p => granted[p.id])

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.iconWrap}>
            <Feather name="shield" size={28} color={COLORS.accent} />
          </View>
          <Text style={s.title}>App Permissions</Text>
          <Text style={s.subtitle}>
            IVIRA needs a few permissions to track your health and provide the best experience. You can change these anytime in Settings.
          </Text>
        </View>

        {PERMS.map(p => (
          <View key={p.id} style={s.card}>
            <View style={[s.permIcon, { backgroundColor: p.color + '15' }]}>
              <Feather name={p.icon} size={20} color={p.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.permTitle}>{p.title}</Text>
              <Text style={s.permDesc}>{p.desc}</Text>
            </View>
            {granted[p.id] ? (
              <View style={s.grantedBadge}>
                <Feather name="check" size={14} color={COLORS.accent} />
              </View>
            ) : (
              <TouchableOpacity
                style={s.grantBtn}
                onPress={() => requestPerm(p.id)}
                disabled={requesting === p.id}
                activeOpacity={0.8}
              >
                <Text style={s.grantBtnText}>{requesting === p.id ? '...' : 'Grant'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {!allDone && (
          <TouchableOpacity style={s.allBtn} onPress={grantAll} activeOpacity={0.85}>
            <Text style={s.allBtnText}>Grant All Permissions</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.continueBtn, allDone && s.continueBtnActive]} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={[s.continueBtnText, allDone && { color: '#07080F' }]}>
            {allDone ? 'Continue' : 'Skip for now'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080F' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 28 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#F0F2F8', fontFamily: FONT.extraBold, letterSpacing: -0.5, marginBottom: 10 },
  subtitle: { fontSize: 14, color: 'rgba(240,242,248,0.5)', fontFamily: FONT.regular, lineHeight: 21 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  permIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 15, fontWeight: '700', color: '#F0F2F8', fontFamily: FONT.bold, marginBottom: 2 },
  permDesc: { fontSize: 12, color: 'rgba(240,242,248,0.4)', fontFamily: FONT.regular, lineHeight: 17 },
  grantBtn: { backgroundColor: COLORS.accent + '18', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.accent + '30' },
  grantBtnText: { fontSize: 12, color: COLORS.accent, fontWeight: '700', fontFamily: FONT.bold },
  grantedBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' },
  allBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  allBtnText: { fontSize: 14, color: '#F0F2F8', fontWeight: '600', fontFamily: FONT.semibold },
  continueBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  continueBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  continueBtnText: { fontSize: 15, color: '#F0F2F8', fontWeight: '700', fontFamily: FONT.bold },
})
