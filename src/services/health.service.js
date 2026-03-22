import db from '../config/database.js';

export async function logNutrition(gymId, memberId, { mealType, rawInput, items, source, barcode }) {
  const today = new Date().toISOString().split('T')[0];

  // Calculate totals from items array
  const totals = (items || []).reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fats: acc.fats + (item.fats || 0),
      fiber: acc.fiber + (item.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );

  const [log] = await db('daily_nutrition_logs')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      log_date: today,
      meal_type: mealType,
      raw_input: rawInput || null,
      items: JSON.stringify(items || []),
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fats: totals.fats,
      total_fiber: totals.fiber,
      source: source || 'manual',
      barcode: barcode || null,
    })
    .returning('*');

  return log;
}

export async function getDailyNutrition(gymId, memberId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const meals = await db('daily_nutrition_logs')
    .where({ gym_id: gymId, member_id: memberId, log_date: targetDate })
    .orderBy('created_at', 'asc');

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.total_calories || 0),
      protein: acc.protein + (m.total_protein || 0),
      carbs: acc.carbs + (m.total_carbs || 0),
      fats: acc.fats + (m.total_fats || 0),
      fiber: acc.fiber + (m.total_fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );

  return { date: targetDate, meals, totals };
}

export async function getWeeklyNutrition(gymId, memberId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const startDate = weekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const rows = await db('daily_nutrition_logs')
    .where({ gym_id: gymId, member_id: memberId })
    .whereBetween('log_date', [startDate, endDate])
    .select(
      'log_date',
      db.raw('SUM(total_calories) as calories'),
      db.raw('SUM(total_protein) as protein'),
      db.raw('SUM(total_carbs) as carbs'),
      db.raw('SUM(total_fats) as fats'),
      db.raw('SUM(total_fiber) as fiber')
    )
    .groupBy('log_date')
    .orderBy('log_date', 'asc');

  const days = rows.map((r) => ({
    date: r.log_date,
    calories: parseInt(r.calories, 10),
    protein: parseInt(r.protein, 10),
    carbs: parseInt(r.carbs, 10),
    fats: parseInt(r.fats, 10),
    fiber: parseInt(r.fiber, 10),
  }));

  const count = days.length || 1;
  const averages = {
    calories: Math.round(days.reduce((s, d) => s + d.calories, 0) / count),
    protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / count),
    carbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / count),
    fats: Math.round(days.reduce((s, d) => s + d.fats, 0) / count),
    fiber: Math.round(days.reduce((s, d) => s + d.fiber, 0) / count),
  };

  return { startDate, endDate, days, averages };
}

export async function logSteps(gymId, memberId, { steps, goal, syncedFrom }) {
  const today = new Date().toISOString().split('T')[0];

  const [log] = await db('daily_step_logs')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      log_date: today,
      steps: steps || 0,
      goal: goal || 10000,
      synced_from: syncedFrom || 'manual',
      synced_at: new Date(),
    })
    .onConflict(['member_id', 'log_date'])
    .merge({
      steps: steps || 0,
      goal: goal || 10000,
      synced_from: syncedFrom || 'manual',
      synced_at: new Date(),
    })
    .returning('*');

  return log;
}

export async function getDailySteps(gymId, memberId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const log = await db('daily_step_logs')
    .where({ gym_id: gymId, member_id: memberId, log_date: targetDate })
    .first();

  return log || { date: targetDate, steps: 0, goal: 10000, synced_from: null };
}

export async function getWeeklySteps(gymId, memberId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const startDate = weekAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const days = await db('daily_step_logs')
    .where({ gym_id: gymId, member_id: memberId })
    .whereBetween('log_date', [startDate, endDate])
    .orderBy('log_date', 'asc');

  const totalSteps = days.reduce((s, d) => s + (d.steps || 0), 0);
  const avgSteps = days.length ? Math.round(totalSteps / days.length) : 0;

  return { startDate, endDate, days, totalSteps, avgSteps };
}

export async function setNutritionGoal(gymId, memberId, { goalType, calorieGoal, proteinGoal, carbGoal, fatGoal }) {
  const [goal] = await db('nutrition_goals')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      goal_type: goalType || 'maintain',
      calorie_goal: calorieGoal || 2000,
      protein_goal: proteinGoal || 100,
      carb_goal: carbGoal || 250,
      fat_goal: fatGoal || 65,
    })
    .onConflict(['member_id'])
    .merge({
      goal_type: goalType || 'maintain',
      calorie_goal: calorieGoal || 2000,
      protein_goal: proteinGoal || 100,
      carb_goal: carbGoal || 250,
      fat_goal: fatGoal || 65,
      updated_at: new Date(),
    })
    .returning('*');

  return goal;
}

export async function getNutritionGoal(gymId, memberId) {
  const goal = await db('nutrition_goals')
    .where({ gym_id: gymId, member_id: memberId })
    .first();

  return goal || {
    goal_type: 'maintain',
    calorie_goal: 2000,
    protein_goal: 100,
    carb_goal: 250,
    fat_goal: 65,
  };
}

export async function getClientNutritionStatus(gymId, trainerId) {
  const today = new Date().toISOString().split('T')[0];

  // Get trainer's clients
  const memberIds = await db('trainer_sessions')
    .where({ trainer_id: trainerId })
    .distinct('member_id')
    .pluck('member_id');

  if (memberIds.length === 0) return [];

  // Get members with their goals and today's nutrition totals
  const members = await db('members')
    .whereIn('members.id', memberIds)
    .where('members.gym_id', gymId)
    .leftJoin('nutrition_goals', 'members.id', 'nutrition_goals.member_id')
    .select(
      'members.id',
      'members.name',
      'members.phone',
      'members.photo_url',
      'nutrition_goals.protein_goal'
    );

  // Get today's protein totals per member
  const todayLogs = await db('daily_nutrition_logs')
    .whereIn('member_id', memberIds)
    .where({ gym_id: gymId, log_date: today })
    .select('member_id')
    .sum('total_protein as protein_consumed')
    .groupBy('member_id');

  const proteinMap = Object.fromEntries(
    todayLogs.map((r) => [r.member_id, parseInt(r.protein_consumed, 10)])
  );

  return members.map((m) => {
    const proteinGoal = m.protein_goal || 100;
    const proteinConsumed = proteinMap[m.id] || 0;
    const proteinHit = proteinConsumed >= proteinGoal;

    return {
      memberId: m.id,
      name: m.name,
      phone: m.phone,
      photoUrl: m.photo_url,
      proteinGoal,
      proteinConsumed,
      status: proteinHit ? 'green' : 'red',
    };
  });
}
