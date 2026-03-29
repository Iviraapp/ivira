import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const POD_PURPLE = '#8B5CF6'
const POD_GREEN = '#22C55E'
const POD_AMBER = '#F59E0B'
const POD_DIAMOND = '#38BDF8'

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#94A3B8',
  gold: '#FBBF24',
  diamond: POD_DIAMOND,
}

const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
}

function formatToday() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export default function PodHomeScreen({ navigation }) {
  const { colors, isDark, card } = useTheme()
  const { member, gymId } = useAuth()

  const [pod, setPod] = useState(null)
  const [commitments, setCommitments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Auto-match
  const [matching, setMatching] = useState(false)
  const [matchSuccess, setMatchSuccess] = useState(false)

  // Commitment input
  const [commitTime, setCommitTime] = useState('')
  const [commitActivity, setCommitActivity] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const memberId = member?.id || member?._id

  const fetchPodData = useCallback(async () => {
    if (!gymId || !memberId) return
    try {
      setError(null)
      const podsRes = await api.get(`/gyms/${gymId}/members/${memberId}/pods`)
      const pods = podsRes.data?.pods || podsRes.data || []
      if (!pods.length) {
        setPod(null)
        setCommitments([])
        return
      }
      const activePod = pods[0]
      const podId = activePod.id || activePod._id
      const detailRes = await api.get(`/gyms/${gymId}/pods/${podId}`)
      const podData = detailRes.data?.pod || detailRes.data
      setPod(podData)

      try {
        const commitRes = await api.get(
          `/gyms/${gymId}/pods/${podId}/commitments?date=${formatToday()}`
        )
        setCommitments(commitRes.data?.commitments || commitRes.data || [])
      } catch {
        setCommitments([])
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setPod(null)
        setCommitments([])
      } else {
        setError('Could not load pod data')
      }
    }
  }, [gymId, memberId])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchPodData().finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [fetchPodData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPodData()
    setRefreshing(false)
  }, [fetchPodData])

  // --- Auto-match ---
  const handleAutoMatch = async () => {
    if (!gymId) return
    setMatching(true)
    try {
      await api.post(`/gyms/${gymId}/pods/auto-match`, {
        goalType: 'Gym',
        intensity: 'serious',
        timePreference: 'morning',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setMatchSuccess(true)
      setTimeout(() => setMatchSuccess(false), 3000)
      await fetchPodData()
    } catch (err) {
      Alert.alert('Match Failed', err.response?.data?.message || 'Please try again later.')
    } finally {
      setMatching(false)
    }
  }

  // --- Check in ---
  const handleCheckIn = async () => {
    const podId = pod?.id || pod?._id
    if (!gymId || !podId) return
    // Find today's commitment for current member
    const myCommitment = commitments.find(c =>
      (c.member_id === member?.id || c.memberId === member?.id) && c.status === 'pending'
    )
    if (!myCommitment) {
      Alert.alert('No Commitment', 'Commit to a plan first before checking in.')
      return
    }
    try {
      await api.post(`/gyms/${gymId}/pods/${podId}/checkin`, {
        commitmentId: myCommitment.id || myCommitment._id,
      })
      Alert.alert('Checked In', 'Nice work. Your pod can see you showed up.')
      onRefresh()
    } catch (err) {
      Alert.alert('Check-In Failed', err.response?.data?.message || 'Try again.')
    }
  }

  // --- Submit commitment ---
  const handleCommit = async () => {
    const podId = pod?.id || pod?._id
    if (!gymId || !podId || !commitTime.trim() || !commitActivity.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/gyms/${gymId}/pods/${podId}/commitments`, {
        committedTime: commitTime.trim(),
        commitmentText: commitActivity.trim(),
        date: formatToday(),
      })
      setCommitTime('')
      setCommitActivity('')
      onRefresh()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save commitment.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Helpers ---
  const podMembers = pod?.members || []
  const podId = pod?.id || pod?._id
  const tier = (pod?.tier || 'bronze').toLowerCase()
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze
  const tierLabel = TIER_LABELS[tier] || 'Bronze'
  const healthScore = pod?.healthScore ?? pod?.health_score ?? 0
  const multiplier = pod?.consistencyMultiplier ?? pod?.consistency_multiplier ?? 1
  const myStreak = member?.streak ?? 0
  const podAvgStreak = pod?.averageStreak ?? pod?.average_streak ?? 0
  const longestStreak = pod?.longestStreak ?? pod?.longest_streak ?? 0
  const userHasCommitted = commitments.some(
    (c) => (c.memberId || c.member_id) === memberId
  )

  // --- Loading ---
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={POD_PURPLE} />
        <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading your pod...</Text>
      </View>
    )
  }

  // --- Error ---
  if (error && !pod) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Feather name="alert-circle" size={40} color={COLORS.red} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ========== EMPTY STATE ==========
  if (!pod) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={POD_PURPLE} />}
      >
        {matchSuccess && (
          <View style={styles.celebrationBanner}>
            <Feather name="check-circle" size={20} color="#fff" />
            <Text style={styles.celebrationText}>You're in! Welcome to your pod.</Text>
          </View>
        )}

        <View style={[styles.emptyCard, card, { borderTopWidth: 3, borderTopColor: POD_PURPLE }]}>
          <View style={styles.emptyIconWrap}>
            <Feather name="shield" size={56} color={POD_PURPLE} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Join an Accountability Pod
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSec }]}>
            Get matched with 3-5 people who share your goals. Stay consistent together.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: POD_PURPLE, opacity: matching ? 0.7 : 1 }]}
            onPress={handleAutoMatch}
            disabled={matching}
            activeOpacity={0.8}
          >
            {matching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Auto-Match Me</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: POD_PURPLE }]}
            onPress={() => navigation.navigate('PodDiscovery')}
            activeOpacity={0.8}
          >
            <Feather name="search" size={16} color={POD_PURPLE} style={{ marginRight: 8 }} />
            <Text style={[styles.secondaryBtnText, { color: POD_PURPLE }]}>Browse Pods</Text>
          </TouchableOpacity>
        </View>

        {/* Benefit pills */}
        <View style={styles.benefitsRow}>
          {['Social pressure works', '3-5 members per pod', 'Daily commitments'].map((txt) => (
            <View key={txt} style={[styles.benefitPill, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
              <Text style={[styles.benefitText, { color: POD_PURPLE }]}>{txt}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    )
  }

  // ========== ACTIVE POD STATE ==========
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={POD_PURPLE} />}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.podName, { color: colors.text }]}>
              {pod.name || 'My Pod'}
            </Text>
            <View style={styles.tierRow}>
              <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20` }]}>
                <Feather
                  name={tier === 'diamond' ? 'award' : 'star'}
                  size={12}
                  color={tierColor}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
              </View>
              <View style={styles.multiplierWrap}>
                <Feather name="trending-up" size={13} color={POD_GREEN} style={{ marginRight: 3 }} />
                <Text style={[styles.multiplierText, { color: POD_GREEN }]}>{multiplier}x</Text>
              </View>
            </View>
          </View>

          {/* Health score ring */}
          <View style={[styles.healthRing, { borderColor: healthScore >= 70 ? POD_GREEN : healthScore >= 40 ? POD_AMBER : COLORS.red }]}>
            <Text style={[styles.healthScore, { color: colors.text }]}>{healthScore}</Text>
            <Text style={[styles.healthLabel, { color: colors.textTer }]}>health</Text>
          </View>
        </View>
      </View>

      {/* Members Row */}
      <View style={[styles.membersCard, card, { borderTopWidth: 3, borderTopColor: POD_PURPLE }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>MEMBERS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
          {podMembers.map((m) => {
            const mId = m.id || m._id
            const isCaptain = m.role === 'captain' || m.isCaptain || m.is_captain
            const checkedIn = m.checkedInToday || m.checked_in_today
            const initial = (m.name || m.firstName || m.first_name || '?')[0].toUpperCase()
            return (
              <View key={mId} style={styles.memberItem}>
                <View
                  style={[
                    styles.memberAvatar,
                    {
                      borderColor: checkedIn ? POD_GREEN : 'rgba(148,163,184,0.25)',
                      backgroundColor: colors.bgTer,
                    },
                  ]}
                >
                  <Text style={[styles.memberInitial, { color: colors.text }]}>{initial}</Text>
                  {isCaptain && (
                    <View style={styles.captainBadge}>
                      <Feather name="star" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={[styles.memberName, { color: colors.textSec }]} numberOfLines={1}>
                  {m.name || m.firstName || m.first_name || 'Member'}
                </Text>
                {m.streak != null && (
                  <Text style={[styles.memberStreak, { color: POD_GREEN }]}>
                    {m.streak}d
                  </Text>
                )}
              </View>
            )
          })}
        </ScrollView>
      </View>

      {/* Today's Commitments */}
      <View style={[styles.commitmentsCard, card, { borderTopWidth: 3, borderTopColor: COLORS.accent }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Plan</Text>

        {commitments.length === 0 && userHasCommitted === false && (
          <Text style={[styles.noCommitmentsText, { color: colors.textTer }]}>
            No commitments yet today. Be the first.
          </Text>
        )}

        {commitments.map((c, i) => {
          const cMemberId = c.memberId || c.member_id
          const isMe = cMemberId === memberId
          const status = c.status || 'pending'
          const statusIcon = status === 'done' ? 'check-circle' : status === 'missed' ? 'x-circle' : 'clock'
          const statusColor = status === 'done' ? POD_GREEN : status === 'missed' ? COLORS.red : POD_AMBER
          const cName = c.memberName || c.member_name || (isMe ? 'You' : 'Member')
          const initial = cName[0].toUpperCase()
          return (
            <View key={i} style={[styles.commitRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.commitAvatar, { backgroundColor: colors.bgTer }]}>
                <Text style={[styles.commitInitial, { color: colors.text }]}>{initial}</Text>
              </View>
              <View style={styles.commitInfo}>
                <Text style={[styles.commitName, { color: isMe ? POD_PURPLE : colors.text }]}>
                  {cName}
                </Text>
                <Text style={[styles.commitDetail, { color: colors.textSec }]}>
                  {c.time} - {c.activity}
                </Text>
              </View>
              <Feather name={statusIcon} size={20} color={statusColor} />
            </View>
          )
        })}

        {/* Commitment input */}
        {!userHasCommitted && (
          <View style={styles.commitInputWrap}>
            <View style={[styles.commitInputRow, { borderColor: colors.borderStrong }]}>
              <TextInput
                style={[styles.commitTimeInput, { color: colors.text, borderColor: colors.borderStrong }]}
                placeholder="7:00 AM"
                placeholderTextColor={colors.textTer}
                value={commitTime}
                onChangeText={setCommitTime}
              />
              <TextInput
                style={[styles.commitActivityInput, { color: colors.text, borderColor: colors.borderStrong }]}
                placeholder="What are you doing?"
                placeholderTextColor={colors.textTer}
                value={commitActivity}
                onChangeText={setCommitActivity}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.commitBtn,
                {
                  backgroundColor: COLORS.accent,
                  opacity: submitting || !commitTime.trim() || !commitActivity.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handleCommit}
              disabled={submitting || !commitTime.trim() || !commitActivity.trim()}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.commitBtnText}>Commit</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
          onPress={handleCheckIn}
          activeOpacity={0.8}
        >
          <Feather name="check" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.bgTer }]}
          onPress={() => navigation.navigate('PodFeed', { podId })}
          activeOpacity={0.8}
        >
          <Feather name="message-circle" size={18} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Pod Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.bgTer }]}
          onPress={() => navigation.navigate('PodStats', { podId })}
          activeOpacity={0.8}
        >
          <Feather name="bar-chart-2" size={18} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Streak Display */}
      <View style={[styles.streakCard, card, { borderTopWidth: 3, borderTopColor: POD_AMBER }]}>
        <View style={styles.streakMain}>
          <Text style={[styles.streakNumber, { color: COLORS.accent }]}>{myStreak}</Text>
          <Text style={[styles.streakLabel, { color: colors.textSec }]}>day streak</Text>
        </View>
        <View style={styles.streakMeta}>
          <View style={styles.streakMetaItem}>
            <Text style={[styles.streakMetaValue, { color: colors.text }]}>{podAvgStreak}</Text>
            <Text style={[styles.streakMetaLabel, { color: colors.textTer }]}>pod avg</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakMetaItem}>
            <Text style={[styles.streakMetaValue, { color: colors.text }]}>{longestStreak}</Text>
            <Text style={[styles.streakMetaLabel, { color: colors.textTer }]}>longest</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: POD_PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  retryBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: '#fff',
  },

  // === Empty state ===
  emptyContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: 60,
    alignItems: 'center',
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: POD_GREEN,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  celebrationText: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    color: '#fff',
    marginLeft: 8,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139,92,246,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: FONT.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDesc: {
    fontFamily: FONT.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADIUS.sm,
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    width: '100%',
  },
  secondaryBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 15,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  benefitPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  benefitText: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },

  // === Active state: header ===
  headerSection: {
    marginBottom: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  podName: {
    fontFamily: FONT.bold,
    fontSize: 22,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  tierText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  multiplierWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiplierText: {
    fontFamily: FONT.numBold,
    fontSize: 14,
  },
  healthRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScore: {
    fontFamily: FONT.numBold,
    fontSize: 20,
    lineHeight: 24,
  },
  healthLabel: {
    fontFamily: FONT.medium,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // === Members ===
  membersCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontFamily: FONT.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  membersScroll: {
    flexDirection: 'row',
  },
  memberItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 56,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberInitial: {
    fontFamily: FONT.bold,
    fontSize: 16,
  },
  captainBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontFamily: FONT.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  memberStreak: {
    fontFamily: FONT.numSemibold,
    fontSize: 10,
    marginTop: 1,
  },

  // === Commitments ===
  commitmentsCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginBottom: 12,
  },
  noCommitmentsText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    marginBottom: 12,
  },
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  commitAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commitInitial: {
    fontFamily: FONT.bold,
    fontSize: 13,
  },
  commitInfo: {
    flex: 1,
  },
  commitName: {
    fontFamily: FONT.semibold,
    fontSize: 14,
  },
  commitDetail: {
    fontFamily: FONT.regular,
    fontSize: 13,
    marginTop: 1,
  },
  commitInputWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.08)',
  },
  commitInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  commitTimeInput: {
    flex: 0.35,
    fontFamily: FONT.regular,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  commitActivityInput: {
    flex: 0.65,
    fontFamily: FONT.regular,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  commitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  commitBtnText: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: '#fff',
  },

  // === Quick actions ===
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  actionBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 13,
    color: '#fff',
  },

  // === Streak ===
  streakCard: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakMain: {
    flex: 1,
    alignItems: 'flex-start',
  },
  streakNumber: {
    fontFamily: FONT.numExtraBold,
    fontSize: 36,
    lineHeight: 40,
  },
  streakLabel: {
    fontFamily: FONT.medium,
    fontSize: 14,
    marginTop: 2,
  },
  streakMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakMetaItem: {
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  streakMetaValue: {
    fontFamily: FONT.numBold,
    fontSize: 20,
  },
  streakMetaLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    marginTop: 2,
  },
  streakDivider: {
    width: 1,
    height: 28,
  },
})
