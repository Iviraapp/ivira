import db from '../config/database.js';
import { AppError } from '../utils/errors.js';
import eventBus from './event-bus.service.js';

/**
 * Cron Jobs Service
 *
 * Provides job execution functions and structured logging for all
 * scheduled background tasks. Each job run is recorded in cron_logs
 * with start time, duration, status, and result/error details.
 */

// ─── Cron Logging ─────────────────────────────────────────────────────

/**
 * Log the start of a cron job. Returns the log ID for subsequent updates.
 */
export async function logCronStart(jobName) {
  const [log] = await db('cron_logs')
    .insert({
      job_name: jobName,
      status: 'started',
      started_at: new Date(),
    })
    .returning('*');

  return log.id;
}

/**
 * Log successful completion of a cron job.
 */
export async function logCronEnd(logId, result = {}) {
  const log = await db('cron_logs').where({ id: logId }).first();
  if (!log) return;

  const durationMs = Date.now() - new Date(log.started_at).getTime();

  await db('cron_logs')
    .where({ id: logId })
    .update({
      status: 'completed',
      result: JSON.stringify(result),
      duration_ms: durationMs,
      completed_at: new Date(),
      updated_at: new Date(),
    });
}

/**
 * Log a cron job failure.
 */
export async function logCronError(logId, error) {
  const log = await db('cron_logs').where({ id: logId }).first();
  if (!log) return;

  const durationMs = Date.now() - new Date(log.started_at).getTime();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  await db('cron_logs')
    .where({ id: logId })
    .update({
      status: 'failed',
      error: JSON.stringify({ message: errorMessage, stack: errorStack }),
      duration_ms: durationMs,
      completed_at: new Date(),
      updated_at: new Date(),
    });
}

// ─── Job: Membership Expiry Check ─────────────────────────────────────

/**
 * Find members whose memberships are expiring in 7 days, 3 days, or today.
 * Returns categorised lists so the caller (or notification service) can act.
 */
export async function runMembershipExpiryCheck() {
  const today = new Date().toISOString().split('T')[0];

  const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const in7Days = addDays(today, 7);
  const in3Days = addDays(today, 3);

  const baseQuery = () =>
    db('memberships')
      .join('members', 'memberships.member_id', 'members.id')
      .join('gyms', 'memberships.gym_id', 'gyms.id')
      .where('memberships.status', 'active')
      .select(
        'memberships.id as membership_id',
        'memberships.gym_id',
        'memberships.end_date',
        'memberships.plan_name',
        'memberships.amount_paise',
        'members.id as member_id',
        'members.name as member_name',
        'members.phone',
        'members.email',
        'gyms.gym_name',
        'gyms.owner_name',
        'gyms.notification_settings'
      );

  const [expiringIn7Days, expiringIn3Days, expiringToday] = await Promise.all([
    baseQuery().whereRaw('DATE(memberships.end_date) = ?', [in7Days]),
    baseQuery().whereRaw('DATE(memberships.end_date) = ?', [in3Days]),
    baseQuery().whereRaw('DATE(memberships.end_date) = ?', [today]),
  ]);

  // Send renewal reminders via WhatsApp + SMS (respects gym notification prefs)
  const sendReminders = async (members, daysLeft) => {
    try {
      const [{ sendRenewalReminder }, { sendRenewalSMS }] = await Promise.all([
        import('../services/whatsapp.service.js'),
        import('../services/sms.service.js'),
      ]);
      for (const m of members) {
        const prefs = m.notification_settings || {};
        // Skip if this gym has expiry alerts disabled
        if (prefs.expiry_alerts === false) continue;

        const member = { name: m.member_name, phone: m.phone };
        const gym = { id: m.gym_id, name: m.gym_name, gym_name: m.gym_name };
        const tasks = [];
        if (prefs.whatsapp_enabled !== false) {
          tasks.push(sendRenewalReminder(member, gym, daysLeft).catch(err => console.warn('[Cron]', err?.message)));
        }
        if (prefs.sms_enabled !== false) {
          tasks.push(sendRenewalSMS(m.phone, m.member_name, m.gym_name, daysLeft).catch(err => console.warn('[Cron]', err?.message)));
        }
        Promise.all(tasks).catch(err => console.warn('[Cron]', err?.message));
        // Rate limit
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) {
      console.error('[Cron] Failed to load notification services:', err.message);
    }
  };

  sendReminders(expiringIn7Days, 7).catch(err => console.warn('[Cron]', err?.message));
  sendReminders(expiringIn3Days, 3).catch(err => console.warn('[Cron]', err?.message));
  sendReminders(expiringToday, 0).catch(err => console.warn('[Cron]', err?.message));

  return {
    expiringIn7Days,
    expiringIn3Days,
    expiringToday,
    summary: {
      in7Days: expiringIn7Days.length,
      in3Days: expiringIn3Days.length,
      today: expiringToday.length,
      total: expiringIn7Days.length + expiringIn3Days.length + expiringToday.length,
    },
  };
}

// ─── Job: Dunning Reminders ───────────────────────────────────────────

/**
 * Find overdue payments (memberships past end_date with incomplete dunning)
 * and trigger the next dunning step for each.
 */
export async function runDunningReminders() {
  const today = new Date().toISOString().split('T')[0];

  // Find all memberships that are overdue and haven't completed dunning
  const overdueMemberships = await db('memberships')
    .where('end_date', '<', today)
    .where(function () {
      this.where('dunning_step', '<', 5).orWhereNull('dunning_step');
    })
    .whereIn('status', ['active', 'expired'])
    .join('members', 'memberships.member_id', 'members.id')
    .join('gyms', 'memberships.gym_id', 'gyms.id')
    .select(
      'memberships.id as membership_id',
      'memberships.gym_id',
      'memberships.end_date',
      'memberships.dunning_step',
      'memberships.dunning_next_at',
      'memberships.amount_paise',
      'members.id as member_id',
      'members.name as member_name',
      'members.phone',
      'members.email',
      'gyms.gym_name'
    );

  // Filter to only those where dunning_next_at has passed (or is null for first step)
  const now = new Date();
  const actionable = overdueMemberships.filter((m) => {
    if (!m.dunning_next_at) return true;
    return new Date(m.dunning_next_at) <= now;
  });

  const results = [];
  for (const membership of actionable) {
    const currentStep = membership.dunning_step || 0;
    const nextStep = currentStep + 1;

    // Record the reminder
    try {
      await db('payment_reminders')
        .insert({
          member_id: membership.member_id,
          attempt_number: nextStep,
          channel: 'system',
          status: 'pending',
        })
        .catch(err => console.warn('[Cron]', err?.message)); // Ignore constraint errors

      results.push({
        membership_id: membership.membership_id,
        member_name: membership.member_name,
        gym_name: membership.gym_name,
        current_step: currentStep,
        next_step: nextStep,
        overdue_since: membership.end_date,
      });
    } catch (err) {
      console.error(`Dunning reminder failed for membership ${membership.membership_id}:`, err.message);
    }
  }

  return {
    total_overdue: overdueMemberships.length,
    actionable: actionable.length,
    processed: results.length,
    reminders: results,
  };
}

// ─── Job: Churn Scoring ───────────────────────────────────────────────

/**
 * Compute a churn risk score (0-100) for each active member across all gyms.
 *
 * Factors:
 *  - Days since last check-in (higher = more risk)
 *  - Check-in frequency vs first 30 days (declining = risk)
 *  - Days until membership expiry (closer = more risk)
 *  - Missed consecutive weeks
 *
 * Stores the score in members.churn_score for dashboard display.
 */
export async function runChurnScoring() {
  const activeGyms = await db('gyms')
    .where({ status: 'active' })
    .select('id', 'gym_name');

  const results = [];

  for (const gym of activeGyms) {
    const members = await db('members')
      .where({ gym_id: gym.id, status: 'active' })
      .select('id', 'name', 'created_at');

    let scored = 0;

    for (const member of members) {
      try {
        // Get last check-in
        const lastCheckin = await db('checkins')
          .where({ member_id: member.id })
          .orderBy('checked_in_at', 'desc')
          .first();

        // Get total check-ins in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [{ count: recentCheckins }] = await db('checkins')
          .where({ member_id: member.id })
          .where('checked_in_at', '>=', thirtyDaysAgo.toISOString())
          .count();

        // Get active membership
        const membership = await db('memberships')
          .where({ member_id: member.id, status: 'active' })
          .orderBy('end_date', 'desc')
          .first();

        // Calculate score components (each 0-25, total 0-100)
        let score = 0;

        // 1. Days since last check-in (0-25)
        if (lastCheckin) {
          const daysSince = Math.floor(
            (Date.now() - new Date(lastCheckin.checked_in_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          score += Math.min(25, Math.floor(daysSince * 1.5));
        } else {
          score += 25; // Never checked in = max risk
        }

        // 2. Check-in frequency decline (0-25)
        const recentCount = parseInt(recentCheckins, 10);
        if (recentCount === 0) {
          score += 25;
        } else if (recentCount < 4) {
          score += 20; // Less than once a week
        } else if (recentCount < 8) {
          score += 12; // Once-twice a week
        } else if (recentCount < 16) {
          score += 5;  // 2-4 times a week
        }
        // 16+ check-ins in 30 days = no risk from frequency

        // 3. Days until membership expiry (0-25)
        if (membership) {
          const daysUntilExpiry = Math.floor(
            (new Date(membership.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry < 0) {
            score += 25; // Already expired
          } else if (daysUntilExpiry <= 7) {
            score += 20;
          } else if (daysUntilExpiry <= 14) {
            score += 12;
          } else if (daysUntilExpiry <= 30) {
            score += 5;
          }
        } else {
          score += 25; // No active membership
        }

        // 4. Member tenure risk (0-25) — newer members churn more
        const tenureDays = Math.floor(
          (Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (tenureDays < 30) {
          score += 15; // First month, high risk
        } else if (tenureDays < 90) {
          score += 10;
        } else if (tenureDays < 180) {
          score += 5;
        }

        // Clamp to 0-100
        score = Math.max(0, Math.min(100, score));

        // Store score
        await db('members')
          .where({ id: member.id })
          .update({ churn_score: score, updated_at: new Date() });

        scored++;
      } catch (err) {
        console.error(`Churn scoring failed for member ${member.id}:`, err.message);
      }
    }

    results.push({
      gym_id: gym.id,
      gym_name: gym.gym_name,
      members_scored: scored,
      total_members: members.length,
    });
  }

  // Flag at-risk members after scoring
  const atRiskCount = await flagAtRiskMembers();

  return {
    gyms_processed: results.length,
    total_members_scored: results.reduce((sum, r) => sum + r.members_scored, 0),
    at_risk_flagged: atRiskCount,
    details: results,
  };
}

// ─── Job: Flag At-Risk Members ─────────────────────────────────────────

/**
 * Flag members whose 7-day rolling check-in average dropped > 50%
 * compared to the previous 7-day window. Clears the flag for members
 * who have recovered (2+ check-ins in last 3 days).
 */
export async function flagAtRiskMembers() {
  const atRisk = await db.raw(`
    WITH weekly_avg AS (
      SELECT member_id, gym_id,
        COUNT(CASE WHEN checked_in_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_7d,
        COUNT(CASE WHEN checked_in_at >= NOW() - INTERVAL '14 days' AND checked_in_at < NOW() - INTERVAL '7 days' THEN 1 END) as prev_7d
      FROM checkins
      WHERE checked_in_at >= NOW() - INTERVAL '14 days'
      GROUP BY member_id, gym_id
    )
    SELECT member_id, gym_id, recent_7d, prev_7d
    FROM weekly_avg
    WHERE prev_7d > 0 AND (recent_7d::float / prev_7d::float) < 0.5
  `);

  for (const row of atRisk.rows) {
    const updated = await db('members')
      .where({ id: row.member_id })
      .whereNot({ at_risk: true })
      .update({ at_risk: true, at_risk_since: new Date() })
      .returning('*');

    // Create announcement + SSE event for newly flagged members
    if (updated.length > 0) {
      const member = updated[0];
      try {
        await db('gym_announcements').insert({
          gym_id: row.gym_id,
          member_id: row.member_id,
          type: 'at_risk',
          title: `${member.name} hasn't visited in 7+ days`,
          body: `Check-ins dropped from ${row.prev_7d} to ${row.recent_7d} in the last week.`,
          metadata: JSON.stringify({ recent_7d: row.recent_7d, prev_7d: row.prev_7d }),
        });
        eventBus.publish(row.gym_id, 'at_risk', {
          memberId: row.member_id,
          member_name: member.name,
          member_phone: member.phone,
          daysSinceLastVisit: row.recent_7d === 0 ? '7+' : null,
        });
      } catch (err) { console.warn('[Cron]', err?.message); } // non-critical
    }
  }

  // Clear at-risk flag for members who recovered
  await db.raw(`
    UPDATE members SET at_risk = false, at_risk_since = null
    WHERE at_risk = true AND id IN (
      SELECT member_id FROM checkins
      WHERE checked_in_at >= NOW() - INTERVAL '3 days'
      GROUP BY member_id
      HAVING COUNT(*) >= 2
    )
  `);

  return atRisk.rows.length;
}

// ─── Job: Check Milestones ───────────────────────────────────────────

const CHECKIN_MILESTONES = [50, 100, 200, 365, 500, 1000];
const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];

/**
 * Detect members who just hit a check-in or streak milestone.
 * Inserts into gym_announcements and publishes SSE events.
 */
export async function checkMilestones() {
  let totalAnnouncements = 0;

  // Check-in count milestones
  for (const milestone of CHECKIN_MILESTONES) {
    const members = await db.raw(`
      SELECT m.id, m.name, m.gym_id, COUNT(c.id) as total_checkins
      FROM members m
      JOIN checkins c ON c.member_id = m.id
      WHERE m.status = 'active'
      GROUP BY m.id, m.name, m.gym_id
      HAVING COUNT(c.id) = ?
    `, [milestone]);

    for (const row of members.rows) {
      // Skip if already announced
      const existing = await db('gym_announcements')
        .where({ gym_id: row.gym_id, member_id: row.id, type: 'milestone' })
        .whereRaw("metadata->>'milestone' = ?", [String(milestone)])
        .first();
      if (existing) continue;

      await db('gym_announcements').insert({
        gym_id: row.gym_id,
        member_id: row.id,
        type: 'milestone',
        title: `${row.name} hit ${milestone} check-ins!`,
        body: `Congratulations on reaching the ${milestone} check-in milestone.`,
        metadata: JSON.stringify({ milestone, total_checkins: parseInt(row.total_checkins, 10) }),
      });

      eventBus.publish(row.gym_id, 'milestone', {
        memberId: row.id,
        member_name: row.name,
        details: `${milestone} check-ins!`,
        milestone,
      });
      totalAnnouncements++;
    }
  }

  // Streak milestones (consecutive days with at least 1 check-in)
  for (const streakTarget of STREAK_MILESTONES) {
    const streaks = await db.raw(`
      WITH daily_checkins AS (
        SELECT member_id, gym_id, DATE(checked_in_at) as checkin_date
        FROM checkins
        WHERE checked_in_at >= NOW() - INTERVAL '${streakTarget + 1} days'
        GROUP BY member_id, gym_id, DATE(checked_in_at)
      ),
      streaks AS (
        SELECT member_id, gym_id,
          checkin_date - (ROW_NUMBER() OVER (PARTITION BY member_id ORDER BY checkin_date))::int AS grp
        FROM daily_checkins
      )
      SELECT s.member_id, s.gym_id, m.name, COUNT(*) as streak_length
      FROM streaks s
      JOIN members m ON m.id = s.member_id
      WHERE m.status = 'active'
      GROUP BY s.member_id, s.gym_id, s.grp, m.name
      HAVING COUNT(*) = ?
    `, [streakTarget]);

    for (const row of streaks.rows) {
      const existing = await db('gym_announcements')
        .where({ gym_id: row.gym_id, member_id: row.member_id, type: 'streak' })
        .whereRaw("metadata->>'streak' = ?", [String(streakTarget)])
        .first();
      if (existing) continue;

      await db('gym_announcements').insert({
        gym_id: row.gym_id,
        member_id: row.member_id,
        type: 'streak',
        title: `${row.name} is on a ${streakTarget}-day streak!`,
        body: `${streakTarget} consecutive days of showing up. Incredible dedication.`,
        metadata: JSON.stringify({ streak: streakTarget }),
      });

      eventBus.publish(row.gym_id, 'milestone', {
        memberId: row.member_id,
        member_name: row.name,
        details: `${streakTarget}-day streak!`,
        streak: streakTarget,
      });
      totalAnnouncements++;
    }
  }

  return totalAnnouncements;
}

// ─── Job: Reset Occupancy ────────────────────────────────────────────

/**
 * Reset gym occupancy counters daily at midnight.
 */
export async function resetOccupancy() {
  const result = await db('gym_occupancy')
    .update({ current_count: 0, updated_at: new Date() });
  return result;
}

// ─── Job: Daily Stats ─────────────────────────────────────────────────

/**
 * Compute and store a daily snapshot for each active gym:
 *  - Total active members
 *  - New members today
 *  - Check-ins today
 *  - Revenue collected today (paise)
 *  - Expiring memberships this week
 */
export async function runDailyStats() {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split('T')[0];

  const activeGyms = await db('gyms')
    .where({ status: 'active' })
    .select('id', 'gym_name');

  const results = [];

  for (const gym of activeGyms) {
    try {
      const [{ count: activeMembers }] = await db('members')
        .where({ gym_id: gym.id, status: 'active' })
        .count();

      const [{ count: newMembers }] = await db('members')
        .where({ gym_id: gym.id })
        .whereBetween('created_at', [startOfDay, endOfDay])
        .count();

      const [{ count: checkinsToday }] = await db('checkins')
        .where({ gym_id: gym.id })
        .whereBetween('checked_in_at', [startOfDay, endOfDay])
        .count();

      const [{ total: revenuePaise }] = await db('payments')
        .where({ gym_id: gym.id, status: 'captured' })
        .whereBetween('paid_at', [startOfDay, endOfDay])
        .sum('amount_paise as total');

      const [{ count: expiringThisWeek }] = await db('memberships')
        .where({ gym_id: gym.id, status: 'active' })
        .whereBetween('end_date', [today, in7DaysStr])
        .count();

      const snapshot = {
        gym_id: gym.id,
        date: today,
        active_members: parseInt(activeMembers, 10),
        new_members: parseInt(newMembers, 10),
        checkins: parseInt(checkinsToday, 10),
        revenue_paise: parseInt(revenuePaise || 0, 10),
        expiring_this_week: parseInt(expiringThisWeek, 10),
      };

      // Upsert: if stats for this gym+date exist, update; otherwise insert
      const existing = await db('daily_stats')
        .where({ gym_id: gym.id, date: today })
        .first();

      if (existing) {
        await db('daily_stats')
          .where({ id: existing.id })
          .update({ ...snapshot, updated_at: new Date() });
      } else {
        await db('daily_stats').insert(snapshot);
      }

      results.push(snapshot);
    } catch (err) {
      console.error(`Daily stats failed for gym ${gym.id}:`, err.message);
    }
  }

  return {
    date: today,
    gyms_processed: results.length,
    snapshots: results,
  };
}

// ─── Job: Trial Expiry Check ──────────────────────────────────────────

/**
 * Check for gyms whose trial period has expired and update their status.
 * Delegates to the subscription service.
 */
export async function runTrialExpiryCheck() {
  const { checkTrialExpiry } = await import('./subscription.service.js');
  return checkTrialExpiry();
}

// ─── Query: Cron Logs ─────────────────────────────────────────────────

/**
 * Get paginated cron job execution logs with optional filters.
 */
export async function getCronLogs({ jobName, status, page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('cron_logs').orderBy('started_at', 'desc');
  const countQuery = db('cron_logs');

  if (jobName) {
    query.where({ job_name: jobName });
    countQuery.where({ job_name: jobName });
  }
  if (status) {
    query.where({ status });
    countQuery.where({ status });
  }

  const [{ count }] = await countQuery.count();
  const logs = await query.limit(limit).offset(offset);

  // Parse JSON fields for convenience
  const parsed = logs.map((log) => ({
    ...log,
    result: log.result ? JSON.parse(log.result) : null,
    error: log.error ? JSON.parse(log.error) : null,
  }));

  return {
    logs: parsed,
    total: parseInt(count, 10),
    page,
    limit,
  };
}
