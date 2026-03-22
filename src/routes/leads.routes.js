import db from '../config/database.js'

async function verifyAdmin(request, reply) {
  const secret = request.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}

export default async function leadsRoutes(fastify) {
  // POST /leads — public, no auth
  fastify.post('/leads', async (request, reply) => {
    const { name, gym_name, phone, email, package_interest } = request.body || {}

    if (!name || !gym_name || !phone || !email) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'name, gym_name, phone, and email are required' })
    }

    const [lead] = await db('leads').insert({
      name,
      gym_name,
      phone,
      email,
      package_interest: package_interest || null,
      source: 'landing',
      status: 'new',
    }).returning('*')

    // TODO: Send notification email (WATI / SendGrid)
    request.log.info({ leadId: lead.id, email, gym_name }, 'New lead captured — notification email pending')

    return reply.code(201).send({
      success: true,
      message: 'Thank you! Our team will reach out shortly.',
    })
  })

  // GET /leads/stats — admin only
  fastify.get('/leads/stats', {
    preHandler: [verifyAdmin],
  }, async (request, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [{ count: totalLeads }] = await db('leads')
      .where('created_at', '>=', startOfMonth)
      .count('id as count')

    const [{ count: convertedLeads }] = await db('leads')
      .where('created_at', '>=', startOfMonth)
      .where('status', 'converted')
      .count('id as count')

    const total = Number(totalLeads)
    const converted = Number(convertedLeads)
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'

    // Projected revenue from active (non-converted, non-lost) leads
    const activeLeads = await db('leads')
      .whereNotIn('status', ['converted', 'lost'])

    const packagePrices = {
      starter: 1200000,   // ₹12,000 in paise
      growth: 2400000,    // ₹24,000 in paise
      pro: 4800000,       // ₹48,000 in paise
      enterprise: 9600000 // ₹96,000 in paise
    }

    const projectedRevenue = activeLeads.reduce((sum, lead) => {
      const pkg = (lead.package_interest || '').toLowerCase()
      return sum + (packagePrices[pkg] || 0)
    }, 0)

    return reply.send({
      total_leads: total,
      converted_leads: converted,
      conversion_rate: Number(conversionRate),
      projected_revenue: projectedRevenue,
    })
  })

  // GET /leads — admin only
  fastify.get('/leads', {
    preHandler: [verifyAdmin],
  }, async (request, reply) => {
    const { page = 1, limit = 50, status, assigned_to, sort = 'created_at:desc' } = request.query || {}
    const offset = (page - 1) * limit

    let query = db('leads')
    let countQuery = db('leads')

    if (status) {
      query = query.where('status', status)
      countQuery = countQuery.where('status', status)
    }

    if (assigned_to) {
      query = query.where('assigned_to', assigned_to)
      countQuery = countQuery.where('assigned_to', assigned_to)
    }

    // Parse sort param (e.g. "created_at:desc", "name:asc")
    const [sortCol, sortDir] = sort.split(':')
    const allowedSortCols = ['created_at', 'updated_at', 'name', 'gym_name', 'status', 'package_interest']
    const safeCol = allowedSortCols.includes(sortCol) ? sortCol : 'created_at'
    const safeDir = sortDir === 'asc' ? 'asc' : 'desc'

    query = query.orderBy(safeCol, safeDir)

    const [leads, [{ count }]] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery.count('id as count'),
    ])

    return reply.send({
      leads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(count),
        pages: Math.ceil(Number(count) / limit),
      },
    })
  })

  // PATCH /leads/:id — admin only
  fastify.patch('/leads/:id', {
    preHandler: [verifyAdmin],
  }, async (request, reply) => {
    const { id } = request.params
    const { status, notes, assigned_to, owner_name } = request.body || {}

    const updates = { updated_at: new Date() }
    if (status) updates.status = status
    if (notes !== undefined) updates.notes = notes
    if (assigned_to !== undefined) updates.assigned_to = assigned_to
    if (owner_name !== undefined) updates.owner_name = owner_name

    const [lead] = await db('leads').where('id', id).update(updates).returning('*')

    if (!lead) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Lead not found' })
    }

    return reply.send({ lead })
  })

  // PUT /leads/:id/convert — admin only
  fastify.put('/leads/:id/convert', {
    preHandler: [verifyAdmin],
  }, async (request, reply) => {
    const { id } = request.params

    const lead = await db('leads').where('id', id).first()
    if (!lead) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Lead not found' })
    }

    if (lead.status === 'converted') {
      return reply.code(400).send({ error: 'ALREADY_CONVERTED', message: 'Lead is already converted' })
    }

    // Map package_interest to package_type
    const packageMap = {
      starter: 'starter',
      growth: 'growth',
      pro: 'pro',
      enterprise: 'enterprise',
    }
    const packageType = packageMap[(lead.package_interest || '').toLowerCase()] || 'starter'

    // Create gym from lead data
    const [gym] = await db('gyms').insert({
      gym_name: lead.gym_name,
      owner_name: lead.owner_name || lead.name,
      phone: lead.phone,
      email: lead.email,
      package_type: packageType,
      status: 'trial',
    }).returning('*')

    // Update lead
    await db('leads').where('id', id).update({
      status: 'converted',
      converted_at: new Date(),
      converted_gym_id: gym.id,
      updated_at: new Date(),
    })

    return reply.send({
      success: true,
      gym,
      message: `Lead converted to gym: ${gym.gym_name}`,
    })
  })
}
