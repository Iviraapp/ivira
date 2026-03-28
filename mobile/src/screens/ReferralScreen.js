import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Share, Alert, ActivityIndicator, RefreshControl, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'
import api from '../lib/api'

// ── Leaderboard Row ───────────────────────────────────────────────

function LeaderboardRow({ rank, name, referrals, isMe, colors }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  return (
    <View style={[
      styles.leaderRow,
      { backgroundColor: isMe ? COLORS.accent + '10' : 'transparent', borderColor: isMe ? COLORS.accent + '30' : colors.border },
      isMe && styles.leaderRowMe,
    ]}>
      <View style={styles.leaderRank}>
        {medal ? (
          <Text style={styles.medalText}>{medal}</Text>
        ) : (
          <Text style={[styles.rankNum, { color: colors.textTer }]}>#{rank}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.leaderName, { color: colors.text }]}>
          {name}{isMe ? ' (You)' : ''}
        </Text>
      </View>
      <View style={[styles.refCountBadge, { backgroundColor: COLORS.accent + '18' }]}>
        <Text style={[styles.refCountText, { color: COLORS.accent }]}>
          {referrals} referral{referrals !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────

export default function ReferralScreen({ navigation }) {
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const memberId = member?.id
  const insets = useSafeAreaInsets()

  const [code, setCode] = useState(null)
  const [stats, setStats] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [codeRes, statsRes, lbRes] = await Promise.all([
        api.get(`/gyms/${gymId}/referrals/my-code`).catch(err => { console.warn('[Referral]', err?.message); return null }),
        api.get(`/gyms/${gymId}/referrals/my-stats`).catch(err => { console.warn('[Referral]', err?.message); return null }),
        api.get(`/gyms/${gymId}/referrals/leaderboard`).catch(err => { console.warn('[Referral]', err?.message); return null }),
      ])

      if (codeRes?.data) setCode(codeRes.data)
      if (statsRes?.data) setStats(statsRes.data)
      if (lbRes?.data) setLeaderboard(Array.isArray(lbRes.data) ? lbRes.data : lbRes.data?.leaderboard || [])
    } catch (err) {
      console.warn('[Referral]', err?.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId])

  useEffect(() => {
    if (gymId) fetchData()
    else setLoading(false)
  }, [gymId, fetchData])

  const generateCode = async () => {
    setGenerating(true)
    try {
      const res = await api.post(`/gyms/${gymId}/referrals/my-code`)
      if (res.data) {
        setCode(res.data)
        fetchData()
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to generate referral code')
    } finally {
      setGenerating(false)
    }
  }

  const shareCode = async () => {
    if (!code?.code) return
    try {
      await Share.share({
        message: `Join my gym on IVIRA! Use my referral code: ${code.code} to get free days. Download IVIRA now!`,
      })
    } catch (err) { console.warn('[Referral]', err?.message) }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  const rewardText = code
    ? code.reward_type === 'free_days'
      ? `${code.reward_value} free days`
      : code.reward_type === 'discount_percent'
        ? `${code.reward_value}% off`
        : `₹${(code.reward_value / 100).toFixed(0)} off`
    : '7 free days'

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Refer & Earn</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: COLORS.accent }]}>
          <View style={styles.heroIconWrap}>
            <Feather name="gift" size={28} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>Refer Friends, Earn Rewards</Text>
          <Text style={styles.heroSub}>
            Share your code with friends. Both of you get {rewardText} when they join!
          </Text>
        </View>

        {/* Referral Code Card */}
        <View style={styles.section}>
          {code?.code ? (
            <View style={[styles.codeCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              <Text style={[styles.codeLabel, { color: colors.textSec }]}>Your Referral Code</Text>
              <View style={[styles.codeBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Text style={[styles.codeText, { color: colors.text }]}>{code.code}</Text>
              </View>
              <View style={styles.codeActions}>
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: COLORS.accent }]}
                  onPress={shareCode}
                  activeOpacity={0.8}
                >
                  <Feather name="share-2" size={16} color="#FFF" />
                  <Text style={styles.shareBtnText}>Share Code</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.codeStats}>
                <View style={styles.codeStat}>
                  <Text style={[styles.codeStatNum, { color: colors.text }]}>{code.times_used || 0}</Text>
                  <Text style={[styles.codeStatLabel, { color: colors.textTer }]}>Used</Text>
                </View>
                <View style={[styles.codeStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.codeStat}>
                  <Text style={[styles.codeStatNum, { color: colors.text }]}>{code.max_uses || '∞'}</Text>
                  <Text style={[styles.codeStatLabel, { color: colors.textTer }]}>Max Uses</Text>
                </View>
                <View style={[styles.codeStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.codeStat}>
                  <Text style={[styles.codeStatNum, { color: COLORS.green }]}>{rewardText}</Text>
                  <Text style={[styles.codeStatLabel, { color: colors.textTer }]}>Reward</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.codeCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              <Text style={[styles.noCodeText, { color: colors.textSec }]}>
                Generate your unique referral code to start earning rewards
              </Text>
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: COLORS.accent, opacity: generating ? 0.7 : 1 }]}
                onPress={generateCode}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="#FFF" />
                    <Text style={styles.generateBtnText}>Generate My Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* My Stats */}
        {stats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Referral Stats</Text>
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Referrals', value: stats.total_referrals || 0, icon: 'users', color: COLORS.accent },
                { label: 'Completed', value: stats.completed_referrals || 0, icon: 'check-circle', color: COLORS.green },
                { label: 'Pending', value: stats.pending_referrals || 0, icon: 'clock', color: COLORS.amber },
                { label: 'Rank', value: stats.leaderboard_position ? `#${stats.leaderboard_position}` : '---', icon: 'award', color: COLORS.cyan },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                    <Feather name={s.icon} size={16} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTer }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Referrers</Text>
            <View style={[styles.leaderCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              {leaderboard.map((item, i) => (
                <LeaderboardRow
                  key={item.member_id || i}
                  rank={i + 1}
                  name={item.member_name || item.name || 'Member'}
                  referrals={item.times_used || item.referrals || 0}
                  isMe={item.member_id === memberId}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How It Works</Text>
          <View style={[styles.stepsCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            {[
              { step: '1', icon: 'link', text: 'Generate your unique referral code' },
              { step: '2', icon: 'send', text: 'Share it with friends via WhatsApp, SMS, or social media' },
              { step: '3', icon: 'user-plus', text: 'Your friend joins the gym using your code' },
              { step: '4', icon: 'gift', text: `Both of you earn ${rewardText}!` },
            ].map((s, i) => (
              <View key={s.step} style={[styles.stepRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.stepNum, { backgroundColor: COLORS.accent + '18' }]}>
                  <Text style={[styles.stepNumText, { color: COLORS.accent }]}>{s.step}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.stepText, { color: colors.text }]}>{s.text}</Text>
                </View>
                <Feather name={s.icon} size={16} color={colors.textTer} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: FONT.semibold },

  // Hero
  heroCard: {
    marginHorizontal: SPACING.md, marginTop: 8, borderRadius: RADIUS.lg,
    padding: 24, alignItems: 'center',
  },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: { fontSize: 20, fontFamily: FONT.bold, color: '#FFF', textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 14, fontFamily: FONT.regular, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  section: { paddingHorizontal: SPACING.md, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontFamily: FONT.semibold, marginBottom: 10 },

  // Code card
  codeCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 20, alignItems: 'center' },
  codeLabel: { fontSize: 13, fontFamily: FONT.regular, marginBottom: 10 },
  codeBox: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: RADIUS.md,
    paddingHorizontal: 28, paddingVertical: 14, marginBottom: 16,
  },
  codeText: { fontSize: 28, fontFamily: FONT.numBold, letterSpacing: 4 },
  codeActions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  shareBtnText: { color: '#FFF', fontSize: 15, fontFamily: FONT.semibold },
  codeStats: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  codeStat: { flex: 1, alignItems: 'center' },
  codeStatNum: { fontSize: 16, fontFamily: FONT.numBold, marginBottom: 2 },
  codeStatLabel: { fontSize: 11, fontFamily: FONT.regular },
  codeStatDivider: { width: 1, height: 28 },

  noCodeText: { fontSize: 14, fontFamily: FONT.regular, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  generateBtnText: { color: '#FFF', fontSize: 16, fontFamily: FONT.semibold },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', borderRadius: RADIUS.md, borderWidth: 1,
    padding: 14, alignItems: 'center',
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontFamily: FONT.numBold, marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: FONT.regular },

  // Leaderboard
  leaderCard: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  leaderRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leaderRowMe: { borderWidth: 1, borderBottomWidth: 1 },
  leaderRank: { width: 32, alignItems: 'center' },
  medalText: { fontSize: 18 },
  rankNum: { fontSize: 14, fontFamily: FONT.numSemibold },
  leaderName: { fontSize: 14, fontFamily: FONT.medium, marginLeft: 8 },
  refCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  refCountText: { fontSize: 12, fontFamily: FONT.semibold },

  // Steps
  stepsCard: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontFamily: FONT.bold },
  stepText: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 19 },
})
