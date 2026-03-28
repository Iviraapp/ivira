import db from '../config/database.js'

export async function createPod({ gymId, name, goalType, intensity, timePreference, timezone }) {
  const [pod] = await db('pods')
    .insert({
      gym_id: gymId,
      name,
      goal_type: goalType,
      intensity,
      time_preference: timePreference,
      timezone: timezone || 'UTC',
    })
    .returning('*')
  return pod
}

export async function getPodWithMembers(podId) {
  const pod = await db('pods').where('id', podId).first()
  if (!pod) return null

  const members = await db('pod_members')
    .where('pod_members.pod_id', podId)
    .join('members', 'pod_members.member_id', 'members.id')
    .select(
      'members.id',
      'members.name',
      'members.photo_url',
      'pod_members.current_streak',
      'pod_members.role',
      'pod_members.joined_at'
    )
    .orderBy('pod_members.joined_at', 'asc')

  return { ...pod, members }
}

export async function joinPod({ podId, memberId, role = 'member' }) {
  return db.transaction(async (trx) => {
    const existing = await trx('pod_members')
      .where({ pod_id: podId, member_id: memberId })
      .first()
    if (existing) {
      throw Object.assign(new Error('Already a member of this pod'), { statusCode: 409 })
    }

    const memberCount = await trx('pod_members').where('pod_id', podId).count('* as count').first()
    if (parseInt(memberCount.count) >= 5) {
      throw Object.assign(new Error('Pod is full (max 5 members)'), { statusCode: 400 })
    }

    const [membership] = await trx('pod_members')
      .insert({
        pod_id: podId,
        member_id: memberId,
        role,
        current_streak: 0,
      })
      .returning('*')

    await trx('pod_feed').insert({
      pod_id: podId,
      member_id: memberId,
      type: 'joined',
      data: JSON.stringify({ role }),
    })

    return membership
  })
}

export async function leavePod({ podId, memberId }) {
  const deleted = await db('pod_members')
    .where({ pod_id: podId, member_id: memberId })
    .del()
  if (!deleted) {
    throw Object.assign(new Error('Not a member of this pod'), { statusCode: 404 })
  }

  const remaining = await db('pod_members').where('pod_id', podId).count('* as count').first()
  if (parseInt(remaining.count) === 0) {
    await db('pods').where('id', podId).update({ is_active: false, updated_at: new Date() })
  }

  return { removed: true }
}

export async function findMatchingPods({ gymId, goalType, intensity, timePreference, timezone, excludeMemberId }) {
  let query = db('pods')
    .where({ 'pods.gym_id': gymId, 'pods.is_active': true })
    .leftJoin('pod_members', 'pods.id', 'pod_members.pod_id')
    .groupBy('pods.id')
    .havingRaw('count(pod_members.id) < 5')
    .select(
      'pods.*',
      db.raw('count(pod_members.id)::int as member_count')
    )
    .orderBy('pods.created_at', 'desc')

  if (excludeMemberId) {
    query = query.whereNotExists(function () {
      this.select(db.raw(1))
        .from('pod_members as pm_exclude')
        .whereRaw('pm_exclude.pod_id = pods.id')
        .where('pm_exclude.member_id', excludeMemberId)
    })
  }

  const pods = await query

  const scored = pods.map((pod) => {
    let score = 0
    if (goalType && pod.goal_type === goalType) score += 40
    if (intensity && pod.intensity === intensity) score += 30
    if (timePreference && pod.time_preference === timePreference) score += 20
    if (timezone && pod.timezone === timezone) score += 10
    return { ...pod, match_score: score }
  })

  scored.sort((a, b) => b.match_score - a.match_score)
  return scored
}

export async function autoMatchMember({ gymId, memberId, goalType, intensity, timePreference, timezone }) {
  const matches = await findMatchingPods({
    gymId,
    goalType,
    intensity,
    timePreference,
    timezone,
    excludeMemberId: memberId,
  })

  if (matches.length > 0) {
    const bestPod = matches[0]
    const membership = await joinPod({ podId: bestPod.id, memberId })
    return { pod: bestPod, membership, created: false }
  }

  const podName = `${goalType || 'General'} ${intensity || 'Mixed'} Pod`
  const pod = await createPod({ gymId, name: podName, goalType, intensity, timePreference, timezone })
  const membership = await joinPod({ podId: pod.id, memberId, role: 'leader' })
  return { pod, membership, created: true }
}

export async function createCommitment({ memberId, podId, date, committedTime, commitmentText }) {
  const existing = await db('pod_commitments')
    .where({ member_id: memberId, pod_id: podId, date })
    .first()
  if (existing) {
    throw Object.assign(new Error('Commitment already exists for this date'), { statusCode: 409 })
  }

  const [commitment] = await db('pod_commitments')
    .insert({
      member_id: memberId,
      pod_id: podId,
      date,
      committed_time: committedTime,
      commitment_text: commitmentText,
      status: 'pending',
    })
    .returning('*')
  return commitment
}

export async function getPodCommitments(podId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const commitments = await db('pod_commitments')
    .where({ 'pod_commitments.pod_id': podId, 'pod_commitments.date': targetDate })
    .join('members', 'pod_commitments.member_id', 'members.id')
    .select(
      'pod_commitments.id',
      'pod_commitments.member_id',
      'members.name as member_name',
      'pod_commitments.committed_time',
      'pod_commitments.commitment_text',
      'pod_commitments.status',
      'pod_commitments.checked_in_at'
    )
    .orderBy('pod_commitments.committed_time', 'asc')

  return commitments
}

export async function checkIn({ commitmentId, memberId, method = 'manual' }) {
  return db.transaction(async (trx) => {
    const commitment = await trx('pod_commitments')
      .where({ id: commitmentId, member_id: memberId })
      .first()
    if (!commitment) {
      throw Object.assign(new Error('Commitment not found'), { statusCode: 404 })
    }
    if (commitment.status === 'checked_in') {
      throw Object.assign(new Error('Already checked in'), { statusCode: 409 })
    }

    const [updated] = await trx('pod_commitments')
      .where('id', commitmentId)
      .update({
        status: 'checked_in',
        checked_in_at: new Date(),
        checkin_method: method,
        updated_at: new Date(),
      })
      .returning('*')

    await updateStreak(memberId, commitment.pod_id, trx)

    const member = await trx('members').where('id', memberId).select('name').first()
    const streak = await trx('pod_members')
      .where({ pod_id: commitment.pod_id, member_id: memberId })
      .select('current_streak')
      .first()

    await trx('pod_feed').insert({
      pod_id: commitment.pod_id,
      member_id: memberId,
      type: 'checkin',
      data: JSON.stringify({
        commitment_text: commitment.commitment_text,
        method,
        streak: streak?.current_streak || 0,
      }),
    })

    if (streak && streak.current_streak > 0 && streak.current_streak % 7 === 0) {
      await trx('pod_feed').insert({
        pod_id: commitment.pod_id,
        member_id: memberId,
        type: 'milestone',
        data: JSON.stringify({ streak: streak.current_streak }),
      })
    }

    return updated
  })
}

export async function markMissed(commitmentId) {
  const commitment = await db('pod_commitments').where('id', commitmentId).first()
  if (!commitment) {
    throw Object.assign(new Error('Commitment not found'), { statusCode: 404 })
  }

  const [updated] = await db('pod_commitments')
    .where('id', commitmentId)
    .update({
      status: 'missed',
      updated_at: new Date(),
    })
    .returning('*')

  const member = await db('members').where('id', commitment.member_id).select('name').first()
  await db('pod_feed').insert({
    pod_id: commitment.pod_id,
    member_id: commitment.member_id,
    type: 'missed',
    data: JSON.stringify({ commitment_text: commitment.commitment_text }),
  })

  return updated
}

export async function getMemberStreak(memberId, podId) {
  const record = await db('pod_members')
    .where({ member_id: memberId, pod_id: podId })
    .select('current_streak', 'longest_streak', 'last_checkin_date')
    .first()
  if (!record) return { current_streak: 0, longest_streak: 0, last_checkin_date: null }
  return record
}

export async function updateStreak(memberId, podId, trx) {
  const conn = trx || db
  const record = await conn('pod_members')
    .where({ member_id: memberId, pod_id: podId })
    .first()
  if (!record) return

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak
  if (record.last_checkin_date === today) {
    return record
  } else if (record.last_checkin_date === yesterdayStr) {
    newStreak = record.current_streak + 1
  } else {
    newStreak = 1
  }

  const longestStreak = Math.max(newStreak, record.longest_streak || 0)

  await conn('pod_members')
    .where({ member_id: memberId, pod_id: podId })
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_checkin_date: today,
      updated_at: new Date(),
    })

  return { current_streak: newStreak, longest_streak: longestStreak }
}

export async function calculatePodHealth(podId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const totalMembers = await db('pod_members')
    .where('pod_id', podId)
    .count('* as count')
    .first()
  const memberCount = parseInt(totalMembers.count)
  if (memberCount === 0) {
    return { members_committed: 0, members_checked_in: 0, health_score: 0, tier: 'bronze' }
  }

  const commitments = await db('pod_commitments')
    .where({ pod_id: podId, date: targetDate })

  const committed = commitments.length
  const checkedIn = commitments.filter((c) => c.status === 'checked_in').length

  const commitRate = committed / memberCount
  const checkinRate = committed > 0 ? checkedIn / committed : 0
  const healthScore = Math.round((commitRate * 0.4 + checkinRate * 0.6) * 100)

  let tier
  if (healthScore >= 95) tier = 'diamond'
  else if (healthScore >= 80) tier = 'gold'
  else if (healthScore >= 60) tier = 'silver'
  else tier = 'bronze'

  return { members_committed: committed, members_checked_in: checkedIn, health_score: healthScore, tier }
}

export async function getMemberPods(memberId) {
  const pods = await db('pod_members')
    .where('pod_members.member_id', memberId)
    .join('pods', 'pod_members.pod_id', 'pods.id')
    .where('pods.is_active', true)
    .select(
      'pods.*',
      'pod_members.current_streak',
      'pod_members.longest_streak',
      'pod_members.role',
      'pod_members.joined_at'
    )

  const results = []
  for (const pod of pods) {
    const memberCount = await db('pod_members')
      .where('pod_id', pod.id)
      .count('* as count')
      .first()
    const health = await calculatePodHealth(pod.id)
    results.push({
      ...pod,
      member_count: parseInt(memberCount.count),
      health_score: health.health_score,
      tier: health.tier,
    })
  }

  return results
}

export async function getPodFeed(podId, limit = 20) {
  const entries = await db('pod_feed')
    .where('pod_feed.pod_id', podId)
    .join('members', 'pod_feed.member_id', 'members.id')
    .select(
      'pod_feed.id',
      'pod_feed.type',
      'members.name as member_name',
      'members.photo_url as member_photo',
      'pod_feed.data',
      'pod_feed.created_at as timestamp'
    )
    .orderBy('pod_feed.created_at', 'desc')
    .limit(limit)

  return entries.map((entry) => ({
    ...entry,
    data: typeof entry.data === 'string' ? JSON.parse(entry.data) : entry.data,
  }))
}

export async function getPodStats(podId, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const members = await db('pod_members')
    .where('pod_members.pod_id', podId)
    .join('members', 'pod_members.member_id', 'members.id')
    .select(
      'members.id',
      'members.name',
      'pod_members.current_streak',
      'pod_members.longest_streak'
    )

  const commitments = await db('pod_commitments')
    .where('pod_id', podId)
    .where('date', '>=', startDateStr)

  const totalCheckins = commitments.filter((c) => c.status === 'checked_in').length

  const memberStats = members.map((member) => {
    const memberCommitments = commitments.filter((c) => c.member_id === member.id)
    const memberCheckins = memberCommitments.filter((c) => c.status === 'checked_in').length
    const consistencyPct = memberCommitments.length > 0
      ? Math.round((memberCheckins / memberCommitments.length) * 100)
      : 0
    return {
      name: member.name,
      streak: member.current_streak,
      longest_streak: member.longest_streak,
      consistency_pct: consistencyPct,
    }
  })

  const dateMap = {}
  for (const c of commitments) {
    const d = typeof c.date === 'string' ? c.date : c.date.toISOString().split('T')[0]
    if (!dateMap[d]) dateMap[d] = { total: 0, checkedIn: 0 }
    dateMap[d].total++
    if (c.status === 'checked_in') dateMap[d].checkedIn++
  }

  const dailyHealth = Object.entries(dateMap)
    .map(([date, { total, checkedIn }]) => ({
      date,
      score: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const avgHealth = dailyHealth.length > 0
    ? Math.round(dailyHealth.reduce((sum, d) => sum + d.score, 0) / dailyHealth.length)
    : 0

  return {
    avg_health: avgHealth,
    total_checkins: totalCheckins,
    member_stats: memberStats,
    daily_health: dailyHealth,
  }
}

export async function sendNudge({ fromMemberId, toMemberId, podId }) {
  const fromMember = await db('members').where('id', fromMemberId).select('name').first()
  const toMember = await db('members').where('id', toMemberId).select('name').first()
  if (!fromMember || !toMember) {
    throw Object.assign(new Error('Member not found'), { statusCode: 404 })
  }

  const bothInPod = await db('pod_members')
    .where('pod_id', podId)
    .whereIn('member_id', [fromMemberId, toMemberId])
    .count('* as count')
    .first()
  if (parseInt(bothInPod.count) !== 2) {
    throw Object.assign(new Error('Both members must be in the same pod'), { statusCode: 400 })
  }

  const [nudge] = await db('pod_nudges')
    .insert({
      pod_id: podId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
    })
    .returning('*')

  return { ...nudge, from_name: fromMember.name, to_name: toMember.name }
}
