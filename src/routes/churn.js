import * as churnService from '../services/churn.service.js';

export default async function churnRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Run batch churn scoring for all active members
  fastify.post('/gyms/:gymId/churn/score', authHooks, async (request) => {
    return churnService.runBatchChurnScoring(request.params.gymId);
  });

  // List churn scores with optional risk level filter
  fastify.get('/gyms/:gymId/churn/scores', authHooks, async (request) => {
    const { riskLevel, page, limit } = request.query;
    return churnService.getChurnScores(request.params.gymId, { riskLevel, page, limit });
  });

  // Get churn summary stats
  fastify.get('/gyms/:gymId/churn/stats', authHooks, async (request) => {
    return churnService.getChurnStats(request.params.gymId);
  });

  // Get top at-risk members
  fastify.get('/gyms/:gymId/churn/at-risk', authHooks, async (request) => {
    const { limit } = request.query;
    const members = await churnService.getAtRiskMembers(request.params.gymId, limit);
    return { members };
  });

  // Get individual member churn score (calculated live)
  fastify.get('/gyms/:gymId/churn/members/:memberId', authHooks, async (request) => {
    return churnService.calculateChurnScore(request.params.gymId, request.params.memberId);
  });
}
