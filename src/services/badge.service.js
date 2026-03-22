import db from '../config/database.js'

const BADGE_DEFINITIONS = [
  { type: 'first_checkin', name: 'First Step', icon: '👟' },
  { type: 'streak_7', name: '7-Day Warrior', icon: '🔥' },
  { type: 'streak_30', name: '30-Day Beast', icon: '💪' },
  { type: 'streak_100', name: '100-Day Legend', icon: '🏆' },
  { type: 'early_bird', name: '5 AM Club', icon: '🌅' },
  { type: 'consistency_30', name: 'Iron Regular', icon: '⚡' },
  { type: 'power_lifter', name: 'Power Lifter', icon: '🏋️' },
  { type: 'social_butterfly', name: 'Social Butterfly', icon: '🦋' },
]

export { BADGE_DEFINITIONS }

export async function getMemberBadges(memberId, gymId) {
  return db('member_badges')
    .where({ member_id: memberId, gym_id: gymId })
    .orderBy('earned_at', 'desc')
}

export async function awardBadge(memberId, gymId, badgeType) {
  const def = BADGE_DEFINITIONS.find(b => b.type === badgeType)
  if (!def) return null

  // Check if already awarded
  const existing = await db('member_badges')
    .where({ member_id: memberId, gym_id: gymId, badge_type: badgeType })
    .first()
  if (existing) return existing

  const [badge] = await db('member_badges')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      badge_type: badgeType,
      badge_name: def.name,
      badge_icon: def.icon,
    })
    .returning('*')

  return badge
}

export async function evaluateBadges(memberId, gymId) {
  const awarded = []

  // Total check-ins
  const [{ count: totalCheckins }] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .count()

  if (parseInt(totalCheckins) >= 1) {
    const b = await awardBadge(memberId, gymId, 'first_checkin')
    if (b) awarded.push(b)
  }

  // Streak calculation (consecutive days)
  const checkinDays = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .select(db.raw('DISTINCT DATE(checked_in_at) as day'))
    .orderBy('day', 'desc')

  let streak = 0
  const today = new Date()
  for (let i = 0; i < checkinDays.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const dayStr = expected.toISOString().split('T')[0]
    if (checkinDays[i]?.day?.toISOString?.()?.split('T')[0] === dayStr || String(checkinDays[i]?.day) === dayStr) {
      streak++
    } else break
  }

  if (streak >= 7) { const b = await awardBadge(memberId, gymId, 'streak_7'); if (b) awarded.push(b) }
  if (streak >= 30) { const b = await awardBadge(memberId, gymId, 'streak_30'); if (b) awarded.push(b) }
  if (streak >= 100) { const b = await awardBadge(memberId, gymId, 'streak_100'); if (b) awarded.push(b) }

  // Early bird (5 AM checkins, at least 10)
  const [{ count: earlyCount }] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .whereRaw("EXTRACT(HOUR FROM checked_in_at) < 6")
    .count()

  if (parseInt(earlyCount) >= 10) {
    const b = await awardBadge(memberId, gymId, 'early_bird')
    if (b) awarded.push(b)
  }

  // Consistency (20+ days in current month)
  const [{ count: monthDays }] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .whereRaw("DATE_TRUNC('month', checked_in_at) = DATE_TRUNC('month', CURRENT_DATE)")
    .count(db.raw('DISTINCT DATE(checked_in_at)'))

  if (parseInt(monthDays) >= 20) {
    const b = await awardBadge(memberId, gymId, 'consistency_30')
    if (b) awarded.push(b)
  }

  return awarded
}
