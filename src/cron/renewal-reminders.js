import db from '../config/database.js';
import redis from '../config/redis.js';
import { sendRenewalReminder } from '../services/whatsapp.service.js';
import { sendRenewalSMS } from '../services/sms.service.js';

/**
 * Renewal Reminders Cron Job
 *
 * Runs daily at 10 AM IST. Queries members whose active membership
 * end_date is exactly 7 days, 3 days, or 1 day away. Sends WhatsApp
 * and SMS reminders, with Redis-based deduplication to prevent
 * double-sends within the same day.
 */

const REMINDER_DAYS = [7, 3, 1];
const REDIS_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Build a Redis dedup key for a specific member + reminder day.
 */
function dedupKey(memberId, daysLeft) {
  return `renewal_reminder:${memberId}:${daysLeft}`;
}

/**
 * Add N calendar days to a date string (YYYY-MM-DD) and return YYYY-MM-DD.
 */
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Query all members with active memberships expiring on a specific date.
 */
async function getMembersExpiringOn(targetDate) {
  return db('memberships')
    .join('members', 'memberships.member_id', 'members.id')
    .join('gyms', 'memberships.gym_id', 'gyms.id')
    .where('memberships.status', 'active')
    .where('members.status', 'active')
    .whereRaw('DATE(memberships.end_date) = ?', [targetDate])
    .select(
      'memberships.id as membership_id',
      'memberships.gym_id',
      'memberships.end_date',
      'memberships.plan_name',
      'members.id as member_id',
      'members.name as member_name',
      'members.phone',
      'members.email',
      'gyms.id as gym_id',
      'gyms.gym_name',
      'gyms.notification_settings'
    );
}

/**
 * Send reminders for a batch of members at a given daysLeft threshold.
 * Returns { sent, skipped, errors } counts.
 */
async function sendRemindersForBatch(members, daysLeft) {
  const stats = { sent: 0, skipped_no_phone: 0, skipped_already_sent: 0, errors: 0 };

  for (const m of members) {
    // Skip members without a phone number
    if (!m.phone) {
      stats.skipped_no_phone++;
      continue;
    }

    // Check Redis dedup — skip if already sent today
    const key = dedupKey(m.member_id, daysLeft);
    try {
      const alreadySent = await redis.get(key);
      if (alreadySent) {
        stats.skipped_already_sent++;
        continue;
      }
    } catch (err) {
      // If Redis is down, proceed anyway (best effort dedup)
      console.warn(`[renewal-reminders] Redis check failed for ${key}:`, err.message);
    }

    // Respect gym notification preferences
    const prefs = m.notification_settings || {};
    if (prefs.expiry_alerts === false) {
      stats.skipped_already_sent++;
      continue;
    }

    const member = { name: m.member_name, phone: m.phone };
    const gym = { id: m.gym_id, name: m.gym_name, gym_name: m.gym_name };

    try {
      const tasks = [];

      if (prefs.whatsapp_enabled !== false) {
        tasks.push(sendRenewalReminder(member, gym, daysLeft));
      }
      if (prefs.sms_enabled !== false) {
        tasks.push(sendRenewalSMS(m.phone, m.member_name, m.gym_name, daysLeft));
      }

      await Promise.all(tasks);
      stats.sent++;

      // Mark as sent in Redis with 24h TTL
      try {
        await redis.set(key, '1', { EX: REDIS_TTL_SECONDS });
      } catch (err) {
        console.warn(`[renewal-reminders] Redis set failed for ${key}:`, err.message);
      }

      // Rate limit: ~10 messages/second
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      stats.errors++;
      console.error(
        `[renewal-reminders] Failed for member ${m.member_id} (${m.member_name}):`,
        err.message
      );
    }
  }

  return stats;
}

/**
 * Main entry point — called by the scheduler.
 */
export async function runRenewalReminders() {
  const today = new Date().toISOString().split('T')[0];
  const results = {};
  let totalSent = 0;
  let totalErrors = 0;

  console.log(`[renewal-reminders] Starting for date ${today}`);

  for (const daysLeft of REMINDER_DAYS) {
    const targetDate = addDays(today, daysLeft);
    const members = await getMembersExpiringOn(targetDate);

    console.log(
      `[renewal-reminders] Found ${members.length} members expiring in ${daysLeft} days (${targetDate})`
    );

    if (members.length === 0) {
      results[`${daysLeft}_days`] = { members_found: 0, sent: 0, skipped_no_phone: 0, skipped_already_sent: 0, errors: 0 };
      continue;
    }

    const stats = await sendRemindersForBatch(members, daysLeft);
    results[`${daysLeft}_days`] = { members_found: members.length, ...stats };

    totalSent += stats.sent;
    totalErrors += stats.errors;
  }

  console.log(
    `[renewal-reminders] Done. Sent: ${totalSent}, Errors: ${totalErrors}`
  );

  return {
    date: today,
    total_sent: totalSent,
    total_errors: totalErrors,
    breakdown: results,
  };
}
