import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import * as pushService from '../services/push.service.js';

const registerTokenSchema = {
  body: {
    type: 'object',
    required: ['deviceToken', 'platform'],
    properties: {
      deviceToken: { type: 'string', minLength: 1 },
      platform: { type: 'string', enum: ['ios', 'android', 'web'] },
      deviceInfo: { type: 'object' },
    },
  },
};

const unregisterTokenSchema = {
  body: {
    type: 'object',
    required: ['deviceToken'],
    properties: {
      deviceToken: { type: 'string', minLength: 1 },
    },
  },
};

const sendPushSchema = {
  body: {
    type: 'object',
    required: ['memberIds', 'title', 'body'],
    properties: {
      memberIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
      title: { type: 'string', minLength: 1 },
      body: { type: 'string', minLength: 1 },
      data: { type: 'object' },
    },
  },
};

const broadcastSchema = {
  body: {
    type: 'object',
    required: ['title', 'body'],
    properties: {
      title: { type: 'string', minLength: 1 },
      body: { type: 'string', minLength: 1 },
      data: { type: 'object' },
    },
  },
};

// Pre-handler to verify member JWT token (same pattern as members.js)
async function verifyMemberToken(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid authorization header' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret);
    if (decoded.role !== 'member' || decoded.gymId !== request.params.gymId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    request.member = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export default async function pushRoutes(fastify) {
  const ownerHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Register device token (member auth)
  fastify.post('/gyms/:gymId/push/register', {
    schema: registerTokenSchema,
    preHandler: [verifyMemberToken],
  }, async (request, reply) => {
    const { deviceToken, platform, deviceInfo } = request.body;
    const token = await pushService.registerToken(request.params.gymId, {
      memberId: request.member.memberId,
      deviceToken,
      platform,
      deviceInfo,
    });
    return reply.code(201).send({ token });
  });

  // Unregister device token (member auth)
  fastify.delete('/gyms/:gymId/push/unregister', {
    schema: unregisterTokenSchema,
    preHandler: [verifyMemberToken],
  }, async (request) => {
    const result = await pushService.removeToken(request.body.deviceToken);
    return result;
  });

  // Send push notification to specific members (owner only)
  fastify.post('/gyms/:gymId/push/send', {
    schema: sendPushSchema,
    ...ownerHooks,
  }, async (request) => {
    const { memberIds, title, body, data } = request.body;
    const result = await pushService.sendBulk(request.params.gymId, memberIds, { title, body, data });
    return result;
  });

  // Broadcast push notification to all gym members (owner only)
  fastify.post('/gyms/:gymId/push/broadcast', {
    schema: broadcastSchema,
    ...ownerHooks,
  }, async (request) => {
    const { title, body, data } = request.body;

    // Get all active member tokens for this gym
    const tokens = await fastify.db('push_tokens')
      .where({ gym_id: request.params.gymId, is_active: true })
      .whereNotNull('member_id')
      .select('device_token');

    if (!tokens.length) return { sent: 0, total: 0 };

    const results = await Promise.allSettled(
      tokens.map((t) => pushService.sendToToken(t.device_token, { title, body, data }))
    );

    return {
      sent: results.filter((r) => r.status === 'fulfilled' && r.value.success).length,
      total: tokens.length,
    };
  });
}
