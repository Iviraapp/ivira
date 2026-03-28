import db from '../config/database.js'
import * as pushService from './push.service.js'

/**
 * Get push-enabled member IDs for a pod, optionally excluding one member.
 * Returns [{ member_id, gym_id }] for members who have active push tokens.
 */
async function getPodMemberPushTokens(podId, excludeMemberId = null) {
  let query = db('pod_members')
    .where('pod_members.pod_id', podId)
    .join('pods', 'pod_members.pod_id', 'pods.id')
    .join('push_tokens', function () {
      this.on('pod_members.member_id', 'push_tokens.member_id')
        .andOn('pods.gym_id', 'push_tokens.gym_id')
    })
    .where('push_tokens.is_active', true)
    .select('pod_members.member_id', 'pods.gym_id')
    .groupBy('pod_members.member_id', 'pods.gym_id')

  if (excludeMemberId) {
    query = query.whereNot('pod_members.member_id', excludeMemberId)
  }

  return query
}

/**
 * Get the gym_id for a pod.
 */
async function getPodGymId(podId) {
  const pod = await db('pods').where('id', podId).select('gym_id').first()
  return pod?.gym_id
}

/**
 * Send a push notification to a specific member by ID.
 */
async function sendToMemberById(memberId, gymId, notification) {
  if (!gymId) return { sent: 0 }
  return pushService.sendToMember(gymId, memberId, notification)
}

// ---------------------------------------------------------------------------
// Exported notification functions
// ---------------------------------------------------------------------------

/**
 * Remind a member to commit their daily plan.
 * Category: pod_reminder
 */
export async function notifyPodCommitmentReminder(memberId, podName, timePreference) {
  const token = await db('push_tokens')
    .where({ member_id: memberId, is_active: true })
    .select('gym_id')
    .first()

  if (!token) return { sent: 0 }

  return pushService.sendToMember(token.gym_id, memberId, {
    title: 'Pod Reminder',
    body: `Time to commit! Your ${podName} pod is waiting for today's plan.`,
    data: { category: 'pod_reminder', timePreference: timePreference || '' },
  })
}

/**
 * Alert other pod members that someone hasn't checked in.
 * Category: pod_late
 */
export async function notifyPodLateAlert(podId, lateMemberName) {
  const gymId = await getPodGymId(podId)
  if (!gymId) return { sent: 0 }

  // Find the late member's ID so we can exclude them
  const lateMember = await db('pod_members')
    .where('pod_id', podId)
    .join('members', 'pod_members.member_id', 'members.id')
    .where('members.name', lateMemberName)
    .select('members.id')
    .first()

  const recipients = await getPodMemberPushTokens(podId, lateMember?.id)
  if (!recipients.length) return { sent: 0 }

  const memberIds = recipients.map((r) => r.member_id)
  return pushService.sendBulk(gymId, memberIds, {
    title: 'Pod Check-In Alert',
    body: `${lateMemberName} hasn't checked in yet. Send them a nudge!`,
    data: { category: 'pod_late', podId },
  })
}

/**
 * Notify a member that they were nudged by a podmate.
 * Category: pod_nudge
 */
export async function notifyPodNudge(toMemberId, fromMemberName, podName) {
  const token = await db('push_tokens')
    .where({ member_id: toMemberId, is_active: true })
    .select('gym_id')
    .first()

  if (!token) return { sent: 0 }

  return pushService.sendToMember(token.gym_id, toMemberId, {
    title: 'You Got Nudged!',
    body: `${fromMemberName} nudged you in ${podName}! Time to check in.`,
    data: { category: 'pod_nudge', podName },
  })
}

/**
 * Notify other pod members that someone just checked in.
 * Category: pod_checkin
 */
export async function notifyPodCheckin(podId, memberName, streakCount) {
  const gymId = await getPodGymId(podId)
  if (!gymId) return { sent: 0 }

  // Find the checking-in member's ID so we can exclude them
  const member = await db('pod_members')
    .where('pod_id', podId)
    .join('members', 'pod_members.member_id', 'members.id')
    .where('members.name', memberName)
    .select('members.id')
    .first()

  const recipients = await getPodMemberPushTokens(podId, member?.id)
  if (!recipients.length) return { sent: 0 }

  const memberIds = recipients.map((r) => r.member_id)
  return pushService.sendBulk(gymId, memberIds, {
    title: 'Pod Check-In',
    body: `${memberName} just checked in! (${streakCount} day streak)`,
    data: { category: 'pod_checkin', podId, streakCount: String(streakCount) },
  })
}

/**
 * Notify ALL pod members about a streak milestone.
 * Category: pod_milestone
 */
export async function notifyPodMilestone(podId, memberName, streakDays) {
  const gymId = await getPodGymId(podId)
  if (!gymId) return { sent: 0 }

  const recipients = await getPodMemberPushTokens(podId)
  if (!recipients.length) return { sent: 0 }

  const memberIds = recipients.map((r) => r.member_id)
  return pushService.sendBulk(gymId, memberIds, {
    title: 'Streak Milestone!',
    body: `${memberName} hit a ${streakDays}-day streak! Keep it going!`,
    data: { category: 'pod_milestone', podId, streakDays: String(streakDays) },
  })
}

/**
 * Notify all pod members about the weekly pod health score.
 * Category: pod_health
 *
 * This should be called once per week (not daily) from a cron job.
 */
export async function notifyPodHealthUpdate(podId, healthScore, tier) {
  const gymId = await getPodGymId(podId)
  if (!gymId) return { sent: 0 }

  const recipients = await getPodMemberPushTokens(podId)
  if (!recipients.length) return { sent: 0 }

  const memberIds = recipients.map((r) => r.member_id)
  return pushService.sendBulk(gymId, memberIds, {
    title: 'Weekly Pod Health',
    body: `Your pod scored ${healthScore}% this week — ${tier} tier!`,
    data: { category: 'pod_health', podId, healthScore: String(healthScore), tier },
  })
}
