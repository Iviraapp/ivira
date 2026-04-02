// ═══════════════════════════════════════════════════════════════════
// outcome-snapshots.js — Weekly outcome snapshot cron job
//
// Runs every Monday at 2 AM IST.
// For every active member, writes one row to member_outcome_snapshots
// summarising the previous 7 days.
//
// Register in cron/scheduler.js:
//   import { runOutcomeSnapshots } from './outcome-snapshots.js'
//   // Add to dailyJobs array:
//   { name: 'outcome_snapshots', fn: runOutcomeSnapshots, hour: 2, minute: 0 }
//   // BUT only run on Mondays — add a day-of-week guard inside the fn.
// ═══════════════════════════════════════════════════════════════════

import db from '../config/database.js'

/**
 * Returns the Monday of the previous week (YYYY-MM-DD).
 */
function getPreviousWeekStart() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  // Days since last Monday
  const daysSinceMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysSinceMonday - 7)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

/**
 * Build a snapshot for a single member for the given week.
 */
async function buildMemberSnapshot(gymId, memberId, weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const [
    checkins,
    workouts,
    activity,
    sleepData,
    nutrition,
    viraUsage,
    circleActivity,
    sleepTracking,
    foodScans,
    streak,
  ] = await Promise.all([

    // Check-ins in the week
    db('checkins')
      .where({ gym_id: gymId, member_id: memberId })
      .where('checked_in_at', '>=', weekStart)
      .where('checked_in_at', '<', weekEndStr)
      .count('* as n').first(),

    // Workout sessions
    db('workout_sessions')
      .where({ gym_id: gymId, member_id: memberId })
      .where('created_at', '>=', weekStart)
      .where('created_at', '<', weekEndStr)
      .count('* as n').first(),

    // Steps + activity
    db('daily_activity')
      .where({ gym_id: gymId, member_id: memberId })
      .where('date', '>=', weekStart)
      .where('date', '<', weekEndStr)
      .sum('steps as steps').first(),

    // Sleep
    db('sleep_sessions')
      .where({ gym_id: gymId, member_id: memberId })
      .where('start_time', '>=', weekStart)
      .where('start_time', '<', weekEndStr)
      .avg('sleep_score as avg_score').first(),

    // Nutrition
    db('nutrition_logs')
      .where({ gym_id: gymId, member_id: memberId })
      .where('date', '>=', weekStart)
      .where('date', '<', weekEndStr)
      .avg('calories as avg_cal').first(),

    // Vira AI usage (any AI requests this week — proxy via nutrition logs or
    // check ai_requests table if it exists, otherwise skip gracefully)
    db('ai_requests')
      .where({ gym_id: gymId, member_id: memberId })
      .where('created_at', '>=', weekStart)
      .where('created_at', '<', weekEndStr)
      .count('* as n').first()
      .catch(() => ({ n: 0 })), // graceful if table doesn't exist

    // Circle/pod feed activity
    db('pod_feed')
      .join('pod_members', 'pod_feed.pod_id', 'pod_members.pod_id')
      .where({ 'pod_feed.member_id': memberId })
      .where('pod_feed.created_at', '>=', weekStart)
      .where('pod_feed.created_at', '<', weekEndStr)
      .count('* as n').first()
      .catch(() => ({ n: 0 })),

    // Sleep tracker usage
    db('sleep_sessions')
      .where({ gym_id: gymId, member_id: memberId })
      .where('start_time', '>=', weekStart)
      .where('start_time', '<', weekEndStr)
      .count('* as n').first()
      .catch(() => ({ n: 0 })),

    // Food scanner usage
    db('food_scan_logs')
      .where({ member_id: memberId })
      .where('created_at', '>=', weekStart)
      .where('created_at', '<', weekEndStr)
      .count('* as n').first()
      .catch(() => ({ n: 0 })),

    // Current streak (from member record)
    db('members').where({ id: memberId }).select('streak').first().catch(() => ({ streak: 0 })),
  ])

  // Calculate IVIRA Fitness Score (simplified — full calc is in FitnessScoreScreen)
  const checkinCount  = parseInt(checkins?.n || 0)
  const workoutCount  = parseInt(workouts?.n || 0)
  const totalSteps    = parseInt(activity?.steps || 0)
  const avgSleep      = parseFloat(sleepData?.avg_score || 0)
  const streakDays    = parseInt(streak?.streak || 0)

  const consistencyScore = Math.min(checkinCount / 5, 1) * 25  // 5 checkins/week = max
  const activityScore    = Math.min(totalSteps / 70000, 1) * 25 // 70K steps/week = max
  const strengthScore    = Math.min(workoutCount / 4, 1) * 25   // 4 workouts/week = max
  const sleepScore       = avgSleep > 0 ? (avgSleep / 100) * 15 : 7.5
  const streakScore      = Math.min(streakDays / 30, 1) * 10
  const fitnessScore     = Math.round(consistencyScore + activityScore + strengthScore + sleepScore + streakScore)

  return {
    gym_id:              gymId,
    member_id:           memberId,
    week_start:          weekStart,
    checkin_count:       checkinCount,
    streak_days:         streakDays,
    total_steps:         totalSteps,
    workout_count:       workoutCount,
    avg_sleep_score:     avgSleep > 0 ? parseFloat(avgSleep.toFixed(2)) : null,
    avg_calories:        parseFloat(nutrition?.avg_cal || 0).toFixed(2) || null,
    fitness_score:       fitnessScore,
    used_vira_ai:        parseInt(viraUsage?.n || 0) > 0,
    used_circles:        parseInt(circleActivity?.n || 0) > 0,
    used_sleep_tracker:  parseInt(sleepTracking?.n || 0) > 0,
    used_food_scanner:   parseInt(foodScans?.n || 0) > 0,
  }
}

/**
 * Main export — called by the cron scheduler.
 * Runs for all active members across all gyms.
 */
export async function runOutcomeSnapshots() {
  // Only run on Mondays (IST day check)
  const istNow = new Date(Date.now() + 5.5 * 3600000)
  const dayOfWeek = istNow.getDay() // 0=Sun, 1=Mon
  if (dayOfWeek !== 1) {
    return { skipped: true, reason: 'Not Monday IST' }
  }

  const weekStart = getPreviousWeekStart()
  console.log(`[outcome_snapshots] Generating snapshots for week starting ${weekStart}`)

  // Get all active members across all gyms
  const members = await db('members')
    .where({ status: 'active' })
    .select('id', 'gym_id')

  let written = 0
  let skipped = 0
  const BATCH_SIZE = 50

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map(async (member) => {
      try {
        const snapshot = await buildMemberSnapshot(member.gym_id, member.id, weekStart)

        // Upsert — safe to re-run
        await db('member_outcome_snapshots')
          .insert(snapshot)
          .onConflict(['member_id', 'week_start'])
          .merge()

        written++
      } catch (err) {
        console.error(`[outcome_snapshots] Failed for member ${member.id}:`, err.message)
        skipped++
      }
    }))
  }

  console.log(`[outcome_snapshots] Done — ${written} written, ${skipped} failed`)
  return { written, skipped, week_start: weekStart }
}
