import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export async function startSession(memberId, gymId, { name, workout_type }) {
  const member = await db('members').where({ id: memberId }).first();
  if (!member) throw new NotFoundError('Member');

  const [session] = await db('workout_sessions')
    .insert({
      member_id: memberId,
      gym_id: gymId || null,
      name: name || null,
      workout_type: workout_type || 'strength',
      session_date: new Date().toISOString().split('T')[0],
    })
    .returning('*');

  return session;
}

export async function addExerciseSets(sessionId, exerciseId, sets) {
  const session = await db('workout_sessions').where({ id: sessionId }).first();
  if (!session) throw new NotFoundError('Workout session');

  const exercise = await db('exercises').where({ id: exerciseId }).first();
  if (!exercise) throw new NotFoundError('Exercise');

  if (!Array.isArray(sets) || sets.length === 0) {
    throw new ValidationError('At least one set is required');
  }

  // Get existing max set_number for this exercise in this session
  const maxResult = await db('exercise_sets')
    .where({ session_id: sessionId, exercise_id: exerciseId })
    .max('set_number as max_set');
  const startNumber = (maxResult[0]?.max_set || 0) + 1;

  const rows = sets.map((s, i) => ({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: s.set_number || startNumber + i,
    weight_kg: s.weight_kg ?? null,
    reps: s.reps ?? null,
    duration_seconds: s.duration_seconds ?? null,
    distance_km: s.distance_km ?? null,
    is_warmup: s.is_warmup || false,
    rpe: s.rpe || null,
    notes: s.notes || null,
  }));

  const inserted = await db('exercise_sets').insert(rows).returning('*');
  return inserted;
}

export async function completeSession(sessionId, { duration_minutes, notes }) {
  const session = await db('workout_sessions').where({ id: sessionId }).first();
  if (!session) throw new NotFoundError('Workout session');

  // Calculate total volume: sum of (weight_kg * reps) across all sets
  const volumeResult = await db('exercise_sets')
    .where({ session_id: sessionId })
    .whereNotNull('weight_kg')
    .whereNotNull('reps')
    .select(db.raw('COALESCE(SUM(weight_kg * reps), 0) as total_volume'));

  const totalVolume = Math.round(parseFloat(volumeResult[0]?.total_volume || 0));

  const [updated] = await db('workout_sessions')
    .where({ id: sessionId })
    .update({
      duration_minutes: duration_minutes ?? session.duration_minutes,
      total_volume: totalVolume,
      notes: notes ?? session.notes,
      updated_at: new Date(),
    })
    .returning('*');

  return updated;
}

export async function getSessionHistory(memberId, { page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const sessions = await db('workout_sessions')
    .where({ member_id: memberId })
    .orderBy('session_date', 'desc')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db('workout_sessions')
    .where({ member_id: memberId })
    .count();

  // For each session, fetch exercise sets grouped by exercise
  const sessionIds = sessions.map(s => s.id);
  const allSets = sessionIds.length > 0
    ? await db('exercise_sets')
        .whereIn('session_id', sessionIds)
        .join('exercises', 'exercise_sets.exercise_id', 'exercises.id')
        .select(
          'exercise_sets.*',
          'exercises.name as exercise_name',
          'exercises.category as exercise_category',
          'exercises.muscle_group as exercise_muscle_group'
        )
        .orderBy('exercise_sets.set_number', 'asc')
    : [];

  // Group sets by session
  const setsBySession = {};
  for (const set of allSets) {
    if (!setsBySession[set.session_id]) setsBySession[set.session_id] = [];
    setsBySession[set.session_id].push(set);
  }

  const enrichedSessions = sessions.map(s => ({
    ...s,
    exercises: setsBySession[s.id] || [],
  }));

  return {
    sessions: enrichedSessions,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: parseInt(count, 10),
      pages: Math.ceil(parseInt(count, 10) / limit),
    },
  };
}

export async function getSessionById(sessionId) {
  const session = await db('workout_sessions').where({ id: sessionId }).first();
  if (!session) throw new NotFoundError('Workout session');

  const sets = await db('exercise_sets')
    .where({ session_id: sessionId })
    .join('exercises', 'exercise_sets.exercise_id', 'exercises.id')
    .select(
      'exercise_sets.*',
      'exercises.name as exercise_name',
      'exercises.category as exercise_category',
      'exercises.equipment as exercise_equipment',
      'exercises.muscle_group as exercise_muscle_group'
    )
    .orderBy('exercise_sets.created_at', 'asc')
    .orderBy('exercise_sets.set_number', 'asc');

  // Group sets by exercise
  const exerciseMap = new Map();
  for (const set of sets) {
    const key = set.exercise_id;
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, {
        exercise_id: set.exercise_id,
        exercise_name: set.exercise_name,
        exercise_category: set.exercise_category,
        exercise_equipment: set.exercise_equipment,
        exercise_muscle_group: set.exercise_muscle_group,
        sets: [],
      });
    }
    exerciseMap.get(key).sets.push({
      id: set.id,
      set_number: set.set_number,
      weight_kg: set.weight_kg,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
      distance_km: set.distance_km,
      is_warmup: set.is_warmup,
      rpe: set.rpe,
      notes: set.notes,
    });
  }

  return {
    ...session,
    exercises: Array.from(exerciseMap.values()),
  };
}

export async function getExerciseHistory(memberId, exerciseId, { limit = 20 }) {
  const exercise = await db('exercises').where({ id: exerciseId }).first();
  if (!exercise) throw new NotFoundError('Exercise');

  const sets = await db('exercise_sets')
    .join('workout_sessions', 'exercise_sets.session_id', 'workout_sessions.id')
    .where({
      'workout_sessions.member_id': memberId,
      'exercise_sets.exercise_id': exerciseId,
    })
    .select(
      'exercise_sets.*',
      'workout_sessions.session_date',
      'workout_sessions.name as session_name'
    )
    .orderBy('workout_sessions.session_date', 'desc')
    .orderBy('exercise_sets.set_number', 'asc')
    .limit(limit);

  // Group by session date
  const byDate = {};
  for (const set of sets) {
    const dateKey = set.session_date;
    if (!byDate[dateKey]) {
      byDate[dateKey] = {
        session_date: dateKey,
        session_name: set.session_name,
        session_id: set.session_id,
        sets: [],
      };
    }
    byDate[dateKey].sets.push({
      set_number: set.set_number,
      weight_kg: set.weight_kg,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
      distance_km: set.distance_km,
      is_warmup: set.is_warmup,
      rpe: set.rpe,
    });
  }

  // Find PRs
  const bestWeight = await db('exercise_sets')
    .join('workout_sessions', 'exercise_sets.session_id', 'workout_sessions.id')
    .where({
      'workout_sessions.member_id': memberId,
      'exercise_sets.exercise_id': exerciseId,
      'exercise_sets.is_warmup': false,
    })
    .whereNotNull('exercise_sets.weight_kg')
    .orderBy('exercise_sets.weight_kg', 'desc')
    .first();

  const bestVolume = await db('exercise_sets')
    .join('workout_sessions', 'exercise_sets.session_id', 'workout_sessions.id')
    .where({
      'workout_sessions.member_id': memberId,
      'exercise_sets.exercise_id': exerciseId,
      'exercise_sets.is_warmup': false,
    })
    .whereNotNull('exercise_sets.weight_kg')
    .whereNotNull('exercise_sets.reps')
    .select(db.raw('exercise_sets.weight_kg * exercise_sets.reps as volume'), 'exercise_sets.*', 'workout_sessions.session_date')
    .orderBy('volume', 'desc')
    .first();

  return {
    exercise,
    history: Object.values(byDate),
    personal_records: {
      best_weight: bestWeight ? { weight_kg: bestWeight.weight_kg, reps: bestWeight.reps, date: bestWeight.session_date } : null,
      best_volume: bestVolume ? { weight_kg: bestVolume.weight_kg, reps: bestVolume.reps, volume: parseFloat(bestVolume.volume), date: bestVolume.session_date } : null,
    },
  };
}

export async function getPersonalRecords(memberId) {
  // Get all exercises this member has ever done (non-warmup sets only)
  const exerciseIds = await db('exercise_sets')
    .join('workout_sessions', 'exercise_sets.session_id', 'workout_sessions.id')
    .where({
      'workout_sessions.member_id': memberId,
      'exercise_sets.is_warmup': false,
    })
    .whereNotNull('exercise_sets.weight_kg')
    .distinct('exercise_sets.exercise_id');

  const records = [];

  for (const { exercise_id } of exerciseIds) {
    const exercise = await db('exercises').where({ id: exercise_id }).first();
    if (!exercise) continue;

    const bestSet = await db('exercise_sets')
      .join('workout_sessions', 'exercise_sets.session_id', 'workout_sessions.id')
      .where({
        'workout_sessions.member_id': memberId,
        'exercise_sets.exercise_id': exercise_id,
        'exercise_sets.is_warmup': false,
      })
      .whereNotNull('exercise_sets.weight_kg')
      .orderBy('exercise_sets.weight_kg', 'desc')
      .select('exercise_sets.weight_kg', 'exercise_sets.reps', 'workout_sessions.session_date')
      .first();

    if (bestSet) {
      records.push({
        exercise_id,
        exercise_name: exercise.name,
        category: exercise.category,
        best_weight_kg: parseFloat(bestSet.weight_kg),
        reps_at_best: bestSet.reps,
        date: bestSet.session_date,
      });
    }
  }

  // Sort by category then exercise name
  records.sort((a, b) => a.category.localeCompare(b.category) || a.exercise_name.localeCompare(b.exercise_name));

  return records;
}

export async function getExercises({ category, search, gymId, muscle }) {
  let query = db('exercises')
    .where(function () {
      this.where({ is_default: true }).orWhere({ gym_id: gymId || null });
    })
    .orderBy('category', 'asc')
    .orderBy('name', 'asc');

  if (category) {
    query = query.andWhere({ category });
  }

  if (search) {
    query = query.andWhere(function () {
      this.whereILike('name', `%${search}%`)
        .orWhereILike('muscle_group', `%${search}%`)
        .orWhereILike('equipment', `%${search}%`);
    });
  }

  if (muscle) {
    query = query.andWhere(function () {
      this.whereILike('muscle_group', `%${muscle}%`)
        .orWhereRaw("muscles_primary::text ILIKE ?", [`%${muscle}%`]);
    });
  }

  const exercises = await query;
  return exercises;
}
