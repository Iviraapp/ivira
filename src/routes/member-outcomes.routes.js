// ═══════════════════════════════════════════════════════════════════
// member-outcomes.routes.js — NEW FILE
//
// Member Outcome Analytics — the missing moat dashboard card.
//
// Shows gym owners:
//   - Correlation between Vira AI usage and check-in frequency
//   - Fitness score improvement over time
//   - Which features drive retention
//   - At-risk members with outcome context (not just "absent 7 days")
//
// Register in app.js:
//   import memberOutcomesRoutes from './routes/member-outcomes.routes.js'
//   await fastify.register(memberOutcomesRoutes, { prefix: '/api/v1' })
// ═══════════════════════════════════════════════════════════════════

import db from '../config/database.js'

export default async function memberOutcomesRoutes(fastify) {
  const ownerAuth = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }

  // ── GET /gyms/:gymId/outcomes/summary ─────────────────────────
  // Top-level outcome metrics for the dashboard card.
  // Compares Vira AI users vs non-users, Circle users vs non-users.
  fastify.get('/gyms/:gymId/outcomes/summary', ownerAuth, async (request) => {
    const { gymId } = request.params
    const weeks = parseInt(request.query.weeks) || 8

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - weeks * 7)
    const since = sinceDate.toISOString().split('T')[0]

    // ── Active members baseline ───────────────────────────────
    const activeMembers = await db('members')
      .where({ gym_id: gymId, status: 'active' })
      .count('* as n')
      .first()
    const totalActive = parseInt(activeMembers?.n || 0)

    // ── Check-in stats: Vira users vs non-users ───────────────
    // A "Vira user" is someone who has used AI coach in the past 8 weeks.
    // We proxy this via checkin data + outcome snapshots if available,
    // or fall back to raw checkin aggregation.
    const [viraUsers, nonViraUsers] = await Promise.all([
      // Members with outcome snapshots showing Vira usage
      db('member_outcome_snapshots')
        .where({ gym_id: gymId, used_vira_ai: true })
        .where('week_start', '>=', since)
        .countDistinct('member_id as n')
        .first(),

      db('member_outcome_snapshots')
        .where({ gym_id: gymId, used_vira_ai: false })
        .where('week_start', '>=', since)
        .countDistinct('member_id as n')
        .first(),
    ])

    // ── Avg check-ins per week: Vira users vs non-users ───────
    const viraCheckinAvg = await db('member_outcome_snapshots')
      .where({ gym_id: gymId, used_vira_ai: true })
      .where('week_start', '>=', since)
      .avg('checkin_count as avg')
      .first()

    const nonViraCheckinAvg = await db('member_outcome_snapshots')
      .where({ gym_id: gymId, used_vira_ai: false })
      .where('week_start', '>=', since)
      .avg('checkin_count as avg')
      .first()

    // ── Fitness score trend: first 4 weeks vs last 4 weeks ────
    const midpoint = new Date(Date.now() - 4 * 7 * 86400000).toISOString().split('T')[0]

    const [earlyScore, recentScore] = await Promise.all([
      db('member_outcome_snapshots')
        .where({ gym_id: gymId })
        .where('week_start', '>=', since)
        .where('week_start', '<', midpoint)
        .whereNotNull('fitness_score')
        .avg('fitness_score as avg')
        .first(),
      db('member_outcome_snapshots')
        .where({ gym_id: gymId })
        .where('week_start', '>=', midpoint)
        .whereNotNull('fitness_score')
        .avg('fitness_score as avg')
        .first(),
    ])

    // ── Circle engagement impact ───────────────────────────────
    const circleCheckinAvg = await db('member_outcome_snapshots')
      .where({ gym_id: gymId, used_circles: true })
      .where('week_start', '>=', since)
      .avg('checkin_count as avg')
      .first()

    const noCircleCheckinAvg = await db('member_outcome_snapshots')
      .where({ gym_id: gymId, used_circles: false })
      .where('week_start', '>=', since)
      .avg('checkin_count as avg')
      .first()

    // ── Feature adoption breakdown ─────────────────────────────
    const featureAdoption = await db('member_outcome_snapshots')
      .where({ gym_id: gymId })
      .where('week_start', '>=', since)
      .select(
        db.raw('COUNT(DISTINCT CASE WHEN used_vira_ai THEN member_id END) as vira_users'),
        db.raw('COUNT(DISTINCT CASE WHEN used_circles THEN member_id END) as circle_users'),
        db.raw('COUNT(DISTINCT CASE WHEN used_sleep_tracker THEN member_id END) as sleep_users'),
        db.raw('COUNT(DISTINCT CASE WHEN used_food_scanner THEN member_id END) as food_scanner_users'),
        db.raw('COUNT(DISTINCT member_id) as total_tracked'),
      )
      .first()

    const hasSnapshotData = parseInt(featureAdoption?.total_tracked || 0) > 0

    return {
      period_weeks: weeks,
      total_active_members: totalActive,
      has_outcome_data: hasSnapshotData,

      // Show "data is being collected" if snapshots haven't run yet
      data_available_in: hasSnapshotData ? null : 'Outcome data will be available after the first weekly snapshot runs (every Monday at 2 AM IST).',

      vira_impact: {
        users:          parseInt(viraUsers?.n || 0),
        non_users:      parseInt(nonViraUsers?.n || 0),
        avg_checkins_with_vira:    parseFloat(viraCheckinAvg?.avg || 0).toFixed(1),
        avg_checkins_without_vira: parseFloat(nonViraCheckinAvg?.avg || 0).toFixed(1),
        // Lift = how much more active Vira users are
        checkin_lift_pct: viraCheckinAvg?.avg && nonViraCheckinAvg?.avg
          ? Math.round(((viraCheckinAvg.avg - nonViraCheckinAvg.avg) / Math.max(nonViraCheckinAvg.avg, 0.01)) * 100)
          : null,
      },

      circles_impact: {
        avg_checkins_with_circle:    parseFloat(circleCheckinAvg?.avg || 0).toFixed(1),
        avg_checkins_without_circle: parseFloat(noCircleCheckinAvg?.avg || 0).toFixed(1),
        checkin_lift_pct: circleCheckinAvg?.avg && noCircleCheckinAvg?.avg
          ? Math.round(((circleCheckinAvg.avg - noCircleCheckinAvg.avg) / Math.max(noCircleCheckinAvg.avg, 0.01)) * 100)
          : null,
      },

      fitness_score_trend: {
        early_period_avg:  parseFloat(earlyScore?.avg || 0).toFixed(1),
        recent_period_avg: parseFloat(recentScore?.avg || 0).toFixed(1),
        delta: earlyScore?.avg && recentScore?.avg
          ? parseFloat(recentScore.avg - earlyScore.avg).toFixed(1)
          : null,
      },

      feature_adoption: {
        vira_ai:       parseInt(featureAdoption?.vira_users || 0),
        circles:       parseInt(featureAdoption?.circle_users || 0),
        sleep_tracker: parseInt(featureAdoption?.sleep_users || 0),
        food_scanner:  parseInt(featureAdoption?.food_scanner_users || 0),
        total_tracked: parseInt(featureAdoption?.total_tracked || 0),
        adoption_rates: totalActive > 0 ? {
          vira_ai_pct:       Math.round((parseInt(featureAdoption?.vira_users || 0) / totalActive) * 100),
          circles_pct:       Math.round((parseInt(featureAdoption?.circle_users || 0) / totalActive) * 100),
          sleep_tracker_pct: Math.round((parseInt(featureAdoption?.sleep_users || 0) / totalActive) * 100),
          food_scanner_pct:  Math.round((parseInt(featureAdoption?.food_scanner_users || 0) / totalActive) * 100),
        } : null,
      },
    }
  })

  // ── GET /gyms/:gymId/outcomes/members — per-member outcome list ─
  // Shows each member's fitness score, check-in trend, and feature usage.
  // Powers a sortable "Member Outcomes" table in the dashboard.
  fastify.get('/gyms/:gymId/outcomes/members', ownerAuth, async (request) => {
    const { gymId } = request.params
    const weeks = parseInt(request.query.weeks) || 4
    const since = new Date(Date.now() - weeks * 7 * 86400000).toISOString().split('T')[0]
    const sort = request.query.sort || 'checkin_count' // checkin_count | fitness_score | streak
    const order = request.query.order === 'asc' ? 'asc' : 'desc'
    const limit = Math.min(parseInt(request.query.limit) || 50, 100)

    // Aggregate per-member outcomes for the period
    const outcomes = await db('member_outcome_snapshots as s')
      .join('members as m', 's.member_id', 'm.id')
      .where({ 's.gym_id': gymId })
      .where('s.week_start', '>=', since)
      .groupBy('s.member_id', 'm.name', 'm.phone', 'm.photo_url', 'm.status')
      .select(
        's.member_id',
        'm.name',
        'm.phone',
        'm.photo_url',
        'm.status',
        db.raw('SUM(s.checkin_count) as total_checkins'),
        db.raw('MAX(s.streak_days) as peak_streak'),
        db.raw('ROUND(AVG(s.fitness_score)::numeric, 1) as avg_fitness_score'),
        db.raw('SUM(s.total_steps) as total_steps'),
        db.raw('SUM(s.workout_count) as total_workouts'),
        db.raw('BOOL_OR(s.used_vira_ai) as uses_vira'),
        db.raw('BOOL_OR(s.used_circles) as uses_circles'),
        db.raw('BOOL_OR(s.used_sleep_tracker) as uses_sleep'),
        db.raw('COUNT(s.id) as weeks_tracked'),
      )
      .orderBy(sort === 'fitness_score' ? 'avg_fitness_score' : sort === 'streak' ? 'peak_streak' : 'total_checkins', order)
      .limit(limit)

    return {
      period_weeks: weeks,
      members: outcomes.map(o => ({
        member_id:         o.member_id,
        name:              o.name,
        phone:             o.phone,
        photo_url:         o.photo_url,
        status:            o.status,
        total_checkins:    parseInt(o.total_checkins || 0),
        peak_streak:       parseInt(o.peak_streak || 0),
        avg_fitness_score: parseFloat(o.avg_fitness_score || 0),
        total_steps:       parseInt(o.total_steps || 0),
        total_workouts:    parseInt(o.total_workouts || 0),
        uses_vira:         !!o.uses_vira,
        uses_circles:      !!o.uses_circles,
        uses_sleep:        !!o.uses_sleep,
        weeks_tracked:     parseInt(o.weeks_tracked || 0),
      })),
    }
  })
}
