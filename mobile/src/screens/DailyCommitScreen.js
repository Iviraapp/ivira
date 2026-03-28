import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'

const ACTIVITY_MAP = {
  gym: ['Weights', 'Cardio', 'CrossFit', 'Yoga', 'Swimming'],
  default: ['Session', 'Practice', 'Study', 'Work'],
}

const TIME_PRESETS = [
  { label: 'Morning', range: '6 – 9 AM', icon: 'sunrise', hour: 7 },
  { label: 'Afternoon', range: '12 – 3 PM', icon: 'sun', hour: 13 },
  { label: 'Evening', range: '5 – 8 PM', icon: 'sunset', hour: 18 },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function DailyCommitScreen({ navigation, route }) {
  const { podId, podName, goalType } = route.params || {}
  const { colors, card } = useTheme()
  const { gymId, member } = useAuth()
  const insets = useSafeAreaInsets()

  const [state, setState] = useState('loading') // loading | no_commitment | committed | checked_in
  const [commitment, setCommitment] = useState(null)
  const [podCommitments, setPodCommitments] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  // Form state
  const [activity, setActivity] = useState(null)
  const [timePreset, setTimePreset] = useState(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activities = ACTIVITY_MAP[goalType] || ACTIVITY_MAP.default

  // ── Fetch today's commitments ──────────────────────────────────────
  const fetchCommitments = useCallback(async () => {
    try {
      const res = await api.get(`/gyms/${gymId}/pods/${podId}/commitments`, {
        params: { date: todayISO() },
      })
      const list = res.data?.commitments || res.data || []
      setPodCommitments(list)

      const mine = list.find(
        (c) => c.memberId === member?.id || c.member_id === member?.id
      )
      if (mine) {
        setCommitment(mine)
        setState(mine.checkedIn || mine.checked_in ? 'checked_in' : 'committed')
      } else {
        setState('no_commitment')
      }
    } catch (err) {
      console.warn('[DailyCommit] fetch:', err?.message)
      setState('no_commitment')
    }
  }, [gymId, podId, member?.id])

  useEffect(() => {
    fetchCommitments()
  }, [fetchCommitments])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchCommitments()
    setRefreshing(false)
  }, [fetchCommitments])

  // ── Commit ─────────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!activity || !timePreset) return
    setSubmitting(true)
    try {
      const preset = TIME_PRESETS.find((t) => t.label === timePreset)
      const now = new Date()
      now.setHours(preset?.hour || 12, 0, 0, 0)

      const text = [activity, details].filter(Boolean).join(' — ')
      const res = await api.post(`/gyms/${gymId}/pods/${podId}/commitments`, {
        committedTime: now.toISOString(),
        commitmentText: text,
      })
      const created = res.data?.commitment || res.data
      setCommitment(created)
      setState('committed')
      await fetchCommitments()
    } catch (err) {
      console.warn('[DailyCommit] commit:', err?.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Check In ───────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!commitment) return
    setSubmitting(true)
    try {
      await api.post(`/gyms/${gymId}/pods/${podId}/checkin`, {
        commitmentId: commitment.id || commitment._id,
      })
      setState('checked_in')
      await fetchCommitments()
    } catch (err) {
      console.warn('[DailyCommit] checkin:', err?.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pod stats ──────────────────────────────────────────────────────
  const committedCount = podCommitments.length
  const checkedInCount = podCommitments.filter(
    (c) => c.checkedIn || c.checked_in
  ).length
  const streak = commitment?.streak || commitment?.streakCount || 0

  // ── Loading ────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top + 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Back header */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={22} color={colors.text} />
        <Text style={[styles.backLabel, { color: colors.textSec, fontFamily: FONT.medium }]}>
          {podName || 'Pod'}
        </Text>
      </TouchableOpacity>

      {/* ── NO COMMITMENT ─────────────────────────────────── */}
      {state === 'no_commitment' && (
        <View style={{ paddingHorizontal: SPACING.md }}>
          <Text style={[styles.title, { color: colors.text, fontFamily: FONT.bold }]}>
            What's your plan today?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSec, fontFamily: FONT.regular }]}>
            {podName}{goalType ? ` \u00B7 ${goalType}` : ''}
          </Text>

          {/* Activity chips */}
          <Text style={[styles.sectionLabel, { color: colors.textSec, fontFamily: FONT.semibold }]}>
            Activity
          </Text>
          <View style={styles.chipRow}>
            {activities.map((a) => {
              const selected = activity === a
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => setActivity(a)}
                  style={[
                    styles.chip,
                    { borderColor: selected ? COLORS.accent : colors.borderStrong },
                    selected && { backgroundColor: COLORS.accentSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? COLORS.accent : colors.textSec, fontFamily: FONT.semibold },
                    ]}
                  >
                    {a}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Time presets */}
          <Text style={[styles.sectionLabel, { color: colors.textSec, fontFamily: FONT.semibold }]}>
            When
          </Text>
          <View style={styles.timeRow}>
            {TIME_PRESETS.map((t) => {
              const selected = timePreset === t.label
              return (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => setTimePreset(t.label)}
                  style={[
                    styles.timeCard,
                    { ...card, borderTopWidth: 3, borderTopColor: selected ? COLORS.accent : colors.border },
                    selected && { backgroundColor: COLORS.accentSoft },
                  ]}
                >
                  <Feather name={t.icon} size={20} color={selected ? COLORS.accent : colors.textSec} />
                  <Text style={[styles.timeLabel, { color: selected ? COLORS.accent : colors.text, fontFamily: FONT.semibold }]}>
                    {t.label}
                  </Text>
                  <Text style={[styles.timeRange, { color: colors.textSec, fontFamily: FONT.regular }]}>
                    {t.range}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Details input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSec,
                color: colors.text,
                borderColor: colors.borderStrong,
                fontFamily: FONT.regular,
              },
            ]}
            placeholder="Add details (optional)"
            placeholderTextColor={colors.textTer}
            value={details}
            onChangeText={setDetails}
            maxLength={120}
          />

          {/* Commit button */}
          <TouchableOpacity
            style={[styles.commitBtn, (!activity || !timePreset) && styles.btnDisabled]}
            onPress={handleCommit}
            disabled={!activity || !timePreset || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={20} color="#fff" />
                <Text style={styles.commitBtnText}>COMMIT</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.notifyRow}>
            <Feather name="users" size={14} color={colors.textTer} />
            <Text style={[styles.notifyText, { color: colors.textTer, fontFamily: FONT.regular }]}>
              Your pod will be notified
            </Text>
          </View>
        </View>
      )}

      {/* ── COMMITTED ─────────────────────────────────────── */}
      {state === 'committed' && (
        <View style={{ paddingHorizontal: SPACING.md }}>
          {/* Success card */}
          <View style={[styles.successCard, { ...card, borderTopWidth: 3, borderTopColor: COLORS.green }]}>
            <View style={styles.successHeader}>
              <Feather name="check-circle" size={28} color={COLORS.green} />
              <Text style={[styles.successTitle, { color: COLORS.green, fontFamily: FONT.bold }]}>
                Committed!
              </Text>
            </View>
            <Text style={[styles.successDetail, { color: colors.text, fontFamily: FONT.medium }]}>
              {commitment?.commitmentText || commitment?.commitment_text || activity}
            </Text>
            <Text style={[styles.successSub, { color: colors.textSec, fontFamily: FONT.regular }]}>
              Your pod is counting on you
            </Text>
          </View>

          {/* Pod status */}
          {committedCount > 0 && (
            <View style={[styles.podStatus, { ...card, borderTopWidth: 3, borderTopColor: COLORS.cyan }]}>
              <Text style={[styles.podStatusLabel, { color: colors.textSec, fontFamily: FONT.semibold }]}>
                Pod Activity
              </Text>
              <View style={styles.avatarRow}>
                {podCommitments.slice(0, 6).map((c, i) => (
                  <View
                    key={c.id || i}
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.bgTer, borderColor: (c.checkedIn || c.checked_in) ? COLORS.green : COLORS.amber },
                    ]}
                  >
                    <Feather
                      name={(c.checkedIn || c.checked_in) ? 'check' : 'clock'}
                      size={14}
                      color={(c.checkedIn || c.checked_in) ? COLORS.green : COLORS.amber}
                    />
                  </View>
                ))}
              </View>
              <Text style={[styles.podCount, { color: colors.textSec, fontFamily: FONT.regular }]}>
                {committedCount} committed{checkedInCount > 0 ? ` \u00B7 ${checkedInCount} checked in` : ''}
              </Text>
            </View>
          )}

          {/* Check-in button */}
          <TouchableOpacity
            style={styles.checkInBtn}
            onPress={handleCheckIn}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={22} color="#fff" />
                <Text style={styles.checkInBtnText}>CHECK IN</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── CHECKED IN ────────────────────────────────────── */}
      {state === 'checked_in' && (
        <View style={{ paddingHorizontal: SPACING.md, alignItems: 'center' }}>
          <View style={styles.doneIcon}>
            <Feather name="check-circle" size={64} color={COLORS.green} />
          </View>
          <Text style={[styles.doneTitle, { color: COLORS.green, fontFamily: FONT.bold }]}>
            Done for today!
          </Text>

          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Feather name="zap" size={18} color={COLORS.amber} />
              <Text style={[styles.streakText, { color: COLORS.amber, fontFamily: FONT.bold }]}>
                {streak} day streak
              </Text>
            </View>
          )}

          {/* Pod progress */}
          <View style={[styles.podProgressCard, { ...card, borderTopWidth: 3, borderTopColor: COLORS.green }]}>
            <Text style={[styles.podProgressText, { color: colors.text, fontFamily: FONT.semibold }]}>
              {checkedInCount}/{committedCount} members checked in
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${committedCount ? (checkedInCount / committedCount) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.feedBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Feather name="message-circle" size={18} color={COLORS.accent} />
            <Text style={[styles.feedBtnText, { color: COLORS.accent, fontFamily: FONT.semibold }]}>
              View Pod Feed
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  backLabel: { fontSize: 15, marginLeft: 8 },

  // Form
  title: { fontSize: 26, lineHeight: 32, marginBottom: 6 },
  subtitle: { fontSize: 15, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.md },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 14 },

  timeRow: { flexDirection: 'row', gap: 10 },
  timeCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: RADIUS.md, gap: 4 },
  timeLabel: { fontSize: 14, marginTop: 4 },
  timeRange: { fontSize: 11 },

  input: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  commitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    gap: 10,
  },
  commitBtnText: { color: '#fff', fontSize: 17, fontFamily: FONT.bold, letterSpacing: 1.5 },
  btnDisabled: { opacity: 0.4 },

  notifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 6 },
  notifyText: { fontSize: 13 },

  // Committed
  successCard: { padding: SPACING.md, marginBottom: SPACING.md },
  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  successTitle: { fontSize: 22 },
  successDetail: { fontSize: 16, marginBottom: 6 },
  successSub: { fontSize: 14 },

  podStatus: { padding: SPACING.md, marginBottom: SPACING.md },
  podStatusLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  avatarRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  podCount: { fontSize: 13 },

  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    paddingVertical: 20,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    gap: 10,
  },
  checkInBtnText: { color: '#fff', fontSize: 18, fontFamily: FONT.bold, letterSpacing: 1.5 },

  // Checked in / Done
  doneIcon: { marginTop: SPACING.xxl, marginBottom: SPACING.md },
  doneTitle: { fontSize: 28, marginBottom: SPACING.md },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.lg },
  streakText: { fontSize: 18 },

  podProgressCard: { padding: SPACING.md, width: '100%', marginBottom: SPACING.lg },
  podProgressText: { fontSize: 15, marginBottom: 10 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 4 },

  feedBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.accent },
  feedBtnText: { fontSize: 15 },
})
