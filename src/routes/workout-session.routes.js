import * as workoutSessionService from '../services/workout-session.service.js';
import { syncExercises, syncFreeExerciseDB, getMuscleList } from '../services/wger-sync.service.js';
import db from '../config/database.js';

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
    return reply.code(201).send({ session });
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

  // POST /gyms/:gymId/exercises/sync-wger - Sync wger exercise database (admin only)
  fastify.post('/gyms/:gymId/exercises/sync-wger', {
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    // Only gym owners can trigger sync
    const gym = request.gym || await db('gyms').where({ id: request.params.gymId }).first();
    if (!gym || gym.owner_id !== request.user?.id) {
      return reply.code(403).send({ error: 'Only gym owners can sync exercises' });
    }
    const result = await syncExercises(db);
    return result;
  });

  // GET /exercises/muscles - Get all muscle groups with SVG image URLs
  fastify.get('/exercises/muscles', async (request, reply) => {
    const muscles = await getMuscleList(db);
    return muscles;
  });

  // GET /exercises/browse - Public exercise browser (no auth, for discovery)
  fastify.get('/exercises/browse', async (request, reply) => {
    const { category, muscle, equipment, search, page = 1, limit = 50 } = request.query;
    const pg = Math.min(Math.max(parseInt(page) || 1, 1), 100);
    const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offset = (pg - 1) * lim;

    let query = db('exercises')
      .where({ is_default: true })
      .orderBy('name', 'asc');

    if (category) query = query.andWhere({ category });
    if (equipment) query = query.andWhere({ equipment });
    if (search) {
      query = query.andWhere(function () {
        this.whereILike('name', `%${search}%`)
          .orWhereILike('muscle_group', `%${search}%`)
          .orWhereILike('equipment', `%${search}%`);
      });
    }
    if (muscle) {
      query = query.andWhere(function () {
        this.whereILike('muscle_group', `%${muscle}%`)
          .orWhereRaw("muscles_primary::text ILIKE ?", [`%${muscle}%`]);
      });
    }

    const [{ count }] = await query.clone().clearOrder().count();
    const exercises = await query.limit(lim).offset(offset);

    return {
      exercises,
      pagination: { page: pg, limit: lim, total: parseInt(count), pages: Math.ceil(parseInt(count) / lim) },
    };
  });
}
