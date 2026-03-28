import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { setItem } from '../lib/storage'
import api from '../lib/api'

const PROFILE_SETUP_KEY = 'ivira_profile_setup_done'

const GOALS = [
  'Weight Loss',
  'Muscle Gain',
  'General Fitness',
  'Endurance',
  'Flexibility',
]

export { PROFILE_SETUP_KEY }

export default function ProfileSetupScreen({ onComplete }) {
  const { colors } = useTheme()
  const { member, refreshProfile } = useAuth()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState(member?.name || member?.first_name || '')
  const [fitnessGoal, setFitnessGoal] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {}
      if (name.trim()) payload.name = name.trim()
      if (fitnessGoal) payload.fitness_goal = fitnessGoal
      if (weight) payload.weight = parseFloat(weight)
      if (height) payload.height = parseFloat(height)
      if (dob.trim()) payload.date_of_birth = dob.trim()

      await api.patch('/auth/b2c/profile', payload)
      await setItem(PROFILE_SETUP_KEY, 'true')

      // Refresh member data in context
      try { await refreshProfile() } catch {}

      onComplete()
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to update profile. Please try again.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    await setItem(PROFILE_SETUP_KEY, 'true')
    onComplete()
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Feather name="user" size={24} color={COLORS.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Complete Your Profile</Text>
        <Text style={[styles.subtitle, { color: colors.textSec }]}>
          Help us personalize your experience
        </Text>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSec }]}>Name</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="user" size={16} color={colors.textTer} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTer}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Fitness Goal */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSec }]}>Fitness Goal</Text>
          <View style={styles.chipsRow}>
            {GOALS.map((goal) => {
              const selected = fitnessGoal === goal
              return (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? COLORS.accent : colors.bgSec,
                      borderColor: selected ? COLORS.accent : colors.border,
                    },
                  ]}
                  onPress={() => setFitnessGoal(selected ? '' : goal)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? '#FFFFFF' : colors.textSec },
                    ]}
                  >
                    {goal}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Weight */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSec }]}>Weight (kg)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="trending-down" size={16} color={colors.textTer} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 75"
              placeholderTextColor={colors.textTer}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Height */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSec }]}>Height (cm)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="maximize-2" size={16} color={colors.textTer} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 175"
              placeholderTextColor={colors.textTer}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSec }]}>
            Date of Birth <Text style={{ fontFamily: FONT.regular, textTransform: 'none' }}>(optional)</Text>
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="calendar" size={16} color={colors.textTer} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTer}
              value={dob}
              onChangeText={setDob}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: colors.textTer }]}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg + 8,
  },

  // Header
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  title: {
    fontSize: 26,
    fontFamily: FONT.bold,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT.regular,
    lineHeight: 22,
    marginBottom: SPACING.xl + 8,
  },

  // Fields
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md + 2,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: 15,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },

  // CTA
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    width: '100%',
    minHeight: 56,
    marginTop: SPACING.md,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT.bold,
  },

  // Skip
  skipBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  skipText: {
    fontSize: 14,
    fontFamily: FONT.medium,
  },
})
