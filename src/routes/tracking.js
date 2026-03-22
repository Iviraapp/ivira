import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import * as trackingService from '../services/tracking.service.js';

// --- Schemas ---

const createCampaignSchema = {
  body: {
    type: 'object',
    required: ['name', 'offer_url'],
    properties: {
      name: { type: 'string', minLength: 2 },
      brand_id: { type: 'string', format: 'uuid' },
      campaign_type: { type: 'string', enum: ['CPV', 'CPM', 'CPI', 'CPA'] },
      offer_url: { type: 'string', minLength: 5 },
      postback_url: { type: 'string' },
      fallback_url: { type: 'string' },
      payout_amount_paise: { type: 'integer', minimum: 0 },
      payout_type: { type: 'string', enum: ['fixed', 'percent'] },
      daily_cap: { type: 'integer', minimum: 0 },
      total_cap: { type: 'integer', minimum: 0 },
      status: { type: 'string', enum: ['active', 'paused', 'ended'] },
      start_date: { type: 'string', format: 'date' },
      end_date: { type: 'string', format: 'date' },
    },
  },
};

const updateCampaignSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      brand_id: { type: 'string', format: 'uuid' },
      campaign_type: { type: 'string', enum: ['CPV', 'CPM', 'CPI', 'CPA'] },
      offer_url: { type: 'string' },
      postback_url: { type: 'string' },
      fallback_url: { type: 'string' },
      payout_amount_paise: { type: 'integer', minimum: 0 },
      payout_type: { type: 'string', enum: ['fixed', 'percent'] },
      daily_cap: { type: 'integer', minimum: 0 },
      total_cap: { type: 'integer', minimum: 0 },
      status: { type: 'string', enum: ['active', 'paused', 'ended'] },
      start_date: { type: 'string', format: 'date' },
      end_date: { type: 'string', format: 'date' },
    },
  },
};

const listCampaignsSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['active', 'paused', 'ended', ''], default: '' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
};

const paginationSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
};

const generateLinkSchema = {
  params: {
    type: 'object',
    required: ['gymId', 'campaignId'],
    properties: {
      gymId: { type: 'string', format: 'uuid' },
      campaignId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      sub1: { type: 'string' },
      sub2: { type: 'string' },
      sub3: { type: 'string' },
      sub4: { type: 'string' },
      sub5: { type: 'string' },
    },
  },
};

const gymIdParams = {
  params: {
    type: 'object',
    required: ['gymId'],
    properties: {
      gymId: { type: 'string', format: 'uuid' },
    },
  },
};

// --- Auth helpers ---

async function verifySuperAdmin(request, reply) {
  // Support x-admin-secret header
  const adminSecret = request.headers['x-admin-secret'];
  if (adminSecret === config.adminSecret) return;

  // Support JWT super_admin role
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    reply.code(401).send({ error: 'Unauthorized' });
    return reply;
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.role !== 'super_admin') throw new Error();
    request.admin = decoded;
  } catch {
    reply.code(401).send({ error: 'Invalid token' });
    return reply;
  }
}

export default async function trackingRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // =====================
  // Super Admin routes
  // =====================

  // POST /super/affiliate/campaigns - create campaign
  fastify.post('/super/affiliate/campaigns', {
    schema: createCampaignSchema,
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    const campaign = await trackingService.createCampaign(request.body);
    return reply.code(201).send({ campaign });
  });

  // GET /super/affiliate/campaigns - list campaigns
  fastify.get('/super/affiliate/campaigns', {
    schema: listCampaignsSchema,
    preHandler: [verifySuperAdmin],
  }, async (request) => {
    const { status, page, limit } = request.query;
    return trackingService.listCampaigns({ status: status || undefined, page, limit });
  });

  // PATCH /super/affiliate/campaigns/:id - update campaign
  fastify.patch('/super/affiliate/campaigns/:id', {
    schema: updateCampaignSchema,
    preHandler: [verifySuperAdmin],
  }, async (request) => {
    const campaign = await trackingService.updateCampaign(request.params.id, request.body);
    return { campaign };
  });

  // GET /super/affiliate/conversions - all conversions
  fastify.get('/super/affiliate/conversions', {
    schema: paginationSchema,
    preHandler: [verifySuperAdmin],
  }, async (request) => {
    const { page, limit } = request.query;
    // Return all conversions (no gym filter)
    return trackingService.getGymConversions(null, { page, limit });
  });

  // POST /super/affiliate/postback/retry/:id - retry failed postback
  fastify.post('/super/affiliate/postback/retry/:id', {
    preHandler: [verifySuperAdmin],
  }, async (request) => {
    if (request.params.id === 'all') {
      return trackingService.retryFailedPostbacks();
    }
    await trackingService.firePostback(request.params.id);
    return { status: 'ok', message: 'Postback retry fired' };
  });

  // =====================
  // Gym routes (authenticated)
  // =====================

  // GET /gyms/:gymId/affiliate/campaigns - available campaigns
  fastify.get('/gyms/:gymId/affiliate/campaigns', {
    schema: gymIdParams,
    ...authHooks,
  }, async (request) => {
    return trackingService.getGymCampaigns(request.params.gymId);
  });

  // POST /gyms/:gymId/affiliate/campaigns/:campaignId/link - generate tracking link
  fastify.post('/gyms/:gymId/affiliate/campaigns/:campaignId/link', {
    schema: generateLinkSchema,
    ...authHooks,
  }, async (request, reply) => {
    const { gymId, campaignId } = request.params;
    const { sub1, sub2, sub3, sub4, sub5 } = request.body || {};
    const result = await trackingService.generateTrackingLink(campaignId, gymId, sub1, sub2, sub3, sub4, sub5);
    return reply.code(201).send(result);
  });

  // GET /gyms/:gymId/affiliate/conversions - conversion history
  fastify.get('/gyms/:gymId/affiliate/conversions', {
    schema: { ...gymIdParams, ...paginationSchema },
    ...authHooks,
  }, async (request) => {
    const { page, limit } = request.query;
    return trackingService.getGymConversions(request.params.gymId, { page, limit });
  });

  // GET /gyms/:gymId/affiliate/earnings/detailed - detailed earnings
  fastify.get('/gyms/:gymId/affiliate/earnings/detailed', {
    schema: gymIdParams,
    ...authHooks,
  }, async (request) => {
    return trackingService.getGymDetailedEarnings(request.params.gymId);
  });
}
