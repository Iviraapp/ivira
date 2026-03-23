/**
 * IVIRA Financial Intelligence API
 *
 * Provides gym owners with AI-powered financial clarity:
 * - MRR, ARPU, churn impact
 * - Revenue leakage detection
 * - Payment recovery analysis
 * - GEO-aware tax compliance
 * - Smart nudge suggestions
 */
import {
  getFinancialSummary,
  calculateMRR,
  calculateARPU,
  analyzePaymentRecovery,
  getPendingNudges,
  analyzeRevenueLeakage,
  getTaxCompliance,
  getChurnFinancialImpact,
  getRevenueTimeline,
} from '../services/financial-intelligence.service.js';

export default async function financeRoutes(fastify) {
  const ownerAuth = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // GET /gyms/:gymId/finance/summary — Full financial intelligence report
  fastify.get('/gyms/:gymId/finance/summary', ownerAuth, async (request) => {
    const { gymId } = request.params;
    const { country = 'IN', state } = request.query;
    return getFinancialSummary(gymId, country, state);
  });

  // GET /gyms/:gymId/finance/mrr — Monthly Recurring Revenue
  fastify.get('/gyms/:gymId/finance/mrr', ownerAuth, async (request) => {
    return calculateMRR(request.params.gymId);
  });

  // GET /gyms/:gymId/finance/arpu — Average Revenue Per User
  fastify.get('/gyms/:gymId/finance/arpu', ownerAuth, async (request) => {
    return calculateARPU(request.params.gymId);
  });

  // GET /gyms/:gymId/finance/recovery — Payment recovery analysis
  fastify.get('/gyms/:gymId/finance/recovery', ownerAuth, async (request) => {
    const { days = 30 } = request.query;
    return analyzePaymentRecovery(request.params.gymId, parseInt(days));
  });

  // GET /gyms/:gymId/finance/nudges — Members needing payment nudges
  fastify.get('/gyms/:gymId/finance/nudges', ownerAuth, async (request) => {
    return getPendingNudges(request.params.gymId);
  });

  // GET /gyms/:gymId/finance/leakage — Revenue leakage analysis
  fastify.get('/gyms/:gymId/finance/leakage', ownerAuth, async (request) => {
    return analyzeRevenueLeakage(request.params.gymId);
  });

  // GET /gyms/:gymId/finance/tax — GEO-aware tax compliance
  fastify.get('/gyms/:gymId/finance/tax', ownerAuth, async (request) => {
    const { country = 'IN', state } = request.query;
    return getTaxCompliance(country, state);
  });

  // GET /gyms/:gymId/finance/churn-impact — Financial impact of member departures
  fastify.get('/gyms/:gymId/finance/churn-impact', ownerAuth, async (request) => {
    return getChurnFinancialImpact(request.params.gymId);
  });

  // GET /gyms/:gymId/finance/timeline — Revenue timeline chart data
  fastify.get('/gyms/:gymId/finance/timeline', ownerAuth, async (request) => {
    const { days = 30 } = request.query;
    return getRevenueTimeline(request.params.gymId, parseInt(days));
  });
}
