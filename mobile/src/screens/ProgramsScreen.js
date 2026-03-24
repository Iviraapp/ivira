import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { formatPaise } from '../lib/utils'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['All', 'PT', 'Diet', 'Yoga']

function ProgramCard({ item, colors }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: colors.accentSoft }]}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
        <Text style={[styles.duration, { color: colors.textTer }]}>{item.duration}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.trainer, { color: colors.textSec }]}>{item.trainer}</Text>
      <Text style={[styles.description, { color: colors.textTer }]}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.price, { color: colors.text }]}>{formatPaise(item.price)}</Text>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            Alert.alert(
              'Booking',
              'Booking flow coming soon! Contact your gym front desk.'
            )
          }
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function ProgramsScreen() {
  const { gymId } = useAuth()
  const { colors, isDark } = useTheme()

  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')

  const fetchPrograms = useCallback(async () => {
    if (!gymId) return

    try {
      const res = await api.get(`/gyms/${gymId}/programs`)
      setPrograms(res.data?.programs || res.data || [])
    } catch {
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPrograms()
    setRefreshing(false)
  }, [fetchPrograms])

  const filtered =
    selectedCategory === 'All'
      ? programs
      : programs.filter((p) => p.type === selectedCategory)

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Programs & Services</Text>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, { backgroundColor: colors.bgTer }, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.textSec },
                selectedCategory === cat && { color: colors.text },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProgramCard item={item} colors={colors} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSec}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textTer }]}>No programs available</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },

  // Filter chips
  chipRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
    gap: SPACING.sm,
  },

  // Card
  card: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  trainer: {
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
})
