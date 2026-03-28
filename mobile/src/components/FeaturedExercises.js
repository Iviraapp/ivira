/**
 * Featured Exercises — Visual workout showcase with images & video indicators.
 * Displays a horizontally scrollable row of exercise cards with real images
 * from the wger/free-exercise-db, muscle group chips, and video play buttons.
 * Tapping a card navigates to WorkoutTracker with the exercise pre-selected.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.72
const CARD_HEIGHT = 220

const MUSCLE_COLORS = {
  Chest: '#EF4444',
  Back: '#3B82F6',
  Shoulders: '#F97316',
  Biceps: '#8B5CF6',
  Triceps: '#EC4899',
  Legs: '#10B981',
  Abs: '#FBBF24',
  Glutes: '#14B8A6',
  Calves: '#06B6D4',
  Forearms: '#A78BFA',
  Core: '#FBBF24',
  Cardio: '#F43F5E',
}

function getMuscleColor(muscle) {
  if (!muscle) return '#64748B'
  const key = Object.keys(MUSCLE_COLORS).find(k =>
    muscle.toLowerCase().includes(k.toLowerCase())
  )
  return key ? MUSCLE_COLORS[key] : '#64748B'
}

// Categories to cycle through for variety
const FEATURED_CATEGORIES = [
  'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core',
]

export default function FeaturedExercises({ style, navigation }) {
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [headerLabel, setHeaderLabel] = useState("Today's Picks")
  const scrollRef = useRef(null)

  const fetchExercises = useCallback(async () => {
    try {
      // Pick a category based on day of week for variety
      const dayIdx = new Date().getDay()
      const category = FEATURED_CATEGORIES[dayIdx % FEATURED_CATEGORIES.length]
      setHeaderLabel(`${category} Day`)

      let data = []

      // Try authenticated endpoint first, fallback to public browse
      try {
        if (gymId && member?.id) {
          const res = await api.get(
            `/gyms/${gymId}/members/${member.id}/workout-sessions/exercises?category=${category}&limit=20`
          )
          data = res.data?.exercises || res.data || []
        }
      } catch {
        // fallback below
      }

      if (!data.length) {
        try {
          const res = await api.get(`/exercises/browse?category=${category}&limit=20`)
          data = res.data?.exercises || res.data || []
        } catch {
          // silent
        }
      }

      // Filter to exercises that have images
      const withImages = data.filter(ex => ex.image_url)

      // If not enough with images for this category, fetch without category filter
      if (withImages.length < 4) {
        try {
          const res = await api.get('/exercises/browse?limit=40')
          const all = res.data?.exercises || res.data || []
          const extras = all.filter(ex => ex.image_url && !withImages.find(w => w.id === ex.id))
          withImages.push(...extras)
          if (withImages.length > 3) setHeaderLabel("Today's Picks")
        } catch {
          // silent
        }
      }

      // Shuffle and take top 8
      const shuffled = withImages.sort(() => Math.random() - 0.5).slice(0, 8)
      setExercises(shuffled)
    } catch {
      // silent fail — component just won't render
    } finally {
      setLoading(false)
    }
  }, [gymId, member?.id])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  if (loading) {
    return (
      <View style={[styles.loadingWrap, style]}>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    )
  }

  if (!exercises.length) return null

  const handlePress = (exercise) => {
    navigation?.navigate?.('WorkoutTracker', { preselectedExercise: exercise })
  }

  const handleVideoPress = (exercise) => {
    if (exercise.video_url) {
      Linking.openURL(exercise.video_url).catch(() => {})
    }
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
            <Feather name="zap" size={16} color="#F97316" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {headerLabel}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSec }]}>
              Exercises with demo videos & images
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => navigation?.navigate?.('WorkoutTracker')}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <Feather name="chevron-right" size={14} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + SPACING.sm}
        decelerationRate="fast"
      >
        {exercises.map((exercise, idx) => {
          const muscles = parseMuscles(exercise.muscles_primary)
          const hasVideo = !!exercise.video_url

          return (
            <TouchableOpacity
              key={exercise.id || idx}
              style={[styles.card, ELITE_CARD, { borderTopWidth: 3, borderTopColor: '#F97316' }]}
              activeOpacity={0.8}
              onPress={() => handlePress(exercise)}
            >
              {/* Image */}
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: exercise.image_url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {/* Gradient overlay at bottom */}
                <View style={styles.imageOverlay} />

                {/* Video badge */}
                {hasVideo && (
                  <TouchableOpacity
                    style={styles.videoBadge}
                    onPress={() => handleVideoPress(exercise)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="play-circle" size={28} color="#FFF" />
                  </TouchableOpacity>
                )}

                {/* Equipment tag */}
                {exercise.equipment && exercise.equipment !== 'None' && (
                  <View style={styles.equipmentTag}>
                    <Text style={styles.equipmentText}>{exercise.equipment}</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.info}>
                <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                  {exercise.name}
                </Text>

                <View style={styles.metaRow}>
                  {/* Muscle chips */}
                  {muscles.slice(0, 2).map((m, mi) => (
                    <View
                      key={mi}
                      style={[styles.muscleChip, { backgroundColor: `${getMuscleColor(m.name)}20` }]}
                    >
                      <View style={[styles.muscleDot, { backgroundColor: getMuscleColor(m.name) }]} />
                      <Text style={[styles.muscleText, { color: getMuscleColor(m.name) }]}>
                        {m.name}
                      </Text>
                    </View>
                  ))}

                  {/* Category fallback if no muscles */}
                  {!muscles.length && exercise.muscle_group && (
                    <View
                      style={[styles.muscleChip, { backgroundColor: `${getMuscleColor(exercise.muscle_group)}20` }]}
                    >
                      <View style={[styles.muscleDot, { backgroundColor: getMuscleColor(exercise.muscle_group) }]} />
                      <Text style={[styles.muscleText, { color: getMuscleColor(exercise.muscle_group) }]}>
                        {exercise.muscle_group}
                      </Text>
                    </View>
                  )}

                  {hasVideo && (
                    <View style={[styles.muscleChip, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                      <Feather name="video" size={10} color="#F97316" />
                      <Text style={[styles.muscleText, { color: '#F97316', marginLeft: 3 }]}>Video</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Secondary image as small thumbnail */}
              {exercise.image_url_secondary && (
                <Image
                  source={{ uri: exercise.image_url_secondary }}
                  style={styles.secondaryThumb}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

/** Parse muscles_primary which might be a JSON string or array */
function parseMuscles(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  loadingWrap: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 4,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: '#F97316',
  },
  scrollContent: {
    paddingRight: SPACING.md,
    gap: SPACING.sm,
  },
  card: {
    width: CARD_WIDTH,
    overflow: 'hidden',
    padding: 0,
  },
  imageWrap: {
    width: '100%',
    height: CARD_HEIGHT * 0.62,
    position: 'relative',
    backgroundColor: '#1A2236',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(17,24,39,0.6)',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  equipmentText: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: '#FFF',
  },
  info: {
    padding: SPACING.sm + 2,
    paddingBottom: SPACING.sm,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT.bold,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  muscleText: {
    fontSize: 10,
    fontFamily: FONT.semibold,
  },
  secondaryThumb: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
})
