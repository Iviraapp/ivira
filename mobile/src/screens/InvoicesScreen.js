import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  RefreshControl,
  ScrollView,
  Linking,
} from 'react-native'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { formatPaise, formatDate } from '../lib/utils'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const STATUS_MAP = {
  captured: { label: 'Paid', color: COLORS.green },
  paid: { label: 'Paid', color: COLORS.green },
  pending: { label: 'Pending', color: COLORS.amber },
  created: { label: 'Pending', color: COLORS.amber },
  failed: { label: 'Failed', color: COLORS.red },
}

function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: status || 'Unknown', color: COLORS.textTer }
}

function getMethodIcon(method) {
  switch (method) {
    case 'upi':
      return 'UPI'
    case 'card':
      return 'CARD'
    case 'cash':
      return 'CASH'
    case 'netbanking':
      return 'NET'
    default:
      return '---'
  }
}

function buildInvoiceText(invoice, gymName) {
  const status = getStatusInfo(invoice.status)
  return (
    `Invoice — ${gymName || 'IVIRA'}\n` +
    (invoice.invoice_number ? `No: ${invoice.invoice_number}\n` : '') +
    `Date: ${formatDate(invoice.created_at || invoice.invoice_date || invoice.payment_date)}\n` +
    `Amount: ${formatPaise(invoice.amount || invoice.total_paise || 0)}\n` +
    `Status: ${status.label}\n` +
    `Ref: ${invoice.invoice_number || invoice.razorpay_payment_id || invoice.id || '—'}`
  )
}

export default function InvoicesScreen() {
  const { gymId, gymInfo } = useAuth()
  const { colors, card } = useTheme()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInvoices = useCallback(async () => {
    if (!gymId) return
    try {
      // Try member invoices endpoint first (returns proper invoice data)
      const res = await api.get(`/gyms/${gymId}/members/me/invoices`)
      const data = res.data?.invoices || []
      // Normalize invoice fields to match the display (invoice uses total_paise not amount)
      const normalized = data.map(inv => ({
        ...inv,
        amount: inv.total_paise || inv.amount_paise || 0,
        payment_method: inv.payment_method || 'N/A',
        status: inv.status === 'issued' ? 'pending' : inv.status === 'paid' ? 'paid' : inv.status,
        created_at: inv.invoice_date || inv.created_at,
      }))
      setInvoices(normalized)
    } catch {
      // Fallback to payments endpoint
      try {
        const res = await api.get(`/gyms/${gymId}/payments`)
        const data = res.data?.payments || res.data || []
        setInvoices(Array.isArray(data) ? data : [])
      } catch (err) {
        Alert.alert('Error', 'Could not load invoices. Please try again.')
      }
    }
  }, [gymId])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await fetchInvoices()
      setLoading(false)
    })()
  }, [fetchInvoices])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchInvoices()
    setRefreshing(false)
  }, [fetchInvoices])

  const summary = useMemo(() => {
    let paid = 0
    let pending = 0
    let outstanding = 0
    for (const inv of invoices) {
      const amt = inv.amount || 0
      if (inv.status === 'captured' || inv.status === 'paid') paid += amt
      else if (inv.status === 'pending' || inv.status === 'created') pending += amt
      else if (inv.status === 'failed') outstanding += amt
    }
    return { paid, pending, outstanding }
  }, [invoices])

  const handleDownload = useCallback(
    async (invoice) => {
      const text = buildInvoiceText(invoice, gymInfo?.name)
      try {
        await Share.share({ message: text })
      } catch {}
    },
    [gymInfo]
  )

  const handleWhatsApp = useCallback(
    (invoice) => {
      const text = buildInvoiceText(invoice, gymInfo?.name)
      const url = `whatsapp://send?text=${encodeURIComponent(text)}`
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url)
        } else {
          Alert.alert('WhatsApp not available', 'WhatsApp is not installed on this device.')
        }
      })
    },
    [gymInfo]
  )

  const renderSummaryCards = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.summaryRow}
    >
      <View style={[styles.summaryCard, { backgroundColor: colors.bgSec }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSec }]}>Total Paid</Text>
        <Text style={[styles.summaryAmount, { color: colors.green }]}>
          {formatPaise(summary.paid)}
        </Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: colors.bgSec }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSec }]}>Pending</Text>
        <Text style={[styles.summaryAmount, { color: colors.amber }]}>
          {formatPaise(summary.pending)}
        </Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: colors.bgSec }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSec }]}>Outstanding</Text>
        <Text style={[styles.summaryAmount, { color: colors.red }]}>
          {formatPaise(summary.outstanding)}
        </Text>
      </View>
    </ScrollView>
  )

  const renderInvoiceRow = ({ item }) => {
    const statusInfo = getStatusInfo(item.status)
    return (
      <View style={[styles.row, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        <View style={styles.rowLeft}>
          <Text style={[styles.rowDate, { color: colors.text }]}>
            {formatDate(item.created_at || item.payment_date)}
          </Text>
          <View style={styles.rowMeta}>
            <View style={[styles.badge, { backgroundColor: statusInfo.color + '22' }]}>
              <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            <View style={[styles.methodBadge, { backgroundColor: colors.bgTer }]}>
              <Text style={[styles.methodText, { color: colors.textSec }]}>{getMethodIcon(item.payment_method)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowAmount, { color: colors.text }]}>{formatPaise(item.amount)}</Text>
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bgTer }]}
              onPress={() => handleDownload(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.actionIcon, { color: colors.textSec }]}>{'↓'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bgTer }]}
              onPress={() => handleWhatsApp(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.actionIcon, { color: colors.textSec }]}>{'↗'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIllustration, { backgroundColor: colors.bgSec }]}>
        <Text style={[styles.emptyIcon, { color: colors.textTer }]}>☐</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No invoices yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
        Your payment history will appear here once you make a payment.
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.bg }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Invoices</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invoices</Text>
      </View>

      {renderSummaryCards()}

      <FlatList
        data={invoices}
        keyExtractor={(item) => String(item.id || item.razorpay_payment_id || Math.random())}
        renderItem={renderInvoiceRow}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={invoices.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.text]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Summary cards
  summaryRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  summaryCard: {
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minWidth: 130,
    marginRight: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSec,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Courier',
  },

  // Invoice list
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 128,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  rowDate: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgTer,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSec,
    letterSpacing: 0.5,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Courier',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  rowActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgTer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
    color: COLORS.textSec,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bgSec,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 32,
    color: COLORS.textTer,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
