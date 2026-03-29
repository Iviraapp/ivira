import * as paymentService from '../services/payment.service.js';
import * as dunningService from '../services/dunning.service.js';
import redis from '../config/redis.js';

async function checkIdempotency(key, reply) {
  if (!key) return null;
  try {
    if (!redis) return null;
    const cached = await redis.get(`idem:${key}`);
    if (cached) {
      reply.header('X-Idempotency-Replayed', 'true');
      return JSON.parse(cached);
    }
  } catch { /* redis unavailable — proceed normally */ }
  return null;
}

async function storeIdempotency(key, data) {
  if (!key) return;
  try {
    if (!redis) return;
    await redis.set(`idem:${key}`, JSON.stringify(data), { EX: 86400 }); // 24h
  } catch { /* ignore */ }
}

const createMembershipSchema = {
  body: {
    type: 'object',
    required: ['memberId', 'planName', 'amountPaise', 'startDate', 'endDate'],
    properties: {
      memberId: { type: 'string', format: 'uuid' },
      planName: { type: 'string' },
      amountPaise: { type: 'integer', minimum: 100 },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      autoRenew: { type: 'boolean' },
    },
  },
};

const collectSchema = {
  body: {
    type: 'object',
    required: ['amountPaise'],
    properties: {
      planName: { type: 'string' },
      amountPaise: { type: 'integer', minimum: 100 },
      months: { type: 'integer', minimum: 1, maximum: 24 },
    },
  },
};

export default async function paymentRoutes(fastify) {
  // Base auth — identity + gym ownership
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };
  // Auth + trial guard — required for all money-collecting operations
  const authHooksWithTrial = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner, fastify.verifyTrial] };

  // Create membership for a member (blocked after trial expiry)
  fastify.post('/gyms/:gymId/memberships', { schema: createMembershipSchema, ...authHooksWithTrial }, async (request, reply) => {
    const membership = await paymentService.createMembership(
      request.params.gymId,
      request.body.memberId,
      request.body
    );
    return reply.code(201).send({ membership });
  });

  // Collect payment from a member — creates membership + payment (blocked after trial expiry)
  fastify.post('/gyms/:gymId/members/:memberId/collect', { schema: collectSchema, ...authHooksWithTrial }, async (request, reply) => {
    const idempKey = request.headers['x-idempotency-key'];
    const cached = await checkIdempotency(idempKey, reply);
    if (cached) return reply.code(201).send(cached);

    const result = await paymentService.collectPayment(
      request.params.gymId,
      request.params.memberId,
      request.body
    );
    await storeIdempotency(idempKey, result);
    return reply.code(201).send(result);
  });

  // Create Razorpay payment order (blocked after trial expiry)
  fastify.post('/gyms/:gymId/memberships/:membershipId/pay', authHooksWithTrial, async (request, reply) => {
    const result = await paymentService.createPaymentOrder(
      request.params.gymId,
      request.params.membershipId
    );
    return reply.code(201).send(result);
  });

  // List payments — read-only, allowed during trial
  fastify.get('/gyms/:gymId/payments', authHooks, async (request) => {
    const { page, limit, status, memberId } = request.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    return paymentService.getPayments(request.params.gymId, { page: safePage, limit: safeLimit, status, memberId });
  });

  // Run dunning for expired memberships (blocked after trial expiry)
  fastify.post('/gyms/:gymId/dunning/run', authHooksWithTrial, async (request) => {
    return dunningService.runDunning(request.params.gymId);
  });

  // Get dunning status — read-only, allowed during trial
  fastify.get('/gyms/:gymId/dunning', authHooks, async (request) => {
    return dunningService.getDunningStatus(request.params.gymId);
  });

  // Razorpay webhook (no auth - verified by signature)
  fastify.post('/webhooks/razorpay', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature) {
      return reply.code(400).send({ error: 'Missing signature' });
    }

    const isValid = paymentService.verifyWebhookSignature(request.body, signature);
    if (!isValid) {
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    const { event, payload } = request.body;
    const paymentEntity = payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      await paymentService.handlePaymentCaptured(
        paymentEntity.id,
        paymentEntity.order_id,
        paymentEntity
      );
    } else if (event === 'payment.failed' && paymentEntity) {
      await paymentService.handlePaymentFailed(paymentEntity.order_id, paymentEntity);
    }

    return { status: 'ok' };
  });
}
