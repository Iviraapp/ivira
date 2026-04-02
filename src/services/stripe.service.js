import config from '../config/index.js';
import db from '../config/database.js';

let Stripe = null;
try { Stripe = (await import('stripe')).default; } catch {}

function getStripe() {
  if (!config.stripe?.enabled || !Stripe) throw new Error('Stripe not configured');
  return new Stripe(config.stripe.secretKey);
}

export async function createPaymentIntent(gymId, memberId, amountCents, currency = 'usd') {
  const stripe = getStripe();
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new Error('Member not found');

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata: { gym_id: gymId, member_id: memberId },
  });
  return intent;
}

export async function createCustomer(member) {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: member.email,
    name: member.name,
    phone: member.phone,
    metadata: { member_id: member.id, gym_id: member.gym_id },
  });
  return customer;
}

export async function handleWebhook(payload, signature) {
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      // Record payment in DB
      await db('payments').insert({
        gym_id: pi.metadata.gym_id,
        member_id: pi.metadata.member_id,
        amount_paise: pi.amount, // cents for Stripe, paise for Razorpay
        currency: pi.currency,
        status: 'paid',
        gateway: 'stripe',
        gateway_payment_id: pi.id,
        paid_at: new Date(),
      }).catch(() => {});
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await db('payments').insert({
        gym_id: pi.metadata.gym_id,
        member_id: pi.metadata.member_id,
        amount_paise: pi.amount,
        currency: pi.currency,
        status: 'failed',
        gateway: 'stripe',
        gateway_payment_id: pi.id,
      }).catch(() => {});
      break;
    }
  }
  return { received: true };
}
