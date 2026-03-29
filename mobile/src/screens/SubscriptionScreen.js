import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD, GLASS_CARD, SHADOW, CARD_ACCENTS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { premiumAlert } from '../components/PremiumAlert'

// ── Plan accent colors ──────────────────────────────────────────
const PLAN_COLORS = {
  free: '#94A3B8',
  basic: '#3B82F6',
  pro: '#8B5CF6',
  elite: '#F59E0B',
}

function getPlanColor(planName) {
  const key = (planName || '').toLowerCase()
  if (key.includes('elite')) return PLAN_COLORS.elite
  if (key.includes('pro')) return PLAN_COLORS.pro
  if (key.includes('basic') || key.includes('starter')) return PLAN_COLORS.basic
  return PLAN_COLORS.free
}

function getPlanRank(planName) {
  const key = (planName || '').toLowerCase()
  if (key.includes('free')) return 0
  if (key.includes('basic') || key.includes('starter')) return 1
  if (key.includes('pro')) return 2
  if (key.includes('elite') || key.includes('premium')) return 3
  return 1
}

function isPopularPlan(planName) {
  const key = (planName || '').toLowerCase()
  return key.includes('pro')
}

// ── Status badge ────────────────────────────────────────────────
function StatusBadge({ status, colors }) {
  const map = {
    active: { label: 'Active', bg: 'rgba(16,185,129,0.15)', color: '#34D399', icon: 'check-circle' },
    cancelled: { label: 'Cancelled', bg: 'rgba(248,113,113,0.15)', color: '#F87171', icon: 'x-circle' },
    past_due: { label: 'Past Due', bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', icon: 'alert-circle' },
    trialing: { label: 'Trial', bg: 'rgba(56,189,248,0.15)', color: '#38BDF8', icon: 'clock' },
  }
  const info = map[status] || { label: status || 'Unknown', bg: 'rgba(148,163,184,0.12)', color: colors.textSec, icon: 'help-circle' }

  return (
    <View style={[styles.badge, { backgroundColor: info.bg }]}>
      <Feather name={info.icon} size={12} color={info.color} />
      <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
    </View>
  )
}

// ── Current plan banner ─────────────────────────────────────────
function CurrentPlanBanner({ subscription, colors, card }) {
  if (!subscription) return null

  const planName = subscription.plan?.name || subscription.planName || 'No Plan'
  const accentColor = getPlanColor(planName)
  const renewalDate = subscription.current_period_end || subscription.renewalDate
  const formattedDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <View style={[styles.banner, card, { borderTopWidth: 3, borderTopColor: accentColor }]}>
      <View style={styles.bannerHeader}>
        <View style={styles.bannerLeft}>
          <Text style={[styles.bannerLabel, { color: colors.textSec }]}>Current Plan</Text>
          <Text style={[styles.bannerPlanName, { color: colors.text }]}>{planName}</Text>
        </View>
        <StatusBadge status={subscription.status} colors={colors} />
      </View>
      {formattedDate && (
        <View style={styles.bannerRenewal}>
          <Feather name="calendar" size={13} color={colors.textSec} />
          <Text style={[styles.bannerRenewalText, { color: colors.textSec }]}>
            {subscription.status === 'cancelled' ? 'Access until' : 'Renews'} {formattedDate}
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Feature row ─────────────────────────────────────────────────
function FeatureRow({ text, included, accentColor, colors }) {
  return (
    <View style={styles.featureRow}>
      <Feather
        name={included ? 'check' : 'x'}
        size={15}
        color={included ? accentColor : colors.textTer}
      />
      <Text style={[styles.featureText, { color: included ? colors.text : colors.textTer }]}>
        {text}
      </Text>
    </View>
  )
}

// ── Plan card ───────────────────────────────────────────────────
function PlanCard({ plan, isCurrent, currentRank, onSelect, loading, colors, card }) {
  const accentColor = getPlanColor(plan.name)
  const planRank = getPlanRank(plan.name)
  const popular = isPopularPlan(plan.name)
  const isFree = planRank === 0
  const price = plan.price || plan.amount || 0
  const interval = plan.interval || 'month'
  const features = plan.features || plan.feature_list || []

  let actionLabel = 'Select Plan'
  let actionIcon = 'arrow-right'
  if (isCurrent) {
    actionLabel = 'Current Plan'
    actionIcon = 'check'
  } else if (currentRank !== null && planRank > currentRank) {
    actionLabel = 'Upgrade'
    actionIcon = 'arrow-up-circle'
  } else if (currentRank !== null && planRank < currentRank) {
    actionLabel = 'Downgrade'
    actionIcon = 'arrow-down-circle'
  }

  const cardBorderStyle = isCurrent
    ? { borderWidth: 1.5, borderColor: COLORS.accent }
    : {}

  const glowStyle = popular && !isCurrent
    ? { shadowColor: accentColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 }
    : {}

  return (
    <View style={[styles.planCard, card, cardBorderStyle, glowStyle, { borderTopWidth: 3, borderTopColor: accentColor }]}>
      {/* Popular badge */}
      {popular && (
        <View style={[styles.popularBadge, { backgroundColor: accentColor }]}>
          <Feather name="star" size={11} color="#FFF" />
          <Text style={styles.popularBadgeText}>Popular</Text>
        </View>
      )}

      {/* Plan header */}
      <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
      {plan.description ? (
        <Text style={[styles.planDesc, { color: colors.textSec }]}>{plan.description}</Text>
      ) : null}

      {/* Price */}
      <View style={styles.priceRow}>
        {isFree ? (
          <Text style={[styles.priceAmount, { color: colors.textSec, fontFamily: FONT.numBold }]}>Free</Text>
        ) : (
          <>
            <Text style={[styles.priceCurrency, { color: accentColor }]}>$</Text>
            <Text style={[styles.priceAmount, { color: colors.text }]}>
              {typeof price === 'number' ? price.toLocaleString() : price}
            </Text>
            <Text style={[styles.priceInterval, { color: colors.textSec }]}>/{interval}</Text>
          </>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Features */}
      <View style={styles.featuresList}>
        {features.map((feature, idx) => {
          const text = typeof feature === 'string' ? feature : feature.name || feature.label || ''
          const included = typeof feature === 'string' ? true : feature.included !== false
          return (
            <FeatureRow
              key={idx}
              text={text}
              included={included}
              accentColor={accentColor}
              colors={colors}
            />
          )
        })}
        {features.length === 0 && (
          <Text style={[styles.noFeatures, { color: colors.textTer }]}>No feature details available</Text>
        )}
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={[
          styles.planButton,
          isCurrent
            ? { backgroundColor: 'rgba(16,185,129,0.12)' }
            : isFree
              ? { backgroundColor: colors.bgTer }
              : { backgroundColor: accentColor },
        ]}
        onPress={() => !isCurrent && onSelect(plan)}
        disabled={isCurrent || loading}
        activeOpacity={0.7}
      >
        {loading && !isCurrent ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Feather
              name={actionIcon}
              size={16}
              color={isCurrent ? COLORS.accent : isFree ? colors.text : '#FFF'}
            />
            <Text
              style={[
                styles.planButtonText,
                { color: isCurrent ? COLORS.accent : isFree ? colors.text : '#FFF' },
              ]}
            >
              {actionLabel}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ── Main screen ─────────────────────────────────────────────────
export default function SubscriptionScreen({ navigation }) {
  const { colors, card } = useTheme()
  const { member, gymId } = useAuth()

  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // planId being acted on
  const [error, setError] = useState(null)

  // ── Fetch data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!gymId) {
      setError('No gym selected. Please log in first.')
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get(`/gyms/${gymId}/subscription`).catch(() => null),
      ])
      const planData = plansRes.data?.plans || plansRes.data || []
      setPlans(Array.isArray(planData) ? planData : [])

      if (subRes?.data) {
        setSubscription(subRes.data?.subscription || subRes.data)
      } else {
        setSubscription(null)
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load subscription data.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  // ── Select / change plan ────────────────────────────────────
  const handleSelectPlan = useCallback(async (plan) => {
    const planRank = getPlanRank(plan.name)
    const currentRank = subscription ? getPlanRank(subscription.plan?.name || subscription.planName) : null
    const isDowngrade = currentRank !== null && planRank < currentRank

    const action = subscription ? 'change' : 'subscribe'
    const verb = isDowngrade ? 'downgrade to' : subscription ? 'upgrade to' : 'subscribe to'

    premiumAlert(
      `${isDowngrade ? 'Downgrade' : subscription ? 'Change' : 'Subscribe to'} ${plan.name}?`,
      `Are you sure you want to ${verb} the ${plan.name} plan?${
        isDowngrade ? '\n\nYou may lose access to some features.' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: isDowngrade ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(plan.id)
            try {
              if (action === 'change') {
                await api.patch(`/gyms/${gymId}/subscription`, { planId: plan.id })
              } else {
                await api.post(`/gyms/${gymId}/subscription`, { planId: plan.id })
              }
              await fetchData()
              premiumAlert('Success', `You are now on the ${plan.name} plan.`)
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Something went wrong.'
              premiumAlert('Error', msg)
            } finally {
              setActionLoading(null)
            }
          },
        },
      ]
    )
  }, [gymId, subscription, fetchData])

  // ── Cancel subscription ─────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (!subscription) return

    premiumAlert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('cancel')
            try {
              await api.delete(`/gyms/${gymId}/subscription`)
              await fetchData()
              premiumAlert('Subscription Cancelled', 'Your subscription has been cancelled.')
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Could not cancel subscription.'
              premiumAlert('Error', msg)
            } finally {
              setActionLoading(null)
            }
          },
        },
      ]
    )
  }, [gymId, subscription, fetchData])

  // ── Derived state ───────────────────────────────────────────
  const currentPlanId = subscription?.plan?.id || subscription?.planId || null
  const currentRank = subscription ? getPlanRank(subscription.plan?.name || subscription.planName) : null

  // Sort plans by rank
  const sortedPlans = [...plans].sort((a, b) => getPlanRank(a.name) - getPlanRank(b.name))

  // ── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading plans...</Text>
      </View>
    )
  }

  // ── Error state ─────────────────────────────────────────────
  if (error && plans.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Feather name="alert-triangle" size={40} color={COLORS.red} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.errorMsg, { color: colors.textSec }]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={16} color="#FFF" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.accent}
          colors={[COLORS.accent]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.bgTer }]}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSec }]}>Manage your plan</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Current plan banner */}
      <CurrentPlanBanner subscription={subscription} colors={colors} card={card} />

      {/* Plans section */}
      <View style={styles.sectionHeader}>
        <Feather name="layers" size={18} color={COLORS.accent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Plans</Text>
      </View>

      {sortedPlans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={plan.id === currentPlanId}
          currentRank={currentRank}
          onSelect={handleSelectPlan}
          loading={actionLoading === plan.id}
          colors={colors}
          card={card}
        />
      ))}

      {plans.length === 0 && (
        <View style={[styles.emptyCard, card, { borderTopWidth: 3, borderTopColor: CARD_ACCENTS[0] }]}>
          <Feather name="inbox" size={32} color={colors.textTer} />
          <Text style={[styles.emptyText, { color: colors.textSec }]}>No plans available at this time.</Text>
        </View>
      )}

      {/* Cancel subscription */}
      {subscription && subscription.status === 'active' && (
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.borderStrong }]}
          onPress={handleCancel}
          disabled={actionLoading === 'cancel'}
          activeOpacity={0.7}
        >
          {actionLoading === 'cancel' ? (
            <ActivityIndicator size="small" color={COLORS.red} />
          ) : (
            <>
              <Feather name="x-circle" size={16} color={COLORS.red} />
              <Text style={styles.cancelText}>Cancel Subscription</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.footer} />
    </ScrollView>
  )
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl + 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    marginTop: SPACING.md,
  },
  errorTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    marginTop: SPACING.md,
  },
  errorMsg: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    ...SHADOW.sm,
  },
  retryText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: '#FFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 20,
  },
  headerSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    marginTop: 2,
  },

  // Banner
  banner: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLeft: {
    flex: 1,
  },
  bannerLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerPlanName: {
    fontFamily: FONT.bold,
    fontSize: 22,
  },
  bannerRenewal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm + 4,
  },
  bannerRenewalText: {
    fontFamily: FONT.regular,
    fontSize: 13,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontFamily: FONT.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 17,
  },

  // Plan card
  planCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    position: 'relative',
    overflow: 'visible',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    zIndex: 1,
  },
  popularBadgeText: {
    fontFamily: FONT.semibold,
    fontSize: 11,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planName: {
    fontFamily: FONT.bold,
    fontSize: 19,
    marginBottom: 4,
  },
  planDesc: {
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceCurrency: {
    fontFamily: FONT.numBold,
    fontSize: 18,
    marginRight: 2,
  },
  priceAmount: {
    fontFamily: FONT.numBold,
    fontSize: 36,
    lineHeight: 40,
  },
  priceInterval: {
    fontFamily: FONT.regular,
    fontSize: 14,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  featuresList: {
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  featureText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  noFeatures: {
    fontFamily: FONT.regular,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    ...SHADOW.sm,
  },
  planButtonText: {
    fontFamily: FONT.semibold,
    fontSize: 15,
  },

  // Empty
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
  },

  // Cancel
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  cancelText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: COLORS.red,
  },

  // Footer
  footer: {
    height: 40,
  },
})
