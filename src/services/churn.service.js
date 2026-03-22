import db from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

// Weight configuration for churn scoring
const WEIGHTS = {
  daysSinceLastCheckin: 0.30,
  checkinFrequencyTrend: 0.25,
  daysUntilExpiry: 0.20,
  paymentHistory: 0.15,
  classAttendanceTrend: 0.10,
};

/**
 * Normalize a value into 0-1 range where higher = more churn risk.
 */
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Map a churn score to a risk level string.
 */
function getRiskLevel(score) {
  if (score > 0.8) return 'critical';
  if (score > 0.6) return 'high';
  if (score > 0.3) return 'medium';
  return 'low';
}

/**
 * Calculate churn score for a single member.
 * Returns score (0-1), risk level, and factor breakdown.
 */
export async function calculateChurnScore(gymId, memberId) {
  const member = await db('members')
    .where({ id: memberId, gym_id: gymId })
    .first();
  if (!member) throw new NotFoundError('Member');

  const now = new Date();
  const factors = {};

  // ── Factor 1: Days since last check-in (weight: 0.30) ────────
  const lastCheckin = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .orderBy('checked_in_at', 'desc')
    .first();

  let daysSinceCheckinScore;
  if (!lastCheckin) {
    // Never checked in — maximum risk for this factor
    daysSinceCheckinScore = 1.0;
    factors.daysSinceLastCheckin = {
      value: null,
      score: daysSinceCheckinScore,
      detail: 'No check-ins recorded',
    };
  } else {
    const daysSince = (now - new Date(lastCheckin.checked_in_at)) / (1000 * 60 * 60 * 24);
    // 0 days = 0 risk, 30+ days = 1.0 risk (linear)
    daysSinceCheckinScore = clamp01(daysSince / 30);
    factors.daysSinceLastCheckin = {
      value: Math.round(daysSince),
      score: daysSinceCheckinScore,
      detail: `${Math.round(daysSince)} days since last check-in`,
    };
  }

  // ── Factor 2: Check-in frequency trend (weight: 0.25) ────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [recentCount] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .andWhere('checked_in_at', '>=', thirtyDaysAgo)
    .count();

  const [previousCount] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .andWhere('checked_in_at', '>=', sixtyDaysAgo)
    .andWhere('checked_in_at', '<', thirtyDaysAgo)
    .count();

  const recent = parseInt(recentCount.count, 10);
  const previous = parseInt(previousCount.count, 10);

  let frequencyTrendScore;
  if (previous === 0 && recent === 0) {
    frequencyTrendScore = 0.8; // No activity at all — high risk
    factors.checkinFrequencyTrend = {
      recent,
      previous,
      score: frequencyTrendScore,
      detail: 'No check-ins in last 60 days',
    };
  } else if (previous === 0) {
    frequencyTrendScore = 0.1; // New member with activity — low risk
    factors.checkinFrequencyTrend = {
      recent,
      previous,
      score: frequencyTrendScore,
      detail: 'New activity (no prior period data)',
    };
  } else {
    // Decline ratio: if recent < previous, risk increases
    const declineRatio = 1 - (recent / previous);
    frequencyTrendScore = clamp01(declineRatio);
    const changePercent = Math.round(((recent - previous) / previous) * 100);
    factors.checkinFrequencyTrend = {
      recent,
      previous,
      score: frequencyTrendScore,
      detail: `${changePercent >= 0 ? '+' : ''}${changePercent}% change in check-in frequency`,
    };
  }

  // ── Factor 3: Days until membership expires (weight: 0.20) ───
  const activeMembership = await db('memberships')
    .where({ member_id: memberId, gym_id: gymId })
    .orderBy('end_date', 'desc')
    .first();

  let expiryScore;
  if (!activeMembership) {
    expiryScore = 1.0;
    factors.daysUntilExpiry = {
      value: null,
      score: expiryScore,
      detail: 'No active membership',
    };
  } else {
    const endDate = new Date(activeMembership.end_date);
    const daysUntil = (endDate - now) / (1000 * 60 * 60 * 24);
    if (daysUntil < 0) {
      // Already expired
      expiryScore = 1.0;
      factors.daysUntilExpiry = {
        value: Math.round(daysUntil),
        score: expiryScore,
        detail: `Membership expired ${Math.abs(Math.round(daysUntil))} days ago`,
      };
    } else {
      // 0 days left = 1.0 risk, 30+ days = 0 risk
      expiryScore = clamp01(1 - daysUntil / 30);
      factors.daysUntilExpiry = {
        value: Math.round(daysUntil),
        score: expiryScore,
        detail: `${Math.round(daysUntil)} days until membership expires`,
      };
    }
  }

  // ── Factor 4: Payment history (weight: 0.15) ─────────────────
  const payments = await db('payments')
    .where({ member_id: memberId, gym_id: gymId })
    .orderBy('created_at', 'desc')
    .limit(10);

  let paymentScore;
  if (payments.length === 0) {
    paymentScore = 0.5; // No payment history — moderate risk
    factors.paymentHistory = {
      totalPayments: 0,
      failedPayments: 0,
      score: paymentScore,
      detail: 'No payment history',
    };
  } else {
    const failedCount = payments.filter((p) => p.status === 'failed').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    // More failed/pending = higher risk
    const badRatio = (failedCount + pendingCount * 0.5) / payments.length;
    paymentScore = clamp01(badRatio * 2); // Scale up since even 50% bad is very high risk
    factors.paymentHistory = {
      totalPayments: payments.length,
      failedPayments: failedCount,
      pendingPayments: pendingCount,
      score: paymentScore,
      detail: `${failedCount} failed, ${pendingCount} pending out of ${payments.length} recent payments`,
    };
  }

  // ── Factor 5: Class attendance trend (weight: 0.10) ──────────
  // Use checkins with a 'class' type if available, otherwise use general checkins as proxy
  const [recentClassCount] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .andWhere('checked_in_at', '>=', thirtyDaysAgo)
    .andWhere(function () {
      this.where('method', 'class').orWhereNull('method');
    })
    .count();

  const [previousClassCount] = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .andWhere('checked_in_at', '>=', sixtyDaysAgo)
    .andWhere('checked_in_at', '<', thirtyDaysAgo)
    .andWhere(function () {
      this.where('method', 'class').orWhereNull('method');
    })
    .count();

  const recentClasses = parseInt(recentClassCount.count, 10);
  const previousClasses = parseInt(previousClassCount.count, 10);

  let classScore;
  if (previousClasses === 0 && recentClasses === 0) {
    classScore = 0.5; // Neutral — no class data
    factors.classAttendanceTrend = {
      recent: recentClasses,
      previous: previousClasses,
      score: classScore,
      detail: 'No class attendance data',
    };
  } else if (previousClasses === 0) {
    classScore = 0.1;
    factors.classAttendanceTrend = {
      recent: recentClasses,
      previous: previousClasses,
      score: classScore,
      detail: 'New class attendance (no prior period)',
    };
  } else {
    const classDecline = 1 - (recentClasses / previousClasses);
    classScore = clamp01(classDecline);
    const changePct = Math.round(((recentClasses - previousClasses) / previousClasses) * 100);
    factors.classAttendanceTrend = {
      recent: recentClasses,
      previous: previousClasses,
      score: classScore,
      detail: `${changePct >= 0 ? '+' : ''}${changePct}% change in class attendance`,
    };
  }

  // ── Composite score ───────────────────────────────────────────
  const score = clamp01(
    daysSinceCheckinScore * WEIGHTS.daysSinceLastCheckin +
    frequencyTrendScore * WEIGHTS.checkinFrequencyTrend +
    expiryScore * WEIGHTS.daysUntilExpiry +
    paymentScore * WEIGHTS.paymentHistory +
    classScore * WEIGHTS.classAttendanceTrend,
  );

  const riskLevel = getRiskLevel(score);

  return {
    memberId,
    gymId,
    score: Math.round(score * 1000) / 1000, // 3 decimal places
    riskLevel,
    factors,
    calculatedAt: now.toISOString(),
  };
}

/**
 * Run batch churn scoring for all active members in a gym.
 * Upserts results into churn_scores table.
 */
export async function runBatchChurnScoring(gymId) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');

  const members = await db('members')
    .where({ gym_id: gymId, status: 'active' })
    .select('id');

  const results = {
    total: members.length,
    scored: 0,
    errors: 0,
    byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
  };

  for (const member of members) {
    try {
      const result = await calculateChurnScore(gymId, member.id);

      await db.raw(`
        INSERT INTO churn_scores (gym_id, member_id, risk_score, risk_level, factors, scored_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON CONFLICT (member_id, gym_id)
        DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          risk_level = EXCLUDED.risk_level,
          factors = EXCLUDED.factors,
          scored_at = EXCLUDED.scored_at,
          updated_at = NOW()
      `, [gymId, member.id, result.score, result.riskLevel, JSON.stringify(result.factors)]);

      results.scored++;
      results.byRiskLevel[result.riskLevel]++;
    } catch (err) {
      results.errors++;
    }
  }

  return results;
}

/**
 * Get paginated churn scores for a gym, optionally filtered by risk level.
 */
export async function getChurnScores(gymId, { riskLevel, page = 1, limit = 50 } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (page - 1) * limit;

  const query = db('churn_scores')
    .where({ 'churn_scores.gym_id': gymId })
    .join('members', 'churn_scores.member_id', 'members.id')
    .select(
      'churn_scores.*',
      'members.name as member_name',
      'members.phone as member_phone',
      'members.email as member_email',
      'members.status as member_status',
    );

  const countQuery = db('churn_scores').where({ gym_id: gymId });

  if (riskLevel) {
    query.andWhere('churn_scores.risk_level', riskLevel);
    countQuery.andWhere('risk_level', riskLevel);
  }

  const [{ count }] = await countQuery.count();

  const scores = await query
    .orderBy('churn_scores.risk_score', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    scores: scores.map((s) => ({
      ...s,
      factors: typeof s.factors === 'string' ? JSON.parse(s.factors) : s.factors,
    })),
    total: parseInt(count, 10),
    page,
    limit,
  };
}

/**
 * Get churn statistics summary for a gym.
 */
export async function getChurnStats(gymId) {
  const stats = await db('churn_scores')
    .where({ gym_id: gymId })
    .select(
      db.raw('COUNT(*)::int as total_scored'),
      db.raw('ROUND(AVG(risk_score)::numeric, 3) as avg_score'),
      db.raw('COUNT(CASE WHEN risk_level = \'low\' THEN 1 END)::int as low_count'),
      db.raw('COUNT(CASE WHEN risk_level = \'medium\' THEN 1 END)::int as medium_count'),
      db.raw('COUNT(CASE WHEN risk_level = \'high\' THEN 1 END)::int as high_count'),
      db.raw('COUNT(CASE WHEN risk_level = \'critical\' THEN 1 END)::int as critical_count'),
    )
    .first();

  // Trending: compare current avg score with score from 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const previousStats = await db('churn_scores')
    .where({ gym_id: gymId })
    .andWhere('scored_at', '<=', sevenDaysAgo)
    .select(db.raw('ROUND(AVG(risk_score)::numeric, 3) as avg_score'))
    .first();

  let trending = 'stable';
  if (previousStats?.avg_score != null && stats.avg_score != null) {
    const diff = parseFloat(stats.avg_score) - parseFloat(previousStats.avg_score);
    if (diff > 0.05) trending = 'worsening';
    else if (diff < -0.05) trending = 'improving';
  }

  return {
    totalScored: stats.total_scored,
    avgScore: stats.avg_score != null ? parseFloat(stats.avg_score) : null,
    trending,
    byRiskLevel: {
      low: stats.low_count,
      medium: stats.medium_count,
      high: stats.high_count,
      critical: stats.critical_count,
    },
    atRiskCount: stats.high_count + stats.critical_count,
  };
}

/**
 * Get top N highest-risk members with full details.
 */
export async function getAtRiskMembers(gymId, limit = 10) {
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const members = await db('churn_scores')
    .where({ 'churn_scores.gym_id': gymId })
    .andWhere('churn_scores.risk_score', '>', 0.3) // At least medium risk
    .join('members', 'churn_scores.member_id', 'members.id')
    .leftJoin('memberships', function () {
      this.on('members.id', '=', 'memberships.member_id')
        .andOn('memberships.gym_id', '=', 'churn_scores.gym_id');
    })
    .select(
      'churn_scores.member_id',
      'churn_scores.risk_score',
      'churn_scores.risk_level',
      'churn_scores.factors',
      'churn_scores.scored_at',
      'members.name as member_name',
      'members.phone as member_phone',
      'members.email as member_email',
      'members.status as member_status',
      db.raw('MAX(memberships.end_date) as membership_end_date'),
    )
    .groupBy(
      'churn_scores.member_id',
      'churn_scores.risk_score',
      'churn_scores.risk_level',
      'churn_scores.factors',
      'churn_scores.scored_at',
      'members.name',
      'members.phone',
      'members.email',
      'members.status',
    )
    .orderBy('churn_scores.risk_score', 'desc')
    .limit(limit);

  return members.map((m) => ({
    ...m,
    factors: typeof m.factors === 'string' ? JSON.parse(m.factors) : m.factors,
  }));
}
