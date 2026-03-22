import * as subscriptionService from '../services/subscription.service.js';

const createSubscriptionSchema = {
  body: {
    type: 'object',
    required: ['planId'],
    properties: {
      planId: { type: 'string', format: 'uuid' },
    },
  },
};

const changePlanSchema = {
  body: {
    type: 'object',
    required: ['planId'],
    properties: {
      planId: { type: 'string', format: 'uuid' },
    },
  },
};

export default async function subscriptionRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // List available plans (public)
  fastify.get('/subscriptions/plans', async () => {
    return subscriptionService.getPlans();
  });

  // Get current subscription for a gym
  fastify.get('/gyms/:gymId/subscription', authHooks, async (request, reply) => {
    const subscription = await subscriptionService.getCurrentSubscription(request.params.gymId);
    if (!subscription) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'No active subscription' });
    }
    return { subscription };
  });

  // Create new subscription
  fastify.post('/gyms/:gymId/subscription', { schema: createSubscriptionSchema, ...authHooks }, async (request, reply) => {
    const result = await subscriptionService.createSubscription(
      request.params.gymId,
      request.body.planId
    );
    return reply.code(201).send(result);
  });

  // Change plan (upgrade/downgrade)
  fastify.patch('/gyms/:gymId/subscription', { schema: changePlanSchema, ...authHooks }, async (request, reply) => {
    const result = await subscriptionService.changePlan(
      request.params.gymId,
      request.body.planId
    );
    return result;
  });

  // Cancel subscription
  fastify.delete('/gyms/:gymId/subscription', authHooks, async (request) => {
    const subscription = await subscriptionService.cancelSubscription(request.params.gymId);
    return { subscription, message: 'Subscription cancelled' };
  });

  // Razorpay subscription webhook (no auth - verified by signature)
  fastify.post('/webhooks/razorpay/subscription', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) {
      return reply.code(400).send({ error: 'Missing signature' });
    }

    const isValid = subscriptionService.verifyWebhookSignature(request.body, signature);
    if (!isValid) {
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    const { event, payload } = request.body;
    const subscriptionEntity = payload?.subscription?.entity;
    const paymentEntity = payload?.payment?.entity;

    if (!subscriptionEntity) {
      return { status: 'ok', message: 'No subscription entity in payload' };
    }

    const gymId = subscriptionEntity.notes?.gym_id;
    const razorpaySubId = subscriptionEntity.id;

    switch (event) {
      case 'subscription.activated':
        await subscriptionService.handleSubscriptionActivated(gymId, razorpaySubId);
        break;

      case 'subscription.charged':
        await subscriptionService.handleSubscriptionCharged(gymId, razorpaySubId, paymentEntity);
        break;

      case 'subscription.cancelled':
        await subscriptionService.handleSubscriptionCancelled(gymId, razorpaySubId);
        break;

      case 'subscription.halted':
      case 'subscription.pending':
        // Mark as past_due when payment fails
        await subscriptionService.handleSubscriptionActivated(gymId, razorpaySubId);
        break;

      default:
        fastify.log.info(`Unhandled subscription webhook event: ${event}`);
    }

    return { status: 'ok' };
  });
}
