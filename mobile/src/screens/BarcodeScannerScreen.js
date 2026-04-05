import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { waterfallLookup, searchByText } from '../utils/foodApi'
import { premiumAlert } from '../components/PremiumAlert'
import { requestCameraPermission } from '../lib/permissionPrompts'

const RECENT_FOODS_KEY = 'ivira_recent_foods'
const MAX_RECENT_FOODS = 20

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SCAN_FRAME_SIZE = SCREEN_WIDTH * 0.7

// Try to load expo-camera; gracefully handle absence
let CameraView = null
try {
  const cam = require('expo-camera')
  CameraView = cam.CameraView || cam.Camera
} catch {}

// --- Helper: save a food to recent foods list ---
async function saveToRecentFoods(foodEntry) {
  try {
    const raw = await AsyncStorage.getItem(RECENT_FOODS_KEY)
    let list = raw ? JSON.parse(raw) : []
    // Remove duplicate by barcode or name
    list = list.filter(f =>
      foodEntry.barcode ? f.barcode !== foodEntry.barcode : f.name !== foodEntry.name
    )
    list.unshift({ ...foodEntry, logged_at: new Date().toISOString() })
    if (list.length > MAX_RECENT_FOODS) list = list.slice(0, MAX_RECENT_FOODS)
    await AsyncStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(list))
  } catch {}
}

async function loadRecentFoods() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_FOODS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function BarcodeScannerScreen({ navigation, route }) {
  const { gymId, member } = useAuth()
  const { colors, isDark } = useTheme()

  const [hasPermission, setHasPermission] = useState(null)
  const [scanned, setScanned] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [product, setProduct] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAdd, setQuickAdd] = useState({ calories: '', protein: '', carbs: '', fats: '' })
  const [flashOn, setFlashOn] = useState(false)
  const [servingGrams, setServingGrams] = useState('100')
  const [servingCount, setServingCount] = useState('1')
  const [logging, setLogging] = useState(false)
  const [mealType, setMealType] = useState(route?.params?.mealType || 'snack')
  const [showManualFallback, setShowManualFallback] = useState(false)
  const [notFoundBarcode, setNotFoundBarcode] = useState('')
  const [manualEntry, setManualEntry] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' })

  // Recent Foods state
  const [recentFoods, setRecentFoods] = useState([])

  // Multi-Scan session state
  const [sessionItems, setSessionItems] = useState([])
  const [sessionCalories, setSessionCalories] = useState(0)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successToastName, setSuccessToastName] = useState('')
  const toastTimeout = useRef(null)

  const cameraRef = useRef(null)

  // Load recent foods on mount
  useEffect(() => {
    loadRecentFoods().then(setRecentFoods)
  }, [])

  // Restore barcode session from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('ivira_barcode_session').then(data => {
      if (data) {
        const { items, calories } = JSON.parse(data)
        setSessionItems(items || [])
        setSessionCalories(calories || 0)
      }
    }).catch(() => {})
  }, [])

  // Request camera permission contextually
  useEffect(() => {
    if (!CameraView) {
      setHasPermission(false)
      return
    }
    requestCameraPermission().then(granted => {
      setHasPermission(granted)
      if (!granted) {
        premiumAlert('Camera Required', 'Barcode scanning needs camera access. Enable it in Settings.')
      }
    })
  }, [])

  // Show a brief success toast
  const showToast = useCallback((name) => {
    setSuccessToastName(name)
    setShowSuccessToast(true)
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setShowSuccessToast(false), 2000)
  }, [])

  // Handle "Done" - navigate back with session totals
  const handleDone = useCallback(() => {
    AsyncStorage.removeItem('ivira_barcode_session').catch(() => {})
    const totalNutrition = sessionItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fats: acc.fats + item.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
    navigation?.navigate?.('HomeMain', {
      nutritionLogged: totalNutrition,
    })
  }, [sessionItems, navigation])

  // Handle barcode scanned
  const handleBarCodeScanned = useCallback(async (event) => {
    const data = event?.data || event?.codeStringValue || event?.value || ''
    if (!data || scanned) return
    setScanned(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await lookupBarcode(data)
  }, [scanned])

  // Waterfall barcode lookup: OpenFoodFacts -> Nutritionix -> FatSecret -> Manual
  const lookupBarcode = async (rawBarcode) => {
    setSearching(true)
    try {
      const result = await waterfallLookup(rawBarcode)
      if (result) {
        setProduct(result)
        setShowResult(true)
      } else {
        // All APIs exhausted - surface the manual entry sheet
        setNotFoundBarcode(rawBarcode)
        setShowManualFallback(true)
        setScanned(false)
      }
    } catch {
      premiumAlert('Lookup Failed', 'Could not connect to food database. Try again or use Quick Add.')
      setScanned(false)
    } finally {
      setSearching(false)
    }
  }

  // Search by text
  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return
    setSearching(true)
    try {
      const result = await searchByText(searchText)
      if (result) {
        setProduct(result)
        setShowResult(true)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      } else {
        premiumAlert('Not Found', 'No products found. Try a different search or use Quick Add.')
      }
    } catch {
      premiumAlert('Search Failed', 'Could not search food database.')
    } finally {
      setSearching(false)
    }
  }, [searchText])

  // Handle tapping a recent food - pre-fill the product result sheet
  const handleRecentFoodTap = useCallback((food) => {
    setProduct({
      name: food.name,
      brand: food.brand || '',
      barcode: food.barcode || '',
      per100g: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
      },
      source: 'recent',
    })
    setServingGrams('100')
    setServingCount('1')
    setShowResult(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  // Compute scaled macros based on serving size and serving count
  const getScaledMacros = useCallback(() => {
    if (!product?.per100g) return { calories: 0, protein: 0, carbs: 0, fats: 0 }
    const validServing = Math.max(0.1, Math.min(parseFloat(servingGrams) || 100, 5000))
    const factor = validServing / 100
    const count = Math.max(0.1, Math.min(parseFloat(servingCount) || 1, 100))
    return {
      calories: Math.round(product.per100g.calories * factor * count),
      protein: Math.round(product.per100g.protein * factor * count * 10) / 10,
      carbs: Math.round(product.per100g.carbs * factor * count * 10) / 10,
      fats: Math.round(product.per100g.fats * factor * count * 10) / 10,
    }
  }, [product, servingGrams, servingCount])

  // Log food to API (Multi-Scan: stays on scanner after logging)
  const handleLogFood = useCallback(async () => {
    const scaled = getScaledMacros()
    setLogging(true)
    try {
      if (gymId && member?.id) {
        await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
          mealType,
          rawInput: product?.name || 'Scanned Food',
          items: [{
            name: product?.name || 'Scanned Food',
            qty: 1,
            unit: `${servingGrams}g`,
            calories: scaled.calories,
            protein: scaled.protein,
            carbs: scaled.carbs,
            fats: scaled.fats,
            barcode: product?.barcode || '',
          }],
          source: 'barcode',
        })
      }

      // Save to recent foods
      await saveToRecentFoods({
        name: product?.name || 'Scanned Food',
        brand: product?.brand || '',
        barcode: product?.barcode || '',
        calories: product?.per100g?.calories || scaled.calories,
        protein: product?.per100g?.protein || scaled.protein,
        carbs: product?.per100g?.carbs || scaled.carbs,
        fats: product?.per100g?.fats || scaled.fats,
        serving_size: servingGrams,
      })
      // Refresh recent foods list
      loadRecentFoods().then(setRecentFoods)

      // Update multi-scan session totals
      const newItem = {
        name: product?.name || 'Scanned Food',
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fats: scaled.fats,
      }
      setSessionItems(prev => {
        const updated = [...prev, newItem]
        AsyncStorage.setItem('ivira_barcode_session', JSON.stringify({ items: updated, calories: sessionCalories + scaled.calories })).catch(() => {})
        return updated
      })
      setSessionCalories(prev => prev + scaled.calories)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowResult(false)
      setScanned(false)
      setProduct(null)
      setServingCount('1')

      // Show success toast instead of navigating away
      showToast(product?.name || 'Food')
    } catch (err) {
      premiumAlert('Log Failed', err.response?.data?.message || 'Could not save food. Try again.')
    } finally {
      setLogging(false)
    }
  }, [product, servingGrams, servingCount, mealType, gymId, member?.id, getScaledMacros, showToast])

  // Quick add manual entry
  const handleQuickAddSave = useCallback(async () => {
    const cal = parseInt(quickAdd.calories, 10) || 0
    const prot = parseInt(quickAdd.protein, 10) || 0
    const carb = parseInt(quickAdd.carbs, 10) || 0
    const fat = parseInt(quickAdd.fats, 10) || 0

    if (cal === 0 && prot === 0 && carb === 0 && fat === 0) {
      premiumAlert('Empty Entry', 'Please enter at least one value.')
      return
    }

    setLogging(true)
    try {
      if (gymId && member?.id) {
        await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
          mealType,
          rawInput: 'Quick Add',
          items: [{ name: 'Quick Add', qty: 1, unit: 'serving', calories: cal, protein: prot, carbs: carb, fats: fat }],
          source: 'manual',
        })
      }

      // Update multi-scan session totals
      setSessionItems(prev => {
        const updated = [...prev, { name: 'Quick Add', calories: cal, protein: prot, carbs: carb, fats: fat }]
        AsyncStorage.setItem('ivira_barcode_session', JSON.stringify({ items: updated, calories: sessionCalories + cal })).catch(() => {})
        return updated
      })
      setSessionCalories(prev => prev + cal)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowQuickAdd(false)
      setQuickAdd({ calories: '', protein: '', carbs: '', fats: '' })
      showToast('Quick Add')
    } catch (err) {
      premiumAlert('Save Failed', err.response?.data?.message || 'Could not save entry.')
    } finally {
      setLogging(false)
    }
  }, [quickAdd, mealType, gymId, member?.id, showToast])

  const handleClose = useCallback(() => {
    // If items were logged in this session, pass totals back
    if (sessionItems.length > 0) {
      handleDone()
    } else {
      navigation?.goBack?.()
    }
  }, [navigation, sessionItems, handleDone])

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Camera or fallback */}
      {CameraView && hasPermission ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      ) : (
        <View style={[styles.noCameraFallback, { backgroundColor: colors.bg }]}>
          <Feather name="camera-off" size={48} color={colors.textTer} />
          <Text style={[styles.noCameraText, { color: colors.textSec }]}>
            {hasPermission === false
              ? 'Camera permission denied'
              : 'Camera not available'}
          </Text>
          <Text style={[styles.noCameraHint, { color: colors.textTer }]}>Use text search or Quick Add below</Text>
        </View>
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Scan Barcode</Text>

          {sessionItems.length > 0 ? (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.flashBtn}
              onPress={() => setFlashOn(!flashOn)}
              activeOpacity={0.7}
            >
              <Feather name={flashOn ? 'zap' : 'zap-off'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchRow, { backgroundColor: isDark ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.9)', borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textTer} style={{ marginRight: SPACING.sm }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search food by name..."
              placeholderTextColor={colors.textTer}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearBtn}
              >
                <Feather name="x-circle" size={16} color={colors.textTer} />
              </TouchableOpacity>
            )}
          </View>
          {searchText.trim().length > 0 && (
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={searching}
              activeOpacity={0.7}
            >
              {searching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Scan frame */}
        {CameraView && hasPermission && (
          <View style={styles.scanFrameContainer}>
            <View style={styles.scanFrame}>
              {/* Corner marks */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>
              {scanned ? 'Processing...' : 'Point camera at barcode'}
            </Text>
          </View>
        )}

        {/* Recent Foods section - shown when not actively scanning */}
        {!scanned && !searching && recentFoods.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Feather name="clock" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.recentHeaderText}>RECENT</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentFoods.map((food, index) => (
                <TouchableOpacity
                  key={`${food.barcode || food.name}-${index}`}
                  style={[styles.recentCard, { backgroundColor: isDark ? 'rgba(18,18,18,0.85)' : 'rgba(255,255,255,0.85)' }]}
                  onPress={() => handleRecentFoodTap(food)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.recentCardName, { color: colors.text }]} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text style={[styles.recentCardCal, { color: COLORS.accent }]}>
                    {food.calories} cal
                  </Text>
                  <Text style={[styles.recentCardProtein, { color: colors.textTer }]}>
                    {food.protein}g protein
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom actions */}
        <View style={styles.bottomBar}>
          {/* Multi-scan running total */}
          {sessionItems.length > 0 && (
            <View style={[styles.sessionTotalBar, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)', borderColor: COLORS.accent }]}>
              <Feather name="check-circle" size={16} color={COLORS.accent} />
              <Text style={[styles.sessionTotalText, { color: colors.text }]}>
                {sessionItems.length} item{sessionItems.length !== 1 ? 's' : ''} logged
              </Text>
              <Text style={[styles.sessionTotalCal, { color: COLORS.accent }]}>
                {sessionCalories} cal
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.quickAddBtn, { backgroundColor: colors.accentSoft }]}
            onPress={() => setShowQuickAdd(true)}
            activeOpacity={0.7}
          >
            <Feather name="edit-3" size={18} color={COLORS.accent} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.quickAddBtnText}>Quick Add</Text>
          </TouchableOpacity>

          {scanned && (
            <TouchableOpacity
              style={[styles.rescanBtn, { backgroundColor: colors.bgSec, borderColor: colors.border }]}
              onPress={() => { setScanned(false); setProduct(null) }}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={16} color={colors.text} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.rescanBtnText, { color: colors.text }]}>Scan Again</Text>
            </TouchableOpacity>
          )}

          {/* Done button when items have been logged */}
          {sessionItems.length > 0 && (
            <TouchableOpacity
              style={styles.doneBtnBottom}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: SPACING.sm }} />
              <Text style={styles.doneBtnBottomText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Success toast */}
      {showSuccessToast && (
        <View style={styles.successToast} pointerEvents="none">
          <View style={styles.successToastInner}>
            <Feather name="check-circle" size={20} color={COLORS.green} />
            <Text style={styles.successToastText}>{successToastName} logged</Text>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {searching && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSec }]}>Looking up product...</Text>
        </View>
      )}

      {/* Product Result Bottom Sheet */}
      <Modal visible={showResult} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} onPress={() => { setShowResult(false); setScanned(false) }} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <View style={[styles.sheetContent, { backgroundColor: colors.bgSec }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.borderStrong }]} />

              {product && (() => {
                const scaled = getScaledMacros()
                return (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                      <Text style={[styles.productName, { color: colors.text, marginBottom: 0, flex: 1 }]} numberOfLines={2}>{product.name}</Text>
                      {product.source && (
                        <View style={[styles.sourceBadge, { backgroundColor: colors.accentSoft }]}>
                          <Text style={styles.sourceBadgeText}>
                            {product.source === 'openfoodfacts' ? 'OFF' : product.source === 'usda' ? 'USDA' : product.source === 'recent' ? 'RECENT' : 'FS'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {product.brand ? (
                      <Text style={[styles.productBrand, { color: colors.textSec }]}>{product.brand}</Text>
                    ) : null}

                    {/* Serving size adjuster */}
                    <View style={styles.servingRow}>
                      <Text style={[styles.servingLabel, { color: colors.textSec }]}>Serving size</Text>
                      <View style={[styles.servingInputWrap, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.servingInput, { color: colors.text }]}
                          value={servingGrams}
                          onChangeText={setServingGrams}
                          keyboardType="numeric"
                          maxLength={4}
                          selectTextOnFocus
                        />
                        <Text style={[styles.servingUnit, { color: colors.textTer }]}>g</Text>
                      </View>
                    </View>

                    {/* Quick serving presets */}
                    <View style={styles.servingPresets}>
                      {['50', '100', '150', '200'].map(g => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.presetChip, { backgroundColor: colors.bgTer }, servingGrams === g && { borderColor: COLORS.accent, backgroundColor: colors.accentSoft }]}
                          onPress={() => setServingGrams(g)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.presetChipText, { color: colors.textTer }, servingGrams === g && styles.presetChipTextActive]}>{g}g</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Number of servings */}
                    <View style={styles.servingRow}>
                      <Text style={[styles.servingLabel, { color: colors.textSec }]}>Servings</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                        {['0.5', '1', '1.5', '2'].map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[
                              styles.servingCountChip,
                              { backgroundColor: colors.bgTer },
                              servingCount === s && { borderColor: COLORS.accent, backgroundColor: colors.accentSoft },
                            ]}
                            onPress={() => {
                              setServingCount(s)
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.servingCountChipText, { color: colors.textTer }, servingCount === s && { color: COLORS.accent }]}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                        <View style={[styles.servingInputWrap, { backgroundColor: colors.bgTer, borderColor: colors.border, width: 60 }]}>
                          <TextInput
                            style={[styles.servingInput, { color: colors.text }]}
                            value={servingCount}
                            onChangeText={(v) => {
                              setServingCount(v)
                              Haptics.selectionAsync()
                            }}
                            keyboardType="decimal-pad"
                            maxLength={4}
                            selectTextOnFocus
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.nutrientGrid}>
                      <NutrientCard label="Calories" value={scaled.calories} unit="kcal" color={COLORS.accent} colors={colors} />
                      <NutrientCard label="Protein" value={scaled.protein} unit="g" color={COLORS.accent} colors={colors} />
                      <NutrientCard label="Carbs" value={scaled.carbs} unit="g" color={COLORS.cyan} colors={colors} />
                      <NutrientCard label="Fats" value={scaled.fats} unit="g" color={COLORS.amber} colors={colors} />
                    </View>

                    {/* Meal type selector */}
                    <View style={styles.mealTypeRow}>
                      {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.mealChip, { backgroundColor: colors.bgTer }, mealType === type && { borderColor: COLORS.accent, backgroundColor: colors.accentSoft }]}
                          onPress={() => setMealType(type)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.mealChipText, { color: colors.textTer }, mealType === type && styles.mealChipTextActive]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[styles.addMealBtn, logging && styles.btnDisabled]}
                      onPress={handleLogFood}
                      disabled={logging}
                      activeOpacity={0.7}
                    >
                      {logging ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: SPACING.sm }} />
                          <Text style={styles.addMealBtnText}>Log Food</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelSheetBtn}
                      onPress={() => { setShowResult(false); setScanned(false) }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelSheetBtnText, { color: colors.textTer }]}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )
              })()}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Manual Macro Entry Fallback (Product Not Found) */}
      <Modal visible={showManualFallback} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.sheetDismiss} onPress={() => setShowManualFallback(false)} />
          <View style={[styles.sheetContent, { backgroundColor: colors.bgSec }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.borderStrong }]} />
            <View style={styles.notFoundHeader}>
              <Feather name="alert-circle" size={28} color={COLORS.amber} />
              <Text style={[styles.quickAddTitle, { color: colors.text }]}>Product Not Found</Text>
            </View>
            <Text style={[styles.quickAddSubtitle, { color: colors.textTer }]}>
              Barcode {notFoundBarcode} isn't in the database yet.{'\n'}Enter the macros from the label:
            </Text>

            <View style={[styles.quickAddForm, { marginTop: SPACING.sm }]}>
              <View style={styles.quickAddField}>
                <View style={styles.quickAddFieldLabel}>
                  <Feather name="tag" size={14} color={colors.textSec} />
                  <Text style={[styles.quickAddFieldText, { color: colors.textSec }]}>Name</Text>
                </View>
                <View style={[styles.quickAddInputRow, { width: 160, backgroundColor: colors.bgTer, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.quickAddInput, { textAlign: 'left', color: colors.text }]}
                    value={manualEntry.name}
                    onChangeText={(v) => setManualEntry(prev => ({ ...prev, name: v }))}
                    placeholder="Product name"
                    placeholderTextColor={colors.textTer}
                    maxLength={50}
                  />
                </View>
              </View>
              <QuickAddField
                label="Calories"
                value={manualEntry.calories}
                onChange={(v) => setManualEntry(prev => ({ ...prev, calories: v }))}
                unit="kcal"
                color={COLORS.accent}
                colors={colors}
              />
              <QuickAddField
                label="Protein"
                value={manualEntry.protein}
                onChange={(v) => setManualEntry(prev => ({ ...prev, protein: v }))}
                unit="g"
                color={COLORS.accent}
                colors={colors}
              />
              <QuickAddField
                label="Carbs"
                value={manualEntry.carbs}
                onChange={(v) => setManualEntry(prev => ({ ...prev, carbs: v }))}
                unit="g"
                color={COLORS.cyan}
                colors={colors}
              />
              <QuickAddField
                label="Fats"
                value={manualEntry.fats}
                onChange={(v) => setManualEntry(prev => ({ ...prev, fats: v }))}
                unit="g"
                color={COLORS.amber}
                colors={colors}
              />
            </View>

            <TouchableOpacity
              style={[styles.addMealBtn, logging && styles.btnDisabled]}
              onPress={async () => {
                const cal = parseInt(manualEntry.calories, 10) || 0
                const prot = parseInt(manualEntry.protein, 10) || 0
                const carb = parseInt(manualEntry.carbs, 10) || 0
                const fat = parseInt(manualEntry.fats, 10) || 0
                if (cal === 0 && prot === 0 && carb === 0 && fat === 0) {
                  premiumAlert('Empty Entry', 'Please enter at least one macro value.')
                  return
                }
                setLogging(true)
                try {
                  if (gymId && member?.id) {
                    await api.post(`/gyms/${gymId}/members/${member.id}/nutrition/log`, {
                      mealType,
                      rawInput: manualEntry.name || 'Manual Entry',
                      items: [{
                        name: manualEntry.name || 'Manual Entry',
                        qty: 1, unit: 'serving',
                        calories: cal, protein: prot, carbs: carb, fats: fat,
                        barcode: notFoundBarcode,
                      }],
                      source: 'manual_barcode_fallback',
                    })
                  }

                  // Save to recent foods
                  await saveToRecentFoods({
                    name: manualEntry.name || 'Manual Entry',
                    brand: '',
                    barcode: notFoundBarcode,
                    calories: cal,
                    protein: prot,
                    carbs: carb,
                    fats: fat,
                    serving_size: '100',
                  })
                  loadRecentFoods().then(setRecentFoods)

                  // Update multi-scan session
                  setSessionItems(prev => {
                    const updated = [...prev, { name: manualEntry.name || 'Manual Entry', calories: cal, protein: prot, carbs: carb, fats: fat }]
                    AsyncStorage.setItem('ivira_barcode_session', JSON.stringify({ items: updated, calories: sessionCalories + cal })).catch(() => {})
                    return updated
                  })
                  setSessionCalories(prev => prev + cal)

                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                  setShowManualFallback(false)
                  const entryName = manualEntry.name || 'Entry'
                  setManualEntry({ name: '', calories: '', protein: '', carbs: '', fats: '' })
                  showToast(entryName)
                } catch (err) {
                  premiumAlert('Save Failed', err.response?.data?.message || 'Could not save entry.')
                } finally {
                  setLogging(false)
                }
              }}
              disabled={logging}
              activeOpacity={0.7}
            >
              {logging ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: SPACING.sm }} />
                  <Text style={styles.addMealBtnText}>Log Food</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setShowManualFallback(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelSheetBtnText, { color: colors.textTer }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quick Add Modal */}
      <Modal visible={showQuickAdd} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.sheetDismiss} onPress={() => setShowQuickAdd(false)} />
          <View style={[styles.sheetContent, { backgroundColor: colors.bgSec }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.borderStrong }]} />
            <Text style={[styles.quickAddTitle, { color: colors.text }]}>Quick Add</Text>
            <Text style={[styles.quickAddSubtitle, { color: colors.textTer }]}>Enter nutrition values manually</Text>

            <View style={styles.quickAddForm}>
              <QuickAddField
                label="Calories"
                value={quickAdd.calories}
                onChange={(v) => setQuickAdd(prev => ({ ...prev, calories: v }))}
                unit="kcal"
                color={COLORS.accent}
                colors={colors}
              />
              <QuickAddField
                label="Protein"
                value={quickAdd.protein}
                onChange={(v) => setQuickAdd(prev => ({ ...prev, protein: v }))}
                unit="g"
                color={COLORS.accent}
                colors={colors}
              />
              <QuickAddField
                label="Carbs"
                value={quickAdd.carbs}
                onChange={(v) => setQuickAdd(prev => ({ ...prev, carbs: v }))}
                unit="g"
                color={COLORS.cyan}
                colors={colors}
              />
              <QuickAddField
                label="Fats"
                value={quickAdd.fats}
                onChange={(v) => setQuickAdd(prev => ({ ...prev, fats: v }))}
                unit="g"
                color={COLORS.amber}
                colors={colors}
              />
            </View>

            <TouchableOpacity
              style={styles.addMealBtn}
              onPress={handleQuickAddSave}
              activeOpacity={0.7}
            >
              <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: SPACING.sm }} />
              <Text style={styles.addMealBtnText}>Save Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setShowQuickAdd(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelSheetBtnText, { color: colors.textTer }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// --- Nutrient Card ---
function NutrientCard({ label, value, unit, color, colors }) {
  return (
    <View style={[styles.nutrientCard, { backgroundColor: colors.bgTer }]}>
      <View style={[styles.nutrientDot, { backgroundColor: color }]} />
      <Text style={[styles.nutrientValue, { color: colors.text }]}>{value}<Text style={[styles.nutrientUnit, { color: colors.textTer }]}> {unit}</Text></Text>
      <Text style={[styles.nutrientLabel, { color: colors.textTer }]}>{label}</Text>
    </View>
  )
}

// --- Quick Add Field ---
function QuickAddField({ label, value, onChange, unit, color, colors }) {
  return (
    <View style={styles.quickAddField}>
      <View style={styles.quickAddFieldLabel}>
        <View style={[styles.nutrientDot, { backgroundColor: color }]} />
        <Text style={[styles.quickAddFieldText, { color: colors.textSec }]}>{label}</Text>
      </View>
      <View style={[styles.quickAddInputRow, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
        <TextInput
          style={[styles.quickAddInput, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textTer}
          maxLength={5}
        />
        <Text style={[styles.quickAddUnit, { color: colors.textTer }]}>{unit}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // No camera fallback
  noCameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  noCameraText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  noCameraHint: {
    fontSize: 13,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'space-between',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  flashBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Done button (top-right)
  doneBtn: {
    height: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Search
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: SPACING.xs,
  },
  clearBtn: {
    padding: SPACING.xs,
  },
  searchBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    minHeight: 48,
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Scan frame
  scanFrameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE * 0.6,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: COLORS.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: RADIUS.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: RADIUS.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: RADIUS.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: RADIUS.sm,
  },
  scanHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  // Recent Foods section
  recentSection: {
    paddingBottom: SPACING.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  recentHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  recentScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  recentCard: {
    width: 120,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  recentCardName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentCardCal: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  recentCardProtein: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Multi-scan session total bar
  sessionTotalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sessionTotalText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sessionTotalCal: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    minHeight: 52,
  },
  quickAddBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    minHeight: 52,
  },
  rescanBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Done button (bottom)
  doneBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    minHeight: 52,
  },
  doneBtnBottomText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Success toast
  successToast: {
    position: 'absolute',
    top: SPACING.xxl + SPACING.lg + 60,
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  successToastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  successToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: SPACING.md,
  },

  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: {
    flex: 1,
  },
  sheetContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },

  // Product result
  productName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  productBrand: {
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  sourceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  productServing: {
    fontSize: 12,
    marginBottom: SPACING.lg,
  },

  // Nutrient grid
  nutrientGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  nutrientCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  nutrientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.xs,
  },
  nutrientValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  nutrientUnit: {
    fontSize: 11,
    fontWeight: '400',
  },
  nutrientLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Serving size adjuster
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  servingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  servingInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    minHeight: 44,
    width: 100,
  },
  servingInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: SPACING.sm,
  },
  servingUnit: {
    fontSize: 13,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  servingPresets: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  presetChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: COLORS.accent,
  },
  servingCountChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 36,
    alignItems: 'center',
  },
  servingCountChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  mealChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mealChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mealChipTextActive: {
    color: COLORS.accent,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Add to meal button
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    minHeight: 52,
    marginBottom: SPACING.sm,
  },
  addMealBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelSheetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  cancelSheetBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Quick Add Modal
  notFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  quickAddTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  quickAddSubtitle: {
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  quickAddForm: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickAddField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickAddFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickAddFieldText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  quickAddInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    minHeight: 48,
    width: 120,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: SPACING.sm,
  },
  quickAddUnit: {
    fontSize: 12,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
})
