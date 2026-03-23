import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Haptics from '../lib/haptics'

const { width } = Dimensions.get('window')

const TABS = ['Gym', 'City', 'Global']
const PODIUM_COLORS = { 0: '#FFD700', 1: '#C0C0C0', 2: '#CD7F32' }

const DEMO_CURRENT_USER_ID = 'demo-001'

function generateLeaderboard() {
  const names = [
    'Arjun Mehta', 'Priya Sharma', 'Vikram Patel', 'Ananya Reddy',
    'Rohan Gupta', 'Sneha Iyer', 'Karthik Nair', 'Divya Joshi',
    'Aditya Kumar', 'Meera Desai', 'Rahul Verma', 'Pooja Singh',
    'Nikhil Rao', 'Swati Kulkarni', 'Amit Choudhary',
  ]
  return names.map((name, i) => ({
    id: i === 0 ? DEMO_CURRENT_USER_ID : `user-${i}`,
    name,
    initials: name.split(' ').map((n) => n[0]).join(''),
    steps: Math.max(8000, Math.floor(25000 - i * 1200 + Math.random() * 800)),
    streak: Math.max(1, Math.floor(30 - i * 1.8 + Math.random() * 3)),
    rank: i + 1,
  }))
}

function PodiumCard({ entry, position }) {
  const { colors } = useTheme()
  const color = PODIUM_COLORS[position]
  const isFirst = position === 0
  const size = isFirst ? 64 : 52
  const marginTop = isFirst ? 0 : 20

  return (
    <View style={[styles.podiumItem, { marginTop }]}>
      <View style={[styles.podiumAvatar, { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: colors.bgSec }]}>
        <Text style={[styles.podiumInitials, { fontSize: isFirst ? 20 : 16, color: colors.text }]}>{entry.initials}</Text>
      </View>
      <View style={[styles.podiumRankBadge, { backgroundColor: color }]}>
        <Text style={styles.podiumRankText}>{entry.rank}</Text>
      </View>
      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{entry.name.split(' ')[0]}</Text>
      <Text style={[styles.podiumSteps, { color: colors.textSec }]}>{(entry.steps / 1000).toFixed(1)}K</Text>
    </View>
  )
}

function StatCard({ label, value, icon }) {
  const { colors, isDark } = useTheme()
  return (
    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : colors.bgSec, borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border }]}>
      <Feather name={icon} size={18} color={COLORS.accent} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTer }]}>{label}</Text>
    </View>
  )
}

function LeaderboardRow({ item, isCurrentUser }) {
  const { colors, isDark } = useTheme()
  return (
    <View style={[styles.leaderRow, { backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : colors.bgSec, borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border }, isCurrentUser && styles.leaderRowHighlight]}>
      <Text style={[styles.leaderRank, { color: colors.textSec }, item.rank <= 3 && { color: PODIUM_COLORS[item.rank - 1] }]}>
        {item.rank}
      </Text>
      <View style={[styles.leaderAvatar, { backgroundColor: colors.bgTer }]}>
        <Text style={[styles.leaderInitials, { color: colors.text }]}>{item.initials}</Text>
      </View>
      <View style={styles.leaderInfo}>
        <Text style={[styles.leaderName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
          {isCurrentUser && <Text style={styles.youTag}> (You)</Text>}
        </Text>
        <View style={styles.leaderMeta}>
          <Feather name="zap" size={12} color={COLORS.amber} />
          <Text style={[styles.leaderStreak, { color: colors.textTer }]}>{item.streak}d streak</Text>
        </View>
      </View>
      <Text style={[styles.leaderSteps, { color: colors.text }]}>{item.steps.toLocaleString('en-IN')}</Text>
    </View>
  )
}

export default function CommunityScreen({ embedded = false }) {
  const { member } = useAuth()
  const { colors, isDark } = useTheme()
  const [tab, setTab] = useState('Gym')
  const [data, setData] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const isElite = member?.subscription_tier === 'elite' || member?.plan_name?.toLowerCase().includes('pro') || false
  const currentUserId = member?.id || DEMO_CURRENT_USER_ID

  useEffect(() => {
    setData(generateLeaderboard())
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Simulate refresh
    await new Promise((r) => setTimeout(r, 800))
    setData(generateLeaderboard())
    setRefreshing(false)
  }, [])

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)

  const currentUser = data.find((d) => d.id === currentUserId)

  const renderHeader = () => (
    <View>
      {/* Tab toggle */}
      <View style={[styles.tabRow, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        {TABS.map((t) => {
          const locked = (t === 'City' || t === 'Global') && !isElite
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => {
                if (locked) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                  Alert.alert(
                    'Elite Feature',
                    'Upgrade to Elite to see your City & State ranking and compete beyond your gym.',
                    [{ text: 'OK' }]
                  )
                  return
                }
                setTab(t)
                Haptics.selectionAsync()
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: colors.textTer }, tab === t && { color: '#FFFFFF' }]}>{t}</Text>
              {locked && <Feather name="lock" size={12} color={colors.textTer} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Podium */}
      {top3.length >= 3 && (
        <View style={styles.podiumRow}>
          <PodiumCard entry={top3[1]} position={1} />
          <PodiumCard entry={top3[0]} position={0} />
          <PodiumCard entry={top3[2]} position={2} />
        </View>
      )}

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard label="Your Rank" value={currentUser ? `#${currentUser.rank}` : '--'} icon="award" />
        <StatCard label="Total Steps" value={currentUser ? `${(currentUser.steps / 1000).toFixed(1)}K` : '--'} icon="activity" />
        <StatCard label="Streak" value={currentUser ? `${currentUser.streak}d` : '--'} icon="zap" />
      </View>

      {/* List header */}
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderText, { color: colors.textSec }]}>Leaderboard</Text>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, embedded && { paddingTop: 0 }]}>
      {/* Header — hidden when embedded in CommunityHubScreen */}
      {!embedded && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
          <View style={[styles.tierBadge, { backgroundColor: colors.bgSec, borderColor: colors.border }, isElite && styles.tierBadgeElite]}>
            <Feather name={isElite ? 'star' : 'user'} size={12} color={isElite ? '#FFD700' : colors.textSec} />
            <Text style={[styles.tierText, { color: colors.textSec }, isElite && styles.tierTextElite]}>
              {isElite ? 'Elite' : 'Standard'}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={rest}
        renderItem={({ item }) => (
          <LeaderboardRow item={item} isCurrentUser={item.id === currentUserId} />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
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
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  tierBadgeElite: {
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tierTextElite: {
    color: '#FFD700',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: 4,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.xl - 4,
  },
  tabBtnActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  podiumItem: {
    alignItems: 'center',
    width: (width - SPACING.md * 2 - SPACING.lg * 2) / 3,
  },
  podiumAvatar: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumInitials: {
    fontWeight: '800',
  },
  podiumRankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  podiumRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  podiumSteps: {
    fontSize: 12,
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingBottom: 128,
  },
  listHeader: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Leaderboard row
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: SPACING.md,
  },
  leaderRowHighlight: {
    borderColor: 'rgba(0,82,255,0.4)',
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  leaderRank: {
    width: 28,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  leaderInitials: {
    fontSize: 14,
    fontWeight: '700',
  },
  leaderInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '600',
  },
  youTag: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  leaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  leaderStreak: {
    fontSize: 12,
  },
  leaderSteps: {
    fontSize: 15,
    fontWeight: '700',
  },
})
