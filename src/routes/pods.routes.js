import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import * as podsService from '../services/pods.service.js'
import * as podNotifications from '../services/pod-notifications.service.js'

async function verifyMemberToken(request, reply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid authorization header' })
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret)
    if (decoded.role !== 'member' || decoded.gymId !== request.params.gymId) {
      return reply.code(403).send({ error: 'Access denied' })
    }
    request.member = decoded
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }
}

export default async function podRoutes(fastify) {
  const memberAuth = { preHandler: [verifyMemberToken] }
  const ownerAuth = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // Create a pod
  fastify.post('/gyms/:gymId/pods', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['name', 'goalType'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          goalType: { type: 'string' },
          intensity: { type: 'string' },
          timePreference: { type: 'string' },
          timezone: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const pod = await podsService.createPod({
        gymId: request.params.gymId,
        ...request.body,
      })
      const membership = await podsService.joinPod({
        podId: pod.id,
        memberId: request.member.memberId,
        role: 'leader',
      })
      return reply.code(201).send({ pod, membership })
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // List pods for discovery
  fastify.get('/gyms/:gymId/pods', memberAuth, async (request, reply) => {
    try {
      const { goalType, intensity, timePreference, timezone } = request.query
      const pods = await podsService.findMatchingPods({
        gymId: request.params.gymId,
        goalType,
        intensity,
        timePreference,
        timezone,
        excludeMemberId: request.member.memberId,
      })
      return { pods }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Get pod details with members
  fastify.get('/gyms/:gymId/pods/:podId', memberAuth, async (request, reply) => {
    try {
      const pod = await podsService.getPodWithMembers(request.params.podId)
      if (!pod) {
        return reply.code(404).send({ error: 'Pod not found' })
      }
      const health = await podsService.calculatePodHealth(request.params.podId)
      return { pod, health }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Join a pod
  fastify.post('/gyms/:gymId/pods/:podId/join', memberAuth, async (request, reply) => {
    try {
      const membership = await podsService.joinPod({
        podId: request.params.podId,
        memberId: request.member.memberId,
      })
      return reply.code(201).send({ membership })
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Leave a pod
  fastify.post('/gyms/:gymId/pods/:podId/leave', memberAuth, async (request, reply) => {
    try {
      const result = await podsService.leavePod({
        podId: request.params.podId,
        memberId: request.member.memberId,
      })
      return { result }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Auto-match into a pod
  fastify.post('/gyms/:gymId/pods/auto-match', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['goalType'],
        properties: {
          goalType: { type: 'string' },
          intensity: { type: 'string' },
          timePreference: { type: 'string' },
          timezone: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await podsService.autoMatchMember({
        gymId: request.params.gymId,
        memberId: request.member.memberId,
        ...request.body,
      })
      return reply.code(result.created ? 201 : 200).send(result)
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Get pod commitments for a date
  fastify.get('/gyms/:gymId/pods/:podId/commitments', memberAuth, async (request, reply) => {
    try {
      const { date } = request.query
      const commitments = await podsService.getPodCommitments(request.params.podId, date)
      return { commitments }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Create a commitment
  fastify.post('/gyms/:gymId/pods/:podId/commitments', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['date', 'committedTime', 'commitmentText'],
        properties: {
          date: { type: 'string', format: 'date' },
          committedTime: { type: 'string' },
          commitmentText: { type: 'string', minLength: 1, maxLength: 500 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const commitment = await podsService.createCommitment({
        memberId: request.member.memberId,
        podId: request.params.podId,
        date: request.body.date,
        committedTime: request.body.committedTime,
        commitmentText: request.body.commitmentText,
      })
      return reply.code(201).send({ commitment })
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Check in (fulfill commitment)
  fastify.post('/gyms/:gymId/pods/:podId/checkin', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['commitmentId'],
        properties: {
          commitmentId: { type: 'string' },
          method: { type: 'string', enum: ['manual', 'qr', 'nfc', 'geofence'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await podsService.checkIn({
        commitmentId: request.body.commitmentId,
        memberId: request.member.memberId,
        method: request.body.method || 'manual',
      })
      // Fire-and-forget: notify pod members
      const streak = await podsService.getMemberStreak(request.member.memberId, request.params.podId)
      podNotifications.notifyPodCheckin(request.params.podId, request.member.name || 'A member', streak.current_streak).catch(() => {})
      return { checkin: result }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Pod activity feed (with cursor pagination for chat)
  fastify.get('/gyms/:gymId/pods/:podId/feed', memberAuth, async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 30
      const before = request.query.before || null
      const after = request.query.after || null
      const feed = await podsService.getPodFeed(request.params.podId, limit, before, after)
      return { feed }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Send message in pod chat
  fastify.post('/gyms/:gymId/pods/:podId/messages', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1, maxLength: 1000 },
          imageUrl: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const entry = await podsService.sendMessage({
        podId: request.params.podId,
        memberId: request.user.memberId,
        text: request.body.text,
        imageUrl: request.body.imageUrl,
      })
      return reply.code(201).send(entry)
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Pod statistics
  fastify.get('/gyms/:gymId/pods/:podId/stats', memberAuth, async (request, reply) => {
    try {
      const days = parseInt(request.query.days) || 30
      const stats = await podsService.getPodStats(request.params.podId, days)
      return { stats }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Send nudge to a member
  fastify.post('/gyms/:gymId/pods/:podId/nudge', {
    ...memberAuth,
    schema: {
      body: {
        type: 'object',
        required: ['toMemberId'],
        properties: {
          toMemberId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const nudge = await podsService.sendNudge({
        fromMemberId: request.member.memberId,
        toMemberId: request.body.toMemberId,
        podId: request.params.podId,
      })
      // Fire-and-forget: send nudge push
      const pod = await podsService.getPodWithMembers(request.params.podId)
      podNotifications.notifyPodNudge(request.body.toMemberId, nudge.from_name, pod?.name || 'your pod').catch(() => {})
      return reply.code(201).send({ nudge })
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })

  // Get member's pods
  fastify.get('/gyms/:gymId/members/:memberId/pods', memberAuth, async (request, reply) => {
    try {
      const pods = await podsService.getMemberPods(request.params.memberId)
      return { pods }
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  })
}
