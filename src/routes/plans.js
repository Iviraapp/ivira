import * as planService from '../services/plan.service.js';

const createPlanSchema = {
  body: {
    type: 'object',
    required: ['name', 'durationMonths', 'pricePaise'],
    properties: {
      name: { type: 'string', minLength: 1 },
      durationMonths: { type: 'integer', minimum: 1, maximum: 24 },
      pricePaise: { type: 'integer', minimum: 100 },
      description: { type: 'string' },
    },
  },
};

export default async function planRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  fastify.post('/gyms/:gymId/plans', { schema: createPlanSchema, ...authHooks }, async (request, reply) => {
    const plan = await planService.createPlan(request.params.gymId, request.body);
    return reply.code(201).send({ plan });
  });

  fastify.get('/gyms/:gymId/plans', authHooks, async (request) => {
    const plans = await planService.listPlans(request.params.gymId);
    return { plans };
  });

  fastify.patch('/gyms/:gymId/plans/:planId', authHooks, async (request) => {
    const plan = await planService.updatePlan(request.params.gymId, request.params.planId, request.body);
    return { plan };
  });

  fastify.delete('/gyms/:gymId/plans/:planId', authHooks, async (request) => {
    await planService.deletePlan(request.params.gymId, request.params.planId);
    return { message: 'Plan deactivated' };
  });
}
