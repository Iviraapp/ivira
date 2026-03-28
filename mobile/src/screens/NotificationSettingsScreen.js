import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT, FEATURE } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import {
  loadPrefs,
  savePrefs,
  getPatternSummary,
  cancelSmartNotifications,
  scheduleSmartNotifications,
} from '../lib/SmartNotificationEngine'
import { useAuth } from '../context/AuthContext'

function SettingRow({ icon, iconColor, title, subtitle, value, onToggle, colors, isDark }) {
  return (
    <View style={[styles.settingRow, { borderColor: colors.border }]}>
      <View style={[styles.settingIconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSub, { color: colors.textTer }]}>{subtitle}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: isDark ? '#333' : '#ddd', true: `${COLORS.accent}60` }}
        thumbColor={value ? COLORS.accent : isDark ? '#666' : '#ccc'}
      />
    </View>
  )
}

export default function NotificationSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { member } = useAuth()
  const [prefs, setPrefs] = useState(null)
  const [patterns, setPatterns] = useState([])
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Promise.all([loadPrefs(), getPatternSummary()]).then(([p, s]) => {
      setPrefs(p)
      setPatterns(s)
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    })
  }, [])

  const updatePref = async (key, value) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    await savePrefs(updated)
    // Re-schedule immediately
    if (updated.enabled) {
      scheduleSmartNotifications(member).catch(() => {})
    } else {
      cancelSmartNotifications().catch(() => {})
    }
  }

  if (!prefs) return <View style={[styles.container, { backgroundColor: colors.bg }]} />

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.bgTer }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Smart Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Description */}
        <View style={styles.descSection}>
          <View style={[styles.descIconWrap, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Feather name="bell" size={22} color={COLORS.accent} />
          </View>
          <Text style={[styles.descText, { color: colors.textSec }]}>
            IVIRA learns your daily rhythm — when you work out, eat, drink water, and open the app — to send notifications at the right moment, not random times.
          </Text>
        </View>

        {/* Master toggle */}
        <View style={[styles.masterToggle, {
          backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
          borderColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
        }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.masterTitle, { color: colors.text }]}>Smart Notifications</Text>
            <Text style={[styles.masterSub, { color: colors.textSec }]}>
              {prefs.enabled ? 'Adapting to your patterns' : 'Notifications paused'}
            </Text>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={(v) => updatePref('enabled', v)}
            trackColor={{ false: isDark ? '#333' : '#ddd', true: `${COLORS.accent}60` }}
            thumbColor={prefs.enabled ? COLORS.accent : isDark ? '#666' : '#ccc'}
          />
        </View>

        {/* Notification types */}
        <Text style={[styles.sectionLabel, { color: colors.textTer }]}>NOTIFICATION TYPES</Text>

        <View style={[styles.settingsCard, {
          backgroundColor: isDark ? colors.bgSec : '#FFFFFF',
          borderColor: colors.border,
        }]}>
          <SettingRow
            icon="activity"
            iconColor={FEATURE.activity}
            title="Workout Reminders"
            subtitle="30 min before your usual gym time"
            value={prefs.workout_reminders}
            onToggle={(v) => updatePref('workout_reminders', v)}
            colors={colors}
            isDark={isDark}
          />
          <SettingRow
            icon="droplet"
            iconColor={FEATURE.hydration}
            title="Water Reminders"
            subtitle="Every 2h during waking hours"
            value={prefs.water_reminders}
            onToggle={(v) => updatePref('water_reminders', v)}
            colors={colors}
            isDark={isDark}
          />
          <SettingRow
            icon="coffee"
            iconColor={FEATURE.nutrition}
            title="Meal Log Reminders"
            subtitle="After your usual meal times"
            value={prefs.meal_reminders}
            onToggle={(v) => updatePref('meal_reminders', v)}
            colors={colors}
            isDark={isDark}
          />
          <SettingRow
            icon="zap"
            iconColor={FEATURE.fasting}
            title="Streak Motivation"
            subtitle="Daily encouragement based on your streak"
            value={prefs.streak_motivation}
            onToggle={(v) => updatePref('streak_motivation', v)}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Quiet hours */}
        <Text style={[styles.sectionLabel, { color: colors.textTer }]}>QUIET HOURS</Text>

        <View style={[styles.quietCard, {
          backgroundColor: isDark ? colors.bgSec : '#FFFFFF',
          borderColor: colors.border,
        }]}>
          <Feather name="moon" size={16} color={colors.textSec} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.quietTitle, { color: colors.text }]}>
              {formatHour(prefs.quiet_hours_start)} — {formatHour(prefs.quiet_hours_end)}
            </Text>
            <Text style={[styles.quietSub, { color: colors.textTer }]}>
              No notifications during these hours
            </Text>
          </View>
        </View>

        {/* Learned patterns */}
        {patterns.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTer }]}>YOUR LEARNED PATTERNS</Text>

            <View style={[styles.patternsCard, {
              backgroundColor: isDark ? colors.bgSec : '#FFFFFF',
              borderColor: colors.border,
            }]}>
              {patterns.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.patternRow,
                    i < patterns.length - 1 && { borderBottomWidth: 1, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.patternLabel, { color: colors.textSec }]}>{p.label}</Text>
                  <View style={styles.patternRight}>
                    <Text style={[styles.patternValue, { color: colors.text }]}>{p.value}</Text>
                    {p.confidence != null && (
                      <View style={[styles.confidenceBadge, {
                        backgroundColor: p.confidence > 0.6 ? `${COLORS.green}18` : `${FEATURE.activity}18`,
                      }]}>
                        <Text style={[styles.confidenceText, {
                          color: p.confidence > 0.6 ? COLORS.green : FEATURE.activity,
                        }]}>
                          {Math.round(p.confidence * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <View style={[styles.patternHint, { backgroundColor: isDark ? colors.bgTer : '#F5F5F5' }]}>
                <Feather name="info" size={12} color={colors.textTer} />
                <Text style={[styles.patternHintText, { color: colors.textTer }]}>
                  Patterns improve with more usage. Keep using the app for better timing.
                </Text>
              </View>
            </View>
          </>
        )}

        {patterns.length === 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTer }]}>YOUR LEARNED PATTERNS</Text>
            <View style={[styles.emptyPatterns, {
              backgroundColor: isDark ? colors.bgSec : '#FFFFFF',
              borderColor: colors.border,
            }]}>
              <Feather name="cpu" size={24} color={colors.textTer} />
              <Text style={[styles.emptyTitle, { color: colors.textSec }]}>Learning your rhythm...</Text>
              <Text style={[styles.emptySub, { color: colors.textTer }]}>
                Use the app for a few days and we'll learn when to nudge you at the perfect moment.
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    </ScrollView>
  )
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h > 12) return `${h - 12} PM`
  return `${h} AM`
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  descSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  descIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  descText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.regular,
    lineHeight: 20,
  },

  masterToggle: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  masterTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  masterSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: 1.5,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  settingsCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  settingSub: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 1,
  },

  quietCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quietTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT.numBold,
  },
  quietSub: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 1,
  },

  patternsCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  patternLabel: {
    fontSize: 13,
    fontFamily: FONT.regular,
  },
  patternRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patternValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT.numBold,
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: FONT.numBold,
  },
  patternHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  patternHintText: {
    fontSize: 11,
    fontFamily: FONT.regular,
    flex: 1,
    lineHeight: 16,
  },

  emptyPatterns: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
})
