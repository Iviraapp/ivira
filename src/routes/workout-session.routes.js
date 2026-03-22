import * as workoutSessionService from '../services/workout-session.service.js';

const startSessionSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 100 },
      workout_type: { type: 'string', enum: ['strength', 'cardio', 'hiit', 'yoga', 'crossfit', 'functional'] },
    },
  },
};

const addSetsSchema = {
  body: {
    type: 'object',
    required: ['exercise_id', 'sets'],
    properties: {
      exercise_id: { type: 'string', format: 'uuid' },
      sets: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: {
          type: 'object',
          properties: {
            set_number: { type: 'integer', minimum: 1 },
            weight_kg: { type: 'number', minimum: 0 },
            reps: { type: 'integer', minimum: 0 },
            duration_seconds: { type: 'integer', minimum: 0 },
            distance_km: { type: 'number', minimum: 0 },
            is_warmup: { type: 'boolean' },
            rpe: { type: 'string' },
            notes: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
  },
};

const completeSessionSchema = {
  body: {
    type: 'object',
    properties: {
      duration_minutes: { type: 'integer', minimum: 1, maximum: 600 },
      notes: { type: 'string', maxLength: 2000 },
    },
  },
};

export default async function workoutSessionRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken] };

  // POST /gyms/:gymId/members/:memberId/workout-sessions - Start a session
  fastify.post('/gyms/:gymId/members/:memberId/workout-sessions', {
    schema: startSessionSchema,
    ...authHooks,
  }, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { name, workout_type } = request.body || {};
    const session = await workoutSessionService.startSession(memberId, gymId, { name, workout_type });
    return reply.code(201).send(session);
  });

  // POST /gyms/:gymId/members/:memberId/workout-sessions/:sessionId/sets - Add exercise sets
  fastify.post('/gyms/:gymId/members/:memberId/workout-sessions/:sessionId/sets', {
    schema: addSetsSchema,
    ...authHooks,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const { exercise_id, sets } = request.body;
    const inserted = await workoutSessionService.addExerciseSets(sessionId, exercise_id, sets);
    return reply.code(201).send(inserted);
  });

  // PUT /gyms/:gymId/members/:memberId/workout-sessions/:sessionId/complete - Complete session
  fastify.put('/gyms/:gymId/members/:memberId/workout-sessions/:sessionId/complete', {
    schema: completeSessionSchema,
    ...authHooks,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const { duration_minutes, notes } = request.body || {};
    const session = await workoutSessionService.completeSession(sessionId, { duration_minutes, notes });
    return session;
  });

  // GET /gyms/:gymId/members/:memberId/workout-sessions - Session history
  fastify.get('/gyms/:gymId/members/:memberId/workout-sessions', authHooks, async (request, reply) => {
    const { memberId } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const result = await workoutSessionService.getSessionHistory(memberId, { page: parseInt(page, 10), limit: parseInt(limit, 10) });
    return result;
  });

  // GET /gyms/:gymId/members/:memberId/workout-sessions/exercises - Browse/search exercises
  fastify.get('/gyms/:gymId/members/:memberId/workout-sessions/exercises', authHooks, async (request, reply) => {
    const { gymId } = request.params;
    const { category, search } = request.query;
    const exercises = await workoutSessionService.getExercises({ category, search, gymId });
    return exercises;
  });

  // GET /gyms/:gymId/members/:memberId/workout-sessions/personal-records - All PRs
  fastify.get('/gyms/:gymId/members/:memberId/workout-sessions/personal-records', authHooks, async (request, reply) => {
    const { memberId } = request.params;
    const records = await workoutSessionService.getPersonalRecords(memberId);
    return records;
  });

  // GET /gyms/:gymId/members/:memberId/workout-sessions/exercises/:exerciseId/history - Exercise PR tracking
  fastify.get('/gyms/:gymId/members/:memberId/workout-sessions/exercises/:exerciseId/history', authHooks, async (request, reply) => {
    const { memberId, exerciseId } = request.params;
    const { limit = 20 } = request.query;
    const result = await workoutSessionService.getExerciseHistory(memberId, exerciseId, { limit: parseInt(limit, 10) });
    return result;
  });

  // GET /gyms/:gymId/members/:memberId/workout-sessions/:sessionId - Single session detail
  fastify.get('/gyms/:gymId/members/:memberId/workout-sessions/:sessionId', authHooks, async (request, reply) => {
    const { sessionId } = request.params;
    const session = await workoutSessionService.getSessionById(sessionId);
    return session;
  });
}
