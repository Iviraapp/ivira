import db from '../config/database.js';

export async function getProfile(memberId) {
  let profile = await db('member_profiles').where({ member_id: memberId }).first();
  if (!profile) {
    // Auto-create profile on first access
    [profile] = await db('member_profiles')
      .insert({ member_id: memberId })
      .returning('*');
  }
  return profile;
}

export async function updateProfile(memberId, updates) {
  const allowed = [
    'primary_goal', 'is_onboarded', 'biometric_enabled', 'biometric_credential_id',
    'health_sync_provider', 'daily_step_goal', 'current_weight_grams',
    'target_weight_grams', 'height_cm',
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  filtered.updated_at = new Date();
  if (filtered.is_onboarded) filtered.onboarded_at = new Date();

  const existing = await db('member_profiles').where({ member_id: memberId }).first();
  if (existing) {
    const [updated] = await db('member_profiles')
      .where({ member_id: memberId })
      .update(filtered)
      .returning('*');
    return updated;
  }
  const [created] = await db('member_profiles')
    .insert({ member_id: memberId, ...filtered })
    .returning('*');
  return created;
}

export async function getTransformationPhotos(memberId, privacy = null) {
  let query = db('transformation_photos').where({ member_id: memberId });
  if (privacy) query = query.where('privacy', '!=', 'private');
  return query.orderBy('created_at', 'desc');
}

export async function addTransformationPhoto(memberId, gymId, data) {
  const [photo] = await db('transformation_photos')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      image_url: data.image_url,
      placeholder_url: data.placeholder_url || null,
      privacy: data.privacy || 'private',
      category: data.category || 'progress',
      taken_at: data.taken_at || new Date(),
    })
    .returning('*');
  return photo;
}

export async function getAchievements(memberId) {
  return db('member_achievements')
    .where({ member_id: memberId })
    .orderBy('earned_at', 'desc');
}

export async function addAchievement(memberId, gymId, type, metadata = {}) {
  // Prevent duplicates
  const existing = await db('member_achievements')
    .where({ member_id: memberId, achievement_type: type })
    .first();
  if (existing) return existing;

  const [achievement] = await db('member_achievements')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      achievement_type: type,
      metadata: JSON.stringify(metadata),
    })
    .returning('*');
  return achievement;
}
