import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../config/database.js';
import * as healthService from '../services/health.service.js';
import * as workoutService from '../services/workout.service.js';

// Verify member JWT token (co-located for self-service routes)
async function verifyMemberToken(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid authorization header' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret);
    if (decoded.role !== 'member' || decoded.gymId !== request.params.gymId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    request.member = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return { bmi: null, bmi_category: null };
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  let bmi_category;
  if (bmi < 18.5) bmi_category = 'underweight';
  else if (bmi < 25) bmi_category = 'normal';
  else if (bmi < 30) bmi_category = 'overweight';
  else bmi_category = 'obese';
  return { bmi, bmi_category };
}

export default async function healthOsRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };
  const memberAuthHooks = { preHandler: [verifyMemberToken] };

  // POST /gyms/:gymId/members/:memberId/health/nutrition/log
  fastify.post('/gyms/:gymId/members/:memberId/health/nutrition/log', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { mealType, rawInput, items, source, barcode } = request.body || {};
    if (!mealType) return reply.code(400).send({ error: 'mealType is required' });
    const log = await healthService.logNutrition(gymId, memberId, { mealType, rawInput, items, source, barcode });
    return reply.code(201).send(log);
  });

  // GET /gyms/:gymId/members/:memberId/health/nutrition/daily?date=YYYY-MM-DD
  fastify.get('/gyms/:gymId/members/:memberId/health/nutrition/daily', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const { date } = request.query;
    return healthService.getDailyNutrition(gymId, memberId, date);
  });

  // GET /gyms/:gymId/members/:memberId/health/nutrition/weekly
  fastify.get('/gyms/:gymId/members/:memberId/health/nutrition/weekly', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    return healthService.getWeeklyNutrition(gymId, memberId);
  });

  // POST /gyms/:gymId/members/:memberId/health/steps
  fastify.post('/gyms/:gymId/members/:memberId/health/steps', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { steps, goal, syncedFrom } = request.body || {};
    const log = await healthService.logSteps(gymId, memberId, { steps, goal, syncedFrom });
    return reply.code(201).send(log);
  });

  // GET /gyms/:gymId/members/:memberId/health/steps/daily?date=YYYY-MM-DD
  fastify.get('/gyms/:gymId/members/:memberId/health/steps/daily', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const { date } = request.query;
    return healthService.getDailySteps(gymId, memberId, date);
  });

  // GET /gyms/:gymId/members/:memberId/health/steps/weekly
  fastify.get('/gyms/:gymId/members/:memberId/health/steps/weekly', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    return healthService.getWeeklySteps(gymId, memberId);
  });

  // PUT /gyms/:gymId/members/:memberId/health/nutrition/goal
  fastify.put('/gyms/:gymId/members/:memberId/health/nutrition/goal', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const { goalType, calorieGoal, proteinGoal, carbGoal, fatGoal } = request.body || {};
    return healthService.setNutritionGoal(gymId, memberId, { goalType, calorieGoal, proteinGoal, carbGoal, fatGoal });
  });

  // GET /gyms/:gymId/members/:memberId/health/nutrition/goal
  fastify.get('/gyms/:gymId/members/:memberId/health/nutrition/goal', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    return healthService.getNutritionGoal(gymId, memberId);
  });

  // Trainer route: GET /gyms/:gymId/trainer/clients/nutrition-status
  fastify.get('/gyms/:gymId/trainer/clients/nutrition-status', authHooks, async (request) => {
    const { gymId } = request.params;
    const trainerId = request.user?.staffId || request.user?.uid;
    return healthService.getClientNutritionStatus(gymId, trainerId);
  });

  // --- Fasting State Persistence ---

  // Save fasting start (persists active fast so it survives app close)
  fastify.post('/gyms/:gymId/members/:memberId/health/fasting/start', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { protocol, start_time } = request.body || {};
    if (!start_time) return reply.code(400).send({ error: 'start_time is required' });
    // Upsert into member_fasting_state
    const existing = await fastify.db('member_fasting_state').where({ gym_id: gymId, member_id: memberId }).first();
    if (existing) {
      await fastify.db('member_fasting_state').where({ id: existing.id }).update({
        protocol: protocol || '16:8',
        start_time,
        is_active: true,
        updated_at: new Date(),
      });
    } else {
      await fastify.db('member_fasting_state').insert({
        gym_id: gymId,
        member_id: memberId,
        protocol: protocol || '16:8',
        start_time,
        is_active: true,
      });
    }
    return reply.code(200).send({ success: true });
  });

  // Get active fasting state
  fastify.get('/gyms/:gymId/members/:memberId/health/fasting/active', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const state = await fastify.db('member_fasting_state')
      .where({ gym_id: gymId, member_id: memberId, is_active: true })
      .first();
    return { active: !!state, state: state || null };
  });

  // End fast + log it
  fastify.post('/gyms/:gymId/members/:memberId/health/fasting/log', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { protocol, start_time, end_time, duration_minutes, completed } = request.body || {};
    // Clear active state
    await fastify.db('member_fasting_state')
      .where({ gym_id: gymId, member_id: memberId })
      .update({ is_active: false, updated_at: new Date() });
    // Log the completed fast
    const [log] = await fastify.db('fasting_logs').insert({
      gym_id: gymId,
      member_id: memberId,
      protocol: protocol || '16:8',
      start_time,
      end_time,
      duration_minutes: duration_minutes || 0,
      completed: completed || false,
    }).returning('*');
    return reply.code(201).send(log);
  });

  // Get fasting history
  fastify.get('/gyms/:gymId/members/:memberId/health/fasting/history', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const limit = Math.min(Math.max(parseInt(request.query.limit) || 30, 1), 100);
    const logs = await fastify.db('fasting_logs')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('start_time', 'desc')
      .limit(limit);
    return { logs };
  });

  // --- Workout Logging ---

  // POST /gyms/:gymId/members/:memberId/health/workouts
  fastify.post('/gyms/:gymId/members/:memberId/health/workouts', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { workout_type, duration_minutes, calories_burned, notes } = request.body || {};
    if (!workout_type) return reply.code(400).send({ error: 'workout_type is required' });
    if (!duration_minutes) return reply.code(400).send({ error: 'duration_minutes is required' });
    const log = await workoutService.logWorkout(memberId, gymId, { workout_type, duration_minutes, calories_burned, notes });
    return reply.code(201).send(log);
  });

  // GET /gyms/:gymId/members/:memberId/health/workouts/daily?date=YYYY-MM-DD
  fastify.get('/gyms/:gymId/members/:memberId/health/workouts/daily', authHooks, async (request) => {
    const { memberId } = request.params;
    const { date } = request.query;
    return workoutService.getDailyWorkouts(memberId, date);
  });

  // GET /gyms/:gymId/members/:memberId/health/workouts/weekly
  fastify.get('/gyms/:gymId/members/:memberId/health/workouts/weekly', authHooks, async (request) => {
    const { memberId } = request.params;
    return workoutService.getWeeklyWorkouts(memberId);
  });

  // GET /gyms/:gymId/members/:memberId/health/workouts/streak
  fastify.get('/gyms/:gymId/members/:memberId/health/workouts/streak', authHooks, async (request) => {
    const { memberId } = request.params;
    return workoutService.getWorkoutStreak(memberId);
  });

  // --- Body Stats ---

  // PATCH /gyms/:gymId/members/:memberId/body-stats — Update height/weight, calculate BMI
  fastify.patch('/gyms/:gymId/members/:memberId/body-stats', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { height_cm, weight_kg } = request.body || {};

    if (!height_cm && !weight_kg) {
      return reply.code(400).send({ error: 'height_cm or weight_kg is required' });
    }

    // Get current member stats to fill in missing values
    const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });

    const finalHeight = height_cm != null ? parseFloat(height_cm) : member.height_cm ? parseFloat(member.height_cm) : null;
    const finalWeight = weight_kg != null ? parseFloat(weight_kg) : member.weight_kg ? parseFloat(member.weight_kg) : null;

    const { bmi, bmi_category } = calculateBmi(finalWeight, finalHeight);

    const updateData = {
      height_cm: finalHeight,
      weight_kg: finalWeight,
      bmi,
      bmi_category,
      updated_at: new Date(),
    };

    // Update member record
    const [updated] = await db('members')
      .where({ id: memberId, gym_id: gymId })
      .update(updateData)
      .returning(['id', 'name', 'height_cm', 'weight_kg', 'bmi', 'bmi_category']);

    // Log to body_stats_log for trend tracking
    const [logEntry] = await db('body_stats_log').insert({
      gym_id: gymId,
      member_id: memberId,
      height_cm: finalHeight,
      weight_kg: finalWeight,
      bmi,
      bmi_category,
    }).returning('*');

    return reply.code(200).send({ member: updated, log: logEntry });
  });

  // GET /gyms/:gymId/members/:memberId/body-stats/history — Last 30 body stat entries
  fastify.get('/gyms/:gymId/members/:memberId/body-stats/history', authHooks, async (request) => {
    const { gymId, memberId } = request.params;

    const history = await db('body_stats_log')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('recorded_at', 'desc')
      .limit(30);

    return { history };
  });

  // --- Member Photos ---

  // POST /gyms/:gymId/members/:memberId/photos — Upload photo (Vercel Blob in prod, base64 in dev)
  fastify.post('/gyms/:gymId/members/:memberId/photos', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const { photo, image, type, taken_at } = request.body || {};
    const base64Input = photo || image;

    if (!base64Input) return reply.code(400).send({ error: 'photo (base64) is required' });

    const photoType = type || 'progress';
    if (!['progress', 'profile'].includes(photoType)) {
      return reply.code(400).send({ error: 'type must be "progress" or "profile"' });
    }

    const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });

    const rawBase64 = base64Input.replace(/^data:image\/[a-z]+;base64,/, '');
    const estimatedBytes = Math.ceil(rawBase64.length * 0.75);
    if (estimatedBytes > 5 * 1024 * 1024) {
      return reply.code(413).send({ error: 'Photo too large (max 5MB)' });
    }

    let url;
    if (config.blob?.enabled) {
      try {
        const { put } = await import('@vercel/blob');
        const buffer = Buffer.from(rawBase64, 'base64');
        const blob = await put(`progress/${gymId}/${memberId}/${Date.now()}.jpg`, buffer, {
          access: 'public', token: config.blob.token, contentType: 'image/jpeg', addRandomSuffix: false,
        });
        url = blob.url;
      } catch (err) {
        request.log.error(err, 'Blob upload failed');
        return reply.code(502).send({ error: 'Photo storage unavailable.' });
      }
    } else {
      url = `data:image/jpeg;base64,${rawBase64}`;
    }

    const [photo_record] = await db('member_photos').insert({
      gym_id: gymId, member_id: memberId, type: photoType, url,
      taken_at: taken_at || new Date(),
      metadata: JSON.stringify({ source: 'mobile', uploaded_at: new Date().toISOString(), storage: config.blob?.enabled ? 'vercel_blob' : 'base64_dev' }),
    }).returning('*');

    return reply.code(201).send({ photo: photo_record });
  });

  // GET /gyms/:gymId/members/:memberId/photos — List all photos for a member
  fastify.get('/gyms/:gymId/members/:memberId/photos', authHooks, async (request) => {
    const { gymId, memberId } = request.params;

    const photos = await db('member_photos')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('created_at', 'desc');

    return { photos };
  });

  // --- Member Check-in History (owner-accessible) ---

  // GET /gyms/:gymId/members/:memberId/checkins — Paginated check-in history
  fastify.get('/gyms/:gymId/members/:memberId/checkins', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const page = parseInt(request.query.page) || 1;
    const limit = Math.min(parseInt(request.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const [{ count }] = await db('checkins')
      .where({ gym_id: gymId, member_id: memberId })
      .count();

    const checkins = await db('checkins')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('checked_in_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      checkins,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    };
  });

  // --- Member Self-Service Body Stats ---

  // PATCH /gyms/:gymId/members/me/body-stats — Member updates own stats
  fastify.patch('/gyms/:gymId/members/me/body-stats', memberAuthHooks, async (request, reply) => {
    const { gymId } = request.params;
    const memberId = request.member.memberId;
    const { height_cm, weight_kg } = request.body || {};

    if (!height_cm && !weight_kg) {
      return reply.code(400).send({ error: 'height_cm or weight_kg is required' });
    }

    const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });

    const finalHeight = height_cm != null ? parseFloat(height_cm) : member.height_cm ? parseFloat(member.height_cm) : null;
    const finalWeight = weight_kg != null ? parseFloat(weight_kg) : member.weight_kg ? parseFloat(member.weight_kg) : null;

    const { bmi, bmi_category } = calculateBmi(finalWeight, finalHeight);

    const [updated] = await db('members')
      .where({ id: memberId, gym_id: gymId })
      .update({ height_cm: finalHeight, weight_kg: finalWeight, bmi, bmi_category, updated_at: new Date() })
      .returning(['id', 'name', 'height_cm', 'weight_kg', 'bmi', 'bmi_category']);

    const [logEntry] = await db('body_stats_log').insert({
      gym_id: gymId,
      member_id: memberId,
      height_cm: finalHeight,
      weight_kg: finalWeight,
      bmi,
      bmi_category,
    }).returning('*');

    return reply.code(200).send({ member: updated, log: logEntry });
  });

  // GET /gyms/:gymId/members/me/body-stats/history — Member views own history
  fastify.get('/gyms/:gymId/members/me/body-stats/history', memberAuthHooks, async (request) => {
    const { gymId } = request.params;
    const memberId = request.member.memberId;

    const history = await db('body_stats_log')
      .where({ gym_id: gymId, member_id: memberId })
      .orderBy('recorded_at', 'desc')
      .limit(30);

    return { history };
  });

  // ── Member Progress Timeline ─────────────────────────

  // GET /gyms/:gymId/members/:memberId/timeline — complete progress history
  fastify.get('/gyms/:gymId/members/:memberId/timeline', authHooks, async (request) => {
    const { gymId, memberId } = request.params;
    const limit = Math.min(parseInt(request.query.limit) || 50, 200);

    // Gather multiple data sources into a unified timeline
    const [workouts, photos, checkins, achievements, sleepLogs, nutritionHighlights] = await Promise.all([
      // Workout sessions
      db('workout_sessions')
        .where({ member_id: memberId, gym_id: gymId })
        .select('id', 'name', 'duration_minutes', 'total_volume', 'created_at')
        .orderBy('created_at', 'desc').limit(20)
        .then(rows => rows.map(r => ({ type: 'workout', ...r, timestamp: r.created_at }))),

      // Progress photos
      db('member_photos')
        .where({ member_id: memberId, gym_id: gymId })
        .select('id', 'url', 'type', 'taken_at', 'created_at')
        .orderBy('created_at', 'desc').limit(10)
        .then(rows => rows.map(r => ({ type: 'photo', ...r, timestamp: r.created_at }))),

      // Check-ins
      db('checkins')
        .where({ member_id: memberId, gym_id: gymId })
        .select('id', 'method', 'checked_in_at')
        .orderBy('checked_in_at', 'desc').limit(30)
        .then(rows => rows.map(r => ({ type: 'checkin', ...r, timestamp: r.checked_in_at }))),

      // Achievements
      db('member_achievements')
        .where({ member_id: memberId })
        .leftJoin('achievements', 'member_achievements.achievement_id', 'achievements.id')
        .select('member_achievements.id', 'achievements.name', 'achievements.icon', 'member_achievements.earned_at')
        .orderBy('earned_at', 'desc').limit(10)
        .catch(() => [])
        .then(rows => (rows || []).map(r => ({ type: 'achievement', ...r, timestamp: r.earned_at }))),

      // Nutrition daily summaries
      db('daily_nutrition_logs')
        .where({ member_id: memberId, gym_id: gymId })
        .select(db.raw("log_date, SUM(total_calories) as calories, SUM(total_protein) as protein"))
        .groupBy('log_date')
        .orderBy('log_date', 'desc').limit(7)
        .catch(() => [])
        .then(rows => (rows || []).map(r => ({ type: 'nutrition_day', ...r, timestamp: r.log_date }))),

      // PR/milestones - placeholder
      Promise.resolve([]),
    ]);

    // Merge and sort by timestamp
    const timeline = [...workouts, ...photos, ...checkins, ...achievements, ...sleepLogs, ...nutritionHighlights]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    // Stats summary
    const member = await db('members').where({ id: memberId }).first();
    const summary = {
      total_workouts: workouts.length,
      total_checkins: member?.checkin_count || checkins.length,
      current_streak: member?.streak || 0,
      member_since: member?.created_at,
      photos_count: photos.length,
    };

    return { timeline, summary };
  });
}
