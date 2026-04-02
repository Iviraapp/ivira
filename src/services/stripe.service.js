import Stripe from 'stripe'
import db from '../config/database.js'
import config from '../config/index.js'
import { NotFoundError } from '../utils/errors.js'

let stripeClient
function getStripe() {
  if (!stripeClient && config.stripe?.enabled) {
    stripeClient = new Stripe(config.stripe.secretKey, { apiVersion: '2024-06-20' })
  }
  if (!stripeClient) throw new Error('Stripe not configured')
  return stripeClient
}

const CURRENCY_MULTIPLIER = {
  USD: 100, GBP: 100, EUR: 100, AUD: 100,
  AED: 100, CAD: 100, SGD: 100, INR: 100,
}

function toStripeAmount(amountPaise, currency = 'USD') {
  const multiplier = CURRENCY_MULTIPLIER[currency.toUpperCase()] || 100
  return Math.round(amountPaise * multiplier / 100)
}

export async function getOrCreateStripeCustomer(gymId, member) {
  const stripe = getStripe()
  if (member.stripe_customer_id) return member.stripe_customer_id

  const customer = await stripe.customers.create({
    name: member.name, phone: member.phone, email: member.email || undefined,
    metadata: { gym_id: gymId, member_id: member.id, platform: 'ivira' },
  })
  await db('members').where({ id: member.id }).update({ stripe_customer_id: customer.id })
  return customer.id
}

export async function createPaymentIntent(gymId, memberId, amountPaise, currency = 'USD') {
  const stripe = getStripe()
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first()
  if (!member) throw new NotFoundError('Member')

  const customerId = await getOrCreateStripeCustomer(gymId, member)
  const stripeAmount = toStripeAmount(amountPaise, currency)

  return stripe.paymentIntents.create({
    amount: stripeAmount, currency: currency.toLowerCase(), customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { gym_id: gymId, member_id: memberId, platform: 'ivira' },
  })
}

export function verifyStripeWebhook(rawBody, signature) {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret)
}

export async function handleStripePaymentSucceeded(event) {
  const intent = event.data.object
  const { gym_id, member_id } = intent.metadata || {}
  if (!gym_id || !member_id) return

  const [payment] = await db('payments')
    .where({ stripe_payment_intent_id: intent.id })
    .update({
      status: 'captured', stripe_charge_id: intent.latest_charge, stripe_data: intent,
      method: intent.payment_method_types?.[0] || 'card', paid_at: new Date(), updated_at: new Date(),
    })
    .returning('*')

  if (payment) {
    const [member, gym] = await Promise.all([
      db('members').where({ id: payment.member_id }).first(),
      db('gyms').where({ id: payment.gym_id }).first(),
    ])
    if (member && gym) {
      setImmediate(async () => {
        try {
          const { sendPaymentConfirmation } = await import('./whatsapp.service.js')
          const { sendPaymentSMS } = await import('./sms.service.js')
          await Promise.allSettled([
            sendPaymentConfirmation(member, gym, payment.amount_paise, null, gym.country_code),
            sendPaymentSMS(member.phone, member.name, payment.amount_paise, gym.gym_name, gym.country_code),
          ])
        } catch (err) {
          console.warn('[StripeService] post-payment notification failed:', err?.message)
        }
      })
    }
  }
  return payment
}

export async function handleStripePaymentFailed(event) {
  const intent = event.data.object
  await db('payments')
    .where({ stripe_payment_intent_id: intent.id })
    .update({ status: 'failed', stripe_data: intent, updated_at: new Date() })
}

export function formatCurrencyAmount(amountPaise, currency = 'INR') {
  const amount = amountPaise / 100
  const symbols = { INR: '₹', USD: '$', GBP: '£', AED: 'AED ', AUD: 'A$', EUR: '€', CAD: 'C$', SGD: 'S$' }
  return `${symbols[currency.toUpperCase()] || currency + ' '}${amount.toLocaleString()}`
}
