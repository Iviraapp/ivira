import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from '../components/PremiumAlert'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, ELITE_CARD_LIGHT, CARD_ACCENTS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { formatPaise } from '../lib/utils'
import Haptics from '../lib/haptics'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const FILTERS = ['All', 'Trainer', 'Dietitian', 'Physio', 'Classes']

const CATEGORY_ACCENTS = {
  Trainer: '#3B82F6',
  Dietitian: '#22C55E',
  Physio: '#8B5CF6',
  Classes: '#F59E0B',
}

const INTENSITY_COLORS = {
  High: { bg: '#EF444418', text: '#EF4444', label: 'HIGH' },
  Med: { bg: '#F59E0B18', text: '#F59E0B', label: 'MED' },
  Low: { bg: '#22C55E18', text: '#22C55E', label: 'LOW' },
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function generateDates() {
  const dates = []
  const today = new Date()
  for (let i = -1; i <= 12; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push({
      date: d,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 0,
      key: d.toISOString().split('T')[0],
    })
  }
  return dates
}

function DatePill({ item, selected, onPress, colors, isDark }) {
  return (
    <TouchableOpacity
      style={[styles.datePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, selected && styles.datePillSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.datePillDay, { color: colors.textTer }, selected && styles.datePillDaySelected]}>
        {item.dayName}
      </Text>
      <Text style={[styles.datePillNum, { color: colors.textSec }, selected && styles.datePillNumSelected]}>
        {item.dayNum}
      </Text>
      {item.isToday && (
        <View style={[styles.todayDot, selected && styles.todayDotSelected]} />
      )}
    </TouchableOpacity>
  )
}

function ClassCard({ item, onReserve, isReserving, isBooked, colors, isDark }) {
  const spotsLeft = item.totalSpots - item.bookedSpots
  const isFull = spotsLeft <= 0
  const intensity = INTENSITY_COLORS[item.intensity] || INTENSITY_COLORS.Med

  if (isBooked) {
    return (
      <View style={[styles.classCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.classCardInner}>
          <View style={styles.classTopRow}>
            <View style={styles.classTimeWrap}>
              <Text style={[styles.classTime, { color: colors.text }]}>{item.time}</Text>
              <Text style={[styles.classDuration, { color: colors.textTer }]}>{item.duration} min</Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: COLORS.green + '18' }]}>
              <Feather name="check" size={10} color={COLORS.green} />
              <Text style={[styles.difficultyText, { color: COLORS.green }]}>BOOKED</Text>
            </View>
          </View>
          <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.classTrainer, { color: colors.textSec }]}>{item.trainer}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.classCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={styles.classCardInner}>
        {/* Top row: time + difficulty badge */}
        <View style={styles.classTopRow}>
          <View style={styles.classTimeWrap}>
            <Text style={[styles.classTime, { color: colors.text }]}>{item.time}</Text>
            <Text style={[styles.classDuration, { color: colors.textTer }]}>{item.duration} min</Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: intensity.bg }]}>
            <Text style={[styles.difficultyText, { color: intensity.text }]}>{intensity.label}</Text>
          </View>
        </View>

        {/* Class name + trainer */}
        <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.classTrainer, { color: colors.textSec }]}>{item.trainer}</Text>

        {/* Bottom row: spots + reserve */}
        <View style={[styles.classBottomRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.spotsText, { color: colors.textTer }, isFull && { color: '#F87171' }]}>
            {isFull ? 'No spots available' : `${spotsLeft} spots left`}
          </Text>
          <TouchableOpacity
            style={[styles.reserveBtn, isFull && { backgroundColor: colors.bgTer }]}
            onPress={() => !isFull && !isReserving && onReserve(item)}
            activeOpacity={isFull || isReserving ? 1 : 0.7}
            disabled={isFull || isReserving}
          >
            {isReserving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.reserveBtnText, isFull && { color: colors.textTer }]}>
                {isFull ? 'Full' : 'Reserve'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function ProfessionalCard({ item, onPress, colors, isDark }) {
  const lowestPrice = item.services?.length
    ? Math.min(...item.services.map((s) => s.price_paise))
    : null

  const renderStars = (rating) => {
    const full = Math.floor(rating)
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Feather
          key={i}
          name="star"
          size={12}
          color={i < full ? COLORS.amber : colors.textTer}
          style={{ marginRight: 2 }}
        />
      )
    }
    return stars
  }

  return (
    <TouchableOpacity
      style={[styles.proCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.photoArea, { backgroundColor: colors.bgTer }]}>
        <Image
          source={{ uri: item.photo_url || `https://i.pravatar.cc/150?u=${item.id || item.name}` }}
          style={styles.photo}
        />
      </View>

      <View style={styles.proCardBody}>
        <Text style={[styles.proCardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>

        <View style={styles.specialtyRow}>
          {(item.specialties || []).slice(0, 2).map((s, i) => (
            <View key={i} style={[styles.specialtyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.specialtyText, { color: colors.textTer }]} numberOfLines={1}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ratingRow}>
          {renderStars(item.rating || 0)}
          <Text style={[styles.ratingText, { color: colors.textSec }]}>{item.rating?.toFixed(1) || '0.0'}</Text>
        </View>

        {lowestPrice !== null && (
          <Text style={styles.priceText}>From {formatPaise(lowestPrice)}/session</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

function ServiceCard({ item, onPress, colors, isDark, index }) {
  const accentColor = CATEGORY_ACCENTS[item.category] || CARD_ACCENTS[index % CARD_ACCENTS.length]

  const renderStars = (rating) => {
    const full = Math.floor(rating)
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Feather
          key={i}
          name="star"
          size={12}
          color={i < full ? COLORS.amber : colors.textTer}
          style={{ marginRight: 2 }}
        />
      )
    }
    return stars
  }

  return (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        isDark ? ELITE_CARD : ELITE_CARD_LIGHT,
        { borderTopWidth: 3, borderTopColor: accentColor },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.serviceCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serviceCardName, { color: colors.text }]} numberOfLines={1}>
            {item.serviceName}
          </Text>
          <View style={styles.serviceProviderRow}>
            <Feather name="user" size={12} color={colors.textSec} />
            <Text style={[styles.serviceProviderText, { color: colors.textSec }]} numberOfLines={1}>
              {item.providerName}
            </Text>
          </View>
        </View>
        <View style={[styles.serviceCategoryBadge, { backgroundColor: accentColor + '18' }]}>
          <Text style={[styles.serviceCategoryText, { color: accentColor }]}>{item.category}</Text>
        </View>
      </View>

      <View style={[styles.serviceCardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.serviceRatingRow}>
          {renderStars(item.rating || 0)}
          <Text style={[styles.serviceRatingText, { color: colors.textSec }]}>
            {item.rating?.toFixed(1) || '0.0'}
          </Text>
        </View>
        <Text style={[styles.servicePriceText, { color: COLORS.accent }]}>
          {formatPaise(item.price)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function MarketplaceScreen({ navigation, embedded = false }) {
  const { gymId, member } = useAuth()
  const { colors, isDark } = useTheme()
  const [professionals, setProfessionals] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [reservedIds, setReservedIds] = useState({})
  const [reservingId, setReservingId] = useState(null)

  // Date scroller state
  const dates = useMemo(() => generateDates(), [])
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = dates.find((d) => d.isToday)
    return today?.key || dates[1]?.key
  })
  const dateScrollRef = useRef(null)

  const fetchProfessionals = useCallback(async () => {
    if (!gymId) return
    try {
      const res = await api.get(`/gyms/${gymId}/trainers`)
      setProfessionals(res.data?.trainers || res.data || [])
    } catch (err) {
      premiumAlert('Error', 'Could not load professionals. Pull down to retry.')
    }
  }, [gymId])

  const fetchSessions = useCallback(async (date) => {
    if (!gymId) return
    try {
      const res = await api.get(`/gyms/${gymId}/sessions`, { params: { date } })
      const apiSessions = (res.data?.sessions || []).map((s) => ({
        id: s.id,
        name: s.class_name || 'Class',
        trainer: s.trainer_name || '',
        time: s.start_time?.slice(0, 5) || '',
        duration: s.duration_minutes || 60,
        intensity: 'Med',
        totalSpots: s.max_capacity || 20,
        bookedSpots: s.current_bookings || 0,
        category: 'Classes',
      }))
      setSessions(apiSessions)
    } catch (err) {
      console.warn('[Marketplace] fetchSessions:', err?.message)
      setSessions([])
    }
  }, [gymId])

  useEffect(() => {
    Promise.all([fetchProfessionals(), fetchSessions(selectedDate)])
      .finally(() => setLoading(false))
  }, [fetchProfessionals, fetchSessions, selectedDate])

  // Scroll to today on mount
  useEffect(() => {
    const todayIdx = dates.findIndex((d) => d.isToday)
    if (todayIdx > 0 && dateScrollRef.current) {
      setTimeout(() => {
        dateScrollRef.current?.scrollTo({ x: Math.max(0, (todayIdx - 1) * 60), animated: false })
      }, 100)
    }
  }, [dates])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchProfessionals(), fetchSessions(selectedDate)])
    setRefreshing(false)
  }, [fetchProfessionals, fetchSessions, selectedDate])

  const showClasses = selectedFilter === 'All' || selectedFilter === 'Classes'
  const showProfessionals = selectedFilter !== 'Classes'

  const filteredProfessionals = professionals.filter((p) => {
    if (selectedFilter === 'All') return true
    if (selectedFilter === 'Classes') return false
    return p.type?.toLowerCase() === selectedFilter.toLowerCase()
  })

  const handleReserve = useCallback(async (classItem) => {
    if (reservingId) return
    setReservingId(classItem.id)
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await api.post(`/gyms/${gymId}/sessions/${classItem.id}/reserve`, {
        memberId: member?.id,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setReservedIds((prev) => ({ ...prev, [classItem.id]: true }))
      fetchSessions(selectedDate)
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not reserve spot'
      premiumAlert('Booking Failed', msg)
    } finally {
      setReservingId(null)
    }
  }, [reservingId, gymId, member?.id, selectedDate, fetchSessions])

  const handleDateSelect = useCallback((key) => {
    setSelectedDate(key)
    fetchSessions(key)
    Haptics.selectionAsync()
  }, [fetchSessions])

  const serviceItems = useMemo(() => {
    if (!showProfessionals) return []
    const items = []
    filteredProfessionals.forEach((pro) => {
      if (pro.services?.length) {
        pro.services.forEach((svc) => {
          items.push({
            id: `${pro.id}-${svc.id || svc.name}`,
            serviceName: svc.name || 'Service',
            providerName: pro.name,
            price: svc.price_paise,
            rating: pro.rating || 0,
            category: pro.type
              ? pro.type.charAt(0).toUpperCase() + pro.type.slice(1).toLowerCase()
              : 'Trainer',
            professional: pro,
          })
        })
      } else {
        items.push({
          id: String(pro.id),
          serviceName: pro.specialties?.[0] || 'Consultation',
          providerName: pro.name,
          price: 0,
          rating: pro.rating || 0,
          category: pro.type
            ? pro.type.charAt(0).toUpperCase() + pro.type.slice(1).toLowerCase()
            : 'Trainer',
          professional: pro,
        })
      }
    })
    return items
  }, [filteredProfessionals, showProfessionals])

  const hasContent = (showClasses && sessions.length > 0) || (showProfessionals && filteredProfessionals.length > 0)

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, embedded && { paddingTop: 0 }]}>
      {/* Header — hidden when embedded in CommunityHubScreen */}
      {!embedded && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Services</Text>
        </View>
      )}

      {/* Filter tabs — anchored */}
      <View style={[styles.filterSection, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const selected = selectedFilter === f
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, selected && { backgroundColor: colors.accentSoft, borderColor: COLORS.accent }]}
                onPress={() => setSelectedFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: colors.textSec }, selected && styles.chipTextSelected]}>
                  {f}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Horizontal date picker — anchored below filters */}
        {showClasses && (
          <ScrollView
            ref={dateScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScrollContent}
            style={styles.dateScroll}
          >
            {dates.map((d) => (
              <DatePill
                key={d.key}
                item={d}
                selected={selectedDate === d.key}
                onPress={() => handleDateSelect(d.key)}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Main scrollable list */}
      <FlatList
        data={serviceItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ServiceCard
            item={item}
            index={index}
            onPress={() => navigation.navigate('ServiceDetail', { professional: item.professional })}
            colors={colors}
            isDark={isDark}
          />
        )}
        ListHeaderComponent={
          <>
            {/* Classes section */}
            {showClasses && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: colors.textTer }]}>AVAILABLE CLASSES</Text>
                {sessions.length > 0 ? (
                  sessions.map((item) => (
                    <ClassCard
                      key={item.id}
                      item={item}
                      onReserve={handleReserve}
                      isReserving={reservingId === item.id}
                      isBooked={!!reservedIds[item.id]}
                      colors={colors}
                      isDark={isDark}
                    />
                  ))
                ) : (
                  <View style={[styles.emptyDateContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={[styles.emptyDateIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <Feather name="calendar" size={28} color={colors.textTer} />
                    </View>
                    <Text style={[styles.emptyDateTitle, { color: colors.text }]}>No classes scheduled</Text>
                    <Text style={[styles.emptyDateSubtitle, { color: colors.textTer }]}>
                      Try selecting a different date above
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Services section label */}
            {showProfessionals && serviceItems.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: colors.textTer }]}>SERVICES</Text>
              </View>
            )}

            {!hasContent && (
              <View style={styles.emptyContainer}>
                <Feather name="briefcase" size={48} color={colors.textTer} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No services found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
                  {selectedFilter !== 'All'
                    ? 'Try a different filter'
                    : 'Services will appear here once added'}
                </Text>
              </View>
            )}
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      />
    </View>
  )
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    letterSpacing: -0.5,
  },

  // Anchored filter + date section
  filterSection: {
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md + 4,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },
  chipTextSelected: {
    color: COLORS.accent,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },

  // Date scroller
  dateScroll: {
    marginTop: SPACING.sm,
  },
  dateScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  datePill: {
    width: 52,
    height: 70,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  datePillSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  datePillDay: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
  },
  datePillDaySelected: {
    color: '#FFFFFF',
  },
  datePillNum: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT.numBold,
  },
  datePillNumSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent,
  },
  todayDotSelected: {
    backgroundColor: '#FFFFFF',
  },

  // Section
  sectionContainer: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
  },

  // Class cards
  classCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  classCardInner: {
    padding: 20,
  },
  classTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  classTimeWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  classTime: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  classDuration: {
    fontSize: 12,
    fontFamily: FONT.medium,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: FONT.bold,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT.bold,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  classTrainer: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  classBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: SPACING.md,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },
  reserveBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    minWidth: 90,
    alignItems: 'center',
  },
  reserveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT.bold,
  },

  // Empty state for date with no classes
  emptyDateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    borderRadius: 24,
    borderWidth: 1,
  },
  emptyDateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  emptyDateSubtitle: {
    fontSize: 13,
    marginTop: SPACING.xs,
    fontFamily: FONT.regular,
    lineHeight: 20,
  },

  // Professional grid
  proGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },

  // Professional Card
  proCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoArea: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  proCardBody: {
    padding: SPACING.md,
  },
  proCardName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
    marginBottom: SPACING.xs,
    letterSpacing: -0.2,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  specialtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: FONT.numMedium,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: FONT.bold,
  },

  // Service cards
  serviceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  serviceCardName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
    marginBottom: SPACING.xs,
  },
  serviceProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceProviderText: {
    fontSize: 13,
    fontFamily: FONT.medium,
  },
  serviceCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.sm,
  },
  serviceCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: FONT.bold,
    textTransform: 'uppercase',
  },
  serviceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: SPACING.md,
  },
  serviceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceRatingText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: FONT.numMedium,
  },
  servicePriceText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },

  // List
  listContent: {
    paddingTop: SPACING.lg,
    paddingBottom: 128,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: SPACING.md,
    fontFamily: FONT.semibold,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: SPACING.xs,
    textAlign: 'center',
    fontFamily: FONT.regular,
    lineHeight: 22,
  },
})
