/**
 * MembershipActivationScreen v2
 *
 * Two paths:
 *  A — Gym invite code (primary): member enters GYM-XXXXXX from gym owner
 *  B — Gym credentials (secondary): phone + OTP from gym's own login
 *
 * QR check-in is LOCKED until one of these paths completes and gymId is stored.
 * No fallback QR for unlinked members.
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { premiumAlert } from '../components/PremiumAlert'
import Haptics from '../lib/haptics'

const { width: W } = Dimensions.get('window')

const PATHS = [
  { id: 'code',  icon: 'hash',      label: 'Invite Code',       sub: 'From your gym owner' },
  { id: 'login', icon: 'phone',     label: 'Gym Login',         sub: 'Phone + OTP'         },
  { id: 'find',  icon: 'search',    label: 'Find a Gym',        sub: 'We\'ll match you'    },
]

export default function MembershipActivationScreen({ navigation }) {
  const { colors, isDark } = useTheme()
  const { connectGym, login, requestOtp, member } = useAuth()

  const [activePath, setActivePath] = useState('code')

  // Path A — invite code
  const [inviteCode, setInviteCode]   = useState('')
  const [linking, setLinking]         = useState(false)

  // Path B — phone OTP
  const [gymPhone, setGymPhone]       = useState('')
  const [otpPhone, setOtpPhone]       = useState(member?.phone || '')
  const [otp, setOtp]                 = useState('')
  const [otpSent, setOtpSent]         = useState(false)
  const [sendingOtp, setSendingOtp]   = useState(false)
  const [verifying, setVerifying]     = useState(false)

  // Path C — discovery
  const [city, setCity]               = useState(null)
  const [goal, setGoal]               = useState(null)
  const [name, setName]               = useState(member?.name || '')
  const [phone, setPhone]             = useState(member?.phone || '')
  const [submitting, setSubmitting]   = useState(false)

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current
  const pathAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 140, useNativeDriver: true }),
    ]).start()
  }, [])

  useEffect(() => {
    pathAnim.setValue(0)
    Animated.spring(pathAnim, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: true }).start()
  }, [activePath])

  // ── Path A: Invite code ──────────────────────────────────────
  const handleInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase()
    if (!code) { premiumAlert('Enter Code', 'Please enter your gym activation code.'); return }
    setLinking(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await connectGym(code)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      premiumAlert('Membership Activated!', 'You\'re all set. Your QR check-in is now live.', [
        { text: 'Let\'s Go!', onPress: () => navigation.goBack() },
      ])
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      premiumAlert('Invalid Code', err?.response?.data?.message || 'Code not recognised. Ask your gym owner for the correct code.')
    } finally {
      setLinking(false)
    }
  }

  // ── Path B: Phone OTP ────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!gymPhone.trim() || gymPhone.trim().length < 10) {
      premiumAlert('Enter Phone', 'Please enter the phone number you registered with your gym.')
      return
    }
    setSendingOtp(true)
    try {
      await api.post('/auth/member/otp/request', { phone: gymPhone.trim() })
      setOtpSent(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      premiumAlert('Failed', err?.response?.data?.message || 'Could not send OTP. Check the number and try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) { premiumAlert('Enter OTP', 'Please enter the OTP sent to your phone.'); return }
    setVerifying(true)
    try {
      // Try to find gymId from phone first
      const gymRes = await api.get(`/auth/member/gym-by-phone?phone=${gymPhone.trim()}`).catch(() => ({ data: null }))
      const resolvedGymId = gymRes.data?.gym_id
      if (!resolvedGymId) { premiumAlert('Not Found', 'No gym membership found for this number.'); return }
      await login(resolvedGymId, gymPhone.trim(), otp)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      navigation.goBack()
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      premiumAlert('Wrong OTP', 'The code didn\'t match. Try again or request a new one.')
    } finally {
      setVerifying(false)
    }
  }

  // ── Path C: Discovery ────────────────────────────────────────
  const handleDiscovery = async () => {
    if (!name.trim() || phone.trim().length < 10) {
      premiumAlert('Missing Info', 'Please enter your name and a valid phone number.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/concierge/inquiries', {
        name: name.trim(),
        phone: phone.trim(),
        city,
        discipline: goal || 'gym',
        inquiry_type: 'discovery',
        source: 'app_activation',
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      premiumAlert(
        'We\'re On It!',
        `Our team will call ${phone} within 24 hours with the best gyms${city ? ` in ${city}` : ''} for you.`,
        [{ text: 'Got it', onPress: () => navigation.goBack() }]
      )
    } catch {
      premiumAlert('Error', 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Back */}
          <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.bgTer }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Hero */}
          <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.heroIconRing}>
              <View style={s.heroIcon}>
                <Feather name="shield" size={26} color="#07080f" />
              </View>
            </View>
            <Text style={[s.heroTitle, { color: colors.text }]}>Activate Membership</Text>
            <Text style={[s.heroSub, { color: colors.textSec }]}>
              Your QR check-in unlocks the moment your gym is linked
            </Text>
          </Animated.View>

          {/* Path selector */}
          <View style={[s.pathSelector, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            {PATHS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.pathTab, activePath === p.id && s.pathTabActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActivePath(p.id) }}
                activeOpacity={0.75}
              >
                <Feather name={p.icon} size={14} color={activePath === p.id ? '#07080f' : colors.textTer} />
                <Text style={[s.pathTabLabel, { color: activePath === p.id ? '#07080f' : colors.textTer }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Path content */}
          <Animated.View style={{
            opacity: pathAnim,
            transform: [{ translateY: pathAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}>

            {/* ── Path A: Invite code ── */}
            {activePath === 'code' && (
              <View style={[s.pathCard, { backgroundColor: colors.bgTer, borderColor: COLORS.accent + '30' }]}>
                <View style={s.pathTopAccent} />

                <View style={s.pathCardHeader}>
                  <View style={[s.pathCardIcon, { backgroundColor: COLORS.accentSoft }]}>
                    <Feather name="hash" size={18} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pathCardTitle, { color: colors.text }]}>Enter Gym Code</Text>
                    <Text style={[s.pathCardSub, { color: colors.textSec }]}>Your gym owner provides this code</Text>
                  </View>
                </View>

                <View style={[s.codeInputWrap, { backgroundColor: colors.bg, borderColor: inviteCode ? COLORS.accent + '60' : colors.borderStrong }]}>
                  <Text style={[s.codePrefix, { color: colors.textTer }]}>GYM–</Text>
                  <TextInput
                    style={[s.codeInput, { color: colors.text }]}
                    placeholder="XXXXXX"
                    placeholderTextColor={colors.textTer}
                    value={inviteCode}
                    onChangeText={v => setInviteCode(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    returnKeyType="go"
                    onSubmitEditing={handleInviteCode}
                  />
                  {inviteCode.length > 0 && (
                    <TouchableOpacity onPress={() => setInviteCode('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <Feather name="x-circle" size={16} color={colors.textTer} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, linking && { opacity: 0.6 }]}
                  onPress={handleInviteCode}
                  disabled={linking}
                  activeOpacity={0.85}
                >
                  {linking
                    ? <ActivityIndicator size="small" color="#07080f" />
                    : <>
                        <Feather name="unlock" size={16} color="#07080f" />
                        <Text style={s.primaryBtnText}>Activate & Unlock QR</Text>
                      </>
                  }
                </TouchableOpacity>

                <View style={s.howToGetCode}>
                  <Feather name="info" size={12} color={colors.textTer} />
                  <Text style={[s.howToText, { color: colors.textTer }]}>
                    Ask your gym owner for the code. It looks like GYM-AB1234. They can generate it from the IVIRA gym portal.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Path B: Gym login ── */}
            {activePath === 'login' && (
              <View style={[s.pathCard, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}>

                <View style={s.pathCardHeader}>
                  <View style={[s.pathCardIcon, { backgroundColor: 'rgba(108,99,255,0.12)' }]}>
                    <Feather name="phone" size={18} color="#6C63FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pathCardTitle, { color: colors.text }]}>Login with Gym Phone</Text>
                    <Text style={[s.pathCardSub, { color: colors.textSec }]}>The number you gave your gym when joining</Text>
                  </View>
                </View>

                {!otpSent ? (
                  <>
                    <View style={[s.inputRow, { backgroundColor: colors.bg, borderColor: colors.borderStrong }]}>
                      <Text style={[s.phonePrefix, { color: colors.textTer }]}>+91</Text>
                      <TextInput
                        style={[s.textInput, { color: colors.text }]}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={colors.textTer}
                        value={gymPhone}
                        onChangeText={setGymPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                        returnKeyType="send"
                        onSubmitEditing={handleSendOtp}
                      />
                    </View>
                    <TouchableOpacity
                      style={[s.primaryBtn, { backgroundColor: '#6C63FF' }, sendingOtp && { opacity: 0.6 }]}
                      onPress={handleSendOtp}
                      disabled={sendingOtp}
                      activeOpacity={0.85}
                    >
                      {sendingOtp
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Feather name="send" size={15} color="#fff" />
                            <Text style={[s.primaryBtnText, { color: '#fff' }]}>Send OTP</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[s.otpSentBadge, { backgroundColor: COLORS.accentSoft }]}>
                      <Feather name="check-circle" size={13} color={COLORS.accent} />
                      <Text style={[s.otpSentText, { color: COLORS.accent }]}>OTP sent to +91 {gymPhone}</Text>
                    </View>
                    <View style={[s.inputRow, { backgroundColor: colors.bg, borderColor: colors.borderStrong }]}>
                      <Feather name="lock" size={14} color={colors.textTer} />
                      <TextInput
                        style={[s.textInput, { color: colors.text, letterSpacing: 6, fontFamily: FONT.numBold }]}
                        placeholder="• • • •"
                        placeholderTextColor={colors.textTer}
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        returnKeyType="done"
                        onSubmitEditing={handleVerifyOtp}
                        autoFocus
                      />
                    </View>
                    <TouchableOpacity
                      style={[s.primaryBtn, { backgroundColor: '#6C63FF' }, verifying && { opacity: 0.6 }]}
                      onPress={handleVerifyOtp}
                      disabled={verifying}
                      activeOpacity={0.85}
                    >
                      {verifying
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Feather name="unlock" size={15} color="#fff" />
                            <Text style={[s.primaryBtnText, { color: '#fff' }]}>Verify & Unlock QR</Text>
                          </>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity style={s.resendBtn} onPress={() => setOtpSent(false)} activeOpacity={0.7}>
                      <Text style={[s.resendText, { color: colors.textTer }]}>Wrong number? Go back</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* ── Path C: Find a gym ── */}
            {activePath === 'find' && (
              <View style={[s.pathCard, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}>

                <View style={s.pathCardHeader}>
                  <View style={[s.pathCardIcon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                    <Feather name="search" size={18} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pathCardTitle, { color: colors.text }]}>Find the Right Gym</Text>
                    <Text style={[s.pathCardSub, { color: colors.textSec }]}>Our team will call you within 24h</Text>
                  </View>
                </View>

                <Text style={[s.fieldLabel, { color: colors.textSec }]}>Your city</Text>
                <View style={s.cityRow}>
                  {['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai'].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.cityChip, { borderColor: city === c ? COLORS.accent : colors.borderStrong, backgroundColor: city === c ? COLORS.accentSoft : 'transparent' }]}
                      onPress={() => setCity(prev => prev === c ? null : c)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.cityChipText, { color: city === c ? COLORS.accent : colors.textSec }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.fieldLabel, { color: colors.textSec, marginTop: 12 }]}>Your name</Text>
                <View style={[s.inputRow, { backgroundColor: colors.bg, borderColor: colors.borderStrong }]}>
                  <Feather name="user" size={14} color={colors.textTer} />
                  <TextInput style={[s.textInput, { color: colors.text }]} placeholder="Full name" placeholderTextColor={colors.textTer} value={name} onChangeText={setName} autoCorrect={false} />
                </View>

                <Text style={[s.fieldLabel, { color: colors.textSec }]}>Phone number</Text>
                <View style={[s.inputRow, { backgroundColor: colors.bg, borderColor: colors.borderStrong }]}>
                  <Text style={[s.phonePrefix, { color: colors.textTer }]}>+91</Text>
                  <TextInput style={[s.textInput, { color: colors.text }]} placeholder="9876543210" placeholderTextColor={colors.textTer} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: '#F97316' }, submitting && { opacity: 0.6 }]}
                  onPress={handleDiscovery}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Feather name="send" size={15} color="#fff" />
                        <Text style={[s.primaryBtnText, { color: '#fff' }]}>Find My Gym</Text>
                      </>
                  }
                </TouchableOpacity>
                <Text style={[s.trustNote, { color: colors.textTer }]}>5,000+ partner gyms · We call within 24 hours</Text>
              </View>
            )}

          </Animated.View>

          {/* Locked QR preview */}
          <View style={[s.lockedQr, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            <View style={s.lockedOverlay}>
              <Feather name="lock" size={20} color={colors.textTer} />
              <Text style={[s.lockedText, { color: colors.textTer }]}>QR check-in locked</Text>
              <Text style={[s.lockedSub, { color: colors.textTer }]}>Links your gym above to unlock</Text>
            </View>
            <View style={s.qrBlur} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 60 },

  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, marginBottom: SPACING.md },

  // Hero
  hero: { alignItems: 'center', paddingVertical: SPACING.lg },
  heroIconRing: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', ...SHADOW.lg },
  heroTitle: { fontSize: 24, fontFamily: FONT.extraBold, letterSpacing: -0.8, textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 14, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  // Path selector
  pathSelector: { flexDirection: 'row', borderRadius: RADIUS.lg, borderWidth: 0.5, padding: 4, gap: 4, marginBottom: SPACING.md },
  pathTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: RADIUS.md },
  pathTabActive: { backgroundColor: COLORS.accent },
  pathTabLabel: { fontSize: 11, fontFamily: FONT.semibold },

  // Path card
  pathCard: { borderRadius: RADIUS.xl, borderWidth: 0.5, padding: SPACING.md, marginBottom: SPACING.md, overflow: 'hidden' },
  pathTopAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: COLORS.accent },
  pathCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.md, marginTop: 8 },
  pathCardIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pathCardTitle: { fontSize: 16, fontFamily: FONT.bold },
  pathCardSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },

  // Code input
  codeInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: SPACING.md, height: 58, marginBottom: SPACING.md },
  codePrefix: { fontSize: 18, fontFamily: FONT.bold, marginRight: 4 },
  codeInput: { flex: 1, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 6, height: '100%' },

  // Generic input row
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.lg, borderWidth: 0.5, paddingHorizontal: SPACING.md, height: 52, marginBottom: SPACING.sm },
  phonePrefix: { fontSize: 14, fontFamily: FONT.semibold },
  textInput: { flex: 1, fontSize: 15, fontFamily: FONT.regular, height: '100%' },

  // OTP
  otpSentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  otpSentText: { fontSize: 12, fontFamily: FONT.semibold },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 12, fontFamily: FONT.medium },

  // Primary button
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, ...SHADOW.md },
  primaryBtnText: { fontSize: 15, fontFamily: FONT.bold, color: '#07080f' },

  // How to get code
  howToGetCode: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)' },
  howToText: { flex: 1, fontSize: 12, fontFamily: FONT.regular, lineHeight: 18 },

  // City chips
  fieldLabel: { fontSize: 12, fontFamily: FONT.semibold, marginBottom: 8 },
  cityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 0.5 },
  cityChipText: { fontSize: 13, fontFamily: FONT.semibold },
  trustNote: { fontSize: 11, fontFamily: FONT.regular, textAlign: 'center', marginTop: 4 },

  // Locked QR preview
  lockedQr: { borderRadius: RADIUS.xl, borderWidth: 0.5, height: 140, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: SPACING.xl },
  lockedOverlay: { alignItems: 'center', gap: 6, zIndex: 2 },
  lockedText: { fontSize: 14, fontFamily: FONT.semibold },
  lockedSub: { fontSize: 12, fontFamily: FONT.regular },
  qrBlur: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,8,15,0.7)', zIndex: 1 },
})
