import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { premiumAlert } from '../components/PremiumAlert'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// Floating orb component for ambient background
function FloatingOrb({ delay, size, x, y, color, fadeAnim }) {
  const float = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 4000 + delay, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 4000 + delay, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -18] })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
        transform: [{ translateY }],
      }}
    />
  )
}

export default function LoginScreen() {
  const auth = useAuth()
  const requestOtp = auth?.requestOtp
  const verifyOtp = auth?.verifyOtp
  const biometricAvailable = auth?.biometricAvailable
  const biometricEnabled = auth?.biometricEnabled
  const authenticateWithBiometrics = auth?.authenticateWithBiometrics
  const token = auth?.token
  const { colors, isDark } = useTheme()

  const [step, setStep] = useState('welcome')
  const [email, setEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [hasPasswordSet, setHasPasswordSet] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)

  const otpRefs = useRef([...Array(6)].map(() => React.createRef()))
  const resendIntervalRef = useRef(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const orbFade = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const logoPulse = useRef(new Animated.Value(1)).current

  const hasStoredSession = !!token

  // Entrance animation
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(orbFade, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 120, useNativeDriver: true }),
      ]),
    ]).start()

    // Subtle logo pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.03, duration: 2200, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  // Resend countdown timer
  const startResendTimer = useCallback(() => {
    setResendTimer(30)
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current)
    resendIntervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendIntervalRef.current)
          resendIntervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current)
    }
  }, [])

  const animateTransition = useCallback((nextStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep)
      setErrors({})
      slideAnim.setValue(30)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }),
      ]).start()
    })
  }, [fadeAnim, slideAnim])

  const goBack = useCallback(() => {
    if (step === 'otp' || step === 'password') {
      setOtpDigits(['', '', '', '', '', ''])
      setPassword('')
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current)
      animateTransition('email')
    } else if (step === 'email') {
      animateTransition('welcome')
    }
  }, [step, animateTransition])

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSendOtp = useCallback(async () => {
    const newErrors = {}
    if (!email.trim()) newErrors.email = 'Email is required'
    else if (!validateEmail(email.trim())) newErrors.email = 'Please enter a valid email'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setErrors({})
    setLoading(true)
    try {
      // Check if user has a password set
      const { data } = await api.post('/auth/check-password', { email: email.trim().toLowerCase() })
      if (data.hasPassword) {
        setHasPasswordSet(true)
        animateTransition('password')
      } else {
        await requestOtp(email.trim().toLowerCase())
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        startResendTimer()
        animateTransition('otp')
      }
    } catch {
      // Fallback to OTP if check-password endpoint not available
      try {
        await requestOtp(email.trim().toLowerCase())
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        startResendTimer()
        animateTransition('otp')
      } catch (err) {
        premiumAlert('Error', err.response?.data?.message || 'Failed to send login code.')
      }
    } finally {
      setLoading(false)
    }
  }, [email, requestOtp, animateTransition, startResendTimer])

  const handlePasswordLogin = useCallback(async () => {
    if (!password) { setErrors({ password: 'Password is required' }); return }
    setErrors({})
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login/password', {
        email: email.trim().toLowerCase(), password,
      })
      // Store token + member data via AuthContext
      if (auth?.loginDirect) {
        await auth.loginDirect(data.token, data.member || data.gym)
      } else {
        // Fallback: store manually
        const { setItem } = await import('../lib/storage')
        await setItem('ivira_member_token', data.token)
        if (data.member) await setItem('ivira_member_data', JSON.stringify(data.member))
        if (data.gym) await setItem('ivira_gym_id', data.gymId || data.gym?.id)
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      const code = err.response?.data?.error
      if (code === 'PASSWORD_NOT_SET') {
        // Fall back to OTP
        try {
          await requestOtp(email.trim().toLowerCase())
          startResendTimer()
          animateTransition('otp')
        } catch {}
      } else {
        setErrors({ password: 'Incorrect password' })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setPassword('')
      }
    } finally {
      setLoading(false)
    }
  }, [email, password, auth, requestOtp, animateTransition, startResendTimer])

  const handleVerify = useCallback(async (code) => {
    setLoading(true)
    try {
      await verifyOtp(email.trim().toLowerCase(), code)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Invalid code. Please try again.'
      premiumAlert('Verification Failed', message)
      setOtpDigits(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0].current?.focus(), 100)
    } finally {
      setLoading(false)
    }
  }, [email, verifyOtp])

  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0) return
    try {
      await requestOtp(email.trim().toLowerCase())
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      startResendTimer()
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to resend code.'
      premiumAlert('Error', message)
    }
  }, [email, resendTimer, requestOtp, startResendTimer])

  const handleBiometricLogin = useCallback(async () => {
    const success = await authenticateWithBiometrics()
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [authenticateWithBiometrics])

  // --- WELCOME SCREEN ---
  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: Animated.multiply(logoScale, logoPulse) }] }]}>
        <View style={styles.logoGlow} />
        <View style={styles.logoInner}>
          <Text style={styles.logoG}>I</Text>
        </View>
      </Animated.View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={[styles.wordmark, { color: COLORS.accent, opacity: 0.45 }]}>I</Text>
        <Text style={[styles.wordmark, { color: COLORS.accent }]}>VIRA</Text>
      </View>
      <Text style={[styles.tagline, { color: colors.textSec }]}>Your Health, Reimagined.</Text>

      {/* Feature pills */}
      <View style={styles.featurePills}>
        {[
          { icon: 'activity', label: 'Track Workouts' },
          { icon: 'clock', label: 'Fasting Timer' },
          { icon: 'bar-chart-2', label: 'Nutrition AI' },
        ].map((f, i) => (
          <View key={f.label} style={[styles.featurePill, { backgroundColor: colors.accentSoft }]}>
            <Feather name={f.icon} size={13} color={COLORS.accent} />
            <Text style={styles.featurePillText}>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* CTA buttons */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.text }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          animateTransition('email')
        }}
        activeOpacity={0.85}
      >
        <Text style={[styles.primaryBtnText, { color: colors.bg }]}>Get Started</Text>
        <Feather name="arrow-right" size={18} color={colors.bg} />
      </TouchableOpacity>

      {biometricAvailable && biometricEnabled && hasStoredSession && (
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin} activeOpacity={0.7}>
          <View style={[styles.biometricIconWrap, { backgroundColor: colors.accentSoft }]}>
            <Feather name="shield" size={20} color={COLORS.accent} />
          </View>
          <Text style={[styles.biometricLabel, { color: colors.textSec }]}>Sign in with biometrics</Text>
        </TouchableOpacity>
      )}

      {/* Trust footer */}
      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Feather name="lock" size={11} color={colors.textTer} />
          <Text style={[styles.trustText, { color: colors.textTer }]}>256-bit encrypted</Text>
        </View>
        <View style={[styles.trustDot, { backgroundColor: colors.textTer }]} />
        <View style={styles.trustItem}>
          <Feather name="shield" size={11} color={colors.textTer} />
          <Text style={[styles.trustText, { color: colors.textTer }]}>GDPR compliant</Text>
        </View>
      </View>
    </View>
  )

  // --- EMAIL ENTRY ---
  const renderEmail = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]} onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Feather name="arrow-left" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={[styles.formIconWrap, { backgroundColor: colors.accentSoft }]}>
        <Feather name="mail" size={24} color={COLORS.accent} />
      </View>
      <Text style={[styles.formTitle, { color: colors.text }]}>What's your email?</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSec }]}>We'll send you a login code</Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.textSec }]}>Email</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
          <Feather name="mail" size={16} color={colors.textTer} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }, errors.email && styles.inputError]}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTer}
            value={email}
            onChangeText={(val) => { setEmail(val); if (errors.email) setErrors({}) }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleSendOtp}
          />
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: COLORS.accent }, loading && styles.primaryBtnDisabled]}
        onPress={handleSendOtp}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>Send Login Code</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  )

  // --- OTP VERIFICATION ---
  const renderOtp = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.formContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]} onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Feather name="arrow-left" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={[styles.formIconWrap, { backgroundColor: colors.accentSoft }]}>
        <Feather name="shield" size={24} color={COLORS.accent} />
      </View>
      <Text style={[styles.formTitle, { color: colors.text }]}>Enter verification code</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSec }]}>Sent to {email.trim().toLowerCase()}</Text>

      <View style={styles.otpRow}>
        {otpDigits.map((digit, i) => (
          <TextInput
            key={i}
            ref={otpRefs.current[i]}
            style={[
              styles.otpBox,
              {
                backgroundColor: colors.bgSec,
                borderColor: digit ? COLORS.accent : colors.border,
                color: colors.text,
              },
            ]}
            maxLength={1}
            keyboardType="number-pad"
            value={digit}
            autoFocus={i === 0}
            onChangeText={(val) => {
              const newDigits = [...otpDigits]
              newDigits[i] = val
              setOtpDigits(newDigits)
              if (val && i < 5) otpRefs.current[i + 1].current?.focus()
              if (newDigits.every(d => d)) handleVerify(newDigits.join(''))
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !otpDigits[i] && i > 0) {
                otpRefs.current[i - 1].current?.focus()
              }
            }}
          />
        ))}
      </View>

      {loading && (
        <ActivityIndicator color={COLORS.accent} size="small" style={{ marginTop: SPACING.lg }} />
      )}

      <View style={styles.resendWrap}>
        {resendTimer > 0 ? (
          <Text style={[styles.resendText, { color: colors.textTer }]}>
            Resend Code in{' '}
            <Text style={{ fontVariant: ['tabular-nums'] }}>{resendTimer}s</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
            <Text style={[styles.resendLink, { color: COLORS.accent }]}>Resend Code</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background orbs */}
      <FloatingOrb delay={0} size={180} x={-40} y={SCREEN_H * 0.12} color="rgba(16,185,129,0.08)" fadeAnim={orbFade} />
      <FloatingOrb delay={800} size={120} x={SCREEN_W * 0.65} y={SCREEN_H * 0.06} color="rgba(16,185,129,0.06)" fadeAnim={orbFade} />
      <FloatingOrb delay={400} size={90} x={SCREEN_W * 0.3} y={SCREEN_H * 0.75} color="rgba(16,185,129,0.05)" fadeAnim={orbFade} />

      <Animated.View
        style={[
          styles.inner,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {step === 'welcome' && renderWelcome()}
        {step === 'email' && renderEmail()}
        {step === 'otp' && renderOtp()}
        {step === 'password' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]} onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.formIconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name="lock" size={24} color={COLORS.accent} />
            </View>
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSec }]}>Enter your password to sign in</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSec }]}>PASSWORD</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: errors.password ? COLORS.red : colors.border }]}>
                <Feather name="lock" size={16} color={colors.textTer} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }, errors.password && styles.inputError]}
                  placeholder="Your password"
                  placeholderTextColor={colors.textTer}
                  value={password}
                  onChangeText={t => { setPassword(t); setErrors({}) }}
                  secureTextEntry={!showPassword}
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={handlePasswordLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(p => !p)}
                  style={{ paddingHorizontal: 14, paddingVertical: 14 }}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textTer} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: COLORS.accent }, loading && styles.primaryBtnDisabled]}
              onPress={handlePasswordLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 }}>
              <TouchableOpacity onPress={async () => {
                setLoading(true)
                try {
                  await requestOtp(email.trim().toLowerCase())
                  startResendTimer()
                  animateTransition('otp')
                } catch {}
                setLoading(false)
              }}>
                <Text style={{ color: COLORS.accent, fontSize: 13, fontFamily: FONT.semibold }}>Use OTP instead</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textTer, fontSize: 13 }}>·</Text>
              <TouchableOpacity onPress={() => { setPassword(''); animateTransition('email') }}>
                <Text style={{ color: colors.textTer, fontSize: 13, fontFamily: FONT.regular }}>Different email</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flex: 1,
  },

  // --- WELCOME ---
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg + 8,
  },
  logoWrap: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  logoG: {
    fontSize: 38,
    fontFamily: FONT.extraBold,
    color: '#FFFFFF',
    marginTop: -2,
  },
  wordmark: {
    fontSize: 36,
    fontFamily: FONT.extraBold,
    marginBottom: SPACING.xs,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: FONT.regular,
    color: COLORS.textSec,
    marginBottom: SPACING.xl + 8,
    letterSpacing: 0.2,
  },

  // Feature pills
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl + 12,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  featurePillText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.accent,
    letterSpacing: 0.2,
  },

  // Primary CTA
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.text,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    width: '100%',
    minHeight: 56,
    // Lift
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 16,
    fontFamily: FONT.bold,
  },

  // Secondary CTA
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    width: '100%',
    minHeight: 52,
  },
  secondaryBtnText: {
    color: COLORS.textSec,
    fontSize: 15,
    fontFamily: FONT.semibold,
  },

  // Biometric
  biometricBtn: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  biometricIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  biometricLabel: {
    color: COLORS.textSec,
    fontSize: 13,
    fontFamily: FONT.medium,
  },

  // Trust footer
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl + 8,
    opacity: 0.7,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.textTer,
    letterSpacing: 0.3,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textTer,
  },

  // --- FORM SCREENS (email & otp) ---
  formContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg + 8,
    paddingBottom: SPACING.xxl,
  },
  backBtn: {
    position: 'absolute',
    top: SPACING.xxl + SPACING.md,
    left: SPACING.lg + 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  formIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  formTitle: {
    fontSize: 26,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.textSec,
    marginBottom: SPACING.xl + 8,
    lineHeight: 22,
  },

  // Fields
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: COLORS.textSec,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.md + 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: SPACING.md,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FONT.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: 15,
  },
  inputError: {
    borderColor: COLORS.red,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    fontFamily: FONT.medium,
    marginTop: SPACING.xs,
  },

  // OTP
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md + 2,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: FONT.bold,
  },
  resendWrap: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  resendText: {
    fontSize: 14,
    fontFamily: FONT.medium,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
})
