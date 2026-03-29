import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from '../components/PremiumAlert'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, GLASS_CARD, SHADOW, CARD_ACCENTS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PAGE_SIZE = 15

const POPULAR_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune']

// ─── Star Rating ────────────────────────────────────────────────────────────
function StarRating({ rating = 0, size = 14, color = COLORS.amber }) {
  const stars = []
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Feather key={i} name="star" size={size} color={color} />)
    } else if (i === full && half) {
      stars.push(<Feather key={i} name="star" size={size} color={color} style={{ opacity: 0.5 }} />)
    } else {
      stars.push(<Feather key={i} name="star" size={size} color={color} style={{ opacity: 0.2 }} />)
    }
  }
  return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>
}

// ─── Amenity Pill ───────────────────────────────────────────────────────────
function AmenityPill({ label, colors }) {
  return (
    <View style={[styles.amenityPill, { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.amenityText, { color: colors.accent }]}>{label}</Text>
    </View>
  )
}

// ─── Skeleton Card ──────────────────────────────────────────────────────────
function SkeletonCard({ colors, index }) {
  const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length]
  return (
    <View style={[styles.gymCard, { backgroundColor: colors.bgSec, borderTopColor: accentColor }]}>
      <View style={[styles.skeletonLine, { width: '60%', height: 18, backgroundColor: colors.bgTer }]} />
      <View style={[styles.skeletonLine, { width: '40%', height: 14, backgroundColor: colors.bgTer, marginTop: 8 }]} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={[styles.skeletonLine, { width: 60, height: 22, borderRadius: RADIUS.full, backgroundColor: colors.bgTer }]} />
        <View style={[styles.skeletonLine, { width: 50, height: 22, borderRadius: RADIUS.full, backgroundColor: colors.bgTer }]} />
        <View style={[styles.skeletonLine, { width: 70, height: 22, borderRadius: RADIUS.full, backgroundColor: colors.bgTer }]} />
      </View>
      <View style={[styles.skeletonLine, { width: '30%', height: 14, backgroundColor: colors.bgTer, marginTop: 12 }]} />
    </View>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ colors }) {
  return (
    <View style={styles.emptyContainer}>
      <Feather name="map-pin" size={48} color={colors.textTer} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No gyms found nearby</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
        Try searching in a different area or city
      </Text>
    </View>
  )
}

// ─── Review Card ────────────────────────────────────────────────────────────
function ReviewCard({ review, colors }) {
  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.bgTer }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewAvatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.reviewAvatarText, { color: colors.accent }]}>
            {(review.memberName || 'A')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewName, { color: colors.text }]}>{review.memberName || 'Anonymous'}</Text>
          <StarRating rating={review.rating} size={12} />
        </View>
        <Text style={[styles.reviewDate, { color: colors.textTer }]}>
          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
        </Text>
      </View>
      {review.comment ? (
        <Text style={[styles.reviewComment, { color: colors.textSec }]}>{review.comment}</Text>
      ) : null}
    </View>
  )
}

// ─── Gym Card ───────────────────────────────────────────────────────────────
function GymCard({ gym, index, onPress, colors, card, isDark }) {
  const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const amenities = gym.amenities || []
  const displayAmenities = amenities.slice(0, 4)
  const extraCount = amenities.length - 4

  return (
    <TouchableOpacity
      style={[
        styles.gymCard,
        card,
        {
          borderTopColor: accentColor,
          borderTopWidth: 3,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.gymCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gymName, { color: colors.text }]} numberOfLines={1}>
            {gym.name || gym.gymName}
          </Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={colors.textSec} />
            <Text style={[styles.gymArea, { color: colors.textSec }]} numberOfLines={1}>
              {[gym.area, gym.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <StarRating rating={gym.rating || 0} size={12} />
          {gym.rating ? (
            <Text style={[styles.ratingText, { color: colors.amber || COLORS.amber }]}>
              {Number(gym.rating).toFixed(1)}
            </Text>
          ) : null}
        </View>
      </View>

      {displayAmenities.length > 0 && (
        <View style={styles.amenitiesRow}>
          {displayAmenities.map((a, i) => (
            <AmenityPill key={i} label={typeof a === 'string' ? a : a.name} colors={colors} />
          ))}
          {extraCount > 0 && (
            <Text style={[styles.moreAmenities, { color: colors.textTer }]}>+{extraCount}</Text>
          )}
        </View>
      )}

      <View style={styles.gymCardFooter}>
        {gym.timings && (
          <View style={styles.timingRow}>
            <Feather name="clock" size={12} color={colors.textTer} />
            <Text style={[styles.timingText, { color: colors.textTer }]}>{gym.timings}</Text>
          </View>
        )}
        {gym.dayPassPrice != null && gym.dayPassPrice > 0 && (
          <View style={[styles.dayPassBadge, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.dayPassLabel, { color: colors.accent }]}>
              Day Pass
            </Text>
            <Text style={[styles.dayPassPrice, { color: colors.accent }]}>
              {'\u20B9'}{gym.dayPassPrice}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Day Pass Form ──────────────────────────────────────────────────────────
function DayPassForm({ gym, colors, isDark, member, onClose, onSuccess }) {
  const [buyerName, setBuyerName] = useState(member?.name || '')
  const [buyerPhone, setBuyerPhone] = useState(member?.phone || '')
  const [validDate, setValidDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState(false)

  const handlePurchase = async () => {
    if (!buyerName.trim()) {
      premiumAlert('Required', 'Please enter your name')
      return
    }
    if (!buyerPhone.trim() || buyerPhone.replace(/\D/g, '').length < 10) {
      premiumAlert('Required', 'Please enter a valid phone number')
      return
    }
    if (!validDate) {
      premiumAlert('Required', 'Please select a date')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/discover/gyms/${gym.id || gym._id}/day-pass`, {
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        validDate,
      })
      premiumAlert('Success', `Day pass purchased for ${validDate}!`, [
        { text: 'OK', onPress: onSuccess },
      ])
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to purchase day pass'
      premiumAlert('Error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Generate next 7 days for date selection
  const dateOptions = useMemo(() => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push({
        value: d.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      })
    }
    return dates
  }, [])

  return (
    <View style={styles.dayPassForm}>
      <Text style={[styles.formTitle, { color: colors.text }]}>Buy Day Pass</Text>
      <Text style={[styles.formSubtitle, { color: colors.textSec }]}>
        {gym.name || gym.gymName} {'\u2022'} {'\u20B9'}{gym.dayPassPrice}
      </Text>

      <Text style={[styles.inputLabel, { color: colors.textSec }]}>Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
        value={buyerName}
        onChangeText={setBuyerName}
        placeholder="Your full name"
        placeholderTextColor={colors.textTer}
        autoCapitalize="words"
      />

      <Text style={[styles.inputLabel, { color: colors.textSec }]}>Phone</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.bgTer, color: colors.text, borderColor: colors.border }]}
        value={buyerPhone}
        onChangeText={setBuyerPhone}
        placeholder="10-digit phone number"
        placeholderTextColor={colors.textTer}
        keyboardType="phone-pad"
        maxLength={13}
      />

      <Text style={[styles.inputLabel, { color: colors.textSec }]}>Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePickerRow}>
        {dateOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.datePillChoice,
              { backgroundColor: colors.bgTer, borderColor: colors.border },
              validDate === opt.value && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
            ]}
            onPress={() => setValidDate(opt.value)}
          >
            <Text
              style={[
                styles.datePillChoiceText,
                { color: colors.textSec },
                validDate === opt.value && { color: colors.accent },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.purchaseButton, { backgroundColor: colors.accent, opacity: submitting ? 0.6 : 1 }]}
        onPress={handlePurchase}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Feather name="credit-card" size={18} color="#fff" />
            <Text style={styles.purchaseButtonText}>Pay {'\u20B9'}{gym.dayPassPrice}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ─── Gym Profile Modal ──────────────────────────────────────────────────────
function GymProfileModal({ gym, visible, onClose, colors, isDark, member }) {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [showDayPassForm, setShowDayPassForm] = useState(false)
  const [reviewPage, setReviewPage] = useState(1)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)

  useEffect(() => {
    if (visible && gym) {
      fetchProfile()
      fetchReviews(1)
      setShowDayPassForm(false)
    }
    return () => {
      setProfile(null)
      setReviews([])
      setReviewPage(1)
    }
  }, [visible, gym?.id || gym?._id])

  const gymId = gym?.id || gym?._id

  const fetchProfile = async () => {
    if (!gymId) return
    setLoadingProfile(true)
    try {
      const res = await api.get(`/discover/gyms/${gymId}`)
      setProfile(res.data?.gym || res.data)
    } catch (err) {
      console.warn('[GymDiscovery] fetchProfile:', err?.message)
    } finally {
      setLoadingProfile(false)
    }
  }

  const fetchReviews = async (page) => {
    if (!gymId) return
    setLoadingReviews(true)
    try {
      const res = await api.get(`/discover/gyms/${gymId}/reviews`, {
        params: { page, limit: 10 },
      })
      const data = res.data?.reviews || res.data || []
      if (page === 1) {
        setReviews(data)
      } else {
        setReviews((prev) => [...prev, ...data])
      }
      setHasMoreReviews(data.length >= 10)
      setReviewPage(page)
    } catch (err) {
      console.warn('[GymDiscovery] fetchReviews:', err?.message)
    } finally {
      setLoadingReviews(false)
    }
  }

  const displayGym = profile || gym
  const amenities = displayGym?.amenities || []
  const hasDayPass = displayGym?.dayPassPrice != null && displayGym?.dayPassPrice > 0

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
            {displayGym?.name || displayGym?.gymName || 'Gym Profile'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {loadingProfile ? (
              <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Gym Info */}
                <View style={styles.profileSection}>
                  <View style={styles.profileNameRow}>
                    <View style={[styles.profileIcon, { backgroundColor: colors.accentSoft }]}>
                      <Feather name="home" size={24} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.profileGymName, { color: colors.text }]}>
                        {displayGym?.name || displayGym?.gymName}
                      </Text>
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={13} color={colors.textSec} />
                        <Text style={[styles.profileArea, { color: colors.textSec }]}>
                          {[displayGym?.area, displayGym?.city].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Rating */}
                  {displayGym?.rating != null && (
                    <View style={styles.profileRatingRow}>
                      <StarRating rating={displayGym.rating} size={16} />
                      <Text style={[styles.profileRatingValue, { color: COLORS.amber }]}>
                        {Number(displayGym.rating).toFixed(1)}
                      </Text>
                      {displayGym.reviewCount != null && (
                        <Text style={[styles.profileReviewCount, { color: colors.textTer }]}>
                          ({displayGym.reviewCount} reviews)
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Description */}
                  {displayGym?.description ? (
                    <Text style={[styles.profileDescription, { color: colors.textSec }]}>
                      {displayGym.description}
                    </Text>
                  ) : null}
                </View>

                {/* Timings */}
                {displayGym?.timings && (
                  <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
                    <Feather name="clock" size={16} color={colors.textSec} />
                    <Text style={[styles.infoText, { color: colors.text }]}>{displayGym.timings}</Text>
                  </View>
                )}

                {/* Phone */}
                {displayGym?.phone && (
                  <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
                    <Feather name="phone" size={16} color={colors.textSec} />
                    <Text style={[styles.infoText, { color: colors.text }]}>{displayGym.phone}</Text>
                  </View>
                )}

                {/* Address */}
                {displayGym?.address && (
                  <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
                    <Feather name="navigation" size={16} color={colors.textSec} />
                    <Text style={[styles.infoText, { color: colors.text }]}>{displayGym.address}</Text>
                  </View>
                )}

                {/* Amenities */}
                {amenities.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Amenities</Text>
                    <View style={styles.amenitiesWrap}>
                      {amenities.map((a, i) => (
                        <AmenityPill key={i} label={typeof a === 'string' ? a : a.name} colors={colors} />
                      ))}
                    </View>
                  </View>
                )}

                {/* Day Pass */}
                {hasDayPass && (
                  <View style={styles.profileSection}>
                    {showDayPassForm ? (
                      <DayPassForm
                        gym={displayGym}
                        colors={colors}
                        isDark={isDark}
                        member={member}
                        onClose={() => setShowDayPassForm(false)}
                        onSuccess={() => {
                          setShowDayPassForm(false)
                          onClose()
                        }}
                      />
                    ) : (
                      <TouchableOpacity
                        style={[styles.dayPassButton, { backgroundColor: colors.accent }]}
                        onPress={() => setShowDayPassForm(true)}
                        activeOpacity={0.8}
                      >
                        <Feather name="zap" size={18} color="#fff" />
                        <Text style={styles.dayPassButtonText}>
                          Buy Day Pass {'\u2022'} {'\u20B9'}{displayGym.dayPassPrice}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Reviews */}
                <View style={styles.profileSection}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Reviews</Text>
                  {reviews.length === 0 && !loadingReviews && (
                    <Text style={[styles.noReviews, { color: colors.textTer }]}>No reviews yet</Text>
                  )}
                  {reviews.map((r, i) => (
                    <ReviewCard key={r.id || r._id || i} review={r} colors={colors} />
                  ))}
                  {loadingReviews && (
                    <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
                  )}
                  {hasMoreReviews && !loadingReviews && (
                    <TouchableOpacity
                      style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                      onPress={() => fetchReviews(reviewPage + 1)}
                    >
                      <Text style={[styles.loadMoreText, { color: colors.accent }]}>Load more reviews</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function GymDiscoveryScreen({ navigation }) {
  const { colors, card, isDark } = useTheme()
  const { member } = useAuth()

  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [searchCity, setSearchCity] = useState('')
  const [searchArea, setSearchArea] = useState('')
  const [activeCity, setActiveCity] = useState('')
  const [activeArea, setActiveArea] = useState('')

  const [selectedGym, setSelectedGym] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  const searchTimeoutRef = useRef(null)

  // ── Fetch gyms ─────────────────────────────────────────────────────────
  const fetchGyms = useCallback(async (pageNum = 1, city = activeCity, area = activeArea, append = false) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = { page: pageNum, limit: PAGE_SIZE }
      if (city) params.city = city
      if (area) params.area = area

      const res = await api.get('/discover/gyms', { params })
      const data = res.data?.gyms || res.data?.data || res.data || []
      const gymList = Array.isArray(data) ? data : []

      if (append) {
        setGyms((prev) => [...prev, ...gymList])
      } else {
        setGyms(gymList)
      }

      setHasMore(gymList.length >= PAGE_SIZE)
      setPage(pageNum)
    } catch (err) {
      console.warn('[GymDiscovery] fetchGyms:', err?.message)
      if (!append) setGyms([])
      if (pageNum === 1) {
        const msg = err?.response?.data?.message || 'Could not load gyms. Please try again.'
        premiumAlert('Error', msg)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }, [activeCity, activeArea])

  // Initial load
  useEffect(() => {
    fetchGyms(1, activeCity, activeArea, false)
  }, [activeCity, activeArea])

  // ── Search debounce ────────────────────────────────────────────────────
  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss()
    setActiveCity(searchCity.trim())
    setActiveArea(searchArea.trim())
  }, [searchCity, searchArea])

  const handleCityPillPress = useCallback((city) => {
    setSearchCity(city)
    setSearchArea('')
    setActiveCity(city)
    setActiveArea('')
  }, [])

  // ── Pull to refresh ────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchGyms(1, activeCity, activeArea, false)
  }, [activeCity, activeArea, fetchGyms])

  // ── Load more ──────────────────────────────────────────────────────────
  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchGyms(page + 1, activeCity, activeArea, true)
    }
  }, [loadingMore, hasMore, loading, page, activeCity, activeArea, fetchGyms])

  // ── Open gym profile ──────────────────────────────────────────────────
  const openGymProfile = useCallback((gym) => {
    setSelectedGym(gym)
    setModalVisible(true)
  }, [])

  const closeGymProfile = useCallback(() => {
    setModalVisible(false)
    setSelectedGym(null)
  }, [])

  // ── Render gym card ───────────────────────────────────────────────────
  const renderGymItem = useCallback(({ item, index }) => (
    <GymCard
      gym={item}
      index={index}
      onPress={() => openGymProfile(item)}
      colors={colors}
      card={card}
      isDark={isDark}
    />
  ), [colors, card, isDark, openGymProfile])

  const keyExtractor = useCallback((item, index) => item.id || item._id || `gym-${index}`, [])

  // ── List header (search + filters) ────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.textTer} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchCity}
          onChangeText={setSearchCity}
          placeholder="City"
          placeholderTextColor={colors.textTer}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchArea}
          onChangeText={setSearchArea}
          placeholder="Area (optional)"
          placeholderTextColor={colors.textTer}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        <TouchableOpacity onPress={handleSearchSubmit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-right" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* City pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cityPillsContainer}
      >
        {POPULAR_CITIES.map((city) => (
          <TouchableOpacity
            key={city}
            style={[
              styles.cityPill,
              { backgroundColor: colors.bgTer, borderColor: colors.border },
              activeCity === city && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
            ]}
            onPress={() => handleCityPillPress(city)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.cityPillText,
                { color: colors.textSec },
                activeCity === city && { color: colors.accent },
              ]}
            >
              {city}
            </Text>
          </TouchableOpacity>
        ))}
        {activeCity && !POPULAR_CITIES.includes(activeCity) && (
          <TouchableOpacity
            style={[styles.cityPill, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.cityPillText, { color: colors.accent }]}>{activeCity}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Active filters indicator */}
      {(activeCity || activeArea) ? (
        <View style={styles.filterIndicator}>
          <Text style={[styles.filterText, { color: colors.textSec }]}>
            {[activeCity, activeArea].filter(Boolean).join(' / ')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchCity('')
              setSearchArea('')
              setActiveCity('')
              setActiveArea('')
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x-circle" size={16} color={colors.textTer} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  ), [searchCity, searchArea, activeCity, activeArea, colors, isDark, handleSearchSubmit, handleCityPillPress])

  // ── Footer ────────────────────────────────────────────────────────────
  const ListFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      )
    }
    return null
  }, [loadingMore, colors])

  // ── Skeletons ─────────────────────────────────────────────────────────
  if (loading && gyms.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Discover Gyms</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSec }]}>Find & visit gyms near you</Text>
        </View>
        {ListHeader}
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} colors={colors} index={i} />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Screen header */}
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Discover Gyms</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textSec }]}>Find & visit gyms near you</Text>
      </View>

      <FlatList
        data={gyms}
        renderItem={renderGymItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<EmptyState colors={colors} />}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />

      {/* Gym Profile Modal */}
      <GymProfileModal
        gym={selectedGym}
        visible={modalVisible}
        onClose={closeGymProfile}
        colors={colors}
        isDark={isDark}
        member={member}
      />
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.sm,
  },
  screenTitle: {
    fontFamily: FONT.bold,
    fontSize: 26,
    lineHeight: 32,
  },
  screenSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },

  // Search
  listHeader: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm + 4,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    height: 24,
  },

  // City pills
  cityPillsContainer: {
    paddingVertical: SPACING.sm + 4,
    gap: 8,
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  cityPillText: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },

  // Filter indicator
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  filterText: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },

  // List
  listContent: {
    paddingBottom: 100,
  },

  // Gym card
  gymCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm + 4,
    padding: SPACING.md,
    borderRadius: ELITE_CARD.borderRadius,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  gymCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gymName: {
    fontFamily: FONT.semibold,
    fontSize: 17,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  gymArea: {
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  ratingText: {
    fontFamily: FONT.numSemibold || FONT.semibold,
    fontSize: 13,
  },

  // Amenities
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  amenityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  amenityText: {
    fontFamily: FONT.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  moreAmenities: {
    fontFamily: FONT.medium,
    fontSize: 11,
    lineHeight: 22,
    paddingHorizontal: 4,
  },

  // Footer
  gymCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timingText: {
    fontFamily: FONT.regular,
    fontSize: 12,
  },
  dayPassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  dayPassLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
  },
  dayPassPrice: {
    fontFamily: FONT.numSemibold || FONT.semibold,
    fontSize: 13,
    lineHeight: 16,
  },

  // Skeleton
  skeletonList: {
    paddingHorizontal: 0,
    paddingTop: SPACING.sm,
  },
  skeletonLine: {
    borderRadius: 6,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: FONT.semibold,
    fontSize: 18,
  },
  emptySubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // ── Modal ────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FONT.semibold,
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalContent: {
    paddingBottom: 60,
  },

  // Profile sections
  profileSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileGymName: {
    fontFamily: FONT.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  profileArea: {
    fontFamily: FONT.regular,
    fontSize: 14,
  },
  profileRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    marginTop: 14,
  },
  profileRatingValue: {
    fontFamily: FONT.numSemibold || FONT.semibold,
    fontSize: 16,
  },
  profileReviewCount: {
    fontFamily: FONT.regular,
    fontSize: 13,
  },
  profileDescription: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  infoText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    flex: 1,
  },

  // Amenities wrap
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },

  // Section label
  sectionLabel: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginBottom: 4,
  },

  // Day pass button
  dayPassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  dayPassButtonText: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    color: '#fff',
  },

  // Day pass form
  dayPassForm: {
    marginTop: 4,
  },
  formTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
  },
  formSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: FONT.medium,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontFamily: FONT.regular,
    fontSize: 15,
  },
  datePickerRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  datePillChoice: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: 8,
  },
  datePillChoiceText: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: 20,
  },
  purchaseButtonText: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    color: '#fff',
  },

  // Reviews
  noReviews: {
    fontFamily: FONT.regular,
    fontSize: 14,
    marginTop: 8,
  },
  reviewCard: {
    borderRadius: RADIUS.sm,
    padding: 12,
    marginTop: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontFamily: FONT.semibold,
    fontSize: 15,
  },
  reviewName: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    marginBottom: 2,
  },
  reviewDate: {
    fontFamily: FONT.regular,
    fontSize: 11,
  },
  reviewComment: {
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  // Load more
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  loadMoreText: {
    fontFamily: FONT.medium,
    fontSize: 14,
  },
})
