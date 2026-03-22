import db from '../config/database.js'

export default async function supportRoutes(fastify) {
  // Log priority support request
  fastify.post('/gyms/:gymId/support/priority', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner]
  }, async (request, reply) => {
    const { gymId } = request.params
    const { type, source, subject } = request.body || {}

    await db('cron_logs').insert({
      job_name: 'priority_support_request',
      status: 'completed',
      result: JSON.stringify({ gymId, type, source, subject, owner: request.user?.email }),
      started_at: new Date(),
      completed_at: new Date(),
    })

    reply.send({ ok: true })
  })

  // Super admin: list support requests
  fastify.get('/super/support/requests', async (request, reply) => {
    const adminSecret = request.headers['x-admin-secret']
    if (!adminSecret) return reply.code(401).send({ error: 'Unauthorized' })

    const requests = await db('cron_logs')
      .where('job_name', 'priority_support_request')
      .orderBy('created_at', 'desc')
      .limit(100)

    reply.send({ requests })
  })
}
