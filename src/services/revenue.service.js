import db from '../config/database.js';

export async function recordRevenue(gymId, source, amountPaise, referenceId, referenceType, description) {
  const [row] = await db('gym_revenue_ledger')
    .insert({
      gym_id: gymId,
      source,
      amount_paise: amountPaise,
      reference_id: referenceId,
      reference_type: referenceType,
      description,
    })
    .returning('*');
  return row;
}

export async function getRevenueSummary(gymId, period = 'month') {
  let currentFilter;
  let previousStart;
  let previousEnd;

  if (period === 'month') {
    currentFilter = db.raw("recorded_at >= DATE_TRUNC('month', CURRENT_DATE)");
    previousStart = db.raw("recorded_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'");
    previousEnd = db.raw("recorded_at < DATE_TRUNC('month', CURRENT_DATE)");
  } else if (period === 'week') {
    currentFilter = db.raw("recorded_at >= CURRENT_DATE - INTERVAL '7 days'");
    previousStart = db.raw("recorded_at >= CURRENT_DATE - INTERVAL '14 days'");
    previousEnd = db.raw("recorded_at < CURRENT_DATE - INTERVAL '7 days'");
  } else {
    // today
    currentFilter = db.raw('DATE(recorded_at) = CURRENT_DATE');
    previousStart = db.raw('DATE(recorded_at) = CURRENT_DATE - INTERVAL \'1 day\'');
    previousEnd = db.raw('DATE(recorded_at) = CURRENT_DATE - INTERVAL \'1 day\'');
  }

  const bySourceRows = await db('gym_revenue_ledger')
    .select('source')
    .sum('amount_paise as total')
    .where('gym_id', gymId)
    .andWhereRaw(currentFilter.toString())
    .groupBy('source');

  const bySource = {
    membership: 0,
    class_booking: 0,
    affiliate: 0,
    store: 0,
    ad_revenue: 0,
  };
  for (const row of bySourceRows) {
    bySource[row.source] = parseInt(row.total, 10) || 0;
  }

  const total = Object.values(bySource).reduce((sum, v) => sum + v, 0);

  const [prevRow] = await db('gym_revenue_ledger')
    .sum('amount_paise as total')
    .where('gym_id', gymId)
    .andWhereRaw(previousStart.toString())
    .andWhereRaw(
      period === 'today'
        ? previousEnd.toString()
        : previousEnd.toString()
    );

  const previousTotal = parseInt(prevRow?.total, 10) || 0;
  const trendPct = previousTotal > 0
    ? Math.round(((total - previousTotal) / previousTotal) * 100)
    : total > 0 ? 100 : 0;

  return { bySource, total, previousTotal, trendPct };
}

export async function getRevenueTimeline(gymId, days = 30) {
  const rows = await db('gym_revenue_ledger')
    .select(db.raw('DATE(recorded_at) as date'), 'source')
    .sum('amount_paise as total')
    .where('gym_id', gymId)
    .andWhereRaw(`recorded_at >= CURRENT_DATE - INTERVAL '${days} days'`)
    .groupByRaw('DATE(recorded_at), source')
    .orderByRaw('DATE(recorded_at)');

  const dayMap = {};
  for (const row of rows) {
    const dateStr = row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date);

    if (!dayMap[dateStr]) {
      dayMap[dateStr] = {
        date: dateStr,
        membership: 0,
        class_booking: 0,
        affiliate: 0,
        store: 0,
        ad_revenue: 0,
        total: 0,
      };
    }
    const amount = parseInt(row.total, 10) || 0;
    dayMap[dateStr][row.source] = amount;
    dayMap[dateStr].total += amount;
  }

  return Object.values(dayMap);
}

export async function recordAdEvent(gymId, campaignId, eventType, memberId = null, metadata = null) {
  const [row] = await db('ad_analytics')
    .insert({
      gym_id: gymId,
      campaign_id: campaignId,
      event_type: eventType,
      member_id: memberId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .returning('*');
  return row;
}

export async function getAdAnalytics(gymId, days = 30) {
  const campaigns = await db('ad_analytics as aa')
    .select(
      'aa.campaign_id',
      'gac.title',
      db.raw("COUNT(*) FILTER (WHERE aa.event_type = 'impression') as impressions"),
      db.raw("COUNT(*) FILTER (WHERE aa.event_type = 'click') as clicks"),
    )
    .leftJoin('global_ad_campaigns as gac', 'gac.id', 'aa.campaign_id')
    .where('aa.gym_id', gymId)
    .andWhereRaw(`aa.created_at >= CURRENT_DATE - INTERVAL '${days} days'`)
    .groupBy('aa.campaign_id', 'gac.title');

  const byCampaign = campaigns.map((row) => ({
    campaignId: row.campaign_id,
    title: row.title,
    impressions: parseInt(row.impressions, 10) || 0,
    clicks: parseInt(row.clicks, 10) || 0,
    ctr: parseInt(row.impressions, 10) > 0
      ? Math.round((parseInt(row.clicks, 10) / parseInt(row.impressions, 10)) * 10000) / 100
      : 0,
  }));

  const daily = await db('ad_analytics')
    .select(db.raw('DATE(created_at) as date'))
    .count({ impressions: db.raw("CASE WHEN event_type = 'impression' THEN 1 END") })
    .count({ clicks: db.raw("CASE WHEN event_type = 'click' THEN 1 END") })
    .where('gym_id', gymId)
    .andWhereRaw(`created_at >= CURRENT_DATE - INTERVAL '${days} days'`)
    .groupByRaw('DATE(created_at)')
    .orderByRaw('DATE(created_at)');

  const dailyAggregate = daily.map((row) => ({
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
    impressions: parseInt(row.impressions, 10) || 0,
    clicks: parseInt(row.clicks, 10) || 0,
  }));

  return { byCampaign, dailyAggregate };
}

export async function syncPaymentToLedger(payment) {
  return recordRevenue(
    payment.gym_id,
    'membership',
    payment.amount_paise,
    payment.id,
    'payment',
    `Payment ${payment.razorpay_payment_id || payment.id}`,
  );
}

export async function syncBookingToLedger(gymId, bookingId, amountPaise) {
  return recordRevenue(
    gymId,
    'class_booking',
    amountPaise,
    bookingId,
    'class_booking',
    `Class booking ${bookingId}`,
  );
}

// --- Trainer Fee Ledger ---

export async function recordTrainerFee(gymId, trainerId, amountPaise, referenceId, referenceType, feeType = 'per_session') {
  // Record in trainer_fees table
  const [fee] = await db('trainer_fees')
    .insert({
      gym_id: gymId,
      trainer_id: trainerId,
      fee_type: feeType,
      amount_paise: amountPaise,
      reference_id: referenceId,
      reference_type: referenceType,
      status: 'pending',
    })
    .returning('*');

  // Also record as expense in revenue ledger (negative for outflow tracking)
  await recordRevenue(gymId, 'trainer_fee', amountPaise, fee.id, 'trainer_fee', `Trainer fee: ${feeType}`);

  return fee;
}

export async function getTrainerFeesSummary(gymId, period = 'month') {
  let filter;
  if (period === 'month') {
    filter = "created_at >= DATE_TRUNC('month', CURRENT_DATE)";
  } else if (period === 'week') {
    filter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
  } else {
    filter = 'DATE(created_at) = CURRENT_DATE';
  }

  const rows = await db('trainer_fees')
    .select('trainer_id', 'status')
    .sum('amount_paise as total')
    .count('* as count')
    .where('gym_id', gymId)
    .whereRaw(filter)
    .groupBy('trainer_id', 'status');

  return rows;
}

export async function markTrainerFeesPaid(gymId, feeIds) {
  const updated = await db('trainer_fees')
    .whereIn('id', feeIds)
    .where({ gym_id: gymId, status: 'pending' })
    .update({ status: 'paid', paid_at: new Date(), updated_at: new Date() })
    .returning('*');
  return updated;
}

// --- Affiliate Commission Ledger ---

export async function recordAffiliateCommission(gymId, affiliateId, affiliateName, commissionPaise, triggerEvent, referenceId) {
  const [commission] = await db('affiliate_commissions')
    .insert({
      gym_id: gymId,
      affiliate_id: affiliateId,
      affiliate_name: affiliateName,
      commission_paise: commissionPaise,
      trigger_event: triggerEvent,
      reference_id: referenceId,
      reference_type: triggerEvent,
      status: 'pending',
    })
    .returning('*');

  // Also record in unified revenue ledger
  await recordRevenue(gymId, 'affiliate_commission', commissionPaise, commission.id, 'affiliate_commission', `Affiliate: ${affiliateName} (${triggerEvent})`);

  return commission;
}

export async function getAffiliateCommissionsSummary(gymId, period = 'month') {
  let filter;
  if (period === 'month') {
    filter = "created_at >= DATE_TRUNC('month', CURRENT_DATE)";
  } else if (period === 'week') {
    filter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
  } else {
    filter = 'DATE(created_at) = CURRENT_DATE';
  }

  const rows = await db('affiliate_commissions')
    .select('affiliate_id', 'affiliate_name', 'status')
    .sum('commission_paise as total')
    .count('* as count')
    .where('gym_id', gymId)
    .whereRaw(filter)
    .groupBy('affiliate_id', 'affiliate_name', 'status');

  return rows;
}

// --- Financial Summary (Owner Revenue vs Affiliate Commission vs Trainer Fees) ---

export async function getFinancialLedgerSummary(gymId, period = 'month') {
  const revenue = await getRevenueSummary(gymId, period);
  const trainerFees = await getTrainerFeesSummary(gymId, period);
  const affiliateCommissions = await getAffiliateCommissionsSummary(gymId, period);

  const totalTrainerFees = trainerFees.reduce((sum, r) => sum + (parseInt(r.total, 10) || 0), 0);
  const totalAffiliateCommissions = affiliateCommissions.reduce((sum, r) => sum + (parseInt(r.total, 10) || 0), 0);

  return {
    gym_owner_revenue: {
      gross: revenue.total,
      net: revenue.total - totalTrainerFees - totalAffiliateCommissions,
      trend_pct: revenue.trendPct,
      by_source: revenue.bySource,
    },
    trainer_fees: {
      total: totalTrainerFees,
      breakdown: trainerFees,
    },
    affiliate_commissions: {
      total: totalAffiliateCommissions,
      breakdown: affiliateCommissions,
    },
    period,
  };
}
