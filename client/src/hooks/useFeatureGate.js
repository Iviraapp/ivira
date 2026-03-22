import { useAuth } from '../context/AuthContext'

const PACKAGE_FEATURES = {
  standard: ['dashboard', 'members', 'checkins', 'payments', 'classes', 'settings', 'store'],
  pro: ['dashboard', 'members', 'checkins', 'payments', 'classes', 'settings', 'store', 'newsletter', 'affiliate', 'analytics', 'trainers', 'staff', 'staff-checkin', 'staff-performance'],
  enterprise: ['dashboard', 'members', 'checkins', 'payments', 'classes', 'settings', 'store', 'newsletter', 'affiliate', 'analytics', 'trainers', 'staff', 'staff-checkin', 'staff-performance', 'whatsapp-marketing', 'api-access', 'white-label', 'priority-support'],
}

export function useFeatureGate(featureSlug) {
  const { gym } = useAuth()

  const packageType = gym?.package_type || 'standard'
  const activeFeatures = gym?.active_features || []
  const packageFeatures = PACKAGE_FEATURES[packageType] || PACKAGE_FEATURES.standard

  // Feature is allowed if it's in package OR in manual overrides
  const allowed = packageFeatures.includes(featureSlug) || activeFeatures.includes(featureSlug)
  const isOverride = activeFeatures.includes(featureSlug) && !packageFeatures.includes(featureSlug)

  return { allowed, packageType, isOverride }
}

export function useAllFeatures() {
  const { gym } = useAuth()

  const packageType = gym?.package_type || 'standard'
  const activeFeatures = gym?.active_features || []
  const packageFeatures = PACKAGE_FEATURES[packageType] || PACKAGE_FEATURES.standard

  // Build a map of all known features with their access status
  const allSlugs = new Set([
    ...PACKAGE_FEATURES.standard,
    ...PACKAGE_FEATURES.pro,
    ...PACKAGE_FEATURES.enterprise,
    ...activeFeatures,
  ])

  const featureMap = {}
  for (const slug of allSlugs) {
    const inPackage = packageFeatures.includes(slug)
    const inOverride = activeFeatures.includes(slug)
    featureMap[slug] = {
      allowed: inPackage || inOverride,
      isOverride: inOverride && !inPackage,
      inPackage,
    }
  }

  return { featureMap, packageType, packageFeatures }
}
