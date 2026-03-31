import React, { useState, useRef, useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StackActions } from '@react-navigation/native'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AIChatModal from '../components/AIChatModal'
import HomeScreen from '../screens/HomeScreen'
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen'
import HealthScreen from '../screens/HealthScreen'
import NutritionScreen from '../screens/NutritionScreen'
import ProfileScreen from '../screens/ProfileScreen'
import HistoryScreen from '../screens/HistoryScreen'
import CommunityHubScreen from '../screens/CommunityHubScreen'
import ServiceDetailScreen from '../screens/ServiceDetailScreen'
import PodHomeScreen from '../screens/PodHomeScreen'
import DailyCommitScreen from '../screens/DailyCommitScreen'
import PodFeedScreen from '../screens/PodFeedScreen'
import PodDiscoveryScreen from '../screens/PodDiscoveryScreen'
import PodStatsScreen from '../screens/PodStatsScreen'
import ActionPlanScreen from '../screens/ActionPlanScreen'
import InvoicesScreen from '../screens/InvoicesScreen'
import NutritionLogScreen from '../screens/NutritionLogScreen'
import FastingLogScreen from '../screens/FastingLogScreen'
import ProgressScreen from '../screens/ProgressScreen'
import NutritionDetailScreen from '../screens/NutritionDetailScreen'
import MembershipActivationScreen from '../screens/MembershipActivationScreen'
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen'
import WorkoutTrackerScreen from '../screens/WorkoutTrackerScreen'
import MembershipRenewalScreen from '../screens/MembershipRenewalScreen'
import RevenueDashboardScreen from '../screens/RevenueDashboardScreen'
import ReferralScreen from '../screens/ReferralScreen'
import ProgressPhotosScreen from '../screens/ProgressPhotosScreen'
import FitnessScoreScreen from '../screens/FitnessScoreScreen'
import ActivityDashboardScreen from '../screens/ActivityDashboardScreen'
import FoodScannerScreen from '../screens/FoodScannerScreen'
import RecipeScreen from '../screens/RecipeScreen'
import ChallengesScreen from '../screens/ChallengesScreen'
import AchievementsScreen from '../screens/AchievementsScreen'
import SleepTrackerScreen from '../screens/SleepTrackerScreen'
import YogaScreen from '../screens/YogaScreen'
import CityLeaderboardScreen from '../screens/CityLeaderboardScreen'
import SubscriptionScreen from '../screens/SubscriptionScreen'
import GymDiscoveryScreen from '../screens/GymDiscoveryScreen'
import TrainerDashboardScreen from '../screens/TrainerDashboardScreen'
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen'

// Try to load BlurView — verify native module is available (not just JS)
let BlurView = null
try {
  if (Platform.OS !== 'web') {
    const { UIManager } = require('react-native')
    const nativeAvailable = UIManager.getViewManagerConfig?.('ExpoBlurView') ||
      UIManager.getViewManagerConfig?.('BlurView')
    if (nativeAvailable) {
      const blur = require('expo-blur')
      BlurView = blur.BlurView
    }
  }
} catch {}

const Tab = createBottomTabNavigator()
const HomeStackNav = createNativeStackNavigator()
const HealthStackNav = createNativeStackNavigator()
const CommunityStackNav = createNativeStackNavigator()
const ProfileStackNav = createNativeStackNavigator()

function HomeStackNavigator() {
  const { colors } = useTheme()
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <HomeStackNav.Screen name="History" component={HistoryScreen} />
      <HomeStackNav.Screen name="NutritionLog" component={NutritionLogScreen} />
      <HomeStackNav.Screen name="FastingLog" component={FastingLogScreen} />
      <HomeStackNav.Screen name="Progress" component={ProgressScreen} />
      <HomeStackNav.Screen name="NutritionDetail" component={NutritionDetailScreen} />
      <HomeStackNav.Screen name="MembershipActivation" component={MembershipActivationScreen} />
      <HomeStackNav.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
      <HomeStackNav.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <HomeStackNav.Screen name="MembershipRenewal" component={MembershipRenewalScreen} />
      <HomeStackNav.Screen name="RevenueDashboard" component={RevenueDashboardScreen} />
      <HomeStackNav.Screen name="Referral" component={ReferralScreen} />
      <HomeStackNav.Screen name="ProgressPhotos" component={ProgressPhotosScreen} />
      <HomeStackNav.Screen name="FitnessScore" component={FitnessScoreScreen} />
      <HomeStackNav.Screen name="ActivityDashboard" component={ActivityDashboardScreen} />
      <HomeStackNav.Screen name="FoodScanner" component={FoodScannerScreen} />
      <HomeStackNav.Screen name="Recipes" component={RecipeScreen} />
      <HomeStackNav.Screen name="Challenges" component={ChallengesScreen} />
      <HomeStackNav.Screen name="Achievements" component={AchievementsScreen} />
      <HomeStackNav.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <HomeStackNav.Screen name="Yoga" component={YogaScreen} />
      <HomeStackNav.Screen name="CityLeaderboard" component={CityLeaderboardScreen} />
      <HomeStackNav.Screen name="Subscription" component={SubscriptionScreen} />
      <HomeStackNav.Screen name="GymDiscovery" component={GymDiscoveryScreen} />
      <HomeStackNav.Screen name="TrainerDashboard" component={TrainerDashboardScreen} />
      <HomeStackNav.Screen name="PodHome" component={PodHomeScreen} />
      <HomeStackNav.Screen name="DailyCommit" component={DailyCommitScreen} />
      <HomeStackNav.Screen name="PodFeed" component={PodFeedScreen} />
      <HomeStackNav.Screen name="PodDiscovery" component={PodDiscoveryScreen} />
      <HomeStackNav.Screen name="PodStats" component={PodStatsScreen} />
    </HomeStackNav.Navigator>
  )
}

function HealthStackNavigator() {
  const { colors } = useTheme()
  return (
    <HealthStackNav.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <HealthStackNav.Screen name="HealthMain" component={HealthScreen} />
      <HealthStackNav.Screen name="Nutrition" component={NutritionScreen} />
      <HealthStackNav.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <HealthStackNav.Screen name="ActionPlan" component={ActionPlanScreen} />
      <HealthStackNav.Screen name="NutritionLog" component={NutritionLogScreen} />
      <HealthStackNav.Screen name="NutritionDetail" component={NutritionDetailScreen} />
      <HealthStackNav.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
      <HealthStackNav.Screen name="FoodScanner" component={FoodScannerScreen} />
      <HealthStackNav.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <HealthStackNav.Screen name="ActivityDashboard" component={ActivityDashboardScreen} />
      <HealthStackNav.Screen name="FitnessScore" component={FitnessScoreScreen} />
    </HealthStackNav.Navigator>
  )
}

function PodsStackNavigator() {
  const { colors } = useTheme()
  return (
    <CommunityStackNav.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <CommunityStackNav.Screen name="PodsMain" component={PodHomeScreen} />
      <CommunityStackNav.Screen name="DailyCommit" component={DailyCommitScreen} />
      <CommunityStackNav.Screen name="PodFeed" component={PodFeedScreen} />
      <CommunityStackNav.Screen name="PodDiscovery" component={PodDiscoveryScreen} />
      <CommunityStackNav.Screen name="PodStats" component={PodStatsScreen} />
      <CommunityStackNav.Screen name="CommunityHub" component={CommunityHubScreen} />
      <CommunityStackNav.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <CommunityStackNav.Screen name="GymDiscovery" component={GymDiscoveryScreen} />
    </CommunityStackNav.Navigator>
  )
}

function ProfileStackNavigator() {
  const { colors } = useTheme()
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen name="Invoices" component={InvoicesScreen} />
      <ProfileStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <ProfileStackNav.Screen name="MembershipRenewal" component={MembershipRenewalScreen} />
      <ProfileStackNav.Screen name="Progress" component={ProgressScreen} />
      <ProfileStackNav.Screen name="ProgressPhotos" component={ProgressPhotosScreen} />
      <ProfileStackNav.Screen name="Referral" component={ReferralScreen} />
      <ProfileStackNav.Screen name="RevenueDashboard" component={RevenueDashboardScreen} />
      <ProfileStackNav.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
      <ProfileStackNav.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <ProfileStackNav.Screen name="FoodScanner" component={FoodScannerScreen} />
      <ProfileStackNav.Screen name="Challenges" component={ChallengesScreen} />
      <ProfileStackNav.Screen name="Achievements" component={AchievementsScreen} />
      <ProfileStackNav.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <ProfileStackNav.Screen name="FastingLog" component={FastingLogScreen} />
      <ProfileStackNav.Screen name="NutritionLog" component={NutritionLogScreen} />
      <ProfileStackNav.Screen name="NutritionDetail" component={NutritionDetailScreen} />
    </ProfileStackNav.Navigator>
  )
}

function TabIcon({ name, focused }) {
  const { colors, isDark } = useTheme()
  // Inactive: deep charcoal for contrast; Active: COCA Blue to match FAB
  const inactiveColor = isDark ? 'rgba(255,255,255,0.45)' : '#1A1A1A'
  const activeColor = COLORS.accent
  return (
    <View style={styles.iconWrap}>
      <Feather
        name={name}
        size={22}
        color={focused ? activeColor : inactiveColor}
      />
      {focused && <View style={[styles.activeDot, { backgroundColor: activeColor }]} />}
    </View>
  )
}

// ── Center Action FAB — rendered as screen-level overlay ─────────────
function CenterActionFAB({ onPress, bottom }) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }).start()
  }

  return (
    <View style={[styles.fabScreenWrap, { bottom }]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.fabTouchable}
      >
        {/* Outer glow ring */}
        <Animated.View style={[styles.fabGlow, { opacity: glowAnim }]} />
        {/* Main button */}
        <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
          <Feather name="maximize" size={22} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  )
}

// Floating AI Coach Button
function AICoachButton() {
  const { colors } = useTheme()
  const { token } = useAuth()
  const [chatVisible, setChatVisible] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  if (!token) return null

  return (
    <>
      <Animated.View
        style={[
          styles.aiCoachWrapper,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.aiCoachBtn, { backgroundColor: colors.accent }]}
          onPress={() => setChatVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="zap" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      <AIChatModal visible={chatVisible} onClose={() => setChatVisible(false)} />
    </>
  )
}

// ── Floating blurred tab bar — NO center Action tab ──────────────────
function FloatingTabBar({ state, descriptors, navigation }) {
  const icons = { Home: 'home', Health: 'heart', Pods: 'shield', Profile: 'user' }
  const { isDark, colors } = useTheme()

  const handleTabPress = (route, isFocused, index) => {
    if (isFocused) {
      // Tap on active tab → pop nested stack to root screen
      const nestedState = state.routes[index]?.state
      if (nestedState && nestedState.index > 0) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: nestedState.key,
        })
      }
    } else {
      navigation.navigate(route.name)
    }
  }

  const content = (
    <View style={styles.floatingInner}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index
        const iconName = icons[route.name]
        if (!iconName) return null

        // Insert spacer in the middle for the FAB gap — split tabs evenly
        const isMiddle = index === Math.ceil(state.routes.length / 2)

        return (
          <React.Fragment key={route.key}>
            {isMiddle && <View style={styles.fabSpacer} />}
            <TouchableOpacity
              onPress={() => handleTabPress(route, isFocused, index)}
              style={styles.floatingTab}
              activeOpacity={0.7}
            >
              <TabIcon name={iconName} focused={isFocused} />
            </TouchableOpacity>
          </React.Fragment>
        )
      })}
    </View>
  )

  if (BlurView && Platform.OS !== 'web') {
    try {
      return (
        <BlurView intensity={isDark ? 60 : 80} tint={isDark ? 'dark' : 'light'} style={[styles.floatingBar, !isDark && styles.floatingBarLight]}>
          {content}
        </BlurView>
      )
    } catch {
      // BlurView native module not available — fall through to fallback
    }
  }

  // Fallback without blur
  return (
    <View style={[styles.floatingBar, isDark ? styles.floatingBarFallback : styles.floatingBarLightFallback]}>
      {content}
    </View>
  )
}

// ── Tab bar wrapper — only renders the floating bar ──────────────────
function FloatingTabBarWrapper({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets()
  const bottomOffset = Math.max(insets.bottom, 8) + 12

  return (
    <View style={[styles.floatingWrapper, { bottom: bottomOffset }]}>
      <FloatingTabBar state={state} descriptors={descriptors} navigation={navigation} />
    </View>
  )
}

// Web fallback with manual tab switching
function WebTabNavigator() {
  const { gymId, hasGym } = useAuth()
  const { colors } = useTheme()
  const [activeTab, setActiveTab] = useState('Home')
  const [webStack, setWebStack] = useState(null)
  const screens = { Home: HomeScreen, Health: HealthScreen, Pods: PodHomeScreen, Profile: ProfileScreen }
  const stackScreens = { BarcodeScanner: BarcodeScannerScreen, Nutrition: NutritionScreen, History: HistoryScreen, ServiceDetail: ServiceDetailScreen, Invoices: InvoicesScreen, NutritionLog: NutritionLogScreen, FastingLog: FastingLogScreen, Progress: ProgressScreen, NutritionDetail: NutritionDetailScreen, ActionPlan: ActionPlanScreen, MembershipActivation: MembershipActivationScreen, NotificationSettings: NotificationSettingsScreen, ActivityDashboard: ActivityDashboardScreen, WorkoutTracker: WorkoutTrackerScreen, WorkoutHistory: WorkoutHistoryScreen, MembershipRenewal: MembershipRenewalScreen, RevenueDashboard: RevenueDashboardScreen, Referral: ReferralScreen, ProgressPhotos: ProgressPhotosScreen, FitnessScore: FitnessScoreScreen, FoodScanner: FoodScannerScreen, Recipes: RecipeScreen, Challenges: ChallengesScreen, Achievements: AchievementsScreen, SleepTracker: SleepTrackerScreen, DailyCommit: DailyCommitScreen, PodFeed: PodFeedScreen, PodDiscovery: PodDiscoveryScreen, PodStats: PodStatsScreen, CommunityHub: CommunityHubScreen }
  const icons = { Home: 'home', Health: 'heart', Pods: 'shield', Profile: 'user' }
  const tabOrder = gymId ? ['Home', 'Health', 'Pods', 'Profile'] : ['Home', 'Health', 'Profile']

  const ActiveScreen = webStack && stackScreens[webStack] ? stackScreens[webStack] : screens[activeTab]
  const navigation = {
    navigate: (screen, params) => {
      if (stackScreens[screen]) {
        setWebStack(screen)
      } else if (screens[screen]) {
        setActiveTab(screen)
        setWebStack(null)
      }
    },
    goBack: () => setWebStack(null),
  }

  const handleActionPress = () => {
    if (hasGym) {
      setActiveTab('Home')
      setWebStack(null)
    } else {
      setWebStack('MembershipActivation')
    }
  }

  // Place FAB in the center of the tab row
  const fabIndex = Math.floor(tabOrder.length / 2)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <ActiveScreen navigation={navigation} />
      </View>
      <View style={styles.webTabBar}>
        {tabOrder.map((tab, index) => (
          <React.Fragment key={tab}>
            {index === fabIndex && (
              <View style={styles.webFabSlot}>
                <TouchableOpacity
                  onPress={handleActionPress}
                  activeOpacity={0.8}
                  style={styles.webFab}
                >
                  <Feather name="maximize" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { setActiveTab(tab); setWebStack(null) }}
              style={styles.webTab}
            >
              <Feather
                name={icons[tab]}
                size={22}
                color={activeTab === tab && !webStack ? COLORS.text : COLORS.textTer}
              />
              {activeTab === tab && !webStack && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>
      <AICoachButton />
    </View>
  )
}

function NativeTabNavigator() {
  const { gymId, hasGym } = useAuth()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const navigationRef = useRef(null)

  // Tab bar: height 70, docked at bottom with safe area offset
  // FAB: height 60, seated inside the bar with bottom: 10
  const tabBarBottom = Math.max(insets.bottom, 8) + 10
  const fabBottom = tabBarBottom + 10 // FAB docked at bottom: 10 above bar base

  const handleActionPress = () => {
    const nav = navigationRef.current
    if (!nav) return
    if (hasGym) {
      nav.navigate('Home', {
        screen: 'HomeMain',
        params: { openNFC: true },
      })
    } else {
      nav.navigate('Home', {
        screen: 'MembershipActivation',
      })
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => {
          // Capture the navigation ref from tab bar props
          if (!navigationRef.current) navigationRef.current = props.navigation
          return <FloatingTabBarWrapper {...props} />
        }}
        sceneContainerStyle={{ backgroundColor: colors.bg }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen name="Home" component={HomeStackNavigator} />
        <Tab.Screen name="Health" component={HealthStackNavigator} />
        <Tab.Screen name="Pods" component={PodsStackNavigator} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      </Tab.Navigator>

      {/* Center FAB — independent overlay, pixel-perfect centered */}
      <CenterActionFAB onPress={handleActionPress} bottom={fabBottom} />

      <AICoachButton />
    </View>
  )
}

export default function TabNavigator() {
  if (Platform.OS === 'web') {
    return <WebTabNavigator />
  }
  return <NativeTabNavigator />
}

const styles = StyleSheet.create({
  // ── Floating tab bar ──────────────────────────────────────────────
  floatingWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  floatingBar: {
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    // Pill shadow for floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingBarFallback: {
    backgroundColor: 'rgba(18,18,18,0.95)',
  },
  floatingBarLight: {
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  floatingBarLightFallback: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
  },
  floatingTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  // Spacer in the middle of tabs where FAB sits — same flex as tabs for equal spacing
  fabSpacer: {
    flex: 1,
  },

  // ── Tab icon ──────────────────────────────────────────────────────
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
  },
  iconWrapActive: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  iconWrapActiveLight: {},
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },

  // ── Center Action FAB — screen-level overlay ───────────────────────
  fabScreenWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTouchable: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.accent,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    // Android elevation
    elevation: 8,
    // Premium ring border
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // ── Web tab bar ───────────────────────────────────────────────────
  webTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSec,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  webTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
  webFabSlot: {
    marginTop: -28,
  },
  webFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // ── AI Coach FAB ──────────────────────────────────────────────────
  aiCoachWrapper: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    zIndex: 200,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 14,
  },
  aiCoachBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
