import * as marketplace from '../services/marketplace.service.js'
import db from '../config/database.js'

export default async function marketplaceRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC (member-facing) — no auth required
  // ══════════════════════════════════════════════════════════════════════════

  // List available services
  fastify.get('/gyms/:gymId/services', async (request, reply) => {
    const { gymId } = request.params
    const { type } = request.query
    const services = await marketplace.listServices(gymId, { type })
    return reply.send({ services })
  })

  // Get service details
  fastify.get('/gyms/:gymId/services/:serviceId', async (request, reply) => {
    const service = await marketplace.getService(request.params.serviceId)
    return reply.send({ service })
  })

  // List professional profiles (trainers)
  fastify.get('/gyms/:gymId/trainers', async (request, reply) => {
    const { gymId } = request.params
    const { type } = request.query
    const trainers = await marketplace.listProfiles(gymId, { type })
    return reply.send({ trainers })
  })

  // Member leaderboard
  fastify.get('/gyms/:gymId/leaderboard', async (request, reply) => {
    const { gymId } = request.params
    const { type = 'consistency' } = request.query

    if (type === 'consistency') {
      // Most check-in days this month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

      const rows = await db('checkins')
        .where({ gym_id: gymId })
        .whereBetween('checked_in_at', [startOfMonth, endOfMonth])
        .join('members', 'checkins.member_id', 'members.id')
        .select('members.id', 'members.name', 'members.photo_url')
        .count('* as check_in_days')
        .groupBy('members.id', 'members.name', 'members.photo_url')
        .orderBy('check_in_days', 'desc')
        .limit(20)

      const leaderboard = rows.map((row, i) => ({
        rank: i + 1,
        memberId: row.id,
        name: row.name,
        photoUrl: row.photo_url,
        value: parseInt(row.check_in_days, 10),
        metric: 'check_in_days',
      }))

      return reply.send({ type, leaderboard })
    }

    // For strength/points, return placeholder structure
    return reply.send({
      type,
      leaderboard: [],
      message: `${type} leaderboard coming soon`,
    })
  })

  // Gym feed / announcements
  fastify.get('/gyms/:gymId/feed', async (request, reply) => {
    // No feed table yet — return demo data
    return reply.send({
      feed: [
        {
          id: 'demo-1',
          type: 'announcement',
          title: 'Welcome to the gym community!',
          body: 'Stay tuned for updates, challenges, and events.',
          created_at: new Date().toISOString(),
        },
      ],
    })
  })

  // Live check-ins (last 2 hours, opted-in members)
  fastify.get('/gyms/:gymId/checkins/live', async (request, reply) => {
    const { gymId } = request.params
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

    const liveCheckins = await db('checkins')
      .where({ 'checkins.gym_id': gymId })
      .where('checkins.checked_in_at', '>=', twoHoursAgo)
      .whereNull('checkins.checked_out_at')
      .join('members', 'checkins.member_id', 'members.id')
      .select(
        'checkins.id as checkin_id',
        'members.id as member_id',
        'members.name',
        'members.photo_url',
        'checkins.checked_in_at'
      )
      .orderBy('checkins.checked_in_at', 'desc')

    return reply.send({ count: liveCheckins.length, checkins: liveCheckins })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GYM OWNER (auth required)
  // ══════════════════════════════════════════════════════════════════════════

  // Create professional profile
  fastify.post('/gyms/:gymId/trainers', {
    ...authHooks,
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', minLength: 2 },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          type: { type: 'string', enum: ['trainer', 'dietitian', 'physio', 'yoga'] },
          bio: { type: 'string' },
          specialties: { type: 'array', items: { type: 'string' } },
          certifications: { type: 'array' },
          photo_url: { type: 'string' },
          staff_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const profile = await marketplace.createProfile(request.params.gymId, request.body)
    return reply.code(201).send({ profile })
  })

  // Update professional profile
  fastify.patch('/gyms/:gymId/trainers/:trainerId', authHooks, async (request, reply) => {
    const profile = await marketplace.updateProfile(request.params.trainerId, request.body)
    return reply.send({ profile })
  })

  // Create health service
  fastify.post('/gyms/:gymId/services', {
    ...authHooks,
    schema: {
      body: {
        type: 'object',
        required: ['professional_id', 'title', 'type', 'price_paise'],
        properties: {
          professional_id: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 2 },
          description: { type: 'string' },
          type: { type: 'string', enum: ['pt_session', 'diet_plan', 'physio', 'yoga', 'group_class', 'custom_pack'] },
          price_paise: { type: 'integer', minimum: 100 },
          duration_minutes: { type: 'integer', minimum: 1 },
          validity_period: { type: 'string' },
          max_sessions: { type: 'integer', minimum: 1 },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { professional_id, ...rest } = request.body
    const service = await marketplace.createService(request.params.gymId, professional_id, rest)
    return reply.code(201).send({ service })
  })

  // List all bookings for a gym
  fastify.get('/gyms/:gymId/bookings', authHooks, async (request, reply) => {
    const { gymId } = request.params
    const { member_id, professional_id, status, page, limit } = request.query
    const result = await marketplace.listBookings(gymId, {
      memberId: member_id,
      professionalId: professional_id,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    })
    return reply.send(result)
  })

  // Update booking status
  fastify.patch('/gyms/:gymId/bookings/:bookingId', {
    ...authHooks,
    schema: {
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] },
        },
      },
    },
  }, async (request, reply) => {
    const booking = await marketplace.updateBookingStatus(request.params.bookingId, request.body.status)
    return reply.send({ booking })
  })

  // Post announcement (demo — no feed table yet)
  fastify.post('/gyms/:gymId/feed', authHooks, async (request, reply) => {
    // Placeholder until feed table is created
    return reply.code(201).send({
      message: 'Feed post created (demo)',
      post: {
        id: crypto.randomUUID(),
        ...request.body,
        created_at: new Date().toISOString(),
      },
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // TRAINER
  // ══════════════════════════════════════════════════════════════════════════

  // Trainer earnings summary
  fastify.get('/gyms/:gymId/trainers/:trainerId/earnings', async (request, reply) => {
    const earnings = await marketplace.getTrainerEarnings(request.params.trainerId)
    return reply.send({ earnings })
  })

  // Trainer's bookings
  fastify.get('/gyms/:gymId/trainers/:trainerId/bookings', async (request, reply) => {
    const { gymId, trainerId } = request.params
    const { status, page, limit } = request.query
    const result = await marketplace.listBookings(gymId, {
      professionalId: trainerId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    })
    return reply.send(result)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // MEMBER (auth required)
  // ══════════════════════════════════════════════════════════════════════════

  // Create booking
  fastify.post('/gyms/:gymId/bookings', {
    preHandler: [fastify.verifyToken],
    schema: {
      body: {
        type: 'object',
        required: ['service_id', 'member_id', 'booking_date'],
        properties: {
          service_id: { type: 'string', format: 'uuid' },
          member_id: { type: 'string', format: 'uuid' },
          booking_date: { type: 'string', format: 'date' },
          start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$' },
          end_time: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const booking = await marketplace.createBooking(request.params.gymId, request.body)
    return reply.code(201).send({ booking })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // SUPER ADMIN
  // ══════════════════════════════════════════════════════════════════════════

  // Approve/reject trainer verification
  fastify.patch('/super/trainers/:trainerId/verify', {
    preHandler: [fastify.verifyToken],
    schema: {
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected'] },
        },
      },
    },
  }, async (request, reply) => {
    const profile = await marketplace.verifyProfile(request.params.trainerId, request.body.status)
    return reply.send({ profile })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // LEGAL
  // ══════════════════════════════════════════════════════════════════════════

  // Record legal consent
  fastify.post('/gyms/:gymId/legal/consent', {
    schema: {
      body: {
        type: 'object',
        required: ['user_id', 'user_type', 'contract_version', 'contract_type'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          user_type: { type: 'string', enum: ['trainer', 'member', 'owner'] },
          contract_version: { type: 'string' },
          contract_type: { type: 'string', enum: ['platform_participation', 'terms_of_service', 'privacy_policy'] },
        },
      },
    },
  }, async (request, reply) => {
    const { user_id, user_type, contract_version, contract_type } = request.body
    const consent = await marketplace.recordConsent(user_id, user_type, {
      contractVersion: contract_version,
      contractType: contract_type,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    })
    return reply.code(201).send({ consent })
  })
}
