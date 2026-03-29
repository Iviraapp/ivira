/**
 * Geo-routed payment helper for IVIRA mobile app.
 *
 * Routes payments to Razorpay (India/INR) or Stripe (everywhere else)
 * based on the user's device locale and currency settings.
 *
 * ---------------------------------------------------------------
 * REQUIRED PACKAGES (install before using):
 *
 *   npx expo install expo-localization
 *   npx expo install react-native-razorpay
 *   npx expo install @stripe/stripe-react-native
 *
 * After installing, rebuild the dev client:
 *   npx expo prebuild --clean && npx expo run:ios
 * ---------------------------------------------------------------
 */

import { Platform, NativeModules } from 'react-native'

let RazorpayCheckout = null
try {
  RazorpayCheckout = require('react-native-razorpay').default
} catch (e) {
  // react-native-razorpay not installed — will be handled at checkout time
}

let Localization = null
try {
  Localization = require('expo-localization')
} catch (e) {
  // expo-localization not installed — will fall back to Platform-based detection
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RAZORPAY_KEY = 'rzp_test_SQEnFlLv3DjRSH'

const INDIA_LOCALES = ['en-IN', 'hi', 'hi-IN', 'ta', 'ta-IN', 'te', 'te-IN', 'kn', 'kn-IN', 'ml', 'ml-IN', 'mr', 'mr-IN', 'gu', 'gu-IN', 'bn', 'bn-IN', 'pa', 'pa-IN']

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

/**
 * Determines the payment provider based on the user's locale and currency.
 *
 * Logic:
 *  1. If device locale starts with any Indian locale prefix -> razorpay
 *  2. If device currency is INR -> razorpay
 *  3. Otherwise -> stripe
 *
 * @param {object} [overrides] - Optional overrides for testing
 * @param {string} [overrides.locale] - Force a specific locale
 * @param {string} [overrides.currency] - Force a specific currency code
 * @returns {'razorpay' | 'stripe'}
 */
export function getPaymentProvider(overrides = {}) {
  let locale = overrides.locale || ''
  let currency = overrides.currency || ''

  // Try expo-localization first
  if (Localization) {
    if (!locale) {
      locale = Localization.locale || ''
    }
    if (!currency) {
      currency = Localization.currency || ''
    }
  }

  // Platform-based fallback when expo-localization is unavailable
  if (!locale && !currency) {
    try {
      if (Platform.OS === 'ios') {
        const settings = NativeModules.SettingsManager?.settings
        locale = settings?.AppleLocale || settings?.AppleLanguages?.[0] || ''
      } else if (Platform.OS === 'android') {
        locale = NativeModules.I18nManager?.localeIdentifier || ''
      }
    } catch (e) {
      // Locale detection failed — fall through to default
    }
  }

  // If we still have nothing, default to razorpay for Indian market
  if (!locale && !currency) {
    return 'razorpay'
  }

  const normalizedLocale = locale.toLowerCase()
  const normalizedCurrency = currency.toUpperCase()

  // Check if locale matches any Indian locale
  const isIndianLocale = INDIA_LOCALES.some((prefix) =>
    normalizedLocale.startsWith(prefix.toLowerCase())
  )

  if (isIndianLocale || normalizedCurrency === 'INR') {
    return 'razorpay'
  }

  return 'stripe'
}

// ---------------------------------------------------------------------------
// Unified checkout
// ---------------------------------------------------------------------------

/**
 * Initializes and completes a payment checkout flow using the appropriate
 * provider (Razorpay for India/INR, Stripe for everything else).
 *
 * @param {object} options
 * @param {'razorpay' | 'stripe'} options.provider - Provider from getPaymentProvider()
 * @param {string} options.orderId - Backend order/payment ID
 * @param {number} options.amount - Amount in smallest currency unit (paise for INR, cents for USD)
 * @param {string} options.currency - ISO 4217 currency code (e.g. 'INR', 'USD')
 * @param {string} options.customerName - Customer's full name
 * @param {string} options.customerEmail - Customer's email address
 * @param {string} options.customerPhone - Customer's phone number
 * @param {string} [options.description] - Payment description shown in checkout
 * @param {string} [options.razorpayOrderId] - Razorpay order_id from backend
 * @param {string} [options.stripeClientSecret] - Stripe PaymentIntent client_secret from backend
 *
 * @returns {Promise<{ success: boolean, transactionId: string, provider: string, error?: string }>}
 */
export async function initializeCheckout({
  provider,
  orderId,
  amount,
  currency,
  customerName,
  customerEmail,
  customerPhone,
  description = 'IVIRA Payment',
  razorpayOrderId,
  stripeClientSecret,
}) {
  if (provider === 'razorpay') {
    return _checkoutWithRazorpay({
      orderId,
      amount,
      currency,
      customerName,
      customerEmail,
      customerPhone,
      description,
      razorpayOrderId,
    })
  }

  if (provider === 'stripe') {
    return _checkoutWithStripe({
      orderId,
      amount,
      currency,
      customerName,
      customerEmail,
      stripeClientSecret,
    })
  }

  return {
    success: false,
    transactionId: '',
    provider: provider || 'unknown',
    error: `Unsupported payment provider: ${provider}`,
  }
}

// ---------------------------------------------------------------------------
// Razorpay checkout
// ---------------------------------------------------------------------------

async function _checkoutWithRazorpay({
  orderId,
  amount,
  currency,
  customerName,
  customerEmail,
  customerPhone,
  description,
  razorpayOrderId,
}) {
  if (!RazorpayCheckout) {
    console.warn(
      '[paymentRouter] react-native-razorpay is not installed. ' +
      'Run: npx expo install react-native-razorpay'
    )
    return {
      success: false,
      transactionId: '',
      provider: 'razorpay',
      error: 'Razorpay SDK not installed. Run: npx expo install react-native-razorpay',
    }
  }

  try {
    const options = {
      description,
      image: 'https://ivira.app/icon.png',
      currency: currency || 'INR',
      key: RAZORPAY_KEY,
      amount: amount, // Amount in paise
      name: 'IVIRA',
      order_id: razorpayOrderId,
      prefill: {
        email: customerEmail,
        contact: customerPhone,
        name: customerName,
      },
      theme: { color: '#3B82F6' },
    }

    const result = await RazorpayCheckout.open(options)

    // result contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
    return {
      success: true,
      transactionId: result.razorpay_payment_id,
      provider: 'razorpay',
      raw: result,
    }
  } catch (error) {
    // User cancelled or payment failed
    const errorDescription = error?.description || error?.message || 'Payment cancelled'
    return {
      success: false,
      transactionId: '',
      provider: 'razorpay',
      error: errorDescription,
      code: error?.code,
    }
  }
}

// ---------------------------------------------------------------------------
// Stripe checkout
// ---------------------------------------------------------------------------

async function _checkoutWithStripe({
  orderId,
  amount,
  currency,
  customerName,
  customerEmail,
  stripeClientSecret,
}) {
  // Stripe is not yet configured — Razorpay is the primary payment provider.
  // When Stripe support is needed:
  //   1. npx expo install @stripe/stripe-react-native
  //   2. Wrap app root in <StripeProvider publishableKey="...">
  //   3. Implement Payment Sheet flow here
  return {
    success: false,
    transactionId: '',
    provider: 'stripe',
    error: 'Stripe payments are not yet configured. Please use UPI or card via Razorpay.',
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for the detected provider.
 * Useful for UI display (e.g., "Pay with Razorpay" vs "Pay with Card").
 *
 * @param {'razorpay' | 'stripe'} provider
 * @returns {string}
 */
export function getProviderLabel(provider) {
  switch (provider) {
    case 'razorpay':
      return 'Pay with UPI / Card'
    case 'stripe':
      return 'Pay with Card'
    default:
      return 'Pay'
  }
}

/**
 * Returns the currency code appropriate for the given provider.
 *
 * @param {'razorpay' | 'stripe'} provider
 * @returns {string} ISO 4217 currency code
 */
export function getDefaultCurrency(provider) {
  return provider === 'razorpay' ? 'INR' : 'USD'
}
