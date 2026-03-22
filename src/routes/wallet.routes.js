import * as walletService from '../services/wallet.service.js'
import * as badgeService from '../services/badge.service.js'

export default async function walletRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

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
