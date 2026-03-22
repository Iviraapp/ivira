import db from '../config/database.js';
import config from '../config/index.js';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Generate a tracking link for a gym to promote a campaign.
 */
export async function generateTrackingLink(campaignId, gymId, sub1, sub2, sub3, sub4, sub5) {
  const campaign = await db('affiliate_campaigns')
    .where({ id: campaignId, status: 'active' })
    .first();

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  const clickToken = nanoid(24);

  await db('affiliate_conversions').insert({
    click_token: clickToken,
    campaign_id: campaignId,
    gym_id: gymId || null,
    status: 'click',
    sub1: sub1 || null,
    sub2: sub2 || null,
    sub3: sub3 || null,
    sub4: sub4 || null,
    sub5: sub5 || null,
  });

  await db('affiliate_campaigns')
    .where({ id: campaignId })
    .increment('total_clicks', 1);

  return {
    trackingUrl: `${config.baseUrl}/track/${clickToken}`,
    clickToken,
    campaignName: campaign.name,
  };
}

/**
 * Handle a click redirect. Returns the offer URL or fallback URL.
 */
export async function handleClick(clickToken, ip, userAgent) {
  const conversion = await db('affiliate_conversions')
    .where({ click_token: clickToken })
    .first();

  if (!conversion) return null;

  const campaign = await db('affiliate_campaigns')
    .where({ id: conversion.campaign_id })
    .first();

  if (!campaign) return null;

  // Check daily cap
  if (campaign.daily_cap > 0 && campaign.today_conversions >= campaign.daily_cap) {
    return campaign.fallback_url || null;
  }

  // Update conversion with IP and user agent
  await db('affiliate_conversions')
    .where({ id: conversion.id })
    .update({
      ip_address: ip || null,
      user_agent: userAgent || null,
      updated_at: db.fn.now(),
    });

  return `${campaign.offer_url}${campaign.offer_url.includes('?') ? '&' : '?'}click_id=${clickToken}`;
}

/**
 * Handle an S2S postback conversion event.
 */
export async function handlePostback(clickId, event, amount, externalStatus) {
  const conversion = await db('affiliate_conversions')
    .where({ click_token: clickId })
    .first();

  if (!conversion) {
    throw new NotFoundError('Conversion');
  }

  // Duplicate check
  if (conversion.status === 'converted') {
    throw new ValidationError('Conversion already recorded for this click');
  }

  const campaign = await db('affiliate_campaigns')
    .where({ id: conversion.campaign_id })
    .first();

  if (!campaign || campaign.status !== 'active') {
    throw new ValidationError('Campaign is not active');
  }

  // Calculate commission split based on gym subscription package
  let gymSharePercent = 30; // default

  if (conversion.gym_id) {
    const gym = await db('gyms').where({ id: conversion.gym_id }).first();
    if (gym && gym.subscription_package_id) {
      const pkg = await db('subscription_packages')
        .where({ id: gym.subscription_package_id })
        .first();

      if (pkg) {
        const slug = (pkg.slug || pkg.name || '').toLowerCase();
        if (slug.includes('starter')) {
          gymSharePercent = 0;
        } else if (slug.includes('growth')) {
          gymSharePercent = 50;
        } else if (slug.includes('pro')) {
          gymSharePercent = 100;
        }
      }
    }
  }

  const gymCommission = Math.round((amount * gymSharePercent) / 100);
  const platformCommission = amount - gymCommission;

  // Update conversion
  await db('affiliate_conversions')
    .where({ id: conversion.id })
    .update({
      status: externalStatus === 'rejected' ? 'rejected' : 'converted',
      conversion_type: event || null,
      value_paise: amount,
      gym_commission_paise: gymCommission,
      platform_commission_paise: platformCommission,
      converted_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

  // Increment campaign counters
  await db('affiliate_campaigns')
    .where({ id: campaign.id })
    .increment('today_conversions', 1)
    .increment('total_conversions', 1);

  // Fire async postback if configured
  if (campaign.postback_url) {
    firePostback(conversion.id).catch(() => {
      // Swallow - will be retried by cron
    });
  }

  return {
    conversionId: conversion.id,
    gymCommission,
    platformCommission,
  };
}

/**
 * Fire a postback notification to the campaign's postback URL.
 */
export async function firePostback(conversionId) {
  const conversion = await db('affiliate_conversions')
    .where({ id: conversionId })
    .first();

  if (!conversion) return;

  const campaign = await db('affiliate_campaigns')
    .where({ id: conversion.campaign_id })
    .first();

  if (!campaign || !campaign.postback_url) return;

  const url = `${campaign.postback_url}${campaign.postback_url.includes('?') ? '&' : '?'}click_id=${conversion.click_token}&status=approved&payout=${conversion.value_paise}`;

  let httpStatus = null;
  let responseBody = null;
  let success = false;

  try {
    const resp = await axios.get(url, { timeout: 10000 });
    httpStatus = resp.status;
    responseBody = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    success = httpStatus >= 200 && httpStatus < 300;
  } catch (err) {
    httpStatus = err.response?.status || null;
    responseBody = err.message;
    success = false;
  }

  const attemptNumber = (conversion.postback_attempts || 0) + 1;

  // Log the attempt
  await db('affiliate_postback_logs').insert({
    conversion_id: conversionId,
    url,
    http_status: httpStatus,
    response_body: responseBody,
    success,
    attempt_number: attemptNumber,
  });

  // Update conversion postback status
  await db('affiliate_conversions')
    .where({ id: conversionId })
    .update({
      postback_status: success ? 'sent' : 'failed',
      postback_attempts: attemptNumber,
      postback_sent_at: success ? db.fn.now() : conversion.postback_sent_at,
      updated_at: db.fn.now(),
    });
}

/**
 * Retry all failed postbacks with fewer than 3 attempts.
 */
export async function retryFailedPostbacks() {
  const failedConversions = await db('affiliate_conversions')
    .where({ postback_status: 'failed' })
    .where('postback_attempts', '<', 3)
    .select('id');

  let succeeded = 0;
  let failed = 0;

  for (const conv of failedConversions) {
    try {
      await firePostback(conv.id);
      const updated = await db('affiliate_conversions')
        .where({ id: conv.id })
        .first();
      if (updated.postback_status === 'sent') {
        succeeded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return {
    retried: failedConversions.length,
    succeeded,
    failed,
  };
}

/**
 * List campaigns with pagination and optional status filter.
 */
export async function listCampaigns({ status, page = 1, limit = 20 } = {}) {
  const query = db('affiliate_campaigns').orderBy('created_at', 'desc');

  if (status) {
    query.where({ status });
  }

  const offset = (page - 1) * limit;

  const [campaigns, [{ count }]] = await Promise.all([
    query.clone().offset(offset).limit(limit),
    query.clone().count('* as count'),
  ]);

  return {
    campaigns,
    pagination: {
      page,
      limit,
      total: parseInt(count, 10),
      pages: Math.ceil(parseInt(count, 10) / limit),
    },
  };
}

/**
 * Create a new campaign.
 */
export async function createCampaign(data) {
  const [campaign] = await db('affiliate_campaigns')
    .insert({
      name: data.name,
      brand_id: data.brand_id || null,
      campaign_type: data.campaign_type || 'CPA',
      offer_url: data.offer_url,
      postback_url: data.postback_url || null,
      fallback_url: data.fallback_url || null,
      payout_amount_paise: data.payout_amount_paise || 0,
      payout_type: data.payout_type || 'fixed',
      daily_cap: data.daily_cap || 0,
      total_cap: data.total_cap || 0,
      status: data.status || 'active',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    })
    .returning('*');

  return campaign;
}

/**
 * Update an existing campaign.
 */
export async function updateCampaign(id, data) {
  const allowedFields = [
    'name', 'brand_id', 'campaign_type', 'offer_url', 'postback_url',
    'fallback_url', 'payout_amount_paise', 'payout_type', 'daily_cap',
    'total_cap', 'status', 'start_date', 'end_date',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  updates.updated_at = db.fn.now();

  const [campaign] = await db('affiliate_campaigns')
    .where({ id })
    .update(updates)
    .returning('*');

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  return campaign;
}

/**
 * Get stats for a specific campaign.
 */
export async function getCampaignStats(campaignId) {
  const campaign = await db('affiliate_campaigns')
    .where({ id: campaignId })
    .first();

  if (!campaign) {
    throw new NotFoundError('Campaign');
  }

  const conversions = await db('affiliate_conversions')
    .where({ campaign_id: campaignId, status: 'converted' })
    .count('* as count')
    .sum('value_paise as total_payout')
    .first();

  const clicks = campaign.total_clicks || 0;
  const conversionCount = parseInt(conversions.count, 10) || 0;
  const cvr = clicks > 0 ? ((conversionCount / clicks) * 100).toFixed(2) : '0.00';

  return {
    campaign,
    stats: {
      clicks,
      conversions: conversionCount,
      cvr: `${cvr}%`,
      totalPayoutPaise: parseInt(conversions.total_payout, 10) || 0,
    },
  };
}

/**
 * Get available active campaigns for a gym.
 */
export async function getGymCampaigns(gymId) {
  const campaigns = await db('affiliate_campaigns')
    .where({ status: 'active' })
    .orderBy('created_at', 'desc');

  // For each campaign, get gym-specific stats
  const result = await Promise.all(
    campaigns.map(async (campaign) => {
      const stats = await db('affiliate_conversions')
        .where({ campaign_id: campaign.id, gym_id: gymId })
        .select(
          db.raw('COUNT(*) as total_clicks'),
          db.raw("COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions"),
          db.raw("COALESCE(SUM(CASE WHEN status = 'converted' THEN gym_commission_paise ELSE 0 END), 0) as total_earnings"),
        )
        .first();

      return {
        ...campaign,
        gym_stats: {
          clicks: parseInt(stats.total_clicks, 10) || 0,
          conversions: parseInt(stats.conversions, 10) || 0,
          totalEarningsPaise: parseInt(stats.total_earnings, 10) || 0,
        },
      };
    }),
  );

  return result;
}

/**
 * Get a gym's conversions with pagination.
 */
export async function getGymConversions(gymId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('affiliate_conversions as c')
    .join('affiliate_campaigns as camp', 'c.campaign_id', 'camp.id')
    .select(
      'c.*',
      'camp.name as campaign_name',
      'camp.campaign_type',
      'camp.payout_amount_paise as campaign_payout',
    )
    .orderBy('c.created_at', 'desc');

  const countQuery = db('affiliate_conversions');

  if (gymId) {
    query.where('c.gym_id', gymId);
    countQuery.where({ gym_id: gymId });
  }

  const [conversions, [{ count }]] = await Promise.all([
    query.clone().offset(offset).limit(limit),
    countQuery.count('* as count'),
  ]);

  return {
    conversions,
    pagination: {
      page,
      limit,
      total: parseInt(count, 10),
      pages: Math.ceil(parseInt(count, 10) / limit),
    },
  };
}

/**
 * Get detailed earnings breakdown for a gym, grouped by campaign type.
 */
export async function getGymDetailedEarnings(gymId) {
  const byCampaignType = await db('affiliate_conversions as c')
    .join('affiliate_campaigns as camp', 'c.campaign_id', 'camp.id')
    .where('c.gym_id', gymId)
    .where('c.status', 'converted')
    .groupBy('camp.campaign_type')
    .select(
      'camp.campaign_type',
      db.raw('COUNT(*) as conversions'),
      db.raw('COALESCE(SUM(c.gym_commission_paise), 0) as total_gym_commission'),
      db.raw('COALESCE(SUM(c.value_paise), 0) as total_value'),
    );

  const byCampaign = await db('affiliate_conversions as c')
    .join('affiliate_campaigns as camp', 'c.campaign_id', 'camp.id')
    .where('c.gym_id', gymId)
    .where('c.status', 'converted')
    .groupBy('camp.id', 'camp.name', 'camp.campaign_type')
    .select(
      'camp.id as campaign_id',
      'camp.name as campaign_name',
      'camp.campaign_type',
      db.raw('COUNT(*) as conversions'),
      db.raw('COALESCE(SUM(c.gym_commission_paise), 0) as total_gym_commission'),
      db.raw('COALESCE(SUM(c.value_paise), 0) as total_value'),
    );

  const totals = await db('affiliate_conversions')
    .where({ gym_id: gymId, status: 'converted' })
    .select(
      db.raw('COUNT(*) as total_conversions'),
      db.raw('COALESCE(SUM(gym_commission_paise), 0) as total_gym_commission'),
      db.raw('COALESCE(SUM(value_paise), 0) as total_value'),
    )
    .first();

  return {
    totals: {
      conversions: parseInt(totals.total_conversions, 10) || 0,
      gymCommissionPaise: parseInt(totals.total_gym_commission, 10) || 0,
      totalValuePaise: parseInt(totals.total_value, 10) || 0,
    },
    byCampaignType,
    byCampaign,
  };
}
