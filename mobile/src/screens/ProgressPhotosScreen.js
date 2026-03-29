// ProgressPhotosScreen — Progress photo timeline & before/after comparison
// Dark theme, 3-column grid, side-by-side compare with overlay slider
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  Dimensions, Modal, ActivityIndicator, Animated, PanResponder,
  Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { premiumAlert } from '../components/PremiumAlert'
import Svg, { Line, Circle as SvgCircle, Polyline, Text as SvgText } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

let ImagePicker = null
try { ImagePicker = require('expo-image-picker') } catch {}

const { width: SW } = Dimensions.get('window')
const GRID_GAP = 3
const GRID_COLS = 3
const PHOTO_SIZE = (SW - SPACING.md * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
const COMPARE_W = (SW - 48) / 2

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatShort(dateStr) {
  const d = new Date(dateStr)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// ── Weight Trend Chart (SVG) ────────────────────────────────────────
function WeightChart({ data, colors }) {
  if (!data || data.length < 2) return null

  const chartW = SW - 64
  const chartH = 100
  const padL = 36
  const padR = 12
  const padT = 12
  const padB = 24
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date))
  const vals = sorted.map(d => d.weight_kg).filter(Boolean)
  if (vals.length < 2) return null

  const minV = Math.min(...vals) - 1
  const maxV = Math.max(...vals) + 1
  const range = maxV - minV || 1

  const points = sorted
    .filter(d => d.weight_kg)
    .map((d, i, arr) => {
      const x = padL + (i / (arr.length - 1)) * plotW
      const y = padT + plotH - ((d.weight_kg - minV) / range) * plotH
      return `${x},${y}`
    })
    .join(' ')

  const labelCount = Math.min(sorted.filter(d => d.weight_kg).length, 5)
  const filtered = sorted.filter(d => d.weight_kg)
  const step = Math.max(1, Math.floor((filtered.length - 1) / (labelCount - 1)))

  return (
    <View style={styles.chartWrap}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>Weight Trend</Text>
      <Svg width={chartW} height={chartH}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((frac, i) => {
          const y = padT + plotH * (1 - frac)
          const val = (minV + range * frac).toFixed(1)
          return (
            <React.Fragment key={i}>
              <Line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <SvgText x={padL - 6} y={y + 4} textAnchor="end" fill={COLORS.textSec} fontSize={9} fontFamily={FONT.numRegular}>
                {val}
              </SvgText>
            </React.Fragment>
          )
        })}

        {/* Line */}
        <Polyline points={points} fill="none" stroke={COLORS.accent} strokeWidth={2} strokeLinejoin="round" />

        {/* Dots */}
        {filtered.map((d, i) => {
          const x = padL + (i / (filtered.length - 1)) * plotW
          const y = padT + plotH - ((d.weight_kg - minV) / range) * plotH
          return <SvgCircle key={i} cx={x} cy={y} r={3} fill={COLORS.accent} />
        })}

        {/* Date labels */}
        {Array.from({ length: labelCount }).map((_, li) => {
          const idx = li === labelCount - 1 ? filtered.length - 1 : li * step
          if (idx >= filtered.length) return null
          const d = filtered[idx]
          const x = padL + (idx / (filtered.length - 1)) * plotW
          return (
            <SvgText key={li} x={x} y={chartH - 4} textAnchor="middle" fill={COLORS.textSec} fontSize={8} fontFamily={FONT.numRegular}>
              {formatShort(d.date)}
            </SvgText>
          )
        })}
      </Svg>
    </View>
  )
}

// ── Pose Guide Overlay ──────────────────────────────────────────────
function PoseGuide() {
  return (
    <View style={styles.poseOverlay} pointerEvents="none">
      <View style={styles.poseBody}>
        {/* Head */}
        <View style={styles.poseHead} />
        {/* Torso */}
        <View style={styles.poseTorso} />
        {/* Arms */}
        <View style={styles.poseArmLeft} />
        <View style={styles.poseArmRight} />
        {/* Legs */}
        <View style={styles.poseLegLeft} />
        <View style={styles.poseLegRight} />
      </View>
      <Text style={styles.poseHint}>Align your body with the guide</Text>
    </View>
  )
}

// ── Comparison Modal ────────────────────────────────────────────────
function ComparisonModal({ visible, photos, statsMap, onClose }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const sliderX = useRef(new Animated.Value(COMPARE_W)).current
  const [showOverlay, setShowOverlay] = useState(false)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(SW - 48, COMPARE_W + gs.dx))
        sliderX.setValue(newX)
      },
      onPanResponderRelease: () => {},
    })
  ).current

  if (!visible || photos.length < 2) return null

  const [before, after] = photos[0].created_at < photos[1].created_at
    ? [photos[0], photos[1]]
    : [photos[1], photos[0]]

  const beforeStats = statsMap[before.created_at?.split('T')[0]]
  const afterStats = statsMap[after.created_at?.split('T')[0]]

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[styles.compareModal, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={styles.compareHeader}>
          <TouchableOpacity onPress={onClose} style={styles.compareClose}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.compareTitle, { color: colors.text }]}>Before & After</Text>
          <TouchableOpacity
            onPress={() => setShowOverlay(!showOverlay)}
            style={[styles.overlayToggle, showOverlay && styles.overlayToggleActive]}
          >
            <Feather name="layers" size={18} color={showOverlay ? COLORS.accent : colors.textSec} />
          </TouchableOpacity>
        </View>

        {/* Side by Side */}
        {!showOverlay ? (
          <View style={styles.compareSideBySide}>
            <View style={styles.comparePhotoCol}>
              <Image source={{ uri: before.url || before.photo_url }} style={styles.compareImg} resizeMode="cover" />
              <Text style={styles.compareDate}>{formatDate(before.created_at)}</Text>
              {beforeStats && (
                <Text style={styles.compareStats}>
                  {beforeStats.weight_kg ? `${beforeStats.weight_kg} kg` : ''}
                  {beforeStats.bmi ? ` | BMI ${beforeStats.bmi.toFixed(1)}` : ''}
                </Text>
              )}
              <View style={styles.compareBadge}>
                <Text style={styles.compareBadgeText}>BEFORE</Text>
              </View>
            </View>

            <View style={styles.compareDivider} />

            <View style={styles.comparePhotoCol}>
              <Image source={{ uri: after.url || after.photo_url }} style={styles.compareImg} resizeMode="cover" />
              <Text style={styles.compareDate}>{formatDate(after.created_at)}</Text>
              {afterStats && (
                <Text style={styles.compareStats}>
                  {afterStats.weight_kg ? `${afterStats.weight_kg} kg` : ''}
                  {afterStats.bmi ? ` | BMI ${afterStats.bmi.toFixed(1)}` : ''}
                </Text>
              )}
              <View style={[styles.compareBadge, styles.compareBadgeAfter]}>
                <Text style={styles.compareBadgeText}>AFTER</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Overlay slider mode */
          <View style={styles.overlayWrap}>
            <Image
              source={{ uri: after.url || after.photo_url }}
              style={styles.overlayFullImg}
              resizeMode="cover"
            />
            <Animated.View style={[styles.overlayClip, { width: sliderX }]}>
              <Image
                source={{ uri: before.url || before.photo_url }}
                style={[styles.overlayFullImg, { width: SW - 48 }]}
                resizeMode="cover"
              />
            </Animated.View>
            {/* Slider handle */}
            <Animated.View
              style={[styles.sliderHandle, { left: Animated.subtract(sliderX, 16) }]}
              {...panResponder.panHandlers}
            >
              <View style={styles.sliderLine} />
              <View style={styles.sliderKnob}>
                <Feather name="chevrons-left" size={12} color="#FFF" />
                <Feather name="chevrons-right" size={12} color="#FFF" />
              </View>
              <View style={styles.sliderLine} />
            </Animated.View>

            {/* Labels */}
            <View style={styles.overlayLabels}>
              <Text style={styles.overlayLabel}>Before</Text>
              <Text style={styles.overlayLabel}>After</Text>
            </View>
          </View>
        )}

        {/* Weight diff */}
        {beforeStats?.weight_kg && afterStats?.weight_kg && (
          <View style={styles.compareWeightDiff}>
            <Feather
              name={afterStats.weight_kg < beforeStats.weight_kg ? 'trending-down' : 'trending-up'}
              size={18}
              color={afterStats.weight_kg < beforeStats.weight_kg ? COLORS.green : COLORS.amber}
            />
            <Text style={[
              styles.compareWeightDiffText,
              { color: afterStats.weight_kg < beforeStats.weight_kg ? COLORS.green : COLORS.amber },
            ]}>
              {Math.abs(afterStats.weight_kg - beforeStats.weight_kg).toFixed(1)} kg
              {afterStats.weight_kg < beforeStats.weight_kg ? ' lost' : ' gained'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  )
}

// ── Main Screen ─────────────────────────────────────────────────────
export default function ProgressPhotosScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { gymId, member } = useAuth()

  const [photos, setPhotos] = useState([])
  const [statsHistory, setStatsHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [showCompare, setShowCompare] = useState(false)

  const memberId = member?.id || 'me'

  // Build stats lookup by date
  const statsMap = React.useMemo(() => {
    const map = {}
    statsHistory.forEach(s => {
      const dateKey = (s.date || s.recorded_at || s.created_at || '').split('T')[0]
      if (dateKey) map[dateKey] = s
    })
    return map
  }, [statsHistory])

  // Fetch photos and stats
  const fetchData = useCallback(async () => {
    if (!gymId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [photosRes, statsRes] = await Promise.all([
        api.get(`/gyms/${gymId}/members/${memberId}/photos`).catch(() => ({ data: { photos: [] } })),
        api.get(`/gyms/${gymId}/members/me/body-stats/history`).catch(() => ({ data: { history: [] } })),
      ])
      const photoList = photosRes.data?.photos || photosRes.data || []
      const progressPhotos = Array.isArray(photoList)
        ? photoList.filter(p => p.type === 'progress' || !p.type).sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
          )
        : []
      setPhotos(progressPhotos)
      setStatsHistory(statsRes.data?.history || statsRes.data || [])
    } catch (err) {
      console.warn('Failed to fetch progress data:', err)
    } finally {
      setLoading(false)
    }
  }, [gymId, memberId])

  useEffect(() => { fetchData() }, [fetchData])

  // Take / pick photo
  const handleAddPhoto = useCallback(async () => {
    if (!ImagePicker) {
      premiumAlert('Camera Unavailable', 'expo-image-picker is not installed.')
      return
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        premiumAlert('Permission Required', 'Camera access is needed to take progress photos.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [3, 4],
      })

      if (result.canceled || result.cancelled) return

      const asset = result.assets?.[0] || result
      if (!asset.base64) {
        premiumAlert('Error', 'Could not capture photo data.')
        return
      }

      setUploading(true)
      try {
        await api.post(`/gyms/${gymId}/members/${memberId}/photos`, {
          photo: asset.base64,
          type: 'progress',
        })
        await fetchData()
      } catch (err) {
        premiumAlert('Upload Failed', 'Could not save your progress photo. Please try again.')
      } finally {
        setUploading(false)
      }
    } catch (err) {
      premiumAlert('Error', 'Something went wrong while taking the photo.')
    }
  }, [gymId, memberId, fetchData])

  // Toggle photo selection for comparison
  const toggleSelect = useCallback((photo) => {
    setSelectedPhotos(prev => {
      const exists = prev.find(p => p.id === photo.id)
      if (exists) return prev.filter(p => p.id !== photo.id)
      if (prev.length >= 2) return [prev[1], photo]
      return [...prev, photo]
    })
  }, [])

  // Open comparison when 2 photos selected
  useEffect(() => {
    if (selectedPhotos.length === 2) {
      setShowCompare(true)
    }
  }, [selectedPhotos])

  // Group photos by month
  const groupedPhotos = React.useMemo(() => {
    const groups = {}
    photos.forEach(p => {
      const d = new Date(p.created_at)
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return Object.entries(groups)
  }, [photos])

  const isSelected = (photo) => selectedPhotos.some(p => p.id === photo.id)

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress Photos</Text>
        <TouchableOpacity onPress={handleAddPhoto} style={styles.addBtn} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Feather name="camera" size={22} color={COLORS.accent} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : photos.length === 0 ? (
        /* Empty state */
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="image" size={48} color={COLORS.textTer} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Progress Photos Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSec }]}>
            Take your first progress photo to start tracking your transformation journey.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleAddPhoto} disabled={uploading}>
            <Feather name="camera" size={18} color="#FFF" />
            <Text style={styles.emptyBtnText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Selection hint */}
          {selectedPhotos.length === 1 && (
            <View style={styles.selectionHint}>
              <Feather name="info" size={14} color={COLORS.accent} />
              <Text style={styles.selectionHintText}>Select one more photo to compare</Text>
            </View>
          )}

          {selectedPhotos.length === 2 && (
            <TouchableOpacity
              style={styles.compareBtn}
              onPress={() => setShowCompare(true)}
            >
              <Feather name="columns" size={16} color="#FFF" />
              <Text style={styles.compareBtnText}>Compare Selected</Text>
            </TouchableOpacity>
          )}

          {/* Photo grid grouped by month */}
          {groupedPhotos.map(([month, monthPhotos]) => (
            <View key={month} style={styles.monthGroup}>
              <Text style={[styles.monthLabel, { color: colors.textSec }]}>{month}</Text>
              <View style={styles.grid}>
                {monthPhotos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={[
                      styles.gridItem,
                      isSelected(photo) && styles.gridItemSelected,
                    ]}
                    onPress={() => toggleSelect(photo)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: photo.url || photo.photo_url }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                    {isSelected(photo) && (
                      <View style={styles.selectedOverlay}>
                        <View style={styles.selectedCheck}>
                          <Feather name="check" size={16} color="#FFF" />
                        </View>
                      </View>
                    )}
                    <View style={styles.gridDateBadge}>
                      <Text style={styles.gridDateText}>
                        {formatShort(photo.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Weight trend chart */}
          <WeightChart data={statsHistory} colors={colors} />
        </ScrollView>
      )}

      {/* Comparison modal */}
      <ComparisonModal
        visible={showCompare}
        photos={selectedPhotos}
        statsMap={statsMap}
        onClose={() => {
          setShowCompare(false)
          setSelectedPhotos([])
        }}
      />
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    color: COLORS.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },

  // ── Selection hint / compare button ───────────────────────────────
  selectionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  selectionHintText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.accent,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginBottom: 12,
  },
  compareBtnText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: '#FFF',
  },

  // ── Month groups / grid ───────────────────────────────────────────
  monthGroup: {
    marginBottom: 20,
  },
  monthLabel: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.textSec,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.25,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.bgSec,
  },
  gridItemSelected: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.25)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 6,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDateBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  gridDateText: {
    fontSize: 10,
    fontFamily: FONT.numSemibold,
    color: '#FFF',
    textAlign: 'center',
  },

  // ── Empty state ───────────────────────────────────────────────────
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.textSec,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: '#FFF',
  },

  // ── Weight chart ──────────────────────────────────────────────────
  chartWrap: {
    backgroundColor: COLORS.bgSec,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.text,
    marginBottom: 12,
  },

  // ── Comparison modal ──────────────────────────────────────────────
  compareModal: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  compareClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    color: COLORS.text,
  },
  overlayToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayToggleActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },

  // Side by side
  compareSideBySide: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  comparePhotoCol: {
    flex: 1,
    alignItems: 'center',
  },
  compareImg: {
    width: COMPARE_W,
    height: COMPARE_W * 1.4,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSec,
  },
  compareDate: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.textSec,
    marginTop: 8,
    textAlign: 'center',
  },
  compareStats: {
    fontSize: 11,
    fontFamily: FONT.numSemibold,
    color: COLORS.text,
    marginTop: 4,
    textAlign: 'center',
  },
  compareBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  compareBadgeAfter: {
    backgroundColor: 'rgba(16,185,129,0.7)',
  },
  compareBadgeText: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: '#FFF',
    letterSpacing: 0.8,
  },
  compareDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
  },
  compareWeightDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  compareWeightDiffText: {
    fontSize: 16,
    fontFamily: FONT.semibold,
  },

  // Overlay mode
  overlayWrap: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.bgSec,
  },
  overlayFullImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlayClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  sliderHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sliderLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#FFF',
    opacity: 0.7,
  },
  sliderKnob: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLabels: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayLabel: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },

  // ── Pose guide ────────────────────────────────────────────────────
  poseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poseBody: {
    width: 120,
    height: 240,
    alignItems: 'center',
  },
  poseHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  poseTorso: {
    width: 50,
    height: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    marginTop: 4,
  },
  poseArmLeft: {
    position: 'absolute',
    top: 44,
    left: 4,
    width: 28,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '30deg' }],
  },
  poseArmRight: {
    position: 'absolute',
    top: 44,
    right: 4,
    width: 28,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '-30deg' }],
  },
  poseLegLeft: {
    position: 'absolute',
    bottom: 0,
    left: 30,
    width: 2,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '5deg' }],
  },
  poseLegRight: {
    position: 'absolute',
    bottom: 0,
    right: 30,
    width: 2,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '-5deg' }],
  },
  poseHint: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    textAlign: 'center',
  },
})
