import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, GLASS_CARD } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEDAL_COLORS = {
  1: '#FFD700',  // Gold
  2: '#C0C0C0',  // Silver
  3: '#CD7F32',  // Bronze
}

const DATE_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateParam(filterKey) {
  const now = new Date()
  switch (filterKey) {
    case 'yesterday': {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    }
    case 'week': {
      // Start of current week (Monday)
      const d = new Date(now)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff)
      return d.toISOString().split('T')[0]
    }
    default:
      return now.toISOString().split('T')[0]
  }
}

function formatSteps(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString()
}

function formatDistance(km) {
  if (!km && km !== 0) return '0 km'
  return `${km.toFixed(1)} km`
}

function formatCalories(cal) {
  if (!cal && cal !== 0) return '0'
  return Math.round(cal).toLocaleString()
}

function isEliteTier(member) {
  if (!member) return false
  const tier = (member.membership_tier || member.tier || '').toLowerCase()
  return tier === 'elite' || tier === 'premium' || tier === 'vip'
}

// ---------------------------------------------------------------------------
// Podium Card
// ---------------------------------------------------------------------------

function PodiumCard({ entry, rank, colors, isCurrentUser }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    const delay = rank === 1 ? 200 : rank === 2 ? 100 : 300
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const medalColor = MEDAL_COLORS[rank]
  const isFirst = rank === 1
  const podiumHeight = isFirst ? 120 : rank === 2 ? 96 : 80
  const avatarSize = isFirst ? 64 : 52

  return (
    <Animated.View
      style={[
        styles.podiumCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          width: isFirst ? (SCREEN_WIDTH - SPACING.lg * 2) * 0.38 : (SCREEN_WIDTH - SPACING.lg * 2) * 0.29,
          order: rank === 1 ? 1 : rank === 2 ? 0 : 2,
        },
      ]}
    >
      {/* Avatar circle */}
      <View
        style={[
          styles.podiumAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: medalColor,
            backgroundColor: colors.bgTer,
          },
        ]}
      >
        <Text style={[styles.podiumAvatarText, { color: colors.text, fontSize: isFirst ? 24 : 20 }]}>
          {(entry.name || '?').charAt(0).toUpperCase()}
        </Text>
        {/* Medal badge */}
        <View style={[styles.medalBadge, { backgroundColor: medalColor }]}>
          <Text style={styles.medalText}>{rank}</Text>
        </View>
      </View>

      {/* Name */}
      <Text
        style={[styles.podiumName, { color: colors.text }]}
        numberOfLines={1}
      >
        {entry.name || 'Member'}
      </Text>

      {/* Steps */}
      <Text style={[styles.podiumSteps, { color: medalColor }]}>
        {formatSteps(entry.steps)}
      </Text>
      <Text style={[styles.podiumUnit, { color: colors.textSec }]}>steps</Text>

      {/* Podium bar */}
      <View
        style={[
          styles.podiumBar,
          {
            height: podiumHeight,
            backgroundColor: `${medalColor}15`,
            borderColor: `${medalColor}30`,
          },
        ]}
      >
        <Feather
          name={rank === 1 ? 'award' : rank === 2 ? 'trending-up' : 'star'}
          size={isFirst ? 28 : 22}
          color={medalColor}
          style={{ opacity: 0.6 }}
        />
      </View>

      {/* Current user indicator */}
      {isCurrentUser && (
        <View style={[styles.youBadge, { backgroundColor: COLORS.accent }]}>
          <Text style={styles.youBadgeText}>YOU</Text>
        </View>
      )}
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Ranking Row
// ---------------------------------------------------------------------------

function RankingRow({ entry, colors, isCurrentUser }) {
  const medalColor = MEDAL_COLORS[entry.rank]

  return (
    <View
      style={[
        styles.rankRow,
        {
          ...ELITE_CARD,
          borderTopWidth: 3,
          borderTopColor: medalColor || COLORS.accent,
          marginBottom: SPACING.sm,
        },
        isCurrentUser && {
          shadowColor: COLORS.accentGlow,
          shadowOpacity: 0.5,
          shadowRadius: 16,
          borderTopColor: COLORS.accent,
        },
      ]}
    >
      {/* Rank */}
      <View style={[styles.rankBadge, { backgroundColor: medalColor ? `${medalColor}20` : colors.bgTer }]}>
        {medalColor ? (
          <Feather name="award" size={18} color={medalColor} />
        ) : (
          <Text style={[styles.rankNumber, { color: colors.textSec }]}>{entry.rank}</Text>
        )}
      </View>

      {/* Avatar + name */}
      <View style={styles.rankInfo}>
        <View style={[styles.rankAvatar, { backgroundColor: colors.bgTer }]}>
          <Text style={[styles.rankAvatarText, { color: colors.text }]}>
            {(entry.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.rankNameBlock}>
          <View style={styles.rankNameRow}>
            <Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
              {entry.name || 'Member'}
            </Text>
            {isCurrentUser && (
              <View style={[styles.youTag, { backgroundColor: COLORS.accentSoft }]}>
                <Text style={[styles.youTagText, { color: COLORS.accent }]}>YOU</Text>
              </View>
            )}
          </View>
          <Text style={[styles.rankSubtext, { color: colors.textSec }]}>
            {formatDistance(entry.distance_km)}  ·  {formatCalories(entry.calories_burned)} kcal
          </Text>
        </View>
      </View>

      {/* Steps */}
      <View style={styles.rankStepsBlock}>
        <Text style={[styles.rankStepsValue, { color: colors.text }]}>
          {formatSteps(entry.steps)}
        </Text>
        <Text style={[styles.rankStepsLabel, { color: colors.textSec }]}>steps</Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Locked Overlay
// ---------------------------------------------------------------------------

function LockedOverlay({ colors, navigation }) {
  return (
    <View style={[styles.lockedOverlay, { backgroundColor: `${COLORS.bg}E6` }]}>
      <View
        style={[
          styles.lockedCard,
          GLASS_CARD,
          { borderTopWidth: 3, borderTopColor: COLORS.accent },
        ]}
      >
        <View style={[styles.lockedIconCircle, { backgroundColor: COLORS.accentSoft }]}>
          <Feather name="lock" size={32} color={COLORS.accent} />
        </View>
        <Text style={[styles.lockedTitle, { color: colors.text }]}>Elite Members Only</Text>
        <Text style={[styles.lockedDesc, { color: colors.textSec }]}>
          Upgrade to Elite tier to compete on the city leaderboard and track your ranking against other members.
        </Text>
        <TouchableOpacity
          style={[styles.upgradeBtn, { backgroundColor: COLORS.accent }]}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate?.('MembershipRenewal')}
        >
          <Feather name="zap" size={18} color="#FFF" />
          <Text style={styles.upgradeBtnText}>Upgrade to Elite</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CityLeaderboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { member, gymId } = useAuth()

  const [filter, setFilter] = useState('today')
  const [rankings, setRankings] = useState([])
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const elite = isEliteTier(member)

  // ---- Fetch leaderboard ----
  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (!gymId) return
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const date = getDateParam(filter)
      const res = await api.get(`/gyms/${gymId}/leaderboard/city`, { params: { date } })
      const data = res.data || {}
      setRankings(Array.isArray(data.rankings) ? data.rankings : [])
      setCity(data.city || '')
    } catch (err) {
      console.warn('[CityLeaderboard] fetch error:', err?.message)
      const status = err?.response?.status
      if (status === 403) {
        setError('Elite tier membership required to view city rankings.')
      } else if (status === 404) {
        setError('Leaderboard not available for your city yet.')
      } else {
        setError('Failed to load leaderboard. Pull to retry.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, filter])

  useEffect(() => {
    if (elite) fetchLeaderboard()
  }, [fetchLeaderboard, elite])

  const onRefresh = useCallback(() => fetchLeaderboard(true), [fetchLeaderboard])

  // ---- Derived data ----
  const top3 = rankings.slice(0, 3)
  const rest = rankings.slice(3)
  const currentMemberId = member?.id || member?.member_id

  // ---- Render helpers ----

  const renderHeader = () => (
    <View>
      {/* Podium */}
      {top3.length > 0 && (
        <View style={styles.podiumContainer}>
          {/* Render in visual order: 2nd, 1st, 3rd */}
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, idx) => {
            const rank = entry.rank || (idx === 0 ? 2 : idx === 1 ? 1 : 3)
            return (
              <PodiumCard
                key={entry.member_id || idx}
                entry={entry}
                rank={rank}
                colors={colors}
                isCurrentUser={entry.member_id === currentMemberId}
              />
            )
          })}
        </View>
      )}

      {/* Divider label */}
      {rest.length > 0 && (
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerLabel, { color: colors.textSec }]}>ALL RANKINGS</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>
      )}
    </View>
  )

  const renderRankItem = useCallback(({ item }) => (
    <RankingRow
      entry={item}
      colors={colors}
      isCurrentUser={item.member_id === currentMemberId}
    />
  ), [colors, currentMemberId])

  const keyExtractor = useCallback((item) => String(item.member_id || item.rank), [])

  // ---- Empty state ----
  const renderEmpty = () => {
    if (loading) return null
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.bgTer }]}>
          <Feather name="bar-chart-2" size={40} color={colors.textSec} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Rankings Yet</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSec }]}>
          {filter === 'today'
            ? 'Rankings will appear as members log their steps today.'
            : 'No step data recorded for this period.'}
        </Text>
      </View>
    )
  }

  // ---- Main render ----
  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.bgTer }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>City Leaderboard</Text>
          {city ? (
            <View style={[styles.cityBadge, { backgroundColor: COLORS.accentSoft }]}>
              <Feather name="map-pin" size={12} color={COLORS.accent} />
              <Text style={[styles.cityText, { color: COLORS.accent }]}>{city}</Text>
            </View>
          ) : null}
        </View>

        {/* Spacer for symmetry */}
        <View style={styles.backBtn} />
      </View>

      {/* Date filter pills */}
      <View style={styles.filterRow}>
        {DATE_FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? COLORS.accent : colors.bgTer,
                  borderColor: active ? COLORS.accent : colors.borderStrong,
                },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: active ? '#FFF' : colors.textSec },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading rankings...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.bgTer }]}>
            <Feather name="alert-circle" size={40} color={COLORS.amber} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Oops</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSec }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.bgTer }]}
            onPress={() => fetchLeaderboard()}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={16} color={COLORS.accent} />
            <Text style={[styles.retryText, { color: COLORS.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rest}
          renderItem={renderRankItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + SPACING.xl },
          ]}
          showsVerticalScrollIndicator={false}
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

      {/* Locked overlay for non-elite */}
      {!elite && <LockedOverlay colors={colors} navigation={navigation} />}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  cityText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterPillText: {
    fontFamily: FONT.semibold,
    fontSize: 13,
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  podiumCard: {
    alignItems: 'center',
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: SPACING.sm,
  },
  podiumAvatarText: {
    fontFamily: FONT.bold,
  },
  medalBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontFamily: FONT.numBold,
    fontSize: 12,
    color: '#000',
  },
  podiumName: {
    fontFamily: FONT.semibold,
    fontSize: 13,
    marginBottom: 2,
    maxWidth: 100,
    textAlign: 'center',
  },
  podiumSteps: {
    fontFamily: FONT.numBold,
    fontSize: 22,
    lineHeight: 26,
  },
  podiumUnit: {
    fontFamily: FONT.medium,
    fontSize: 11,
    marginBottom: SPACING.sm,
  },
  podiumBar: {
    width: '100%',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  youBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontFamily: FONT.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginHorizontal: SPACING.sm,
  },

  // Rank row
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 4,
    marginHorizontal: SPACING.md,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm + 4,
  },
  rankNumber: {
    fontFamily: FONT.numBold,
    fontSize: 15,
  },
  rankInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rankAvatarText: {
    fontFamily: FONT.bold,
    fontSize: 16,
  },
  rankNameBlock: {
    flex: 1,
  },
  rankNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankName: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    flexShrink: 1,
  },
  youTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  youTagText: {
    fontFamily: FONT.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  rankSubtext: {
    fontFamily: FONT.regular,
    fontSize: 12,
    marginTop: 2,
  },
  rankStepsBlock: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  rankStepsValue: {
    fontFamily: FONT.numBold,
    fontSize: 18,
    lineHeight: 22,
  },
  rankStepsLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
  },

  // List
  listContent: {
    paddingTop: SPACING.xs,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  retryText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
  },
  emptyDesc: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Locked overlay
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  lockedCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  lockedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  lockedTitle: {
    fontFamily: FONT.bold,
    fontSize: 22,
    marginBottom: SPACING.sm,
  },
  lockedDesc: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
  },
  upgradeBtnText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: '#FFF',
  },
})
