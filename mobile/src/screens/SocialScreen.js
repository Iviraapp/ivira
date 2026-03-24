import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const LEADERBOARD_TABS = ['Consistency', 'Strength', 'Points']

function AvatarBubble({ name, size = 48 }) {
  const { colors } = useTheme()
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4, color: '#FFFFFF' }]}>{initial}</Text>
    </View>
  )
}

function LiveMemberCard({ member }) {
  const { colors } = useTheme()
  return (
    <View style={styles.liveMember}>
      <AvatarBubble name={member?.name} size={48} />
      <Text style={[styles.liveMemberName, { color: colors.text }]} numberOfLines={1}>
        {member?.name?.split(' ')?.[0]}
      </Text>
      <TouchableOpacity
        style={[styles.spotButton, { backgroundColor: colors.accentSoft }]}
        onPress={() => Alert.alert('Spot Request', 'Spot request sent!')}
      >
        <Text style={styles.spotButtonText}>Request Spot</Text>
      </TouchableOpacity>
    </View>
  )
}

function LeaderboardRow({ item, isTopThree }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.leaderboardRow, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <View style={[
        styles.rankBadge,
        isTopThree ? styles.rankBadgeTop : { backgroundColor: colors.bgTer },
      ]}>
        <Text style={[
          styles.rankText,
          isTopThree ? { color: '#FFFFFF', fontSize: 14 } : { color: colors.textTer, fontSize: 13 },
        ]}>
          {item.rank}
        </Text>
      </View>
      <AvatarBubble name={item.name} size={36} />
      <Text style={[styles.leaderName, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.leaderValue, { color: colors.textSec }]}>{item.value}</Text>
    </View>
  )
}

function FeedCard({ item, onToggleLike }) {
  const { colors } = useTheme()
  const timeAgo = getTimeAgo(item.timestamp)

  return (
    <View style={[styles.feedCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <Text style={[styles.feedTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.feedBody, { color: colors.textSec }]}>{item.body}</Text>
      <View style={styles.feedFooter}>
        <Text style={[styles.feedTime, { color: colors.textTer }]}>{timeAgo}</Text>
        <View style={styles.feedActions}>
          <TouchableOpacity
            style={styles.feedAction}
            onPress={() => onToggleLike(item.id)}
          >
            <Text style={[styles.feedActionIcon, { color: colors.textSec }]}>
              {item.liked ? '\u2665' : '\u2661'}
            </Text>
            <Text style={[styles.feedActionText, { color: colors.textSec }]}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.feedAction}
            onPress={() => Alert.alert('Share', 'Sharing coming soon!')}
          >
            <Text style={[styles.feedActionIcon, { color: colors.textSec }]}>{'\u21AA'}</Text>
            <Text style={[styles.feedActionText, { color: colors.textSec }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function getTimeAgo(timestamp) {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now - then
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  return 'Just now'
}

export default function SocialScreen() {
  const { gymId, member } = useAuth()
  const { colors } = useTheme()

  const [liveMembers, setLiveMembers] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [feed, setFeed] = useState([])
  const [activeTab, setActiveTab] = useState('Consistency')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!gymId) return

    try {
      const [liveRes, leaderRes, feedRes] = await Promise.allSettled([
        api.get(`/gyms/${gymId}/checkins/live`),
        api.get(`/gyms/${gymId}/leaderboard?type=${activeTab.toLowerCase()}`),
        api.get(`/gyms/${gymId}/feed`),
      ])

      setLiveMembers(
        liveRes.status === 'fulfilled'
          ? liveRes.value.data?.members || liveRes.value.data || []
          : []
      )
      setLeaderboard(
        leaderRes.status === 'fulfilled'
          ? leaderRes.value.data?.leaderboard || leaderRes.value.data || []
          : []
      )
      setFeed(
        feedRes.status === 'fulfilled'
          ? (feedRes.value.data?.feed || feedRes.value.data || []).map(f => ({ ...f }))
          : []
      )
    } catch {
      setLiveMembers([])
      setLeaderboard([])
      setFeed([])
    } finally {
      setLoading(false)
    }
  }, [gymId, activeTab])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }, [fetchAll])

  const fetchLeaderboard = useCallback(async (tab) => {
    if (!gymId) return
    try {
      const res = await api.get(`/gyms/${gymId}/leaderboard?type=${tab.toLowerCase()}`)
      setLeaderboard(res.data?.leaderboard || res.data || [])
    } catch {
      setLeaderboard([])
    }
  }, [gymId])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    fetchLeaderboard(tab)
  }, [fetchLeaderboard])

  const toggleLike = useCallback((id) => {
    setFeed(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          liked: !item.liked,
          likes: item.liked ? item.likes - 1 : item.likes + 1,
        }
      }
      return item
    }))
  }, [])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textSec}
        />
      }
    >
      {/* Section A: Who's In Right Now */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Who's In Right Now</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textTer }]}>Members who opted in to visibility</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.liveScroll}
        >
          {liveMembers.map((m) => (
            <LiveMemberCard key={m.id} member={m} />
          ))}
          {liveMembers.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textTer }]}>No one checked in right now</Text>
          )}
        </ScrollView>
      </View>

      {/* Section B: Rankings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Rankings</Text>
        <View style={styles.tabRow}>
          {LEADERBOARD_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, { backgroundColor: colors.bgTer }, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[styles.tabText, { color: colors.textSec }, activeTab === tab && { color: '#FFFFFF' }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.leaderboardList}>
          {leaderboard.map((item) => (
            <LeaderboardRow key={item.rank} item={item} isTopThree={item.rank <= 3} />
          ))}
        </View>
        {/* Own rank sticky card */}
        <View style={[styles.ownRankCard, { backgroundColor: colors.bgSec }]}>
          <Text style={[styles.ownRankLabel, { color: colors.textTer }]}>Your Rank</Text>
          <View style={styles.ownRankRow}>
            <AvatarBubble name={member?.name} size={32} />
            <Text style={[styles.ownRankName, { color: colors.text }]}>{member?.name || 'You'}</Text>
            <View style={[styles.ownRankBadge, { backgroundColor: colors.accentSoft }]}>
              <Text style={styles.ownRankNumber}>#8</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section C: Gym Feed */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gym Feed</Text>
        {feed.map((item) => (
          <FeedCard key={item.id} item={item} onToggleLike={toggleLike} />
        ))}
        {feed.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTer }]}>No announcements yet</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sections
  section: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: SPACING.md,
  },

  // Live members
  liveScroll: {
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  liveMember: {
    alignItems: 'center',
    width: 72,
  },
  avatar: {
    backgroundColor: '#0052FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  liveMemberName: {
    fontSize: 12,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  spotButton: {
    marginTop: SPACING.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  spotButtonText: {
    fontSize: 9,
    color: '#0052FF',
    fontWeight: '600',
  },

  // Leaderboard tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  tabActive: {
    backgroundColor: '#0052FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Leaderboard rows
  leaderboardList: {
    gap: SPACING.sm,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeTop: {
    backgroundColor: '#0052FF',
  },
  rankText: {
    fontWeight: '700',
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  leaderValue: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Own rank card
  ownRankCard: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#0052FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  ownRankLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  ownRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ownRankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  ownRankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  ownRankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0052FF',
  },

  // Feed
  feedCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  feedBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  feedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedTime: {
    fontSize: 12,
  },
  feedActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  feedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedActionIcon: {
    fontSize: 16,
  },
  feedActionText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
})
