import * as classService from '../services/class.service.js';

const createClassSchema = {
  body: {
    type: 'object',
    required: ['name', 'class_type', 'duration_minutes'],
    properties: {
      name: { type: 'string', minLength: 2 },
      description: { type: 'string' },
      class_type: { type: 'string', enum: ['group', 'pt', 'workshop', 'open'] },
      duration_minutes: { type: 'integer', minimum: 15 },
      max_capacity: { type: 'integer', minimum: 1 },
      price_paise: { type: 'integer', minimum: 0 },
      trainer_id: { type: 'string', format: 'uuid' },
    },
  },
};

const createSessionSchema = {
  body: {
    type: 'object',
    required: ['class_id', 'session_date', 'start_time', 'end_time'],
    properties: {
      class_id: { type: 'string', format: 'uuid' },
      session_date: { type: 'string', format: 'date' },
      start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$' },
      end_time: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$' },
      trainer_id: { type: 'string', format: 'uuid' },
    },
  },
};

const bookSessionSchema = {
  body: {
    type: 'object',
    required: ['memberId'],
    properties: {
      memberId: { type: 'string', format: 'uuid' },
    },
  },
};

const cancelBookingSchema = {
  body: {
    type: 'object',
    required: ['memberId'],
    properties: {
      memberId: { type: 'string', format: 'uuid' },
    },
  },
};

const bookClassSchema = {
  body: {
    type: 'object',
    required: ['member_id'],
    properties: {
      member_id: { type: 'string', format: 'uuid' },
    },
  },
};

const classCheckinSchema = {
  body: {
    type: 'object',
    required: ['member_id'],
    properties: {
      member_id: { type: 'string', format: 'uuid' },
    },
  },
};

export default async function classRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };
  const memberAuth = { preHandler: [fastify.verifyToken] };

  // ── Class CRUD (owner only) ───────────────────────────────────────────

  fastify.post('/gyms/:gymId/classes', { schema: createClassSchema, ...authHooks }, async (request, reply) => {
    const gymClass = await classService.createClass(request.params.gymId, request.body);
    return reply.code(201).send({ class: gymClass });
  });

  fastify.get('/gyms/:gymId/classes', authHooks, async (request) => {
    const { type, active } = request.query;
    const parsedActive = active !== undefined ? active === 'true' : undefined;
    return classService.listClasses(request.params.gymId, { type, active: parsedActive });
  });

  fastify.get('/gyms/:gymId/classes/:classId', authHooks, async (request) => {
    const gymClass = await classService.getClass(request.params.gymId, request.params.classId);
    return { class: gymClass };
  });

  fastify.put('/gyms/:gymId/classes/:classId', authHooks, async (request) => {
    const gymClass = await classService.updateClass(
      request.params.gymId,
      request.params.classId,
      request.body,
    );
    return { class: gymClass };
  });

  fastify.delete('/gyms/:gymId/classes/:classId', authHooks, async (request) => {
    const gymClass = await classService.deleteClass(request.params.gymId, request.params.classId);
    return { class: gymClass, message: 'Class deactivated' };
  });

  // ── Class-level booking, attendees & check-in ───────────────────────

  fastify.post('/gyms/:gymId/classes/:classId/book', { schema: bookClassSchema, ...authHooks }, async (request, reply) => {
    const booking = await classService.bookClass(
      request.params.gymId,
      request.params.classId,
      request.body.member_id,
    );
    return reply.code(201).send({ booking });
  });

  fastify.delete('/gyms/:gymId/classes/:classId/book/:memberId', authHooks, async (request) => {
    const booking = await classService.cancelClassBooking(
      request.params.gymId,
      request.params.classId,
      request.params.memberId,
    );
    return { booking, message: 'Booking cancelled' };
  });

  fastify.get('/gyms/:gymId/classes/:classId/attendees', authHooks, async (request) => {
    return classService.getClassAttendees(request.params.gymId, request.params.classId);
  });

  fastify.post('/gyms/:gymId/classes/:classId/checkin', { schema: classCheckinSchema, ...authHooks }, async (request, reply) => {
    const result = await classService.classCheckin(
      request.params.gymId,
      request.params.classId,
      request.body.member_id,
    );
    return reply.code(200).send({ checkin: result });
  });

  // ── Sessions ──────────────────────────────────────────────────────────

  fastify.post('/gyms/:gymId/sessions', { schema: createSessionSchema, ...authHooks }, async (request, reply) => {
    const session = await classService.createSession(request.params.gymId, request.body);
    return reply.code(201).send({ session });
  });

  // Sessions list — accessible by both owner and member
  fastify.get('/gyms/:gymId/sessions', memberAuth, async (request) => {
    const { date, classId, status } = request.query;
    return classService.listSessions(request.params.gymId, { date, classId, status });
  });

  // ── Bookings (owner) ─────────────────────────────────────────────────

  fastify.post('/gyms/:gymId/sessions/:sessionId/book', { schema: bookSessionSchema, ...authHooks }, async (request, reply) => {
    const booking = await classService.bookSession(
      request.params.gymId,
      request.params.sessionId,
      request.body.memberId,
    );
    return reply.code(201).send({ booking });
  });

  fastify.delete('/gyms/:gymId/bookings/:bookingId', { schema: cancelBookingSchema, ...authHooks }, async (request) => {
    const booking = await classService.cancelBooking(
      request.params.gymId,
      request.params.bookingId,
      request.body.memberId,
    );
    return { booking, message: 'Booking cancelled' };
  });

  fastify.get('/gyms/:gymId/sessions/:sessionId/bookings', authHooks, async (request) => {
    return classService.getSessionBookings(request.params.gymId, request.params.sessionId);
  });

  fastify.get('/gyms/:gymId/members/:memberId/bookings', authHooks, async (request) => {
    return classService.getMemberBookings(request.params.gymId, request.params.memberId);
  });

  // ── Member self-service booking ───────────────────────────────────────
  // Members can reserve/cancel their own bookings via JWT (no owner auth)

  fastify.post('/gyms/:gymId/sessions/:sessionId/reserve', memberAuth, async (request, reply) => {
    const memberId = request.body?.memberId || request.user?.memberId;
    if (!memberId) {
      return reply.code(400).send({ error: 'memberId is required' });
    }
    const booking = await classService.bookSession(
      request.params.gymId,
      request.params.sessionId,
      memberId,
    );
    return reply.code(201).send({ booking });
  });

  fastify.post('/gyms/:gymId/bookings/:bookingId/cancel', memberAuth, async (request) => {
    const memberId = request.body?.memberId || request.user?.memberId;
    const booking = await classService.cancelBooking(
      request.params.gymId,
      request.params.bookingId,
      memberId,
    );
    return { booking, message: 'Booking cancelled' };
  });

  // ── Occupancy ─────────────────────────────────────────────────────────

  fastify.get('/gyms/:gymId/occupancy', memberAuth, async (request) => {
    const occupancy = await classService.getOccupancy(request.params.gymId);
    return { occupancy };
  });

  // ── Announcements / Activity Feed ─────────────────────────────────────

  fastify.get('/gyms/:gymId/announcements', memberAuth, async (request) => {
    const { limit, offset, type } = request.query;
    return classService.listAnnouncements(request.params.gymId, {
      limit: Math.min(Math.max(parseInt(limit) || 50, 1), 100),
      offset: Math.max(parseInt(offset) || 0, 0),
      type,
    });
  });

  // ── At-Risk Members (owner only) ──────────────────────────────────────

  fastify.get('/gyms/:gymId/at-risk-members', authHooks, async (request) => {
    return classService.getAtRiskMembers(request.params.gymId);
  });
}
