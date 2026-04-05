import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Animated, Share, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, SPACING, RADIUS, SHADOW, CARD, FEATURE } from '../lib/theme'
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetchError, setFetchError]   = useState(false)
  const [activeTab, setActiveTab]     = useState('feed') // feed | leaderboard | discover
  const [todayCommit, setTodayCommit] = useState(null)

  const fetchData = useCallback(async () => {
    setFetchError(false)
    try {
      if (gymId && member?.id) {
        const [podRes, actRes, lbRes] = await Promise.all([
          api.get(`/gyms/${gymId}/members/${member.id}/pods`).catch(() => ({ data: [] })),
          api.get(`/gyms/${gymId}/members/${member.id}/pods/activity`).catch(() => ({ data: [] })),
          api.get(`/gyms/${gymId}/pods/leaderboard`).catch(() => ({ data: [] })),
        ])
        const pods = Array.isArray(podRes.data) ? podRes.data : podRes.data?.pods || []
        setMyCircle(pods[0] || null)
        setAllCircles(pods)
        if (pods[0]?.id && gymId) {
          const commitRes = await api.get(
            `/gyms/${gymId}/pods/${pods[0].id}/commitments`,
            { params: { date: new Date().toISOString().split('T')[0] } }
          ).catch(() => ({ data: { commitments: [] } }))
          const myCommit = (commitRes.data?.commitments || [])
            .find(c => c.member_id === member?.id)
          setTodayCommit(myCommit || null)
        }
        setActivity(Array.isArray(actRes.data) ? actRes.data : actRes.data?.activity || [])
        setLeaderboard(Array.isArray(lbRes.data) ? lbRes.data : lbRes.data?.leaderboard || [])
      } else if (member?.id) {
        const squadsRes = await api.get('/squads/mine').catch(() => ({ data: { pods: [] } }))
        const pods = squadsRes.data?.pods || []
        setMyCircle(pods[0] || null)
        setAllCircles(pods)
        setActivity([])
        setLeaderboard([])
      }
      const openRes = await api.get('/squads').catch(() => ({ data: { pods: [] } }))
      const open = openRes.data?.pods || []
      if (open.length > 0) {
        setAllCircles(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          return [...prev, ...open.filter(p => !existingIds.has(p.id))]
        })
      }
    } catch (err) {
      if (__DEV__) console.warn('[Circles] fetchData error:', err?.message)
      setFetchError(true)
    } finally {
      setInitialLoading(false)
    }
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
          style={[s.uploadBtn, { backgroundColor: colors.accent }]}
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
            <Text style={[s.tabLabel, { color: activeTab === t.id ? colors.accent : colors.textTer }]}>{t.label}</Text>
            {activeTab === t.id && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {initialLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : fetchError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg }}>
          <View style={[s.emptyIcon, { backgroundColor: COLORS.accent + '15' }]}>
            <Feather name="wifi-off" size={28} color={colors.textTer} />
          </View>
          <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: colors.text, marginTop: 12 }}>Couldn't load Circles</Text>
          <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: colors.textSec, textAlign: 'center', marginTop: 6 }}>Check your connection and try again.</Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{ marginTop: 16, backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.full }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 13, fontFamily: FONT.bold, color: '#07080F' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >

        {/* My Circle card — always visible */}
        {myCircle ? (
          <MyCircleCard circle={myCircle} colors={colors} navigation={navigation} member={member} />
        ) : (
          <NoCircleCard colors={colors} navigation={navigation} />
        )}

        {activeTab === 'feed' && (
          <FeedTab activity={activity} colors={colors} navigation={navigation} member={member} todayCommit={todayCommit} podId={myCircle?.id} gymId={gymId} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} colors={colors} memberId={member?.id} />
        )}

        {activeTab === 'discover' && (
          <DiscoverTab allCircles={allCircles} colors={colors} gymId={gymId} memberId={member?.id} onJoin={fetchData} />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ─── No Circle empty state ───────────────────────────────────
function NoCircleCard({ colors, navigation }) {
  return (
    <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: colors.border, borderTopWidth: 3, borderTopColor: FEATURE.circles }]}>
      <View style={s.emptyState}>
        <View style={[s.emptyIcon, { backgroundColor: COLORS.purpleSoft }]}>
          <Feather name="users" size={28} color={FEATURE.circles} />
        </View>
        <Text style={[s.emptyTitle, { color: colors.text }]}>No Circle yet</Text>
        <Text style={[s.emptySub, { color: colors.textSec }]}>
          Join a Circle to compete with friends and stay accountable
        </Text>
      </View>
    </View>
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
    <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: colors.border, borderTopWidth: 3, borderTopColor: FEATURE.circles }]}>
      <View style={s.circleHeaderRow}>
        <View style={{ flex: 1 }}>
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
            <View key={i} style={{ alignItems: 'center', gap: 3 }}>
              <View style={[s.memberAvatar, {
                backgroundColor: COLORS.accentSoft || COLORS.accent + '15',
                borderColor: m.active_today ? COLORS.accent : 'transparent',
                borderWidth: m.active_today ? 2 : 0,
              }]}>
                <Text style={[s.memberInitial, { color: COLORS.accent }]}>
                  {(m.name || m.member_name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              {(m.streak || m.current_streak || 0) > 0 && (
                <Text style={{ fontSize: 9, color: colors.textTer, fontFamily: FONT.bold }}>
                  🔥{m.streak || m.current_streak}
                </Text>
              )}
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
        <ProgressRow label="Weekly goal" value={`${weeklyDone}/${weeklyGoal}`} progress={progress} color={colors.accent} colors={colors} />
        {formAvg > 0 && (
          <ProgressRow label="Avg form score" value={formAvg.toString()} progress={formAvg / 100} color={COLORS.purple} colors={colors} />
        )}
      </View>

      {/* Actions */}
      <View style={[s.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.primaryActionBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('WorkoutAnalyzer')} activeOpacity={0.85}>
          <Feather name="video" size={14} color="#07080F" />
          <Text style={s.primaryActionText}>Prove a set</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.ghostActionBtn, { borderColor: colors.borderStrong }]} onPress={() => navigation.navigate('PodStats', { podId: circle.id })} activeOpacity={0.7}>
          <Text style={[s.ghostActionText, { color: colors.textSec }]}>Circle stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ghostActionBtn, { borderColor: colors.borderStrong }]}
          onPress={async () => {
            try {
              await Share.share({
                message: `Join my Circle "${circle.name}" on IVIRA! We hold each other accountable at the gym 💪\n\nDownload: https://api.ivira.app/downloads/ivira-latest.apk\nWeb: https://ivira.app/member/login`,
              })
            } catch {}
          }}
          activeOpacity={0.7}
        >
          <Feather name="user-plus" size={13} color={colors.textSec} />
          <Text style={[s.ghostActionText, { color: colors.textSec }]}>Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Feed tab ────────────────────────────────────────────────
function FeedTab({ activity, colors, navigation, member, todayCommit, podId, gymId }) {
  const [reactions, setReactions] = useState({})

  const commitPrompt = !todayCommit && podId ? (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.bgTer, borderColor: colors.accent + '40', borderTopWidth: 3, borderTopColor: COLORS.accent, marginBottom: SPACING.md }]}
      onPress={() => navigation.navigate('DailyCommit', { podId, gymId })}
      activeOpacity={0.85}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[s.emptyIcon, { width: 36, height: 36, borderRadius: 18, marginBottom: 0, backgroundColor: colors.accentSoft }]}>
          <Feather name="target" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: FONT.bold, color: colors.text }}>Commit to today's session</Text>
          <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: colors.textSec, marginTop: 2 }}>Tell your Circle what you'll crush today</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textTer} />
      </View>
    </TouchableOpacity>
  ) : todayCommit ? (
    <View style={[s.card, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '30', marginBottom: SPACING.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name="check-circle" size={16} color={colors.accent} />
        <Text style={{ fontSize: 13, fontFamily: FONT.semibold, color: colors.accent }}>
          You committed to: {todayCommit.text || todayCommit.commitment || 'Today\'s session'}
        </Text>
      </View>
    </View>
  ) : null

  if (activity.length === 0) {
    return (
      <View>
        {commitPrompt}
        <View style={s.emptyState}>
          <View style={[s.emptyIcon, { backgroundColor: colors.accentSoft }]}>
            <Feather name="activity" size={28} color={colors.accent} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No activity yet today</Text>
          <Text style={[s.emptySub, { color: colors.textSec }]}>Be the first to post a verified set to your Circle</Text>
          <TouchableOpacity style={[s.primaryActionBtn, s.emptyActionBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('WorkoutAnalyzer')} activeOpacity={0.85}>
            <Feather name="video" size={14} color="#07080F" />
            <Text style={s.primaryActionText}>Upload my workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View>
      {commitPrompt}
      {activity.map((item, i) => {
        const isSelf = item.member_id === member?.id
        const score = item.form_score || item.ai_score
        return (
          <View key={i} style={[s.activityItem, { backgroundColor: colors.bgTer, borderColor: isSelf ? colors.accent + '30' : colors.border, flexWrap: 'wrap' }]}>
            <View style={[s.activityAvatar, { backgroundColor: isSelf ? colors.accentSoft : COLORS.purpleSoft }]}>
              <Text style={[s.activityInitial, { color: isSelf ? colors.accent : COLORS.purple }]}>
                {(item.member_name || item.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[s.activityName, { color: colors.text }]}>
                  {isSelf ? 'You' : item.member_name || item.name}
                </Text>
                {item.ai_verified && (
                  <View style={[s.verifiedBadge, { backgroundColor: colors.accentSoft }]}>
                    <Text style={[s.verifiedText, { color: colors.accent }]}>AI Verified</Text>
                  </View>
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
                <Text style={[s.activityScore, { color: score >= 80 ? colors.accent : score >= 60 ? COLORS.warn : COLORS.danger }]}>
                  {score}
                </Text>
                <Text style={[s.activityScoreLabel, { color: colors.textTer }]}>score</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setReactions(prev => ({ ...prev, [i]: (prev[i] || 0) + (prev[i] ? 0 : 1) }))
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-end' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14 }}>💪</Text>
              {reactions[i] > 0 && (
                <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.bold }}>{reactions[i]}</Text>
              )}
            </TouchableOpacity>
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
        <View style={[s.emptyIcon, { backgroundColor: COLORS.purpleSoft }]}>
          <Feather name="bar-chart-2" size={28} color={COLORS.purple} />
        </View>
        <Text style={[s.emptyTitle, { color: colors.text }]}>No leaderboard data yet</Text>
        <Text style={[s.emptySub, { color: colors.textSec }]}>Check back once Circle members start logging sets</Text>
      </View>
    )
  }

  return (
    <View style={[s.card, { backgroundColor: colors.bgTer, borderColor: colors.border, borderTopWidth: 3, borderTopColor: FEATURE.circles }]}>
      <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 14 }]}>Circle Leaderboard</Text>
      {leaderboard.map((item, i) => {
        const isSelf = item.member_id === memberId
        return (
          <View key={i} style={[s.lbRow, { borderBottomColor: colors.border }, i === leaderboard.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }, isSelf && { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 }]}>
            <Text style={[s.lbRank, { color: i >= 3 ? colors.textTer : undefined }]}>{i < 3 ? medals[i] : `${i + 1}`}</Text>
            <View style={[s.lbAvatar, { backgroundColor: isSelf ? colors.accentSoft : colors.bgHover }]}>
              <Text style={[s.lbInitial, { color: isSelf ? colors.accent : colors.textSec }]}>
                {(item.name || item.member_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[s.lbName, { color: colors.text, fontFamily: isSelf ? FONT.bold : FONT.regular }]}>
              {isSelf ? 'You' : item.name || item.member_name}
            </Text>
            <Text style={[s.lbPoints, { color: isSelf ? colors.accent : colors.text }]}>
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

  const available = allCircles.filter(c => !c.is_member)

  return (
    <View>
      <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Join a Circle</Text>
      {available.map((circle, i) => (
        <View key={i} style={[s.discoverCard, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.circleName, { color: colors.text }]}>{circle.name}</Text>
            <Text style={[s.circleMeta, { color: colors.textSec }]}>{circle.member_count || 0} members · {circle.city || 'Local'}</Text>
          </View>
          <TouchableOpacity
            style={[s.joinBtn, { backgroundColor: joining === circle.id ? colors.bgHover : colors.accentSoft, borderColor: colors.accent + '40' }]}
            onPress={() => join(circle.id)}
            disabled={!!joining}
            activeOpacity={0.7}
          >
            <Text style={[s.joinBtnText, { color: colors.accent }]}>{joining === circle.id ? '...' : 'Join'}</Text>
          </TouchableOpacity>
        </View>
      ))}
      {available.length === 0 && (
        <View style={s.emptyState}>
          <View style={[s.emptyIcon, { backgroundColor: colors.accentSoft }]}>
            <Feather name="check-circle" size={28} color={colors.accent} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>You're in all available Circles!</Text>
          <Text style={[s.emptySub, { color: colors.textSec }]}>New Circles will appear here when available</Text>
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
      <View style={[s.progressTrack, { backgroundColor: colors.borderStrong }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: 26, fontFamily: FONT.extraBold, letterSpacing: -0.8 },
  sub: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: RADIUS.full },
  uploadBtnText: { fontSize: 13, fontFamily: FONT.bold, color: '#07080F' },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5, paddingHorizontal: SPACING.lg },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabItemActive: {},
  tabLabel: { fontSize: 13, fontFamily: FONT.semibold },
  tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2.5, backgroundColor: COLORS.accent, borderRadius: 1.5 },

  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  // Card — consistent with theme CARD
  card: { borderRadius: RADIUS.lg, borderWidth: 0.5, padding: SPACING.md, marginBottom: SPACING.md },

  // My Circle
  circleHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: SPACING.sm },
  circleName: { fontSize: 17, fontFamily: FONT.bold, letterSpacing: -0.3 },
  circleMeta: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  rankBadge: { backgroundColor: COLORS.purpleSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  rankText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.purple },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  memberInitial: { fontSize: 13, fontFamily: FONT.bold },
  progressSection: { gap: SPACING.sm, marginBottom: SPACING.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabel: { fontSize: 12, fontFamily: FONT.medium, width: 110 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressValue: { fontSize: 12, fontFamily: FONT.numBold, minWidth: 32, textAlign: 'right' },

  // Actions
  cardActions: { flexDirection: 'row', gap: 10, paddingTop: 14, borderTopWidth: 0.5 },
  primaryActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm },
  primaryActionText: { fontSize: 13, fontFamily: FONT.bold, color: '#07080F' },
  ghostActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 0.5 },
  ghostActionText: { fontSize: 13, fontFamily: FONT.semibold },

  // Activity feed
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.lg, borderWidth: 0.5, marginBottom: 10 },
  activityAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityInitial: { fontSize: 15, fontFamily: FONT.bold },
  activityName: { fontSize: 14, fontFamily: FONT.semibold },
  activityMeta: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  activityTime: { fontSize: 11, fontFamily: FONT.regular, marginTop: 2 },
  activityScore: { fontSize: 22, fontFamily: FONT.numExtraBold, letterSpacing: -0.5 },
  activityScoreLabel: { fontSize: 10, fontFamily: FONT.medium, textAlign: 'center' },
  verifiedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  verifiedText: { fontSize: 9, fontFamily: FONT.bold, letterSpacing: 0.5 },

  // Leaderboard
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, letterSpacing: -0.3 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  lbRank: { fontSize: 16, fontFamily: FONT.numBold, minWidth: 28, textAlign: 'center' },
  lbAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lbInitial: { fontSize: 12, fontFamily: FONT.bold },
  lbName: { flex: 1, fontSize: 14, fontFamily: FONT.regular },
  lbPoints: { fontSize: 15, fontFamily: FONT.numBold },

  // Discover
  discoverCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 0.5, marginBottom: 10, gap: SPACING.sm },
  joinBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 0.5 },
  joinBtnText: { fontSize: 13, fontFamily: FONT.bold },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 16, fontFamily: FONT.bold },
  emptySub: { fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20, paddingHorizontal: SPACING.lg },
  emptyActionBtn: { marginTop: SPACING.sm, flex: 0, paddingHorizontal: SPACING.lg },
})
