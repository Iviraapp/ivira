import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import * as trainerService from '../services/trainer.service.js';

export default async function trainerRoutes(fastify) {
  // Trainer auth middleware
  async function verifyTrainer(request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.role !== 'trainer' && decoded.role !== 'staff') throw new Error();
      request.trainer = decoded;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  }

  // GET /trainer/sessions - Today's sessions
  fastify.get('/trainer/sessions', { preHandler: [verifyTrainer] }, async (request) => {
    const { date } = request.query;
    return trainerService.getTodaySessions(request.trainer.staffId || request.trainer.id, date);
  });

  // GET /trainer/clients - Client roster
  fastify.get('/trainer/clients', { preHandler: [verifyTrainer] }, async (request) => {
    return trainerService.getClients(
      request.trainer.staffId || request.trainer.id,
      request.trainer.gymId
    );
  });

  // GET /trainer/clients/:memberId - Client detail
  fastify.get('/trainer/clients/:memberId', { preHandler: [verifyTrainer] }, async (request) => {
    return trainerService.getClientDetail(request.params.memberId);
  });

  // GET /trainer/earnings - Earnings summary
  fastify.get('/trainer/earnings', { preHandler: [verifyTrainer] }, async (request) => {
    const { months } = request.query;
    return trainerService.getEarnings(
      request.trainer.staffId || request.trainer.id,
      request.trainer.gymId,
      months || 3
    );
  });

  // POST /trainer/sessions - Create session
  fastify.post('/trainer/sessions', { preHandler: [verifyTrainer] }, async (request, reply) => {
    const session = await trainerService.createSession({
      trainerId: request.trainer.staffId || request.trainer.id,
      gymId: request.trainer.gymId,
      ...request.body,
    });
    return reply.code(201).send(session);
  });

  // PATCH /trainer/sessions/:id - Update session
  fastify.patch('/trainer/sessions/:id', { preHandler: [verifyTrainer] }, async (request) => {
    return trainerService.updateSession(request.params.id, request.body);
  });
}
