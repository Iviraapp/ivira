import db from '../config/database.js';

// Calculate level from XP (each level requires progressively more XP)
function calculateLevel(totalXp) {
  // Level thresholds: L1=0, L2=100, L3=250, L4=500, L5=1000, L6=1750, L7=2750, ...
  let level = 1;
  let xpNeeded = 100;
  let accumulated = 0;
  while (accumulated + xpNeeded <= totalXp) {
    accumulated += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return { level, currentLevelXp: totalXp - accumulated, nextLevelXp: xpNeeded };
}

export default async function challengeRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // GET /gyms/:gymId/challenges — list all active challenges (global + gym-specific)
  fastify.get('/gyms/:gymId/challenges', authHooks, async (request) => {
    const { gymId } = request.params;
    const { type } = request.query;

    let query = db('challenges')
      .where('is_active', true)
      .where(function () {
        this.whereNull('gym_id').orWhere('gym_id', gymId);
      })
      .orderBy('type')
      .orderBy('difficulty');

    if (type) {
      query = query.where('type', type);
    }

    const challenges = await query;
    return { challenges };
  });

  // GET /gyms/:gymId/members/:memberId/challenges/today — get today's challenge progress
  fastify.get('/gyms/:gymId/members/:memberId/challenges/today', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const today = new Date().toISOString().split('T')[0];

    // Get all active challenges for this gym
    const challenges = await db('challenges')
      .where('is_active', true)
      .where(function () {
        this.whereNull('gym_id').orWhere('gym_id', gymId);
      });

    // Get member's progress for today
    const progress = await db('member_challenges')
      .where({ member_id: memberId, date: today });

    const progressMap = {};
    for (const p of progress) {
      progressMap[p.challenge_id] = p;
    }

    const result = challenges.map(c => ({
      ...c,
      progress: progressMap[c.id]?.progress || 0,
      completed: progressMap[c.id]?.completed || false,
      completed_at: progressMap[c.id]?.completed_at || null,
    }));

    return { date: today, challenges: result };
  });

  // POST /gyms/:gymId/members/:memberId/challenges/:challengeId/progress — update progress
  fastify.post('/gyms/:gymId/members/:memberId/challenges/:challengeId/progress', authHooks, async (request, reply) => {
    const { gymId, memberId, challengeId } = request.params;
    const { increment = 1 } = request.body || {};
    const today = new Date().toISOString().split('T')[0];

    // Get the challenge
    const challenge = await db('challenges').where('id', challengeId).first();
    if (!challenge) {
      return reply.code(404).send({ error: 'Challenge not found' });
    }

    // Upsert member_challenges
    let memberChallenge = await db('member_challenges')
      .where({ member_id: memberId, challenge_id: challengeId, date: today })
      .first();

    let xpAwarded = 0;

    if (!memberChallenge) {
      const newProgress = Math.min(increment, challenge.target_value);
      const completed = newProgress >= challenge.target_value;
      const [inserted] = await db('member_challenges')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          challenge_id: challengeId,
          progress: newProgress,
          completed,
          completed_at: completed ? new Date() : null,
          date: today,
        })
        .returning('*');
      memberChallenge = inserted;
      if (completed) xpAwarded = challenge.reward_xp;
    } else if (!memberChallenge.completed) {
      const newProgress = Math.min(memberChallenge.progress + increment, challenge.target_value);
      const completed = newProgress >= challenge.target_value;
      const [updated] = await db('member_challenges')
        .where('id', memberChallenge.id)
        .update({
          progress: newProgress,
          completed,
          completed_at: completed ? new Date() : null,
        })
        .returning('*');
      memberChallenge = updated;
      if (completed) xpAwarded = challenge.reward_xp;
    }

    // Award XP if challenge was just completed
    if (xpAwarded > 0) {
      const existing = await db('member_xp')
        .where({ gym_id: gymId, member_id: memberId })
        .first();

      if (existing) {
        const newTotalXp = existing.total_xp + xpAwarded;
        const { level } = calculateLevel(newTotalXp);

        // Update streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const streakDays = existing.last_activity_date === yesterdayStr
          ? existing.streak_days + 1
          : (existing.last_activity_date === today ? existing.streak_days : 1);

        await db('member_xp')
          .where('id', existing.id)
          .update({
            total_xp: newTotalXp,
            level,
            streak_days: streakDays,
            last_activity_date: today,
            updated_at: new Date(),
          });
      } else {
        const { level } = calculateLevel(xpAwarded);
        await db('member_xp').insert({
          gym_id: gymId,
          member_id: memberId,
          total_xp: xpAwarded,
          level,
          streak_days: 1,
          last_activity_date: today,
        });
      }
    }

    return {
      challenge: memberChallenge,
      xp_awarded: xpAwarded,
    };
  });

  // GET /gyms/:gymId/members/:memberId/xp — get XP, level, streak
  fastify.get('/gyms/:gymId/members/:memberId/xp', authHooks, async (request) => {
    const { gymId, memberId } = request.params;

    let xpRecord = await db('member_xp')
      .where({ gym_id: gymId, member_id: memberId })
      .first();

    if (!xpRecord) {
      xpRecord = {
        total_xp: 0,
        level: 1,
        streak_days: 0,
        last_activity_date: null,
      };
    }

    const levelInfo = calculateLevel(xpRecord.total_xp);

    return {
      total_xp: xpRecord.total_xp,
      level: xpRecord.level,
      streak_days: xpRecord.streak_days,
      last_activity_date: xpRecord.last_activity_date,
      current_level_xp: levelInfo.currentLevelXp,
      next_level_xp: levelInfo.nextLevelXp,
    };
  });
}
