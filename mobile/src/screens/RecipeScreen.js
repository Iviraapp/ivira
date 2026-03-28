import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_GAP = SPACING.sm
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - CARD_GAP) / 2
const FAVORITES_KEY = '@ivira_recipe_favorites'

// ─── Filter Categories ───────────────────────────────────────
const CATEGORIES = [
  { id: 'all',          label: 'All',           icon: '🍽️' },
  { id: 'high_protein', label: 'High Protein',  icon: '🥩' },
  { id: 'low_carb',     label: 'Low Carb',      icon: '🥬' },
  { id: 'vegan',        label: 'Vegan',          icon: '🌱' },
  { id: 'keto',         label: 'Keto',           icon: '🥑' },
  { id: 'quick',        label: 'Quick',          icon: '⏱️' },
]

// ─── Difficulty Config ───────────────────────────────────────
const DIFFICULTY = {
  Easy:   { color: '#34A853', label: 'Easy' },
  Medium: { color: '#FBBC05', label: 'Medium' },
  Hard:   { color: '#EA4335', label: 'Hard' },
}

// ─── Card Backgrounds (gradient-like solid colors) ───────────
const CARD_COLORS = [
  '#1B2838', '#2D1B38', '#1B3828', '#382D1B',
  '#1B2D38', '#381B28', '#283818', '#18282D',
  '#2B1B38', '#1B3832', '#38281B', '#1B2838',
]
const CARD_COLORS_LIGHT = [
  '#FFF5E6', '#F0E6FF', '#E6FFF0', '#FFE6E6',
  '#E6F0FF', '#FFE6F5', '#F0FFE6', '#E6FFFA',
  '#F5E6FF', '#E6FFF5', '#FFEDE6', '#E6EDFF',
]

// ─── Demo Recipes ────────────────────────────────────────────
const DEMO_RECIPES = [
  {
    id: '1',
    name: 'Chicken Tikka Bowl',
    emoji: '🍗',
    cookTime: 25,
    calories: 420,
    protein: 42,
    carbs: 28,
    fat: 14,
    fiber: 4,
    difficulty: 'Easy',
    categories: ['high_protein'],
    servings: 1,
    ingredients: [
      '200g chicken breast, cubed',
      '2 tbsp yogurt',
      '1 tsp tikka masala',
      '1/2 tsp turmeric',
      '1 cup brown rice, cooked',
      '1/2 cup cucumber raita',
      'Fresh coriander, mint',
      'Lemon wedge',
    ],
    steps: [
      'Marinate chicken in yogurt, tikka masala, turmeric, salt for 30 min.',
      'Thread onto skewers or spread on a baking tray.',
      'Grill or air-fry at 200°C for 12-15 min, flipping halfway.',
      'Serve over brown rice with cucumber raita and fresh herbs.',
    ],
  },
  {
    id: '2',
    name: 'Paneer Bhurji Wrap',
    emoji: '🌯',
    cookTime: 15,
    calories: 380,
    protein: 26,
    carbs: 32,
    fat: 18,
    fiber: 3,
    difficulty: 'Easy',
    categories: ['high_protein', 'quick'],
    servings: 1,
    ingredients: [
      '150g paneer, crumbled',
      '1 whole wheat roti/tortilla',
      '1/2 onion, finely diced',
      '1 tomato, chopped',
      '1 green chilli, minced',
      '1/2 tsp cumin seeds',
      'Fresh coriander',
      'Salt, turmeric, red chilli powder',
    ],
    steps: [
      'Heat oil, crackle cumin seeds. Sauté onion until golden.',
      'Add tomato, green chilli, turmeric, and cook until soft.',
      'Add crumbled paneer, salt, red chilli powder. Toss 3-4 min.',
      'Warm roti, fill with paneer bhurji, roll tightly. Serve hot.',
    ],
  },
  {
    id: '3',
    name: 'Moong Dal Chilla',
    emoji: '🫓',
    cookTime: 12,
    calories: 220,
    protein: 18,
    carbs: 24,
    fat: 6,
    fiber: 5,
    difficulty: 'Easy',
    categories: ['high_protein', 'vegan', 'quick'],
    servings: 2,
    ingredients: [
      '1 cup moong dal, soaked 4 hrs',
      '1 green chilli',
      '1/2 inch ginger',
      'Fresh coriander',
      '1/4 tsp cumin',
      'Salt to taste',
      '1 tsp oil per chilla',
    ],
    steps: [
      'Blend soaked moong dal with chilli, ginger, salt into smooth batter.',
      'Mix in chopped coriander and cumin.',
      'Heat non-stick pan, pour thin layer of batter, spread in circle.',
      'Cook 2 min each side until golden. Serve with mint chutney.',
    ],
  },
  {
    id: '4',
    name: 'Greek Yogurt Parfait',
    emoji: '🍨',
    cookTime: 5,
    calories: 310,
    protein: 28,
    carbs: 34,
    fat: 8,
    fiber: 4,
    difficulty: 'Easy',
    categories: ['high_protein', 'quick'],
    servings: 1,
    ingredients: [
      '200g Greek yogurt (plain)',
      '30g granola',
      '1 tbsp honey',
      '1/2 cup mixed berries',
      '1 tbsp chia seeds',
      '10 almonds, sliced',
    ],
    steps: [
      'Layer half the yogurt in a glass or bowl.',
      'Add berries, granola, and chia seeds.',
      'Top with remaining yogurt and sliced almonds.',
      'Drizzle honey on top. Serve immediately.',
    ],
  },
  {
    id: '5',
    name: 'Egg White Omelette',
    emoji: '🍳',
    cookTime: 8,
    calories: 180,
    protein: 24,
    carbs: 6,
    fat: 6,
    fiber: 2,
    difficulty: 'Easy',
    categories: ['high_protein', 'low_carb', 'keto', 'quick'],
    servings: 1,
    ingredients: [
      '5 egg whites',
      '1/4 cup spinach, chopped',
      '2 tbsp bell pepper, diced',
      '2 tbsp mushrooms, sliced',
      '1 tbsp feta cheese (optional)',
      'Salt, pepper, herbs',
      '1 tsp olive oil',
    ],
    steps: [
      'Whisk egg whites with salt and pepper until frothy.',
      'Heat olive oil in non-stick pan over medium heat.',
      'Add veggies, sauté 1 min. Pour egg whites over.',
      'Cook until set, fold in half. Top with feta if desired.',
    ],
  },
  {
    id: '6',
    name: 'Cauliflower Fried Rice',
    emoji: '🍚',
    cookTime: 15,
    calories: 195,
    protein: 12,
    carbs: 14,
    fat: 10,
    fiber: 6,
    difficulty: 'Easy',
    categories: ['low_carb', 'keto', 'quick'],
    servings: 2,
    ingredients: [
      '1 medium cauliflower, riced',
      '2 eggs, beaten',
      '1/2 cup mixed veggies (peas, carrot, corn)',
      '2 tbsp soy sauce',
      '1 tsp sesame oil',
      '2 cloves garlic, minced',
      'Spring onion for garnish',
    ],
    steps: [
      'Pulse cauliflower in food processor to rice-sized pieces.',
      'Scramble eggs in a hot wok, set aside.',
      'Stir-fry garlic and veggies 2 min. Add cauliflower rice.',
      'Cook 4-5 min, add soy sauce, sesame oil, eggs. Toss and serve.',
    ],
  },
  {
    id: '7',
    name: 'Tofu Tikka Masala',
    emoji: '🍛',
    cookTime: 30,
    calories: 340,
    protein: 22,
    carbs: 26,
    fat: 16,
    fiber: 5,
    difficulty: 'Medium',
    categories: ['vegan', 'high_protein'],
    servings: 2,
    ingredients: [
      '300g extra-firm tofu, cubed',
      '1 cup tomato puree',
      '1/2 cup coconut cream',
      '1 onion, diced',
      '2 cloves garlic, minced',
      '1 tbsp garam masala',
      '1 tsp cumin, coriander, turmeric',
      'Fresh coriander, salt',
    ],
    steps: [
      'Press tofu 15 min, cube, and pan-fry until golden on all sides.',
      'Sauté onion and garlic. Add all spices, toast 1 min.',
      'Pour in tomato puree, simmer 10 min. Add coconut cream.',
      'Add tofu cubes, simmer 5 min. Garnish with coriander.',
    ],
  },
  {
    id: '8',
    name: 'Quinoa Power Salad',
    emoji: '🥗',
    cookTime: 20,
    calories: 360,
    protein: 16,
    carbs: 42,
    fat: 14,
    fiber: 8,
    difficulty: 'Easy',
    categories: ['vegan'],
    servings: 2,
    ingredients: [
      '1 cup quinoa, cooked',
      '1/2 cup chickpeas, drained',
      '1/2 avocado, cubed',
      '1/2 cup cherry tomatoes, halved',
      '1/4 cucumber, diced',
      '2 tbsp lemon-tahini dressing',
      'Handful of rocket/arugula',
      'Pumpkin seeds, salt, pepper',
    ],
    steps: [
      'Cook quinoa per package instructions, let cool.',
      'Toss quinoa with chickpeas, tomatoes, cucumber, and rocket.',
      'Top with avocado cubes and pumpkin seeds.',
      'Drizzle lemon-tahini dressing. Season to taste.',
    ],
  },
  {
    id: '9',
    name: 'Salmon Teriyaki',
    emoji: '🐟',
    cookTime: 18,
    calories: 440,
    protein: 38,
    carbs: 22,
    fat: 22,
    fiber: 2,
    difficulty: 'Medium',
    categories: ['high_protein', 'keto'],
    servings: 1,
    ingredients: [
      '200g salmon fillet',
      '2 tbsp soy sauce',
      '1 tbsp mirin',
      '1 tbsp honey',
      '1 tsp ginger, grated',
      '1 clove garlic, minced',
      'Steamed broccoli',
      'Sesame seeds, spring onion',
    ],
    steps: [
      'Mix soy sauce, mirin, honey, ginger, and garlic for glaze.',
      'Pan-sear salmon skin-side down 4 min, flip.',
      'Pour glaze over, cook 3-4 min more until caramelized.',
      'Serve with steamed broccoli, garnish sesame seeds and spring onion.',
    ],
  },
  {
    id: '10',
    name: 'Keema Matar',
    emoji: '🍖',
    cookTime: 35,
    calories: 390,
    protein: 36,
    carbs: 18,
    fat: 20,
    fiber: 4,
    difficulty: 'Medium',
    categories: ['high_protein', 'low_carb'],
    servings: 2,
    ingredients: [
      '300g chicken/lamb mince',
      '1/2 cup green peas',
      '1 onion, finely chopped',
      '2 tomatoes, pureed',
      '1 tsp ginger-garlic paste',
      '1 tsp garam masala, cumin, coriander',
      '1/2 tsp turmeric, red chilli powder',
      'Fresh coriander, 1 tbsp oil',
    ],
    steps: [
      'Heat oil, sauté onion until golden brown.',
      'Add ginger-garlic paste, cook 1 min. Add mince, brown well.',
      'Add tomato puree and all spices. Cook 15 min on medium.',
      'Add peas, cover, cook 8-10 min. Garnish with coriander.',
    ],
  },
  {
    id: '11',
    name: 'Avocado Keto Bowl',
    emoji: '🥑',
    cookTime: 10,
    calories: 480,
    protein: 20,
    carbs: 12,
    fat: 40,
    fiber: 10,
    difficulty: 'Easy',
    categories: ['keto', 'low_carb', 'quick'],
    servings: 1,
    ingredients: [
      '1 ripe avocado, halved',
      '2 boiled eggs, halved',
      '30g feta or goat cheese',
      '5-6 cherry tomatoes',
      '1 tbsp olive oil',
      '1 tbsp pumpkin seeds',
      'Salt, pepper, chilli flakes',
      'Microgreens or rocket',
    ],
    steps: [
      'Halve avocado, remove pit. Arrange on plate.',
      'Place boiled egg halves alongside.',
      'Scatter cherry tomatoes, crumbled cheese, and pumpkin seeds.',
      'Drizzle olive oil, season. Top with microgreens.',
    ],
  },
  {
    id: '12',
    name: 'Ragi Dosa + Chutney',
    emoji: '🫓',
    cookTime: 15,
    calories: 240,
    protein: 10,
    carbs: 38,
    fat: 6,
    fiber: 6,
    difficulty: 'Easy',
    categories: ['vegan', 'quick'],
    servings: 2,
    ingredients: [
      '1 cup ragi (finger millet) flour',
      '1/4 cup rice flour',
      '1/2 onion, finely chopped',
      '1 green chilli, minced',
      'Cumin seeds, curry leaves',
      'Salt to taste',
      'Water to make batter',
      'Coconut chutney to serve',
    ],
    steps: [
      'Mix ragi flour, rice flour, salt with water to thin dosa batter.',
      'Add onion, chilli, cumin, and curry leaves to batter.',
      'Pour on hot tawa, spread thin. Drizzle oil around edges.',
      'Cook until crispy, fold. Serve with coconut chutney.',
    ],
  },
  {
    id: '13',
    name: 'Whey Protein Pancakes',
    emoji: '🥞',
    cookTime: 10,
    calories: 320,
    protein: 34,
    carbs: 28,
    fat: 8,
    fiber: 3,
    difficulty: 'Easy',
    categories: ['high_protein', 'quick'],
    servings: 1,
    ingredients: [
      '1 scoop whey protein (vanilla/chocolate)',
      '1/2 cup oats, blended',
      '1 banana, mashed',
      '1 egg',
      '1/4 cup milk',
      '1/2 tsp baking powder',
      'Pinch of cinnamon',
      'Sugar-free syrup or honey',
    ],
    steps: [
      'Blend oats to flour. Mix with protein powder, baking powder, cinnamon.',
      'Add mashed banana, egg, and milk. Stir until smooth.',
      'Pour small circles on non-stick pan over medium heat.',
      'Flip when bubbles form (~2 min). Cook 1 min more. Top with syrup.',
    ],
  },
  {
    id: '14',
    name: 'Zucchini Noodle Stir-Fry',
    emoji: '🍜',
    cookTime: 12,
    calories: 210,
    protein: 14,
    carbs: 10,
    fat: 14,
    fiber: 4,
    difficulty: 'Easy',
    categories: ['low_carb', 'keto', 'quick'],
    servings: 1,
    ingredients: [
      '2 medium zucchini, spiralized',
      '100g shrimp or chicken',
      '1 tbsp soy sauce',
      '1 tsp sesame oil',
      '2 cloves garlic, minced',
      '1/2 red bell pepper, sliced',
      'Chilli flakes',
      'Sesame seeds',
    ],
    steps: [
      'Spiralize zucchini into noodles, pat dry with towel.',
      'Stir-fry protein in sesame oil until cooked. Set aside.',
      'Sauté garlic and bell pepper 1 min. Add zoodles, toss 2 min.',
      'Add soy sauce, protein, chilli flakes. Garnish with sesame seeds.',
    ],
  },
]

// ─── Recipe Card Component ───────────────────────────────────
function RecipeCard({ recipe, index, onPress, isFavorite, onToggleFavorite, colors, isDark }) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const bgColor = isDark ? CARD_COLORS[index % CARD_COLORS.length] : CARD_COLORS_LIGHT[index % CARD_COLORS_LIGHT.length]
  const diffConf = DIFFICULTY[recipe.difficulty] || DIFFICULTY.Easy

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start()
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { backgroundColor: bgColor, borderColor: colors.border }]}
      >
        {/* Favorite button */}
        <TouchableOpacity
          onPress={onToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.favBtn}
        >
          <Feather
            name={isFavorite ? 'heart' : 'heart'}
            size={16}
            color={isFavorite ? '#EA4335' : colors.textTer}
          />
          {isFavorite && <View style={styles.favDot} />}
        </TouchableOpacity>

        {/* Emoji Hero */}
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{recipe.emoji}</Text>
        </View>

        {/* Name */}
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
          {recipe.name}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={11} color={colors.textTer} />
            <Text style={[styles.metaText, { color: colors.textSec }]}>{recipe.cookTime}m</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="zap" size={11} color={colors.textTer} />
            <Text style={[styles.metaText, { color: colors.textSec }]}>{recipe.calories}</Text>
          </View>
        </View>

        {/* Bottom row: protein + difficulty */}
        <View style={styles.bottomRow}>
          <View style={[styles.proteinPill, { backgroundColor: isDark ? 'rgba(52,168,83,0.15)' : 'rgba(52,168,83,0.1)' }]}>
            <Text style={[styles.proteinText, { color: colors.green }]}>{recipe.protein}g P</Text>
          </View>
          <View style={[styles.diffPill, { backgroundColor: isDark ? `${diffConf.color}20` : `${diffConf.color}15` }]}>
            <View style={[styles.diffDot, { backgroundColor: diffConf.color }]} />
            <Text style={[styles.diffText, { color: diffConf.color }]}>{diffConf.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Recipe Detail Modal ─────────────────────────────────────
function RecipeDetailModal({ recipe, visible, onClose, isFavorite, onToggleFavorite, colors, isDark }) {
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }).start()
    } else {
      slideAnim.setValue(0)
    }
  }, [visible])

  if (!recipe) return null

  const diffConf = DIFFICULTY[recipe.difficulty] || DIFFICULTY.Easy
  const nutritionItems = [
    { label: 'Calories',  value: `${recipe.calories}`,  unit: 'kcal', color: colors.amber },
    { label: 'Protein',   value: `${recipe.protein}`,   unit: 'g',    color: colors.green },
    { label: 'Carbs',     value: `${recipe.carbs}`,     unit: 'g',    color: COLORS.accent },
    { label: 'Fat',       value: `${recipe.fat}`,       unit: 'g',    color: colors.red },
    { label: 'Fiber',     value: `${recipe.fiber}`,     unit: 'g',    color: '#8B5CF6' },
  ]

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Feather name="x" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalHeaderTitle, { color: colors.text }]} numberOfLines={1}>Recipe</Text>
          <TouchableOpacity onPress={onToggleFavorite} style={styles.modalFavBtn}>
            <Feather name="heart" size={20} color={isFavorite ? '#EA4335' : colors.textTer} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={[styles.heroSection, { backgroundColor: isDark ? '#1A1A2E' : '#F5F0FF' }]}>
            <Text style={styles.heroEmoji}>{recipe.emoji}</Text>
            <Text style={[styles.heroName, { color: colors.text }]}>{recipe.name}</Text>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Feather name="clock" size={14} color={colors.textSec} />
                <Text style={[styles.heroMetaText, { color: colors.textSec }]}>{recipe.cookTime} min</Text>
              </View>
              <View style={[styles.heroMetaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.heroMetaItem}>
                <Feather name="users" size={14} color={colors.textSec} />
                <Text style={[styles.heroMetaText, { color: colors.textSec }]}>{recipe.servings} serving{recipe.servings > 1 ? 's' : ''}</Text>
              </View>
              <View style={[styles.heroMetaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.heroMetaItem}>
                <View style={[styles.diffDot, { backgroundColor: diffConf.color }]} />
                <Text style={[styles.heroMetaText, { color: diffConf.color }]}>{diffConf.label}</Text>
              </View>
            </View>
          </View>

          {/* Nutrition Breakdown */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition per Serving</Text>
            <View style={[styles.nutritionGrid, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              {nutritionItems.map((item, i) => (
                <View
                  key={item.label}
                  style={[
                    styles.nutritionItem,
                    i < nutritionItems.length - 1 && { borderRightColor: colors.border, borderRightWidth: 1 },
                  ]}
                >
                  <Text style={[styles.nutritionValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[styles.nutritionUnit, { color: item.color, opacity: 0.7 }]}>{item.unit}</Text>
                  <Text style={[styles.nutritionLabel, { color: colors.textTer }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
              <View style={[styles.countBadge, { backgroundColor: isDark ? COLORS.accentSoft : 'rgba(0,82,255,0.08)' }]}>
                <Text style={[styles.countText, { color: COLORS.accent }]}>{recipe.ingredients.length}</Text>
              </View>
            </View>
            <View style={[styles.ingredientsList, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
              {recipe.ingredients.map((ing, i) => (
                <View
                  key={i}
                  style={[
                    styles.ingredientRow,
                    i < recipe.ingredients.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[styles.ingredientBullet, { backgroundColor: COLORS.accent }]} />
                  <Text style={[styles.ingredientText, { color: colors.text }]}>{ing}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={[styles.stepRow, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
                <View style={[styles.stepNumber, { backgroundColor: COLORS.accent }]}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Main Screen ─────────────────────────────────────────────
export default function RecipeScreen() {
  const { colors, isDark } = useTheme()
  const { member, gymId } = useAuth()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [favorites, setFavorites] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [recipes, setRecipes] = useState(DEMO_RECIPES)

  // Helper to map backend recipe to the format the UI expects
  const mapBackendRecipe = (r) => ({
    id: String(r.id),
    name: r.name,
    emoji: r.emoji || '🍽️',
    cookTime: r.cook_time ?? r.cookTime ?? 0,
    calories: r.calories ?? 0,
    protein: r.protein ?? 0,
    carbs: r.carbs ?? 0,
    fat: r.fat ?? 0,
    fiber: r.fiber ?? 0,
    difficulty: r.difficulty || 'Easy',
    categories: r.categories || r.tags || [],
    servings: r.servings ?? 1,
    ingredients: r.ingredients || [],
    steps: r.steps || r.instructions || [],
  })

  // Fetch recipes from backend
  const fetchRecipes = useCallback(async () => {
    try {
      const params = {}
      if (activeCategory !== 'all') params.category = activeCategory
      if (search.trim()) params.search = search.trim()
      const res = await api.get('/recipes', { params })
      const data = res.data?.data ?? res.data?.recipes ?? res.data
      if (Array.isArray(data) && data.length > 0) {
        setRecipes(data.map(mapBackendRecipe))
      }
    } catch (e) {
      // Fallback: keep existing recipes (DEMO_RECIPES on first load)
    }
  }, [activeCategory, search])

  // Load recipes from backend on mount and when filters change
  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  // Load favorites from backend (with AsyncStorage fallback)
  useEffect(() => {
    loadFavorites()
  }, [gymId, member?.id])

  const loadFavorites = async () => {
    // Try backend first
    if (gymId && member?.id) {
      try {
        const res = await api.get(`/gyms/${gymId}/members/${member.id}/recipes/favorites`)
        const data = res.data?.data ?? res.data?.favorites ?? res.data
        if (Array.isArray(data)) {
          const favIds = data.map((f) => String(f.recipe_id ?? f.recipeId ?? f.id))
          setFavorites(favIds)
          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favIds))
          return
        }
      } catch (e) {
        // Fall through to AsyncStorage
      }
    }
    // AsyncStorage fallback
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY)
      if (stored) setFavorites(JSON.parse(stored))
    } catch (e) {
      // silent
    }
  }

  const saveFavorites = async (newFavs) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs))
    } catch (e) {
      // silent
    }
  }

  const toggleFavorite = useCallback(async (recipeId) => {
    const isFav = favorites.includes(recipeId)

    // Optimistic update
    const next = isFav
      ? favorites.filter((id) => id !== recipeId)
      : [...favorites, recipeId]
    setFavorites(next)
    saveFavorites(next)

    // Sync with backend
    if (gymId && member?.id) {
      try {
        if (isFav) {
          await api.delete(`/gyms/${gymId}/members/${member.id}/recipes/favorites/${recipeId}`)
        } else {
          await api.post(`/gyms/${gymId}/members/${member.id}/recipes/favorites`, { recipe_id: recipeId })
        }
      } catch (e) {
        // Revert on failure
        setFavorites(favorites)
        saveFavorites(favorites)
      }
    }
  }, [favorites, gymId, member?.id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchRecipes()
    setRefreshing(false)
  }, [fetchRecipes])

  // Filtered + searched recipes
  const filteredRecipes = useMemo(() => {
    let result = recipes

    // Category filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'quick') {
        result = result.filter((r) => r.cookTime <= 15)
      } else {
        result = result.filter((r) => r.categories.includes(activeCategory))
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.ingredients.some((ing) => ing.toLowerCase().includes(q))
      )
    }

    return result
  }, [recipes, activeCategory, search])

  const openRecipe = useCallback((recipe) => {
    setSelectedRecipe(recipe)
    setModalVisible(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setTimeout(() => setSelectedRecipe(null), 300)
  }, [])

  const renderRecipe = useCallback(
    ({ item, index }) => (
      <RecipeCard
        recipe={item}
        index={index}
        onPress={() => openRecipe(item)}
        isFavorite={favorites.includes(item.id)}
        onToggleFavorite={() => toggleFavorite(item.id)}
        colors={colors}
        isDark={isDark}
      />
    ),
    [favorites, colors, isDark, openRecipe, toggleFavorite]
  )

  const keyExtractor = useCallback((item) => item.id, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Recipe Book</Text>
          <Text style={[styles.subtitle, { color: colors.textSec }]}>
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} for your fitness goals
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: isDark ? COLORS.accentSoft : 'rgba(0,82,255,0.08)' }]}>
          <Feather name="book-open" size={16} color={COLORS.accent} />
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View style={[styles.searchWrap, { backgroundColor: colors.bgSec, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.textTer} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search recipes or ingredients..."
          placeholderTextColor={colors.textTer}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x-circle" size={16} color={colors.textTer} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Filters ── */}
      <View style={styles.filtersOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersInner}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? COLORS.accent
                      : isDark ? colors.bgSec : colors.bgTer,
                    borderColor: active ? COLORS.accent : colors.border,
                  },
                ]}
              >
                <Text style={styles.filterEmoji}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.filterLabel,
                    { color: active ? '#FFFFFF' : colors.textSec },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Recipe Grid ── */}
      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No recipes found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
            Try a different search or filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipe}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        />
      )}

      {/* ── Detail Modal ── */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={modalVisible}
        onClose={closeModal}
        isFavorite={selectedRecipe ? favorites.includes(selectedRecipe.id) : false}
        onToggleFavorite={() => selectedRecipe && toggleFavorite(selectedRecipe.id)}
        colors={colors}
        isDark={isDark}
      />
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 26,
    fontFamily: FONT.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
    height: '100%',
    paddingVertical: 0,
  },

  // Filters
  filtersOuter: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  filtersInner: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: FONT.semibold,
  },

  // Grid
  gridContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    minHeight: 190,
    justifyContent: 'space-between',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 4,
  },
  favDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EA4335',
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emoji: {
    fontSize: 26,
  },
  cardName: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: FONT.numMedium,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proteinPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  proteinText: {
    fontSize: 10,
    fontFamily: FONT.numSemibold,
  },
  diffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  diffDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  diffText: {
    fontSize: 10,
    fontFamily: FONT.semibold,
  },

  // Empty
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT.semibold,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
  },
  modalFavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: SPACING.xxl,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  heroName: {
    fontSize: 24,
    fontFamily: FONT.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: SPACING.md,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    fontFamily: FONT.medium,
  },
  heroMetaDivider: {
    width: 1,
    height: 16,
  },

  // Sections
  sectionWrap: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONT.bold,
    marginBottom: SPACING.sm,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  countText: {
    fontSize: 12,
    fontFamily: FONT.numSemibold,
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: SPACING.md,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontFamily: FONT.numBold,
  },
  nutritionUnit: {
    fontSize: 10,
    fontFamily: FONT.numMedium,
    marginTop: 1,
  },
  nutritionLabel: {
    fontSize: 10,
    fontFamily: FONT.regular,
    marginTop: 4,
  },

  // Ingredients
  ingredientsList: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
    lineHeight: 20,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT.numBold,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
    lineHeight: 21,
  },
})
