import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SOUNDSCAPES, SLEEP_COLORS } from './SleepConstants'

let Audio
try {
  Audio = require('expo-av').Audio
} catch {}

const TIMER_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
]

export default function SleepSoundscapes({ colors }) {
  const [playing, setPlaying] = useState(null) // soundscape id
  const [timer, setTimer] = useState(30) // minutes
  const [remaining, setRemaining] = useState(0) // seconds remaining
  const soundRef = useRef(null)
  const timerRef = useRef(null)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation when playing
  useEffect(() => {
    if (playing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [playing])

  // Countdown timer
  useEffect(() => {
    if (remaining > 0 && playing) {
      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            stopSound()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [remaining > 0, playing])

  const playSound = async (id) => {
    if (!Audio) return
    await stopSound()

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      })

      // Use bundled placeholder — in production these would be real audio assets
      // For now we generate a gentle tone using expo-av's capabilities
      const { sound } = await Audio.Sound.createAsync(
        // Placeholder: in production, map id to actual audio files
        // e.g., require(`../../../assets/sounds/${id}.mp3`)
        { uri: `https://cdn.pixabay.com/audio/2022/03/15/audio_4c0c74fcd0.mp3` },
        { isLooping: true, volume: 0.6 }
      )
      soundRef.current = sound
      await sound.playAsync()
      setPlaying(id)
      setRemaining(timer * 60)
    } catch (err) {
      console.warn('Failed to play soundscape:', err.message)
    }
  }

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
      } catch {}
      soundRef.current = null
    }
    setPlaying(null)
    setRemaining(0)
    clearInterval(timerRef.current)
  }

  const toggleSound = (id) => {
    if (playing === id) {
      stopSound()
    } else {
      playSound(id)
    }
  }

  const formatRemaining = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopSound() }
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="headphones" size={16} color={SLEEP_COLORS.primary} />
        <Text style={[styles.title, { color: colors?.text || '#FFF' }]}>Sleep Soundscapes</Text>
      </View>

      {/* Timer selector */}
      <View style={styles.timerRow}>
        <Feather name="clock" size={12} color="rgba(255,255,255,0.4)" />
        <Text style={styles.timerLabel}>Auto-stop:</Text>
        {TIMER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.minutes}
            style={[
              styles.timerPill,
              timer === opt.minutes && { backgroundColor: SLEEP_COLORS.primary + '25', borderColor: SLEEP_COLORS.primary },
            ]}
            onPress={() => setTimer(opt.minutes)}
          >
            <Text style={[
              styles.timerPillText,
              timer === opt.minutes && { color: SLEEP_COLORS.primary },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Soundscape grid */}
      <View style={styles.grid}>
        {SOUNDSCAPES.map(sc => {
          const isPlaying = playing === sc.id
          return (
            <TouchableOpacity
              key={sc.id}
              style={[
                styles.tile,
                isPlaying && { backgroundColor: sc.color + '18', borderColor: sc.color + '50' },
              ]}
              onPress={() => toggleSound(sc.id)}
              activeOpacity={0.7}
            >
              <Animated.View style={[
                styles.tileIconWrap,
                { backgroundColor: sc.color + (isPlaying ? '30' : '12') },
                isPlaying && { transform: [{ scale: pulseAnim }] },
              ]}>
                <Feather
                  name={isPlaying ? 'pause' : sc.icon}
                  size={20}
                  color={sc.color}
                />
              </Animated.View>
              <Text style={[styles.tileLabel, isPlaying && { color: sc.color }]}>
                {sc.label}
              </Text>
              {isPlaying && remaining > 0 && (
                <Text style={[styles.tileTimer, { color: sc.color }]}>
                  {formatRemaining(remaining)}
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  timerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginRight: 2 },
  timerPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  timerPillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%', aspectRatio: 1,
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 8,
  },
  tileIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  tileLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  tileTimer: { fontSize: 10, fontWeight: '700' },
})
