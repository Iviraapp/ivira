import db from '../config/database.js';

/**
 * Pod Accountability Cron Jobs
 *
 * Background jobs that keep the Pods system healthy:
 * 1. Mark missed commitments (hourly)
 * 2. Calculate daily pod health (11:59 PM)
 * 3. Backfill small/lonely pods (3 AM)
 * 4. Send commitment reminders (6 AM, 12 PM, 5 PM)
 * 5. Late check-in alerts (every 15 minutes)
 */

const MULTIPLIERS = { diamond: 2.0, gold: 1.5, silver: 1.2, bronze: 1.0 };

/**
 * Determine tier from health score.
 */
function getTier(score) {
  if (score >= 95) return 'diamond';
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  return 'bronze';
}

// ---------------------------------------------------------------------------
// Job 1: Mark Missed Commitments (runs every hour)
// ---------------------------------------------------------------------------

export async function runMarkMissedCommitments() {
  const today = new Date().toISOString().split('T')[0];

  console.log('[pod-jobs] Marking missed commitments before', today);

  // Find pending commitments from past dates
  const pending = await db('pod_commitments')
    .where('status', 'pending')
    .where('date', '<', today)
    .select('id', 'member_id', 'pod_id', 'commitment_text', 'date');

  if (pending.length === 0) {
    console.log('[pod-jobs] No missed commitments to mark');
    return { marked: 0 };
  }

  // Batch update status to missed
  const ids = pending.map((c) => c.id);
  await db('pod_commitments')
    .whereIn('id', ids)
    .update({ status: 'missed', updated_at: new Date() });

  // Insert feed entries for each missed commitment
  const feedEntries = pending.map((c) => ({
    pod_id: c.pod_id,
    member_id: c.member_id,
    type: 'missed',
    data: JSON.stringify({ commitment_text: c.commitment_text, date: c.date }),
  }));

  await db('pod_feed').insert(feedEntries);

  console.log(`[pod-jobs] Marked ${pending.length} commitments as missed`);
  return { marked: pending.length };
}

// ---------------------------------------------------------------------------
// Job 2: Calculate Daily Pod Health (runs at 11:59 PM)
// ---------------------------------------------------------------------------

export async function runDailyPodHealth() {
  const today = new Date().toISOString().split('T')[0];

  console.log('[pod-jobs] Calculating pod health for', today);

  const activePods = await db('pods').where('is_active', true).select('id');
  let updated = 0;

  for (const pod of activePods) {
    const memberCount = await db('pod_members')
      .where({ pod_id: pod.id, status: 'active' })
      .count('* as count')
      .first();
    const totalMembers = parseInt(memberCount.count);

    if (totalMembers === 0) continue;

    const commitments = await db('pod_commitments')
      .where({ pod_id: pod.id, date: today });

    const committed = commitments.length;
    const checkedIn = commitments.filter((c) => c.status === 'checked_in').length;

    const commitRate = committed / totalMembers;
    const checkinRate = committed > 0 ? checkedIn / committed : 0;
    const healthScore = Math.round((commitRate * 0.4 + checkinRate * 0.6) * 100);
    const tier = getTier(healthScore);
    const multiplier = MULTIPLIERS[tier];

    // Upsert pod_health row
    const existing = await db('pod_health')
      .where({ pod_id: pod.id, date: today })
      .first();

    if (existing) {
      await db('pod_health')
        .where('id', existing.id)
        .update({
          members_committed: committed,
          members_checked_in: checkedIn,
          health_score: healthScore,
          multiplier_active: multiplier > 1.0,
        });
    } else {
      await db('pod_health').insert({
        pod_id: pod.id,
        date: today,
        members_committed: committed,
        members_checked_in: checkedIn,
        health_score: healthScore,
        multiplier_active: multiplier > 1.0,
      });
    }

    // Update pod tier and multiplier
    await db('pods')
      .where('id', pod.id)
      .update({
        tier,
        consistency_multiplier: multiplier,
        updated_at: new Date(),
      });

    updated++;
  }

  console.log(`[pod-jobs] Updated health for ${updated} pods`);
  return { pods_updated: updated, date: today };
}

// ---------------------------------------------------------------------------
// Job 3: Backfill Small Pods (runs daily at 3 AM)
// ---------------------------------------------------------------------------

export async function runBackfillSmallPods() {
  console.log('[pod-jobs] Looking for lonely pods to merge');

  // Find active pods with exactly 1 member
  const lonelyPods = await db('pods')
    .where('pods.is_active', true)
    .leftJoin('pod_members', function () {
      this.on('pods.id', 'pod_members.pod_id')
        .andOn('pod_members.status', db.raw("'active'"));
    })
    .groupBy('pods.id')
    .havingRaw('count(pod_members.id) = 1')
    .select('pods.id', 'pods.goal_type', 'pods.intensity');

  let merges = 0;
  const merged = new Set(); // Track already-merged pod IDs

  for (const pod of lonelyPods) {
    if (merged.has(pod.id)) continue;

    // Find another lonely pod with same goal_type and intensity
    const match = lonelyPods.find(
      (p) =>
        p.id !== pod.id &&
        !merged.has(p.id) &&
        p.goal_type === pod.goal_type &&
        p.intensity === pod.intensity
    );

    if (!match) continue;

    // Move member from match pod to this pod
    const memberToMove = await db('pod_members')
      .where({ pod_id: match.id, status: 'active' })
      .first();

    if (!memberToMove) continue;

    await db('pod_members')
      .where('id', memberToMove.id)
      .update({ pod_id: pod.id, updated_at: new Date() });

    // Add a feed entry for the merge
    await db('pod_feed').insert({
      pod_id: pod.id,
      member_id: memberToMove.member_id,
      type: 'joined',
      data: JSON.stringify({ reason: 'pod_merge' }),
    });

    // Deactivate the empty pod
    await db('pods')
      .where('id', match.id)
      .update({ is_active: false, updated_at: new Date() });

    merged.add(pod.id);
    merged.add(match.id);
    merges++;

    console.log(`[pod-jobs] Merged pod ${match.id} into ${pod.id}`);
  }

  console.log(`[pod-jobs] Completed ${merges} pod merges`);
  return { merges };
}

// ---------------------------------------------------------------------------
// Job 4: Send Commitment Reminders (runs at 6 AM, 12 PM, 5 PM)
// ---------------------------------------------------------------------------

/**
 * Determine which time_preference slot the current hour falls into.
 */
function getCurrentSlot() {
  const hour = new Date().getUTCHours();
  // These align with the scheduled run times (6, 12, 17 IST offsets aside —
  // the scheduler fires at the right IST time, so we map by call time).
  if (hour <= 9) return 'morning';
  if (hour <= 14) return 'afternoon';
  return 'evening';
}

export async function runCommitmentReminders() {
  const today = new Date().toISOString().split('T')[0];
  const slot = getCurrentSlot();

  console.log(`[pod-jobs] Sending ${slot} commitment reminders for ${today}`);

  // Find active pod members whose pod time_preference matches this slot
  // and who do NOT already have a commitment for today
  const membersToNudge = await db('pod_members')
    .where('pod_members.status', 'active')
    .join('pods', 'pod_members.pod_id', 'pods.id')
    .where('pods.is_active', true)
    .where('pods.time_preference', slot)
    .whereNotExists(function () {
      this.select(db.raw(1))
        .from('pod_commitments')
        .whereRaw('pod_commitments.member_id = pod_members.member_id')
        .whereRaw('pod_commitments.pod_id = pod_members.pod_id')
        .where('pod_commitments.date', today);
    })
    .select('pod_members.member_id', 'pod_members.pod_id', 'pods.name as pod_name');

  if (membersToNudge.length === 0) {
    console.log(`[pod-jobs] No ${slot} reminders to send`);
    return { slot, reminders: 0 };
  }

  // Insert feed entries as reminder placeholders (push notifications wired later)
  const feedEntries = membersToNudge.map((m) => ({
    pod_id: m.pod_id,
    member_id: m.member_id,
    type: 'nudge',
    data: JSON.stringify({
      reason: 'commitment_reminder',
      slot,
      pod_name: m.pod_name,
    }),
  }));

  await db('pod_feed').insert(feedEntries);

  console.log(`[pod-jobs] Sent ${membersToNudge.length} ${slot} commitment reminders`);
  return { slot, reminders: membersToNudge.length };
}

// ---------------------------------------------------------------------------
// Job 5: Late Check-in Alerts (runs every 15 minutes)
// ---------------------------------------------------------------------------

export async function runLateCheckinAlerts() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  console.log('[pod-jobs] Checking for late check-ins');

  // Find pending commitments where committed_time is 15+ minutes in the past
  const lateCommitments = await db('pod_commitments')
    .where({ date: today, status: 'pending' })
    .whereNotNull('committed_time')
    .whereRaw(
      `(CURRENT_DATE + committed_time) < (NOW() - INTERVAL '15 minutes')`
    )
    .select('id', 'member_id', 'pod_id', 'commitment_text', 'committed_time');

  if (lateCommitments.length === 0) {
    console.log('[pod-jobs] No late check-ins found');
    return { alerts: 0 };
  }

  let alerts = 0;

  for (const c of lateCommitments) {
    // Only trigger once — check if a late alert feed entry already exists
    const existingAlert = await db('pod_feed')
      .where({
        pod_id: c.pod_id,
        member_id: c.member_id,
        type: 'missed',
      })
      .whereRaw(`data->>'reason' = 'late_alert'`)
      .whereRaw(`data->>'commitment_id' = ?`, [c.id])
      .first();

    if (existingAlert) continue;

    await db('pod_feed').insert({
      pod_id: c.pod_id,
      member_id: c.member_id,
      type: 'missed',
      data: JSON.stringify({
        reason: 'late_alert',
        commitment_id: c.id,
        commitment_text: c.commitment_text,
        committed_time: c.committed_time,
      }),
    });

    alerts++;
  }

  console.log(`[pod-jobs] Created ${alerts} late check-in alerts`);
  return { alerts };
}

// ---------------------------------------------------------------------------
// Registration — called by the scheduler to add all pod jobs
// ---------------------------------------------------------------------------

/**
 * Returns the pod job definitions for the scheduler to register.
 *
 * Interval jobs use `intervalHours` (same shape as scheduler.js `jobs` array).
 * Daily jobs use `hour` / `minute` (same shape as scheduler.js `dailyJobs`).
 */
export function getPodJobs() {
  return {
    intervalJobs: [
      { name: 'pod_mark_missed', fn: runMarkMissedCommitments, intervalHours: 1 },
      { name: 'pod_late_checkin_alerts', fn: runLateCheckinAlerts, intervalHours: 0.25 },
    ],
    dailyJobs: [
      { name: 'pod_daily_health', fn: runDailyPodHealth, hour: 23, minute: 59 },
      { name: 'pod_backfill_small', fn: runBackfillSmallPods, hour: 3, minute: 0 },
      { name: 'pod_reminder_morning', fn: runCommitmentReminders, hour: 6, minute: 0 },
      { name: 'pod_reminder_afternoon', fn: runCommitmentReminders, hour: 12, minute: 0 },
      { name: 'pod_reminder_evening', fn: runCommitmentReminders, hour: 17, minute: 0 },
    ],
  };
}
