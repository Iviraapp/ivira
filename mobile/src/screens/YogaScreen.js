import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { COLORS, SPACING, RADIUS, FONT, GLASS_CARD } from '../lib/theme'
import Haptics from '../lib/haptics'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_GAP = SPACING.sm
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - CARD_GAP) / 2
const API_BASE = 'https://yoga-api-nzy4.onrender.com/v1'
const CACHE_KEY = 'ivira_yoga_poses_cache'

// ---------------------------------------------------------------------------
// Categories & Difficulty
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'standing', label: 'Standing' },
  { id: 'seated', label: 'Seated' },
  { id: 'prone', label: 'Prone' },
  { id: 'supine', label: 'Supine' },
  { id: 'balancing', label: 'Balancing' },
  { id: 'core', label: 'Core' },
  { id: 'backbend', label: 'Backbend' },
  { id: 'forward_bend', label: 'Forward Bend' },
  { id: 'hip_opener', label: 'Hip Opener' },
  { id: 'inversion', label: 'Inversion' },
]

const DIFFICULTIES = [
  { id: 'all', label: 'All' },
  { id: 'beginner', label: 'Easy', color: '#34D399' },
  { id: 'intermediate', label: 'Medium', color: '#FBBF24' },
  { id: 'expert', label: 'Hard', color: '#F87171' },
]

const TIMER_OPTIONS = [30, 60, 90]

const getDifficultyInfo = (level) => {
  if (!level) return { label: 'Easy', color: '#34D399' }
  const l = level.toLowerCase()
  if (l === 'expert' || l === 'hard') return { label: 'Hard', color: '#F87171' }
  if (l === 'intermediate' || l === 'medium') return { label: 'Medium', color: '#FBBF24' }
  return { label: 'Easy', color: '#34D399' }
}

// ---------------------------------------------------------------------------
// Yoga Screen
// ---------------------------------------------------------------------------
export default function YogaScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()

  const [poses, setPoses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedPose, setSelectedPose] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  // Timer state
  const [timerActive, setTimerActive] = useState(false)
  const [timerDuration, setTimerDuration] = useState(null)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const timerRef = useRef(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchPoses = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)

      const response = await fetch(`${API_BASE}/poses`)
      if (!response.ok) throw new Error('API error')
      const data = await response.json()

      // Normalize pose data
      const normalized = (Array.isArray(data) ? data : []).map((p, idx) => ({
        id: p.id || String(idx),
        english_name: p.english_name || p.name || 'Unknown Pose',
        sanskrit_name: p.sanskrit_name || p.sanskrit_name_adapted || '',
        sanskrit_name_adapted: p.sanskrit_name_adapted || '',
        translation_name: p.translation_name || '',
        pose_benefits: p.pose_benefits || '',
        pose_description: p.pose_description || '',
        url_png: p.url_png || p.img_url || '',
        url_svg: p.url_svg || '',
        url_svg_alt: p.url_svg_alt || '',
        difficulty_level: p.difficulty_level || 'Beginner',
        category_name: p.category_name || '',
      }))

      setPoses(normalized)
      // Cache for offline
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(normalized)).catch(() => {})
    } catch (err) {
      // Fallback to cache
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached) {
          setPoses(JSON.parse(cached))
        }
      } catch {}
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPoses()
  }, [fetchPoses])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchPoses(true)
  }, [fetchPoses])

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------
  const filteredPoses = poses.filter((p) => {
    const catMatch =
      selectedCategory === 'all' ||
      (p.category_name || '').toLowerCase().replace(/\s+/g, '_').includes(selectedCategory)
    const diffMatch =
      selectedDifficulty === 'all' ||
      (p.difficulty_level || '').toLowerCase() === selectedDifficulty
    return catMatch && diffMatch
  })

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------
  const startTimer = (seconds) => {
    setTimerDuration(seconds)
    setTimerRemaining(seconds)
    setTimerActive(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }

  useEffect(() => {
    if (timerActive && timerRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimerRemaining((prev) => prev - 1)
      }, 1000)
    } else if (timerActive && timerRemaining === 0) {
      // Timer complete
      setTimerActive(false)
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // Double haptic for emphasis
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timerActive, timerRemaining])

  const cancelTimer = () => {
    setTimerActive(false)
    setTimerRemaining(0)
    setTimerDuration(null)
    pulseAnim.stopAnimation()
    pulseAnim.setValue(1)
    if (timerRef.current) clearTimeout(timerRef.current)
    Haptics.selectionAsync()
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const openPose = (pose) => {
    setSelectedPose(pose)
    setModalVisible(true)
    setTimerActive(false)
    setTimerDuration(null)
    setTimerRemaining(0)
    Haptics.selectionAsync()
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }

  const closePose = () => {
    cancelTimer()
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false)
      setSelectedPose(null)
    })
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderCategoryChip = (cat) => {
    const active = selectedCategory === cat.id
    return (
      <TouchableOpacity
        key={cat.id}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedCategory(cat.id)
          Haptics.selectionAsync()
        }}
        style={[
          styles.chip,
          {
            backgroundColor: active
              ? isDark ? 'rgba(16,185,129,0.20)' : 'rgba(16,185,129,0.15)'
              : isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.05)',
            borderColor: active
              ? 'rgba(16,185,129,0.40)'
              : isDark ? 'rgba(148,163,184,0.10)' : 'rgba(15,23,42,0.08)',
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            {
              color: active ? COLORS.accent : colors.textSec,
              fontFamily: active ? FONT.semibold : FONT.medium,
            },
          ]}
        >
          {cat.label}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderDifficultyPill = (diff) => {
    const active = selectedDifficulty === diff.id
    const pillColor = diff.color || COLORS.accent
    return (
      <TouchableOpacity
        key={diff.id}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedDifficulty(diff.id)
          Haptics.selectionAsync()
        }}
        style={[
          styles.pill,
          {
            backgroundColor: active
              ? `${pillColor}22`
              : isDark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.04)',
            borderColor: active
              ? `${pillColor}55`
              : isDark ? 'rgba(148,163,184,0.10)' : 'rgba(15,23,42,0.08)',
          },
        ]}
      >
        {diff.color && <View style={[styles.pillDot, { backgroundColor: pillColor }]} />}
        <Text
          style={[
            styles.pillText,
            {
              color: active ? pillColor : colors.textSec,
              fontFamily: active ? FONT.semibold : FONT.medium,
            },
          ]}
        >
          {diff.label}
        </Text>
      </TouchableOpacity>
    )
  }

  const renderPoseCard = ({ item, index }) => {
    const diff = getDifficultyInfo(item.difficulty_level)
    const isLeft = index % 2 === 0
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openPose(item)}
        style={[
          styles.poseCard,
          {
            backgroundColor: isDark
              ? GLASS_CARD.backgroundColor
              : '#FFFFFF',
            borderColor: isDark
              ? GLASS_CARD.borderColor
              : 'rgba(15,23,42,0.06)',
            marginRight: isLeft ? CARD_GAP : 0,
            marginLeft: isLeft ? 0 : 0,
          },
        ]}
      >
        {/* Colored top accent border */}
        <View style={[styles.cardAccent, { backgroundColor: diff.color }]} />

        {/* Image */}
        <View style={styles.cardImageWrap}>
          {item.url_png ? (
            <Image
              source={{ uri: item.url_png }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Feather name="wind" size={28} color={colors.textTer} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text numberOfLines={1} style={[styles.cardName, { color: colors.text }]}>
            {item.english_name}
          </Text>
          {item.sanskrit_name ? (
            <Text numberOfLines={1} style={[styles.cardSanskrit, { color: colors.textTer }]}>
              {item.sanskrit_name}
            </Text>
          ) : null}
          <View style={[styles.diffBadge, { backgroundColor: `${diff.color}18` }]}>
            <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
            <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading poses...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Yoga & Stretching</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSec }]}>
            {filteredPoses.length} pose{filteredPoses.length !== 1 ? 's' : ''} available
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="sun" size={20} color={COLORS.accent} />
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {CATEGORIES.map(renderCategoryChip)}
      </ScrollView>

      {/* Difficulty filter */}
      <View style={styles.diffRow}>
        {DIFFICULTIES.map(renderDifficultyPill)}
      </View>

      {/* Pose grid */}
      <FlatList
        data={filteredPoses}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={renderPoseCard}
        contentContainerStyle={[
          styles.grid,
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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="wind" size={48} color={colors.textTer} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>
              No poses found for this filter.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory('all')
                setSelectedDifficulty('all')
              }}
              style={styles.resetBtn}
            >
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* --------------- Pose Detail Modal --------------- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePose}
      >
        {selectedPose && (
          <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
              {/* Modal header */}
              <View style={[styles.modalHeader, { paddingTop: insets.top + SPACING.sm }]}>
                <TouchableOpacity onPress={closePose} style={styles.modalCloseBtn}>
                  <Feather name="x" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalHeaderText, { color: colors.textSec }]}>
                  Pose Detail
                </Text>
                <View style={{ width: 36 }} />
              </View>

              {/* Timer View */}
              {timerActive ? (
                <View style={styles.timerContainer}>
                  <Animated.View style={[styles.timerImageWrap, { transform: [{ scale: pulseAnim }] }]}>
                    {selectedPose.url_png ? (
                      <Image
                        source={{ uri: selectedPose.url_png }}
                        style={styles.timerImage}
                        resizeMode="contain"
                      />
                    ) : null}
                  </Animated.View>
                  <Text style={[styles.timerCount, { color: COLORS.accent }]}>
                    {formatTime(timerRemaining)}
                  </Text>
                  <Text style={[styles.timerLabel, { color: colors.textSec }]}>
                    {timerRemaining === 0 ? 'Complete!' : 'Hold the pose...'}
                  </Text>
                  <TouchableOpacity onPress={cancelTimer} style={styles.timerCancelBtn}>
                    <Feather name="x-circle" size={18} color={colors.textSec} />
                    <Text style={[styles.timerCancelText, { color: colors.textSec }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Pose image */}
                  <View style={styles.modalImageWrap}>
                    {selectedPose.url_png ? (
                      <Image
                        source={{ uri: selectedPose.url_png }}
                        style={styles.modalImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.modalImagePlaceholder}>
                        <Feather name="wind" size={56} color={colors.textTer} />
                      </View>
                    )}
                  </View>

                  {/* Pose info */}
                  <View style={styles.modalBody}>
                    <Text style={[styles.modalPoseName, { color: colors.text }]}>
                      {selectedPose.english_name}
                    </Text>
                    {selectedPose.sanskrit_name ? (
                      <Text style={[styles.modalSanskrit, { color: colors.textTer }]}>
                        {selectedPose.sanskrit_name}
                        {selectedPose.translation_name
                          ? `  \u2022  ${selectedPose.translation_name}`
                          : ''}
                      </Text>
                    ) : null}

                    {/* Difficulty badge */}
                    {(() => {
                      const diff = getDifficultyInfo(selectedPose.difficulty_level)
                      return (
                        <View
                          style={[
                            styles.modalDiffBadge,
                            { backgroundColor: `${diff.color}18`, borderColor: `${diff.color}30` },
                          ]}
                        >
                          <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
                          <Text style={[styles.modalDiffText, { color: diff.color }]}>
                            {diff.label}
                          </Text>
                        </View>
                      )
                    })()}

                    {/* Benefits */}
                    {selectedPose.pose_benefits ? (
                      <View
                        style={[
                          styles.modalSection,
                          {
                            backgroundColor: isDark
                              ? GLASS_CARD.backgroundColor
                              : 'rgba(16,185,129,0.04)',
                            borderColor: isDark
                              ? GLASS_CARD.borderColor
                              : 'rgba(16,185,129,0.10)',
                          },
                        ]}
                      >
                        <View style={styles.sectionHeader}>
                          <Feather name="heart" size={16} color={COLORS.accent} />
                          <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Benefits
                          </Text>
                        </View>
                        <Text style={[styles.sectionText, { color: colors.textSec }]}>
                          {selectedPose.pose_benefits}
                        </Text>
                      </View>
                    ) : null}

                    {/* Instructions */}
                    {selectedPose.pose_description ? (
                      <View
                        style={[
                          styles.modalSection,
                          {
                            backgroundColor: isDark
                              ? 'rgba(17, 24, 39, 0.65)'
                              : 'rgba(15,23,42,0.03)',
                            borderColor: isDark
                              ? 'rgba(148,163,184,0.08)'
                              : 'rgba(15,23,42,0.06)',
                          },
                        ]}
                      >
                        <View style={styles.sectionHeader}>
                          <Feather name="list" size={16} color={COLORS.cyan} />
                          <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Instructions
                          </Text>
                        </View>
                        <Text style={[styles.sectionText, { color: colors.textSec }]}>
                          {selectedPose.pose_description}
                        </Text>
                      </View>
                    ) : null}

                    {/* Timer buttons */}
                    <View style={styles.timerSection}>
                      <Text style={[styles.timerSectionTitle, { color: colors.text }]}>
                        Start Timer
                      </Text>
                      <Text style={[styles.timerSectionSub, { color: colors.textSec }]}>
                        Hold the pose for a set duration
                      </Text>
                      <View style={styles.timerBtnRow}>
                        {TIMER_OPTIONS.map((sec) => (
                          <TouchableOpacity
                            key={sec}
                            onPress={() => startTimer(sec)}
                            style={styles.timerBtn}
                            activeOpacity={0.75}
                          >
                            <Feather name="play" size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.timerBtnText}>
                              {sec < 60 ? `${sec}s` : `${sec / 60}m${sec % 60 ? ` ${sec % 60}s` : ''}`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    marginTop: SPACING.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: FONT.medium,
    fontSize: 13,
    marginTop: 2,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,185,129,0.10)',
  },

  // Category chips
  chipScroll: {
    maxHeight: 44,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },

  // Difficulty pills
  diffRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 5,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 12,
  },

  // Grid
  grid: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },

  // Pose card
  poseCard: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 3,
    width: '100%',
  },
  cardImageWrap: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  cardImage: {
    width: '80%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    paddingHorizontal: SPACING.sm + 2,
    paddingBottom: SPACING.sm + 2,
  },
  cardName: {
    fontFamily: FONT.semibold,
    fontSize: 13,
    marginBottom: 2,
  },
  cardSanskrit: {
    fontFamily: FONT.regular,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: SPACING.xs + 2,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  diffDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  diffText: {
    fontFamily: FONT.semibold,
    fontSize: 10,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    gap: SPACING.md,
  },
  emptyText: {
    fontFamily: FONT.medium,
    fontSize: 15,
    textAlign: 'center',
  },
  resetBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  resetBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 13,
    color: COLORS.accent,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  modalHeaderText: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  modalImageWrap: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalImage: {
    width: '65%',
    height: '100%',
  },
  modalImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
  },
  modalPoseName: {
    fontFamily: FONT.bold,
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSanskrit: {
    fontFamily: FONT.regular,
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  modalDiffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
    marginBottom: SPACING.lg,
  },
  modalDiffText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },

  // Sections
  modalSection: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONT.semibold,
    fontSize: 15,
  },
  sectionText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 22,
  },

  // Timer section in modal
  timerSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  timerSectionTitle: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginBottom: 4,
  },
  timerSectionSub: {
    fontFamily: FONT.regular,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  timerBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  timerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
  },
  timerBtnText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Active timer view
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  timerImageWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  timerImage: {
    width: '100%',
    height: '100%',
  },
  timerCount: {
    fontFamily: FONT.numExtraBold,
    fontSize: 64,
    letterSpacing: -1,
    marginBottom: SPACING.sm,
  },
  timerLabel: {
    fontFamily: FONT.medium,
    fontSize: 16,
    marginBottom: SPACING.xl,
  },
  timerCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  timerCancelText: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },
})
