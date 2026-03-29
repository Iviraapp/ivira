/**
 * Trial Guard Plugin
 *
 * Exposes a `verifyTrial` decorator that gym owner routes add to their
 * preHandler chain (after verifyToken + verifyGymOwner).
 *
 * Blocks requests when ALL of the following are true:
 *   1. The caller is a gym owner (role === 'owner')
 *   2. The gym has no active gym_subscription row
 *   3. The trial window (gym.created_at + TRIAL_DAYS) has elapsed
 *
 * Returns 402 Payment Required with an upgrade URL.
 *
 * Fail-open: any DB error is logged as a warning and the request is allowed.
 */
import fp from 'fastify-plugin';
import config from '../config/index.js';

async function trialGuardPlugin(fastify) {
  fastify.decorate('verifyTrial', async (request, reply) => {
    // Feature flag — skip enforcement when disabled (default: OFF)
    if (!config.features.trialGuard) return;

    // Only enforce for gym owners
    const role = request.user?.role;
    if (role !== 'owner') return;

    const gymId = request.user?.gymId;
    if (!gymId) return;

    try {
      // Check for an active subscription
      const sub = await fastify.db('gym_subscriptions')
        .where({ gym_id: gymId, status: 'active' })
        .first();

      if (sub) return; // Active subscription — allow

      // No active subscription — check trial window
      const gym = await fastify.db('gyms')
        .where({ id: gymId })
        .select('created_at')
        .first();

      if (!gym) return; // Can't find gym — fail open

      // Cutoff date grace period — gyms created before the cutoff are grandfathered
      const CUTOFF_DATE = process.env.TRIAL_GUARD_CUTOFF_DATE
        ? new Date(process.env.TRIAL_GUARD_CUTOFF_DATE)
        : null;

      if (CUTOFF_DATE && new Date(gym.created_at) < CUTOFF_DATE) return;

      const trialEndsAt = new Date(gym.created_at);
      trialEndsAt.setDate(trialEndsAt.getDate() + config.app.trialDays);

      if (new Date() <= trialEndsAt) return; // Still within trial — allow

      // Trial expired with no subscription — block
      return reply.code(402).send({
        error: 'TRIAL_EXPIRED',
        message: 'Your free trial has ended. Please subscribe to continue.',
        trial_ended_at: trialEndsAt.toISOString(),
        upgrade_url: '/dashboard/billing',
      });
    } catch (err) {
      // Fail open — a DB error must not lock out the gym owner
      fastify.log.warn({ err, gymId }, 'Trial guard check failed — allowing request');
    }
  });
}

export default fp(trialGuardPlugin, { name: 'trial-guard', dependencies: ['auth'] });
