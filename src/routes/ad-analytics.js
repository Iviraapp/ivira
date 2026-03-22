import db from '../config/database.js';
import {
  recordAdEvent, getAdAnalytics, getRevenueSummary, getRevenueTimeline,
  getFinancialLedgerSummary, getTrainerFeesSummary, getAffiliateCommissionsSummary,
  markTrainerFeesPaid,
} from '../services/revenue.service.js';
import { getActiveAds, recordImpression, recordClick } from '../services/ad-campaign.service.js';

export default async function adAnalyticsRoutes(fastify) {
  // ─── Get active ads for a gym ───────────────────────────────────────
  fastify.get('/gyms/:gymId/ads/active', {
    preHandler: [fastify.verifyToken],
  }, async (request) => {
    const { gymId } = request.params;

    const gym = await db('gyms').where({ id: gymId }).select('city', 'tier').first();
    if (!gym) {
      return { campaigns: [] };
    }

    const campaigns = await getActiveAds(gym.city, gym.tier);
    return { campaigns };
  });

  // ─── Record an ad impression ────────────────────────────────────────
  fastify.post('/gyms/:gymId/ads/:campaignId/impression', {
    preHandler: [fastify.verifyToken],
  }, async (request) => {
    const { gymId, campaignId } = request.params;

    await Promise.all([
      recordImpression(campaignId),
      recordAdEvent(gymId, campaignId, 'impression', request.user?.memberId || null),
    ]);

    return { success: true };
  });

  // ─── Record an ad click ─────────────────────────────────────────────
  fastify.post('/gyms/:gymId/ads/:campaignId/click', {
    preHandler: [fastify.verifyToken],
  }, async (request) => {
    const { gymId, campaignId } = request.params;

    await Promise.all([
      recordClick(campaignId),
      recordAdEvent(gymId, campaignId, 'click', request.user?.memberId || null),
    ]);

    return { success: true };
  });

  // ─── Get ad analytics (owner only) ─────────────────────────────────
  fastify.get('/gyms/:gymId/ads/analytics', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request) => {
    const { gymId } = request.params;
    const { days = 30 } = request.query;

    return getAdAnalytics(gymId, days);
  });

  // ─── Get revenue summary (owner only) ──────────────────────────────
  fastify.get('/gyms/:gymId/revenue/summary', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request) => {
    const { gymId } = request.params;
    const { period = 'month' } = request.query;

    return getRevenueSummary(gymId, period);
  });

  // ─── Get revenue timeline (owner only) ─────────────────────────────
  fastify.get('/gyms/:gymId/revenue/timeline', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request) => {
    const { gymId } = request.params;
    const { days = 30 } = request.query;

    return getRevenueTimeline(gymId, parseInt(days));
  });

  // ─── Financial Ledger: Owner Revenue vs Affiliate vs Trainer ──────
  fastify.get('/gyms/:gymId/revenue/financial-ledger', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request) => {
    const { gymId } = request.params;
    const { period = 'month' } = request.query;
    return getFinancialLedgerSummary(gymId, period);
  });

  // ─── Trainer Fees ─────────────────────────────────────────────────
  fastify.get('/gyms/:gymId/revenue/trainer-fees', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request) => {
    const { gymId } = request.params;
    const { period = 'month' } = request.query;
    return { fees: await getTrainerFeesSummary(gymId, period) };
  });

  fastify.post('/gyms/:gymId/revenue/trainer-fees/mark-paid', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
    schema: {
      body: {
        type: 'object',
        required: ['feeIds'],
        properties: {
          feeIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
    },
  }, async (request) => {
    const { gymId } = request.params;
    const updated = await markTrainerFeesPaid(gymId, request.body.feeIds);
    return { updated: updated.length, fees: updated };
  });

  // ─── Affiliate Commissions ────────────────────────────────────────
  fastify.get('/gyms/:gymId/revenue/affiliate-commissions', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request) => {
    const { gymId } = request.params;
    const { period = 'month' } = request.query;
    return { commissions: await getAffiliateCommissionsSummary(gymId, period) };
  });
}
