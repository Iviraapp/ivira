import db from '../config/database.js';
import redis from '../config/redis.js';
import { sendToMember } from '../services/push.service.js';

/**
 * Class Reminder Push Notification Cron Job
 *
 * Runs every hour. Finds class sessions starting in:
 *   - 50–70 minutes (1-hour reminder)
 *   - 23–25 hours   (24-hour reminder)
 *
 * For each session, sends a push notification to every member with a
 * confirmed booking. Uses Redis dedup key
 * `class_reminder:{sessionId}:{type}:{memberId}` to prevent duplicate sends.
 */

const REDIS_TTL = 26 * 60 * 60; // 26 hours — covers any hourly re-run overlap

function dedupKey(sessionId, type, memberId) {
  return `class_reminder:${sessionId}:${type}:${memberId}`;
}

/**
 * Build a Date from a class_sessions row.
 * session_date is 'YYYY-MM-DD', start_time is 'HH:MM' or 'HH:MM:SS'.
 * Treats both as UTC (matching how knex stores them from the DB).
 */
function sessionStartDate(session) {
  return new Date(`${session.session_date}T${session.start_time}Z`);
}

async function sendClassReminder(session, memberId, type) {
  const key = dedupKey(session.id, type, memberId);

  // Redis dedup — silently continue if Redis is unavailable
  try {
    const already = await redis.get(key);
    if (already) return false; // already sent
    await redis.set(key, '1', { EX: REDIS_TTL });
  } catch (_) {
    // Redis down — continue anyway; may double-send, which is acceptable
  }

  const startDate = sessionStartDate(session);

  const timeStr = startDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
  const dateStr = startDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const className = session.class_name || 'Class';

  const title = type === '1h'
    ? `Your class starts in 1 hour! 🏋️`
    : `Class tomorrow — don't forget! 📅`;

  const body = type === '1h'
    ? `${className} at ${timeStr}`
    : `${className} on ${dateStr} at ${timeStr}`;

  try {
    await sendToMember(session.gym_id, memberId, {
      title,
      body,
      data: { type: 'class_reminder', sessionId: session.id, screen: 'Classes' },
    });
    return true;
  } catch (err) {
    console.warn('[ClassReminders] push failed for member', memberId, ':', err?.message);
    return false;
  }
}

/**
 * Fetch sessions in a time window, joined with gym_classes for the class name.
 * session_date + start_time are combined into a comparable timestamp in the DB.
 */
async function fetchSessionsInWindow(fromDate, toDate) {
  // Combine session_date and start_time into a timestamp for comparison.
  // Both are stored without timezone; treat as UTC to match sessionStartDate().
  return db('class_sessions as s')
    .join('gym_classes as c', 's.class_id', 'c.id')
    .whereNot('s.status', 'cancelled')
    .whereRaw(
      "(s.session_date::text || 'T' || s.start_time || 'Z')::timestamptz BETWEEN ? AND ?",
      [fromDate.toISOString(), toDate.toISOString()]
    )
    .select('s.*', 'c.name as class_name');
}

/**
 * Fetch confirmed bookings for a session.
 */
async function fetchBookings(sessionId) {
  return db('class_bookings')
    .where({ session_id: sessionId, status: 'confirmed' })
    .select('member_id');
}

/**
 * Main entry point — called by the scheduler.
 */
export async function runClassReminders() {
  try {
    const now = new Date();

    // 1-hour window: sessions starting 50–70 min from now
    const oneHourFrom = new Date(now.getTime() + 50 * 60 * 1000);
    const oneHourTo   = new Date(now.getTime() + 70 * 60 * 1000);

    // 24-hour window: sessions starting 23h–25h from now
    const dayFrom = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const dayTo   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const [oneHourSessions, daySessions] = await Promise.all([
      fetchSessionsInWindow(oneHourFrom, oneHourTo),
      fetchSessionsInWindow(dayFrom, dayTo),
    ]);

    console.log(
      `[ClassReminders] 1h window: ${oneHourSessions.length} sessions | 24h window: ${daySessions.length} sessions`
    );

    let sent = 0;

    // Process 1-hour reminders
    for (const session of oneHourSessions) {
      const bookings = await fetchBookings(session.id);
      for (const booking of bookings) {
        const ok = await sendClassReminder(session, booking.member_id, '1h');
        if (ok) sent++;
        await new Promise((r) => setTimeout(r, 50)); // light rate-limit
      }
    }

    // Process 24-hour reminders
    for (const session of daySessions) {
      const bookings = await fetchBookings(session.id);
      for (const booking of bookings) {
        const ok = await sendClassReminder(session, booking.member_id, '24h');
        if (ok) sent++;
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    console.log(`[ClassReminders] Done. Notifications sent: ${sent}`);

    return {
      oneHourSessions: oneHourSessions.length,
      daySessions: daySessions.length,
      notificationsSent: sent,
    };
  } catch (err) {
    console.error('[ClassReminders] Fatal error:', err?.message);
    throw err; // re-throw so the scheduler can log it via logCronError
  }
}
