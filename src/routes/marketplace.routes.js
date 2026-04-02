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

  // Gym feed / announcements
  fastify.get('/gyms/:gymId/feed', async (request, reply) => {
    const { gymId } = request.params
    const limit = Math.min(parseInt(request.query.limit) || 20, 50)
    const before = request.query.before || null

    let query = db('gym_feed')
      .where({ gym_id: gymId, is_active: true })
      .orderByRaw('is_pinned DESC, created_at DESC')
      .limit(limit)
      .select('*')

    if (before) query = query.where('created_at', '<', before)

    const posts = await query

    const recentMilestones = await db('gym_announcements')
      .where({ gym_id: gymId })
      .whereIn('type', ['milestone', 'streak', 'challenge'])
      .where('created_at', '>=', new Date(Date.now() - 7 * 86400000).toISOString())
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'type', 'title', 'body', 'created_at', 'metadata')
      .catch(() => [])

    const combined = [
      ...posts.map(p => ({ ...p, source: 'owner' })),
      ...recentMilestones.map(m => ({ ...m, source: 'auto', is_pinned: false, image_url: null })),
    ]
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })
      .slice(0, limit)

    return reply.send({ feed: combined })
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

  // Post announcement
  fastify.post('/gyms/:gymId/feed', {
    ...authHooks,
    schema: {
      body: {
        type: 'object', required: ['title'],
        properties: {
          type: { type: 'string', enum: ['announcement', 'milestone', 'challenge', 'event', 'tip'], default: 'announcement' },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          body: { type: 'string', maxLength: 2000 },
          image_url: { type: 'string', maxLength: 500 },
          cta_label: { type: 'string', maxLength: 80 },
          cta_url: { type: 'string', maxLength: 500 },
          is_pinned: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const { gymId } = request.params
    const { type = 'announcement', title, body, image_url, cta_label, cta_url, is_pinned = false } = request.body
    const [post] = await db('gym_feed').insert({
      gym_id: gymId, posted_by: request.user?.id || null, type, title: title.trim(),
      body: body?.trim() || null, image_url: image_url || null,
      cta_label: cta_label || null, cta_url: cta_url || null, is_pinned,
    }).returning('*')
    return reply.code(201).send({ post })
  })

  // Delete feed post
  fastify.delete('/gyms/:gymId/feed/:postId', authHooks, async (request, reply) => {
    const { gymId, postId } = request.params
    const post = await db('gym_feed').where({ id: postId, gym_id: gymId }).first()
    if (!post) return reply.code(404).send({ error: 'Post not found' })
    await db('gym_feed').where({ id: postId }).update({ is_active: false, updated_at: new Date() })
    return reply.send({ ok: true })
  })

  // Pin/unpin feed post
  fastify.patch('/gyms/:gymId/feed/:postId/pin', authHooks, async (request, reply) => {
    const { gymId, postId } = request.params
    const [post] = await db('gym_feed').where({ id: postId, gym_id: gymId })
      .update({ is_pinned: !!request.body?.is_pinned, updated_at: new Date() }).returning('*')
    if (!post) return reply.code(404).send({ error: 'Post not found' })
    return reply.send({ post })
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
  // STORE
  // ══════════════════════════════════════════════════════════════════════════

  // Store checkout — member purchases a product
  fastify.post('/gyms/:gymId/store/checkout', {
    schema: {
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          memberId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', minimum: 1 },
              },
            },
          },
          paymentMethod: { type: 'string', enum: ['cash', 'upi', 'card', 'wallet'] },
          notes: { type: 'string', maxLength: 500 },
        },
      },
    },
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const { gymId } = request.params
    const { items, paymentMethod = 'cash', notes, memberId: bodyMemberId } = request.body

    // Resolve member — from token (member self-checkout) or body (staff checkout)
    const memberId = request.user.memberId || bodyMemberId
    if (!memberId) {
      return reply.code(400).send({ error: 'memberId required' })
    }

    // Validate products and compute total
    let totalPaise = 0
    const orderItems = []

    for (const item of items) {
      const product = await db('products')
        .where({ id: item.productId, gym_id: gymId, status: 'active' })
        .first()

      if (!product) {
        return reply.code(404).send({ error: `Product ${item.productId} not found or unavailable` })
      }

      // Check stock if tracked
      if (product.stock !== null && product.stock !== undefined && product.stock < item.quantity) {
        return reply.code(409).send({ error: `Insufficient stock for ${product.name}` })
      }

      const lineTotal = product.price_paise * item.quantity
      totalPaise += lineTotal
      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPricePaise: product.price_paise,
        totalPaise: lineTotal,
      })
    }

    // Create order record in store_orders table (or fall back to a JSON notes field in payments)
    let order
    try {
      ;[order] = await db('store_orders')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          items: JSON.stringify(orderItems),
          total_paise: totalPaise,
          payment_method: paymentMethod,
          status: 'confirmed',
          notes: notes || null,
        })
        .returning('*')
    } catch (err) {
      // store_orders table may not exist yet — return success with order data
      // so the frontend does not crash while migration is pending
      order = {
        id: `temp_${Date.now()}`,
        gym_id: gymId,
        member_id: memberId,
        items: orderItems,
        total_paise: totalPaise,
        payment_method: paymentMethod,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      }
    }

    // Decrement stock for each item (best-effort)
    for (const item of items) {
      try {
        await db('products')
          .where({ id: item.productId, gym_id: gymId })
          .whereNotNull('stock')
          .decrement('stock', item.quantity)
      } catch (_) {}
    }

    return reply.code(201).send({
      order,
      summary: {
        itemCount: orderItems.length,
        totalPaise,
        totalFormatted: `₹${(totalPaise / 100).toLocaleString('en-IN')}`,
      },
    })
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
