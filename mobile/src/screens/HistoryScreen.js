import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Haptics from '../lib/haptics'

const { width } = Dimensions.get('window')

const FILTERS = ['All', 'Check-ins', 'Bookings']

const METHOD_COLORS = {
  NFC: '#3B82F6',
  QR: '#34D399',
  Manual: '#34A853',
  OTP: '#FBBC05',
}

function formatTime(iso) {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m} ${ampm}`
}

function formatDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function MethodBadge({ method }) {
  const { colors } = useTheme()
  const color = METHOD_COLORS[method] || colors.textSec
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={[styles.badgeText, { color }]}>{method}</Text>
    </View>
  )
}

function TimelineEntry({ item, isLast }) {
  const { colors } = useTheme()
  return (
    <View style={styles.timelineRow}>
      {/* Left connector */}
      <View style={styles.timelineLeft}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Card */}
      <View style={[styles.entryCard, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
        <View style={styles.entryHeader}>
          <View style={[styles.entryIconWrap, { backgroundColor: colors.accentSoft }]}>
            <Feather name="map-pin" size={16} color={COLORS.accent} />
          </View>
          <View style={styles.entryInfo}>
            <Text style={[styles.entryGym, { color: colors.text }]} numberOfLines={1}>{item.gym_name}</Text>
            <Text style={[styles.entryTime, { color: colors.textSec }]}>{formatTime(item.timestamp)}</Text>
          </View>
          <MethodBadge method={item.method} />
        </View>
        <View style={[styles.entryFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.entryDate, { color: colors.textTer }]}>{formatDate(item.timestamp)}</Text>
          {item.duration > 0 && (
            <Text style={[styles.entryDuration, { color: colors.textSec }]}>{item.duration} min</Text>
          )}
        </View>
      </View>
    </View>
  )
}

function EmptyState() {
  const { colors } = useTheme()
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.bgSec }]}>
        <Feather name="clock" size={48} color={colors.textTer} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No History Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTer }]}>Your check-ins and bookings will appear here</Text>
    </View>
  )
}

export default function HistoryScreen({ navigation }) {
  const { member, gymInfo } = useAuth()
  const { colors } = useTheme()
  const [filter, setFilter] = useState('All')
  const [entries, setEntries] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      const gymId = gymInfo?.id
      const memberId = member?.id
      if (gymId && memberId) {
        const res = await api.get(`/gyms/${gymId}/members/${memberId}/checkins`)
        if (res.data?.data?.length) {
          setEntries(res.data.data)
          return
        }
      }
    } catch {}
    // No data available
    setEntries([])
  }, [gymInfo, member])

  useEffect(() => {
    fetchHistory().finally(() => setLoading(false))
  }, [fetchHistory])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await fetchHistory()
    setRefreshing(false)
  }, [fetchHistory])

  const filteredEntries = entries.filter((e) => {
    if (filter === 'All') return true
    if (filter === 'Check-ins') return e.type === 'check-in'
    if (filter === 'Bookings') return e.type === 'booking'
    return true
  })

  const renderItem = useCallback(({ item, index }) => (
    <TimelineEntry item={item} isLast={index === filteredEntries.length - 1} />
  ), [filteredEntries.length])

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.bgSec }]}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, { backgroundColor: colors.bgSec, borderColor: colors.border }, filter === f && [styles.chipActive, { backgroundColor: colors.accentSoft }]]}
            onPress={() => {
              setFilter(f)
              Haptics.selectionAsync()
            }}
          >
            <Text style={[styles.chipText, { color: colors.textTer }, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeline list */}
      <FlatList
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgSec,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textTer,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginTop: 18,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(16,185,129,0.2)',
    marginTop: 4,
  },

  // Entry card
  entryCard: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgTer,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  entryGym: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  entryTime: {
    fontSize: 12,
    color: COLORS.textSec,
    marginTop: 2,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  entryDate: {
    fontSize: 12,
    color: COLORS.textTer,
  },
  entryDuration: {
    fontSize: 12,
    color: COLORS.textSec,
  },

  // Method badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textTer,
    textAlign: 'center',
  },
})
