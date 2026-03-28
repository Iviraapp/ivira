import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS, SPACING, RADIUS, FONT, GLASS_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'

const STORAGE_KEY = '@ivira_daily_quote'

const FALLBACK_QUOTES = [
  { content: 'The only bad workout is the one that didn\'t happen.', author: null },
  { content: 'Take care of your body. It\'s the only place you have to live.', author: 'Jim Rohn' },
  { content: 'Strength does not come from the body. It comes from the will.', author: null },
  { content: 'The groundwork for all happiness is good health.', author: 'Leigh Hunt' },
  { content: 'Your body can stand almost anything. It\'s your mind that you have to convince.', author: null },
  { content: 'Fitness is not about being better than someone else. It\'s about being better than you used to be.', author: null },
  { content: 'The pain you feel today will be the strength you feel tomorrow.', author: null },
  { content: 'Don\'t limit your challenges. Challenge your limits.', author: null },
  { content: 'A healthy outside starts from the inside.', author: 'Robert Urich' },
  { content: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { content: 'It is health that is the real wealth and not pieces of gold and silver.', author: 'Mahatma Gandhi' },
  { content: 'The body achieves what the mind believes.', author: null },
  { content: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { content: 'To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.', author: 'Buddha' },
  { content: 'Success usually comes to those who are too busy to be looking for it.', author: 'Henry David Thoreau' },
  { content: 'Physical fitness is the first requisite of happiness.', author: 'Joseph Pilates' },
  { content: 'You don\'t have to be extreme, just consistent.', author: null },
  { content: 'The hard days are what make you stronger.', author: 'Aly Raisman' },
  { content: 'If you don\'t make time for exercise, you\'ll probably have to make time for illness.', author: 'Robin Sharma' },
  { content: 'Walking is the best possible exercise. Habituate yourself to walk very far.', author: 'Thomas Jefferson' },
  { content: 'The first wealth is health.', author: 'Ralph Waldo Emerson' },
  { content: 'Exercise is king. Nutrition is queen. Put them together and you\'ve got a kingdom.', author: 'Jack LaLanne' },
  { content: 'Movement is a medicine for creating change in a person\'s physical, emotional, and mental states.', author: 'Carol Welch' },
  { content: 'The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.', author: 'Arnold Schwarzenegger' },
  { content: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { content: 'Health is not valued till sickness comes.', author: 'Thomas Fuller' },
  { content: 'An active mind cannot exist in an inactive body.', author: 'George S. Patton' },
  { content: 'What hurts today makes you stronger tomorrow.', author: 'Jay Cutler' },
  { content: 'The clock is ticking. Are you becoming the person you want to be?', author: 'Greg Plitt' },
  { content: 'Rest when you\'re weary. Refresh and renew yourself, your body, your mind, your spirit. Then get back to work.', author: 'Ralph Marston' },
]

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getFallbackQuote() {
  // Deterministic pick based on day-of-year so it stays consistent all day
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / 86400000)
  return FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length]
}

async function fetchQuoteFromAPI() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(
      'https://api.quotable.io/quotes/random?tags=inspirational,motivational&limit=1',
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // API returns an array of quote objects: [{ content, author, ... }]
    const q = Array.isArray(data) ? data[0] : data
    if (!q || !q.content) throw new Error('Empty response')
    return { content: q.content, author: q.author || null }
  } catch {
    clearTimeout(timeout)
    return null
  }
}

export default function DailyQuote({ style }) {
  const { colors } = useTheme()
  const [quote, setQuote] = useState(null)
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const todayKey = getTodayKey()

      // Check cache first
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.date === todayKey && parsed.content) {
            if (!cancelled) {
              setQuote(parsed)
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }).start()
            }
            return
          }
        }
      } catch {
        // cache miss — continue
      }

      // Try API
      const apiQuote = await fetchQuoteFromAPI()
      const chosen = apiQuote || getFallbackQuote()
      const entry = { ...chosen, date: todayKey }

      // Persist
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
      } catch {
        // storage write failed — non-critical
      }

      if (!cancelled) {
        setQuote(entry)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }
    })()

    return () => { cancelled = true }
  }, [])

  if (!quote) return null

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.accentSoft || GLASS_CARD.backgroundColor, borderColor: colors.accent ? `${colors.accent}26` : GLASS_CARD.borderColor }, { opacity: fadeAnim }, style]}>
      {/* Decorative quote mark */}
      <Text style={[styles.quoteMark, { color: colors.accent || COLORS.accent }]}>{'\u201C'}</Text>

      <Text style={[styles.quoteText, { color: colors.text || COLORS.text }]}>
        {quote.content}
      </Text>

      {quote.author && (
        <Text style={[styles.author, { color: colors.textSec || COLORS.textSec }]}>
          {'\u2014'} {quote.author}
        </Text>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...GLASS_CARD,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  quoteMark: {
    position: 'absolute',
    top: -8,
    left: 12,
    fontSize: 72,
    fontFamily: FONT.bold,
    opacity: 0.12,
  },
  quoteText: {
    fontSize: 15,
    fontFamily: FONT.regular,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  author: {
    fontSize: 13,
    fontFamily: FONT.medium,
    textAlign: 'right',
    marginTop: SPACING.sm,
    opacity: 0.6,
  },
})
