import * as paymentService from '../services/payment.service.js';
import * as dunningService from '../services/dunning.service.js';

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
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Create membership for a member
  fastify.post('/gyms/:gymId/memberships', { schema: createMembershipSchema, ...authHooks }, async (request, reply) => {
    const membership = await paymentService.createMembership(
      request.params.gymId,
      request.body.memberId,
      request.body
    );
    return reply.code(201).send({ membership });
  });

  // Collect payment from a member (creates membership + payment)
  fastify.post('/gyms/:gymId/members/:memberId/collect', { schema: collectSchema, ...authHooks }, async (request, reply) => {
    const result = await paymentService.collectPayment(
      request.params.gymId,
      request.params.memberId,
      request.body
    );
    return reply.code(201).send(result);
  });

  // Create payment order (Razorpay)
  fastify.post('/gyms/:gymId/memberships/:membershipId/pay', authHooks, async (request, reply) => {
    const result = await paymentService.createPaymentOrder(
      request.params.gymId,
      request.params.membershipId
    );
    return reply.code(201).send(result);
  });

  // List payments
  fastify.get('/gyms/:gymId/payments', authHooks, async (request) => {
    const { page, limit, status, memberId } = request.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    return paymentService.getPayments(request.params.gymId, { page: safePage, limit: safeLimit, status, memberId });
  });

  // Run dunning for expired memberships
  fastify.post('/gyms/:gymId/dunning/run', authHooks, async (request) => {
    return dunningService.runDunning(request.params.gymId);
  });

  // Get dunning status
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
