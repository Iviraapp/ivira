import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Platform, Modal, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Haptics from '../lib/haptics'
import api from '../lib/api'
import { generateNonce, formatDate } from '../lib/utils'
import { premiumAlert } from '../components/PremiumAlert'
import { recordWorkout } from '../lib/SmartNotificationEngine'
import { canAddToWallet, addMembershipToWallet } from '../lib/wallet'

let QRCode = null
try { if (Platform.OS !== 'web') QRCode = require('react-native-qrcode-svg').default } catch {}
let NfcManager = null, NfcTech = null
function loadNfc() {
  try { const n = require('react-native-nfc-manager'); NfcManager = n.default; NfcTech = n.NfcTech } catch {}
}
let Location = null
try { Location = require('expo-location') } catch {}

const { width: W } = Dimensions.get('window')
const QR_SIZE = Math.min(W * 0.52, 220)
const REFRESH_SEC = 30

export default function CheckInScreen({ navigation }) {
  const { colors, isDark } = useTheme()
  const { member, gymId, gymInfo: gym, refreshProfile, hasMembership } = useAuth()

  const [qrData, setQrData]           = useState(null)
  const [qrError, setQrError]         = useState(false)
  const [countdown, setCountdown]     = useState(REFRESH_SEC)
  const [nfcAvailable, setNfcAvailable] = useState(false)
  const [nfcScanning, setNfcScanning] = useState(false)
  const [gpsChecking, setGpsChecking] = useState(false)
  const [walletAvailable, setWalletAvailable] = useState(false)
  const [addingWallet, setAddingWallet] = useState(false)
  const [checkedIn, setCheckedIn]     = useState(false)
  const [proximity, setProximity]     = useState(null)

  const breathe   = useRef(new Animated.Value(1)).current
  const successAnim = useRef(new Animated.Value(0)).current
  const nfcInit   = useRef(false)

  // Membership info
  const membership  = member?.membership || member?.active_membership || member
  const expiryDate  = membership?.end_date || membership?.membership_end
  const daysLeft    = expiryDate ? Math.max(0, Math.ceil((new Date(expiryDate) - new Date()) / 86400000)) : 0
  const isActive    = (membership?.status === 'active' || member?.status === 'active') && daysLeft > 0
  const checkinCount = member?.checkin_count || member?.total_checkins || 0
  const streak      = member?.streak || 0

  // Breathe animation on QR card
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.015, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1,     duration: 2000, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // QR generation
  const generateQR = useCallback(async () => {
    // QR is LOCKED for unlinked members — no fallback
    if (!gymId || !member?.id) {
      navigation.replace('MembershipActivation')
      return
    }
    try {
      const res = await api.post(`/gyms/${gymId}/qr/generate`, { phone: member.phone })
      setQrData(res.data.token)
      setQrError(false)
      setCountdown(REFRESH_SEC)
    } catch {
      setQrData(null) // Clear stale QR
      setQrError(true)
    }
  }, [gymId, member?.id, member?.phone])

  useEffect(() => {
    generateQR()
    const t = setInterval(generateQR, REFRESH_SEC * 1000)
    return () => clearInterval(t)
  }, [generateQR])

  useEffect(() => {
    const t = setInterval(() => setCountdown(p => p <= 1 ? REFRESH_SEC : p - 1), 1000)
    return () => clearInterval(t)
  }, [])

  // NFC detection
  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadNfc()
      setNfcAvailable(!!NfcManager)
    }
    canAddToWallet().then(setWalletAvailable).catch(() => {})
  }, [])

  useEffect(() => {
    if (!gym?.latitude || !gym?.longitude || !Location) {
      setProximity({ dist: null, canGPS: false })
      return
    }
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(pos => {
        const dLat = (gym.latitude - pos.coords.latitude) * Math.PI / 180
        const dLon = (gym.longitude - pos.coords.longitude) * Math.PI / 180
        const a = Math.sin(dLat/2)**2 +
          Math.cos(pos.coords.latitude * Math.PI/180) *
          Math.cos(gym.latitude * Math.PI/180) *
          Math.sin(dLon/2)**2
        const dist = Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
        setProximity({ dist, canGPS: dist <= (gym.gps_radius_meters || 150) })
      }).catch(() => setProximity({ dist: null, canGPS: false }))
  }, [gym?.latitude, gym?.longitude])

  useEffect(() => {
    if (!hasMembership) navigation.replace('MembershipActivation')
  }, [hasMembership])

  if (!hasMembership) return null

  const handleSuccess = (message) => {
    setCheckedIn(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Animated.sequence([
      Animated.spring(successAnim, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }),
      Animated.delay(2000),
    ]).start(() => { setCheckedIn(false); successAnim.setValue(0) })
    recordWorkout().catch(() => {})
    refreshProfile?.()
    if (message) premiumAlert('Checked In!', message)
  }

  // NFC check-in
  const handleNFC = async () => {
    if (!NfcManager || Platform.OS === 'web') return openQRModal()
    try {
      if (!nfcInit.current) {
        await NfcManager.start()
        if (!(await NfcManager.isSupported())) return
        nfcInit.current = true
      }
      setNfcScanning(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await NfcManager.requestTechnology(NfcTech.Ndef)
      const tag = await NfcManager.getTag()
      if (!tag) { premiumAlert('NFC Failed', 'Hold closer to the reader.'); return }
      const uid = tag.id || ''
      const res = await api.post(`/gyms/${gymId}/checkins/nfc`, { tag_uid: uid })
      handleSuccess(res.data?.checkin?.member_name ? `${res.data.checkin.member_name} — NFC check-in!` : 'NFC check-in complete!')
    } catch (e) {
      if (e?.message !== 'cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        premiumAlert('Check-in Failed', e?.response?.data?.error || e.message || 'NFC error')
      }
    } finally {
      setNfcScanning(false)
      NfcManager?.cancelTechnologyRequest?.().catch(() => {})
    }
  }

  // GPS check-in
  const handleGPS = async () => {
    if (!gymId) return
    if (!Location) { premiumAlert('Unavailable', 'Location services not available.'); return }
    setGpsChecking(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { premiumAlert('Permission', 'Location permission required.'); return }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const res = await api.post(`/gyms/${gymId}/checkins/gps`, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })
      const name = res.data?.checkin?.member_name || member?.name || ''
      const dist = res.data?.checkin?.distance_meters || 0
      handleSuccess(`${name} — GPS check-in (${dist}m from gym)`)
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      premiumAlert('Check-in Failed', e?.response?.data?.error || 'Too far from gym')
    } finally {
      setGpsChecking(false)
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Check In</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>

        {/* QR Card */}
        <Animated.View style={[s.qrCard, { backgroundColor: colors.bgTer, borderColor: COLORS.accent + '35', transform: [{ scale: breathe }] }]}>
          <View style={s.qrTopBar} />
          <View style={s.qrLabelRow}>
            <Text style={[s.qrLabel, { color: colors.textSec }]}>Scan at the kiosk</Text>
            <View style={s.countdownPill}>
              <Feather name="refresh-cw" size={10} color={COLORS.accent} />
              <Text style={[s.countdownText, { color: COLORS.accent }]}>{countdown}s</Text>
            </View>
          </View>

          <View style={s.qrBox}>
            {qrData ? (
              QRCode ? (
                <QRCode value={qrData} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
              ) : (
                <View style={[s.qrFallback, { width: QR_SIZE, height: QR_SIZE }]}>
                  <Feather name="maximize" size={40} color="#999" />
                  <Text style={s.qrFallbackText}>QR ready</Text>
                </View>
              )
            ) : qrError ? (
              <TouchableOpacity onPress={generateQR} style={{ alignItems: 'center', justifyContent: 'center', width: QR_SIZE, height: QR_SIZE }} activeOpacity={0.7}>
                <Feather name="refresh-cw" size={24} color={colors.textTer} />
                <Text style={{ color: colors.textSec, fontSize: 13, fontFamily: FONT.regular, marginTop: 8, textAlign: 'center' }}>Couldn't load check-in code.{'\n'}Tap to retry.</Text>
              </TouchableOpacity>
            ) : (
              <View style={[s.qrPlaceholder, { width: QR_SIZE, height: QR_SIZE }]}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
            )}
          </View>

          <Text style={[s.memberName, { color: colors.textSec }]}>{member?.name}</Text>
        </Animated.View>

        {/* Check-in methods */}
        <Text style={[s.orText, { color: colors.textTer }]}>or use</Text>

        <View style={s.methods}>
          {proximity?.canGPS && (
            <TouchableOpacity onPress={handleGPS} disabled={gpsChecking} activeOpacity={0.85}
              style={{ backgroundColor: COLORS.accent + '12', borderWidth: 1, borderColor: COLORS.accent + '40',
                borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.accent + '20',
                alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="map-pin" size={20} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: FONT.bold, marginBottom: 2 }}>GPS Check-in</Text>
                <Text style={{ fontSize: 12, color: COLORS.accent, fontFamily: FONT.regular }}>
                  {gpsChecking ? 'Getting location...' : `You're ${proximity.dist}m away — tap to check in`}
                </Text>
              </View>
              {gpsChecking ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Feather name="chevron-right" size={18} color={COLORS.accent} />}
            </TouchableOpacity>
          )}
          <MethodButton
            icon="rss"
            label={nfcScanning ? 'Hold near reader...' : 'NFC Tap'}
            sub="Instant tap-and-go"
            active={nfcAvailable}
            loading={nfcScanning}
            onPress={handleNFC}
            colors={colors}
          />
          {walletAvailable && (
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
                <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.medium, letterSpacing: 0.5 }}>OR</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
              </View>
              <TouchableOpacity
                onPress={() => addMembershipToWallet({ gymId, memberId: member?.id, memberName: member?.name,
                  gymName: gym?.gym_name || gym?.name, planName: membership?.plan_name, expiryDate: membership?.end_date })}
                activeOpacity={0.85}
                style={{ backgroundColor: colors.bgTer, borderWidth: 1, borderColor: colors.borderStrong,
                  borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12,
                  backgroundColor: Platform.OS === 'android' ? 'rgba(66,133,244,0.12)' : 'rgba(0,0,0,0.06)',
                  alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="credit-card" size={20} color={Platform.OS === 'android' ? '#4285F4' : colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: FONT.bold, marginBottom: 2 }}>
                    {Platform.OS === 'android' ? 'Add to Google Wallet' : 'Add to Apple Wallet'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSec, fontFamily: FONT.regular, lineHeight: 17 }}>
                    Shows on your lock screen near the gym — tap to check in
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textTer} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Membership card */}
        {(membership?.plan_name || expiryDate) && (
          <View style={[s.membershipCard, { backgroundColor: colors.bgTer, borderColor: isActive ? COLORS.accent + '30' : COLORS.danger + '30' }]}>
            <View style={s.membershipRow}>
              <View>
                <Text style={[s.planName, { color: colors.text }]}>{membership?.plan_name || membership?.name || 'Membership'}</Text>
                <Text style={[s.planSub, { color: colors.textSec }]}>{expiryDate ? `Expires ${formatDate(expiryDate)}` : ''}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: isActive ? COLORS.accentSoft : 'rgba(255,77,109,0.1)' }]}>
                <Text style={[s.statusText, { color: isActive ? COLORS.accent : COLORS.danger }]}>
                  {isActive ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>
            <View style={[s.statsStrip, { borderTopColor: colors.border }]}>
              <StatCell value={daysLeft.toString()} label="days left" color={isActive ? COLORS.accent : COLORS.danger} colors={colors} />
              <View style={[s.stripDivider, { backgroundColor: colors.border }]} />
              <StatCell value={checkinCount.toString()} label="check-ins" colors={colors} />
              <View style={[s.stripDivider, { backgroundColor: colors.border }]} />
              <StatCell value={streak.toString()} label="day streak" color={streak > 0 ? '#FFB547' : undefined} colors={colors} />
            </View>
          </View>
        )}
      </View>

      {/* Success overlay */}
      {checkedIn && (
        <Animated.View style={[s.successOverlay, { opacity: successAnim, transform: [{ scale: successAnim }] }]}>
          <View style={s.successCircle}>
            <Feather name="check" size={36} color="#07080F" />
          </View>
          <Text style={s.successText}>Checked In!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

function MethodButton({ icon, label, sub, active = true, loading, onPress, colors }) {
  if (!active) return null
  return (
    <TouchableOpacity
      style={[s.methodBtn, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      <View style={[s.methodIcon, { backgroundColor: COLORS.accentSoft }]}>
        <Feather name={icon} size={18} color={COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.methodLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[s.methodSub, { color: colors.textSec }]}>{sub}</Text>
      </View>
      {loading
        ? <Feather name="loader" size={16} color={colors.textTer} />
        : <Feather name="chevron-right" size={16} color={colors.textTer} />
      }
    </TouchableOpacity>
  )
}

function StatCell({ value, label, color, colors }) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statVal, { color: color || colors.text }]}>{value}</Text>
      <Text style={[s.statKey, { color: colors.textTer }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: FONT.bold, letterSpacing: -0.3 },
  content: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  // QR Card
  qrCard: { borderRadius: RADIUS.xl, borderWidth: 1, alignItems: 'center', marginBottom: 20, overflow: 'hidden', ...SHADOW.md },
  qrTopBar: { width: '100%', height: 2.5, backgroundColor: COLORS.accent },
  qrLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  qrLabel: { fontSize: 12, fontFamily: FONT.medium },
  countdownPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  countdownText: { fontSize: 12, fontFamily: FONT.bold },
  qrBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginVertical: 8 },
  qrFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', borderRadius: 12 },
  qrFallbackText: { fontSize: 12, color: '#888', marginTop: 8 },
  qrPlaceholder: { backgroundColor: '#f0f0f0', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 13, fontFamily: FONT.semibold, marginBottom: 16 },

  orText: { textAlign: 'center', fontSize: 12, fontFamily: FONT.medium, marginBottom: 14 },

  // Methods
  methods: { gap: 10, marginBottom: 20 },
  methodBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: RADIUS.lg, borderWidth: 0.5 },
  methodIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 14, fontFamily: FONT.semibold },
  methodSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 1 },

  // Membership
  membershipCard: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  membershipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  planName: { fontSize: 16, fontFamily: FONT.bold },
  planSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  statusText: { fontSize: 12, fontFamily: FONT.bold },
  statsStrip: { flexDirection: 'row', borderTopWidth: 0.5 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  statKey: { fontSize: 10, fontFamily: FONT.medium, marginTop: 2 },
  stripDivider: { width: 0.5, height: '60%', alignSelf: 'center' },

  // Success
  successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,8,15,0.85)' },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...SHADOW.lg },
  successText: { fontSize: 28, fontFamily: FONT.extraBold, color: '#fff', letterSpacing: -0.5 },
})
