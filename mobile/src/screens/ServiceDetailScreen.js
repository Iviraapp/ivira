import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from '../components/PremiumAlert'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { formatPaise } from '../lib/utils'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const TYPE_LABELS = {
  one_on_one: '1-on-1',
  group: 'Group',
  package: 'Package',
  consultation: 'Consultation',
}

const PRO_TYPE_LABELS = {
  trainer: 'Trainer',
  dietitian: 'Dietitian',
  physio: 'Physiotherapist',
}

export default function ServiceDetailScreen({ navigation, route }) {
  const { gymId } = useAuth()
  const { colors, isDark } = useTheme()
  const professional = route?.params?.professional

  if (!professional) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.textSec }]}>Professional not found</Text>
      </View>
    )
  }

  const handleBook = async (service) => {
    premiumAlert('Booking flow coming soon', 'Razorpay integration is in progress.')
  }

  const renderStars = (rating) => {
    const full = Math.floor(rating)
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Feather
          key={i}
          name="star"
          size={14}
          color={i < full ? COLORS.amber : colors.textTer}
          style={{ marginRight: 2 }}
        />
      )
    }
    return stars
  }

  const renderService = ({ item }) => (
    <View style={[styles.serviceCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={styles.serviceHeader}>
        <Text style={[styles.serviceTitle, { color: colors.text }]}>{item.title}</Text>
        <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.typeBadgeText, { color: colors.textSec }]}>
            {TYPE_LABELS[item.type] || item.type}
          </Text>
        </View>
      </View>

      {item.duration_minutes && (
        <View style={styles.durationRow}>
          <Feather name="clock" size={12} color={colors.textSec} />
          <Text style={[styles.durationText, { color: colors.textSec }]}>{item.duration_minutes} min</Text>
        </View>
      )}

      {item.description && (
        <Text style={[styles.serviceDescription, { color: colors.textTer }]}>{item.description}</Text>
      )}

      <View style={[styles.serviceFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <Text style={styles.servicePrice}>{formatPaise(item.price_paise)}</Text>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => handleBook(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.bookBtnText}>Pay & Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={22} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Professional header */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accentSoft }]}>
            <Text style={styles.avatarText}>
              {professional.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={[styles.proName, { color: colors.text }]}>{professional.name}</Text>

          <View style={[styles.proTypeBadge, { backgroundColor: colors.accentSoft }]}>
            <Text style={styles.proTypeBadgeText}>
              {PRO_TYPE_LABELS[professional.type] || professional.type}
            </Text>
          </View>

          <View style={styles.ratingRow}>
            {renderStars(professional.rating || 0)}
            <Text style={[styles.ratingText, { color: colors.textSec }]}>
              {professional.rating?.toFixed(1) || '0.0'}
            </Text>
          </View>

          {professional.bio && (
            <Text style={[styles.bioText, { color: colors.textSec }]}>{professional.bio}</Text>
          )}
        </View>

        {/* Specialties */}
        {professional.specialties?.length > 0 && (
          <View style={styles.specialtiesSection}>
            {professional.specialties.map((s, i) => (
              <View key={i} style={[styles.specialtyChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.specialtyChipText, { color: colors.textSec }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Services section */}
        <Text style={[styles.sectionTitle, { color: colors.textTer }]}>Services</Text>

        {(professional.services || []).map((service) => (
          <View key={service.id}>
            {renderService({ item: service })}
          </View>
        ))}

        {(!professional.services || professional.services.length === 0) && (
          <View style={styles.emptyServices}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              <Feather name="inbox" size={28} color={colors.textTer} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>No services listed yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTer }]}>Check back later for available bookings</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 128,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    fontFamily: FONT.regular,
  },

  // Back button
  backBtn: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.sm,
    paddingBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },

  // Profile section
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.accent + '40',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: FONT.bold,
  },
  proName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    fontFamily: FONT.bold,
    letterSpacing: -0.5,
  },
  proTypeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  proTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    fontFamily: FONT.semibold,
    letterSpacing: 0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: FONT.numMedium,
  },
  bioText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FONT.regular,
    paddingHorizontal: SPACING.md,
  },

  // Specialties
  specialtiesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  specialtyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  specialtyChipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },

  // Section title
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // Service card
  serviceCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: SPACING.sm,
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  durationText: {
    fontSize: 13,
    marginLeft: 6,
    fontFamily: FONT.regular,
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SPACING.md,
    fontFamily: FONT.regular,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: SPACING.md,
  },
  servicePrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.accent,
    fontFamily: FONT.numExtraBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  bookBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT.bold,
  },

  // Empty services
  emptyServices: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: SPACING.xs,
    fontFamily: FONT.regular,
    lineHeight: 20,
  },
})
