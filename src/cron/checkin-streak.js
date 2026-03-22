import db from '../config/database.js';
import redis from '../config/redis.js';
import { sendStreakNudge } from '../services/whatsapp.service.js';

/**
 * Check-in Streak Nudge Cron Job
 *
 * Runs daily at 8 PM IST. Finds members who checked in yesterday but
 * NOT today, have a current streak >= 3 days, and sends a motivational
 * WhatsApp message to encourage them not to break their streak.
 *
 * Uses Redis dedup key `streak_nudge:{memberId}:{date}` to prevent
 * duplicate sends within the same day.
 */

const MIN_STREAK = 3;
const REDIS_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Build a Redis dedup key for streak nudge.
 */
function dedupKey(memberId, date) {
  return `streak_nudge:${memberId}:${date}`;
}

/**
 * Find members who:
 * 1. Checked in yesterday
 * 2. Did NOT check in today (by the time this runs at 8 PM)
 * 3. Have an active streak >= MIN_STREAK days
 *
 * The streak is computed as consecutive calendar days with at least one
 * check-in, counting backwards from yesterday.
 */
async function findStreakAtRiskMembers() {
  // Use a CTE to compute consecutive-day streaks ending yesterday.
  // We look back up to 365 days to find the streak start.
  const result = await db.raw(`
    WITH today_checkins AS (
      SELECT DISTINCT member_id
      FROM checkins
      WHERE DATE(checked_in_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'
    ),
    daily_checkins AS (
      SELECT
        member_id,
        gym_id,
        DATE(checked_in_at AT TIME ZONE 'Asia/Kolkata') AS checkin_date
      FROM checkins
      WHERE checked_in_at >= NOW() - INTERVAL '365 days'
      GROUP BY member_id, gym_id, DATE(checked_in_at AT TIME ZONE 'Asia/Kolkata')
    ),
    streaks AS (
      SELECT
        member_id,
        gym_id,
        checkin_date,
        checkin_date - (ROW_NUMBER() OVER (
          PARTITION BY member_id, gym_id ORDER BY checkin_date
        ))::int AS streak_group
      FROM daily_checkins
    ),
    streak_summary AS (
      SELECT
        member_id,
        gym_id,
        streak_group,
        COUNT(*) AS streak_length,
        MAX(checkin_date) AS streak_end
      FROM streaks
      GROUP BY member_id, gym_id, streak_group
    )
    SELECT
      ss.member_id,
      ss.gym_id,
      ss.streak_length,
      m.name AS member_name,
      m.phone,
      g.gym_name
    FROM streak_summary ss
    JOIN members m ON m.id = ss.member_id
    JOIN gyms g ON g.id = ss.gym_id
    WHERE m.status = 'active'
      AND ss.streak_length >= ${MIN_STREAK}
      AND ss.streak_end = (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata' - INTERVAL '1 day')::date
      AND ss.member_id NOT IN (SELECT member_id FROM today_checkins)
  `);

  return result.rows;
}

/**
 * Main entry point — called by the scheduler.
 */
export async function runCheckinStreakNudge() {
  const today = new Date().toISOString().split('T')[0];
  const stats = { sent: 0, skipped_no_phone: 0, skipped_already_sent: 0, errors: 0 };

  console.log(`[checkin-streak] Starting streak nudge for ${today}`);

  const members = await findStreakAtRiskMembers();

  console.log(`[checkin-streak] Found ${members.length} members at risk of breaking their streak`);

  for (const m of members) {
    // Skip members without a phone number
    if (!m.phone) {
      stats.skipped_no_phone++;
      continue;
    }

    // Check Redis dedup
    const key = dedupKey(m.member_id, today);
    try {
      const alreadySent = await redis.get(key);
      if (alreadySent) {
        stats.skipped_already_sent++;
        continue;
      }
    } catch (err) {
      console.warn(`[checkin-streak] Redis check failed for ${key}:`, err.message);
    }

    const member = { name: m.member_name, phone: m.phone };
    const gym = { id: m.gym_id, name: m.gym_name, gym_name: m.gym_name };

    try {
      await sendStreakNudge(member, gym, m.streak_length);
      stats.sent++;

      // Mark as sent in Redis with 24h TTL
      try {
        await redis.set(key, '1', { EX: REDIS_TTL_SECONDS });
      } catch (err) {
        console.warn(`[checkin-streak] Redis set failed for ${key}:`, err.message);
      }

      // Rate limit: ~10 messages/second
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      stats.errors++;
      console.error(
        `[checkin-streak] Failed for member ${m.member_id} (${m.member_name}):`,
        err.message
      );
    }
  }

  console.log(
    `[checkin-streak] Done. Sent: ${stats.sent}, Skipped: ${stats.skipped_no_phone + stats.skipped_already_sent}, Errors: ${stats.errors}`
  );

  return {
    date: today,
    members_at_risk: members.length,
    ...stats,
  };
}
