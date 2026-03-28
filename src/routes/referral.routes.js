import * as referralService from '../services/referral.service.js';

const redeemSchema = {
  body: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string', minLength: 8, maxLength: 8 },
    },
  },
};

export default async function referralRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken] };

  // Generate or get my referral code
  fastify.post('/gyms/:gymId/referrals/my-code', authHooks, async (request, reply) => {
    const code = await referralService.generateReferralCode(
      request.user.memberId,
      request.params.gymId
    );
    return reply.code(201).send({ referral_code: code });
  });

  // Get my referral code with stats
  fastify.get('/gyms/:gymId/referrals/my-code', authHooks, async (request) => {
    const code = await referralService.getMyReferralCode(
      request.user.memberId,
      request.params.gymId
    );
    return { referral_code: code };
  });

  // Redeem a referral code
  fastify.post('/gyms/:gymId/referrals/redeem', { schema: redeemSchema, ...authHooks }, async (request, reply) => {
    const result = await referralService.redeemReferralCode(
      request.body.code,
      request.user.memberId,
      request.params.gymId
    );
    return reply.code(201).send(result);
  });

  // Get my referral stats
  fastify.get('/gyms/:gymId/referrals/my-stats', authHooks, async (request) => {
    const stats = await referralService.getReferralStats(
      request.user.memberId,
      request.params.gymId
    );
    return { stats };
  });

  // Get gym referral leaderboard
  fastify.get('/gyms/:gymId/referrals/leaderboard', authHooks, async (request) => {
    const { limit } = request.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const leaderboard = await referralService.getGymReferralLeaderboard(
      request.params.gymId,
      safeLimit
    );
    return { leaderboard };
  });
}
