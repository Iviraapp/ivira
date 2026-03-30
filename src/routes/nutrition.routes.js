import * as nutritionService from '../services/nutrition.service.js';

export default async function nutritionRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };
  const memberAuth = { preHandler: [fastify.verifyToken, fastify.verifyMember] };

  // Search food atlas (public within gym context)
  fastify.get('/gyms/:gymId/nutrition/search', authHooks, async (request) => {
    const { q } = request.query;
    return nutritionService.searchFood(q);
  });

  // AI meal estimation
  fastify.post('/gyms/:gymId/nutrition/estimate', memberAuth, async (request) => {
    const { input, source } = request.body || {};
    if (!input) {
      return fastify.httpErrors.badRequest('input is required');
    }

    if (source === 'ai') {
      return nutritionService.estimateWithAI(input);
    }
    return nutritionService.parseIndianMeal(input);
  });

  // Log a meal
  fastify.post('/gyms/:gymId/members/:memberId/nutrition/log', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    const { mealType, rawInput, items, source } = request.body || {};
    return nutritionService.logMeal(memberId, gymId, { mealType, rawInput, items, source });
  });

  // Get daily log
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/daily', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    const { date } = request.query;
    return nutritionService.getDailyLog(memberId, gymId, date);
  });

  // Get weekly trend
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/weekly', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    return nutritionService.getWeeklyTrend(memberId, gymId);
  });

  // Get nutrition goal
  fastify.get('/gyms/:gymId/members/:memberId/nutrition/goal', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    return nutritionService.getNutritionGoal(memberId, gymId);
  });

  // Update nutrition goal
  fastify.patch('/gyms/:gymId/members/:memberId/nutrition/goal', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    return nutritionService.updateNutritionGoal(memberId, gymId, request.body || {});
  });
}
