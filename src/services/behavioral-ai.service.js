import db from '../config/database.js';
import eventBus from './event-bus.service.js';

/**
 * Behavioral AI — Contextual Reminder Engine
 *
 * Schedules intelligent, context-aware notifications based on live user data:
 * - Hydration reminders during active fasts
 * - Fasting milestone celebrations (12h fat-burning, 16h ketosis, 20h deep autophagy)
 * - At-risk member warnings (no check-in for 3+ days, declining frequency)
 * - Streak nudges (about to break streak, milestone streaks)
 * - Nutrition gap alerts (missed meals, calorie deficit)
 */

const FASTING_MILESTONES = [
  { hours: 12, title: 'Fat Burning Activated', body: 'You\'ve hit 12 hours — your body is now switching to fat for fuel. Keep going.' },
  { hours: 16, title: 'Ketosis Zone', body: 'Ketosis is kicking in. Your cells are entering autophagy — cellular cleanup mode.' },
  { hours: 18, title: 'Deep Fat Burn', body: '18 hours in. Growth hormone is surging. This is elite-level fasting.' },
  { hours: 20, title: 'Autophagy Peak', body: '20 hours of fasting. Your body is recycling damaged proteins at peak efficiency.' },
  { hours: 24, title: 'Warrior Fast Complete', body: '24 hours. You\'ve completed a full warrior fast. Break it gently with protein + fats.' },
];

const AT_RISK_THRESHOLDS = {
  daysNoCheckin: 3,       // No gym visit in 3 days
  frequencyDrop: 0.5,     // Frequency dropped by 50% vs previous week
  streakBreakWarning: 1,  // 1 day before streak would break
};

/**
 * Evaluate a member's fasting state and schedule milestone notifications.
 */
export async function evaluateFastingMilestones(gymId, memberId) {
  const activeState = await db('member_fasting_state')
    .where({ gym_id: gymId, member_id: memberId, is_active: true })
    .first();

  if (!activeState) return [];

  const elapsedMs = Date.now() - new Date(activeState.start_time).getTime();
  const elapsedHours = elapsedMs / 3600000;

  // Find already-sent milestones for this fast
  const sentMilestones = await db('contextual_reminders')
    .where({ gym_id: gymId, member_id: memberId, reminder_type: 'fasting_milestone' })
    .where('created_at', '>=', activeState.start_time)
    .pluck('title');

  const scheduled = [];

  for (const milestone of FASTING_MILESTONES) {
    if (elapsedHours >= milestone.hours && !sentMilestones.includes(milestone.title)) {
      const reminder = await scheduleReminder(gymId, memberId, {
        reminder_type: 'fasting_milestone',
        channel: 'push',
        title: milestone.title,
        body: milestone.body,
        scheduled_for: new Date(),
        context_data: {
          elapsed_hours: Math.round(elapsedHours * 10) / 10,
          protocol: activeState.protocol,
          milestone_hours: milestone.hours,
        },
      });
      scheduled.push(reminder);

      // Publish real-time event for dashboard
      eventBus.publish(gymId, 'fasting_milestone', {
        memberId,
        milestone: milestone.title,
        elapsedHours: Math.round(elapsedHours * 10) / 10,
      });
    }
  }

  return scheduled;
}

/**
 * Evaluate at-risk members who haven't checked in recently.
 * Called by cron job.
 */
export async function evaluateAtRiskMembers(gymId) {
  const threshold = new Date(Date.now() - AT_RISK_THRESHOLDS.daysNoCheckin * 86400000);

  // Members who haven't checked in for 3+ days and are active
  const atRiskMembers = await db('members')
    .select('members.id', 'members.name', 'members.phone')
    .leftJoin(
      db('checkins')
        .select('member_id')
        .max('checked_in_at as last_checkin')
        .where('gym_id', gymId)
        .groupBy('member_id')
        .as('last_checkins'),
      'members.id',
      'last_checkins.member_id',
    )
    .where('members.gym_id', gymId)
    .where('members.status', 'active')
    .where(function () {
      this.whereNull('last_checkins.last_checkin')
        .orWhere('last_checkins.last_checkin', '<', threshold);
    });

  const scheduled = [];

  for (const member of atRiskMembers) {
    // Check if we already sent an at-risk warning in the last 48h
    const recentWarning = await db('contextual_reminders')
      .where({ gym_id: gymId, member_id: member.id, reminder_type: 'at_risk_warning' })
      .where('created_at', '>', new Date(Date.now() - 48 * 3600000))
      .first();

    if (recentWarning) continue;

    const reminder = await scheduleReminder(gymId, member.id, {
      reminder_type: 'at_risk_warning',
      channel: 'whatsapp',
      title: 'We miss you at the gym!',
      body: `Hey ${member.name}, we noticed you haven't been in for a few days. Your consistency is your superpower — come back and crush it today.`,
      scheduled_for: new Date(),
      context_data: { days_absent: AT_RISK_THRESHOLDS.daysNoCheckin, member_name: member.name },
    });
    scheduled.push(reminder);

    // Publish to owner dashboard
    eventBus.publish(gymId, 'at_risk', {
      memberId: member.id,
      memberName: member.name,
      daysAbsent: AT_RISK_THRESHOLDS.daysNoCheckin,
    });
  }

  return scheduled;
}

/**
 * Evaluate streak health — warn members who are about to break a streak.
 */
export async function evaluateStreakHealth(gymId) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Members with 3+ day streaks who haven't checked in today
  const streakMembers = await db('members')
    .select('members.id', 'members.name')
    .where('members.gym_id', gymId)
    .where('members.status', 'active')
    .whereNotExists(function () {
      this.select(1).from('checkins')
        .whereRaw('checkins.member_id = members.id')
        .where('checkins.gym_id', gymId)
        .whereRaw("DATE(checked_in_at) = CURRENT_DATE");
    })
    .whereExists(function () {
      // Had a check-in yesterday (streak is alive but at risk)
      this.select(1).from('checkins')
        .whereRaw('checkins.member_id = members.id')
        .where('checkins.gym_id', gymId)
        .whereRaw("DATE(checked_in_at) = CURRENT_DATE - INTERVAL '1 day'");
    });

  const scheduled = [];

  for (const member of streakMembers) {
    // Count current streak
    const streakResult = await db.raw(`
      WITH streak_days AS (
        SELECT DISTINCT DATE(checked_in_at) as d
        FROM checkins
        WHERE member_id = ? AND gym_id = ?
        ORDER BY d DESC
      )
      SELECT COUNT(*) as streak
      FROM (
        SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d DESC) * INTERVAL '1 day') as grp
        FROM streak_days
      ) sub
      WHERE grp = (
        SELECT d - INTERVAL '1 day' FROM streak_days LIMIT 1
      ) - INTERVAL '0 day'
    `, [member.id, gymId]);

    const streak = parseInt(streakResult.rows?.[0]?.streak, 10) || 0;
    if (streak < 3) continue;

    // Don't send if already nudged today
    const alreadySent = await db('contextual_reminders')
      .where({ gym_id: gymId, member_id: member.id, reminder_type: 'streak_nudge' })
      .whereRaw("DATE(created_at) = CURRENT_DATE")
      .first();

    if (alreadySent) continue;

    const reminder = await scheduleReminder(gymId, member.id, {
      reminder_type: 'streak_nudge',
      channel: 'push',
      title: `${streak}-Day Streak at Risk!`,
      body: `You've shown up ${streak} days in a row. Don't let it end today — even 20 minutes counts.`,
      scheduled_for: new Date(),
      context_data: { streak_days: streak },
    });
    scheduled.push(reminder);
  }

  return scheduled;
}

/**
 * Core: Schedule a contextual reminder and trigger delivery.
 */
async function scheduleReminder(gymId, memberId, data) {
  const [reminder] = await db('contextual_reminders')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      reminder_type: data.reminder_type,
      channel: data.channel,
      title: data.title,
      body: data.body,
      context_data: JSON.stringify(data.context_data || {}),
      scheduled_for: data.scheduled_for,
      status: 'scheduled',
    })
    .returning('*');

  // Fire-and-forget: deliver via appropriate channel
  deliverReminder(reminder).catch((err) => {
    console.error(`[behavioral-ai] Failed to deliver reminder ${reminder.id}:`, err.message);
  });

  return reminder;
}

/**
 * Deliver a reminder via its configured channel.
 */
async function deliverReminder(reminder) {
  try {
    if (reminder.channel === 'push') {
      const { sendToMember } = await import('./push.service.js');
      await sendToMember(reminder.gym_id, reminder.member_id, {
        title: reminder.title,
        body: reminder.body,
        data: { type: reminder.reminder_type, reminderId: reminder.id },
      });
    } else if (reminder.channel === 'whatsapp') {
      const { sendTemplateMessage } = await import('./whatsapp.service.js');
      const member = await db('members').where({ id: reminder.member_id }).first();
      if (member?.phone) {
        await sendTemplateMessage(member.phone, 'contextual_reminder', [
          { type: 'body', parameters: [{ type: 'text', text: reminder.title }, { type: 'text', text: reminder.body }] },
        ]);
      }
    }

    await db('contextual_reminders')
      .where({ id: reminder.id })
      .update({ status: 'sent', sent_at: new Date(), updated_at: new Date() });
  } catch (err) {
    await db('contextual_reminders')
      .where({ id: reminder.id })
      .update({ status: 'scheduled', updated_at: new Date() });
    throw err;
  }
}

/**
 * Run all behavioral evaluations for a gym. Called by cron.
 */
export async function runBehavioralEngine(gymId) {
  const results = {
    at_risk: await evaluateAtRiskMembers(gymId),
    streaks: await evaluateStreakHealth(gymId),
  };

  // Evaluate fasting milestones for all active fasters
  const activeFasters = await db('member_fasting_state')
    .where({ gym_id: gymId, is_active: true })
    .select('member_id');

  results.fasting_milestones = [];
  for (const faster of activeFasters) {
    const milestones = await evaluateFastingMilestones(gymId, faster.member_id);
    results.fasting_milestones.push(...milestones);
  }

  return {
    at_risk_warnings: results.at_risk.length,
    streak_nudges: results.streaks.length,
    fasting_milestones: results.fasting_milestones.length,
  };
}
