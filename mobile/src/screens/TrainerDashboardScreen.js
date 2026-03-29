import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import {
  COLORS,
  SPACING,
  RADIUS,
  FONT,
  ELITE_CARD,
  GLASS_CARD,
  SHADOW,
  CARD_ACCENTS,
} from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const TABS = ['Today', 'Clients', 'Earnings']

const STATUS_CONFIG = {
  scheduled: { color: COLORS.cyan, icon: 'clock', label: 'Scheduled' },
  completed: { color: COLORS.green, icon: 'check-circle', label: 'Completed' },
  cancelled: { color: COLORS.red, icon: 'x-circle', label: 'Cancelled' },
}

const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1',
]

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatCurrency(paise) {
  if (typeof paise !== 'number') return '\u20B90'
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`
}

function getTodayISO() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function getTodayDisplay() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Session Card ────────────────────────────────────────────
function SessionCard({ session, colors, onMarkComplete }) {
  const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled
  const isScheduled = session.status === 'scheduled'

  return (
    <TouchableOpacity
      activeOpacity={isScheduled ? 0.7 : 1}
      onPress={isScheduled ? () => onMarkComplete(session) : undefined}
      style={[styles.sessionCard, { backgroundColor: colors.bgSec }]}
    >
      <View style={[styles.sessionTimeAccent, { backgroundColor: status.color }]} />
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionTime, { color: colors.text }]}>
            {formatTime(session.startTime || session.start_time || session.date)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
            <Feather name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.sessionClient, { color: colors.text }]} numberOfLines={1}>
          {session.clientName || session.client_name || 'Client'}
        </Text>
        <Text style={[styles.sessionType, { color: colors.textSec }]}>
          {session.sessionType || session.session_type || session.type || 'Training'}
        </Text>
        {isScheduled && (
          <View style={styles.sessionAction}>
            <Feather name="check" size={13} color={COLORS.accent} />
            <Text style={styles.sessionActionText}>Tap to mark complete</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Client Row ──────────────────────────────────────────────
function ClientRow({ client, colors, onPress, index }) {
  const avatarBg = getAvatarColor(client.name)
  const accentColor = CARD_ACCENTS[index % CARD_ACCENTS.length]

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(client)}
      style={[styles.clientCard, { backgroundColor: colors.bgSec, borderTopColor: accentColor }]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarText}>{getInitials(client.name)}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
          {client.name}
        </Text>
        <Text style={[styles.clientMembership, { color: colors.textSec }]}>
          {client.membershipStatus || client.membership_status || 'Active'}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textTer} />
    </TouchableOpacity>
  )
}

// ─── Client Detail Modal ─────────────────────────────────────
function ClientDetail({ client, detail, colors, onClose, loading }) {
  return (
    <View style={[styles.detailOverlay]}>
      <TouchableOpacity style={styles.detailBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.detailSheet, { backgroundColor: colors.bgSec }]}>
        <View style={styles.detailHandle} />
        <View style={styles.detailHeader}>
          <View style={[styles.detailAvatar, { backgroundColor: getAvatarColor(client.name) }]}>
            <Text style={styles.detailAvatarText}>{getInitials(client.name)}</Text>
          </View>
          <Text style={[styles.detailName, { color: colors.text }]}>{client.name}</Text>
          <Text style={[styles.detailMembership, { color: colors.textSec }]}>
            {client.membershipStatus || client.membership_status || 'Active'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: SPACING.lg }} />
        ) : detail ? (
          <View style={styles.detailStats}>
            <View style={[styles.detailStatCard, { backgroundColor: colors.bgTer, borderTopColor: CARD_ACCENTS[0] }]}>
              <Feather name="calendar" size={18} color={COLORS.cyan} />
              <Text style={[styles.detailStatValue, { color: colors.text }]}>
                {formatDate(detail.lastSessionDate || detail.last_session_date)}
              </Text>
              <Text style={[styles.detailStatLabel, { color: colors.textSec }]}>Last Session</Text>
            </View>
            <View style={[styles.detailStatCard, { backgroundColor: colors.bgTer, borderTopColor: CARD_ACCENTS[2] }]}>
              <Feather name="activity" size={18} color={COLORS.green} />
              <Text style={[styles.detailStatValue, { color: colors.text }]}>
                {detail.totalSessions ?? detail.total_sessions ?? 0}
              </Text>
              <Text style={[styles.detailStatLabel, { color: colors.textSec }]}>Total Sessions</Text>
            </View>
            {(detail.goals || detail.goal) && (
              <View style={[styles.detailGoals, { backgroundColor: colors.bgTer, borderTopColor: CARD_ACCENTS[4] }]}>
                <Feather name="target" size={18} color={COLORS.amber} />
                <Text style={[styles.detailGoalText, { color: colors.text }]}>
                  {detail.goals || detail.goal}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.detailEmpty, { color: colors.textSec }]}>No details available</Text>
        )}

        <TouchableOpacity style={styles.detailClose} onPress={onClose}>
          <Text style={styles.detailCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Earnings Bar ────────────────────────────────────────────
function EarningsBar({ month, amount, maxAmount, colors }) {
  const ratio = maxAmount > 0 ? amount / maxAmount : 0

  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textSec }]}>{month}</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.bgTer }]}>
        <View style={[styles.barFill, { width: `${Math.max(ratio * 100, 2)}%` }]} />
      </View>
      <Text style={[styles.barAmount, { color: colors.text }]}>{formatCurrency(amount)}</Text>
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────
export default function TrainerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors, card, isDark } = useTheme()
  const { member, gymId } = useAuth()

  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data
  const [sessions, setSessions] = useState([])
  const [clients, setClients] = useState([])
  const [earnings, setEarnings] = useState(null)

  // Client detail
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientDetail, setClientDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ─── Fetch ───
  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get(`/trainer/sessions?date=${getTodayISO()}`)
      setSessions(res.data?.sessions || res.data || [])
    } catch (err) {
      console.warn('[TrainerDashboard] sessions:', err?.message)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/trainer/clients')
      setClients(res.data?.clients || res.data || [])
    } catch (err) {
      console.warn('[TrainerDashboard] clients:', err?.message)
    }
  }, [])

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await api.get('/trainer/earnings?months=3')
      setEarnings(res.data)
    } catch (err) {
      console.warn('[TrainerDashboard] earnings:', err?.message)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      await Promise.allSettled([fetchSessions(), fetchClients(), fetchEarnings()])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchSessions, fetchClients, fetchEarnings])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchAll()
  }, [fetchAll])

  // ─── Mark session complete ───
  const handleMarkComplete = useCallback(async (session) => {
    const sessionId = session._id || session.id
    Alert.alert(
      'Complete Session',
      `Mark session with ${session.clientName || session.client_name || 'client'} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await api.patch(`/trainer/sessions/${sessionId}`, { status: 'completed' })
              setSessions((prev) =>
                prev.map((s) =>
                  (s._id || s.id) === sessionId ? { ...s, status: 'completed' } : s
                )
              )
            } catch (err) {
              Alert.alert('Error', 'Could not update session. Please try again.')
            }
          },
        },
      ]
    )
  }, [])

  // ─── Client detail ───
  const handleClientPress = useCallback(async (client) => {
    setSelectedClient(client)
    setDetailLoading(true)
    setClientDetail(null)
    try {
      const memberId = client._id || client.id || client.memberId || client.member_id
      const res = await api.get(`/trainer/clients/${memberId}`)
      setClientDetail(res.data)
    } catch (err) {
      console.warn('[TrainerDashboard] clientDetail:', err?.message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeClientDetail = useCallback(() => {
    setSelectedClient(null)
    setClientDetail(null)
  }, [])

  // ─── Computed earnings ───
  const earningsData = useMemo(() => {
    if (!earnings) return { total: 0, monthly: [], transactions: [] }
    const total = earnings.totalEarnings ?? earnings.total_earnings ?? earnings.total ?? 0
    const monthly = earnings.monthly || earnings.monthlyBreakdown || earnings.monthly_breakdown || []
    const transactions = earnings.transactions || earnings.recentTransactions || earnings.recent_transactions || []
    return { total, monthly, transactions }
  }, [earnings])

  const maxMonthlyAmount = useMemo(() => {
    return earningsData.monthly.reduce((max, m) => Math.max(max, m.amount || 0), 0)
  }, [earningsData.monthly])

  // ─── Sorted sessions ───
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const tA = new Date(a.startTime || a.start_time || a.date).getTime()
      const tB = new Date(b.startTime || b.start_time || b.date).getTime()
      return tA - tB
    })
  }, [sessions])

  const scheduledCount = useMemo(
    () => sessions.filter((s) => s.status === 'scheduled').length,
    [sessions]
  )
  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === 'completed').length,
    [sessions]
  )

  // ─── Loading state ───
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  // ─── Render tabs ───
  const renderTodayTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Date header */}
      <Text style={[styles.dateHeader, { color: colors.text }]}>{getTodayDisplay()}</Text>

      {/* Quick stats */}
      <View style={styles.quickStats}>
        <View style={[styles.quickStatCard, card, { borderTopWidth: 3, borderTopColor: COLORS.cyan }]}>
          <Feather name="clock" size={20} color={COLORS.cyan} />
          <Text style={[styles.quickStatNum, { color: colors.text }]}>{scheduledCount}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSec }]}>Upcoming</Text>
        </View>
        <View style={[styles.quickStatCard, card, { borderTopWidth: 3, borderTopColor: COLORS.green }]}>
          <Feather name="check-circle" size={20} color={COLORS.green} />
          <Text style={[styles.quickStatNum, { color: colors.text }]}>{completedCount}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSec }]}>Completed</Text>
        </View>
        <View style={[styles.quickStatCard, card, { borderTopWidth: 3, borderTopColor: COLORS.accent }]}>
          <Feather name="users" size={20} color={COLORS.accent} />
          <Text style={[styles.quickStatNum, { color: colors.text }]}>{sessions.length}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSec }]}>Total</Text>
        </View>
      </View>

      {/* Sessions */}
      {sortedSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={44} color={colors.textTer} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions today</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
            Your schedule is clear. Enjoy the break!
          </Text>
        </View>
      ) : (
        sortedSessions.map((session, idx) => (
          <SessionCard
            key={session._id || session.id || idx}
            session={session}
            colors={colors}
            onMarkComplete={handleMarkComplete}
          />
        ))
      )}
    </ScrollView>
  )

  const renderClientsTab = () => (
    <FlatList
      data={clients}
      keyExtractor={(item, idx) => item._id || item.id || String(idx)}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="users" size={44} color={colors.textTer} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No clients yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
            Your client roster will appear here once assigned.
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <ClientRow
          client={item}
          colors={colors}
          onPress={handleClientPress}
          index={index}
        />
      )}
    />
  )

  const renderEarningsTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Total earnings banner */}
      <View style={[styles.earningsBanner, GLASS_CARD, { borderTopWidth: 3, borderTopColor: COLORS.accent }]}>
        <Text style={[styles.earningsBannerLabel, { color: colors.textSec }]}>Total Earnings</Text>
        <Text style={styles.earningsBannerAmount}>{formatCurrency(earningsData.total)}</Text>
        <Text style={[styles.earningsBannerPeriod, { color: colors.textSec }]}>Last 3 months</Text>
      </View>

      {/* Monthly breakdown */}
      {earningsData.monthly.length > 0 && (
        <View style={[styles.sectionCard, card, { borderTopWidth: 3, borderTopColor: CARD_ACCENTS[0] }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Breakdown</Text>
          {earningsData.monthly.map((m, idx) => (
            <EarningsBar
              key={m.month || idx}
              month={m.month || m.label || `Month ${idx + 1}`}
              amount={m.amount || 0}
              maxAmount={maxMonthlyAmount}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Recent transactions */}
      {earningsData.transactions.length > 0 && (
        <View style={[styles.sectionCard, card, { borderTopWidth: 3, borderTopColor: CARD_ACCENTS[6] }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          {earningsData.transactions.map((txn, idx) => (
            <View
              key={txn._id || txn.id || idx}
              style={[styles.txnRow, idx < earningsData.transactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={styles.txnLeft}>
                <Feather name="arrow-down-left" size={16} color={COLORS.accent} />
                <View style={styles.txnInfo}>
                  <Text style={[styles.txnDesc, { color: colors.text }]} numberOfLines={1}>
                    {txn.description || txn.clientName || txn.client_name || 'Session'}
                  </Text>
                  <Text style={[styles.txnDate, { color: colors.textSec }]}>
                    {formatDate(txn.date || txn.createdAt || txn.created_at)}
                  </Text>
                </View>
              </View>
              <Text style={styles.txnAmount}>{formatCurrency(txn.amount || 0)}</Text>
            </View>
          ))}
        </View>
      )}

      {earningsData.monthly.length === 0 && earningsData.transactions.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="dollar-sign" size={44} color={colors.textTer} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No earnings data</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
            Complete sessions to start earning.
          </Text>
        </View>
      )}
    </ScrollView>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerGreeting, { color: colors.textSec }]}>Welcome back</Text>
          <Text style={[styles.headerName, { color: colors.text }]}>
            {member?.name || 'Trainer'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: colors.bgTer }]}
          onPress={() => navigation?.navigate?.('NotificationSettings')}
          activeOpacity={0.7}
        >
          <Feather name="bell" size={20} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab, idx) => {
          const isActive = activeTab === idx
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: isActive ? COLORS.accent : colors.textSec }]}>
                {tab}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Tab content */}
      {activeTab === 0 && renderTodayTab()}
      {activeTab === 1 && renderClientsTab()}
      {activeTab === 2 && renderEarningsTab()}

      {/* Client detail overlay */}
      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          detail={clientDetail}
          colors={colors}
          onClose={closeClientDetail}
          loading={detailLoading}
        />
      )}
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerGreeting: {
    fontFamily: FONT.medium,
    fontSize: 13,
    marginBottom: 2,
  },
  headerName: {
    fontFamily: FONT.bold,
    fontSize: 22,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: SPACING.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 32,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },

  // Tab content
  tabContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl + 20,
  },

  // Today tab
  dateHeader: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginBottom: SPACING.md,
  },
  quickStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickStatCard: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 3,
  },
  quickStatNum: {
    fontFamily: FONT.numBold,
    fontSize: 24,
  },
  quickStatLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
  },

  // Session card
  sessionCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  sessionTimeAccent: {
    width: 4,
  },
  sessionContent: {
    flex: 1,
    padding: SPACING.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionTime: {
    fontFamily: FONT.numSemibold,
    fontSize: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusLabel: {
    fontFamily: FONT.semibold,
    fontSize: 11,
  },
  sessionClient: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginBottom: 2,
  },
  sessionType: {
    fontFamily: FONT.regular,
    fontSize: 13,
  },
  sessionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  sessionActionText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.accent,
  },

  // Client card
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderTopWidth: 3,
    ...SHADOW.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    marginBottom: 2,
  },
  clientMembership: {
    fontFamily: FONT.regular,
    fontSize: 12,
  },

  // Client detail overlay
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  detailSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    minHeight: 340,
  },
  detailHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.3)',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detailAvatarText: {
    fontFamily: FONT.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  detailName: {
    fontFamily: FONT.bold,
    fontSize: 20,
    marginBottom: 2,
  },
  detailMembership: {
    fontFamily: FONT.medium,
    fontSize: 13,
  },
  detailStats: {
    gap: SPACING.sm,
  },
  detailStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 12,
    borderTopWidth: 3,
  },
  detailStatValue: {
    fontFamily: FONT.numBold,
    fontSize: 16,
    flex: 1,
  },
  detailStatLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  detailGoals: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 12,
    borderTopWidth: 3,
  },
  detailGoalText: {
    fontFamily: FONT.regular,
    fontSize: 14,
    flex: 1,
  },
  detailEmpty: {
    fontFamily: FONT.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  detailClose: {
    alignSelf: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
  },
  detailCloseText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Earnings
  earningsBanner: {
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderTopWidth: 3,
  },
  earningsBannerLabel: {
    fontFamily: FONT.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  earningsBannerAmount: {
    fontFamily: FONT.numExtraBold,
    fontSize: 40,
    color: COLORS.accent,
    marginBottom: 4,
  },
  earningsBannerPeriod: {
    fontFamily: FONT.regular,
    fontSize: 12,
  },
  sectionCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderTopWidth: 3,
  },
  sectionTitle: {
    fontFamily: FONT.semibold,
    fontSize: 16,
    marginBottom: SPACING.md,
  },

  // Bar chart
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  barLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
    width: 40,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  barAmount: {
    fontFamily: FONT.numSemibold,
    fontSize: 13,
    width: 80,
    textAlign: 'right',
  },

  // Transactions
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  txnInfo: {
    flex: 1,
  },
  txnDesc: {
    fontFamily: FONT.medium,
    fontSize: 14,
    marginBottom: 2,
  },
  txnDate: {
    fontFamily: FONT.regular,
    fontSize: 11,
  },
  txnAmount: {
    fontFamily: FONT.numSemibold,
    fontSize: 15,
    color: COLORS.accent,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontFamily: FONT.semibold,
    fontSize: 17,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
})
