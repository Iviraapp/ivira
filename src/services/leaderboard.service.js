import db from '../config/database.js'

export async function syncDailyActivity(gymId, memberId, { steps, date, source, distanceKm, activeMinutes, caloriesBurned }) {
  const [record] = await db('daily_activity')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      date,
      steps: steps || 0,
      distance_km: distanceKm || (steps * 0.0008),
      source: source || 'manual',
      active_minutes: activeMinutes || 0,
      calories_burned: caloriesBurned || 0,
    })
    .onConflict(['member_id', 'date'])
    .merge({
      steps: steps || 0,
      distance_km: distanceKm || (steps * 0.0008),
      source: source || 'manual',
      active_minutes: activeMinutes || 0,
      calories_burned: caloriesBurned || 0,
      updated_at: new Date(),
    })
    .returning('*')
  return record
}

export async function getGymLeaderboard(gymId, { date, limit = 20 } = {}) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const rankings = await db('daily_activity')
    .where({ gym_id: gymId, date: targetDate })
    .join('members', 'daily_activity.member_id', 'members.id')
    .select(
      'members.id as member_id',
      'members.name',
      'daily_activity.steps',
      'daily_activity.distance_km',
      'daily_activity.calories_burned',
    )
    .orderBy('daily_activity.steps', 'desc')
    .limit(limit)

  return rankings.map((r, i) => ({ ...r, rank: i + 1 }))
}

export async function getCityLeaderboard(city, { date, limit = 20 } = {}) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const rankings = await db('daily_activity')
    .where({ date: targetDate })
    .join('members', 'daily_activity.member_id', 'members.id')
    .where('members.city', city)
    .where('members.show_location_data', true)
    .select(
      'members.id as member_id',
      'members.name',
      'members.subscription_tier',
      'daily_activity.steps',
      'daily_activity.distance_km',
    )
    .orderBy('daily_activity.steps', 'desc')
    .limit(limit)

  return rankings.map((r, i) => ({ ...r, rank: i + 1 }))
}

export async function getMemberStreak(memberId) {
  const rows = await db('daily_activity')
    .where({ member_id: memberId })
    .where('steps', '>', 0)
    .orderBy('date', 'desc')
    .select('date')
    .limit(90)

  if (rows.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const rowDate = new Date(rows[i].date)
    rowDate.setHours(0, 0, 0, 0)

    if (rowDate.getTime() === expected.getTime()) {
      streak++
    } else {
      break
    }
  }
  return streak
}
