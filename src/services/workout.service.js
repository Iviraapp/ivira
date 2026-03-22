import db from '../config/database.js';

export async function logWorkout(memberId, gymId, { workout_type, duration_minutes, calories_burned, notes }) {
  const today = new Date().toISOString().split('T')[0];

  const [log] = await db('workout_logs')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      log_date: today,
      workout_type,
      duration_minutes,
      calories_burned: calories_burned || null,
      notes: notes || null,
    })
    .returning('*');

  return log;
}

export async function getDailyWorkouts(memberId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const workouts = await db('workout_logs')
    .where({ member_id: memberId, log_date: targetDate })
    .orderBy('created_at', 'asc');

  return { date: targetDate, workouts };
}

export async function getWeeklyWorkouts(memberId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const startDate = weekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const rows = await db('workout_logs')
    .where({ member_id: memberId })
    .whereBetween('log_date', [startDate, endDate])
    .select(
      'log_date',
      db.raw('COUNT(*) as workout_count'),
      db.raw('SUM(duration_minutes) as total_duration'),
      db.raw('SUM(calories_burned) as total_calories')
    )
    .groupBy('log_date')
    .orderBy('log_date', 'asc');

  const days = rows.map((r) => ({
    date: r.log_date,
    workoutCount: parseInt(r.workout_count, 10),
    totalDuration: parseInt(r.total_duration, 10),
    totalCalories: r.total_calories ? parseInt(r.total_calories, 10) : 0,
  }));

  return { startDate, endDate, days };
}

export async function getWorkoutStreak(memberId) {
  const today = new Date().toISOString().split('T')[0];

  // Get distinct workout dates ordered descending
  const dates = await db('workout_logs')
    .where({ member_id: memberId })
    .distinct('log_date')
    .orderBy('log_date', 'desc')
    .pluck('log_date');

  const totalWorkouts = await db('workout_logs')
    .where({ member_id: memberId })
    .count('* as count')
    .first();

  let currentStreak = 0;
  let checkDate = new Date(today);

  for (const d of dates) {
    const dateStr = typeof d === 'string' ? d : new Date(d).toISOString().split('T')[0];
    const expectedStr = checkDate.toISOString().split('T')[0];

    if (dateStr === expectedStr) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak,
    totalWorkouts: parseInt(totalWorkouts.count, 10),
  };
}
