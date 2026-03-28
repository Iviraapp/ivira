import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion

function generateCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return code;
}

async function createUniqueCode() {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    const existing = await db('referral_codes').where({ code }).first();
    if (!existing) return code;
  }
  throw new ValidationError('Unable to generate unique referral code, please try again');
}

export async function generateReferralCode(memberId, gymId) {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member');

  // Return existing active code if one exists
  const existing = await db('referral_codes')
    .where({ member_id: memberId, gym_id: gymId, is_active: true })
    .first();
  if (existing) return existing;

  const code = await createUniqueCode();

  const [referralCode] = await db('referral_codes')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      code,
      reward_type: 'free_days',
      reward_value: 7, // default: 7 free days
    })
    .returning('*');

  return referralCode;
}

export async function getMyReferralCode(memberId, gymId) {
  const referralCode = await db('referral_codes')
    .where({ member_id: memberId, gym_id: gymId, is_active: true })
    .first();

  if (!referralCode) return null;

  // Get redemption stats
  const [stats] = await db('referral_redemptions')
    .where({ referral_code_id: referralCode.id })
    .select(
      db.raw('COUNT(*) as total_referrals'),
      db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed_referrals")
    );

  return {
    ...referralCode,
    total_referrals: parseInt(stats.total_referrals, 10),
    completed_referrals: parseInt(stats.completed_referrals, 10),
  };
}

export async function redeemReferralCode(code, newMemberId, gymId) {
  return db.transaction(async (trx) => {
    // Lock the referral code row to prevent race conditions
    const referralCode = await trx('referral_codes')
      .where({ code: code.toUpperCase(), gym_id: gymId })
      .forUpdate()
      .first();

    if (!referralCode) throw new NotFoundError('Referral code');
    if (!referralCode.is_active) throw new ValidationError('Referral code is no longer active');
    if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
      throw new ValidationError('Referral code has expired');
    }
    if (referralCode.max_uses > 0 && referralCode.times_used >= referralCode.max_uses) {
      throw new ValidationError('Referral code has reached maximum uses');
    }
    if (referralCode.member_id === newMemberId) {
      throw new ValidationError('You cannot use your own referral code');
    }

    // Check if this member already redeemed a code for this gym
    const alreadyRedeemed = await trx('referral_redemptions')
      .where({ referred_member_id: newMemberId, gym_id: gymId })
      .first();
    if (alreadyRedeemed) {
      throw new ValidationError('You have already used a referral code for this gym');
    }

    const [redemption] = await trx('referral_redemptions')
      .insert({
        referral_code_id: referralCode.id,
        referrer_member_id: referralCode.member_id,
        referred_member_id: newMemberId,
        gym_id: gymId,
        status: 'pending',
      })
      .returning('*');

    // Increment times_used
    await trx('referral_codes')
      .where({ id: referralCode.id })
      .increment('times_used', 1)
      .update({ updated_at: new Date() });

    return {
      redemption,
      reward: {
        type: referralCode.reward_type,
        value: referralCode.reward_value,
      },
    };
  });
}

export async function applyReferralRewards(redemptionId) {
  const redemption = await db('referral_redemptions').where({ id: redemptionId }).first();
  if (!redemption) throw new NotFoundError('Referral redemption');

  const [updated] = await db('referral_redemptions')
    .where({ id: redemptionId })
    .update({
      referrer_reward_applied: true,
      referred_reward_applied: true,
      status: 'completed',
      updated_at: new Date(),
    })
    .returning('*');

  return updated;
}

export async function getReferralStats(memberId, gymId) {
  const referralCode = await db('referral_codes')
    .where({ member_id: memberId, gym_id: gymId, is_active: true })
    .first();

  if (!referralCode) {
    return { total_referrals: 0, completed_referrals: 0, leaderboard_position: null };
  }

  const [stats] = await db('referral_redemptions')
    .where({ referral_code_id: referralCode.id })
    .select(
      db.raw('COUNT(*) as total_referrals'),
      db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed_referrals")
    );

  // Leaderboard position
  const leaderboard = await db('referral_codes')
    .where({ gym_id: gymId, is_active: true })
    .orderBy('times_used', 'desc')
    .select('member_id', 'times_used');

  const position = leaderboard.findIndex(r => r.member_id === memberId) + 1;

  return {
    code: referralCode.code,
    total_referrals: parseInt(stats.total_referrals, 10),
    completed_referrals: parseInt(stats.completed_referrals, 10),
    leaderboard_position: position || null,
    reward_type: referralCode.reward_type,
    reward_value: referralCode.reward_value,
  };
}

export async function getGymReferralLeaderboard(gymId, limit = 10) {
  const leaderboard = await db('referral_codes')
    .where({ gym_id: gymId, is_active: true })
    .where('times_used', '>', 0)
    .join('members', 'referral_codes.member_id', 'members.id')
    .select(
      'referral_codes.member_id',
      'members.name as member_name',
      'referral_codes.code',
      'referral_codes.times_used'
    )
    .orderBy('referral_codes.times_used', 'desc')
    .limit(limit);

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    member_id: entry.member_id,
    member_name: entry.member_name,
    code: entry.code,
    total_referrals: entry.times_used,
  }));
}
