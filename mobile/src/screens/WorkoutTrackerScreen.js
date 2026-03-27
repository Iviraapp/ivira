import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Alert, Animated, ActivityIndicator, Modal, FlatList, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import Haptics from '../lib/haptics'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { safeApiCall } from '../lib/offlineQueue'
import WorkoutSummaryModal from '../components/WorkoutSummaryModal'

// ── Default exercise library (used when API unavailable) ─────────
const DEFAULT_EXERCISES = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', category: 'chest', equipment: 'barbell', muscle_group: 'pectorals' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', category: 'chest', equipment: 'dumbbell', muscle_group: 'upper chest' },
  { id: 'cable-fly', name: 'Cable Fly', category: 'chest', equipment: 'cable', muscle_group: 'pectorals' },
  { id: 'push-up', name: 'Push-Up', category: 'chest', equipment: 'bodyweight', muscle_group: 'pectorals' },
  // Back
  { id: 'deadlift', name: 'Deadlift', category: 'back', equipment: 'barbell', muscle_group: 'posterior chain' },
  { id: 'pull-up', name: 'Pull-Up', category: 'back', equipment: 'bodyweight', muscle_group: 'lats' },
  { id: 'barbell-row', name: 'Barbell Row', category: 'back', equipment: 'barbell', muscle_group: 'lats' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'back', equipment: 'cable', muscle_group: 'lats' },
  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', category: 'shoulders', equipment: 'barbell', muscle_group: 'deltoids' },
  { id: 'lateral-raise', name: 'Lateral Raise', category: 'shoulders', equipment: 'dumbbell', muscle_group: 'lateral deltoid' },
  { id: 'face-pull', name: 'Face Pull', category: 'shoulders', equipment: 'cable', muscle_group: 'rear deltoid' },
  // Arms
  { id: 'bicep-curl', name: 'Bicep Curl', category: 'arms', equipment: 'dumbbell', muscle_group: 'biceps' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'arms', equipment: 'cable', muscle_group: 'triceps' },
  { id: 'hammer-curl', name: 'Hammer Curl', category: 'arms', equipment: 'dumbbell', muscle_group: 'brachialis' },
  // Legs
  { id: 'squat', name: 'Squat', category: 'legs', equipment: 'barbell', muscle_group: 'quadriceps' },
  { id: 'leg-press', name: 'Leg Press', category: 'legs', equipment: 'machine', muscle_group: 'quadriceps' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', category: 'legs', equipment: 'barbell', muscle_group: 'hamstrings' },
  { id: 'leg-curl', name: 'Leg Curl', category: 'legs', equipment: 'machine', muscle_group: 'hamstrings' },
  { id: 'calf-raise', name: 'Calf Raise', category: 'legs', equipment: 'machine', muscle_group: 'calves' },
  { id: 'lunges', name: 'Lunges', category: 'legs', equipment: 'dumbbell', muscle_group: 'quadriceps' },
  // Core
  { id: 'plank', name: 'Plank', category: 'core', equipment: 'bodyweight', muscle_group: 'abdominals' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', category: 'core', equipment: 'bodyweight', muscle_group: 'abdominals' },
  { id: 'cable-crunch', name: 'Cable Crunch', category: 'core', equipment: 'cable', muscle_group: 'abdominals' },
  // Cardio
  { id: 'treadmill', name: 'Treadmill Run', category: 'cardio', equipment: 'machine', muscle_group: 'cardiovascular' },
  { id: 'cycling', name: 'Cycling', category: 'cardio', equipment: 'machine', muscle_group: 'cardiovascular' },
  { id: 'jump-rope', name: 'Jump Rope', category: 'cardio', equipment: 'bodyweight', muscle_group: 'cardiovascular' },
]

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'chest', label: 'Chest', icon: 'maximize' },
  { key: 'back', label: 'Back', icon: 'arrow-up' },
  { key: 'shoulders', label: 'Shoulders', icon: 'triangle' },
  { key: 'arms', label: 'Arms', icon: 'zap' },
  { key: 'legs', label: 'Legs', icon: 'trending-up' },
  { key: 'core', label: 'Core', icon: 'target' },
  { key: 'cardio', label: 'Cardio', icon: 'heart' },
]

const WORKOUT_TYPES = [
  { key: 'push', label: 'Push Day' },
  { key: 'pull', label: 'Pull Day' },
  { key: 'legs', label: 'Leg Day' },
  { key: 'upper', label: 'Upper Body' },
  { key: 'lower', label: 'Lower Body' },
  { key: 'full', label: 'Full Body' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'custom', label: 'Custom' },
]

const WORKOUT_TEMPLATES = {
  push: ['bench-press', 'incline-db-press', 'overhead-press', 'lateral-raise', 'tricep-pushdown'],
  pull: ['deadlift', 'barbell-row', 'lat-pulldown', 'bicep-curl', 'face-pull'],
  legs: ['squat', 'leg-press', 'romanian-deadlift', 'leg-curl', 'calf-raise'],
  upper: ['bench-press', 'barbell-row', 'overhead-press', 'bicep-curl', 'tricep-pushdown'],
  lower: ['squat', 'leg-press', 'romanian-deadlift', 'lunges', 'calf-raise'],
  full: ['squat', 'bench-press', 'deadlift', 'overhead-press', 'pull-up'],
  cardio: ['treadmill', 'cycling', 'jump-rope'],
}

// ── Exercise Picker Modal ────────────────────────────────────────
function ExercisePicker({ visible, onClose, onSelect, exercises }) {
  const { colors, isDark } = useTheme()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || ex.category === category
    return matchSearch && matchCat
  })

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[styles.pickerOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.pickerContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Add Exercise</Text>
            <TouchableOpacity onPress={onClose} style={[styles.pickerClose, { backgroundColor: colors.bgTer }]}>
              <Feather name="x" size={18} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textTer} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textTer}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, category === cat.key && styles.catChipActive]}
                onPress={() => setCategory(cat.key)}
              >
                <Feather name={cat.icon} size={12} color={category === cat.key ? '#FFF' : colors.textSec} />
                <Text style={[styles.catChipText, category === cat.key && { color: '#FFF' }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise list */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.exerciseRow, { borderColor: colors.border }]}
                onPress={() => { onSelect(item); onClose() }}
                activeOpacity={0.7}
              >
                <View style={[styles.exerciseIcon, { backgroundColor: colors.accentSoft }]}>
                  <Feather name="plus" size={14} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.exerciseMeta, { color: colors.textTer }]}>
                    {item.muscle_group} · {item.equipment}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textTer }]}>No exercises found</Text>
            }
          />
        </View>
      </View>
    </Modal>
  )
}

// ── Set Row Component ────────────────────────────────────────────
function SetRow({ set, index, onChange, onRemove, colors }) {
  return (
    <View style={[styles.setRow, { borderColor: colors.border }]}>
      <Text style={[styles.setNum, { color: colors.textTer }]}>{index + 1}</Text>
      <View style={[styles.setInput, { backgroundColor: colors.bgTer }]}>
        <TextInput
          style={[styles.setInputText, { color: colors.text }]}
          placeholder="kg"
          placeholderTextColor={colors.textTer}
          value={set.weight}
          onChangeText={v => onChange({ ...set, weight: v })}
          keyboardType="decimal-pad"
        />
      </View>
      <Text style={[styles.setX, { color: colors.textTer }]}>x</Text>
      <View style={[styles.setInput, { backgroundColor: colors.bgTer }]}>
        <TextInput
          style={[styles.setInputText, { color: colors.text }]}
          placeholder="reps"
          placeholderTextColor={colors.textTer}
          value={set.reps}
          onChangeText={v => onChange({ ...set, reps: v })}
          keyboardType="number-pad"
        />
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="trash-2" size={14} color={colors.textTer} />
      </TouchableOpacity>
    </View>
  )
}

// ── Main Screen ──────────────────────────────────────────────────
export default function WorkoutTrackerScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { member, gymId } = useAuth()

  const [sessionName, setSessionName] = useState('')
  const [exercises, setExercises] = useState([]) // [{exercise, sets: [{weight, reps}]}]
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [exerciseHistory, setExerciseHistory] = useState({}) // { exerciseId: { maxWeight, lastSets } }

  // Rest timer state
  const [restTimerActive, setRestTimerActive] = useState(false)
  const [restSeconds, setRestSeconds] = useState(0)
  const [restDuration, setRestDuration] = useState(90) // default 90s
  const restTimerRef = useRef(null)

  const REST_PRESETS = [30, 60, 90, 120, 180]

  const startRestTimer = (duration) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    const dur = duration || restDuration
    setRestDuration(dur)
    setRestSeconds(dur)
    setRestTimerActive(true)
    restTimerRef.current = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current)
          restTimerRef.current = null
          setRestTimerActive(false)
          // Haptic buzz when rest is over
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } catch {}
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopRestTimer = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    restTimerRef.current = null
    setRestTimerActive(false)
    setRestSeconds(0)
  }

  useEffect(() => {
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current) }
  }, [])

  // Load exercise history for "Previous Sets" hints
  useEffect(() => {
    if (!gymId || !member?.id) return
    api.get(`/gyms/${gymId}/members/${member.id}/workout-sessions?limit=20`)
      .then(res => {
        const sessions = res.data?.sessions || []
        const history = {}
        sessions.forEach(s => {
          (s.exercises || []).forEach(ex => {
            if (!history[ex.exercise_id]) {
              history[ex.exercise_id] = {
                maxWeight: 0,
                lastSets: ex.sets || [],
              }
            }
            ;(ex.sets || []).forEach(set => {
              const w = parseFloat(set.weight_kg) || 0
              if (w > history[ex.exercise_id].maxWeight) {
                history[ex.exercise_id].maxWeight = w
              }
            })
          })
        })
        setExerciseHistory(history)
      })
      .catch(() => {})
  }, [gymId, member?.id])

  // Timer — only runs after workout starts (first exercise added)
  useEffect(() => {
    if (!startTime) return
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const addExercise = (exercise) => {
    // Start timer on first exercise
    if (!startTime) setStartTime(Date.now())
    setExercises(prev => [...prev, {
      exercise,
      sets: [{ weight: '', reps: '' }],
    }])
  }

  const addSet = (exerciseIndex) => {
    setExercises(prev => {
      const updated = [...prev]
      const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1]
      updated[exerciseIndex].sets.push({ weight: lastSet?.weight || '', reps: lastSet?.reps || '' })
      return updated
    })
  }

  const updateSet = (exerciseIndex, setIndex, newSet) => {
    setExercises(prev => {
      const updated = [...prev]
      updated[exerciseIndex].sets[setIndex] = newSet
      return updated
    })
  }

  const removeSet = (exerciseIndex, setIndex) => {
    setExercises(prev => {
      const updated = [...prev]
      updated[exerciseIndex].sets.splice(setIndex, 1)
      if (updated[exerciseIndex].sets.length === 0) {
        updated.splice(exerciseIndex, 1)
      }
      return updated
    })
  }

  const removeExercise = (index) => {
    Alert.alert('Remove Exercise', 'Remove this exercise and all its sets?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setExercises(prev => prev.filter((_, i) => i !== index))
      }},
    ])
  }

  const getTotalVolume = () => {
    let volume = 0
    exercises.forEach(ex => {
      ex.sets.forEach(s => {
        const w = parseFloat(s.weight) || 0
        const r = parseInt(s.reps) || 0
        // Skip empty/incomplete sets
        if (w > 0 && r > 0) volume += w * r
      })
    })
    return volume
  }

  const getTotalSets = () => {
    return exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  }

  const handleFinish = async () => {
    if (exercises.length === 0) {
      Alert.alert('No Exercises', 'Add at least one exercise before finishing.')
      return
    }

    const duration = startTime ? Math.floor((Date.now() - startTime) / 60000) : 0

    setSaving(true)
    try {
      let exerciseHistory = {}

      // Try to save to backend
      if (gymId && member?.id) {
        try {
          // Fetch exercise history for PR detection
          try {
            const histRes = await api.get(`/gyms/${gymId}/members/${member.id}/workout-sessions?limit=50`)
            const sessions = histRes.data?.sessions || []
            sessions.forEach(s => {
              (s.exercises || []).forEach(ex => {
                if (!exerciseHistory[ex.exercise_id]) exerciseHistory[ex.exercise_id] = 0
                ;(ex.sets || []).forEach(set => {
                  const w = parseFloat(set.weight_kg) || 0
                  if (w > exerciseHistory[ex.exercise_id]) exerciseHistory[ex.exercise_id] = w
                })
              })
            })
          } catch (_) {
            // history fetch failed, skip PR detection
          }

          const sessionRes = await api.post(`/gyms/${gymId}/members/${member.id}/workout-sessions`, {
            name: sessionName || 'Workout',
            workout_type: 'strength',
            session_date: new Date().toISOString().split('T')[0],
          })
          const sessionId = sessionRes.data?.session?.id

          if (sessionId) {
            for (const ex of exercises) {
              await api.post(`/gyms/${gymId}/members/${member.id}/workout-sessions/${sessionId}/sets`, {
                exercise_id: ex.exercise.id,
                sets: ex.sets.map((s, i) => ({
                  set_number: i + 1,
                  weight_kg: parseFloat(s.weight) || 0,
                  reps: parseInt(s.reps) || 0,
                })),
              })
            }
            await api.put(`/gyms/${gymId}/members/${member.id}/workout-sessions/${sessionId}/complete`, {
              duration_minutes: duration,
            })
          }
        } catch (err) {
          console.log('[Workout] Backend save failed, queuing for retry:', err.message)
          // Queue workout for offline retry
          safeApiCall('post', `/gyms/${gymId}/members/${member.id}/workout-sessions`, {
            name: sessionName || 'Workout',
            workout_type: 'strength',
            session_date: new Date().toISOString().split('T')[0],
            duration_minutes: duration,
            exercises: exercises.map(ex => ({
              exercise_id: ex.exercise.id,
              sets: ex.sets.map((s, i) => ({
                set_number: i + 1,
                weight_kg: parseFloat(s.weight) || 0,
                reps: parseInt(s.reps) || 0,
              })),
            })),
          }).catch(() => {})
        }
      }

      // Detect personal records
      const personal_records = []
      exercises.forEach(ex => {
        const prevMax = exerciseHistory[ex.exercise.id] || 0
        ex.sets.forEach(s => {
          const w = parseFloat(s.weight) || 0
          const r = parseInt(s.reps) || 0
          if (w > 0 && w > prevMax) {
            // Only add if not already tracked for this exercise (keep the heaviest)
            const existing = personal_records.find(pr => pr.exercise_name === ex.exercise.name)
            if (!existing || w > existing.weight_kg) {
              if (existing) {
                existing.weight_kg = w
                existing.reps = r
              } else {
                personal_records.push({ exercise_name: ex.exercise.name, weight_kg: w, reps: r })
              }
            }
          }
        })
      })

      setSummaryData({
        name: sessionName || 'Workout',
        duration_minutes: duration,
        exercises_count: exercises.length,
        total_sets: getTotalSets(),
        total_volume: getTotalVolume(),
        personal_records,
        calories_estimate: duration * 7,
      })
    } catch (err) {
      Alert.alert('Error', 'Could not save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const loadHistory = async () => {
    if (!gymId || !member?.id) return
    setLoadingHistory(true)
    try {
      const res = await api.get(`/gyms/${gymId}/members/${member.id}/workout-sessions?limit=10`)
      setHistory(res.data?.sessions || [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.bgTer }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Workout Tracker</Text>
          <View style={styles.timerRow}>
            <Feather name="clock" size={12} color={COLORS.accent} />
            <Text style={[styles.timerText, { color: COLORS.accent }]}>{formatTime(elapsed)}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory() }}
          style={[styles.historyBtn, { backgroundColor: colors.bgTer }]}
        >
          <Feather name="list" size={18} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Session name */}
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgTer }]}
            placeholder="Workout name (e.g. Push Day)"
            placeholderTextColor={colors.textTer}
            value={sessionName}
            onChangeText={setSessionName}
          />
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{exercises.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTer }]}>Exercises</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{getTotalSets()}</Text>
            <Text style={[styles.statLabel, { color: colors.textTer }]}>Sets</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{getTotalVolume().toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textTer }]}>Volume (kg)</Text>
          </View>
        </View>

        {/* History panel */}
        {showHistory && (
          <View style={[styles.historyPanel, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Workouts</Text>
            {loadingHistory ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginVertical: SPACING.md }} />
            ) : history.length === 0 ? (
              <Text style={[styles.historyEmpty, { color: colors.textTer }]}>No workout history yet. Start your first one!</Text>
            ) : (
              history.map((s, i) => (
                <View key={s.id || i} style={[styles.historyRow, { borderColor: colors.border }]}>
                  <View>
                    <Text style={[styles.historyName, { color: colors.text }]}>{s.name || 'Workout'}</Text>
                    <Text style={[styles.historyDate, { color: colors.textTer }]}>{s.session_date}</Text>
                  </View>
                  <Text style={[styles.historyDuration, { color: colors.textSec }]}>{s.duration_minutes || '—'} min</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Exercise list */}
        {exercises.map((item, exIndex) => (
          <View key={exIndex} style={[styles.exerciseCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <View style={styles.exerciseCardHeader}>
              <View style={[styles.exerciseCardIcon, { backgroundColor: colors.accentSoft }]}>
                <Feather name="activity" size={14} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exerciseCardName, { color: colors.text }]}>{item.exercise.name}</Text>
                <Text style={[styles.exerciseCardMeta, { color: colors.textTer }]}>{item.exercise.muscle_group}</Text>
                {exerciseHistory[item.exercise.id] && (
                  <Text style={{ fontSize: 11, color: '#22C55E', fontFamily: FONT.regular, marginTop: 2 }}>
                    PR: {exerciseHistory[item.exercise.id].maxWeight}kg
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => removeExercise(exIndex)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={16} color={colors.textTer} />
              </TouchableOpacity>
            </View>

            {/* Set header */}
            <View style={styles.setHeaderRow}>
              <Text style={[styles.setHeaderText, { color: colors.textTer, width: 28 }]}>SET</Text>
              <Text style={[styles.setHeaderText, { color: colors.textTer, flex: 1 }]}>WEIGHT</Text>
              <Text style={[styles.setHeaderText, { color: colors.textTer, width: 16 }]} />
              <Text style={[styles.setHeaderText, { color: colors.textTer, flex: 1 }]}>REPS</Text>
              <Text style={[styles.setHeaderText, { color: colors.textTer, width: 14 }]} />
            </View>

            {/* Sets */}
            {item.sets.map((set, setIndex) => (
              <SetRow
                key={setIndex}
                set={set}
                index={setIndex}
                onChange={(newSet) => updateSet(exIndex, setIndex, newSet)}
                onRemove={() => removeSet(exIndex, setIndex)}
                colors={colors}
              />
            ))}

            {/* Add set + Rest timer buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.addSetBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => addSet(exIndex)}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color={COLORS.accent} />
                <Text style={[styles.addSetText, { color: COLORS.accent }]}>Add Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addSetBtn, { borderColor: restTimerActive ? '#F59E0B' : colors.border, flex: 1,
                  backgroundColor: restTimerActive ? 'rgba(245,158,11,0.1)' : 'transparent' }]}
                onPress={() => restTimerActive ? stopRestTimer() : startRestTimer()}
                activeOpacity={0.7}
              >
                <Feather name={restTimerActive ? 'x' : 'clock'} size={14} color={restTimerActive ? '#F59E0B' : colors.textSec} />
                <Text style={[styles.addSetText, { color: restTimerActive ? '#F59E0B' : colors.textSec }]}>
                  {restTimerActive ? `${Math.floor(restSeconds / 60)}:${(restSeconds % 60).toString().padStart(2, '0')}` : 'Rest'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add exercise button */}
        <TouchableOpacity
          style={[styles.addExerciseBtn, { borderColor: colors.border, backgroundColor: colors.bgSec }]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.addExerciseIcon, { backgroundColor: colors.accentSoft }]}>
            <Feather name="plus" size={18} color={COLORS.accent} />
          </View>
          <Text style={[styles.addExerciseText, { color: colors.text }]}>Add Exercise</Text>
          <Feather name="chevron-right" size={16} color={colors.textTer} />
        </TouchableOpacity>

        {/* Quick templates */}
        {exercises.length === 0 && (
          <View style={styles.templatesSection}>
            <Text style={[styles.templatesTitle, { color: colors.textSec }]}>Quick Start</Text>
            <View style={styles.templatesGrid}>
              {WORKOUT_TYPES.slice(0, 6).map(wt => (
                <TouchableOpacity
                  key={wt.key}
                  style={[styles.templateChip, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
                  onPress={() => {
                    setSessionName(wt.label)
                    if (WORKOUT_TEMPLATES[wt.key]) {
                      const templateExercises = WORKOUT_TEMPLATES[wt.key]
                        .map(id => DEFAULT_EXERCISES.find(e => e.id === id))
                        .filter(Boolean)
                        .map(exercise => ({ exercise, sets: [{ weight: '', reps: '' }] }))
                      setExercises(templateExercises)
                      if (!startTime) setStartTime(Date.now())
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.templateChipText, { color: colors.text }]}>{wt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating rest timer */}
      {restTimerActive && (
        <View style={[styles.restTimerFloat, { backgroundColor: isDark ? '#1C1400' : '#FFF8E1', borderColor: '#F59E0B' }]}>
          <Feather name="clock" size={18} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 11, color: '#F59E0B', fontFamily: FONT.semibold }}>REST TIMER</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, fontFamily: FONT.numExtraBold }}>
              {Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {REST_PRESETS.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => startRestTimer(t)}
                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                  backgroundColor: restDuration === t ? '#F59E0B' : 'rgba(245,158,11,0.15)' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: restDuration === t ? '#000' : '#F59E0B' }}>
                  {t < 60 ? `${t}s` : `${t / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={stopRestTimer} style={{ marginLeft: 8 }}>
            <Feather name="x" size={18} color={colors.textTer} />
          </TouchableOpacity>
        </View>
      )}

      {/* Finish button */}
      {exercises.length > 0 && (
        <View style={[styles.finishBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.discardBtn, { borderColor: colors.border }]}
            onPress={() => Alert.alert('Discard Workout?', 'All progress will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
            ])}
          >
            <Feather name="trash-2" size={16} color={COLORS.red} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.finishBtn, saving && { opacity: 0.6 }]}
            onPress={handleFinish}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.finishBtnText}>Finish Workout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise picker modal */}
      <ExercisePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={addExercise}
        exercises={DEFAULT_EXERCISES}
      />

      {/* Workout summary modal */}
      <WorkoutSummaryModal
        visible={!!summaryData}
        onClose={() => {
          setSummaryData(null)
          setExercises([])
          setSessionName('')
          navigation.goBack()
        }}
        summary={summaryData}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: FONT.bold },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timerText: { fontSize: 13, fontWeight: '700', fontFamily: FONT.numBold },
  historyBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  nameRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  nameInput: {
    height: 46, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md,
    fontSize: 15, fontFamily: FONT.medium, borderWidth: 1,
  },

  statsBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  statValue: { fontSize: 18, fontWeight: '800', fontFamily: FONT.numExtraBold },
  statLabel: { fontSize: 10, fontFamily: FONT.regular, marginTop: 2 },

  // History
  historyPanel: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.md },
  historyTitle: { fontSize: 14, fontWeight: '700', fontFamily: FONT.bold, marginBottom: SPACING.sm },
  historyEmpty: { fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', paddingVertical: SPACING.md },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  historyName: { fontSize: 14, fontWeight: '600', fontFamily: FONT.semibold },
  historyDate: { fontSize: 11, fontFamily: FONT.regular, marginTop: 2 },
  historyDuration: { fontSize: 13, fontFamily: FONT.numSemibold },

  // Exercise card
  exerciseCard: {
    marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.sm,
  },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.sm },
  exerciseCardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exerciseCardName: { fontSize: 15, fontWeight: '700', fontFamily: FONT.bold },
  exerciseCardMeta: { fontSize: 11, fontFamily: FONT.regular, marginTop: 1 },

  setHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingHorizontal: 4 },
  setHeaderText: { fontSize: 9, fontWeight: '700', fontFamily: FONT.bold, letterSpacing: 1 },

  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  setNum: { width: 24, fontSize: 13, fontWeight: '700', fontFamily: FONT.numBold, textAlign: 'center' },
  setInput: { flex: 1, height: 38, borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center' },
  setInputText: { fontSize: 15, fontFamily: FONT.numMedium, textAlign: 'center' },
  setX: { fontSize: 13, fontWeight: '600' },

  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', marginTop: 8, gap: 4,
  },
  addSetText: { fontSize: 13, fontWeight: '600', fontFamily: FONT.semibold },

  // Add exercise
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, gap: 12,
  },
  addExerciseIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addExerciseText: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: FONT.semibold },

  // Templates
  templatesSection: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  templatesTitle: { fontSize: 13, fontWeight: '600', fontFamily: FONT.semibold, marginBottom: SPACING.sm },
  templatesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1 },
  templateChipText: { fontSize: 13, fontWeight: '600', fontFamily: FONT.semibold },

  // Finish bar
  finishBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: SPACING.lg, paddingTop: 12, borderTopWidth: 1,
  },
  discardBtn: {
    width: 48, height: 48, borderRadius: RADIUS.lg,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  finishBtn: {
    flex: 1, height: 48, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  finishBtnText: { fontSize: 16, fontWeight: '700', fontFamily: FONT.bold, color: '#FFF' },

  // Rest timer float
  restTimerFloat: {
    position: 'absolute', bottom: 80, left: SPACING.lg, right: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },

  // Picker modal
  pickerOverlay: { flex: 1 },
  pickerContainer: { flex: 1, marginTop: Platform.OS === 'ios' ? 60 : 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', fontFamily: FONT.bold },
  pickerClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, height: 42, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONT.regular },
  catScroll: { maxHeight: 44, marginTop: SPACING.sm },
  catContent: { paddingHorizontal: SPACING.lg, gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  catChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catChipText: { fontSize: 12, fontWeight: '600', fontFamily: FONT.semibold, color: 'rgba(255,255,255,0.5)' },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1,
  },
  exerciseIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exerciseName: { fontSize: 14, fontWeight: '600', fontFamily: FONT.semibold },
  exerciseMeta: { fontSize: 11, fontFamily: FONT.regular, marginTop: 1 },
  emptyText: { fontSize: 14, fontFamily: FONT.regular, textAlign: 'center', paddingVertical: SPACING.xl },
})
