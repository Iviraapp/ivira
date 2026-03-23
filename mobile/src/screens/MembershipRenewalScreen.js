import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Linking, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { COLORS, FONT, SPACING, RADIUS } from '../lib/theme'
import api from '../lib/api'

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(paise) {
  if (!paise && paise !== 0) return '---'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

function formatDate(dateStr) {
  if (!dateStr) return '---'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const end = new Date(dateStr)
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return COLORS.green
    case 'expired': return COLORS.red
    case 'paused': return COLORS.amber
    default: return COLORS.textSec
  }
}

// ── Membership Card ───────────────────────────────────────────────

function MembershipCard({ membership, colors }) {
  const status = membership.status || 'unknown'
  const daysLeft = daysUntil(membership.end_date)
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0
  const isExpired = status === 'expired' || (daysLeft !== null && daysLeft <= 0)
  const statusColor = isExpired ? COLORS.red : isExpiringSoon ? COLORS.amber : getStatusColor(status)

  return (
    <View style={[styles.card, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      {/* Status ribbon */}
      <View style={[styles.statusRibbon, { backgroundColor: statusColor + '18' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {isExpired ? 'Expired' : isExpiringSoon ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>

      {/* Plan name */}
      <Text style={[styles.planName, { color: colors.text }]}>
        {membership.plan_name || 'Membership'}
      </Text>

      {/* Gym name */}
      {membership.gym_name && (
        <Text style={[styles.gymName, { color: colors.textSec }]}>
          {membership.gym_name}
        </Text>
      )}

      {/* Dates row */}
      <View style={styles.datesRow}>
        <View style={styles.dateBlock}>
          <Feather name="calendar" size={14} color={colors.textTer} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.dateLabel, { color: colors.textTer }]}>Started</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(membership.start_date)}</Text>
          </View>
        </View>
        <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />
        <View style={styles.dateBlock}>
          <Feather name="clock" size={14} color={isExpired ? COLORS.red : isExpiringSoon ? COLORS.amber : colors.textTer} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.dateLabel, { color: colors.textTer }]}>
              {isExpired ? 'Expired on' : 'Expires'}
            </Text>
            <Text style={[styles.dateValue, { color: isExpired ? COLORS.red : isExpiringSoon ? COLORS.amber : colors.text }]}>
              {formatDate(membership.end_date)}
            </Text>
          </View>
        </View>
      </View>

      {/* Amount */}
      {membership.amount_paid != null && (
        <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.amountLabel, { color: colors.textSec }]}>Amount Paid</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(membership.amount_paid)}</Text>
        </View>
      )}
    </View>
  )
}

// ── Payment History Item ──────────────────────────────────────────

function PaymentItem({ payment, colors }) {
  const isSuccess = payment.status === 'captured' || payment.status === 'paid'
  const isFailed = payment.status === 'failed'
  const statusColor = isSuccess ? COLORS.green : isFailed ? COLORS.red : COLORS.amber

  return (
    <View style={[styles.paymentItem, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
      <View style={[styles.paymentIcon, { backgroundColor: statusColor + '18' }]}>
        <Feather
          name={isSuccess ? 'check-circle' : isFailed ? 'x-circle' : 'clock'}
          size={18}
          color={statusColor}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.paymentDesc, { color: colors.text }]}>
          {payment.description || 'Membership Payment'}
        </Text>
        <Text style={[styles.paymentDate, { color: colors.textTer }]}>
          {formatDate(payment.created_at)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.paymentAmount, { color: colors.text }]}>
          {formatCurrency(payment.amount)}
        </Text>
        <Text style={[styles.paymentStatus, { color: statusColor }]}>
          {isSuccess ? 'Paid' : isFailed ? 'Failed' : payment.status}
        </Text>
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────

export default function MembershipRenewalScreen({ navigation }) {
  const { colors } = useTheme()
  const { member, gymId } = useAuth()
  const memberId = member?.id
  const insets = useSafeAreaInsets()

  const [membership, setMembership] = useState(null)
  const [payments, setPayments] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [memberRes, paymentRes, planRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${memberId}`).catch(() => null),
        api.get(`/gyms/${gymId}/payments?limit=20`).catch(() => null),
        api.get(`/gyms/${gymId}/plans`).catch(() => null),
      ])

      if (memberRes?.data?.membership) {
        setMembership(memberRes.data.membership)
      } else if (memberRes?.data?.memberships?.length > 0) {
        // Take the most recent membership
        const sorted = memberRes.data.memberships.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
        setMembership(sorted[0])
      }

      if (paymentRes?.data?.payments) {
        setPayments(paymentRes.data.payments)
      } else if (Array.isArray(paymentRes?.data)) {
        setPayments(paymentRes.data)
      }

      if (planRes?.data?.plans) {
        setPlans(planRes.data.plans)
      } else if (Array.isArray(planRes?.data)) {
        setPlans(planRes.data)
      }
    } catch (err) {
      console.error('Failed to fetch membership data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gymId, memberId])

  useEffect(() => {
    if (gymId && memberId) fetchData()
    else setLoading(false)
  }, [gymId, memberId, fetchData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleRenew = async (plan) => {
    if (renewing) return

    setRenewing(true)
    try {
      // Create a Razorpay payment order through the backend
      const res = await api.post(`/gyms/${gymId}/members/${memberId}/collect`, {
        plan_id: plan.id,
        amount: plan.price, // in paise
        mode: 'online',
        purpose: 'membership_renewal',
      })

      const order = res.data

      if (order?.payment_link) {
        // Open Razorpay payment link in browser
        await Linking.openURL(order.payment_link)
        Alert.alert(
          'Payment Started',
          'Complete the payment in your browser. Your membership will be updated automatically once payment is confirmed.',
          [{ text: 'OK', onPress: fetchData }]
        )
      } else if (order?.order_id) {
        // If using Razorpay SDK directly (future)
        Alert.alert(
          'Payment Order Created',
          `Order ID: ${order.order_id}\nAmount: ${formatCurrency(plan.price)}\n\nComplete the payment to renew your membership.`,
          [{ text: 'OK' }]
        )
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create payment order. Please try again.'
      Alert.alert('Payment Error', msg)
    } finally {
      setRenewing(false)
      setSelectedPlan(null)
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  if (!gymId || !memberId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Feather name="alert-circle" size={48} color={colors.textTer} />
        <Text style={[styles.emptyText, { color: colors.textSec }]}>
          No active gym membership found
        </Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: COLORS.accent }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.ctaBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isExpired = membership && (membership.status === 'expired' || daysUntil(membership.end_date) <= 0)
  const isExpiringSoon = membership && !isExpired && daysUntil(membership.end_date) <= 7

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Membership</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Membership */}
        {membership ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Membership</Text>
            <MembershipCard membership={membership} colors={colors} />
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
            <Feather name="credit-card" size={32} color={colors.textTer} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>No membership found</Text>
          </View>
        )}

        {/* Renewal CTA */}
        {(isExpired || isExpiringSoon) && plans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isExpired ? 'Renew Your Membership' : 'Renew Early'}
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSec }]}>
              {isExpired
                ? 'Your membership has expired. Choose a plan to continue.'
                : 'Renew now to avoid any interruption in your fitness journey.'}
            </Text>

            {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected ? COLORS.accent + '12' : colors.bgSec,
                      borderColor: isSelected ? COLORS.accent : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedPlan(isSelected ? null : plan)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName2, { color: colors.text }]}>{plan.name}</Text>
                    <Text style={[styles.planDuration, { color: colors.textSec }]}>
                      {plan.duration_months ? `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}` : plan.duration || '1 month'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.planPrice, { color: colors.text }]}>
                      {formatCurrency(plan.price)}
                    </Text>
                    {plan.duration_months && plan.duration_months > 1 && (
                      <Text style={[styles.planPerMonth, { color: colors.textTer }]}>
                        {formatCurrency(Math.round(plan.price / plan.duration_months))}/mo
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: COLORS.accent }]}>
                      <Feather name="check" size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}

            {selectedPlan && (
              <TouchableOpacity
                style={[styles.renewBtn, { backgroundColor: COLORS.accent, opacity: renewing ? 0.7 : 1 }]}
                onPress={() => handleRenew(selectedPlan)}
                disabled={renewing}
                activeOpacity={0.8}
              >
                {renewing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Feather name="credit-card" size={18} color="#FFF" />
                    <Text style={styles.renewBtnText}>
                      Pay {formatCurrency(selectedPlan.price)} with Razorpay
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Available Plans (when no renewal needed) */}
        {!isExpired && !isExpiringSoon && plans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Plans</Text>
            {plans.map((plan) => (
              <View
                key={plan.id}
                style={[styles.planCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName2, { color: colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.planDuration, { color: colors.textSec }]}>
                    {plan.duration_months ? `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}` : plan.duration || '1 month'}
                  </Text>
                </View>
                <Text style={[styles.planPrice, { color: colors.text }]}>
                  {formatCurrency(plan.price)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
          {payments.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              <Feather name="inbox" size={28} color={colors.textTer} />
              <Text style={[styles.emptyText, { color: colors.textSec }]}>No payments yet</Text>
            </View>
          ) : (
            payments.map((p, i) => (
              <PaymentItem key={p.id || i} payment={p} colors={colors} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
  },

  section: {
    paddingHorizontal: SPACING.md,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONT.semibold,
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: FONT.regular,
    lineHeight: 19,
    marginBottom: 14,
  },

  // Membership card
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  statusRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: 3.5,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: FONT.semibold,
  },
  planName: {
    fontSize: 20,
    fontFamily: FONT.bold,
    marginBottom: 2,
  },
  gymName: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginBottom: 16,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 12,
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: FONT.regular,
  },
  dateValue: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    marginTop: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: FONT.regular,
  },
  amountValue: {
    fontSize: 16,
    fontFamily: FONT.numBold,
  },

  // Plan cards
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  planName2: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  planDuration: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontFamily: FONT.numBold,
  },
  planPerMonth: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 1,
  },
  selectedCheck: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 10,
  },

  // Renew button
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 10,
    marginTop: 4,
  },
  renewBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT.semibold,
  },

  // CTA button
  ctaBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONT.semibold,
  },

  // Payment history
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  paymentIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  paymentDesc: {
    fontSize: 14,
    fontFamily: FONT.medium,
  },
  paymentDate: {
    fontSize: 11,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: FONT.numSemibold,
  },
  paymentStatus: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    marginTop: 2,
  },

  // Empty states
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONT.regular,
  },
})
