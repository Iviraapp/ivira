import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS, ELITE_CARD } from '../lib/theme'
import { formatDate, formatTime, getInitials } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { calculateBMI, getBMICategory } from '../lib/healthCalculator'
import { startGymGeofencing, stopGymGeofencing, isGeofencingActive } from '../lib/gymGeofence'
import api from '../lib/api'
import { getItem, setItem } from '../lib/storage'
import { premiumAlert } from '../components/PremiumAlert'
import ThemeToggle from '../components/ThemeToggle'

let ImagePicker = null
try { ImagePicker = require('expo-image-picker') } catch (err) { console.warn('[Profile] ImagePicker load:', err?.message) }

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function StatusBadge({ status }) {
  const isActive = status === 'active'
  const color = isActive ? COLORS.green : status === 'paused' ? COLORS.amber : COLORS.red
  const label = isActive ? 'Active' : status === 'expired' ? 'Expired' : status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

function SettingRow({ icon, label, sublabel, value, onValueChange, disabled, colors: c }) {
  return (
    <View style={[styles.settingRow, { backgroundColor: 'transparent' }]}>
      <View style={styles.settingRowLeft}>
        <View style={[styles.settingIconWrap, { backgroundColor: c.bgTer }]}>
          <Feather name={icon} size={18} color={c.textSec} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: c.text }]}>{label}</Text>
          {sublabel ? <Text style={[styles.settingSublabel, { color: c.textTer }]}>{sublabel}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.bgTer, true: COLORS.accent }}
        thumbColor={c.text}
        ios_backgroundColor={c.bgTer}
      />
    </View>
  )
}

function ActionRow({ icon, label, onPress, color, expanded, colors: c }) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.actionRowLeft}>
        <View style={[styles.settingIconWrap, { backgroundColor: c.bgTer }]}>
          <Feather name={icon} size={18} color={color || c.textSec} />
        </View>
        <Text style={[styles.actionLabel, { color: c.text }, color && { color }]}>{label}</Text>
      </View>
      <Feather
        name={expanded ? 'chevron-down' : 'chevron-right'}
        size={18}
        color={c.textTer}
      />
    </TouchableOpacity>
  )
}

const CHECKIN_METHOD_LABELS = {
  qr: 'QR Code',
  nfc: 'NFC',
  manual: 'Manual',
  otp: 'OTP',
  gps: 'GPS',
}

const CHECKIN_METHOD_ICONS = {
  qr: 'maximize',
  nfc: 'wifi',
  manual: 'edit-3',
  otp: 'hash',
  gps: 'map-pin',
}

export default function ProfileScreen({ navigation }) {
  const { member, gymId, gymInfo, logout, biometricAvailable, biometricEnabled, setBiometricEnabled, refreshProfile, connectGym } = useAuth()
  const { colors, isDark, card } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [qrModalVisible, setQrModalVisible] = useState(false)

  // Body Stats state
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [savingStats, setSavingStats] = useState(false)

  // Bookings state
  const [bookingsExpanded, setBookingsExpanded] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [cancellingBookingId, setCancellingBookingId] = useState(null)

  // Check-in History state
  const [checkinsExpanded, setCheckinsExpanded] = useState(false)
  const [checkins, setCheckins] = useState([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)

  // Leaderboard visibility state
  const [leaderboardVisible, setLeaderboardVisible] = useState(false)

  // Gym proximity state
  const [gymProximityEnabled, setGymProximityEnabled] = useState(false)

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Profile picture state
  const [profilePhoto, setProfilePhoto] = useState(null)

  // Edit Profile state
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editGender, setEditGender] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [editWeight, setEditWeight] = useState('')
  const [editHeight, setEditHeight] = useState('')
  const [editGoal, setEditGoal] = useState('')

  // Connect Gym state
  const [showConnectGym, setShowConnectGym] = useState(false)
  const [gymCode, setGymCode] = useState('')
  const [connectingGym, setConnectingGym] = useState(false)

  const membership = member?.membership || member?.active_membership || null
  const isExpired = membership?.status === 'expired'
  const isActive = membership?.status === 'active'

  // Initialize body stats from member data
  useEffect(() => {
    if (member?.height_cm) setHeightCm(String(member.height_cm))
    if (member?.weight_kg) setWeightKg(String(member.weight_kg))
    getItem('leaderboard_visible').then(v => { if (v === 'true') setLeaderboardVisible(true) }).catch(err => console.warn('[Profile]', err?.message))
    isGeofencingActive().then(active => setGymProximityEnabled(active)).catch(err => console.warn('[Profile]', err?.message))
    // Load profile photo from storage or member data
    if (member?.photo_url) {
      setProfilePhoto(member.photo_url)
    } else {
      getItem('ivira_profile_photo').then(uri => { if (uri) setProfilePhoto(uri) }).catch(err => console.warn('[Profile]', err?.message))
    }
  }, [member?.height_cm, member?.weight_kg, member?.photo_url])

  // BMI calculation
  const bmi = useMemo(() => {
    const h = parseFloat(heightCm)
    const w = parseFloat(weightKg)
    return calculateBMI(w, h)
  }, [heightCm, weightKg])

  const bmiCategory = useMemo(() => getBMICategory(bmi), [bmi])

  const daysRemaining = useCallback(() => {
    if (!membership?.end_date) return null
    const end = new Date(membership.end_date)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [membership])

  // --- Body Stats ---
  const handleSaveStats = async () => {
    const h = parseFloat(heightCm)
    const w = parseFloat(weightKg)
    if (!h || !w || h <= 0 || w <= 0) {
      premiumAlert('Invalid Input', 'Please enter valid height and weight values.')
      return
    }

    setSavingStats(true)
    try {
      await api.patch(`/gyms/${gymId}/members/${member.id}`, {
        height_cm: h,
        weight_kg: w,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      premiumAlert('Saved', 'Body stats updated successfully.')
      if (refreshProfile) refreshProfile()
    } catch (err) {
      premiumAlert('Error', err.response?.data?.message || 'Failed to save body stats.')
    } finally {
      setSavingStats(false)
    }
  }

  // --- Profile Picture Upload (30-day cooldown enforced by backend) ---
  const handleProfilePictureUpload = async () => {
    if (!ImagePicker) {
      premiumAlert('Not Available', 'Photo picker is not available on this device.')
      return
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        premiumAlert('Permission Denied', 'We need photo library access to upload your profile picture.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
      })

      if (result.canceled) return

      const localUri = result.assets[0].uri
      setUploadingPhoto(true)

      // Upload to dedicated photo endpoint (enforces 30-day cooldown)
      const res = await api.put(`/gyms/${gymId}/members/me/photo`, {
        image: result.assets[0].base64,
        mimetype: result.assets[0].mimeType || 'image/jpeg',
      })

      // Store locally for immediate display
      const serverUrl = res.data?.photo_url || localUri
      setProfilePhoto(serverUrl)
      await setItem('ivira_profile_photo', serverUrl)

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      if (refreshProfile) refreshProfile()
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to upload profile picture.'
      premiumAlert('Cannot Update Photo', msg)
    } finally {
      setUploadingPhoto(false)
    }
  }

  // --- Photo Upload ---
  const handlePhotoUpload = async () => {
    if (!ImagePicker) {
      premiumAlert('Not Available', 'Photo picker is not available on this device.')
      return
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        premiumAlert('Permission Denied', 'We need photo library access to upload progress photos.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      })

      if (result.canceled) return

      setUploadingPhoto(true)
      await api.post(`/gyms/${gymId}/members/${member.id}/photos`, {
        image: result.assets[0].base64,
        type: 'progress',
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      premiumAlert('Success', 'Progress photo uploaded successfully.')
      if (refreshProfile) refreshProfile()
    } catch (err) {
      premiumAlert('Error', err.response?.data?.message || 'Failed to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // --- Bookings ---
  const loadBookings = async () => {
    setBookingsLoading(true)
    try {
      const res = await api.get(`/gyms/${gymId}/members/${member.id}/bookings`)
      setBookings(res.data?.bookings || res.data || [])
    } catch (err) {
      console.warn('[Profile] loadBookings:', err?.message)
      setBookings([])
    } finally {
      setBookingsLoading(false)
    }
  }

  const handleToggleBookings = () => {
    const next = !bookingsExpanded
    setBookingsExpanded(next)
    if (next && bookings.length === 0) loadBookings()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleCancelBooking = (bookingId, className) => {
    premiumAlert(
      'Cancel Booking',
      `Cancel your booking for ${className || 'this class'}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancellingBookingId(bookingId)
            try {
              await api.post(`/gyms/${gymId}/bookings/${bookingId}/cancel`)
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              setBookings((prev) => prev.filter((b) => b.id !== bookingId))
              premiumAlert('Cancelled', 'Booking has been cancelled.')
            } catch (err) {
              premiumAlert('Error', err.response?.data?.message || 'Failed to cancel booking.')
            } finally {
              setCancellingBookingId(null)
            }
          },
        },
      ],
    )
  }

  // --- Check-in History ---
  const loadCheckins = async () => {
    setCheckinsLoading(true)
    try {
      const res = await api.get(`/gyms/${gymId}/members/${member.id}/checkins?limit=10`)
      setCheckins(res.data?.checkins || res.data || [])
    } catch (err) {
      console.warn('[Profile] loadCheckins:', err?.message)
      setCheckins([])
    } finally {
      setCheckinsLoading(false)
    }
  }

  const handleToggleCheckins = () => {
    const next = !checkinsExpanded
    setCheckinsExpanded(next)
    if (next && checkins.length === 0) loadCheckins()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // --- Other handlers ---
  const handleDigitalId = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setQrModalVisible(true)
  }

  const handleInvoices = () => {
    if (navigation) {
      navigation.navigate('Invoices')
    }
  }

  const handleSupport = () => {
    premiumAlert(
      'Contact Support',
      'Reach us at support@ivira.app or WhatsApp +91 98765 43210',
    )
  }

  const handleAbout = () => {
    premiumAlert(
      'About IVIRA',
      'IVIRA v1.0.0\nGym management made simple.\n\n\u00A9 2026 IVIRA',
    )
  }

  const handleExportData = async () => {
    if (!gymId) {
      premiumAlert('Not Connected', 'Connect a gym to export your data.')
      return
    }
    try {
      await api.get(`/gyms/${gymId}/members/me/export`)
      premiumAlert('Data Export', 'Your data has been emailed to you.')
    } catch (err) {
      premiumAlert('Error', err.response?.data?.message || 'Failed to export data. Please try again.')
    }
  }

  const handleDeleteAccount = () => {
    premiumAlert(
      'Delete Account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              if (gymId) {
                await api.delete(`/gyms/${gymId}/members/me`)
              }
              await logout()
            } catch (err) {
              premiumAlert('Error', err.response?.data?.message || 'Failed to delete account. Please try again.')
            }
          },
        },
      ],
    )
  }

  const handleLogout = () => {
    premiumAlert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          await logout()
        },
      },
    ])
  }

  const handleBiometricToggle = (val) => {
    setBiometricEnabled(val)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleNotificationsToggle = (val) => {
    setNotificationsEnabled(val)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleLeaderboardToggle = (val) => {
    setLeaderboardVisible(val)
    setItem('leaderboard_visible', val ? 'true' : 'false').catch(err => console.warn('[Profile]', err?.message))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Sync to backend
    if (gymId && member?.id) {
      api.patch(`/gyms/${gymId}/members/${member.id}`, { show_location_data: val }).catch(err => console.warn('[Profile]', err?.message))
    }
  }

  const handleGymProximityToggle = async (val) => {
    setGymProximityEnabled(val)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (val) {
      if (gymInfo?.latitude && gymInfo?.longitude) {
        const started = await startGymGeofencing(gymInfo)
        if (!started) {
          setGymProximityEnabled(false)
          premiumAlert('Location Required', 'Please enable location permissions to use gym proximity alerts.')
        }
      } else {
        setGymProximityEnabled(false)
        premiumAlert('Not Available', 'Your gym hasn\'t set its location yet. Contact your gym to enable this feature.')
      }
    } else {
      await stopGymGeofencing()
    }
  }

  const handleOpenEditProfile = () => {
    setEditName(member?.name || '')
    setEditPhone(member?.phone || '')
    setEditEmail(member?.email || '')
    setEditDob(member?.date_of_birth || member?.dob || '')
    setEditGender(member?.gender || '')
    setEditWeight(String(member?.weight || ''))
    setEditHeight(String(member?.height || ''))
    setEditGoal(member?.fitness_goal || '')
    setShowEditProfile(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleSaveProfile = async () => {
    const name = editName.trim()
    if (!name) {
      premiumAlert('Required', 'Name cannot be empty.')
      return
    }

    setSavingProfile(true)
    try {
      const payload = { name }
      if (editEmail.trim()) payload.email = editEmail.trim()
      if (editDob.trim()) payload.date_of_birth = editDob.trim()
      if (editGender) payload.gender = editGender
      if (editWeight) payload.weight = parseFloat(editWeight)
      if (editHeight) payload.height = parseFloat(editHeight)
      if (editGoal) payload.fitness_goal = editGoal

      await api.patch(`/gyms/${gymId}/members/${member.id}`, payload)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowEditProfile(false)
      if (refreshProfile) refreshProfile()
    } catch (err) {
      premiumAlert('Error', err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleConnectGym = async () => {
    const code = gymCode.trim()
    if (!code) {
      premiumAlert('Enter Code', 'Please enter your facility code.')
      return
    }
    setConnectingGym(true)
    try {
      await connectGym(code)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowConnectGym(false)
      setGymCode('')
    } catch (err) {
      premiumAlert('Connection Failed', err.response?.data?.message || err.message || 'Invalid facility code. Please try again.')
    } finally {
      setConnectingGym(false)
    }
  }

  const remaining = daysRemaining()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              try {
                await refreshProfile?.()
              } catch (err) { console.warn('[Profile] refresh:', err?.message) }
              setRefreshing(false)
            }}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* Profile Header Card */}
        <View style={[styles.headerCard, card]}>
          <TouchableOpacity style={styles.avatarOuter} onPress={handleProfilePictureUpload} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(member?.name)}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.name, { color: colors.text }]}>{member?.name || 'Member'}</Text>
          <Text style={[styles.phone, { color: colors.textSec }]}>{member?.phone || ''}</Text>
          <Text style={[styles.since, { color: colors.textTer }]}>
            Member since {formatDate(member?.created_at)}
          </Text>

          <View style={styles.headerActions}>
            {membership && <StatusBadge status={membership.status} />}
            <TouchableOpacity
              style={[styles.digitalIdBtn, { backgroundColor: colors.accentSoft }]}
              onPress={handleDigitalId}
              activeOpacity={0.7}
            >
              <Feather name="credit-card" size={14} color={COLORS.accent} />
              <Text style={styles.digitalIdText}>Digital Member ID</Text>
            </TouchableOpacity>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={[styles.editProfileBtn, { borderColor: colors.border }]}
            onPress={handleOpenEditProfile}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color={COLORS.accent} />
            <Text style={[styles.editProfileText, { color: COLORS.accent }]}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Membership info */}
          {membership && (
            <View style={[styles.membershipInfo, { backgroundColor: colors.bgTer }]}>
              <View style={styles.membershipRow}>
                <Text style={[styles.membershipPlan, { color: colors.text }]}>
                  {membership.plan_name || 'Membership'}
                </Text>
                {!isExpired && remaining !== null && (
                  <Text style={[styles.membershipDays, { color: colors.textSec }]}>
                    {remaining} days left
                  </Text>
                )}
              </View>
              {isExpired && (
                <TouchableOpacity
                  style={styles.renewButton}
                  onPress={() => premiumAlert('Renew Membership', 'Please contact your gym to renew.')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.renewButtonText, { color: colors.text }]}>Renew Membership</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Progress Summary — streak & weight progress */}
        <View style={[styles.progressSummary, card, styles.cardAccentBorder]}>
          <View style={styles.progressSummaryInner}>
            <View style={styles.progressStatCol}>
              <Text style={[styles.progressStatVal, { color: colors.accent }]}>
                {member?.streak || 1}
              </Text>
              <Text style={[styles.progressStatUnit, { color: colors.textTer }]}>day</Text>
              <Text style={[styles.progressStatLabel, { color: colors.textSec }]}>Streak</Text>
            </View>

            <TouchableOpacity style={styles.progressAvatarCol} onPress={handleProfilePictureUpload} activeOpacity={0.7}>
              <View style={[styles.progressAvatarRing, { borderColor: colors.accent }]}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                ) : (
                  <View style={[styles.progressAvatarFallback, { backgroundColor: colors.accentSoft }]}>
                    <Text style={styles.progressAvatarInitials}>{getInitials(member?.name)}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.progressUserName, { color: colors.text }]}>{member?.name || 'You'}</Text>
            </TouchableOpacity>

            <View style={styles.progressStatCol}>
              <Text style={[styles.progressStatVal, { color: COLORS.green }]}>
                {member?.weight_kg ? `${(82 - (member.weight_kg || 82)).toFixed(1)}` : '0'}
              </Text>
              <Text style={[styles.progressStatUnit, { color: colors.textTer }]}>kg</Text>
              <Text style={[styles.progressStatLabel, { color: colors.textSec }]}>Progress</Text>
            </View>
          </View>
        </View>

        {/* CRED-style Quick Menu — grouped icon tiles */}
        <View style={styles.section}>
          <Text style={[styles.credMenuTitle, { color: colors.textTer }]}>FITNESS</Text>
          <View style={[styles.credMenuCard, card, styles.cardAccentBorder]}>
            <View style={styles.credMenuGrid}>
              {[
                { icon: 'activity', label: 'Workouts', bg: '#F97316', onPress: () => navigation.navigate('WorkoutTracker') },
                { icon: 'bar-chart-2', label: 'Progress', bg: COLORS.accent, onPress: () => navigation.navigate('Progress') },
                { icon: 'target', label: 'Challenges', bg: '#8B5CF6', onPress: () => navigation.navigate('Challenges') },
                { icon: 'star', label: 'Achievements', bg: '#F59E0B', onPress: () => navigation.navigate('Achievements') },
              ].map(item => (
                <TouchableOpacity key={item.label} style={styles.credMenuItem} onPress={item.onPress} activeOpacity={0.65}>
                  <View style={[styles.credMenuIcon, { backgroundColor: item.bg + (isDark ? '1A' : '20') }]}>
                    <Feather name={item.icon} size={22} color={item.bg} />
                  </View>
                  <Text style={[styles.credMenuLabel, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.credMenuTitle, { color: colors.textTer }]}>NUTRITION & HEALTH</Text>
          <View style={[styles.credMenuCard, card, styles.cardAccentBorder]}>
            <View style={styles.credMenuGrid}>
              {[
                { icon: 'camera', label: 'Food Scanner', bg: '#EA4335', onPress: () => navigation.navigate('FoodScanner') },
                { icon: 'pie-chart', label: 'Nutrition', bg: '#14B8A6', onPress: () => navigation.navigate('NutritionLog') },
                { icon: 'moon', label: 'Sleep', bg: '#6366F1', onPress: () => navigation.navigate('SleepTracker') },
                { icon: 'clock', label: 'Fasting', bg: '#8B5CF6', onPress: () => navigation.navigate('FastingLog') },
              ].map(item => (
                <TouchableOpacity key={item.label} style={styles.credMenuItem} onPress={item.onPress} activeOpacity={0.65}>
                  <View style={[styles.credMenuIcon, { backgroundColor: item.bg + (isDark ? '1A' : '20') }]}>
                    <Feather name={item.icon} size={22} color={item.bg} />
                  </View>
                  <Text style={[styles.credMenuLabel, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.credMenuTitle, { color: colors.textTer }]}>QUICK ACCESS</Text>
          <View style={[styles.credMenuCard, card, styles.cardAccentBorder]}>
            <View style={styles.credMenuGrid}>
              {[
                { icon: 'credit-card', label: 'Membership', bg: COLORS.accent, onPress: () => navigation.navigate('MembershipRenewal') },
                { icon: 'activity', label: 'Workouts', bg: '#8B5CF6', onPress: () => navigation.navigate('WorkoutHistory') },
                { icon: 'clock', label: 'Check-ins', bg: '#06B6D4', onPress: handleToggleCheckins },
                { icon: 'calendar', label: 'Bookings', bg: '#F59E0B', onPress: handleToggleBookings },
                { icon: 'image', label: 'Progress', bg: '#EC4899', onPress: handlePhotoUpload },
                { icon: 'gift', label: 'Refer', bg: '#10B981', onPress: () => navigation.navigate('Referral') },
              ].map(item => (
                <TouchableOpacity key={item.label} style={styles.credMenuItemWide} onPress={item.onPress} activeOpacity={0.65}>
                  <View style={[styles.credMenuIcon, { backgroundColor: item.bg + (isDark ? '1A' : '20') }]}>
                    <Feather name={item.icon} size={22} color={item.bg} />
                  </View>
                  <Text style={[styles.credMenuLabel, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Connect Your Facility Card */}
        {!gymId && (
          <TouchableOpacity
            style={[styles.connectCard, { backgroundColor: colors.accentSoft }]}
            onPress={() => setShowConnectGym(true)}
            activeOpacity={0.8}
          >
            <View style={styles.connectIconWrap}>
              <Feather name="link" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.connectTitle, { color: colors.text }]}>Connect Your Facility</Text>
              <Text style={[styles.connectSubtitle, { color: colors.textTer }]}>Link your gym for classes, trainers & check-ins</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTer} />
          </TouchableOpacity>
        )}

        {/* Body Stats Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTer }]}>BODY STATS</Text>
          <View style={[styles.sectionCard, card, styles.cardAccentBorder]}>
            <View style={styles.bodyStatsContent}>
              <View style={styles.bodyStatsInputRow}>
                <View style={styles.bodyStatsField}>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec }]}>Height (cm)</Text>
                  <TextInput
                    style={[styles.bodyStatsInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="numeric"
                    placeholder="170"
                    placeholderTextColor={colors.textTer}
                    maxLength={5}
                  />
                </View>
                <View style={styles.bodyStatsField}>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec }]}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.bodyStatsInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor={colors.textTer}
                    maxLength={5}
                  />
                </View>
              </View>

              {bmi && (
                <View style={[styles.bmiRow, { backgroundColor: colors.bgHover }]}>
                  <View style={styles.bmiValueWrap}>
                    <Text style={[styles.bmiLabel, { color: colors.textSec }]}>BMI</Text>
                    <Text style={[styles.bmiValue, { color: colors.text }]}>{bmi}</Text>
                  </View>
                  {bmiCategory && (
                    <View style={[styles.bmiCategoryBadge, { backgroundColor: bmiCategory.color + '22' }]}>
                      <View style={[styles.badgeDot, { backgroundColor: bmiCategory.color }]} />
                      <Text style={[styles.bmiCategoryText, { color: bmiCategory.color }]}>
                        {bmiCategory.label}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveStatsBtn, savingStats && styles.saveStatsBtnDisabled]}
                onPress={handleSaveStats}
                activeOpacity={0.7}
                disabled={savingStats}
              >
                {savingStats ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={[styles.saveStatsBtnText, { color: colors.text }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTer }]}>SETTINGS</Text>
          <View style={[styles.sectionCard, card, styles.cardAccentBorder]}>
            <SettingRow
              icon="smartphone"
              label="Biometric Login"
              sublabel={biometricAvailable ? 'Face ID / Fingerprint' : 'Not available on this device'}
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              colors={colors}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="bell"
              label="Notifications"
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              colors={colors}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation.navigate('NotificationSettings')}
              activeOpacity={0.7}
            >
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.bgTer }]}>
                  <Feather name="cpu" size={18} color={COLORS.accent} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Smart Notifications</Text>
                  <Text style={{ fontSize: 11, color: colors.textTer, marginTop: 1 }}>Adapts to your daily patterns</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textTer} />
            </TouchableOpacity>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="map-pin"
              label="Gym Proximity Alerts"
              sublabel="Notify when you're near your gym"
              value={gymProximityEnabled}
              onValueChange={handleGymProximityToggle}
              colors={colors}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ThemeToggle />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="globe"
              label="Global Leaderboard"
              sublabel="Show your steps on City & State rankings"
              value={leaderboardVisible}
              onValueChange={handleLeaderboardToggle}
              colors={colors}
            />
          </View>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTer }]}>DATA & PRIVACY</Text>
          <View style={[styles.sectionCard, card, styles.cardAccentBorder]}>
            <ActionRow icon="file-text" label="Invoices" onPress={handleInvoices} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ActionRow icon="download" label="Export My Data" onPress={handleExportData} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ActionRow icon="trash-2" label="Delete Account" onPress={handleDeleteAccount} color={COLORS.red} colors={colors} />
          </View>
        </View>

        {/* Transformation Photos Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTer }]}>TRANSFORMATION</Text>
          <View style={[styles.sectionCard, card, styles.cardAccentBorder]}>
            {member?.photos?.length > 0 ? (
              <View style={styles.photosContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosScroll}
                >
                  {(member?.photos || []).map((photo, idx) => (
                    <View key={photo.id || idx} style={styles.photoCard}>
                      <Image
                        source={{ uri: photo.url || photo.image_url }}
                        style={[styles.photoImage, { backgroundColor: colors.bgTer }]}
                        resizeMode="cover"
                      />
                      {photo.created_at && (
                        <Text style={[styles.photoDate, { color: colors.textTer }]}>{formatDate(photo.created_at)}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.addPhotoBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={handlePhotoUpload}
                  activeOpacity={0.7}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <>
                      <Feather name="plus" size={18} color={COLORS.accent} />
                      <Text style={styles.uploadBtnText}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.transformEmpty}>
                <View style={[styles.transformEmptyIcon, { backgroundColor: colors.bgTer }]}>
                  <Feather name="camera" size={32} color={colors.textTer} />
                </View>
                <Text style={[styles.transformEmptyTitle, { color: colors.text }]}>Start your transformation journey</Text>
                <Text style={[styles.transformEmptySubtitle, { color: colors.textTer }]}>
                  Upload progress photos to track your fitness transformation over time
                </Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={handlePhotoUpload}
                  activeOpacity={0.7}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <>
                      <Feather name="plus" size={18} color={COLORS.accent} />
                      <Text style={styles.uploadBtnText}>Upload Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTer }]}>SUPPORT & ABOUT</Text>
          <View style={[styles.sectionCard, card, styles.cardAccentBorder]}>
            <ActionRow icon="headphones" label="Contact Support" onPress={handleSupport} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ActionRow icon="info" label="About IVIRA" onPress={handleAbout} colors={colors} />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={[styles.sectionCard, card]}>
            <ActionRow icon="log-out" label="Log Out" onPress={handleLogout} color={COLORS.red} colors={colors} />
          </View>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: colors.textTer }]}>IVIRA v1.0.0</Text>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQrModalVisible(false)}
        >
          <View style={[styles.modalContent, card]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Digital Member ID</Text>

            <View style={[styles.qrPlaceholder, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
              <Feather name="maximize" size={64} color={colors.textTer} />
              <Text style={[styles.qrPlaceholderText, { color: colors.textTer }]}>
                QR Code
              </Text>
            </View>

            <Text style={[styles.modalName, { color: colors.text }]}>{member?.name || 'Member'}</Text>
            <Text style={[styles.modalPhone, { color: colors.textSec }]}>{member?.phone || ''}</Text>
            {membership && (
              <Text style={styles.modalPlan}>
                {membership.plan_name || 'Member'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.bgTer }]}
              onPress={() => setQrModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textSec }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProfile(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditProfile(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.connectModalContent, card, { borderColor: 'rgba(16,185,129,0.2)' }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>

              <View style={{ width: '100%', gap: SPACING.sm, marginTop: SPACING.md }}>
                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4 }]}>Name</Text>
                  <TextInput
                    style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your name"
                    placeholderTextColor={colors.textTer}
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4 }]}>Phone</Text>
                  <TextInput
                    style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border, opacity: 0.6 }]}
                    value={editPhone}
                    editable={false}
                    placeholderTextColor={colors.textTer}
                  />
                  <Text style={{ fontSize: 10, color: colors.textTer, marginTop: 2 }}>Phone number cannot be changed</Text>
                </View>

                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4 }]}>Email</Text>
                  <TextInput
                    style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textTer}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4 }]}>Date of Birth</Text>
                  <TextInput
                    style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                    value={editDob}
                    onChangeText={setEditDob}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTer}
                    maxLength={10}
                  />
                </View>

                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4 }]}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['male', 'female', 'other'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderChip,
                          { backgroundColor: editGender === g ? COLORS.accent : colors.bgTer, borderColor: editGender === g ? COLORS.accent : colors.border },
                        ]}
                        onPress={() => setEditGender(g)}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: editGender === g ? '#FFF' : colors.textSec }}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Body Metrics */}
                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4, marginTop: 12 }]}>Body Metrics</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.textTer, fontWeight: '400', marginBottom: 4 }}>Weight (kg)</Text>
                      <TextInput
                        style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                        value={editWeight}
                        onChangeText={setEditWeight}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 75"
                        placeholderTextColor={colors.textTer}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.textTer, fontWeight: '400', marginBottom: 4 }}>Height (cm)</Text>
                      <TextInput
                        style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                        value={editHeight}
                        onChangeText={setEditHeight}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 175"
                        placeholderTextColor={colors.textTer}
                      />
                    </View>
                  </View>
                </View>

                {/* Fitness Goal */}
                <View>
                  <Text style={[styles.bodyStatsLabel, { color: colors.textSec, marginBottom: 4, marginTop: 8 }]}>Fitness Goal</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {['Lose Fat', 'Build Muscle', 'Maintain', 'Get Fit', 'Flexibility'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderChip,
                          { backgroundColor: editGoal === g ? COLORS.accent : colors.bgTer, borderColor: editGoal === g ? COLORS.accent : colors.border },
                        ]}
                        onPress={() => setEditGoal(g)}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: editGoal === g ? '#FFF' : colors.textSec }}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.connectModalBtn, savingProfile && { opacity: 0.6 }, { marginTop: SPACING.lg }]}
                onPress={handleSaveProfile}
                activeOpacity={0.7}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.connectModalBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.bgTer, marginTop: SPACING.sm }]}
                onPress={() => setShowEditProfile(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCloseBtnText, { color: colors.textSec }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Connect Gym Modal */}
      <Modal
        visible={showConnectGym}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConnectGym(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConnectGym(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.connectModalContent, card, { borderColor: 'rgba(16,185,129,0.2)' }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />
              <View style={[styles.connectModalIconWrap, { backgroundColor: colors.accentSoft }]}>
                <Feather name="link" size={28} color={COLORS.accent} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Connect Your Facility</Text>
              <Text style={[styles.connectModalDesc, { color: colors.textSec }]}>
                Enter the facility code provided by your gym to unlock classes, trainers, and check-ins.
              </Text>

              <TextInput
                style={[styles.connectModalInput, { backgroundColor: colors.bgHover, color: colors.text, borderColor: colors.border }]}
                value={gymCode}
                onChangeText={setGymCode}
                placeholder="Enter facility code"
                placeholderTextColor={colors.textTer}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />

              <TouchableOpacity
                style={[styles.connectModalBtn, connectingGym && { opacity: 0.6 }]}
                onPress={handleConnectGym}
                activeOpacity={0.7}
                disabled={connectingGym}
              >
                {connectingGym ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.connectModalBtnText}>Connect</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.bgTer, marginTop: SPACING.sm }]}
                onPress={() => { setShowConnectGym(false); setGymCode('') }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCloseBtnText, { color: colors.textSec }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: 128,
  },

  // Progress Summary
  progressSummary: {
    ...ELITE_CARD,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  progressSummaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatVal: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressStatUnit: {
    fontSize: 11,
    marginTop: -2,
  },
  progressStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  progressAvatarCol: {
    alignItems: 'center',
    flex: 1,
  },
  progressAvatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressAvatarInitials: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  progressUserName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },

  // Header Card
  headerCard: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarOuter: {
    padding: 3,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.accent,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  phone: {
    fontSize: 14,
    color: COLORS.textSec,
    marginBottom: SPACING.xs,
  },
  since: {
    fontSize: 13,
    color: COLORS.textTer,
    marginBottom: SPACING.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  digitalIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    minHeight: 48,
  },
  digitalIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
    width: '100%',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },
  genderChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  membershipInfo: {
    width: '100%',
    backgroundColor: COLORS.bgTer,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipPlan: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  membershipDays: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSec,
  },
  renewButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    marginTop: SPACING.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  renewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Body Stats
  bodyStatsContent: {
    padding: SPACING.md,
  },
  bodyStatsInputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  bodyStatsField: {
    flex: 1,
  },
  bodyStatsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSec,
    marginBottom: SPACING.xs,
  },
  bodyStatsInput: {
    backgroundColor: COLORS.bgHover,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgHover,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bmiValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bmiLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSec,
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  bmiCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  bmiCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveStatsBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  saveStatsBtnDisabled: {
    opacity: 0.6,
  },
  saveStatsBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Sections
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTer,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  sectionCard: {
    ...ELITE_CARD,
    overflow: 'hidden',
  },
  cardAccentBorder: {
    borderTopWidth: 3,
    borderTopColor: COLORS.accent,
  },
  // CRED-style menu tiles
  credMenuTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  credMenuCard: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: SPACING.md,
  },
  credMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  credMenuItem: {
    alignItems: 'center',
    width: '25%',
    paddingVertical: SPACING.sm + 2,
  },
  credMenuItemWide: {
    alignItems: 'center',
    width: '33.33%',
    paddingVertical: SPACING.sm + 2,
  },
  credMenuIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  credMenuLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.md + SPACING.xl,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    minHeight: 56,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgTer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm + 4,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  settingSublabel: {
    fontSize: 12,
    color: COLORS.textTer,
    marginTop: 2,
  },
  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    minHeight: 56,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Expanded content (bookings + checkins)
  expandedContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  expandedLoading: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  expandedEmpty: {
    fontSize: 13,
    color: COLORS.textTer,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  expandedSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },

  // Check-in items
  checkinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  checkinIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkinInfo: {
    flex: 1,
  },
  checkinDate: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  checkinTime: {
    fontSize: 12,
    color: COLORS.textSec,
    marginTop: 2,
  },
  checkinMethodBadge: {
    backgroundColor: COLORS.bgTer,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  checkinMethodText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSec,
  },

  // Booking items
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingClassName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  bookingDateTime: {
    fontSize: 12,
    color: COLORS.textSec,
    marginTop: 2,
  },
  cancelBookingBtn: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.red + '44',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBookingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.red,
  },

  // Transformation photos
  photosContainer: {
    padding: SPACING.md,
  },
  photosScroll: {
    paddingRight: SPACING.md,
    gap: SPACING.sm,
  },
  photoCard: {
    width: 120,
    marginRight: SPACING.sm,
  },
  photoImage: {
    width: 120,
    height: 160,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgTer,
  },
  photoDate: {
    fontSize: 11,
    color: COLORS.textTer,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    minHeight: 48,
    marginTop: SPACING.md,
  },
  transformEmpty: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  transformEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bgTer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  transformEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  transformEmptySubtitle: {
    fontSize: 13,
    color: COLORS.textTer,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    minHeight: 48,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Logout
  logoutButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.red,
  },

  // Version
  version: {
    fontSize: 12,
    color: COLORS.textTer,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  // QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    width: SCREEN_WIDTH - SPACING.xl * 2,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: COLORS.bgTer,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrPlaceholderText: {
    fontSize: 13,
    color: COLORS.textTer,
    marginTop: SPACING.sm,
  },
  modalName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalPhone: {
    fontSize: 14,
    color: COLORS.textSec,
    marginBottom: SPACING.xs,
  },
  modalPlan: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  modalCloseBtn: {
    backgroundColor: COLORS.bgTer,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSec,
  },

  // Connect Facility Card
  connectCard: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  connectIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  connectSubtitle: {
    fontSize: 13,
    color: COLORS.textTer,
    lineHeight: 18,
  },

  // Connect Gym Modal
  connectModalContent: {
    ...ELITE_CARD,
    padding: SPACING.lg,
    width: SCREEN_WIDTH - SPACING.xl * 2,
    alignItems: 'center',
    borderWidth: 1,
  },
  connectModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  connectModalDesc: {
    fontSize: 14,
    color: COLORS.textSec,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  connectModalInput: {
    width: '100%',
    backgroundColor: COLORS.bgHover,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  connectModalBtn: {
    width: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  connectModalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
