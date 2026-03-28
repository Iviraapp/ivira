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

// TODO: Uncomment once expo-localization is installed
// import * as Localization from 'expo-localization'

// TODO: Uncomment once react-native-razorpay is installed
// import RazorpayCheckout from 'react-native-razorpay'

// TODO: Uncomment once @stripe/stripe-react-native is installed
// import { useStripe } from '@stripe/stripe-react-native'

import { Platform } from 'react-native'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RAZORPAY_KEY = '__RAZORPAY_KEY_ID__' // TODO: Replace with env/config value

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

  // TODO: Uncomment once expo-localization is installed:
  // if (!locale) {
  //   // Localization.locale gives e.g. "en-IN", "hi-IN", "en-US"
  //   locale = Localization.locale || ''
  // }
  // if (!currency) {
  //   // Localization.currency gives e.g. "INR", "USD"
  //   currency = Localization.currency || ''
  // }

  // Fallback: without expo-localization, default to razorpay for Indian market
  if (!locale && !currency) {
    // When locale detection is unavailable, default to razorpay since
    // IVIRA primarily targets Indian gyms.
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
  // TODO: Uncomment once react-native-razorpay is installed
  //
  // try {
  //   const options = {
  //     description,
  //     image: 'https://ivira.app/icon.png', // TODO: Replace with actual logo URL
  //     currency: currency || 'INR',
  //     key: RAZORPAY_KEY,
  //     amount: amount, // Amount in paise
  //     name: 'IVIRA',
  //     order_id: razorpayOrderId, // Razorpay order_id from backend
  //     prefill: {
  //       email: customerEmail,
  //       contact: customerPhone,
  //       name: customerName,
  //     },
  //     theme: { color: '#10B981' },
  //   }
  //
  //   const result = await RazorpayCheckout.open(options)
  //
  //   // result contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
  //   return {
  //     success: true,
  //     transactionId: result.razorpay_payment_id,
  //     provider: 'razorpay',
  //     raw: result,
  //   }
  // } catch (error) {
  //   // User cancelled or payment failed
  //   const errorDescription = error?.description || error?.message || 'Payment cancelled'
  //   return {
  //     success: false,
  //     transactionId: '',
  //     provider: 'razorpay',
  //     error: errorDescription,
  //     code: error?.code,
  //   }
  // }

  // Placeholder until react-native-razorpay is installed
  console.warn(
    '[paymentRouter] react-native-razorpay is not installed. ' +
    'Run: npx expo install react-native-razorpay'
  )
  return {
    success: false,
    transactionId: '',
    provider: 'razorpay',
    error: 'Razorpay SDK not installed. See paymentRouter.js for setup instructions.',
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
  // TODO: Uncomment once @stripe/stripe-react-native is installed
  //
  // The Stripe React Native SDK requires a <StripeProvider> wrapper at the
  // app root with your publishable key. See:
  // https://stripe.dev/stripe-react-native/api-reference/modules/StripeProvider
  //
  // To use the Payment Sheet (recommended):
  //
  // try {
  //   // This function should be called from a component that has access
  //   // to the useStripe() hook. For a non-hook approach, use the
  //   // confirmPayment function from @stripe/stripe-react-native.
  //
  //   const { initPaymentSheet, presentPaymentSheet } = useStripe()
  //
  //   const { error: initError } = await initPaymentSheet({
  //     paymentIntentClientSecret: stripeClientSecret,
  //     merchantDisplayName: 'IVIRA',
  //     defaultBillingDetails: {
  //       name: customerName,
  //       email: customerEmail,
  //     },
  //     style: 'automatic', // Adapts to light/dark mode
  //   })
  //
  //   if (initError) {
  //     return {
  //       success: false,
  //       transactionId: '',
  //       provider: 'stripe',
  //       error: initError.message,
  //     }
  //   }
  //
  //   const { error: presentError } = await presentPaymentSheet()
  //
  //   if (presentError) {
  //     return {
  //       success: false,
  //       transactionId: '',
  //       provider: 'stripe',
  //       error: presentError.message,
  //     }
  //   }
  //
  //   // Payment succeeded — the transactionId is the PaymentIntent ID
  //   // (extract from client secret: "pi_xxx_secret_yyy" -> "pi_xxx")
  //   const paymentIntentId = stripeClientSecret?.split('_secret_')[0] || orderId
  //
  //   return {
  //     success: true,
  //     transactionId: paymentIntentId,
  //     provider: 'stripe',
  //   }
  // } catch (error) {
  //   return {
  //     success: false,
  //     transactionId: '',
  //     provider: 'stripe',
  //     error: error?.message || 'Stripe payment failed',
  //   }
  // }

  // Placeholder until @stripe/stripe-react-native is installed
  console.warn(
    '[paymentRouter] @stripe/stripe-react-native is not installed. ' +
    'Run: npx expo install @stripe/stripe-react-native'
  )
  return {
    success: false,
    transactionId: '',
    provider: 'stripe',
    error: 'Stripe SDK not installed. See paymentRouter.js for setup instructions.',
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
