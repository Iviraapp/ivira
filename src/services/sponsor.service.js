import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * Sponsored Newsletter Slots Service
 *
 * Manages brand sponsors who pay CPM (cost per mille) to appear in
 * gym newsletters. Tracks impressions, clicks, and budget consumption.
 * Revenue is split with gyms based on their subscription tier.
 */

const ALLOWED_SPONSOR_FIELDS = [
  'brand_name', 'brand_logo_url', 'ad_html', 'cta_url',
  'cpm_paise', 'budget_paise', 'start_date', 'end_date',
];

function filterFields(data, allowed) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key))
  );
}

/**
 * Create a new sponsor campaign.
 */
export async function createSponsor(data) {
  const filtered = filterFields(data, ALLOWED_SPONSOR_FIELDS);

  if (!filtered.brand_name) {
    throw new ValidationError('brand_name is required');
  }
  if (!filtered.cpm_paise || filtered.cpm_paise <= 0) {
    throw new ValidationError('cpm_paise must be a positive integer');
  }
  if (!filtered.budget_paise || filtered.budget_paise <= 0) {
    throw new ValidationError('budget_paise must be a positive integer');
  }
  if (!filtered.start_date || !filtered.end_date) {
    throw new ValidationError('start_date and end_date are required');
  }
  if (new Date(filtered.end_date) <= new Date(filtered.start_date)) {
    throw new ValidationError('end_date must be after start_date');
  }

  const [sponsor] = await db('newsletter_sponsors')
    .insert({
      ...filtered,
      spent_paise: 0,
      total_impressions: 0,
      total_clicks: 0,
    })
    .returning('*');

  return sponsor;
}

/**
 * List sponsors with optional active filter.
 * Active = within date range AND has remaining budget.
 */
export async function listSponsors({ active } = {}) {
  const query = db('newsletter_sponsors').orderBy('created_at', 'desc');

  if (active === true || active === 'true') {
    const now = new Date().toISOString().split('T')[0];
    query
      .where('start_date', '<=', now)
      .where('end_date', '>=', now)
      .whereRaw('spent_paise < budget_paise');
  } else if (active === false || active === 'false') {
    const now = new Date().toISOString().split('T')[0];
    query.where(function () {
      this.where('end_date', '<', now)
        .orWhereRaw('spent_paise >= budget_paise');
    });
  }

  return query;
}

/**
 * Update an existing sponsor campaign.
 */
export async function updateSponsor(id, data) {
  const filtered = filterFields(data, ALLOWED_SPONSOR_FIELDS);

  if (Object.keys(filtered).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  if (filtered.end_date && filtered.start_date && new Date(filtered.end_date) <= new Date(filtered.start_date)) {
    throw new ValidationError('end_date must be after start_date');
  }

  const [sponsor] = await db('newsletter_sponsors')
    .where({ id })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!sponsor) throw new NotFoundError('Sponsor');

  return sponsor;
}

/**
 * Pick the best active sponsor for a gym's newsletter.
 * Selection criteria:
 *  1. Within date range
 *  2. Has remaining budget (spent < budget)
 *  3. Highest CPM (willingness to pay) wins ties
 *  4. Least impressions served (spread budget evenly)
 *
 * Creates a placement record linking the sponsor to the gym newsletter send.
 */
export async function getSponsorForNewsletter(gymId) {
  const now = new Date().toISOString().split('T')[0];

  const sponsor = await db('newsletter_sponsors')
    .where('start_date', '<=', now)
    .where('end_date', '>=', now)
    .whereRaw('spent_paise < budget_paise')
    .orderBy('cpm_paise', 'desc')
    .orderBy('total_impressions', 'asc')
    .first();

  if (!sponsor) return null;

  const [placement] = await db('sponsor_placements')
    .insert({
      sponsor_id: sponsor.id,
      gym_id: gymId,
      impressions: 0,
      clicks: 0,
    })
    .returning('*');

  return {
    placement,
    sponsor: {
      id: sponsor.id,
      brand_name: sponsor.brand_name,
      brand_logo_url: sponsor.brand_logo_url,
      ad_html: sponsor.ad_html,
      cta_url: sponsor.cta_url,
    },
  };
}

/**
 * Track a click on a sponsor placement.
 * Increments clicks on both the placement and the parent sponsor.
 */
export async function trackSponsorClick(placementId) {
  const placement = await db('sponsor_placements')
    .where({ id: placementId })
    .first();

  if (!placement) throw new NotFoundError('Sponsor placement');

  await db.transaction(async (trx) => {
    await trx('sponsor_placements')
      .where({ id: placementId })
      .increment('clicks', 1)
      .update({ updated_at: new Date() });

    await trx('newsletter_sponsors')
      .where({ id: placement.sponsor_id })
      .increment('total_clicks', 1)
      .update({ updated_at: new Date() });
  });

  return { success: true, placementId };
}

/**
 * Track impressions on a sponsor placement.
 * Calculates CPM cost = (impressions / 1000) * cpm_paise
 * Deducts cost from the sponsor's remaining budget.
 */
export async function trackSponsorImpression(placementId, count = 1) {
  if (count <= 0) {
    throw new ValidationError('Impression count must be positive');
  }

  const placement = await db('sponsor_placements')
    .where({ id: placementId })
    .first();

  if (!placement) throw new NotFoundError('Sponsor placement');

  const sponsor = await db('newsletter_sponsors')
    .where({ id: placement.sponsor_id })
    .first();

  if (!sponsor) throw new NotFoundError('Sponsor');

  // CPM cost: (count / 1000) * cpm_paise, minimum 1 paisa per impression batch
  const costPaise = Math.max(1, Math.round((count / 1000) * sponsor.cpm_paise));

  // Cap cost at remaining budget
  const remainingBudget = sponsor.budget_paise - sponsor.spent_paise;
  const actualCost = Math.min(costPaise, remainingBudget);

  if (actualCost <= 0) {
    return { success: false, reason: 'Sponsor budget exhausted' };
  }

  await db.transaction(async (trx) => {
    await trx('sponsor_placements')
      .where({ id: placementId })
      .increment('impressions', count)
      .update({ updated_at: new Date() });

    await trx('newsletter_sponsors')
      .where({ id: placement.sponsor_id })
      .increment('total_impressions', count)
      .increment('spent_paise', actualCost)
      .update({ updated_at: new Date() });
  });

  return {
    success: true,
    placementId,
    impressions: count,
    costPaise: actualCost,
    remainingBudgetPaise: remainingBudget - actualCost,
  };
}

/**
 * Get aggregate stats for a sponsor campaign.
 */
export async function getSponsorStats(sponsorId) {
  const sponsor = await db('newsletter_sponsors')
    .where({ id: sponsorId })
    .first();

  if (!sponsor) throw new NotFoundError('Sponsor');

  const ctr = sponsor.total_impressions > 0
    ? ((sponsor.total_clicks / sponsor.total_impressions) * 100).toFixed(2)
    : '0.00';

  // Per-gym breakdown
  const gymBreakdown = await db('sponsor_placements')
    .where({ sponsor_id: sponsorId })
    .join('gyms', 'sponsor_placements.gym_id', 'gyms.id')
    .groupBy('gyms.id', 'gyms.gym_name')
    .select(
      'gyms.id as gym_id',
      'gyms.gym_name',
      db.raw('SUM(sponsor_placements.impressions) as impressions'),
      db.raw('SUM(sponsor_placements.clicks) as clicks'),
      db.raw('COUNT(sponsor_placements.id) as placements')
    );

  return {
    sponsor: {
      id: sponsor.id,
      brand_name: sponsor.brand_name,
      cpm_paise: sponsor.cpm_paise,
      budget_paise: sponsor.budget_paise,
      spent_paise: sponsor.spent_paise,
      remaining_paise: sponsor.budget_paise - sponsor.spent_paise,
      start_date: sponsor.start_date,
      end_date: sponsor.end_date,
    },
    stats: {
      total_impressions: sponsor.total_impressions,
      total_clicks: sponsor.total_clicks,
      ctr_percent: parseFloat(ctr),
      spend_paise: sponsor.spent_paise,
    },
    gymBreakdown,
  };
}

/**
 * Get total sponsor revenue for a specific gym.
 * Revenue = sum of CPM costs for all impressions served by this gym's placements.
 */
export async function getGymSponsorRevenue(gymId) {
  const placements = await db('sponsor_placements')
    .where({ 'sponsor_placements.gym_id': gymId })
    .join('newsletter_sponsors', 'sponsor_placements.sponsor_id', 'newsletter_sponsors.id')
    .select(
      'sponsor_placements.id as placement_id',
      'newsletter_sponsors.brand_name',
      'newsletter_sponsors.cpm_paise',
      'sponsor_placements.impressions',
      'sponsor_placements.clicks',
      'sponsor_placements.created_at'
    );

  let totalRevenuePaise = 0;
  const breakdown = placements.map((p) => {
    const revenuePaise = Math.max(1, Math.round((p.impressions / 1000) * p.cpm_paise));
    totalRevenuePaise += p.impressions > 0 ? revenuePaise : 0;
    return {
      placement_id: p.placement_id,
      brand_name: p.brand_name,
      impressions: p.impressions,
      clicks: p.clicks,
      revenue_paise: p.impressions > 0 ? revenuePaise : 0,
      created_at: p.created_at,
    };
  });

  // Aggregate by month
  const byMonth = await db.raw(`
    SELECT TO_CHAR(DATE_TRUNC('month', sp.created_at), 'YYYY-MM') as month,
           SUM(sp.impressions) as impressions,
           SUM(sp.clicks) as clicks,
           COUNT(sp.id) as placements
    FROM sponsor_placements sp
    WHERE sp.gym_id = ?
    GROUP BY DATE_TRUNC('month', sp.created_at)
    ORDER BY month DESC
    LIMIT 12
  `, [gymId]);

  return {
    gym_id: gymId,
    total_revenue_paise: totalRevenuePaise,
    total_placements: placements.length,
    total_impressions: placements.reduce((sum, p) => sum + p.impressions, 0),
    total_clicks: placements.reduce((sum, p) => sum + p.clicks, 0),
    breakdown,
    byMonth: byMonth.rows,
  };
}
