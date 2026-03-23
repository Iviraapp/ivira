import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import Haptics from '../lib/haptics'
import CommunityScreen from './CommunityScreen'
import MarketplaceScreen from './MarketplaceScreen'
import StoreScreen from './StoreScreen'

const TABS = [
  { key: 'community', label: 'Community', icon: 'users' },
  { key: 'marketplace', label: 'Services', icon: 'briefcase' },
  { key: 'store', label: 'Store', icon: 'shopping-bag' },
]

export default function CommunityHubScreen({ navigation, route }) {
  const { colors, isDark } = useTheme()
  const initialTab = route?.params?.tab || 'community'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Update active tab when route params change (e.g. navigating from HomeScreen shortcuts)
  React.useEffect(() => {
    if (route?.params?.tab && route.params.tab !== activeTab) {
      setActiveTab(route.params.tab)
    }
  }, [route?.params?.tab])

  const handleTabPress = (key) => {
    if (key !== activeTab) {
      setActiveTab(key)
      Haptics.selectionAsync()
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { backgroundColor: isDark ? '#0B0F19' : colors.bgSec, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {activeTab === 'community' ? 'Community' : activeTab === 'marketplace' ? 'Services' : 'Store'}
        </Text>

        {/* 3-tab segment control */}
        <View style={[styles.segmentRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bgTer }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                <Feather
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.textTer}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.segmentText, { color: colors.textTer }, isActive && { color: '#FFFFFF' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Active View */}
      <View style={styles.content}>
        {activeTab === 'community' && <CommunityScreen navigation={navigation} embedded />}
        {activeTab === 'marketplace' && <MarketplaceScreen navigation={navigation} embedded />}
        {activeTab === 'store' && <StoreScreen navigation={navigation} embedded />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    paddingTop: 56,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: FONT.extraBold,
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.lg - 3,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.accent,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
})
