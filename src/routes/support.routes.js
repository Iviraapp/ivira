import db from '../config/database.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'

export default async function supportRoutes(fastify) {

  // ── GYM-FACING ROUTES ──────────────────────────────────────────────────────
  const gymAuth = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // Create support ticket
  fastify.post('/gyms/:gymId/support-tickets', {
    schema: {
      body: {
        type: 'object',
        required: ['subject', 'body'],
        properties: {
          subject: { type: 'string', minLength: 5, maxLength: 200 },
          body: { type: 'string', minLength: 10 },
          category: { type: 'string', enum: ['general', 'billing', 'technical', 'feature'] },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        },
      },
    },
    ...gymAuth,
  }, async (request, reply) => {
    const { gymId } = request.params
    const { subject, body, category = 'general', priority = 'normal' } = request.body
    const [ticket] = await db('support_tickets')
      .insert({ gym_id: gymId, subject, body, category, priority })
      .returning('*')
    return reply.code(201).send({ ticket })
  })

  // List gym's own tickets
  fastify.get('/gyms/:gymId/support-tickets', gymAuth, async (request) => {
    const { gymId } = request.params
    const { status } = request.query
    const query = db('support_tickets').where({ gym_id: gymId }).orderBy('created_at', 'desc')
    if (status) query.andWhere({ status })
    const tickets = await query
    return { tickets }
  })

  // Get single ticket
  fastify.get('/gyms/:gymId/support-tickets/:ticketId', gymAuth, async (request) => {
    const ticket = await db('support_tickets')
      .where({ id: request.params.ticketId, gym_id: request.params.gymId })
      .first()
    if (!ticket) throw new NotFoundError('Ticket')
    return { ticket }
  })

  // ── ADMIN-FACING ROUTES ────────────────────────────────────────────────────
  // Admin auth: check X-Admin-Secret header or admin role
  const adminAuth = {
    preHandler: async (request, reply) => {
      const secret = request.headers['x-admin-secret']
      const { default: config } = await import('../config/index.js')
      if (secret !== config.adminSecret) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
    },
  }

  // List all tickets (admin)
  fastify.get('/super/support-tickets', adminAuth, async (request) => {
    const { status, page = 1, limit = 50 } = request.query
    const offset = (page - 1) * limit
    const query = db('support_tickets')
      .join('gyms', 'support_tickets.gym_id', 'gyms.id')
      .select(
        'support_tickets.*',
        db.raw("COALESCE(gyms.gym_name, gyms.name) as gym_name"),
        'gyms.email as gym_email'
      )
      .orderBy('support_tickets.created_at', 'desc')
      .limit(limit)
      .offset(offset)
    if (status) query.where('support_tickets.status', status)
    const tickets = await query
    const [{ count }] = await db('support_tickets').count('id as count')
    return { tickets, total: Number(count) }
  })

  // Reply to ticket (admin)
  fastify.post('/super/support-tickets/:ticketId/reply', {
    schema: {
      body: {
        type: 'object',
        required: ['reply'],
        properties: {
          reply: { type: 'string', minLength: 1 },
          status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        },
      },
    },
    ...adminAuth,
  }, async (request, reply) => {
    const { ticketId } = request.params
    const { reply: adminReply, status = 'resolved' } = request.body
    const [ticket] = await db('support_tickets')
      .where({ id: ticketId })
      .update({
        admin_reply: adminReply,
        status,
        replied_at: new Date(),
        replied_by: 'IVIRA Support',
        updated_at: new Date(),
      })
      .returning('*')
    if (!ticket) throw new NotFoundError('Ticket')
    return { ticket }
  })

  // Update ticket status (admin)
  fastify.patch('/super/support-tickets/:ticketId', {
    schema: {
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        },
      },
    },
    ...adminAuth,
  }, async (request) => {
    const [ticket] = await db('support_tickets')
      .where({ id: request.params.ticketId })
      .update({ status: request.body.status, updated_at: new Date() })
      .returning('*')
    if (!ticket) throw new NotFoundError('Ticket')
    return { ticket }
  })
}
