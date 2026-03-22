import config from '../config/index.js';
import * as sponsorService from '../services/sponsor.service.js';

async function verifyAdmin(request, reply) {
  const secret = request.headers['x-admin-secret'];
  if (secret !== config.adminSecret) {
    reply.code(403).send({ error: 'Invalid admin secret' });
    return reply;
  }
}

const createSponsorSchema = {
  body: {
    type: 'object',
    required: ['brand_name', 'cpm_paise', 'budget_paise', 'start_date', 'end_date'],
    properties: {
      brand_name: { type: 'string', minLength: 1 },
      brand_logo_url: { type: 'string' },
      ad_html: { type: 'string' },
      cta_url: { type: 'string' },
      cpm_paise: { type: 'integer', minimum: 1 },
      budget_paise: { type: 'integer', minimum: 100 },
      start_date: { type: 'string', format: 'date' },
      end_date: { type: 'string', format: 'date' },
    },
  },
};

const updateSponsorSchema = {
  body: {
    type: 'object',
    properties: {
      brand_name: { type: 'string', minLength: 1 },
      brand_logo_url: { type: 'string' },
      ad_html: { type: 'string' },
      cta_url: { type: 'string' },
      cpm_paise: { type: 'integer', minimum: 1 },
      budget_paise: { type: 'integer', minimum: 100 },
      start_date: { type: 'string', format: 'date' },
      end_date: { type: 'string', format: 'date' },
    },
  },
};

export default async function sponsorRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // ─── Admin Routes ───────────────────────────────────────────────────

  // Create a sponsor campaign
  fastify.post('/admin/sponsors', {
    schema: createSponsorSchema,
    preHandler: [verifyAdmin],
  }, async (request, reply) => {
    const sponsor = await sponsorService.createSponsor(request.body);
    return reply.code(201).send({ sponsor });
  });

  // List all sponsors (optional ?active=true|false)
  fastify.get('/admin/sponsors', {
    preHandler: [verifyAdmin],
  }, async (request) => {
    const { active } = request.query;
    const sponsors = await sponsorService.listSponsors({ active });
    return { sponsors };
  });

  // Update a sponsor campaign
  fastify.put('/admin/sponsors/:id', {
    schema: updateSponsorSchema,
    preHandler: [verifyAdmin],
  }, async (request) => {
    const sponsor = await sponsorService.updateSponsor(request.params.id, request.body);
    return { sponsor };
  });

  // Get sponsor stats
  fastify.get('/admin/sponsors/:id/stats', {
    preHandler: [verifyAdmin],
  }, async (request) => {
    return sponsorService.getSponsorStats(request.params.id);
  });

  // ─── Gym Routes (Authenticated) ────────────────────────────────────

  // Get the current sponsor for newsletter inclusion
  fastify.get('/gyms/:gymId/sponsors/current', authHooks, async (request) => {
    const result = await sponsorService.getSponsorForNewsletter(request.params.gymId);
    if (!result) {
      return { sponsor: null, message: 'No active sponsors available' };
    }
    return result;
  });

  // Track a click on a sponsor placement
  fastify.post('/gyms/:gymId/sponsors/click/:placementId', authHooks, async (request) => {
    return sponsorService.trackSponsorClick(request.params.placementId);
  });

  // Get gym's total sponsor revenue
  fastify.get('/gyms/:gymId/sponsors/revenue', authHooks, async (request) => {
    return sponsorService.getGymSponsorRevenue(request.params.gymId);
  });
}
