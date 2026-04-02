import React, { useRef, useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated, Dimensions,
} from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StackActions } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, FONT, RADIUS, SPACING } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AIChatModal from '../components/AIChatModal'

// Screens
import HomeScreen from '../screens/HomeScreen'
import CirclesScreen from '../screens/CirclesScreen'
import HealthScreen from '../screens/HealthScreen'
import ProfileScreen from '../screens/ProfileScreen'

// Stack screens (keep all existing ones)
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen'
import NutritionScreen from '../screens/NutritionScreen'
import WorkoutTrackerScreen from '../screens/WorkoutTrackerScreen'
import WorkoutAnalyzerScreen from '../screens/WorkoutAnalyzerScreen'
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen'
import SleepTrackerScreen from '../screens/SleepTrackerScreen'
import ActivityDashboardScreen from '../screens/ActivityDashboardScreen'
import FitnessScoreScreen from '../screens/FitnessScoreScreen'
import NutritionLogScreen from '../screens/NutritionLogScreen'
import FoodScannerScreen from '../screens/FoodScannerScreen'
import ChallengesScreen from '../screens/ChallengesScreen'
import AchievementsScreen from '../screens/AchievementsScreen'
import ProgressScreen from '../screens/ProgressScreen'
import ProgressPhotosScreen from '../screens/ProgressPhotosScreen'
import MembershipActivationScreen from '../screens/MembershipActivationScreen'
import MembershipRenewalScreen from '../screens/MembershipRenewalScreen'
import GymDiscoveryScreen from '../screens/GymDiscoveryScreen'
import CityLeaderboardScreen from '../screens/CityLeaderboardScreen'
import ReferralScreen from '../screens/ReferralScreen'
import InvoicesScreen from '../screens/InvoicesScreen'
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen'
import RecipeScreen from '../screens/RecipeScreen'
import YogaScreen from '../screens/YogaScreen'
import FastingLogScreen from '../screens/FastingLogScreen'
import NutritionDetailScreen from '../screens/NutritionDetailScreen'
import ActionPlanScreen from '../screens/ActionPlanScreen'
import RevenueDashboardScreen from '../screens/RevenueDashboardScreen'
import HistoryScreen from '../screens/HistoryScreen'
import SubscriptionScreen from '../screens/SubscriptionScreen'
import TrainerDashboardScreen from '../screens/TrainerDashboardScreen'
import PodHomeScreen from '../screens/PodHomeScreen'
import PodFeedScreen from '../screens/PodFeedScreen'
import PodDiscoveryScreen from '../screens/PodDiscoveryScreen'
import PodStatsScreen from '../screens/PodStatsScreen'
import DailyCommitScreen from '../screens/DailyCommitScreen'
import ServiceDetailScreen from '../screens/ServiceDetailScreen'
import CommunityHubScreen from '../screens/CommunityHubScreen'
import MarketplaceScreen from '../screens/MarketplaceScreen'
import CheckInScreen from '../screens/CheckInScreen'

let BlurView = null
try {
  if (Platform.OS !== 'web') {
    const { UIManager } = require('react-native')
    const ok = UIManager.getViewManagerConfig?.('ExpoBlurView') ||
      UIManager.getViewManagerConfig?.('BlurView')
    if (ok) BlurView = require('expo-blur').BlurView
  }
} catch {}

const Tab = createBottomTabNavigator()
const HomeStack = createNativeStackNavigator()
const HealthStack = createNativeStackNavigator()
const CirclesStack = createNativeStackNavigator()
const ProfileStack = createNativeStackNavigator()

// ─── Stack navigators ────────────────────────────────────────
function HomeStackNavigator() {
  const { colors } = useTheme()
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="CheckIn" component={CheckInScreen} />
      <HomeStack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <HomeStack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
      <HomeStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <HomeStack.Screen name="NutritionLog" component={NutritionLogScreen} />
      <HomeStack.Screen name="FoodScanner" component={FoodScannerScreen} />
      <HomeStack.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <HomeStack.Screen name="ActivityDashboard" component={ActivityDashboardScreen} />
      <HomeStack.Screen name="FitnessScore" component={FitnessScoreScreen} />
      <HomeStack.Screen name="FastingLog" component={FastingLogScreen} />
      <HomeStack.Screen name="Challenges" component={ChallengesScreen} />
      <HomeStack.Screen name="Achievements" component={AchievementsScreen} />
      <HomeStack.Screen name="Progress" component={ProgressScreen} />
      <HomeStack.Screen name="Recipes" component={RecipeScreen} />
      <HomeStack.Screen name="Yoga" component={YogaScreen} />
      <HomeStack.Screen name="CityLeaderboard" component={CityLeaderboardScreen} />
      <HomeStack.Screen name="GymDiscovery" component={GymDiscoveryScreen} />
      <HomeStack.Screen name="MembershipActivation" component={MembershipActivationScreen} />
      <HomeStack.Screen name="MembershipRenewal" component={MembershipRenewalScreen} />
      <HomeStack.Screen name="Subscription" component={SubscriptionScreen} />
      <HomeStack.Screen name="History" component={HistoryScreen} />
      <HomeStack.Screen name="NutritionDetail" component={NutritionDetailScreen} />
      <HomeStack.Screen name="TrainerDashboard" component={TrainerDashboardScreen} />
      <HomeStack.Screen name="PodHome" component={PodHomeScreen} />
      <HomeStack.Screen name="PodFeed" component={PodFeedScreen} />
      <HomeStack.Screen name="PodDiscovery" component={PodDiscoveryScreen} />
      <HomeStack.Screen name="PodStats" component={PodStatsScreen} />
      <HomeStack.Screen name="DailyCommit" component={DailyCommitScreen} />
    </HomeStack.Navigator>
  )
}

function HealthStackNavigator() {
  const { colors } = useTheme()
  return (
    <HealthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <HealthStack.Screen name="HealthMain" component={HealthScreen} />
      <HealthStack.Screen name="Nutrition" component={NutritionScreen} />
      <HealthStack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <HealthStack.Screen name="NutritionLog" component={NutritionLogScreen} />
      <HealthStack.Screen name="NutritionDetail" component={NutritionDetailScreen} />
      <HealthStack.Screen name="FoodScanner" component={FoodScannerScreen} />
      <HealthStack.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <HealthStack.Screen name="ActivityDashboard" component={ActivityDashboardScreen} />
      <HealthStack.Screen name="FitnessScore" component={FitnessScoreScreen} />
      <HealthStack.Screen name="ActionPlan" component={ActionPlanScreen} />
      <HealthStack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
    </HealthStack.Navigator>
  )
}

function CirclesStackNavigator() {
  const { colors } = useTheme()
  return (
    <CirclesStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <CirclesStack.Screen name="CirclesMain" component={CirclesScreen} />
      <CirclesStack.Screen name="WorkoutAnalyzer" component={WorkoutAnalyzerScreen} />
      <CirclesStack.Screen name="PodFeed" component={PodFeedScreen} />
      <CirclesStack.Screen name="PodDiscovery" component={PodDiscoveryScreen} />
      <CirclesStack.Screen name="PodStats" component={PodStatsScreen} />
      <CirclesStack.Screen name="DailyCommit" component={DailyCommitScreen} />
      <CirclesStack.Screen name="CommunityHub" component={CommunityHubScreen} />
      <CirclesStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <CirclesStack.Screen name="GymDiscovery" component={GymDiscoveryScreen} />
      <CirclesStack.Screen name="Marketplace" component={MarketplaceScreen} />
      <CirclesStack.Screen name="CityLeaderboard" component={CityLeaderboardScreen} />
    </CirclesStack.Navigator>
  )
}

function ProfileStackNavigator() {
  const { colors } = useTheme()
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Invoices" component={InvoicesScreen} />
      <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <ProfileStack.Screen name="MembershipRenewal" component={MembershipRenewalScreen} />
      <ProfileStack.Screen name="Progress" component={ProgressScreen} />
      <ProfileStack.Screen name="ProgressPhotos" component={ProgressPhotosScreen} />
      <ProfileStack.Screen name="Referral" component={ReferralScreen} />
      <ProfileStack.Screen name="RevenueDashboard" component={RevenueDashboardScreen} />
      <ProfileStack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
      <ProfileStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <ProfileStack.Screen name="Achievements" component={AchievementsScreen} />
      <ProfileStack.Screen name="Challenges" component={ChallengesScreen} />
      <ProfileStack.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <ProfileStack.Screen name="FastingLog" component={FastingLogScreen} />
      <ProfileStack.Screen name="NutritionLog" component={NutritionLogScreen} />
      <ProfileStack.Screen name="NutritionDetail" component={NutritionDetailScreen} />
    </ProfileStack.Navigator>
  )
}

// ─── Tab icon ────────────────────────────────────────────────
function TabIcon({ name, focused, colors }) {
  return (
    <View style={s.iconWrap}>
      <Feather name={name} size={21} color={focused ? COLORS.accent : colors.textTer} />
      {focused && <View style={[s.dot, { backgroundColor: COLORS.accent }]} />}
    </View>
  )
}

// ─── Center QR FAB ──────────────────────────────────────────
function QRFab({ onPress }) {
  const scale = useRef(new Animated.Value(1)).current
  const glow  = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.65, duration: 1600, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3,  duration: 1600, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }).start()}
      activeOpacity={1}
    >
      <Animated.View style={[s.fabGlow, { opacity: glow }]} />
      <Animated.View style={[s.fab, { transform: [{ scale }] }]}>
        <Feather name="maximize" size={22} color="#07080F" />
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─── Floating pill tab bar ───────────────────────────────────
function FloatingTabBar({ state, navigation }) {
  const { colors, isDark } = useTheme()
  const icons = ['home', 'users', null, 'activity', 'user']
  const labels = ['Home', 'Circles', null, 'Health', 'Me']

  const handlePress = (route, isFocused, index) => {
    if (isFocused) {
      const nested = state.routes[index]?.state
      if (nested?.index > 0) {
        navigation.dispatch({ ...StackActions.popToTop(), target: nested.key })
      }
    } else {
      navigation.navigate(route.name)
    }
  }

  const barContent = (
    <View style={s.barInner}>
      {state.routes.map((route, i) => {
        const isFocused = state.index === i
        if (i === 2) {
          return <View key="fab-slot" style={s.fabSlot} />
        }
        return (
          <TouchableOpacity
            key={route.key}
            style={s.tabBtn}
            onPress={() => handlePress(route, isFocused, i)}
            activeOpacity={0.7}
          >
            <TabIcon name={icons[i]} focused={isFocused} colors={colors} />
            <Text style={[s.tabLabel, { color: isFocused ? COLORS.accent : colors.textTer }]}>
              {labels[i]}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  if (BlurView && Platform.OS !== 'web') {
    return (
      <BlurView
        intensity={isDark ? 55 : 75}
        tint={isDark ? 'dark' : 'light'}
        style={s.bar}
      >
        {barContent}
      </BlurView>
    )
  }

  return (
    <View style={[s.bar, { backgroundColor: isDark ? 'rgba(10,11,18,0.96)' : 'rgba(255,255,255,0.97)' }]}>
      {barContent}
    </View>
  )
}

function FloatingTabWrapper({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets()
  const bottom = Math.max(insets.bottom, 8) + 10
  const fabBottom = bottom + 8

  const { hasGym } = useAuth()
  const navRef = useRef(null)

  const handleQR = () => {
    const nav = navRef.current || navigation
    if (hasGym) {
      nav.navigate('Home', { screen: 'CheckIn' })
    } else {
      nav.navigate('Home', { screen: 'MembershipActivation' })
    }
  }

  if (!navRef.current) navRef.current = navigation

  return (
    <>
      <View style={[s.barWrap, { bottom }]}>
        <FloatingTabBar state={state} descriptors={descriptors} navigation={navigation} />
      </View>
      <View style={[s.fabWrap, { bottom: fabBottom }]}>
        <QRFab onPress={handleQR} />
      </View>
    </>
  )
}

// ─── AI Coach floating button ────────────────────────────────
function AICoachFAB() {
  const { colors } = useTheme()
  const { token } = useAuth()
  const [visible, setVisible] = useState(false)
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 1400, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  if (!token) return null

  return (
    <>
      <Animated.View style={[s.aiWrap, { transform: [{ scale: pulse }] }]}>
        <TouchableOpacity
          style={[s.aiBtn, { backgroundColor: colors.purple || COLORS.purple }]}
          onPress={() => setVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="zap" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      <AIChatModal visible={visible} onClose={() => setVisible(false)} />
    </>
  )
}

// ─── Main export ─────────────────────────────────────────────
export default function TabNavigator() {
  const { colors } = useTheme()

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabWrapper {...props} />}
        sceneContainerStyle={{ backgroundColor: colors.bg }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen name="Home"    component={HomeStackNavigator} />
        <Tab.Screen name="Circles" component={CirclesStackNavigator} />
        <Tab.Screen name="QR"      component={HomeStackNavigator} listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault()
            navigation.navigate('Home', { screen: 'CheckIn' })
          }
        })} />
        <Tab.Screen name="Health"  component={HealthStackNavigator} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      </Tab.Navigator>
      <AICoachFAB />
    </View>
  )
}

const s = StyleSheet.create({
  barWrap: {
    position: 'absolute', left: 16, right: 16, zIndex: 100,
  },
  bar: {
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.2,
  },
  fabSlot: { flex: 1 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  dot: {
    width: 4, height: 4, borderRadius: 2, marginTop: 3,
  },

  // QR FAB
  fabWrap: {
    position: 'absolute',
    left: 0, right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 68, height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accent,
  },
  fab: {
    width: 58, height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  // AI Coach FAB
  aiWrap: {
    position: 'absolute',
    bottom: 110, right: 18,
    zIndex: 200,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 14,
  },
  aiBtn: {
    width: 46, height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
