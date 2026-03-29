import db from '../config/database.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export default async function assignedWorkoutsRoutes(fastify) {
  // Shared trainer auth middleware
  async function verifyTrainer(request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (!['trainer', 'staff', 'manager', 'owner'].includes(decoded.role)) throw new Error();
      request.trainer = decoded;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  }

  // Member auth middleware (accepts member token too)
  async function verifyMemberOrTrainer(request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      request.user = decoded;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  }

  // POST /trainer/clients/:memberId/assigned-workouts
  // Trainer pushes a workout plan to a member
  fastify.post('/trainer/clients/:memberId/assigned-workouts', { preHandler: [verifyTrainer] }, async (request, reply) => {
    const { memberId } = request.params;
    const { title, description, exercises, scheduled_date, notes } = request.body;

    if (!title) return reply.code(400).send({ error: 'title is required' });

    const [assigned] = await db('assigned_workouts').insert({
      trainer_id: request.trainer.staffId || request.trainer.id,
      gym_id: request.trainer.gymId,
      member_id: memberId,
      title,
      description: description || null,
      exercises: JSON.stringify(exercises || []),
      scheduled_date: scheduled_date || null,
      notes: notes || null,
      status: 'pending',
    }).returning('*');

    return reply.code(201).send({ assigned_workout: assigned });
  });

  // GET /trainer/clients/:memberId/assigned-workouts
  // Trainer views all assigned workouts for a member
  fastify.get('/trainer/clients/:memberId/assigned-workouts', { preHandler: [verifyTrainer] }, async (request) => {
    const { memberId } = request.params;
    const workouts = await db('assigned_workouts')
      .where({ member_id: memberId })
      .orderBy('created_at', 'desc')
      .limit(50);
    return { workouts: workouts.map(w => ({ ...w, exercises: JSON.parse(w.exercises || '[]') })) };
  });

  // GET /gyms/:gymId/members/me/assigned-workouts
  // Member views their own assigned workouts
  fastify.get('/gyms/:gymId/members/me/assigned-workouts', { preHandler: [verifyMemberOrTrainer] }, async (request) => {
    const memberId = request.user.memberId;
    if (!memberId) return { workouts: [] };
    const workouts = await db('assigned_workouts')
      .where({ member_id: memberId, gym_id: request.params.gymId })
      .orderBy('scheduled_date', 'asc')
      .limit(20);
    return { workouts: workouts.map(w => ({ ...w, exercises: JSON.parse(w.exercises || '[]') })) };
  });

  // PATCH /trainer/assigned-workouts/:id
  // Update status (done, cancelled) or content
  fastify.patch('/trainer/assigned-workouts/:id', { preHandler: [verifyTrainer] }, async (request) => {
    const { status, notes, exercises } = request.body;
    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (exercises) updates.exercises = JSON.stringify(exercises);
    const [updated] = await db('assigned_workouts').where({ id: request.params.id }).update(updates).returning('*');
    return { assigned_workout: { ...updated, exercises: JSON.parse(updated.exercises || '[]') } };
  });
}
