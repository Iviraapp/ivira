import * as discoveryService from '../services/discovery.service.js';

const updateProfileSchema = {
  body: {
    type: 'object',
    properties: {
      description: { type: 'string', maxLength: 2000 },
      amenities: { type: 'array', items: { type: 'string' } },
      photos: { type: 'array', items: { type: 'string', format: 'uri' } },
      timings: { type: 'string', maxLength: 500 },
      address: { type: 'string', maxLength: 500 },
      city: { type: 'string', maxLength: 100 },
      area: { type: 'string', maxLength: 100 },
      latitude: { type: 'number', minimum: -90, maximum: 90 },
      longitude: { type: 'number', minimum: -180, maximum: 180 },
      dayPassPaise: { type: 'integer', minimum: 0 },
      acceptsDayPass: { type: 'boolean' },
      isListed: { type: 'boolean' },
    },
  },
};

const addReviewSchema = {
  body: {
    type: 'object',
    required: ['reviewerName', 'rating'],
    properties: {
      memberId: { type: 'string', format: 'uuid' },
      reviewerName: { type: 'string', minLength: 2, maxLength: 100 },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      comment: { type: 'string', maxLength: 1000 },
    },
  },
};

const purchaseDayPassSchema = {
  body: {
    type: 'object',
    required: ['buyerName', 'buyerPhone', 'validDate'],
    properties: {
      buyerName: { type: 'string', minLength: 2, maxLength: 100 },
      buyerPhone: { type: 'string', minLength: 10, maxLength: 15 },
      validDate: { type: 'string', format: 'date' },
    },
  },
};

const verifyPaymentSchema = {
  body: {
    type: 'object',
    required: ['paymentId'],
    properties: {
      paymentId: { type: 'string' },
    },
  },
};

export default async function discoveryRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // ─── Public routes (no auth) ───────────────────────────────────

  // Search listed gyms
  // Accepts: q (text search), city, area, amenities, lat, lng, radius (km), page, limit
  // lat/lng geo search works for any country — no country-specific restrictions.
  fastify.get('/discover/gyms', async (request) => {
    const { q, city, area, amenities, lat, lng, radius, page, limit } = request.query;
    return discoveryService.searchGyms({ q, city, area, amenities, lat, lng, radius, page, limit });
  });

  // Get a gym's public profile
  fastify.get('/discover/gyms/:gymId', async (request) => {
    return discoveryService.getGymProfile(request.params.gymId);
  });

  // Get reviews for a gym
  fastify.get('/discover/gyms/:gymId/reviews', async (request) => {
    const { page, limit } = request.query;
    return discoveryService.getReviews(request.params.gymId, page, limit);
  });

  // Add a review (public — no auth required)
  fastify.post('/discover/gyms/:gymId/reviews', { schema: addReviewSchema }, async (request, reply) => {
    const review = await discoveryService.addReview(request.params.gymId, request.body);
    return reply.code(201).send({ review });
  });

  // Purchase a day pass
  fastify.post('/discover/gyms/:gymId/day-pass', { schema: purchaseDayPassSchema }, async (request, reply) => {
    const result = await discoveryService.purchaseDayPass(request.params.gymId, request.body);
    return reply.code(201).send(result);
  });

  // Verify day pass payment
  fastify.post('/discover/day-pass/:dayPassId/verify', { schema: verifyPaymentSchema }, async (request) => {
    const dayPass = await discoveryService.verifyDayPassPayment(
      request.params.dayPassId,
      request.body.paymentId,
    );
    return { dayPass };
  });

  // ─── Authenticated routes (gym owner) ─────────────────────────

  // Update gym discovery profile
  fastify.put('/gyms/:gymId/profile', { schema: updateProfileSchema, ...authHooks }, async (request) => {
    const profile = await discoveryService.updateGymProfile(request.params.gymId, request.body);
    return { profile };
  });

  // Get own gym profile
  fastify.get('/gyms/:gymId/profile', authHooks, async (request) => {
    return discoveryService.getGymProfile(request.params.gymId);
  });
}
