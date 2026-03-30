import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Haptics from '../lib/haptics'

// Workout type → emoji icon
function getWorkoutIcon(type) {
  if (!type) return '💪'
  const t = type.toLowerCase()
  if (t.includes('push') || t.includes('upper')) return '💪'
  if (t.includes('pull') || t.includes('leg')) return '🦵'
  if (t.includes('cardio') || t.includes('run')) return '🏃'
  if (t.includes('full') || t.includes('body')) return '⭐'
  return '💪'
}

function formatSessionDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function SkeletonCard({ colors }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <View style={[styles.skeletonIcon, { backgroundColor: colors.bgTer }]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { backgroundColor: colors.bgTer, width: '55%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.bgTer, width: '35%', marginTop: 8 }]} />
      </View>
      <View style={[styles.skeletonBadge, { backgroundColor: colors.bgTer }]} />
    </View>
  )
}

function WorkoutCard({ session, colors }) {
  const icon = getWorkoutIcon(session.type)
  const dateLabel = formatSessionDate(session.started_at)
  const typeLabel = session.type
    ? session.type.charAt(0).toUpperCase() + session.type.slice(1)
    : 'Workout'

  return (
    <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: COLORS.accentSoft }]}>
        <Text style={styles.iconEmoji}>{icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {typeLabel}
        </Text>
        <Text style={[styles.cardDate, { color: colors.textSec }]}>{dateLabel}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {!!session.duration_min && (
            <View style={styles.statChip}>
              <Feather name="clock" size={11} color={colors.textTer} />
              <Text style={[styles.statText, { color: colors.textSec }]}>
                {session.duration_min} min
              </Text>
            </View>
          )}
          {!!session.total_sets && (
            <View style={styles.statChip}>
              <Feather name="layers" size={11} color={colors.textTer} />
              <Text style={[styles.statText, { color: colors.textSec }]}>
                {session.total_sets} sets
              </Text>
            </View>
          )}
          {!!session.total_reps && (
            <View style={styles.statChip}>
              <Feather name="repeat" size={11} color={colors.textTer} />
              <Text style={[styles.statText, { color: colors.textSec }]}>
                {session.total_reps} reps
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right accent dot */}
      <View style={[styles.accentDot, { backgroundColor: COLORS.accent }]} />
    </View>
  )
}

function EmptyState({ colors }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.bgSec }]}>
        <Text style={styles.emptyEmoji}>💪</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No workouts logged yet.</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTer }]}>
        Tap 'Log Workout' on the home screen to start.
      </Text>
    </View>
  )
}

export default function WorkoutHistoryScreen({ navigation }) {
  const { member, gymInfo } = useAuth()
  const { colors } = useTheme()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const gymId = gymInfo?.id
      const memberId = member?.id
      if (gymId && memberId) {
        const res = await api.get(`/gyms/${gymId}/members/${memberId}/workout-sessions`)
        setSessions(res.data?.sessions || [])
        return
      }
    } catch (err) {
      console.warn('[WorkoutHistory] fetchSessions:', err?.message)
    }
    setSessions([])
  }, [gymInfo, member])

  useEffect(() => {
    fetchSessions().finally(() => setLoading(false))
  }, [fetchSessions])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await fetchSessions()
    setRefreshing(false)
  }, [fetchSessions])

  const renderItem = useCallback(({ item }) => (
    <WorkoutCard session={item} colors={colors} />
  ), [colors])

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((k) => (
        <SkeletonCard key={k} colors={colors} />
      ))}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.bgSec }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Workout History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState colors={colors} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via inline style using theme colors
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor set via inline style using theme colors
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    // color set via inline style using theme colors
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
    paddingTop: SPACING.sm,
  },

  // Workout card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set via inline style using theme colors
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    // borderColor set via inline style using theme colors
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    // color set via inline style using theme colors
  },
  cardDate: {
    fontSize: 12,
    // color set via inline style using theme colors
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    // color set via inline style using theme colors
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: SPACING.sm,
  },

  // Skeleton
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: SPACING.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: SPACING.lg || 24,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg || 24,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    // color set via inline style using theme colors
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    // color set via inline style using theme colors
    textAlign: 'center',
    lineHeight: 20,
  },
})
