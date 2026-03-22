import db from '../config/database.js';

export default async function achievementRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken] };
  const ownerHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // GET /achievements — list all achievements
  fastify.get('/achievements', authHooks, async (request) => {
    const { category } = request.query;
    let query = db('achievements').orderBy('category').orderBy('criteria_value');
    if (category) {
      query = query.where('category', category);
    }
    const achievements = await query;
    return { achievements };
  });

  // GET /gyms/:gymId/members/:memberId/achievements — list earned achievements
  fastify.get('/gyms/:gymId/members/:memberId/achievements', ownerHooks, async (request) => {
    const { memberId } = request.params;

    const earned = await db('member_achievements')
      .join('achievements', 'member_achievements.achievement_id', 'achievements.id')
      .where('member_achievements.member_id', memberId)
      .select(
        'achievements.*',
        'member_achievements.earned_at'
      )
      .orderBy('member_achievements.earned_at', 'desc');

    return { achievements: earned };
  });

  // POST /gyms/:gymId/members/:memberId/achievements/evaluate — check and award new achievements
  fastify.post('/gyms/:gymId/members/:memberId/achievements/evaluate', ownerHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;

    // Get all achievements not yet earned by this member
    const allAchievements = await db('achievements');
    const earnedIds = await db('member_achievements')
      .where('member_id', memberId)
      .pluck('achievement_id');

    const unearnedAchievements = allAchievements.filter(a => !earnedIds.includes(a.id));
    if (unearnedAchievements.length === 0) {
      return { newly_earned: [] };
    }

    // Gather member stats for evaluation
    const stats = {};

    // Workout count (checkins)
    const workoutResult = await db('checkins')
      .where({ member_id: memberId, gym_id: gymId })
      .count('id as count')
      .first();
    stats.workout_count = parseInt(workoutResult?.count || 0);

    // Fasting count (from fasting_sessions if exists, or challenges completed)
    try {
      const fastingResult = await db('fasting_logs')
        .where({ member_id: memberId })
        .where('completed', true)
        .count('id as count')
        .first();
      stats.fasting_count = parseInt(fastingResult?.count || 0);
    } catch {
      // fasting_logs table may not exist, fallback to challenge completions
      const fastingChallenges = await db('member_challenges')
        .join('challenges', 'member_challenges.challenge_id', 'challenges.id')
        .where({ 'member_challenges.member_id': memberId, 'challenges.category': 'fasting', 'member_challenges.completed': true })
        .count('member_challenges.id as count')
        .first();
      stats.fasting_count = parseInt(fastingChallenges?.count || 0);
    }

    // Streak from member_xp
    const xpRecord = await db('member_xp')
      .where({ gym_id: gymId, member_id: memberId })
      .first();
    stats.fasting_streak = xpRecord?.streak_days || 0;
    stats.activity_streak = xpRecord?.streak_days || 0;

    // Referral count
    try {
      const referralResult = await db('referral_redemptions')
        .where('referrer_member_id', memberId)
        .where('status', 'completed')
        .count('id as count')
        .first();
      stats.referral_count = parseInt(referralResult?.count || 0);
    } catch {
      stats.referral_count = 0;
    }

    // Nutrition days (from nutrition logs or challenges)
    const nutritionChallenges = await db('member_challenges')
      .join('challenges', 'member_challenges.challenge_id', 'challenges.id')
      .where({ 'member_challenges.member_id': memberId, 'challenges.category': 'nutrition', 'member_challenges.completed': true })
      .countDistinct('member_challenges.date as count')
      .first();
    stats.nutrition_days = parseInt(nutritionChallenges?.count || 0);
    stats.macro_days = stats.nutrition_days;

    // Hydration days
    const hydrationChallenges = await db('member_challenges')
      .join('challenges', 'member_challenges.challenge_id', 'challenges.id')
      .where({ 'member_challenges.member_id': memberId, 'challenges.category': 'hydration', 'member_challenges.completed': true })
      .countDistinct('member_challenges.date as count')
      .first();
    stats.hydration_days = parseInt(hydrationChallenges?.count || 0);

    // Early/late workout detection
    const earlyCheckin = await db('checkins')
      .where({ member_id: memberId, gym_id: gymId })
      .whereRaw("EXTRACT(HOUR FROM checked_in_at) < 5")
      .first();
    stats.early_workout = earlyCheckin ? 1 : 0;

    const lateCheckin = await db('checkins')
      .where({ member_id: memberId, gym_id: gymId })
      .whereRaw("EXTRACT(HOUR FROM checked_in_at) >= 22")
      .first();
    stats.late_workout = lateCheckin ? 1 : 0;

    // Evaluate and award
    const newlyEarned = [];
    for (const achievement of unearnedAchievements) {
      const statValue = stats[achievement.criteria_type] || 0;
      if (statValue >= achievement.criteria_value) {
        const [earned] = await db('member_achievements')
          .insert({
            gym_id: gymId,
            member_id: memberId,
            achievement_id: achievement.id,
          })
          .returning('*');

        newlyEarned.push({
          ...achievement,
          earned_at: earned.earned_at,
        });
      }
    }

    return reply.code(200).send({ newly_earned: newlyEarned, stats });
  });
}
