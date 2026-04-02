import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Haptics from '../lib/haptics'
import api from '../lib/api'

export default function CirclesScreen({ navigation }) {
  const { colors } = useTheme()
  const { member, gymId } = useAuth()

  const [myCircle, setMyCircle]       = useState(null)
  const [activity, setActivity]       = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [allCircles, setAllCircles]   = useState([])
  const [refreshing, setRefreshing]   = useState(false)
  const [activeTab, setActiveTab]     = useState('feed') // feed | leaderboard | discover

  const fetchData = useCallback(async () => {
    if (!gymId || !member?.id) return
    try {
      const [podRes, actRes, lbRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${member.id}/pods`).catch(() => ({ data: [] })),
        api.get(`/gyms/${gymId}/members/${member.id}/pods/activity`).catch(() => ({ data: [] })),
        api.get(`/gyms/${gymId}/pods/leaderboard`).catch(() => ({ data: [] })),
      ])
      const pods = Array.isArray(podRes.data) ? podRes.data : podRes.data?.pods || []
      setMyCircle(pods[0] || null)
      setAllCircles(pods)
      setActivity(Array.isArray(actRes.data) ? actRes.data : [])
      setLeaderboard(Array.isArray(lbRes.data) ? lbRes.data : [])
    } catch {}
  }, [gymId, member?.id])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

  const tabs = [
    { id: 'feed',        label: 'Feed',        icon: 'activity' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'bar-chart-2' },
    { id: 'discover',    label: 'Discover',    icon: 'compass' },
  ]

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Circles</Text>
          <Text style={[s.sub, { color: colors.textTer }]}>Your accountability network</Text>
        </View>
        <TouchableOpacity
          style={[s.uploadBtn, { backgroundColor: COLORS.accent }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('WorkoutAnalyzer') }}
          activeOpacity={0.85}
        >
          <Feather name="video" size={14} color="#07080F" />
          <Text style={s.uploadBtnText}>Prove my set</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabItem, activeTab === t.id && s.tabItemActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t.id) }}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, { color: activeTab === t.id ? COLORS.accent : colors.textTer }]}>{t.label}</Text>
            {activeTab === t.id && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />}
      >

        {/* My Circle card — always visible */}
        {myCircle && (
          <MyCircleCard circle={myCircle} colors={colors} navigation={navigation} member={member} />
        )}

        {activeTab === 'feed' && (
          <FeedTab activity={activity} colors={colors} navigation={navigation} member={member} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} colors={colors} memberId={member?.id} />
        )}

        {activeTab === 'discover' && (
          <DiscoverTab allCircles={allCircles} colors={colors} gymId={gymId} memberId={member?.id} onJoin={fetchData} />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── My Circle card ──────────────────────────────────────────
function MyCircleCard({ circle, colors, navigation, member }) {
  const members = circle.members || []
  const weeklyGoal = circle.weekly_goal || 5
  const weeklyDone = circle.weekly_done || 0
  const progress = Math.min(weeklyDone / weeklyGoal, 1)
  const formAvg = circle.form_avg || circle.avg_score || 0

  return (
    <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: COLORS.accent + '30', borderTopWidth: 2, borderTopColor: COLORS.accent }]}>
      <View style={s.circleHeaderRow}>
        <View>
          <Text style={[s.circleName, { color: colors.text }]}>{circle.name || 'My Circle'}</Text>
          <Text style={[s.circleMeta, { color: colors.textSec }]}>{members.length} members</Text>
        </View>
        {circle.city_rank && (
          <View style={s.rankBadge}>
            <Text style={s.rankText}>#{circle.city_rank} City</Text>
          </View>
        )}
      </View>

      {/* Member avatars */}
      {members.length > 0 && (
        <View style={s.avatarRow}>
          {members.slice(0, 6).map((m, i) => (
            <View
              key={i}
              style={[s.memberAvatar, { backgroundColor: COLORS.accentSoft, borderColor: m.active_today ? COLORS.accent : 'transparent' }]}
            >
              <Text style={[s.memberInitial, { color: COLORS.accent }]}>
                {(m.name || m.member_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
          {members.length > 6 && (
            <View style={[s.memberAvatar, { backgroundColor: colors.bgHover }]}>
              <Text style={[s.memberInitial, { color: colors.textTer }]}>+{members.length - 6}</Text>
            </View>
          )}
        </View>
      )}

      {/* Progress bars */}
      <View style={s.progressSection}>
        <ProgressRow label="Weekly goal" value={`${weeklyDone}/${weeklyGoal}`} progress={progress} color={COLORS.accent} colors={colors} />
        {formAvg > 0 && (
          <ProgressRow label="Avg form score" value={formAvg.toString()} progress={formAvg / 100} color={COLORS.purple} colors={colors} />
        )}
      </View>

      {/* Actions */}
      <View style={[s.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.primaryActionBtn} onPress={() => navigation.navigate('WorkoutAnalyzer')} activeOpacity={0.85}>
          <Feather name="video" size={14} color="#07080F" />
          <Text style={s.primaryActionText}>Prove a set</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.ghostActionBtn, { borderColor: colors.borderStrong }]} onPress={() => navigation.navigate('PodStats', { podId: circle.id })} activeOpacity={0.7}>
          <Text style={[s.ghostActionText, { color: colors.textSec }]}>Circle stats</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Feed tab ────────────────────────────────────────────────
function FeedTab({ activity, colors, navigation, member }) {
  if (activity.length === 0) {
    return (
      <View style={s.emptyState}>
        <View style={[s.emptyIcon, { backgroundColor: COLORS.accentSoft }]}>
          <Feather name="activity" size={28} color={COLORS.accent} />
        </View>
        <Text style={[s.emptyTitle, { color: colors.text }]}>No activity yet today</Text>
        <Text style={[s.emptySub, { color: colors.textSec }]}>Be the first to post a verified set to your Circle</Text>
        <TouchableOpacity style={s.primaryActionBtn} onPress={() => navigation.navigate('WorkoutAnalyzer')} activeOpacity={0.85}>
          <Feather name="video" size={14} color="#07080F" />
          <Text style={s.primaryActionText}>Upload my workout</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View>
      {activity.map((item, i) => {
        const isSelf = item.member_id === member?.id
        const score = item.form_score || item.ai_score
        return (
          <View key={i} style={[s.activityItem, { backgroundColor: colors.bgTer, borderColor: isSelf ? COLORS.accent + '30' : colors.border }]}>
            <View style={[s.activityAvatar, { backgroundColor: isSelf ? COLORS.accentSoft : COLORS.purpleSoft }]}>
              <Text style={[s.activityInitial, { color: isSelf ? COLORS.accent : COLORS.purple }]}>
                {(item.member_name || item.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.activityName, { color: colors.text }]}>
                  {isSelf ? 'You' : item.member_name || item.name}
                </Text>
                {item.ai_verified && (
                  <View style={s.verifiedBadge}><Text style={s.verifiedText}>AI Verified</Text></View>
                )}
              </View>
              <Text style={[s.activityMeta, { color: colors.textSec }]}>
                {[item.exercise || item.workout_type, item.reps && `${item.reps} reps`, item.duration_min && `${item.duration_min} min`].filter(Boolean).join(' · ')}
              </Text>
              {item.created_at && (
                <Text style={[s.activityTime, { color: colors.textTer }]}>{formatRelativeTime(item.created_at)}</Text>
              )}
            </View>
            {score > 0 && (
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.activityScore, { color: score >= 80 ? COLORS.accent : score >= 60 ? COLORS.warn : COLORS.danger }]}>
                  {score}
                </Text>
                <Text style={[s.activityScoreLabel, { color: colors.textTer }]}>score</Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ─── Leaderboard tab ─────────────────────────────────────────
function LeaderboardTab({ leaderboard, colors, memberId }) {
  const medals = ['🥇', '🥈', '🥉']

  if (leaderboard.length === 0) {
    return (
      <View style={s.emptyState}>
        <Feather name="bar-chart-2" size={28} color={colors.textTer} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>Leaderboard loading...</Text>
      </View>
    )
  }

  return (
    <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: colors.borderStrong }]}>
      <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 14 }]}>Circle Leaderboard</Text>
      {leaderboard.map((item, i) => {
        const isSelf = item.member_id === memberId
        return (
          <View key={i} style={[s.lbRow, i === leaderboard.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }, isSelf && { backgroundColor: COLORS.accentSoft, borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 }]}>
            <Text style={s.lbRank}>{i < 3 ? medals[i] : `${i + 1}`}</Text>
            <View style={[s.lbAvatar, { backgroundColor: isSelf ? COLORS.accentSoft : colors.bgHover }]}>
              <Text style={[s.lbInitial, { color: isSelf ? COLORS.accent : colors.textSec }]}>
                {(item.name || item.member_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[s.lbName, { color: colors.text, fontFamily: isSelf ? FONT.bold : FONT.regular }]}>
              {isSelf ? 'You' : item.name || item.member_name}
            </Text>
            <Text style={[s.lbPoints, { color: isSelf ? COLORS.accent : colors.text }]}>
              {item.points || item.total_points || 0} pts
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Discover tab ────────────────────────────────────────────
function DiscoverTab({ allCircles, colors, gymId, memberId, onJoin }) {
  const [joining, setJoining] = useState(null)

  const join = async (podId) => {
    setJoining(podId)
    try {
      await api.post(`/gyms/${gymId}/pods/${podId}/join`, { member_id: memberId })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onJoin()
    } catch {}
    setJoining(null)
  }

  return (
    <View>
      <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Join a Circle</Text>
      {allCircles.filter(c => !c.is_member).map((circle, i) => (
        <View key={i} style={[s.discoverCard, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.circleName, { color: colors.text }]}>{circle.name}</Text>
            <Text style={[s.circleMeta, { color: colors.textSec }]}>{circle.member_count || 0} members · {circle.city || 'Local'}</Text>
          </View>
          <TouchableOpacity
            style={[s.joinBtn, { backgroundColor: joining === circle.id ? colors.bgHover : COLORS.accentSoft, borderColor: COLORS.accent + '40' }]}
            onPress={() => join(circle.id)}
            disabled={!!joining}
            activeOpacity={0.7}
          >
            <Text style={[s.joinBtnText, { color: COLORS.accent }]}>{joining === circle.id ? '...' : 'Join'}</Text>
          </TouchableOpacity>
        </View>
      ))}
      {allCircles.filter(c => !c.is_member).length === 0 && (
        <View style={s.emptyState}>
          <Text style={[s.emptyTitle, { color: colors.text }]}>You're in all available Circles!</Text>
        </View>
      )}
    </View>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
function ProgressRow({ label, value, progress, color, colors }) {
  return (
    <View style={s.progressRow}>
      <Text style={[s.progressLabel, { color: colors.textSec }]}>{label}</Text>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.progressValue, { color }]}>{value}</Text>
    </View>
  )
}

function formatRelativeTime(iso) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
    return `${Math.floor(diff / 86400)} days ago`
  } catch { return '' }
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 26, fontFamily: FONT.extraBold, letterSpacing: -0.8 },
  sub: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.full },
  uploadBtnText: { fontSize: 13, fontFamily: FONT.bold, color: '#07080F' },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5, paddingHorizontal: SPACING.lg },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabItemActive: {},
  tabLabel: { fontSize: 13, fontFamily: FONT.semibold },
  tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, backgroundColor: COLORS.accent, borderRadius: 1 },

  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  // Card
  card: { borderRadius: RADIUS.xl, borderWidth: 0.5, padding: 18, marginBottom: SPACING.md },

  // My Circle
  circleHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  circleName: { fontSize: 17, fontFamily: FONT.bold, letterSpacing: -0.3 },
  circleMeta: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  rankBadge: { backgroundColor: COLORS.purpleSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  rankText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.purple },
  avatarRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  memberInitial: { fontSize: 13, fontFamily: FONT.bold },
  progressSection: { gap: 8, marginBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabel: { fontSize: 12, fontFamily: FONT.medium, width: 110 },
  progressTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressValue: { fontSize: 12, fontFamily: FONT.bold, minWidth: 32, textAlign: 'right' },

  // Actions
  cardActions: { flexDirection: 'row', gap: 10, paddingTop: 14, borderTopWidth: 0.5 },
  primaryActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.accent, paddingVertical: 10, borderRadius: 12 },
  primaryActionText: { fontSize: 13, fontFamily: FONT.bold, color: '#07080F' },
  ghostActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 0.5 },
  ghostActionText: { fontSize: 13, fontFamily: FONT.semibold },

  // Activity feed
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.lg, borderWidth: 0.5, marginBottom: 10 },
  activityAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityInitial: { fontSize: 15, fontFamily: FONT.bold },
  activityName: { fontSize: 14, fontFamily: FONT.semibold },
  activityMeta: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  activityTime: { fontSize: 11, fontFamily: FONT.regular, marginTop: 2 },
  activityScore: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  activityScoreLabel: { fontSize: 10, fontFamily: FONT.medium, textAlign: 'center' },
  verifiedBadge: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  verifiedText: { fontSize: 9, fontFamily: FONT.bold, color: COLORS.accent, letterSpacing: 0.5 },

  // Leaderboard
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, letterSpacing: -0.3 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.07)' },
  lbRank: { fontSize: 16, minWidth: 28, textAlign: 'center' },
  lbAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lbInitial: { fontSize: 12, fontFamily: FONT.bold },
  lbName: { flex: 1, fontSize: 14, fontFamily: FONT.regular },
  lbPoints: { fontSize: 15, fontFamily: 'Inter_700Bold' },

  // Discover
  discoverCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: RADIUS.lg, borderWidth: 0.5, marginBottom: 10 },
  joinBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 0.5 },
  joinBtnText: { fontSize: 13, fontFamily: FONT.bold },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontFamily: FONT.bold },
  emptySub: { fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20 },
})
