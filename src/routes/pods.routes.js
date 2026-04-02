// ═══════════════════════════════════════════════════════════════════
// PODS ROUTES — PATCH FILE
// Two changes from original:
//  1. POST /gyms/:id/pods/:id/messages now accepts type + data fields
//     so WorkoutAnalyzer can post form scores to Circle feed
//  2. NEW: GET /gyms/:id/members/:id/pods/activity
//     HomeScreen Circle live feed — today's activity across all pods
// ═══════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import db from '../config/database.js'
import * as podsService from '../services/pods.service.js'
import * as podNotifications from '../services/pod-notifications.service.js'

async function verifyMemberToken(request, reply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid authorization header' })
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret)
    if (decoded.role !== 'member') {
      return reply.code(403).send({ error: 'Access denied' })
    }
    if (request.params.gymId && decoded.gymId !== request.params.gymId) {
      return reply.code(403).send({ error: 'Access denied' })
    }
    request.member = decoded
    request.effectiveGymId = request.params.gymId || decoded.gymId || null
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }
}

export default async function podRoutes(fastify) {
  const memberAuth = { preHandler: [verifyMemberToken] }
  const ownerAuth = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // Create pod
  fastify.post('/gyms/:gymId/pods', { ...memberAuth, schema: { body: { type: 'object', required: ['name', 'goalType'], properties: { name: { type: 'string', minLength: 1, maxLength: 100 }, goalType: { type: 'string' }, intensity: { type: 'string' }, timePreference: { type: 'string' }, timezone: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const pod = await podsService.createPod({ gymId: request.params.gymId, ...request.body })
      const membership = await podsService.joinPod({ podId: pod.id, memberId: request.member.memberId, role: 'leader' })
      return reply.code(201).send({ pod, membership })
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // List pods
  fastify.get('/gyms/:gymId/pods', memberAuth, async (request, reply) => {
    try {
      const { goalType, intensity, timePreference, timezone } = request.query
      const pods = await podsService.findMatchingPods({ gymId: request.params.gymId, goalType, intensity, timePreference, timezone, excludeMemberId: request.member.memberId })
      return { pods }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Get pod details
  fastify.get('/gyms/:gymId/pods/:podId', memberAuth, async (request, reply) => {
    try {
      const pod = await podsService.getPodWithMembers(request.params.podId)
      if (!pod) return reply.code(404).send({ error: 'Circle not found' })
      const health = await podsService.calculatePodHealth(request.params.podId)
      return { pod, health }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Join pod
  fastify.post('/gyms/:gymId/pods/:podId/join', memberAuth, async (request, reply) => {
    try {
      const membership = await podsService.joinPod({ podId: request.params.podId, memberId: request.member.memberId })
      return reply.code(201).send({ membership })
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Leave pod
  fastify.post('/gyms/:gymId/pods/:podId/leave', memberAuth, async (request, reply) => {
    try {
      const result = await podsService.leavePod({ podId: request.params.podId, memberId: request.member.memberId })
      return { result }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Auto-match
  fastify.post('/gyms/:gymId/pods/auto-match', { ...memberAuth, schema: { body: { type: 'object', required: ['goalType'], properties: { goalType: { type: 'string' }, intensity: { type: 'string' }, timePreference: { type: 'string' }, timezone: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const result = await podsService.autoMatchMember({ gymId: request.params.gymId, memberId: request.member.memberId, ...request.body })
      return reply.code(result.created ? 201 : 200).send(result)
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Get commitments
  fastify.get('/gyms/:gymId/pods/:podId/commitments', memberAuth, async (request, reply) => {
    try {
      const { date } = request.query
      const commitments = await podsService.getPodCommitments(request.params.podId, date)
      return { commitments }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Create commitment
  fastify.post('/gyms/:gymId/pods/:podId/commitments', { ...memberAuth, schema: { body: { type: 'object', required: ['date', 'committedTime', 'commitmentText'], properties: { date: { type: 'string', format: 'date' }, committedTime: { type: 'string' }, commitmentText: { type: 'string', minLength: 1, maxLength: 500 } } } } }, async (request, reply) => {
    try {
      const commitment = await podsService.createCommitment({ memberId: request.member.memberId, podId: request.params.podId, ...request.body })
      return reply.code(201).send({ commitment })
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Circle check-in
  fastify.post('/gyms/:gymId/pods/:podId/checkin', { ...memberAuth, schema: { body: { type: 'object', required: ['commitmentId'], properties: { commitmentId: { type: 'string' }, method: { type: 'string', enum: ['manual', 'qr', 'nfc', 'geofence'] } } } } }, async (request, reply) => {
    try {
      const result = await podsService.checkIn({ commitmentId: request.body.commitmentId, memberId: request.member.memberId, method: request.body.method || 'manual' })
      const streak = await podsService.getMemberStreak(request.member.memberId, request.params.podId)
      podNotifications.notifyPodCheckin(request.params.podId, request.member.name || 'A member', streak.current_streak).catch(() => {})
      return { checkin: result }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Pod feed
  fastify.get('/gyms/:gymId/pods/:podId/feed', memberAuth, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 30
      const before = request.query.before || null
      const after = request.query.after || null
      const feed = await podsService.getPodFeed(request.params.podId, limit, before, after)
      return { feed }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // ─── UPDATED: Send message — now accepts type + data ─────────────────
  // Supports: type='message' (default), 'workout_analysis', 'checkin_proof'
  // WorkoutAnalyzerScreen sends: { text: circleMessage, type: 'workout_analysis', data: { exercise, reps, form_score } }
  fastify.post('/gyms/:gymId/pods/:podId/messages', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1, maxLength: 1000 },
          imageUrl: { type: 'string' },
          // NEW fields for workout analysis and proof posts
          type: {
            type: 'string',
            enum: ['message', 'workout_analysis', 'checkin_proof'],
            default: 'message',
          },
          data: {
            type: 'object',
            additionalProperties: true,
            // Workout analysis fields (all optional)
            properties: {
              exercise:    { type: 'string' },
              reps:        { type: 'number' },
              form_score:  { type: 'number' },
              ai_verified: { type: 'boolean' },
              tips:        { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { text, imageUrl, type = 'message', data = {} } = request.body
      const entry = await podsService.sendMessage({
        podId: request.params.podId,
        memberId: request.member.memberId,
        text,
        imageUrl,
        type,   // pass through type
        data,   // pass through workout analysis data
      })
      return reply.code(201).send(entry)
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Pod stats
  fastify.get('/gyms/:gymId/pods/:podId/stats', memberAuth, async (request, reply) => {
    try {
      const days = parseInt(request.query.days) || 30
      const stats = await podsService.getPodStats(request.params.podId, days)
      return { stats }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Nudge
  fastify.post('/gyms/:gymId/pods/:podId/nudge', { ...memberAuth, schema: { body: { type: 'object', required: ['toMemberId'], properties: { toMemberId: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const nudge = await podsService.sendNudge({ fromMemberId: request.member.memberId, toMemberId: request.body.toMemberId, podId: request.params.podId })
      const pod = await podsService.getPodWithMembers(request.params.podId)
      podNotifications.notifyPodNudge(request.body.toMemberId, nudge.from_name, pod?.name || 'your circle').catch(() => {})
      return reply.code(201).send({ nudge })
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // Member's pods
  fastify.get('/gyms/:gymId/members/:memberId/pods', memberAuth, async (request, reply) => {
    try {
      const pods = await podsService.getMemberPods(request.params.memberId)
      return { pods }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  // ─── NEW: Member's Circle activity today ─────────────────────────────
  // Used by HomeScreen Circle live feed above the fold.
  // Returns today's pod_feed entries across all of the member's active pods.
  fastify.get('/gyms/:gymId/members/:memberId/pods/activity', memberAuth, async (request, reply) => {
    try {
      const { memberId } = request.params

      // Get member's pods
      const pods = await podsService.getMemberPods(memberId)
      if (!pods || pods.length === 0) return { activity: [] }

      const podIds = pods.map(p => p.id)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Fetch today's feed across all pods, join member name
      const rows = await db('pod_feed')
        .whereIn('pod_feed.pod_id', podIds)
        .where('pod_feed.created_at', '>=', today.toISOString())
        .join('members', 'pod_feed.member_id', 'members.id')
        .leftJoin('pods', 'pod_feed.pod_id', 'pods.id')
        .select(
          'pod_feed.id',
          'pod_feed.pod_id',
          'pod_feed.member_id',
          'pod_feed.type',
          'pod_feed.data',
          'pod_feed.created_at as timestamp',
          'members.name as member_name',
          'members.photo_url as member_photo',
          'pods.name as pod_name',
        )
        .orderBy('pod_feed.created_at', 'desc')
        .limit(20)

      const activity = rows.map(row => {
        let data = {}
        try { data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {}) } catch {}
        return {
          id:           row.id,
          pod_id:       row.pod_id,
          pod_name:     row.pod_name,
          member_id:    row.member_id,
          member_name:  row.member_name,
          member_photo: row.member_photo,
          type:         row.type,
          timestamp:    row.timestamp,
          // Flattened fields for easy consumption
          exercise:     data.exercise || null,
          reps:         data.reps || null,
          form_score:   data.form_score || data.form_score_score || null,
          ai_verified:  data.ai_verified || (row.type === 'workout_analysis'),
          workout_type: data.workout_type || data.exercise || null,
          duration_min: data.duration_min || null,
          text:         data.text || null,
          // Raw data for any other fields
          data,
        }
      })

      return { activity }
    } catch (err) {
      request.log.error(err, 'pods/activity failed')
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // ─── Pod Leaderboard ──────────────────────────────────────────────────
  fastify.get('/gyms/:gymId/pods/leaderboard', memberAuth, async (request, reply) => {
    try {
      const { gymId } = request.params
      const since = new Date()
      since.setDate(since.getDate() - 7)

      const rows = await db('pod_members')
        .join('pods', 'pod_members.pod_id', 'pods.id')
        .join('members', 'pod_members.member_id', 'members.id')
        .leftJoin('checkins', function() {
          this.on('checkins.member_id', 'pod_members.member_id')
              .andOn('checkins.gym_id', db.raw('?', [gymId]))
              .andOnVal('checkins.checked_in_at', '>=', since.toISOString())
        })
        .where({ 'pods.gym_id': gymId, 'pods.is_active': true, 'pod_members.status': 'active' })
        .groupBy('pods.id', 'pods.name', 'pods.goal_type', 'pods.tier')
        .select(
          'pods.id', 'pods.name', 'pods.goal_type', 'pods.tier',
          db.raw('COUNT(DISTINCT pod_members.member_id) as member_count'),
          db.raw('COUNT(checkins.id) as weekly_checkins'),
        )
        .orderBy('weekly_checkins', 'desc')
        .limit(10)

      return { leaderboard: rows.map((r, i) => ({
        rank: i + 1, id: r.id, name: r.name, goal_type: r.goal_type, tier: r.tier,
        member_count: parseInt(r.member_count || 0), weekly_checkins: parseInt(r.weekly_checkins || 0),
      })) }
    } catch (err) {
      request.log.error(err, 'pods/leaderboard failed')
      return reply.code(500).send({ error: err.message })
    }
  })

  // ─── Open Squad routes ────────────────────────────────────────────────
  const openAuth = { preHandler: [fastify.verifyToken] }

  fastify.get('/squads', openAuth, async (request, reply) => {
    try {
      const { goalType, intensity, timePreference } = request.query
      const pods = await podsService.findMatchingPods({ gymId: null, goalType, intensity, timePreference, excludeMemberId: request.user.memberId })
      return { pods }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  fastify.post('/squads', { ...openAuth, schema: { body: { type: 'object', required: ['name', 'goalType'], properties: { name: { type: 'string', minLength: 1, maxLength: 100 }, goalType: { type: 'string' }, intensity: { type: 'string' }, timePreference: { type: 'string' } } } } }, async (request, reply) => {
    try {
      const pod = await podsService.createPod({ gymId: null, ...request.body })
      await podsService.joinPod(pod.id, request.user.memberId, 'leader')
      return reply.code(201).send({ pod })
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  fastify.post('/squads/auto-match', openAuth, async (request, reply) => {
    try {
      const result = await podsService.autoMatchMember({ gymId: null, memberId: request.user.memberId, goalType: request.body?.goalType || 'Gym', intensity: request.body?.intensity || 'serious', timePreference: request.body?.timePreference || 'flexible' })
      return { pod: result }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })

  fastify.get('/squads/mine', openAuth, async (request, reply) => {
    try {
      const pods = await podsService.getMemberPods(request.user.memberId)
      return { pods }
    } catch (err) { return reply.code(err.statusCode || 500).send({ error: err.message }) }
  })
}
