import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const ACCENT_COLORS = {
  checkin: '#34D399',
  commitment: '#3B82F6',
  missed: '#F87171',
  nudge: '#FBBF24',
  milestone: '#8B5CF6',
  joined: '#38BDF8',
}

const MILESTONE_THRESHOLDS = [7, 14, 30, 50, 100]

function timeAgo(timestamp) {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function Avatar({ name, size = 36, colors }) {
  const initials = (name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.bgTer,
    }]}>
      <Text style={[styles.avatarText, { color: colors.text, fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  )
}

function FeedCard({ item, colors, card, gymId, member }) {
  const [nudging, setNudging] = useState(false)
  const [clapped, setClapped] = useState(false)
  const accentColor = ACCENT_COLORS[item.type] || colors.accent

  const sendNudge = async () => {
    if (nudging) return
    setNudging(true)
    try {
      await api.post(`/gyms/${gymId}/pods/${item.pod_id || item.podId}/nudge`, {
        toMemberId: item.member_id || item.data?.member_id,
      })
    } catch (e) {
      console.warn('[PodFeed] nudge failed:', e?.message)
    } finally {
      setNudging(false)
    }
  }

  const handleClap = () => setClapped(true)

  const renderContent = () => {
    switch (item.type) {
      case 'checkin': {
        const isAutoGym = item.data?.method === 'auto_gym'
        return (
          <View style={styles.cardBody}>
            <View style={styles.cardRow}>
              <Avatar name={item.member_name} colors={colors} />
              <View style={styles.cardTextWrap}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  <Text style={styles.boldName}>{item.member_name}</Text> checked in
                </Text>
                {isAutoGym && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
                    <Feather name="wifi" size={10} color={ACCENT_COLORS.checkin} />
                    <Text style={[styles.badgeText, { color: ACCENT_COLORS.checkin }]}>
                      Auto-verified at gym
                    </Text>
                  </View>
                )}
                <Text style={[styles.timeText, { color: colors.textTer }]}>
                  {timeAgo(item.timestamp)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.clapBtn, clapped && { opacity: 0.5 }]}
              onPress={handleClap}
              disabled={clapped}
              activeOpacity={0.7}
            >
              <Feather
                name="thumbs-up"
                size={16}
                color={clapped ? ACCENT_COLORS.checkin : colors.textSec}
              />
            </TouchableOpacity>
          </View>
        )
      }

      case 'commitment':
        return (
          <View style={styles.cardRow}>
            <Avatar name={item.member_name} colors={colors} />
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                <Text style={styles.boldName}>{item.member_name}</Text>
                {' committed: '}
                <Text style={{ color: colors.textSec }}>
                  {item.data?.commitment_text || 'something great'}
                </Text>
              </Text>
              <Text style={[styles.timeText, { color: colors.textTer }]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
          </View>
        )

      case 'missed':
        return (
          <View style={styles.cardBody}>
            <View style={styles.cardRow}>
              <Avatar name={item.member_name} colors={colors} />
              <View style={styles.cardTextWrap}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  <Text style={styles.boldName}>{item.member_name}</Text>
                  {' missed today\'s commitment'}
                </Text>
                <Text style={[styles.timeText, { color: colors.textTer }]}>
                  {timeAgo(item.timestamp)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.nudgeBtn, { backgroundColor: 'rgba(251,191,36,0.12)' }]}
              onPress={sendNudge}
              disabled={nudging}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={14} color={ACCENT_COLORS.nudge} />
              <Text style={[styles.nudgeBtnText, { color: ACCENT_COLORS.nudge }]}>
                {nudging ? 'Sending...' : 'Send a nudge'}
              </Text>
            </TouchableOpacity>
          </View>
        )

      case 'nudge':
        return (
          <View style={styles.cardRow}>
            <Avatar name={item.member_name} colors={colors} />
            <View style={styles.cardTextWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="bell" size={13} color={ACCENT_COLORS.nudge} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  <Text style={styles.boldName}>{item.member_name}</Text>
                  {' nudged '}
                  <Text style={styles.boldName}>{item.data?.target_name || 'someone'}</Text>
                </Text>
              </View>
              <Text style={[styles.timeText, { color: colors.textTer }]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
          </View>
        )

      case 'milestone': {
        const days = item.data?.streak_days || 7
        return (
          <View style={styles.cardRow}>
            <View style={[styles.milestoneIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <Feather name="award" size={22} color={ACCENT_COLORS.milestone} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text, fontSize: 15 }]}>
                <Text style={styles.boldName}>{item.member_name}</Text>
                {` hit a ${days}-day streak!`}
              </Text>
              <Text style={[styles.timeText, { color: colors.textTer }]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
          </View>
        )
      }

      case 'joined':
        return (
          <View style={styles.cardRow}>
            <View style={[styles.joinedIcon, { backgroundColor: 'rgba(56,189,248,0.12)' }]}>
              <Feather name="users" size={18} color={ACCENT_COLORS.joined} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                <Text style={styles.boldName}>{item.member_name}</Text>
                {' joined the pod'}
              </Text>
              <Text style={[styles.timeText, { color: colors.textTer }]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
          </View>
        )

      default:
        return (
          <View style={styles.cardRow}>
            <Avatar name={item.member_name} colors={colors} />
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.member_name} — {item.type}
              </Text>
              <Text style={[styles.timeText, { color: colors.textTer }]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
          </View>
        )
    }
  }

  const isMilestone = item.type === 'milestone'

  return (
    <View style={[
      styles.feedCard,
      card,
      { borderTopWidth: 3, borderTopColor: accentColor },
      isMilestone && styles.feedCardLarge,
    ]}>
      {renderContent()}
    </View>
  )
}

export default function PodFeedScreen({ navigation, route }) {
  const { podId, podName } = route.params
  const { colors, card } = useTheme()
  const { gymId, member } = useAuth()

  const [feed, setFeed] = useState([])
  const [healthScore, setHealthScore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasCommittedToday, setHasCommittedToday] = useState(true)

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get(`/gyms/${gymId}/pods/${podId}/feed`, {
        params: { limit: 30 },
      })
      const items = res.data?.feed || res.data || []
      setFeed(items)

      // Check if current member committed today
      const today = new Date().toISOString().slice(0, 10)
      const memberId = member?.id || member?.member_id
      const committed = items.some(
        i => (i.type === 'commitment' || i.type === 'checkin')
          && (i.member_id === memberId || i.data?.member_id === memberId)
          && i.timestamp?.startsWith(today)
      )
      setHasCommittedToday(committed)

      // Optionally fetch health score
      if (res.data?.health_score !== undefined) {
        setHealthScore(res.data.health_score)
      }
    } catch (e) {
      console.warn('[PodFeed] fetch failed:', e?.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, podId, member])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  const onRefresh = () => {
    setRefreshing(true)
    fetchFeed(true)
  }

  const renderItem = useCallback(({ item }) => (
    <FeedCard item={item} colors={colors} card={card} gymId={gymId} member={member} />
  ), [colors, card, gymId, member])

  const keyExtractor = useCallback(
    (item, index) => item.id || `${item.type}-${item.timestamp}-${index}`,
    []
  )

  const renderEmpty = () => {
    if (loading) return null
    return (
      <View style={styles.emptyWrap}>
        <Feather name="clock" size={48} color={colors.textTer} />
        <Text style={[styles.emptyTitle, { color: colors.textSec }]}>
          No activity yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTer }]}>
          Commit to something today to get started
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {podName || 'Pod'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSec }]}>Feed</Text>
        </View>

        {healthScore !== null && (
          <View style={[styles.healthBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.healthBadgeText}>{healthScore}</Text>
          </View>
        )}
      </View>

      {/* Feed List */}
      {loading && feed.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={feed}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            !hasCommittedToday && { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      {/* Bottom CTA */}
      {!hasCommittedToday && !loading && (
        <View style={[styles.bottomBar, { backgroundColor: colors.bgSec, borderTopColor: colors.border }]}>
          <Text style={[styles.bottomText, { color: colors.textSec }]}>
            You haven't committed today
          </Text>
          <TouchableOpacity
            style={[styles.commitBtn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('DailyCommit', { podId })}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={16} color="#FFF" />
            <Text style={styles.commitBtnText}>Commit Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  headerSub: {
    fontFamily: FONT.medium,
    fontSize: 13,
    marginTop: 1,
  },
  healthBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  healthBadgeText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: '#FFF',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm + 4,
  },
  feedCard: {
    padding: SPACING.md,
    overflow: 'hidden',
  },
  feedCardLarge: {
    paddingVertical: SPACING.md + 4,
  },
  cardBody: {
    gap: SPACING.sm + 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm + 4,
  },
  cardTextWrap: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  boldName: {
    fontFamily: FONT.semibold,
  },
  timeText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: {
    fontFamily: FONT.semibold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginTop: 2,
  },
  badgeText: {
    fontFamily: FONT.medium,
    fontSize: 11,
  },
  clapBtn: {
    alignSelf: 'flex-end',
    padding: 6,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    marginLeft: 48,
  },
  nudgeBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 13,
  },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  joinedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontFamily: FONT.semibold,
    fontSize: 17,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg + 8,
    borderTopWidth: 1,
  },
  bottomText: {
    fontFamily: FONT.medium,
    fontSize: 13,
    flex: 1,
  },
  commitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  commitBtnText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: '#FFF',
  },
})
