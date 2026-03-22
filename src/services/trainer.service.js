import db from '../config/database.js';

export async function getTodaySessions(trainerId, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return db('trainer_sessions')
    .where({ trainer_id: trainerId, session_date: targetDate })
    .leftJoin('members', 'trainer_sessions.member_id', 'members.id')
    .select(
      'trainer_sessions.*',
      'members.name as member_name',
      'members.phone as member_phone',
      'members.photo_url as member_photo'
    )
    .orderBy('trainer_sessions.start_time', 'asc');
}

export async function getClients(trainerId, gymId) {
  // Get all unique members who have sessions with this trainer
  const memberIds = await db('trainer_sessions')
    .where({ trainer_id: trainerId })
    .distinct('member_id')
    .pluck('member_id');

  if (memberIds.length === 0) return [];

  return db('members')
    .whereIn('id', memberIds)
    .leftJoin('member_profiles', 'members.id', 'member_profiles.member_id')
    .select(
      'members.id', 'members.name', 'members.phone', 'members.email',
      'members.status', 'members.photo_url',
      'member_profiles.primary_goal', 'member_profiles.current_weight_grams',
      'member_profiles.target_weight_grams', 'member_profiles.health_sync_provider'
    )
    .orderBy('members.name', 'asc');
}

export async function getClientDetail(memberId) {
  const member = await db('members')
    .leftJoin('member_profiles', 'members.id', 'member_profiles.member_id')
    .where('members.id', memberId)
    .select('members.*', 'member_profiles.*', 'members.id as id')
    .first();

  const recentCheckins = await db('checkins')
    .where({ member_id: memberId })
    .orderBy('checked_in_at', 'desc')
    .limit(10);

  const photos = await db('transformation_photos')
    .where({ member_id: memberId })
    .where('privacy', '!=', 'private')
    .orderBy('created_at', 'desc')
    .limit(10);

  const achievements = await db('member_achievements')
    .where({ member_id: memberId })
    .orderBy('earned_at', 'desc')
    .limit(10);

  return { member, recentCheckins, photos, achievements };
}

export async function getEarnings(trainerId, gymId, months = 3) {
  // Get marketplace payouts for this trainer
  const payouts = await db('marketplace_payouts')
    .where({ professional_id: trainerId })
    .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${months} months'`))
    .orderBy('created_at', 'desc');

  const [summary] = await db('marketplace_payouts')
    .where({ professional_id: trainerId })
    .where('created_at', '>=', db.raw("NOW() - INTERVAL '1 month'"))
    .select(
      db.raw('COALESCE(SUM(trainer_payout_paise), 0) as monthly_earnings'),
      db.raw("COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN trainer_payout_paise ELSE 0 END), 0) as paid_amount"),
      db.raw("COALESCE(SUM(CASE WHEN payout_status = 'processing' THEN trainer_payout_paise ELSE 0 END), 0) as pending_amount"),
      db.raw('COUNT(*) as total_sessions')
    );

  return {
    payouts,
    summary: {
      monthlyEarnings: parseInt(summary.monthly_earnings, 10),
      paidAmount: parseInt(summary.paid_amount, 10),
      pendingAmount: parseInt(summary.pending_amount, 10),
      totalSessions: parseInt(summary.total_sessions, 10),
    },
  };
}

export async function createSession(data) {
  const [session] = await db('trainer_sessions')
    .insert({
      trainer_id: data.trainerId,
      member_id: data.memberId,
      gym_id: data.gymId,
      session_date: data.sessionDate,
      start_time: data.startTime,
      end_time: data.endTime || null,
      session_type: data.sessionType || 'pt',
      notes: data.notes || null,
    })
    .returning('*');
  return session;
}

export async function updateSession(sessionId, updates) {
  const allowed = ['status', 'notes', 'rating', 'end_time'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  filtered.updated_at = new Date();

  const [session] = await db('trainer_sessions')
    .where({ id: sessionId })
    .update(filtered)
    .returning('*');
  return session;
}
