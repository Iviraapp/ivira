import * as walletService from '../services/wallet.service.js'
import * as badgeService from '../services/badge.service.js'
import * as walletPassService from '../services/wallet-pass.service.js'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'

// Verify member JWT (member-facing endpoints)
async function verifyMemberToken(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing authorization' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret);
    if (decoded.role !== 'member') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    request.member = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}

export default async function walletRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // ── Wallet Passes (Apple / Google) ──────────────────────────────

  // Google Wallet pass — member-facing (uses member JWT)
  fastify.get('/gyms/:gymId/members/:memberId/wallet/google-pass', {
    preHandler: [verifyMemberToken],
  }, async (request, reply) => {
    const { gymId, memberId } = request.params
    // Verify the member is requesting their own pass
    if (request.member.memberId !== memberId) {
      return reply.code(403).send({ error: 'Can only generate your own pass' })
    }
    const result = await walletPassService.generateGoogleWalletPass(gymId, memberId)
    return { saveUrl: result.saveUrl, passId: result.passId }
  })

  // Apple Wallet pass — member-facing
  fastify.get('/gyms/:gymId/members/:memberId/wallet/apple-pass', {
    preHandler: [verifyMemberToken],
  }, async (request, reply) => {
    const { gymId, memberId } = request.params
    if (request.member.memberId !== memberId) {
      return reply.code(403).send({ error: 'Can only generate your own pass' })
    }
    const result = await walletPassService.generateAppleWalletPass(gymId, memberId)
    // When Apple certs are ready, this will return base64 .pkpass data
    return result
  })

  // GET /gyms/:gymId/members/:memberId/wallet - Get wallet + transactions
  fastify.get('/gyms/:gymId/members/:memberId/wallet', authHooks, async (request) => {
    const { gymId, memberId } = request.params
    const wallet = await walletService.getWallet(memberId, gymId)
    return { wallet }
  })

  // GET /gyms/:gymId/credit-packs - List available credit packs
  fastify.get('/gyms/:gymId/credit-packs', authHooks, async (request) => {
    const { gymId } = request.params
    const packs = await walletService.getCreditPacks(gymId)
    return { packs }
  })

  // POST /gyms/:gymId/members/:memberId/wallet/purchase - Buy credits
  fastify.post('/gyms/:gymId/members/:memberId/wallet/purchase', {
    ...authHooks,
    schema: {
      body: {
        type: 'object',
        required: ['packId'],
        properties: {
          packId: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { gymId, memberId } = request.params
    const { packId } = request.body
    const wallet = await walletService.purchaseCredits(memberId, gymId, packId)
    return { wallet }
  })

  // POST /gyms/:gymId/members/:memberId/wallet/spend - Spend credits
  fastify.post('/gyms/:gymId/members/:memberId/wallet/spend', {
    ...authHooks,
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'description'],
        properties: {
          amount: { type: 'integer', minimum: 1 },
          description: { type: 'string' },
          referenceId: { type: 'string' },
          referenceType: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { gymId, memberId } = request.params
    const { amount, description, referenceId, referenceType } = request.body
    const wallet = await walletService.spendCredits(memberId, gymId, amount, {
      description,
      referenceId,
      referenceType,
    })
    return { wallet }
  })

  // GET /gyms/:gymId/members/:memberId/badges - Get member badges
  fastify.get('/gyms/:gymId/members/:memberId/badges', authHooks, async (request) => {
    const { gymId, memberId } = request.params
    const badges = await badgeService.getMemberBadges(memberId, gymId)
    return { badges }
  })

  // POST /gyms/:gymId/members/:memberId/badges/evaluate - Trigger badge evaluation
  fastify.post('/gyms/:gymId/members/:memberId/badges/evaluate', authHooks, async (request) => {
    const { gymId, memberId } = request.params
    const awarded = await badgeService.evaluateBadges(memberId, gymId)
    return { awarded, message: awarded.length > 0 ? `${awarded.length} new badge(s) earned!` : 'No new badges earned' }
  })
}
