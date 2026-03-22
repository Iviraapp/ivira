import * as leaderboardService from '../services/leaderboard.service.js'

export default async function leaderboardRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // Member auth for member-facing endpoints
  async function verifyMemberToken(request, reply) {
    const jwt = (await import('jsonwebtoken')).default
    const config = (await import('../config/index.js')).default
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization' })
    }
    try {
      const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret)
      if (decoded.role !== 'member') {
        return reply.code(403).send({ error: 'Access denied' })
      }
      request.member = decoded
    } catch {
      return reply.code(401).send({ error: 'Invalid token' })
    }
  }

  // Sync daily activity (member endpoint)
  fastify.post('/gyms/:gymId/members/:memberId/health/sync', {
    preHandler: [verifyMemberToken],
    schema: {
      body: {
        type: 'object',
        required: ['steps', 'date'],
        properties: {
          steps: { type: 'integer' },
          date: { type: 'string' },
          source: { type: 'string' },
          distanceKm: { type: 'number' },
          activeMinutes: { type: 'integer' },
          caloriesBurned: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    const record = await leaderboardService.syncDailyActivity(
      request.params.gymId,
      request.params.memberId,
      request.body
    )
    return reply.code(200).send({ activity: record })
  })

  // Gym leaderboard
  fastify.get('/gyms/:gymId/leaderboard', {
    preHandler: [verifyMemberToken],
  }, async (request) => {
    const { date } = request.query
    const rankings = await leaderboardService.getGymLeaderboard(request.params.gymId, { date })
    const streak = await leaderboardService.getMemberStreak(request.member.memberId)
    return { rankings, memberStreak: streak }
  })

  // City leaderboard (Elite only)
  fastify.get('/gyms/:gymId/leaderboard/city', {
    preHandler: [verifyMemberToken],
  }, async (request, reply) => {
    const db = (await import('../config/database.js')).default
    const member = await db('members').where({ id: request.member.memberId }).first()
    if (member.subscription_tier !== 'elite') {
      return reply.code(403).send({ error: 'Elite subscription required' })
    }
    if (!member.city) {
      return reply.code(400).send({ error: 'City not set in profile' })
    }
    const rankings = await leaderboardService.getCityLeaderboard(member.city, { date: request.query.date })
    return { rankings, city: member.city }
  })

  // Owner: member activity overview
  fastify.get('/gyms/:gymId/activity/overview', authHooks, async (request) => {
    const db = (await import('../config/database.js')).default
    const today = new Date().toISOString().split('T')[0]
    const [{ total_steps }] = await db('daily_activity')
      .where({ gym_id: request.params.gymId, date: today })
      .sum('steps as total_steps')
    const [{ active_members }] = await db('daily_activity')
      .where({ gym_id: request.params.gymId, date: today })
      .where('steps', '>', 0)
      .count('* as active_members')
    return {
      date: today,
      totalSteps: parseInt(total_steps || 0),
      activeMembers: parseInt(active_members || 0),
    }
  })
}
