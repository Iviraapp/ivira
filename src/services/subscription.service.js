import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import db from '../config/database.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const razorpayEnabled = !!(config.razorpay.keyId && config.razorpay.keyId !== 'your-key-id');

let razorpay;
function getRazorpay() {
  if (!razorpay && razorpayEnabled) {
    razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpay;
}

// ─── Plans ───────────────────────────────────────────────────────────

/**
 * List all active subscription plans.
 */
export async function getPlans() {
  const plans = await db('subscription_plans')
    .where({ active: true })
    .orderBy('price_yearly_paise', 'asc');

  return plans.map((p) => ({
    ...p,
    features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
  }));
}

// ─── Current Subscription ────────────────────────────────────────────

/**
 * Get the current (active or past_due) subscription for a gym, joined with plan details.
 */
export async function getCurrentSubscription(gymId) {
  const subscription = await db('gym_subscriptions')
    .where({ 'gym_subscriptions.gym_id': gymId })
    .whereIn('gym_subscriptions.status', ['active', 'past_due'])
    .join('subscription_plans', 'gym_subscriptions.plan_id', 'subscription_plans.id')
    .select(
      'gym_subscriptions.*',
      'subscription_plans.name as plan_name',
      'subscription_plans.slug as plan_slug',
      'subscription_plans.price_yearly_paise',
      'subscription_plans.max_members',
      'subscription_plans.features'
    )
    .orderBy('gym_subscriptions.created_at', 'desc')
    .first();

  if (!subscription) return null;

  return {
    ...subscription,
    features: typeof subscription.features === 'string'
      ? JSON.parse(subscription.features)
      : subscription.features,
  };
}

// ─── Create Subscription ─────────────────────────────────────────────

/**
 * Create a new IVIRA subscription for a gym.
 * Creates a Razorpay subscription (or simulates in dev mode).
 */
export async function createSubscription(gymId, planId) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');

  const plan = await db('subscription_plans').where({ id: planId, active: true }).first();
  if (!plan) throw new NotFoundError('Plan');

  // Check for existing active subscription
  const existing = await db('gym_subscriptions')
    .where({ gym_id: gymId })
    .whereIn('status', ['active', 'past_due'])
    .first();

  if (existing) {
    throw new ValidationError('Gym already has an active subscription. Cancel or change plan instead.');
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const rz = getRazorpay();

  if (rz) {
    // Create a Razorpay subscription
    const rzSubscription = await rz.subscriptions.create({
      plan_id: plan.razorpay_plan_id || undefined,
      total_count: 12, // yearly billing, 12 cycles max
      quantity: 1,
      notes: {
        gym_id: gymId,
        plan_slug: plan.slug,
      },
    });

    const [subscription] = await db('gym_subscriptions')
      .insert({
        gym_id: gymId,
        plan_id: planId,
        status: 'active',
        razorpay_subscription_id: rzSubscription.id,
        current_period_start: now,
        current_period_end: periodEnd,
      })
      .returning('*');

    return { subscription, razorpaySubscription: rzSubscription };
  }

  // Dev mode: simulate subscription creation
  const [subscription] = await db('gym_subscriptions')
    .insert({
      gym_id: gymId,
      plan_id: planId,
      status: 'active',
      razorpay_subscription_id: `dev_sub_${Date.now()}`,
      current_period_start: now,
      current_period_end: periodEnd,
    })
    .returning('*');

  // Activate the gym
  await db('gyms')
    .where({ id: gymId })
    .update({ status: 'active', updated_at: new Date() });

  return { subscription, devMode: true };
}

// ─── Webhook Handlers ────────────────────────────────────────────────

/**
 * Handle subscription.activated webhook from Razorpay.
 * Marks the gym as 'active' and subscription status as 'active'.
 */
export async function handleSubscriptionActivated(gymId, razorpaySubId) {
  const [subscription] = await db('gym_subscriptions')
    .where({ razorpay_subscription_id: razorpaySubId })
    .update({
      status: 'active',
      updated_at: new Date(),
    })
    .returning('*');

  if (subscription) {
    await db('gyms')
      .where({ id: subscription.gym_id })
      .update({ status: 'active', updated_at: new Date() });
  }

  return subscription;
}

/**
 * Handle subscription.charged webhook from Razorpay.
 * Records periodic payment and extends the subscription period.
 */
export async function handleSubscriptionCharged(gymId, razorpaySubId, paymentData) {
  const subscription = await db('gym_subscriptions')
    .where({ razorpay_subscription_id: razorpaySubId })
    .first();

  if (!subscription) return null;

  // Extend period by 1 year from current period end
  const newPeriodStart = subscription.current_period_end || new Date();
  const newPeriodEnd = new Date(newPeriodStart);
  newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);

  const [updated] = await db('gym_subscriptions')
    .where({ id: subscription.id })
    .update({
      status: 'active',
      current_period_start: newPeriodStart,
      current_period_end: newPeriodEnd,
      updated_at: new Date(),
    })
    .returning('*');

  // Ensure gym stays active
  await db('gyms')
    .where({ id: subscription.gym_id })
    .update({ status: 'active', updated_at: new Date() });

  return updated;
}

/**
 * Handle subscription.cancelled webhook from Razorpay.
 * Marks subscription as cancelled. Gym stays active until period ends.
 */
export async function handleSubscriptionCancelled(gymId, razorpaySubId) {
  const [subscription] = await db('gym_subscriptions')
    .where({ razorpay_subscription_id: razorpaySubId })
    .update({
      status: 'cancelled',
      updated_at: new Date(),
    })
    .returning('*');

  return subscription;
}

// ─── Cancel Subscription ─────────────────────────────────────────────

/**
 * Cancel a gym's active subscription via Razorpay API and update DB.
 */
export async function cancelSubscription(gymId) {
  const subscription = await db('gym_subscriptions')
    .where({ gym_id: gymId })
    .whereIn('status', ['active', 'past_due'])
    .first();

  if (!subscription) {
    throw new NotFoundError('Active subscription');
  }

  const rz = getRazorpay();

  if (rz && subscription.razorpay_subscription_id && !subscription.razorpay_subscription_id.startsWith('dev_')) {
    // Cancel on Razorpay (at end of current billing period)
    await rz.subscriptions.cancel(subscription.razorpay_subscription_id, { cancel_at_cycle_end: 1 });
  }

  const [updated] = await db('gym_subscriptions')
    .where({ id: subscription.id })
    .update({
      status: 'cancelled',
      updated_at: new Date(),
    })
    .returning('*');

  return updated;
}

// ─── Change Plan ─────────────────────────────────────────────────────

/**
 * Change the subscription plan for a gym (upgrade/downgrade).
 * Cancels current subscription and creates a new one with the new plan.
 */
export async function changePlan(gymId, newPlanId) {
  const newPlan = await db('subscription_plans').where({ id: newPlanId, active: true }).first();
  if (!newPlan) throw new NotFoundError('Plan');

  const currentSub = await db('gym_subscriptions')
    .where({ gym_id: gymId })
    .whereIn('status', ['active', 'past_due'])
    .first();

  if (!currentSub) {
    throw new NotFoundError('Active subscription');
  }

  if (currentSub.plan_id === newPlanId) {
    throw new ValidationError('Already on this plan');
  }

  const rz = getRazorpay();

  if (rz && currentSub.razorpay_subscription_id && !currentSub.razorpay_subscription_id.startsWith('dev_')) {
    // Cancel old Razorpay subscription immediately
    await rz.subscriptions.cancel(currentSub.razorpay_subscription_id, { cancel_at_cycle_end: 0 });
  }

  // Mark old subscription as cancelled
  await db('gym_subscriptions')
    .where({ id: currentSub.id })
    .update({ status: 'cancelled', updated_at: new Date() });

  // Create new subscription with the new plan
  return createSubscription(gymId, newPlanId);
}

// ─── Trial Expiry Check ──────────────────────────────────────────────

/**
 * Find gyms whose trial period has ended and update their status to 'expired'.
 * Called by the cron scheduler.
 */
export async function checkTrialExpiry() {
  const now = new Date();

  const expiredGyms = await db('gyms')
    .where({ status: 'trial' })
    .where('trial_ends_at', '<', now)
    .select('id', 'gym_name', 'owner_name', 'trial_ends_at');

  if (expiredGyms.length === 0) {
    return { expired: 0, gyms: [] };
  }

  const expiredIds = expiredGyms.map((g) => g.id);

  await db('gyms')
    .whereIn('id', expiredIds)
    .update({ status: 'expired', updated_at: new Date() });

  return {
    expired: expiredGyms.length,
    gyms: expiredGyms.map((g) => ({
      id: g.id,
      gym_name: g.gym_name,
      owner_name: g.owner_name,
      trial_ended_at: g.trial_ends_at,
    })),
  };
}

// ─── Webhook Signature Verification ──────────────────────────────────

export function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
