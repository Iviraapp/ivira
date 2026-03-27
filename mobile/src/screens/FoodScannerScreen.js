import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { formatDate } from '../lib/utils'
import Haptics from '../lib/haptics'

let ImagePicker = null
try { ImagePicker = require('expo-image-picker') } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS = { breakfast: 'sunrise', lunch: 'sun', dinner: 'moon', snack: 'coffee' }
const MEAL_COLORS_MAP = { breakfast: '#F97316', lunch: '#34A853', dinner: '#8B5CF6', snack: '#FBBC05' }

// ----- Main Screen -----
export default function FoodScannerScreen({ navigation, route }) {
  const { colors, card, isDark } = useTheme()
  const { member, gymId } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState('scan') // 'scan' | 'search' | 'history'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [imageUri, setImageUri] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null) // { items: [...] }
  const [editingItem, setEditingItem] = useState(null) // index of item being edited
  const [editModal, setEditModal] = useState(false)
  const [editValues, setEditValues] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [mealType, setMealType] = useState(route?.params?.mealType || 'lunch')
  const [logging, setLogging] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState({}) // { index: true/false }

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const resultSlide = useRef(new Animated.Value(50)).current
  const resultFade = useRef(new Animated.Value(0)).current

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()
  }, [])

  // Pulse animation for scanning state
  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      )
      loop.start()
      return () => loop.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [scanning])

  // Animate results in
  const animateResultsIn = useCallback(() => {
    resultSlide.setValue(50)
    resultFade.setValue(0)
    Animated.parallel([
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(resultFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  // Load history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get(`/gyms/${gymId}/members/${member?.id}/food/scans`, { params: { limit: 20 } })
      setHistory(res.data?.scans || res.data?.data || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [gymId, member])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, loadHistory])

  // Pick image from camera
  const pickFromCamera = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Camera is not available on this device.')
      return
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan food photos.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      })
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        setImageUri(asset.uri)
        setImageBase64(asset.base64)
        setScanResult(null)
        setSelectedItems({})
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    } catch (err) {
      console.log('[FoodScanner] Camera error:', err)
      Alert.alert('Error', 'Could not open camera. Please try again.')
    }
  }, [])

  // Pick image from gallery
  const pickFromGallery = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Gallery is not available on this device.')
      return
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed to select food photos.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      })
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        setImageUri(asset.uri)
        setImageBase64(asset.base64)
        setScanResult(null)
        setSelectedItems({})
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    } catch (err) {
      console.log('[FoodScanner] Gallery error:', err)
      Alert.alert('Error', 'Could not open gallery. Please try again.')
    }
  }, [])

  // Search food database (Open Food Facts via backend)
  const searchFood = useCallback(async (query) => {
    if (!query || query.length < 2) return
    setSearching(true)
    try {
      const res = await api.get(`/gyms/${gymId}/members/${member?.id}/food/search`, { params: { q: query } })
      setSearchResults(res.data?.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [gymId, member])

  // Add food from search result to scan results
  const addFoodFromSearch = useCallback((food) => {
    const item = {
      name: food.brand ? `${food.brand} ${food.name}` : food.name,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      confidence: 0.95,
      quantity: 1,
      total_calories: food.calories || 0,
      total_protein: food.protein || 0,
      total_carbs: food.carbs || 0,
      total_fat: food.fat || 0,
    }
    setScanResult(prev => {
      const items = prev?.items ? [...prev.items, item] : [item]
      return { items }
    })
    setActiveTab('scan')
    setSelectedItems(prev => ({ ...prev, [(prev ? Object.keys(prev).length : 0)]: true }))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    animateResultsIn()
  }, [animateResultsIn])

  // Analyze the food photo
  const analyzePhoto = useCallback(async () => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please take or select a photo first.')
      return
    }

    setScanning(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const res = await api.post(`/gyms/${gymId}/members/${member?.id}/food/scan`, {
        image: imageBase64,
        image_uri: imageUri,
      }, { timeout: 30000 })

      const data = res.data?.result || res.data?.data || res.data
      const items = data?.items || data?.foods || []
      const result = {
        items: items.map(item => ({
          name: item.name || item.food_name || 'Unknown Item',
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat || item.fats) || 0,
          confidence: Number(item.confidence) || 0,
        })),
      }
      setScanResult(result)
      const sel = {}
      result.items.forEach((_, i) => { sel[i] = true })
      setSelectedItems(sel)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      animateResultsIn()
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const serverMsg = err.response?.data?.message || err.response?.data?.error || ''
      const isConfigError = serverMsg.includes('No vision') || err.response?.status === 502

      if (isConfigError) {
        // AI not configured — offer manual entry
        Alert.alert(
          'AI Scanner Unavailable',
          'The AI food scanner is being set up. You can add nutrition info manually.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enter Manually',
              onPress: () => {
                setScanResult({
                  items: [{
                    name: 'Food Item',
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    confidence: 1,
                  }],
                })
                setSelectedItems({ 0: true })
                // Open edit modal immediately
                setTimeout(() => {
                  setEditingItem(0)
                  setEditValues({ name: 'Food Item', calories: '0', protein: '0', carbs: '0', fat: '0' })
                  setEditModal(true)
                }, 100)
              },
            },
          ]
        )
      } else {
        Alert.alert(
          'Analysis Failed',
          'Could not analyze the photo. Please try again with a clearer image.'
        )
      }
    } finally {
      setScanning(false)
    }
  }, [imageBase64, imageUri, animateResultsIn, gymId, member?.id])

  // Toggle item selection
  const toggleItemSelection = useCallback((index) => {
    Haptics.selectionAsync()
    setSelectedItems(prev => ({ ...prev, [index]: !prev[index] }))
  }, [])

  // Open edit modal for an item
  const openEditModal = useCallback((index) => {
    const item = scanResult.items[index]
    setEditingItem(index)
    setEditValues({
      name: item.name,
      calories: String(item.calories),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
    })
    setEditModal(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [scanResult])

  // Save edit
  const saveEdit = useCallback(() => {
    if (editingItem === null || !scanResult) return
    const updated = { ...scanResult }
    updated.items = [...updated.items]
    updated.items[editingItem] = {
      ...updated.items[editingItem],
      name: editValues.name || updated.items[editingItem].name,
      calories: parseInt(editValues.calories, 10) || 0,
      protein: parseFloat(editValues.protein) || 0,
      carbs: parseFloat(editValues.carbs) || 0,
      fat: parseFloat(editValues.fat) || 0,
    }
    setScanResult(updated)
    setEditModal(false)
    setEditingItem(null)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [editingItem, editValues, scanResult])

  // Log selected items to nutrition diary
  const logSelectedItems = useCallback(async () => {
    if (!scanResult) return
    const itemsToLog = scanResult.items.filter((_, i) => selectedItems[i])
    if (itemsToLog.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one food item to log.')
      return
    }

    setLogging(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const totalCals = itemsToLog.reduce((s, i) => s + i.calories, 0)
      const totalProtein = itemsToLog.reduce((s, i) => s + i.protein, 0)
      const totalCarbs = itemsToLog.reduce((s, i) => s + i.carbs, 0)
      const totalFat = itemsToLog.reduce((s, i) => s + i.fat, 0)

      if (gymId && member?.id) {
        await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
          mealType,
          rawInput: itemsToLog.map(i => i.name).join(', '),
          items: itemsToLog.map(item => ({
            name: item.name,
            qty: 1,
            unit: 'serving',
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fat,
          })),
          source: 'food_scanner',
          image_uri: imageUri,
        })
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'Logged Successfully',
        `${itemsToLog.length} item${itemsToLog.length > 1 ? 's' : ''} added to ${mealType} (${totalCals} kcal)`,
        [{
          text: 'OK',
          onPress: () => {
            navigation?.navigate?.('HomeMain', {
              nutritionLogged: {
                calories: totalCals,
                protein: totalProtein,
                carbs: totalCarbs,
                fats: totalFat,
              },
            })
          },
        }]
      )
    } catch (err) {
      Alert.alert('Log Failed', err.response?.data?.message || 'Could not save. Please try again.')
    } finally {
      setLogging(false)
    }
  }, [scanResult, selectedItems, mealType, gymId, member, imageUri, navigation])

  // Reset scanner
  const resetScanner = useCallback(() => {
    setImageUri(null)
    setImageBase64(null)
    setScanResult(null)
    setSelectedItems({})
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  // Compute totals for selected items
  const selectedTotals = scanResult
    ? scanResult.items.reduce(
        (acc, item, i) => {
          if (selectedItems[i]) {
            acc.calories += item.calories
            acc.protein += item.protein
            acc.carbs += item.carbs
            acc.fat += item.fat
            acc.count += 1
          }
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
      )
    : { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.bgSec }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Food Scanner</Text>
        <View style={[styles.aiBadge, { backgroundColor: colors.accentSoft }]}>
          <Feather name="cpu" size={12} color={colors.accent} />
          <Text style={[styles.aiBadgeText, { color: colors.accent }]}>AI</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scan' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => { setActiveTab('scan'); Haptics.selectionAsync() }}
          activeOpacity={0.7}
        >
          <Feather name="camera" size={16} color={activeTab === 'scan' ? colors.accent : colors.textTer} />
          <Text style={[styles.tabText, { color: activeTab === 'scan' ? colors.accent : colors.textTer }]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => { setActiveTab('search'); Haptics.selectionAsync() }}
          activeOpacity={0.7}
        >
          <Feather name="search" size={16} color={activeTab === 'search' ? colors.accent : colors.textTer} />
          <Text style={[styles.tabText, { color: activeTab === 'search' ? colors.accent : colors.textTer }]}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
          onPress={() => { setActiveTab('history'); Haptics.selectionAsync() }}
          activeOpacity={0.7}
        >
          <Feather name="clock" size={16} color={activeTab === 'history' ? colors.accent : colors.textTer} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.accent : colors.textTer }]}>History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Food search */}
          <View style={[{ padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md }, card]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Food Database</Text>
            <Text style={{ fontSize: 12, color: colors.textTer, fontFamily: FONT.regular, marginBottom: SPACING.sm }}>
              Search 2M+ products from Open Food Facts
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.searchInputRow, { flex: 1, backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.textTer} />
                <TextInput
                  style={[styles.searchTextInput, { color: colors.text }]}
                  placeholder="e.g. Premier Protein, Greek Yogurt..."
                  placeholderTextColor={colors.textTer}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => searchFood(searchQuery)}
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: COLORS.accent, opacity: searching ? 0.6 : 1 }]}
                onPress={() => searchFood(searchQuery)}
                disabled={searching}
              >
                {searching ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="arrow-right" size={18} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <View style={[{ padding: SPACING.md, borderRadius: RADIUS.lg }, card]}>
              <Text style={{ fontSize: 13, color: colors.textSec, fontFamily: FONT.semibold, marginBottom: SPACING.sm }}>
                {searchResults.length} results found
              </Text>
              {searchResults.map((food, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < searchResults.length - 1 ? 1 : 0, borderColor: colors.border }]}
                  onPress={() => addFoodFromSearch(food)}
                  activeOpacity={0.7}
                >
                  {food.image_url ? (
                    <Image source={{ uri: food.image_url }} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12 }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12, backgroundColor: colors.bgTer, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="box" size={18} color={colors.textTer} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: FONT.semibold }} numberOfLines={1}>
                      {food.brand ? `${food.brand} ` : ''}{food.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textTer, fontFamily: FONT.regular, marginTop: 2 }}>
                      {food.calories} cal · P {food.protein}g · C {food.carbs}g · F {food.fat}g · {food.serving}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: COLORS.accent + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Feather name="plus" size={14} color={COLORS.accent} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
            <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
              <Feather name="search" size={40} color={colors.textTer} />
              <Text style={{ color: colors.textTer, fontSize: 14, fontFamily: FONT.medium, marginTop: SPACING.sm }}>
                No results found for "{searchQuery}"
              </Text>
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'scan' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Image Preview / Capture Area */}
            {imageUri ? (
              <View style={[styles.imageContainer, card]}>
                <Image source={{ uri: imageUri }} style={styles.foodImage} resizeMode="cover" />
                {/* Overlay controls on image */}
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    style={styles.imageOverlayBtn}
                    onPress={resetScanner}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Scanning overlay */}
                {scanning && (
                  <Animated.View style={[styles.scanningOverlay, { opacity: pulseAnim }]}>
                    <View style={[styles.scanningDot, { backgroundColor: colors.accent }]} />
                    <View style={[styles.scanningRing, { borderColor: colors.accent }]} />
                    <View style={[styles.scanningRingOuter, { borderColor: colors.accent }]} />
                    <Text style={styles.scanningText}>Analyzing food...</Text>
                  </Animated.View>
                )}
              </View>
            ) : (
              <View style={[styles.captureArea, card, { borderColor: colors.border }]}>
                <View style={[styles.captureIconWrap, { backgroundColor: colors.accentSoft }]}>
                  <Feather name="camera" size={36} color={colors.accent} />
                </View>
                <Text style={[styles.captureTitle, { color: colors.text }]}>Snap Your Meal</Text>
                <Text style={[styles.captureSubtitle, { color: colors.textTer }]}>
                  Take a photo or pick from gallery to get instant nutritional estimates
                </Text>

                <View style={styles.captureButtons}>
                  <TouchableOpacity
                    style={[styles.captureBtn, { backgroundColor: colors.accent }]}
                    onPress={pickFromCamera}
                    activeOpacity={0.7}
                  >
                    <Feather name="camera" size={20} color="#FFFFFF" />
                    <Text style={styles.captureBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.captureBtn, styles.captureBtnOutline, { borderColor: colors.accent }]}
                    onPress={pickFromGallery}
                    activeOpacity={0.7}
                  >
                    <Feather name="image" size={20} color={colors.accent} />
                    <Text style={[styles.captureBtnText, { color: colors.accent }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Analyze button (shown when image is picked but not yet scanned) */}
            {imageUri && !scanResult && !scanning && (
              <TouchableOpacity
                style={[styles.analyzeBtn, { backgroundColor: colors.accent }]}
                onPress={analyzePhoto}
                activeOpacity={0.7}
              >
                <Feather name="zap" size={20} color="#FFFFFF" />
                <Text style={styles.analyzeBtnText}>Analyze Food</Text>
              </TouchableOpacity>
            )}

            {/* Retake/Gallery buttons when image is present */}
            {imageUri && !scanning && (
              <View style={styles.retakeRow}>
                <TouchableOpacity
                  style={[styles.retakeBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
                  onPress={pickFromCamera}
                  activeOpacity={0.7}
                >
                  <Feather name="camera" size={16} color={colors.textSec} />
                  <Text style={[styles.retakeBtnText, { color: colors.textSec }]}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.retakeBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
                  onPress={pickFromGallery}
                  activeOpacity={0.7}
                >
                  <Feather name="image" size={16} color={colors.textSec} />
                  <Text style={[styles.retakeBtnText, { color: colors.textSec }]}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scan Results */}
            {scanResult && (
              <Animated.View style={{ opacity: resultFade, transform: [{ translateY: resultSlide }] }}>
                {/* Results header */}
                <View style={styles.resultsHeader}>
                  <View style={styles.resultsHeaderLeft}>
                    <Feather name="check-circle" size={18} color={colors.green} />
                    <Text style={[styles.resultsTitle, { color: colors.text }]}>
                      {scanResult.items.length} item{scanResult.items.length !== 1 ? 's' : ''} detected
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      // Toggle all
                      const allSelected = scanResult.items.every((_, i) => selectedItems[i])
                      const sel = {}
                      scanResult.items.forEach((_, i) => { sel[i] = !allSelected })
                      setSelectedItems(sel)
                      Haptics.selectionAsync()
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectAllText, { color: colors.accent }]}>
                      {scanResult.items.every((_, i) => selectedItems[i]) ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Food items */}
                {scanResult.items.map((item, index) => (
                  <FoodItemCard
                    key={index}
                    item={item}
                    index={index}
                    selected={!!selectedItems[index]}
                    onToggle={() => toggleItemSelection(index)}
                    onEdit={() => openEditModal(index)}
                    colors={colors}
                    card={card}
                  />
                ))}

                {/* Totals summary */}
                {selectedTotals.count > 0 && (
                  <View style={[styles.totalsCard, card]}>
                    <Text style={[styles.totalsLabel, { color: colors.textSec }]}>
                      Selected Total ({selectedTotals.count} item{selectedTotals.count !== 1 ? 's' : ''})
                    </Text>
                    <View style={styles.totalsRow}>
                      <MacroPill label="Cal" value={selectedTotals.calories} unit="" color={colors.accent} colors={colors} />
                      <MacroPill label="P" value={Math.round(selectedTotals.protein * 10) / 10} unit="g" color="#34A853" colors={colors} />
                      <MacroPill label="C" value={Math.round(selectedTotals.carbs * 10) / 10} unit="g" color="#F97316" colors={colors} />
                      <MacroPill label="F" value={Math.round(selectedTotals.fat * 10) / 10} unit="g" color="#FBBC05" colors={colors} />
                    </View>
                  </View>
                )}

                {/* Meal type selector */}
                <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Log as</Text>
                <View style={styles.mealTypeRow}>
                  {MEAL_TYPES.map(type => {
                    const isActive = mealType === type
                    const mealColor = MEAL_COLORS_MAP[type]
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.mealChip,
                          { backgroundColor: colors.bgTer, borderColor: 'transparent' },
                          isActive && { borderColor: mealColor, backgroundColor: mealColor + '15' },
                        ]}
                        onPress={() => { setMealType(type); Haptics.selectionAsync() }}
                        activeOpacity={0.7}
                      >
                        <Feather name={MEAL_ICONS[type]} size={14} color={isActive ? mealColor : colors.textTer} />
                        <Text style={[
                          styles.mealChipText,
                          { color: isActive ? mealColor : colors.textTer },
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Log button */}
                <TouchableOpacity
                  style={[styles.logBtn, { backgroundColor: colors.accent }, logging && styles.btnDisabled]}
                  onPress={logSelectedItems}
                  disabled={logging || selectedTotals.count === 0}
                  activeOpacity={0.7}
                >
                  {logging ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={20} color="#FFFFFF" />
                      <Text style={styles.logBtnText}>
                        Log {selectedTotals.count} Item{selectedTotals.count !== 1 ? 's' : ''} ({selectedTotals.calories} kcal)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Scan another */}
                <TouchableOpacity
                  style={styles.scanAnotherBtn}
                  onPress={resetScanner}
                  activeOpacity={0.7}
                >
                  <Feather name="refresh-cw" size={16} color={colors.textTer} />
                  <Text style={[styles.scanAnotherText, { color: colors.textTer }]}>Scan Another</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Tips section when no image */}
            {!imageUri && (
              <View style={[styles.tipsCard, card]}>
                <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for Best Results</Text>
                {[
                  { icon: 'sun', text: 'Good lighting helps identify foods accurately' },
                  { icon: 'maximize', text: 'Capture the full plate from above if possible' },
                  { icon: 'eye', text: 'Ensure all food items are clearly visible' },
                  { icon: 'edit-3', text: 'You can edit any detected item before logging' },
                ].map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <View style={[styles.tipIconWrap, { backgroundColor: colors.accentSoft }]}>
                      <Feather name={tip.icon} size={14} color={colors.accent} />
                    </View>
                    <Text style={[styles.tipText, { color: colors.textSec }]}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      ) : (
        /* History Tab */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {historyLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.bgSec }]}>
                <Feather name="camera" size={48} color={colors.textTer} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Scans Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTer }]}>
                Your food scan history will appear here
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                onPress={() => setActiveTab('scan')}
                activeOpacity={0.7}
              >
                <Feather name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Scan Your First Meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            history.map((scan, index) => (
              <HistoryScanCard
                key={scan.id || index}
                scan={scan}
                colors={colors}
                card={card}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Edit Item Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setEditModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.bgSec }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Item</Text>

            <View style={styles.editForm}>
              <EditField
                label="Name"
                value={editValues.name}
                onChange={(v) => setEditValues(prev => ({ ...prev, name: v }))}
                icon="tag"
                colors={colors}
                keyboard="default"
              />
              <EditField
                label="Calories"
                value={editValues.calories}
                onChange={(v) => setEditValues(prev => ({ ...prev, calories: v }))}
                unit="kcal"
                icon="zap"
                color={colors.accent}
                colors={colors}
              />
              <EditField
                label="Protein"
                value={editValues.protein}
                onChange={(v) => setEditValues(prev => ({ ...prev, protein: v }))}
                unit="g"
                icon="target"
                color="#34A853"
                colors={colors}
              />
              <EditField
                label="Carbs"
                value={editValues.carbs}
                onChange={(v) => setEditValues(prev => ({ ...prev, carbs: v }))}
                unit="g"
                icon="loader"
                color="#F97316"
                colors={colors}
              />
              <EditField
                label="Fat"
                value={editValues.fat}
                onChange={(v) => setEditValues(prev => ({ ...prev, fat: v }))}
                unit="g"
                icon="droplet"
                color="#FBBC05"
                colors={colors}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveEditBtn, { backgroundColor: colors.accent }]}
              onPress={saveEdit}
              activeOpacity={0.7}
            >
              <Feather name="check" size={18} color="#FFFFFF" />
              <Text style={styles.saveEditBtnText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setEditModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textTer }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// ----- Sub-components -----

function FoodItemCard({ item, index, selected, onToggle, onEdit, colors, card }) {
  const confidencePct = Math.round((item.confidence || 0) * 100)
  const confidenceColor = confidencePct >= 85 ? colors.green : confidencePct >= 65 ? colors.amber : colors.red

  return (
    <TouchableOpacity
      style={[
        styles.foodItemCard,
        card,
        { borderColor: selected ? colors.accent + '50' : card.borderColor || colors.border },
        selected && { borderWidth: 1.5 },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.foodItemMain}>
        {/* Checkbox */}
        <View style={[
          styles.checkbox,
          { borderColor: selected ? colors.accent : colors.border },
          selected && { backgroundColor: colors.accent },
        ]}>
          {selected && <Feather name="check" size={14} color="#FFFFFF" />}
        </View>

        {/* Item info */}
        <View style={styles.foodItemInfo}>
          <Text style={[styles.foodItemName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {confidencePct > 0 && (
            <View style={styles.confidenceRow}>
              <View style={[styles.confidenceTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.confidenceFill, { width: `${confidencePct}%`, backgroundColor: confidenceColor }]} />
              </View>
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidencePct}%</Text>
            </View>
          )}
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.bgTer }]}
          onPress={onEdit}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="edit-2" size={14} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      {/* Macros row */}
      <View style={styles.foodItemMacros}>
        <View style={[styles.macroTag, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.macroTagValue, { color: colors.accent }]}>{item.calories}</Text>
          <Text style={[styles.macroTagUnit, { color: colors.accent }]}>kcal</Text>
        </View>
        <View style={[styles.macroTag, { backgroundColor: '#34A85312' }]}>
          <Text style={[styles.macroTagValue, { color: '#34A853' }]}>{item.protein}</Text>
          <Text style={[styles.macroTagUnit, { color: '#34A853' }]}>g P</Text>
        </View>
        <View style={[styles.macroTag, { backgroundColor: '#F9731612' }]}>
          <Text style={[styles.macroTagValue, { color: '#F97316' }]}>{item.carbs}</Text>
          <Text style={[styles.macroTagUnit, { color: '#F97316' }]}>g C</Text>
        </View>
        <View style={[styles.macroTag, { backgroundColor: '#FBBC0512' }]}>
          <Text style={[styles.macroTagValue, { color: '#FBBC05' }]}>{item.fat}</Text>
          <Text style={[styles.macroTagUnit, { color: '#FBBC05' }]}>g F</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function MacroPill({ label, value, unit, color, colors }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '12' }]}>
      <Text style={[styles.macroPillValue, { color }]}>{value}</Text>
      <Text style={[styles.macroPillLabel, { color: color + 'AA' }]}>{unit} {label}</Text>
    </View>
  )
}

function EditField({ label, value, onChange, unit, icon, color, colors, keyboard }) {
  return (
    <View style={styles.editFieldRow}>
      <View style={styles.editFieldLabel}>
        <Feather name={icon} size={14} color={color || colors.textSec} />
        <Text style={[styles.editFieldText, { color: colors.textSec }]}>{label}</Text>
      </View>
      <View style={[styles.editFieldInput, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
        <TextInput
          style={[styles.editFieldTextInput, { color: colors.text, textAlign: keyboard === 'default' ? 'left' : 'right' }]}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard || 'numeric'}
          placeholder={keyboard === 'default' ? 'Item name' : '0'}
          placeholderTextColor={colors.textTer}
          maxLength={keyboard === 'default' ? 60 : 6}
          selectTextOnFocus
        />
        {unit && <Text style={[styles.editFieldUnit, { color: colors.textTer }]}>{unit}</Text>}
      </View>
    </View>
  )
}

function HistoryScanCard({ scan, colors, card }) {
  const totalCals = (scan.items || []).reduce((s, i) => s + (i.calories || 0), 0)
  const totalProtein = (scan.items || []).reduce((s, i) => s + (i.protein || 0), 0)
  const mealColor = MEAL_COLORS_MAP[scan.meal_type] || colors.textSec
  const mealIcon = MEAL_ICONS[scan.meal_type] || 'circle'

  const scanDate = scan.scanned_at ? new Date(scan.scanned_at) : null
  const timeStr = scanDate
    ? scanDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : ''
  const dateStr = scanDate ? formatDate(scan.scanned_at) : ''

  return (
    <View style={[styles.historyCard, card]}>
      {/* Header */}
      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderLeft}>
          <View style={[styles.historyMealBadge, { backgroundColor: mealColor + '18', borderColor: mealColor + '30' }]}>
            <Feather name={mealIcon} size={12} color={mealColor} />
            <Text style={[styles.historyMealText, { color: mealColor }]}>
              {(scan.meal_type || '').charAt(0).toUpperCase() + (scan.meal_type || '').slice(1)}
            </Text>
          </View>
          {scan.logged && (
            <View style={[styles.loggedBadge, { backgroundColor: colors.green + '18' }]}>
              <Feather name="check" size={10} color={colors.green} />
              <Text style={[styles.loggedBadgeText, { color: colors.green }]}>Logged</Text>
            </View>
          )}
        </View>
        <View style={styles.historyDateCol}>
          <Text style={[styles.historyDate, { color: colors.textSec }]}>{dateStr}</Text>
          <Text style={[styles.historyTime, { color: colors.textTer }]}>{timeStr}</Text>
        </View>
      </View>

      {/* Items */}
      {(scan.items || []).map((item, i) => (
        <View key={i} style={[styles.historyItemRow, { borderColor: colors.border }]}>
          <Text style={[styles.historyItemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.historyItemCal, { color: colors.accent }]}>{item.calories} kcal</Text>
        </View>
      ))}

      {/* Footer totals */}
      <View style={[styles.historyFooter, { borderColor: colors.border }]}>
        <Text style={[styles.historyTotalLabel, { color: colors.textTer }]}>Total</Text>
        <View style={styles.historyTotalMacros}>
          <Text style={[styles.historyTotalCal, { color: colors.text }]}>{totalCals} kcal</Text>
          <Text style={[styles.historyTotalMacro, { color: '#34A853' }]}> P {totalProtein}g</Text>
        </View>
      </View>
    </View>
  )
}

// ----- Styles -----
const FONT_FALLBACK = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    borderBottomWidth: 1,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
  },

  // Search
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },

  // Capture area (no image)
  captureArea: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  captureIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  captureTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  captureSubtitle: {
    fontSize: 14,
    fontFamily: FONT.medium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  captureButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    minHeight: 52,
  },
  captureBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  captureBtnText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: '#FFFFFF',
  },

  // Image preview
  imageContainer: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: SCREEN_WIDTH * 0.7,
    borderRadius: RADIUS.xl,
  },
  imageOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  imageOverlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scanning overlay
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
  },
  scanningDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
  },
  scanningRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    position: 'absolute',
    opacity: 0.5,
  },
  scanningRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    position: 'absolute',
    opacity: 0.25,
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginTop: 60,
  },

  // Analyze button
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    minHeight: 52,
  },
  analyzeBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },

  // Retake row
  retakeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 6,
  },
  retakeBtnText: {
    fontSize: 13,
    fontFamily: FONT.medium,
  },

  // Results
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  resultsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },

  // Food item card
  foodItemCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  foodItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  foodItemInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  foodItemName: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    marginBottom: 4,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    maxWidth: 60,
  },
  confidenceFill: {
    height: 3,
    borderRadius: 1.5,
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItemMacros: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginLeft: 36, // align with name after checkbox
  },
  macroTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  macroTagValue: {
    fontSize: 13,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  macroTagUnit: {
    fontSize: 10,
    fontFamily: FONT.medium,
  },

  // Totals card
  totalsCard: {
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  totalsLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    marginBottom: SPACING.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  macroPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  macroPillValue: {
    fontSize: 18,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  macroPillLabel: {
    fontSize: 10,
    fontFamily: FONT.medium,
    marginTop: 2,
  },

  // Meal type
  sectionLabel: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  mealChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 4,
  },
  mealChipText: {
    fontSize: 11,
    fontFamily: FONT.semibold,
  },

  // Log button
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    minHeight: 52,
    marginBottom: SPACING.sm,
  },
  logBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Scan another
  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 6,
  },
  scanAnotherText: {
    fontSize: 14,
    fontFamily: FONT.medium,
  },

  // Tips
  tipsCard: {
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    flex: 1,
    lineHeight: 18,
  },

  // History
  historyCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  historyMealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  historyMealText: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    letterSpacing: 0.3,
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  loggedBadgeText: {
    fontSize: 10,
    fontFamily: FONT.semibold,
  },
  historyDateCol: {
    alignItems: 'flex-end',
  },
  historyDate: {
    fontSize: 12,
    fontFamily: FONT.medium,
  },
  historyTime: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  historyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyItemName: {
    fontSize: 13,
    fontFamily: FONT.medium,
    flex: 1,
    marginRight: SPACING.sm,
  },
  historyItemCal: {
    fontSize: 13,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  historyTotalLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
  },
  historyTotalMacros: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTotalCal: {
    fontSize: 14,
    fontFamily: FONT.numBold,
    fontVariant: ['tabular-nums'],
  },
  historyTotalMacro: {
    fontSize: 12,
    fontFamily: FONT.numMedium,
    fontVariant: ['tabular-nums'],
    marginLeft: SPACING.sm,
  },

  // Empty state
  loadingWrap: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONT.medium,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: '#FFFFFF',
  },

  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONT.bold,
    marginBottom: SPACING.lg,
  },
  editForm: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  editFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  editFieldText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  editFieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    minHeight: 48,
    width: 140,
  },
  editFieldTextInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.numSemibold,
    paddingVertical: SPACING.sm,
  },
  editFieldUnit: {
    fontSize: 12,
    fontFamily: FONT.medium,
    marginLeft: SPACING.xs,
  },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    minHeight: 52,
    marginBottom: SPACING.sm,
  },
  saveEditBtnText: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
})
