// AdBanner — Google AdMob integration with self-promo fallback
import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SPACING, RADIUS } from '../lib/theme'

// ── AdMob SDK (safe load) ──────────────────────────────────────
let BannerAd = null
let BannerAdSize = null
let InterstitialAd = null
let RewardedAd = null
let AdEventType = null
let RewardedAdEventType = null
let TestIds = null
let admobLoaded = false

try {
  const admob = require('react-native-google-mobile-ads')
  BannerAd = admob.BannerAd
  BannerAdSize = admob.BannerAdSize
  InterstitialAd = admob.InterstitialAd
  RewardedAd = admob.RewardedAd
  AdEventType = admob.AdEventType
  RewardedAdEventType = admob.RewardedAdEventType
  TestIds = admob.TestIds
  admobLoaded = true
} catch (e) {
  console.warn('[AdMob] SDK not available:', e.message)
}

// ── Ad Unit IDs ────────────────────────────────────────────────
// App ID: ca-app-pub-1836914755619181~7453478671
// Create ad units at: https://admob.google.com/v2/apps/7453478671/adunits
// Then replace the IDs below. Test ads are used in __DEV__ mode.
const AD_UNIT_IDS = {
  // Banner: "test ivira android 1"
  banner_ios:        'ca-app-pub-1836914755619181/1465687221',
  banner_android:    'ca-app-pub-1836914755619181/1465687221',
  // Native Advanced: "Ivira android 2" (used as interstitial fallback)
  interstitial_ios:  'ca-app-pub-1836914755619181/7516090254',
  interstitial_android: 'ca-app-pub-1836914755619181/7516090254',
  // Native: "Ivira android 2"
  native_android:    'ca-app-pub-1836914755619181/7839523887',
  rewarded_ios:      null,
  rewarded_android:  null,
}

const AD_UNITS = {
  banner: Platform.select({
    ios: __DEV__ ? TestIds?.BANNER : (AD_UNIT_IDS.banner_ios || TestIds?.BANNER),
    android: __DEV__ ? TestIds?.BANNER : (AD_UNIT_IDS.banner_android || TestIds?.BANNER),
  }),
  interstitial: Platform.select({
    ios: __DEV__ ? TestIds?.INTERSTITIAL : (AD_UNIT_IDS.interstitial_ios || TestIds?.INTERSTITIAL),
    android: __DEV__ ? TestIds?.INTERSTITIAL : (AD_UNIT_IDS.interstitial_android || TestIds?.INTERSTITIAL),
  }),
  rewarded: Platform.select({
    ios: __DEV__ ? TestIds?.REWARDED : (AD_UNIT_IDS.rewarded_ios || TestIds?.REWARDED),
    android: __DEV__ ? TestIds?.REWARDED : (AD_UNIT_IDS.rewarded_android || TestIds?.REWARDED),
  }),
}

// ── Self-promo fallback ────────────────────────────────────────
const PROMOS = [
  {
    headline: 'Track every rep, every meal',
    sub: 'Upgrade your fitness game with IVIRA Pro',
    cta: 'Learn More',
    bg: '#3B82F6',
    icon: 'activity',
  },
  {
    headline: 'Your gym, your rules',
    sub: 'Manage classes, trainers & payments in one place',
    cta: 'For Gym Owners',
    bg: '#8B5CF6',
    icon: 'briefcase',
  },
  {
    headline: 'Stay hydrated, stay strong',
    sub: 'Set water reminders and track intake daily',
    cta: 'Try Now',
    bg: '#14B8A6',
    icon: 'droplet',
  },
]

function SelfPromoBanner({ style }) {
  const [dismissed, setDismissed] = useState(false)
  const [idx] = useState(() => Math.floor(Math.random() * PROMOS.length))

  if (dismissed) return null

  const ad = PROMOS[idx]
  return (
    <View style={[styles.wrap, { backgroundColor: ad.bg }, style]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Feather name={ad.icon} size={18} color="#fff" />
          </View>
          <View style={styles.text}>
            <Text style={styles.headline} numberOfLines={1}>{ad.headline}</Text>
            <Text style={styles.sub} numberOfLines={1}>{ad.sub}</Text>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{ad.cta}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={12} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  )
}

// ── Main AdBanner component ────────────────────────────────────
export default function AdBanner({ style, size = 'BANNER' }) {
  const [adError, setAdError] = useState(false)

  // If AdMob SDK available & no error, show real ad
  if (admobLoaded && BannerAd && AD_UNITS.banner && !adError) {
    const adSize = BannerAdSize?.[size] || BannerAdSize?.BANNER
    return (
      <View style={[styles.adWrap, style]}>
        <BannerAd
          unitId={AD_UNITS.banner}
          size={adSize}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(error) => {
            console.warn('[AdMob] Banner failed:', error)
            setAdError(true)
          }}
        />
      </View>
    )
  }

  // Fallback: self-promo banner
  return <SelfPromoBanner style={style} />
}

// ── Interstitial Ad ────────────────────────────────────────────
let _interstitial = null
let _interstitialLoaded = false

function ensureInterstitial() {
  if (!admobLoaded || !InterstitialAd || !AD_UNITS.interstitial) return null
  if (_interstitial) return _interstitial

  _interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
    requestNonPersonalizedAdsOnly: true,
  })
  return _interstitial
}

export function preloadInterstitialAd() {
  const ad = ensureInterstitial()
  if (!ad) return

  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    _interstitialLoaded = true
  })
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    _interstitialLoaded = false
    // Preload next one
    ad.load()
  })
  ad.load()

  return () => {
    unsubLoaded()
    unsubClosed()
  }
}

export function showInterstitialAd() {
  const ad = ensureInterstitial()
  if (!ad || !_interstitialLoaded) return false
  ad.show()
  return true
}

// ── Rewarded Ad ────────────────────────────────────────────────
let _rewarded = null
let _rewardedLoaded = false

function ensureRewarded() {
  if (!admobLoaded || !RewardedAd || !AD_UNITS.rewarded) return null
  if (_rewarded) return _rewarded

  _rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
    requestNonPersonalizedAdsOnly: true,
  })
  return _rewarded
}

export function preloadRewardedAd() {
  const ad = ensureRewarded()
  if (!ad) return

  const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    _rewardedLoaded = true
  })
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    _rewardedLoaded = false
    ad.load()
  })
  ad.load()

  return () => {
    unsubLoaded()
    unsubClosed()
  }
}

export function showRewardedAd() {
  return new Promise((resolve, reject) => {
    const ad = ensureRewarded()
    if (!ad || !_rewardedLoaded) {
      return reject(new Error('Rewarded ad not loaded'))
    }

    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        unsubEarned()
        resolve(reward)
      }
    )
    ad.show()
  })
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  adWrap: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  wrap: {
    borderRadius: RADIUS.md,
    marginVertical: SPACING.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingRight: 28,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  text: { flex: 1 },
  headline: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  cta: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  dismiss: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
