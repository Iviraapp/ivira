import config from '../config/index.js';
import db from '../config/database.js';
import * as affiliateService from '../services/affiliate.service.js';

const generateLinkSchema = {
  body: {
    type: 'object',
    required: ['brandId'],
    properties: {
      brandId: { type: 'string', format: 'uuid' },
      memberId: { type: 'string', format: 'uuid' },
      productUrl: { type: 'string' },
    },
  },
};

async function verifyAdmin(request, reply) {
  const secret = request.headers['x-admin-secret'];
  if (secret !== config.adminSecret) {
    reply.code(403).send({ error: 'Invalid admin secret' });
    return reply;
  }
}

export default async function affiliateRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // --- Public ---

  // List all active brands
  fastify.get('/affiliate/brands', async (request) => {
    const { category } = request.query;
    const brands = await affiliateService.listBrands({ category });
    const categories = await affiliateService.getBrandCategories();
    return { brands, categories };
  });

  // NOTE: Click tracking redirect /r/:clickToken is registered at root level in app.js

  // --- Gym owner ---

  // Generate tracked affiliate link
  fastify.post('/gyms/:gymId/affiliate/links/generate', { schema: generateLinkSchema, ...authHooks }, async (request) => {
    return affiliateService.generateLink(request.params.gymId, request.body);
  });

  // Click history
  fastify.get('/gyms/:gymId/affiliate/clicks', authHooks, async (request) => {
    const { page, limit, brandId } = request.query;
    return affiliateService.getClicks(request.params.gymId, { page, limit, brandId });
  });

  // Earnings summary
  fastify.get('/gyms/:gymId/affiliate/earnings', authHooks, async (request) => {
    return affiliateService.getEarnings(request.params.gymId);
  });

  // Payout history
  fastify.get('/gyms/:gymId/affiliate/payouts', authHooks, async (request) => {
    const { page, limit } = request.query;
    return affiliateService.getPayouts(request.params.gymId, { page, limit });
  });

  // Activate brand for gym
  fastify.post('/gyms/:gymId/affiliate/activate', authHooks, async (request) => {
    const { gymId } = request.params
    const { brandId } = request.body

    const existing = await db('gym_brand_activations')
      .where({ gym_id: gymId, brand_id: brandId })
      .first()

    if (existing) {
      await db('gym_brand_activations')
        .where({ id: existing.id })
        .update({ is_active: true, deactivated_at: null, activated_at: new Date() })
    } else {
      await db('gym_brand_activations')
        .insert({ gym_id: gymId, brand_id: brandId })
    }

    return { ok: true }
  })

  // Deactivate brand for gym
  fastify.post('/gyms/:gymId/affiliate/deactivate', authHooks, async (request) => {
    const { gymId } = request.params
    const { brandId } = request.body

    await db('gym_brand_activations')
      .where({ gym_id: gymId, brand_id: brandId })
      .update({ is_active: false, deactivated_at: new Date() })

    return { ok: true }
  })

  // Get activated brands for a gym
  fastify.get('/gyms/:gymId/affiliate/activated', authHooks, async (request) => {
    const activated = await db('gym_brand_activations')
      .where({ gym_id: request.params.gymId, is_active: true })
      .select('brand_id')
    return { brandIds: activated.map(a => a.brand_id) }
  })

  // Request payout
  fastify.post('/gyms/:gymId/affiliate/payouts/request', authHooks, async (request, reply) => {
    const { gymId } = request.params
    const { amount } = request.body

    if (!amount || amount < 100000) {
      return reply.code(400).send({ error: 'Minimum payout is ₹1,000' })
    }

    const [payout] = await db('affiliate_payouts')
      .insert({
        gym_id: gymId,
        amount_paise: amount,
        status: 'pending',
        period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        period_end: new Date(),
      })
      .returning('*')

    return { payout }
  })

  // Public: Get activated affiliate brands for a gym (for member store)
  fastify.get('/gyms/:gymId/affiliate/store', async (request) => {
    const { gymId } = request.params
    const brands = await db('gym_brand_activations')
      .where({ 'gym_brand_activations.gym_id': gymId, 'gym_brand_activations.is_active': true })
      .join('affiliate_brands', 'gym_brand_activations.brand_id', 'affiliate_brands.id')
      .select(
        'affiliate_brands.id',
        'affiliate_brands.name',
        'affiliate_brands.category',
        'affiliate_brands.commission_rate_percent',
        'affiliate_brands.base_url',
        'affiliate_brands.logo_url',
        'affiliate_brands.description'
      )
    return { brands }
  })

  // --- Admin ---

  // Add brand
  fastify.post('/admin/affiliate/brands', { preHandler: [verifyAdmin] }, async (request, reply) => {
    const brand = await affiliateService.createBrand(request.body);
    return reply.code(201).send({ brand });
  });

  // Update brand
  fastify.patch('/admin/affiliate/brands/:brandId', { preHandler: [verifyAdmin] }, async (request) => {
    const brand = await affiliateService.updateBrand(request.params.brandId, request.body);
    return { brand };
  });

  // Mark payout as paid
  fastify.post('/admin/affiliate/payouts/:gymId', { preHandler: [verifyAdmin] }, async (request, reply) => {
    const payout = await affiliateService.markPayoutPaid(request.params.gymId, request.body);
    return reply.code(201).send({ payout });
  });
}
