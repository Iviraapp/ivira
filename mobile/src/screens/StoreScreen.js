import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Haptics from '../lib/haptics'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { formatPaise } from '../lib/utils'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { DEMO_PRODUCTS } from '../lib/demoData'

const CATEGORIES = [
  'All',
  'Supplement',
  'Gear',
  'Apparel',
  'Accessories',
  'Food & Beverage',
]

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2

export default function StoreScreen({ embedded = false }) {
  const { gymId, isDemo } = useAuth()
  const { colors, card, isDark } = useTheme()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [buyingId, setBuyingId] = useState(null)
  const debounceRef = useRef(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const fetchProducts = useCallback(async () => {
    if (isDemo) { setProducts(DEMO_PRODUCTS); return }
    if (!gymId) return
    try {
      const res = await api.get(`/gyms/${gymId}/products`)
      setProducts(res.data?.products || res.data || [])
    } catch (err) {
      Alert.alert('Error', 'Could not load products. Pull down to retry.')
    }
  }, [gymId])

  useEffect(() => {
    fetchProducts().finally(() => setLoading(false))
  }, [fetchProducts])

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchProducts()
    setRefreshing(false)
  }, [fetchProducts])

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch =
      !debouncedQuery ||
      p.name?.toLowerCase().includes(debouncedQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleBuy = async (product) => {
    if (buyingId) return

    // Demo mode — store purchases are not yet available
    if (isDemo) {
      Alert.alert(
        'Coming Soon',
        'In-app purchases will be available once your gym connects a payment provider.',
      )
      return
    }

    setBuyingId(product.id)
    try {
      const res = await api.post(`/gyms/${gymId}/store/checkout`, {
        product_id: product.id,
        quantity: 1,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Success', `${product.name} purchased successfully!`)
      fetchProducts()
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.message || err.message || 'Unknown error'

      // Log the full error in dev so we can trace backend issues
      if (__DEV__) {
        console.warn('[StoreScreen] Purchase failed:', { status, detail, url: `/gyms/${gymId}/store/checkout`, productId: product.id })
      }

      let msg
      if (status === 404) {
        msg = 'Store checkout is not available yet. Please contact your gym.'
      } else if (status === 402) {
        msg = detail
      } else {
        msg = detail
      }
      Alert.alert('Purchase Failed', msg)
    } finally {
      setBuyingId(null)
    }
  }

  const handleNotify = async (product) => {
    if (buyingId) return

    if (isDemo) {
      Alert.alert('Coming Soon', 'Waitlist notifications will be available once your gym is fully set up.')
      return
    }

    setBuyingId(product.id)
    try {
      await api.post(`/gyms/${gymId}/products/${product.id}/waitlist`)
      Alert.alert('Notified', `We'll notify you when ${product.name} is back in stock.`)
    } catch (err) {
      const detail = err.response?.data?.message || err.message || 'Unknown error'
      if (__DEV__) {
        console.warn('[StoreScreen] Waitlist failed:', { status: err.response?.status, detail, productId: product.id })
      }
      Alert.alert('Error', detail)
    } finally {
      setBuyingId(null)
    }
  }

  const renderProduct = ({ item }) => {
    const outOfStock = item.stock === 0
    const lowStock = item.stock > 0 && item.stock <= 5
    const isBuying = buyingId === item.id

    return (
      <View style={[styles.card, { backgroundColor: card.backgroundColor, borderColor: card.borderColor }]}>
        {/* 1:1 Image area */}
        <View style={[styles.imageBox, { backgroundColor: colors.bgTer }]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <Feather name="shopping-bag" size={32} color={colors.textTer} />
          )}

          {/* Inventory badge — top-right of image */}
          {lowStock && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>Only {item.stock} left</Text>
            </View>
          )}
          {outOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          {item.category && (
            <Text style={[styles.categoryLabel, { color: colors.textTer }]}>{item.category.toUpperCase()}</Text>
          )}
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Price + Buy — vertically aligned */}
          <View style={styles.priceActionRow}>
            <Text style={[styles.productPrice, { color: colors.text }]}>{formatPaise(item.price_paise)}</Text>

            {outOfStock ? (
              <TouchableOpacity
                style={[styles.notifyBtn, { borderColor: colors.border }]}
                onPress={() => handleNotify(item)}
                disabled={isBuying}
                activeOpacity={0.7}
              >
                {isBuying ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={[styles.notifyBtnText, { color: colors.text }]}>Notify Me</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => handleBuy(item)}
                disabled={isBuying}
                activeOpacity={0.7}
              >
                {isBuying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buyBtnText}>Buy Now</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    )
  }

  const renderEmpty = () => {
    if (loading) return null
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.bgTer }]}>
          <Feather name="shopping-bag" size={32} color={colors.textTer} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
          {debouncedQuery || selectedCategory !== 'All'
            ? 'Try adjusting your search or filter'
            : 'Products will appear here once added'}
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, embedded && { paddingTop: 0 }]}>
      {/* Header — hidden when embedded */}
      {!embedded && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Store</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        <Feather
          name="search"
          size={16}
          color={colors.textTer}
          style={{ marginRight: SPACING.sm }}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products..."
          placeholderTextColor={colors.textTer}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={16} color={colors.textTer} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const selected = selectedCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, { backgroundColor: colors.bgSec, borderColor: colors.border }, selected && styles.chipSelected]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: colors.textSec }, selected && styles.chipTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Product Grid — 2-column */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONT.extraBold,
    letterSpacing: -0.5,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    height: '100%',
    fontFamily: FONT.regular,
  },

  // Category chips
  categoryScroll: {
    marginBottom: SPACING.md,
    flexGrow: 0,
  },
  categoryRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md + 6,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSec,
    fontFamily: FONT.medium,
  },
  chipTextSelected: {
    color: COLORS.accent,
    fontWeight: '700',
    fontFamily: FONT.bold,
  },

  // Grid
  gridContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 128,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },

  // Card — rounded-24
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // 1:1 Image area
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.bgTer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Inventory badge — top-right of image
  stockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT.bold,
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONT.semibold,
  },

  // Card body
  cardBody: {
    padding: SPACING.md,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTer,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.sm,
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  // Price + Buy aligned
  priceActionRow: {
    gap: SPACING.sm,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONT.numExtraBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },

  // Buttons — #0052FF for Buy Now
  buyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT.bold,
  },
  notifyBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  notifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONT.semibold,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONT.semibold,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSec,
    marginTop: SPACING.xs,
    textAlign: 'center',
    fontFamily: FONT.regular,
    lineHeight: 22,
  },
})
