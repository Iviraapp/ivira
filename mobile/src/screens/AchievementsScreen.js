import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Dimensions,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BADGE_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 2) / 3
const STORAGE_KEY = 'ivira_unlocked_badges'

// ---------------------------------------------------------------------------
// Badge data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { key: 'fasting',  label: 'Fasting',   icon: '🔥', color: '#8B5CF6' },
  { key: 'workout',  label: 'Workout',   icon: '💪', color: '#F97316' },
  { key: 'nutrition', label: 'Nutrition', icon: '🥗', color: '#14B8A6' },
  { key: 'social',   label: 'Social',    icon: '🤝', color: '#EC4899' },
  { key: 'special',  label: 'Special',   icon: '⭐', color: '#EAB308' },
]

const ALL_BADGES = [
  // Fasting — streak badges
  { id: 'first_fast',   cat: 'fasting',  emoji: '🕐', name: 'First Fast',     desc: 'Complete your first 16-hour fast.',              howTo: 'Start a 16-hour intermittent fast and complete it without breaking.',   threshold: 1,   unit: 'fast' },
  { id: 'fasting_3',    cat: 'fasting',  emoji: '🔥', name: 'Burn Baby Burn', desc: '3-day fasting streak.',                           howTo: 'Complete 16h+ fasts on 3 consecutive days.',                           threshold: 3,   unit: 'day streak' },
  { id: 'week_warrior', cat: 'fasting',  emoji: '⚔️', name: 'Week Warrior',   desc: '7-day fasting streak.',                           howTo: 'Complete 16h+ fasts on 7 consecutive days.',                           threshold: 7,   unit: 'day streak' },
  { id: 'iron_will',    cat: 'fasting',  emoji: '🛡️', name: 'Iron Will',      desc: '30-day unbroken fasting streak.',                 howTo: 'Maintain a 16h+ daily fast for 30 consecutive days. No breaks.',        threshold: 30,  unit: 'day streak' },

  // Workout — milestone badges
  { id: 'first_rep',    cat: 'workout',  emoji: '🏋️', name: 'First Rep',      desc: 'Log your first workout.',                         howTo: 'Complete and log any workout in the tracker.',                          threshold: 1,   unit: 'workout' },
  { id: 'gym_rat',      cat: 'workout',  emoji: '🐀', name: 'Gym Rat',        desc: 'Complete 5 workouts.',                            howTo: 'Log 5 total workouts in the workout tracker.',                          threshold: 5,   unit: 'workouts' },
  { id: 'beast_mode',   cat: 'workout',  emoji: '🦁', name: 'Beast Mode',     desc: 'Crush 25 workouts.',                              howTo: 'Log 25 total workouts. Keep showing up.',                               threshold: 25,  unit: 'workouts' },
  { id: 'century',      cat: 'workout',  emoji: '💯', name: 'Century',        desc: '100 workouts — legendary status.',                 howTo: 'Log 100 total workouts. You are a legend.',                             threshold: 100, unit: 'workouts' },
  { id: 'early_bird',   cat: 'workout',  emoji: '🌅', name: 'Early Bird',     desc: 'Work out before 7 AM five times.',                 howTo: 'Check in to the gym before 7 AM on 5 separate days.',                   threshold: 5,   unit: 'early sessions' },

  // Nutrition — goal badges
  { id: 'clean_eater',  cat: 'nutrition', emoji: '🥦', name: 'Clean Eater',    desc: 'Hit nutrition goals for 7 days.',                 howTo: 'Stay within your calorie and macro targets for 7 days.',                threshold: 7,   unit: 'days' },
  { id: 'hydration',    cat: 'nutrition', emoji: '💧', name: 'Hydration Hero', desc: 'Hit water goal for 14 days.',                     howTo: 'Drink your target water intake for 14 consecutive days.',               threshold: 14,  unit: 'days' },
  { id: 'macro_master', cat: 'nutrition', emoji: '📊', name: 'Macro Master',   desc: 'Perfect macros for 5 days straight.',             howTo: 'Hit protein, carbs, and fat targets within 5% for 5 consecutive days.', threshold: 5,   unit: 'perfect days' },
  { id: 'meal_prep',    cat: 'nutrition', emoji: '🍱', name: 'Meal Prep Pro',  desc: 'Log all meals for 21 days.',                      howTo: 'Log breakfast, lunch, and dinner every day for 21 straight days.',       threshold: 21,  unit: 'days' },

  // Social — referral badges
  { id: 'first_friend', cat: 'social',   emoji: '🤗', name: 'Plus One',       desc: 'Refer your first friend.',                        howTo: 'Share your referral link and have 1 friend sign up.',                   threshold: 1,   unit: 'referral' },
  { id: 'social_fly',   cat: 'social',   emoji: '🦋', name: 'Social Butterfly', desc: 'Refer 3 friends.',                              howTo: 'Share your referral link and have 3 friends sign up.',                  threshold: 3,   unit: 'referrals' },
  { id: 'influencer',   cat: 'social',   emoji: '📢', name: 'Influencer',     desc: 'Refer 10 friends. You are the hype.',             howTo: 'Share your referral link and have 10 friends sign up.',                 threshold: 10,  unit: 'referrals' },
  { id: 'team_captain', cat: 'social',   emoji: '🏅', name: 'Team Captain',   desc: 'Create or join a challenge group.',                howTo: 'Start a challenge group or join one from the Community tab.',            threshold: 1,   unit: 'group' },

  // Special — seasonal / event badges
  { id: 'founding',     cat: 'special',  emoji: '🏆', name: 'Founding Member', desc: 'Joined during the launch window.',               howTo: 'Be among the first members to sign up on the platform.',                threshold: 1,   unit: 'signup' },
  { id: 'nye_grind',    cat: 'special',  emoji: '🎆', name: 'New Year Grind',  desc: 'Worked out on Jan 1.',                           howTo: 'Log a workout on January 1st. Start the year right.',                   threshold: 1,   unit: 'Jan 1 workout' },
  { id: 'midnight_oil', cat: 'special',  emoji: '🌙', name: 'Midnight Oil',    desc: 'Logged a workout after 11 PM.',                  howTo: 'Check in and complete a workout session after 11 PM.',                  threshold: 1,   unit: 'late session' },
]

// Demo progress data (simulated current progress for locked badges)
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLevelFromBadges(count) {
  if (count >= 18) return { level: 10, title: 'Olympian' }
  if (count >= 15) return { level: 9,  title: 'Legend' }
  if (count >= 12) return { level: 8,  title: 'Champion' }
  if (count >= 10) return { level: 7,  title: 'Elite' }
  if (count >= 8)  return { level: 6,  title: 'Veteran' }
  if (count >= 6)  return { level: 5,  title: 'Warrior' }
  if (count >= 4)  return { level: 4,  title: 'Contender' }
  if (count >= 3)  return { level: 3,  title: 'Rising Star' }
  if (count >= 2)  return { level: 2,  title: 'Apprentice' }
  if (count >= 1)  return { level: 1,  title: 'Rookie' }
  return { level: 0, title: 'Newcomer' }
}

function getRarestBadge(unlockedIds) {
  // Rarity order: special > social > nutrition > workout > fasting (reverse popularity)
  const rarityOrder = ['special', 'social', 'nutrition', 'workout', 'fasting']
  for (const cat of rarityOrder) {
    const found = ALL_BADGES.find(b => b.cat === cat && unlockedIds.includes(b.id))
    if (found) return found
  }
  return null
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PulseGlow({ color, children, unlocked }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!unlocked) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [unlocked])

  const glowOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] })
  const glowScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })

  if (!unlocked) return <>{children}</>

  return (
    <Animated.View style={{ transform: [{ scale: glowScale }] }}>
      <Animated.View
        style={{
          position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
          borderRadius: RADIUS.xl,
          backgroundColor: color,
          opacity: glowOpacity,
        }}
      />
      {children}
    </Animated.View>
  )
}

function BadgeCard({ badge, unlocked, earnedDate, progress, onPress, colors, card }) {
  const catMeta = CATEGORIES.find(c => c.key === badge.cat)
  const badgeColor = catMeta?.color || COLORS.accent

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(badge)}
      style={[styles.badgeCard, {
        backgroundColor: unlocked ? colors.bgSec : colors.bgTer,
        borderColor: unlocked ? badgeColor + '44' : colors.border,
        borderWidth: unlocked ? 1.5 : 1,
      }]}
    >
      <PulseGlow color={badgeColor} unlocked={unlocked}>
        <View style={[styles.badgeIconWrap, {
          backgroundColor: unlocked ? badgeColor + '22' : colors.bgHover,
        }]}>
          <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
          {!unlocked && (
            <View style={[styles.lockOverlay, { backgroundColor: colors.bg + 'CC' }]}>
              <Feather name="lock" size={16} color={colors.textSec} />
            </View>
          )}
        </View>
      </PulseGlow>
      <Text
        numberOfLines={1}
        style={[styles.badgeName, {
          color: unlocked ? colors.text : colors.textSec,
          fontFamily: FONT.semibold,
        }]}
      >
        {badge.name}
      </Text>
      {unlocked && earnedDate ? (
        <Text style={[styles.badgeDate, { color: badgeColor, fontFamily: FONT.regular }]}>
          {formatDate(earnedDate)}
        </Text>
      ) : (
        <Text style={[styles.badgeDate, { color: colors.textTer, fontFamily: FONT.regular }]}>
          Locked
        </Text>
      )}
    </TouchableOpacity>
  )
}

function CategoryPill({ cat, active, onPress, colors }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(cat.key)}
      style={[styles.pill, {
        backgroundColor: active ? cat.color + '22' : colors.bgTer,
        borderColor: active ? cat.color : colors.border,
        borderWidth: 1,
      }]}
    >
      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
      <Text style={[styles.pillLabel, {
        color: active ? cat.color : colors.textSec,
        fontFamily: active ? FONT.semibold : FONT.medium,
      }]}>
        {cat.label}
      </Text>
    </TouchableOpacity>
  )
}

function ProgressCard({ badge, progress, colors }) {
  const catMeta = CATEGORIES.find(c => c.key === badge.cat)
  const badgeColor = catMeta?.color || COLORS.accent
  const pct = Math.min((progress / badge.threshold) * 100, 100)

  return (
    <View style={[styles.progressCard, {
      backgroundColor: colors.bgSec,
      borderColor: colors.border,
    }]}>
      <View style={styles.progressLeft}>
        <Text style={{ fontSize: 28 }}>{badge.emoji}</Text>
      </View>
      <View style={styles.progressRight}>
        <Text style={[styles.progressName, { color: colors.text, fontFamily: FONT.semibold }]}>
          {badge.name}
        </Text>
        <Text style={[styles.progressSub, { color: colors.textSec, fontFamily: FONT.regular }]}>
          {progress}/{badge.threshold} {badge.unit}
        </Text>
        <View style={[styles.progressBarBg, { backgroundColor: colors.bgTer }]}>
          <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: badgeColor }]} />
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AchievementsScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, card, isDark } = useTheme()
  const { member, gymId } = useAuth()

  const [unlockedMap, setUnlockedMap] = useState({})   // { badgeId: dateStr }
  const [progressMap, setProgressMap] = useState({}) // { badgeId: number }
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Modal animation
  const modalAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [])

  // Load unlocked badges
  const loadBadges = useCallback(async () => {
    try {
      // Try backend API when gymId and member are available
      if (gymId && member?.id) {
        try {
          // Trigger evaluation first so any newly earned achievements are awarded
          await api.post(`/gyms/${gymId}/members/${member.id}/achievements/evaluate`)

          // Fetch all achievements (definitions) and earned achievements in parallel
          const [allRes, earnedRes] = await Promise.all([
            api.get('/achievements'),
            api.get(`/gyms/${gymId}/members/${member.id}/achievements`),
          ])

          const allAchievements = allRes.data?.data || allRes.data || []
          const earnedAchievements = earnedRes.data?.data || earnedRes.data || []

          // Build unlocked map from earned achievements
          const map = {}
          earnedAchievements.forEach(ea => {
            const id = ea.achievement_key || ea.achievementKey || ea.id
            map[id] = ea.earned_at || ea.earnedAt || ea.created_at || ea.createdAt || new Date().toISOString()
          })
          setUnlockedMap(map)

          // Build progress map from all achievements data
          const pMap = {}
          allAchievements.forEach(a => {
            const id = a.key || a.achievement_key || a.id
            if (a.progress !== undefined) pMap[id] = a.progress
            if (a.current_progress !== undefined) pMap[id] = a.current_progress
          })
          // Also merge progress from earned achievements
          earnedAchievements.forEach(ea => {
            const id = ea.achievement_key || ea.achievementKey || ea.id
            const badge = ALL_BADGES.find(b => b.id === id)
            if (badge) pMap[id] = badge.threshold // earned = 100% progress
          })
          setProgressMap(pMap)

          // Cache to AsyncStorage as fallback
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map)).catch(() => {})
          return
        } catch {
          // Backend failed — fall through to AsyncStorage fallback
        }
      }

      // Fallback: load from AsyncStorage
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) setUnlockedMap(JSON.parse(raw))
    } catch {
      // silent
    }
  }, [gymId, member?.id])

  useEffect(() => { loadBadges() }, [loadBadges])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadBadges()
    setRefreshing(false)
  }, [loadBadges])

  // Derived data
  const unlockedIds = useMemo(() => Object.keys(unlockedMap), [unlockedMap])
  const unlockedCount = unlockedIds.length
  const levelInfo = useMemo(() => getLevelFromBadges(unlockedCount), [unlockedCount])
  const rarestBadge = useMemo(() => getRarestBadge(unlockedIds), [unlockedIds])

  const filteredBadges = useMemo(() => {
    if (activeFilter === 'all') return ALL_BADGES
    return ALL_BADGES.filter(b => b.cat === activeFilter)
  }, [activeFilter])

  // Badges close to being unlocked (>40% progress, not yet unlocked)
  const almostBadges = useMemo(() => {
    return ALL_BADGES.filter(b => {
      if (unlockedIds.includes(b.id)) return false
      const prog = progressMap[b.id] || 0
      return prog / b.threshold >= 0.4 && prog / b.threshold < 1
    }).sort((a, b) => {
      const pctA = (progressMap[a.id] || 0) / a.threshold
      const pctB = (progressMap[b.id] || 0) / b.threshold
      return pctB - pctA
    }).slice(0, 4)
  }, [unlockedIds, progressMap])

  // Modal open / close
  const openModal = useCallback((badge) => {
    setSelectedBadge(badge)
    Animated.parallel([
      Animated.spring(modalAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start()
  }, [])

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setSelectedBadge(null))
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const renderStatCard = (icon, value, label, accent) => (
    <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: (accent || COLORS.accent) + '18' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text, fontFamily: FONT.numBold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSec, fontFamily: FONT.regular }]}>{label}</Text>
    </View>
  )

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Animated.View style={{
        flex: 1,
        opacity: entranceAnim,
        transform: [{ translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.bgSec }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONT.bold }]}>
              Achievements
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSec, fontFamily: FONT.regular }]}>
              Your trophy case
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: COLORS.accent + '18', borderColor: COLORS.accent + '44' }]}>
            <Text style={[styles.levelText, { color: COLORS.accent, fontFamily: FONT.numBold }]}>
              Lv.{levelInfo.level}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSec} />
          }
        >
          {/* Stats row */}
          <View style={styles.statsRow}>
            {renderStatCard('🏆', `${unlockedCount}/${ALL_BADGES.length}`, 'Badges', '#EAB308')}
            {renderStatCard('⚡', levelInfo.title, `Level ${levelInfo.level}`, COLORS.accent)}
            {renderStatCard(
              rarestBadge?.emoji || '🔒',
              rarestBadge?.name || '—',
              'Rarest',
              CATEGORIES.find(c => c.key === rarestBadge?.cat)?.color || '#8B5CF6',
            )}
          </View>

          {/* Almost there — progress section */}
          {almostBadges.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONT.bold }]}>
                Almost There
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSec, fontFamily: FONT.regular }]}>
                Keep pushing — these are within reach
              </Text>
              {almostBadges.map(badge => (
                <ProgressCard
                  key={badge.id}
                  badge={badge}
                  progress={progressMap[badge.id] || 0}
                  colors={colors}
                />
              ))}
            </View>
          )}

          {/* Category filters */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONT.bold }]}>
              All Badges
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveFilter('all')}
                style={[styles.pill, {
                  backgroundColor: activeFilter === 'all' ? COLORS.accent + '22' : colors.bgTer,
                  borderColor: activeFilter === 'all' ? COLORS.accent : colors.border,
                  borderWidth: 1,
                }]}
              >
                <Text style={{ fontSize: 14 }}>🎯</Text>
                <Text style={[styles.pillLabel, {
                  color: activeFilter === 'all' ? COLORS.accent : colors.textSec,
                  fontFamily: activeFilter === 'all' ? FONT.semibold : FONT.medium,
                }]}>
                  All
                </Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <CategoryPill
                  key={cat.key}
                  cat={cat}
                  active={activeFilter === cat.key}
                  onPress={setActiveFilter}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>

          {/* Badge grid */}
          <View style={styles.badgeGrid}>
            {filteredBadges.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                unlocked={unlockedIds.includes(badge.id)}
                earnedDate={unlockedMap[badge.id]}
                progress={progressMap[badge.id] || 0}
                onPress={openModal}
                colors={colors}
                card={card}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Detail Modal */}
      <Modal transparent visible={!!selectedBadge} animationType="none" onRequestClose={closeModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
          <Animated.View style={[styles.modalSheet, {
            backgroundColor: colors.bgSec,
            transform: [{
              translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }),
            }],
          }]}>
            {selectedBadge && (() => {
              const badge = selectedBadge
              const isUnlocked = unlockedIds.includes(badge.id)
              const catMeta = CATEGORIES.find(c => c.key === badge.cat)
              const badgeColor = catMeta?.color || COLORS.accent
              const progress = progressMap[badge.id] || 0
              const pct = Math.min((progress / badge.threshold) * 100, 100)

              return (
                <>
                  {/* Handle */}
                  <View style={[styles.modalHandle, { backgroundColor: colors.textTer }]} />

                  {/* Badge icon — large */}
                  <View style={[styles.modalIconWrap, {
                    backgroundColor: isUnlocked ? badgeColor + '22' : colors.bgTer,
                    borderColor: isUnlocked ? badgeColor + '44' : colors.border,
                  }]}>
                    <Text style={{ fontSize: 52 }}>{badge.emoji}</Text>
                    {!isUnlocked && (
                      <View style={[styles.modalLockOverlay, { backgroundColor: colors.bg + 'BB' }]}>
                        <Feather name="lock" size={28} color={colors.textSec} />
                      </View>
                    )}
                  </View>

                  {/* Category pill */}
                  <View style={[styles.modalCatPill, { backgroundColor: badgeColor + '18' }]}>
                    <Text style={{ fontSize: 12 }}>{catMeta?.icon}</Text>
                    <Text style={[styles.modalCatLabel, { color: badgeColor, fontFamily: FONT.semibold }]}>
                      {catMeta?.label}
                    </Text>
                  </View>

                  {/* Name & desc */}
                  <Text style={[styles.modalName, { color: colors.text, fontFamily: FONT.bold }]}>
                    {badge.name}
                  </Text>
                  <Text style={[styles.modalDesc, { color: colors.textSec, fontFamily: FONT.regular }]}>
                    {badge.desc}
                  </Text>

                  {isUnlocked ? (
                    <View style={[styles.modalEarnedRow, { backgroundColor: badgeColor + '12' }]}>
                      <Feather name="check-circle" size={18} color={badgeColor} />
                      <Text style={[styles.modalEarnedText, { color: badgeColor, fontFamily: FONT.semibold }]}>
                        Earned on {formatDate(unlockedMap[badge.id])}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* How to earn */}
                      <View style={[styles.modalHowTo, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                        <Text style={[styles.modalHowToTitle, { color: colors.text, fontFamily: FONT.semibold }]}>
                          How to earn
                        </Text>
                        <Text style={[styles.modalHowToText, { color: colors.textSec, fontFamily: FONT.regular }]}>
                          {badge.howTo}
                        </Text>
                      </View>

                      {/* Progress */}
                      <View style={styles.modalProgressWrap}>
                        <View style={styles.modalProgressHeader}>
                          <Text style={[styles.modalProgressLabel, { color: colors.text, fontFamily: FONT.semibold }]}>
                            Progress
                          </Text>
                          <Text style={[styles.modalProgressCount, { color: badgeColor, fontFamily: FONT.numBold }]}>
                            {progress}/{badge.threshold} {badge.unit}
                          </Text>
                        </View>
                        <View style={[styles.modalProgressBarBg, { backgroundColor: colors.bgTer }]}>
                          <View style={[styles.modalProgressBarFill, {
                            width: `${pct}%`,
                            backgroundColor: badgeColor,
                          }]} />
                        </View>
                        <Text style={[styles.modalProgressPct, { color: colors.textTer, fontFamily: FONT.numMedium }]}>
                          {Math.round(pct)}% complete
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Close button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={closeModal}
                    style={[styles.modalCloseBtn, { backgroundColor: colors.bgTer }]}
                  >
                    <Text style={[styles.modalCloseBtnText, { color: colors.text, fontFamily: FONT.semibold }]}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </>
              )
            })()}
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, marginTop: 1 },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  levelText: { fontSize: 13 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: { fontSize: 14, textAlign: 'center' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  // Sections
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: { fontSize: 18, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, marginTop: 2, marginBottom: SPACING.sm },

  // Pills
  pillRow: {
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  pillLabel: { fontSize: 13 },

  // Badge grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  badgeCard: {
    width: BADGE_SIZE,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  badgeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  badgeEmoji: { fontSize: 28 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  badgeName: { fontSize: 12, textAlign: 'center', marginBottom: 2 },
  badgeDate: { fontSize: 10, textAlign: 'center' },

  // Progress cards
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  progressLeft: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRight: { flex: 1 },
  progressName: { fontSize: 14, marginBottom: 2 },
  progressSub: { fontSize: 12, marginBottom: SPACING.sm },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.lg,
  },
  modalIconWrap: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  modalLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  modalCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 5,
    marginBottom: SPACING.sm,
  },
  modalCatLabel: { fontSize: 12 },
  modalName: { fontSize: 22, marginBottom: SPACING.xs, textAlign: 'center', letterSpacing: -0.3 },
  modalDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  modalEarnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  modalEarnedText: { fontSize: 14 },
  modalHowTo: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  modalHowToTitle: { fontSize: 14, marginBottom: SPACING.xs },
  modalHowToText: { fontSize: 13, lineHeight: 19 },
  modalProgressWrap: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  modalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalProgressLabel: { fontSize: 14 },
  modalProgressCount: { fontSize: 14 },
  modalProgressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  modalProgressPct: { fontSize: 12, marginTop: SPACING.xs, textAlign: 'right' },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 15 },
})
