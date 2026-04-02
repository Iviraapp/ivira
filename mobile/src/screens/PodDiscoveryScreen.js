import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, Modal,
  TextInput, ActivityIndicator, StyleSheet, SafeAreaView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const GOAL_OPTIONS = ['All', 'Gym', 'Study', 'Running', 'Yoga', 'Meditation', 'Productivity']
const INTENSITY_OPTIONS = ['All', 'Casual', 'Serious', 'Hardcore']
const TIME_OPTIONS = ['All', 'Morning', 'Afternoon', 'Evening']

const GOAL_ICONS = { Gym: 'activity', Study: 'book', Running: 'trending-up', Yoga: 'wind', Meditation: 'sun', Productivity: 'target' }
const GOAL_COLORS = { Gym: '#22C55E', Study: '#3B82F6', Running: '#F97316', Yoga: '#8B5CF6', Meditation: '#FBBF24', Productivity: '#14B8A6' }
const INTENSITY_COLORS = { Casual: '#38BDF8', Serious: '#FBBF24', Hardcore: '#F87171' }
const TIER_COLORS = { Silver: '#94A3B8', Gold: '#FBBF24', Diamond: '#38BDF8' }

export default function PodDiscoveryScreen({ navigation, route }) {
  const { colors, card, isDark } = useTheme()
  const { gymId } = useAuth()

  const [goalFilter, setGoalFilter] = useState('All')
  const [intensityFilter, setIntensityFilter] = useState('All')
  const [timeFilter, setTimeFilter] = useState('All')
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [joinedIds, setJoinedIds] = useState(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPod, setNewPod] = useState({ name: '', goalType: 'Gym', intensity: 'Casual', timePreference: 'Morning' })

  const fetchPods = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    try {
      const params = {}
      if (goalFilter !== 'All') params.goalType = goalFilter
      if (intensityFilter !== 'All') params.intensity = intensityFilter
      if (timeFilter !== 'All') params.timePreference = timeFilter
      const res = await api.get(`/gyms/${gymId}/pods`, { params })
      setPods(res.data?.pods || res.data || [])
    } catch (e) {
      console.warn('[PodDiscovery] fetch:', e?.message)
    } finally {
      setLoading(false)
    }
  }, [gymId, goalFilter, intensityFilter, timeFilter])

  useEffect(() => { fetchPods() }, [fetchPods])

  const handleAutoMatch = async () => {
    if (!gymId) return
    setMatching(true)
    try {
      const res = await api.post(`/gyms/${gymId}/pods/auto-match`)
      const pod = res.data?.pod || res.data
      if (pod?.id) {
        setJoinedIds(prev => new Set(prev).add(pod.id))
        setTimeout(() => navigation.navigate('PodHome', { podId: pod.id }), 800)
      }
    } catch (e) {
      console.warn('[PodDiscovery] auto-match:', e?.message)
    } finally {
      setMatching(false)
    }
  }

  const handleJoin = async (podId) => {
    if (!gymId) return
    try {
      await api.post(`/gyms/${gymId}/pods/${podId}/join`)
      setJoinedIds(prev => new Set(prev).add(podId))
      setTimeout(() => navigation.navigate('PodHome', { podId }), 1000)
    } catch (e) {
      console.warn('[PodDiscovery] join:', e?.message)
    }
  }

  const handleCreate = async () => {
    if (!gymId || !newPod.name.trim()) return
    setCreating(true)
    try {
      const res = await api.post(`/gyms/${gymId}/pods`, {
        name: newPod.name.trim(),
        goalType: newPod.goalType,
        intensity: newPod.intensity,
        timePreference: newPod.timePreference,
      })
      setShowCreate(false)
      setNewPod({ name: '', goalType: 'Gym', intensity: 'Casual', timePreference: 'Morning' })
      fetchPods()
      const pod = res.data?.pod || res.data
      if (pod?.id) setTimeout(() => navigation.navigate('PodHome', { podId: pod.id }), 600)
    } catch (e) {
      console.warn('[PodDiscovery] create:', e?.message)
    } finally {
      setCreating(false)
    }
  }

  const FilterChips = ({ options, active, onSelect, label }) => (
    <View style={s.filterGroup}>
      <Text style={[s.filterLabel, { color: colors.textSec }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {options.map(opt => {
          const isActive = active === opt
          return (
            <TouchableOpacity
              key={opt}
              style={[s.chip, { backgroundColor: isActive ? colors.accent : 'rgba(148,163,184,0.08)' }]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipText, { color: isActive ? '#FFFFFF' : colors.textSec }]}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )

  const MemberDots = ({ current, max }) => (
    <View style={s.dotsRow}>
      {Array.from({ length: max }, (_, i) => (
        <View key={i} style={[s.dot, { backgroundColor: i < current ? colors.accent : 'rgba(148,163,184,0.15)' }]} />
      ))}
    </View>
  )

  const MemberAvatars = ({ members = [] }) => (
    <View style={s.avatarsRow}>
      {members.slice(0, 4).map((m, i) => (
        <View key={m.id || i} style={[s.avatar, { marginLeft: i > 0 ? -8 : 0, backgroundColor: GOAL_COLORS[Object.keys(GOAL_COLORS)[i % 6]] }]}>
          <Text style={s.avatarText}>{(m.name || '?')[0].toUpperCase()}</Text>
        </View>
      ))}
      {members.length > 4 && (
        <View style={[s.avatar, { marginLeft: -8, backgroundColor: 'rgba(148,163,184,0.2)' }]}>
          <Text style={s.avatarText}>+{members.length - 4}</Text>
        </View>
      )}
    </View>
  )

  const renderPod = ({ item }) => {
    const joined = joinedIds.has(item.id)
    const goalColor = GOAL_COLORS[item.goalType] || colors.accent
    const intensityColor = INTENSITY_COLORS[item.intensity] || colors.textSec
    const memberCount = item.memberCount || item.members?.length || 0
    const maxMembers = item.maxMembers || 5

    return (
      <View style={[card, s.podCard, { borderTopWidth: 3, borderTopColor: goalColor }]}>
        <View style={s.podHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[s.podName, { color: colors.text }]}>{item.name}</Text>
            <View style={s.badgeRow}>
              {item.goalType && (
                <View style={[s.badge, { backgroundColor: goalColor + '20' }]}>
                  <Feather name={GOAL_ICONS[item.goalType] || 'target'} size={11} color={goalColor} />
                  <Text style={[s.badgeText, { color: goalColor }]}>{item.goalType}</Text>
                </View>
              )}
              {item.intensity && (
                <View style={[s.badge, { backgroundColor: intensityColor + '20' }]}>
                  <Text style={[s.badgeText, { color: intensityColor }]}>{item.intensity}</Text>
                </View>
              )}
              {item.timePreference && (
                <View style={[s.badge, { backgroundColor: 'rgba(148,163,184,0.08)' }]}>
                  <Feather name="clock" size={10} color={colors.textSec} />
                  <Text style={[s.badgeText, { color: colors.textSec }]}>{item.timePreference}</Text>
                </View>
              )}
            </View>
          </View>
          {joined ? (
            <View style={[s.joinBtn, { backgroundColor: '#22C55E20' }]}>
              <Text style={[s.joinBtnText, { color: '#22C55E' }]}>Joined</Text>
            </View>
          ) : (
            <TouchableOpacity style={[s.joinBtn, { backgroundColor: colors.accent }]} onPress={() => handleJoin(item.id)} activeOpacity={0.7}>
              <Text style={[s.joinBtnText, { color: '#FFFFFF' }]}>Join</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.podMeta}>
          <View style={s.memberInfo}>
            <MemberAvatars members={item.members || []} />
            <Text style={[s.memberCount, { color: colors.textSec }]}>{memberCount}/{maxMembers} members</Text>
            <MemberDots current={memberCount} max={maxMembers} />
          </View>
          <View style={s.podFooter}>
            {item.tier && (
              <View style={[s.tierBadge, { backgroundColor: (TIER_COLORS[item.tier] || colors.textSec) + '20' }]}>
                <Feather name="award" size={10} color={TIER_COLORS[item.tier] || colors.textSec} />
                <Text style={[s.tierText, { color: TIER_COLORS[item.tier] || colors.textSec }]}>{item.tier}</Text>
              </View>
            )}
            {item.healthScore != null && (
              <Text style={[s.healthScore, { color: item.healthScore >= 70 ? '#22C55E' : item.healthScore >= 40 ? '#FBBF24' : '#F87171' }]}>
                {item.healthScore}
              </Text>
            )}
          </View>
        </View>
      </View>
    )
  }

  const ListHeader = () => (
    <>
      {/* Auto-Match Banner */}
      <View style={[card, s.matchBanner, { borderTopWidth: 3, borderTopColor: '#8B5CF6' }]}>
        <View style={s.matchRow}>
          <View style={[s.matchIcon, { backgroundColor: '#8B5CF620' }]}>
            <Feather name="zap" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.matchTitle, { color: colors.text }]}>Quick Match</Text>
            <Text style={[s.matchDesc, { color: colors.textSec }]}>
              We'll find the perfect circle for you based on your profile
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.matchBtn, { backgroundColor: '#8B5CF6', opacity: matching ? 0.7 : 1 }]}
          onPress={handleAutoMatch}
          disabled={matching}
          activeOpacity={0.7}
        >
          {matching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.matchBtnText}>Match Me</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <FilterChips label="Goal" options={GOAL_OPTIONS} active={goalFilter} onSelect={setGoalFilter} />
      <FilterChips label="Intensity" options={INTENSITY_OPTIONS} active={intensityFilter} onSelect={setIntensityFilter} />
      <FilterChips label="Time" options={TIME_OPTIONS} active={timeFilter} onSelect={setTimeFilter} />
    </>
  )

  const EmptyState = () => (
    <View style={s.empty}>
      <Feather name="search" size={40} color={colors.textTer} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No circles found matching your filters</Text>
      <Text style={[s.emptyDesc, { color: colors.textSec }]}>Try different filters or create your own circle</Text>
      <TouchableOpacity style={[s.createBtnLg, { backgroundColor: colors.accent }]} onPress={() => setShowCreate(true)} activeOpacity={0.7}>
        <Feather name="plus" size={16} color="#FFFFFF" />
        <Text style={s.createBtnLgText}>Create Circle</Text>
      </TouchableOpacity>
    </View>
  )

  const GoalSelector = ({ value, onChange }) => (
    <View style={s.selectorRow}>
      {GOAL_OPTIONS.filter(g => g !== 'All').map(g => (
        <TouchableOpacity
          key={g}
          style={[s.selectorBtn, { backgroundColor: value === g ? (GOAL_COLORS[g] || colors.accent) + '25' : 'rgba(148,163,184,0.08)' }]}
          onPress={() => onChange(g)}
          activeOpacity={0.7}
        >
          <Feather name={GOAL_ICONS[g] || 'target'} size={16} color={value === g ? (GOAL_COLORS[g] || colors.accent) : colors.textSec} />
          <Text style={[s.selectorLabel, { color: value === g ? (GOAL_COLORS[g] || colors.accent) : colors.textSec }]}>{g}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const RadioRow = ({ options, value, onChange, colorMap }) => (
    <View style={s.radioRow}>
      {options.filter(o => o !== 'All').map(o => {
        const active = value === o
        const c = colorMap?.[o] || colors.accent
        return (
          <TouchableOpacity
            key={o}
            style={[s.radioBtn, { backgroundColor: active ? c + '25' : 'rgba(148,163,184,0.08)', borderWidth: active ? 1 : 0, borderColor: c }]}
            onPress={() => onChange(o)}
            activeOpacity={0.7}
          >
            <Text style={[s.radioText, { color: active ? c : colors.textSec }]}>{o}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Find a Circle</Text>
          <Text style={[s.subtitle, { color: colors.textSec }]}>Join a group that matches your goals</Text>
        </View>
      </View>

      {/* Pod List */}
      {loading && pods.length === 0 ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={pods}
          keyExtractor={item => String(item.id)}
          renderItem={renderPod}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Pod Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.bgSec }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Create a Circle</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} activeOpacity={0.7}>
                <Feather name="x" size={22} color={colors.textSec} />
              </TouchableOpacity>
            </View>

            <Text style={[s.inputLabel, { color: colors.textSec }]}>Circle Name</Text>
            <TextInput
              style={[s.input, { color: colors.text, backgroundColor: 'rgba(148,163,184,0.08)', borderColor: colors.border }]}
              value={newPod.name}
              onChangeText={t => setNewPod(p => ({ ...p, name: t }))}
              placeholder="e.g. Morning Warriors"
              placeholderTextColor={colors.textTer}
              maxLength={40}
            />

            <Text style={[s.inputLabel, { color: colors.textSec }]}>Goal</Text>
            <GoalSelector value={newPod.goalType} onChange={v => setNewPod(p => ({ ...p, goalType: v }))} />

            <Text style={[s.inputLabel, { color: colors.textSec }]}>Intensity</Text>
            <RadioRow options={INTENSITY_OPTIONS} value={newPod.intensity} onChange={v => setNewPod(p => ({ ...p, intensity: v }))} colorMap={INTENSITY_COLORS} />

            <Text style={[s.inputLabel, { color: colors.textSec }]}>Time</Text>
            <RadioRow options={['Morning', 'Afternoon', 'Evening', 'Flexible']} value={newPod.timePreference} onChange={v => setNewPod(p => ({ ...p, timePreference: v }))} />

            <TouchableOpacity
              style={[s.createSubmit, { backgroundColor: colors.accent, opacity: creating || !newPod.name.trim() ? 0.5 : 1 }]}
              onPress={handleCreate}
              disabled={creating || !newPod.name.trim()}
              activeOpacity={0.7}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.createSubmitText}>Create Circle</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  title: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: FONT.regular, fontSize: 13, marginTop: 2 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 40 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Auto-match banner
  matchBanner: { padding: SPACING.md, marginBottom: SPACING.md },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  matchIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  matchTitle: { fontFamily: FONT.bold, fontSize: 17 },
  matchDesc: { fontFamily: FONT.regular, fontSize: 13, marginTop: 2 },
  matchBtn: { height: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  matchBtnText: { fontFamily: FONT.semibold, fontSize: 15, color: '#FFFFFF' },

  // Filters
  filterGroup: { marginBottom: SPACING.sm },
  filterLabel: { fontFamily: FONT.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  chipRow: { gap: 8, paddingRight: SPACING.md },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full },
  chipText: { fontFamily: FONT.medium, fontSize: 13 },

  // Pod card
  podCard: { padding: SPACING.md, marginBottom: SPACING.sm },
  podHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  podName: { fontFamily: FONT.bold, fontSize: 16, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontFamily: FONT.semibold, fontSize: 11 },
  joinBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.sm, alignSelf: 'flex-start', marginLeft: 12 },
  joinBtnText: { fontFamily: FONT.semibold, fontSize: 13 },

  // Pod meta
  podMeta: { marginTop: 12 },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarsRow: { flexDirection: 'row' },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(17,24,39,0.65)' },
  avatarText: { fontFamily: FONT.semibold, fontSize: 10, color: '#FFFFFF' },
  memberCount: { fontFamily: FONT.medium, fontSize: 12 },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  podFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  tierText: { fontFamily: FONT.semibold, fontSize: 11 },
  healthScore: { fontFamily: FONT.bold, fontSize: 14 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyTitle: { fontFamily: FONT.semibold, fontSize: 16, marginTop: 16 },
  emptyDesc: { fontFamily: FONT.regular, fontSize: 13, marginTop: 6, textAlign: 'center' },
  createBtnLg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.sm, marginTop: 20 },
  createBtnLgText: { fontFamily: FONT.semibold, fontSize: 14, color: '#FFFFFF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.md, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  modalTitle: { fontFamily: FONT.bold, fontSize: 20 },
  inputLabel: { fontFamily: FONT.semibold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { height: 46, borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 14, fontFamily: FONT.regular, fontSize: 15 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorBtn: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.sm, gap: 4 },
  selectorLabel: { fontFamily: FONT.medium, fontSize: 11 },
  radioRow: { flexDirection: 'row', gap: 8 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm },
  radioText: { fontFamily: FONT.medium, fontSize: 13 },
  createSubmit: { height: 48, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  createSubmitText: { fontFamily: FONT.semibold, fontSize: 15, color: '#FFFFFF' },
})
