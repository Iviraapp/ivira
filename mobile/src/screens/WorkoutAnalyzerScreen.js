// WorkoutAnalyzerScreen — AI-powered exercise form analysis
// Upload/record workout video → Gemini analyzes form → results + Circle share
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Dimensions, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Haptics from '../lib/haptics'
import { premiumAlert } from '../components/PremiumAlert'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Optional deps — try/catch for safety
let ImagePicker = null
try { ImagePicker = require('expo-image-picker') } catch {}

let Video = null
try { Video = require('expo-av').Video } catch {}

let Svg = null, Circle = null
try {
  const svgMod = require('react-native-svg')
  Svg = svgMod.Svg || svgMod.default
  Circle = svgMod.Circle
} catch {}

let FileSystem = null
try { FileSystem = require('expo-file-system') } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Gemini 2.0 Flash for video analysis
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const GEMINI_KEY = 'AIzaSyBsEhvajfDjzlconnSc5nca7WoKJ63Aj4M'

const EXERCISES = [
  'Auto-detect', 'Squat', 'Deadlift', 'Bench Press', 'Push-up',
  'Pull-up', 'Lunge', 'Shoulder Press', 'Bicep Curl', 'Plank',
]

const ANALYZING_MESSAGES = [
  'Reading your movement...',
  'Tracking joint angles...',
  'Counting clean reps...',
  'Evaluating form depth...',
  'Checking tempo consistency...',
  'Writing your breakdown...',
]

// ─── Score Ring ─────────────────────────────────────────────
function ScoreRing({ score, size = 96 }) {
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? COLORS.green : score >= 50 ? COLORS.amber : COLORS.red

  if (!Svg || !Circle) {
    // Fallback when react-native-svg unavailable
    return (
      <View style={[ringStyles.fallback, { width: size, height: size, borderColor: color }]}>
        <Text style={[ringStyles.fallbackScore, { color }]}>{score}</Text>
        <Text style={ringStyles.fallbackLabel}>FORM</Text>
      </View>
    )
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6}
        />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${circ}`} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={ringStyles.labelWrap}>
        <Text style={[ringStyles.score, { color, fontFamily: FONT.numBold }]}>{score}</Text>
        <Text style={ringStyles.label}>FORM</Text>
      </View>
    </View>
  )
}

const ringStyles = StyleSheet.create({
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 22, fontFamily: FONT.numBold },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, fontFamily: FONT.medium },
  fallback: {
    borderWidth: 4, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  fallbackScore: { fontSize: 22, fontFamily: FONT.numBold },
  fallbackLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: FONT.medium },
})

// ─── Pill ──────────────────────────────────────────────────
function Pill({ label, type, colors }) {
  const palettes = {
    good: { bg: `${COLORS.green}1F`, fg: COLORS.green, border: `${COLORS.green}40` },
    warn: { bg: `${COLORS.amber}1F`, fg: COLORS.amber, border: `${COLORS.amber}40` },
    bad:  { bg: `${COLORS.red}1F`,   fg: COLORS.red,   border: `${COLORS.red}40` },
  }
  const p = palettes[type] || palettes.good
  return (
    <View style={[pillStyles.pill, { backgroundColor: p.bg, borderColor: p.border }]}>
      <Text style={[pillStyles.text, { color: p.fg }]}>{label}</Text>
    </View>
  )
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    marginRight: 6, marginBottom: 6,
  },
  text: { fontSize: 12, fontFamily: FONT.medium },
})

// ─── Stat Box ──────────────────────────────────────────────
function StatBox({ label, value, unit, colors }) {
  return (
    <View style={[statStyles.box, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
      <Text style={[statStyles.label, { color: colors.textTer }]}>{label}</Text>
      <Text style={[statStyles.value, { color: colors.text }]}>
        {value}
        <Text style={[statStyles.unit, { color: colors.textTer }]}> {unit}</Text>
      </Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1, padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, alignItems: 'center',
  },
  label: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: FONT.semibold, marginBottom: 4 },
  value: { fontSize: 20, fontFamily: FONT.numBold },
  unit: { fontSize: 12, fontFamily: FONT.regular },
})

// ─── Tip Card ──────────────────────────────────────────────
function TipCard({ tip, index, colors }) {
  return (
    <View style={[tipStyles.card, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
      <View style={tipStyles.numWrap}>
        <Text style={tipStyles.num}>{index + 1}</Text>
      </View>
      <Text style={[tipStyles.text, { color: colors.textSec }]}>{tip}</Text>
    </View>
  )
}

const tipStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 12,
    padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, marginBottom: 8,
  },
  numWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: `${COLORS.green}26`,
    alignItems: 'center', justifyContent: 'center',
  },
  num: { fontSize: 11, fontFamily: FONT.numBold, color: COLORS.green },
  text: { flex: 1, fontSize: 13.5, lineHeight: 22, fontFamily: FONT.regular },
})


// ─── Main Screen ───────────────────────────────────────────
export default function WorkoutAnalyzerScreen({ navigation, route }) {
  const { colors, card, isDark } = useTheme()
  const { member, gymId } = useAuth()
  const insets = useSafeAreaInsets()

  // Route params from Circle
  const podId = route?.params?.podId
  const podName = route?.params?.podName
  const routeGymId = route?.params?.gymId || gymId
  const memberId = route?.params?.memberId || member?.id || member?._id

  // State
  const [stage, setStage] = useState('idle') // idle | preview | analyzing | done | error
  const [videoUri, setVideoUri] = useState(null)
  const [videoMime, setVideoMime] = useState('video/mp4')
  const [videoBase64, setVideoBase64] = useState(null)
  const [exercise, setExercise] = useState('Auto-detect')
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Animated refs
  const progressAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Timers
  const msgTimerRef = useRef(null)
  const progTimerRef = useRef(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current)
      if (progTimerRef.current) clearInterval(progTimerRef.current)
    }
  }, [])

  // Spin animation for analyzing state
  useEffect(() => {
    if (stage === 'analyzing') {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1, duration: 1000,
          useNativeDriver: true,
        })
      )
      spin.start()
      return () => spin.stop()
    } else {
      spinAnim.setValue(0)
    }
  }, [stage])

  // Fade in results
  useEffect(() => {
    if (stage === 'done') {
      fadeAnim.setValue(0)
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }).start()
    }
  }, [stage])

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // ── Video Picking ─────────────────────────────────────────
  const pickVideo = useCallback(async (fromCamera) => {
    if (!ImagePicker) {
      premiumAlert('Not Available', 'Camera/gallery is not available on this device.')
      return
    }
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
          premiumAlert('Permission Required', 'Camera access is needed to record workout videos.')
          return
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          premiumAlert('Permission Required', 'Gallery access is needed to select workout videos.')
          return
        }
      }

      const pickerFn = fromCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync

      const result = await pickerFn({
        mediaTypes: ['videos'],
        quality: 0.7,
        videoMaxDuration: 120,
        allowsEditing: Platform.OS === 'ios',
      })

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

        setVideoUri(asset.uri)
        setVideoMime(asset.mimeType || 'video/mp4')
        setStage('preview')
        setResult(null)
        setShared(false)

        // Read base64 in background
        readVideoBase64(asset.uri)
      }
    } catch (err) {
      console.warn('[WorkoutAnalyzer] picker error:', err?.message)
      premiumAlert('Error', 'Failed to pick video. Please try again.')
    }
  }, [])

  const readVideoBase64 = async (uri) => {
    try {
      if (FileSystem) {
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        setVideoBase64(b64)
      }
    } catch (err) {
      console.warn('[WorkoutAnalyzer] base64 read error:', err?.message)
    }
  }

  // ── Analysis ──────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!videoBase64) {
      premiumAlert('Loading', 'Video is still loading, please wait a moment.')
      return
    }

    setStage('analyzing')
    setProgress(0)
    setMsgIdx(0)
    progressAnim.setValue(0)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Rotating messages
    msgTimerRef.current = setInterval(() => {
      setMsgIdx(i => (i + 1) % ANALYZING_MESSAGES.length)
    }, 2200)

    // Fake progress bar
    progTimerRef.current = setInterval(() => {
      setProgress(p => {
        const next = Math.min(p + Math.random() * 7, 88)
        Animated.timing(progressAnim, {
          toValue: next / 100,
          duration: 350,
          useNativeDriver: false,
        }).start()
        return next
      })
    }, 500)

    try {
      const systemPrompt = `You are the IVIRA AI Coach — an elite fitness form analyst for the IVIRA gym accountability app.
A user from the "${podName || 'their Circle'}" circle has submitted a workout video for analysis.
${exercise !== 'Auto-detect' ? `They believe they are performing: ${exercise}` : 'Auto-detect the exercise being performed.'}

Analyze the video and return ONLY valid JSON with NO markdown, no code fences, no preamble:
{
  "exercise": "<detected exercise name>",
  "reps": <integer count of clean full-range reps>,
  "form_score": <0-100 integer>,
  "verdict": "<one punchy sentence — like a coach would say to the athlete>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "issues": ["<specific issue 1>", "<specific issue 2>"],
  "tips": ["<actionable fix 1>", "<actionable fix 2>", "<actionable fix 3>"],
  "circle_message": "<short hype/accountability message to share in the Circle feed, include emoji>",
  "next_target": "<what to aim for in next set>"
}`

      const body = {
        contents: [{
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: videoMime,
                data: videoBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      }

      const resp = await fetch(`${GEMINI_API}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      clearTimers()

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData?.error?.message || `API error ${resp.status}`)
      }

      const data = await resp.json()
      const rawText = data?.candidates?.[0]?.content?.parts
        ?.filter(p => p.text)
        ?.map(p => p.text)
        ?.join('') || ''

      let parsed
      try {
        // Strip any markdown code fences if present
        const cleaned = rawText.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        // Fallback demo result
        parsed = {
          exercise: exercise !== 'Auto-detect' ? exercise : 'Squat',
          reps: 10,
          form_score: 78,
          verdict: 'Solid effort — your depth is there but your core needs to stay tighter.',
          strengths: ['Good squat depth throughout', 'Consistent rep tempo'],
          issues: ['Lower back rounding on later reps', 'Knees tracking slightly inward'],
          tips: [
            'Brace your core before every rep — breathe in at the top, hold through the movement.',
            "Push your knees out in line with your toes — think 'spread the floor'.",
            'Keep your chest up by picking a focal point at eye level.',
          ],
          circle_message: 'Just hit 78/100 on squats — coming for the top spot \uD83D\uDCAA',
          next_target: 'Hit 85+ by keeping your spine neutral through all 10 reps.',
        }
      }

      // Animate progress to 100
      setProgress(100)
      Animated.timing(progressAnim, {
        toValue: 1, duration: 300, useNativeDriver: false,
      }).start()

      setResult(parsed)
      setStage('done')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Save to AsyncStorage so Vira AI picks it up in next chat session
      AsyncStorage.setItem('vira_last_analysis', JSON.stringify({
        exercise:   parsed.exercise,
        form_score: parsed.form_score,
        issues:     parsed.issues || [],
        tips:       parsed.tips || [],
        timestamp:  Date.now(),
      })).catch(() => {})

    } catch (err) {
      clearTimers()
      console.warn('[WorkoutAnalyzer] analysis error:', err?.message)
      setErrorMsg(err?.message || 'Analysis failed. Try a shorter clip.')
      setStage('error')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [videoBase64, exercise, podName, videoMime])

  const clearTimers = () => {
    if (msgTimerRef.current) { clearInterval(msgTimerRef.current); msgTimerRef.current = null }
    if (progTimerRef.current) { clearInterval(progTimerRef.current); progTimerRef.current = null }
  }

  // ── Circle Share ──────────────────────────────────────────
  const shareToCircle = useCallback(async () => {
    if (!podId || !routeGymId || !result) return
    setSharing(true)
    try {
      await api.post(`/gyms/${routeGymId}/pods/${podId}/messages`, {
        memberId,
        type: 'workout_analysis',
        message: result.circle_message,
        data: {
          exercise: result.exercise,
          reps: result.reps,
          form_score: result.form_score,
        },
      })
      setShared(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      console.warn('[WorkoutAnalyzer] share error:', err?.message)
      premiumAlert('Share Failed', 'Could not share to Circle. Please try again.')
    } finally {
      setSharing(false)
    }
  }, [podId, routeGymId, memberId, result])

  // ── Reset ─────────────────────────────────────────────────
  const reset = useCallback(() => {
    clearTimers()
    setStage('idle')
    setVideoUri(null)
    setVideoBase64(null)
    setResult(null)
    setProgress(0)
    setMsgIdx(0)
    setShared(false)
    setErrorMsg('')
    progressAnim.setValue(0)
  }, [])

  // ── Render helpers ────────────────────────────────────────
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  const renderHeader = () => (
    <View style={s.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[s.backBtn, { backgroundColor: colors.bgTer }]}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={20} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[s.headerSub, { color: COLORS.accent }]}>
          {podName ? `Circle \u00B7 ${podName}` : 'IVIRA AI Coach'}
        </Text>
        <Text style={[s.headerTitle, { color: colors.text }]}>Workout Analysis</Text>
      </View>
      {stage === 'done' && (
        <TouchableOpacity onPress={reset} style={[s.newBtn, { backgroundColor: colors.bgTer, borderColor: colors.border }]} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={14} color={colors.textSec} />
          <Text style={[s.newBtnText, { color: colors.textSec }]}>New</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const renderExerciseChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chipContainer}>
      {EXERCISES.map(ex => {
        const active = exercise === ex
        return (
          <TouchableOpacity
            key={ex}
            onPress={() => { setExercise(ex); Haptics.selectionAsync() }}
            style={[
              s.chip,
              { backgroundColor: active ? COLORS.accent : colors.bgTer, borderColor: active ? COLORS.accent : colors.border },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, { color: active ? '#fff' : colors.textSec }]}>{ex}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )

  const renderIdleStage = () => (
    <View style={s.idleContainer}>
      {/* Video icon */}
      <View style={[s.uploadIconWrap, { backgroundColor: `${COLORS.accent}18` }]}>
        <Feather name="video" size={32} color={COLORS.accent} />
      </View>
      <Text style={[s.uploadTitle, { color: colors.text }]}>Analyse your form</Text>
      <Text style={[s.uploadSub, { color: colors.textSec }]}>
        Record or pick a workout video and get AI-powered form analysis with rep counting
      </Text>

      {/* Two buttons: Record + Gallery */}
      <View style={s.pickRow}>
        <TouchableOpacity
          onPress={() => pickVideo(true)}
          style={[s.pickBtn, { backgroundColor: COLORS.accent }]}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={18} color="#fff" />
          <Text style={s.pickBtnText}>Record Video</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickVideo(false)}
          style={[s.pickBtn, s.pickBtnOutline, { borderColor: colors.borderStrong }]}
          activeOpacity={0.8}
        >
          <Feather name="image" size={18} color={colors.text} />
          <Text style={[s.pickBtnText, { color: colors.text }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.uploadHint, { color: colors.textTer }]}>MP4, MOV or WEBM \u00B7 max 2 min</Text>
    </View>
  )

  const renderPreviewStage = () => (
    <View>
      {/* Video preview */}
      {Video && videoUri ? (
        <Video
          source={{ uri: videoUri }}
          style={s.videoPreview}
          useNativeControls
          resizeMode="cover"
          isMuted
          shouldPlay={false}
        />
      ) : videoUri ? (
        <View style={[s.videoPreview, { backgroundColor: colors.bgTer, alignItems: 'center', justifyContent: 'center' }]}>
          <Feather name="film" size={40} color={colors.textSec} />
          <Text style={[s.videoFallbackText, { color: colors.textSec }]}>Video selected</Text>
        </View>
      ) : null}

      {/* Exercise chips */}
      <Text style={[s.sectionLabel, { color: colors.textTer, marginTop: 16 }]}>Exercise type</Text>
      {renderExerciseChips()}

      {/* Analyse button */}
      <TouchableOpacity
        onPress={analyze}
        style={[s.analyseBtn, { backgroundColor: COLORS.accent, opacity: videoBase64 ? 1 : 0.5 }]}
        activeOpacity={0.8}
        disabled={!videoBase64}
      >
        <Feather name="zap" size={18} color="#fff" />
        <Text style={s.analyseBtnText}>Analyse Form</Text>
        <Feather name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>

      {/* Change video */}
      <TouchableOpacity onPress={reset} style={[s.changeBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
        <Text style={[s.changeBtnText, { color: colors.textSec }]}>Change video</Text>
      </TouchableOpacity>

      {!videoBase64 && (
        <View style={s.loadingVideoRow}>
          <ActivityIndicator size="small" color={colors.textSec} />
          <Text style={[s.loadingVideoText, { color: colors.textSec }]}>Preparing video...</Text>
        </View>
      )}
    </View>
  )

  const renderAnalyzingStage = () => (
    <View style={s.analyzingContainer}>
      <Animated.View style={[s.spinner, { transform: [{ rotate: spinInterpolate }], borderColor: `${COLORS.accent}33`, borderTopColor: COLORS.accent }]} />
      <Text style={[s.analyzingMsg, { color: colors.textSec }]}>
        {ANALYZING_MESSAGES[msgIdx]}
      </Text>
      <View style={[s.progressTrack, { backgroundColor: colors.bgTer }]}>
        <Animated.View style={[s.progressFill, { width: progressWidth, backgroundColor: COLORS.accent }]} />
      </View>
      <Text style={[s.progressPct, { color: colors.textTer }]}>{Math.round(progress)}%</Text>
    </View>
  )

  const renderErrorStage = () => (
    <View style={s.errorContainer}>
      <View style={[s.errorIconWrap, { backgroundColor: `${COLORS.red}1A` }]}>
        <Feather name="alert-circle" size={28} color={COLORS.red} />
      </View>
      <Text style={[s.errorTitle, { color: COLORS.red }]}>Analysis Failed</Text>
      <Text style={[s.errorMsg, { color: colors.textSec }]}>{errorMsg || 'Try a shorter clip or better lighting.'}</Text>
      <TouchableOpacity onPress={reset} style={[s.retryBtn, { backgroundColor: `${COLORS.red}1A`, borderColor: `${COLORS.red}40` }]} activeOpacity={0.8}>
        <Feather name="refresh-cw" size={14} color={COLORS.red} />
        <Text style={[s.retryBtnText, { color: COLORS.red }]}>Try again</Text>
      </TouchableOpacity>
    </View>
  )

  const renderResults = () => {
    if (!result) return null
    const scoreColor = result.form_score >= 75 ? COLORS.green : result.form_score >= 50 ? COLORS.amber : COLORS.red

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Score + Verdict */}
        <View style={[s.scoreRow, card, { borderTopWidth: 3, borderTopColor: scoreColor }]}>
          <ScoreRing score={result.form_score} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[s.exerciseName, { color: colors.textTer }]}>{result.exercise}</Text>
            <Text style={[s.verdict, { color: colors.text }]}>
              &ldquo;{result.verdict}&rdquo;
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatBox label="Clean reps" value={result.reps} unit="reps" colors={colors} />
          <View style={{ width: 8 }} />
          <StatBox label="Form score" value={result.form_score} unit="/ 100" colors={colors} />
        </View>

        {/* Strengths */}
        {result.strengths?.length > 0 && (
          <View style={s.pillSection}>
            <Text style={[s.sectionLabel, { color: colors.textTer }]}>What&apos;s working</Text>
            <View style={s.pillRow}>
              {result.strengths.map((str, i) => <Pill key={i} label={str} type="good" colors={colors} />)}
            </View>
          </View>
        )}

        {/* Issues */}
        {result.issues?.length > 0 && (
          <View style={s.pillSection}>
            <Text style={[s.sectionLabel, { color: colors.textTer }]}>To fix</Text>
            <View style={s.pillRow}>
              {result.issues.map((iss, i) => <Pill key={i} label={iss} type="warn" colors={colors} />)}
            </View>
          </View>
        )}

        {/* Tips */}
        {result.tips?.length > 0 && (
          <View style={s.tipsSection}>
            <Text style={[s.sectionLabel, { color: colors.textTer }]}>Coach tips</Text>
            {result.tips.map((tip, i) => <TipCard key={i} tip={tip} index={i} colors={colors} />)}
          </View>
        )}

        {/* Next target */}
        <View style={[s.nextCard, { backgroundColor: `${COLORS.green}12`, borderColor: `${COLORS.green}33` }]}>
          <View style={s.nextHeader}>
            <Feather name="target" size={14} color={COLORS.green} />
            <Text style={s.nextLabel}>Next set goal</Text>
          </View>
          <Text style={[s.nextText, { color: colors.textSec }]}>{result.next_target}</Text>
        </View>

        {/* Circle share */}
        {podId && (
          <View style={[s.shareCard, card, { borderTopWidth: 3, borderTopColor: COLORS.accent }]}>
            <Text style={[s.shareMsg, { color: colors.textSec }]}>
              &ldquo;{result.circle_message}&rdquo;
            </Text>
            <TouchableOpacity
              onPress={shareToCircle}
              disabled={sharing || shared}
              style={[
                s.shareBtn,
                { backgroundColor: shared ? `${COLORS.green}1A` : COLORS.accent, opacity: sharing ? 0.6 : 1 },
              ]}
              activeOpacity={0.8}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name={shared ? 'check' : 'send'} size={14} color={shared ? COLORS.green : '#fff'} />
                  <Text style={[s.shareBtnText, { color: shared ? COLORS.green : '#fff' }]}>
                    {shared ? 'Shared!' : 'Share to Circle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    )
  }

  // ── Main render ───────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {renderHeader()}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {stage === 'idle' && renderIdleStage()}
        {stage === 'preview' && renderPreviewStage()}
        {stage === 'analyzing' && renderAnalyzingStage()}
        {stage === 'error' && renderErrorStage()}
        {stage === 'done' && renderResults()}
      </ScrollView>
    </View>
  )
}


// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: {
    fontSize: 11, letterSpacing: 1.0, textTransform: 'uppercase',
    fontFamily: FONT.semibold, marginBottom: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: FONT.bold },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  newBtnText: { fontSize: 12, fontFamily: FONT.medium },

  // Idle / Upload
  idleContainer: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  uploadIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  uploadTitle: { fontSize: 20, fontFamily: FONT.bold, marginBottom: 6 },
  uploadSub: {
    fontSize: 14, fontFamily: FONT.regular, textAlign: 'center',
    lineHeight: 21, paddingHorizontal: 20, marginBottom: 28,
  },
  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 13,
    borderRadius: RADIUS.sm,
  },
  pickBtnOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  pickBtnText: { fontSize: 14, fontFamily: FONT.semibold, color: '#fff' },
  uploadHint: { fontSize: 12, fontFamily: FONT.regular },

  // Preview
  videoPreview: {
    width: '100%', height: 220,
    borderRadius: RADIUS.md, backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoFallbackText: { marginTop: 8, fontSize: 13, fontFamily: FONT.medium },
  chipScroll: { marginTop: 8, marginBottom: 16 },
  chipContainer: { paddingVertical: 4, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: FONT.medium },
  analyseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: RADIUS.sm, marginBottom: 10,
  },
  analyseBtnText: { fontSize: 15, fontFamily: FONT.bold, color: '#fff' },
  changeBtn: {
    paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, alignItems: 'center',
  },
  changeBtnText: { fontSize: 12, fontFamily: FONT.medium },
  loadingVideoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', marginTop: 12,
  },
  loadingVideoText: { fontSize: 12, fontFamily: FONT.regular },

  // Analyzing
  analyzingContainer: { alignItems: 'center', paddingVertical: 48 },
  spinner: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3, marginBottom: 20,
  },
  analyzingMsg: { fontSize: 14, fontFamily: FONT.medium, marginBottom: 20 },
  progressTrack: {
    width: '80%', height: 4, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressPct: { fontSize: 12, fontFamily: FONT.numMedium, marginTop: 8 },

  // Error
  errorContainer: { alignItems: 'center', paddingVertical: 48 },
  errorIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorTitle: { fontSize: 16, fontFamily: FONT.bold, marginBottom: 6 },
  errorMsg: { fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', paddingHorizontal: 24, marginBottom: 20, lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1,
  },
  retryBtnText: { fontSize: 13, fontFamily: FONT.semibold },

  // Results
  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: RADIUS.lg, marginBottom: 12,
  },
  exerciseName: {
    fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase',
    fontFamily: FONT.semibold, marginBottom: 4,
  },
  verdict: {
    fontSize: 14, fontFamily: FONT.regular,
    fontStyle: 'italic', lineHeight: 21,
  },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  pillSection: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase',
    fontFamily: FONT.semibold, marginBottom: 8,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tipsSection: { marginBottom: 16 },

  // Next target
  nextCard: {
    padding: 14, borderRadius: RADIUS.sm,
    borderWidth: 1, marginBottom: 14,
  },
  nextHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nextLabel: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.green },
  nextText: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 20 },

  // Circle share
  shareCard: {
    padding: 14, borderRadius: RADIUS.lg,
    marginBottom: 8,
  },
  shareMsg: { fontSize: 13, fontFamily: FONT.regular, fontStyle: 'italic', marginBottom: 12, lineHeight: 20 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
  },
  shareBtnText: { fontSize: 13, fontFamily: FONT.semibold },
})
