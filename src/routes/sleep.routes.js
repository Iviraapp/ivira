import db from '../config/database.js';

function calculateSleepScore(durationMinutes, qualityRating) {
  // Score out of 100 based on duration and quality
  // Ideal sleep: 420-540 minutes (7-9 hours)
  let durationScore = 0;
  if (durationMinutes >= 420 && durationMinutes <= 540) {
    durationScore = 50; // Perfect duration
  } else if (durationMinutes >= 360 && durationMinutes < 420) {
    durationScore = 40; // Slightly short
  } else if (durationMinutes > 540 && durationMinutes <= 600) {
    durationScore = 40; // Slightly long
  } else if (durationMinutes >= 300 && durationMinutes < 360) {
    durationScore = 25; // Too short
  } else if (durationMinutes > 600) {
    durationScore = 30; // Too long
  } else {
    durationScore = 10; // Very poor
  }

  // Quality contributes up to 50 points
  const qualityScore = (qualityRating / 5) * 50;

  return Math.round(durationScore + qualityScore);
}

export default async function sleepRoutes(fastify) {
  const ownerAuth = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };
  const tokenAuth = { preHandler: [fastify.verifyToken] };
  const memberAuth = { preHandler: [fastify.verifyToken, fastify.verifyMember] };

  // POST /gyms/:gymId/members/:memberId/sleep — log sleep (member or owner)
  fastify.post('/gyms/:gymId/members/:memberId/sleep', memberAuth, async (request, reply) => {
    const { gymId, memberId } = request.params;
    const {
      bedtime, wake_time, quality_rating, notes,
      // Advanced fields from IVIRA Sleep Engine
      deep_minutes, rem_minutes, light_minutes, awake_minutes,
      efficiency, onset_latency, awakenings, sleep_cycles,
      snoring_minutes, audio_events_count,
      stage_timeline, audio_events, source,
    } = request.body || {};

    if (!bedtime || !wake_time) {
      return reply.code(400).send({ error: 'bedtime and wake_time are required' });
    }

    const bedtimeDate = new Date(bedtime);
    const wakeTimeDate = new Date(wake_time);

    if (wakeTimeDate <= bedtimeDate) {
      return reply.code(400).send({ error: 'wake_time must be after bedtime' });
    }

    const durationMinutes = Math.round((wakeTimeDate - bedtimeDate) / 60000);
    const rating = quality_rating ? Math.min(5, Math.max(1, parseInt(quality_rating))) : null;
    const sleepScore = rating ? calculateSleepScore(durationMinutes, rating) : null;

    // Use wake date as the log date
    const date = wakeTimeDate.toISOString().split('T')[0];

    const insertData = {
      gym_id: gymId,
      member_id: memberId,
      bedtime: bedtimeDate,
      wake_time: wakeTimeDate,
      duration_minutes: durationMinutes,
      quality_rating: rating,
      sleep_score: sleepScore,
      notes: notes || null,
      date,
    };

    // Add advanced fields if provided (from IVIRA Sleep Engine)
    if (deep_minutes != null) insertData.deep_minutes = parseInt(deep_minutes);
    if (rem_minutes != null) insertData.rem_minutes = parseInt(rem_minutes);
    if (light_minutes != null) insertData.light_minutes = parseInt(light_minutes);
    if (awake_minutes != null) insertData.awake_minutes = parseInt(awake_minutes);
    if (efficiency != null) insertData.efficiency = parseInt(efficiency);
    if (onset_latency != null) insertData.onset_latency = parseInt(onset_latency);
    if (awakenings != null) insertData.awakenings = parseInt(awakenings);
    if (sleep_cycles != null) insertData.sleep_cycles = parseInt(sleep_cycles);
    if (snoring_minutes != null) insertData.snoring_minutes = parseInt(snoring_minutes);
    if (audio_events_count != null) insertData.audio_events_count = parseInt(audio_events_count);
    if (stage_timeline) insertData.stage_timeline = JSON.stringify(stage_timeline);
    if (audio_events) insertData.audio_events = JSON.stringify(audio_events);
    if (source) insertData.source = String(source).slice(0, 30);

    const [log] = await db('sleep_logs')
      .insert(insertData)
      .returning('*');

    return reply.code(201).send({ sleep_log: log });
  });

  // GET /gyms/:gymId/members/:memberId/sleep/history — get sleep logs
  fastify.get('/gyms/:gymId/members/:memberId/sleep/history', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    const days = Math.min(Math.max(parseInt(request.query.days) || 30, 1), 365);
    const limit = Math.min(Math.max(parseInt(request.query.limit) || 30, 1), 100);
    const offset = Math.max(parseInt(request.query.offset) || 0, 0);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await db('sleep_logs')
      .where({ gym_id: gymId, member_id: memberId })
      .where('date', '>=', since.toISOString().split('T')[0])
      .orderBy('date', 'desc')
      .limit(limit)
      .offset(offset);

    return { sleep_logs: logs };
  });

  // GET /gyms/:gymId/members/:memberId/sleep/stats — get sleep statistics
  fastify.get('/gyms/:gymId/members/:memberId/sleep/stats', memberAuth, async (request) => {
    const { gymId, memberId } = request.params;
    const days = Math.min(Math.max(parseInt(request.query.days) || 30, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await db('sleep_logs')
      .where({ gym_id: gymId, member_id: memberId })
      .where('date', '>=', since.toISOString().split('T')[0])
      .orderBy('date', 'desc');

    if (logs.length === 0) {
      return {
        stats: {
          total_logs: 0,
          avg_duration_minutes: null,
          avg_quality_rating: null,
          avg_sleep_score: null,
          avg_bedtime: null,
          avg_wake_time: null,
          best_night: null,
          worst_night: null,
        },
      };
    }

    const totalDuration = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const qualityLogs = logs.filter(l => l.quality_rating != null);
    const scoreLogs = logs.filter(l => l.sleep_score != null);

    const avgDuration = Math.round(totalDuration / logs.length);
    const avgQuality = qualityLogs.length > 0
      ? +(qualityLogs.reduce((s, l) => s + l.quality_rating, 0) / qualityLogs.length).toFixed(1)
      : null;
    const avgScore = scoreLogs.length > 0
      ? Math.round(scoreLogs.reduce((s, l) => s + l.sleep_score, 0) / scoreLogs.length)
      : null;

    // Average bedtime/wake time in minutes from midnight
    const bedtimeMinutes = logs.map(l => {
      const d = new Date(l.bedtime);
      let mins = d.getHours() * 60 + d.getMinutes();
      // If after noon, treat as evening (subtract 24h worth to get negative for averaging)
      if (mins < 720) mins += 1440; // early morning bedtime, add 24h
      return mins;
    });
    const avgBedtimeMins = Math.round(bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length) % 1440;
    const avgBedtimeH = Math.floor(avgBedtimeMins / 60);
    const avgBedtimeM = avgBedtimeMins % 60;

    const wakeMinutes = logs.map(l => {
      const d = new Date(l.wake_time);
      return d.getHours() * 60 + d.getMinutes();
    });
    const avgWakeMins = Math.round(wakeMinutes.reduce((a, b) => a + b, 0) / wakeMinutes.length);
    const avgWakeH = Math.floor(avgWakeMins / 60);
    const avgWakeM = avgWakeMins % 60;

    // Best and worst nights by score
    const sorted = [...scoreLogs].sort((a, b) => b.sleep_score - a.sleep_score);

    return {
      stats: {
        total_logs: logs.length,
        period_days: days,
        avg_duration_minutes: avgDuration,
        avg_duration_hours: +(avgDuration / 60).toFixed(1),
        avg_quality_rating: avgQuality,
        avg_sleep_score: avgScore,
        avg_bedtime: `${String(avgBedtimeH).padStart(2, '0')}:${String(avgBedtimeM).padStart(2, '0')}`,
        avg_wake_time: `${String(avgWakeH).padStart(2, '0')}:${String(avgWakeM).padStart(2, '0')}`,
        best_night: sorted.length > 0 ? { date: sorted[0].date, score: sorted[0].sleep_score } : null,
        worst_night: sorted.length > 0 ? { date: sorted[sorted.length - 1].date, score: sorted[sorted.length - 1].sleep_score } : null,
      },
    };
  });
}
