import crypto from 'node:crypto';
import db from '../config/database.js';
import redis from '../config/redis.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

function generateToken() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 12);
}

// Get gym's subscription tier for commission split
async function getGymTier(gymId) {
  const sub = await db('gym_subscriptions')
    .where({ gym_id: gymId, status: 'active' })
    .first();
  if (!sub) return 'starter'; // trial = starter tier
  const plan = await db('subscription_plans').where({ id: sub.plan_id }).first();
  return plan?.slug || 'starter';
}

function splitCommission(tier, totalPaise) {
  switch (tier) {
    case 'pro':
      return { gym: totalPaise, platform: 0 };
    case 'growth':
      return { gym: Math.floor(totalPaise / 2), platform: Math.ceil(totalPaise / 2) };
    default: // starter / trial
      return { gym: 0, platform: totalPaise };
  }
}

// --- Public ---

export async function listBrands({ category } = {}) {
  const query = db('affiliate_brands').where({ active: true });
  if (category) query.andWhere({ category });
  return query.orderBy('name');
}

export async function getBrandCategories() {
  const rows = await db('affiliate_brands')
    .where({ active: true })
    .distinct('category')
    .orderBy('category');
  return rows.map(r => r.category);
}

// --- Gym owner ---

export async function generateLink(gymId, { brandId, memberId, productUrl }) {
  const brand = await db('affiliate_brands').where({ id: brandId, active: true }).first();
  if (!brand) throw new NotFoundError('Brand');

  const url = productUrl || brand.base_url;
  const token = generateToken();

  const [click] = await db('affiliate_clicks')
    .insert({
      gym_id: gymId,
      member_id: memberId || null,
      brand_id: brandId,
      click_token: token,
      product_url: url,
    })
    .returning('*');

  // Cache in Redis for fast redirect
  await redis.set(`aff:${token}`, url, { EX: 86400 * 30 }); // 30 days

  const trackingUrl = `${config.baseUrl}/r/${token}`;
  return { click, trackingUrl, brand: brand.name };
}

export async function trackClick(token) {
  // Try Redis first for speed
  let url = await redis.get(`aff:${token}`);

  if (!url) {
    const click = await db('affiliate_clicks').where({ click_token: token }).first();
    if (!click) return null;
    url = click.product_url;
    // Re-cache
    await redis.set(`aff:${token}`, url, { EX: 86400 * 30 });
  }

  // Update click timestamp (fire-and-forget)
  db('affiliate_clicks')
    .where({ click_token: token })
    .whereNull('clicked_at')
    .update({ clicked_at: new Date() })
    .catch(err => console.warn('[Affiliate]', err?.message));

  return url;
}

export async function getClicks(gymId, { page = 1, limit = 50, brandId } = {}) {
  const query = db('affiliate_clicks')
    .where({ 'affiliate_clicks.gym_id': gymId })
    .join('affiliate_brands', 'affiliate_clicks.brand_id', 'affiliate_brands.id')
    .leftJoin('members', 'affiliate_clicks.member_id', 'members.id')
    .select(
      'affiliate_clicks.*',
      'affiliate_brands.name as brand_name',
      'affiliate_brands.category as brand_category',
      'members.name as member_name'
    );

  if (brandId) query.andWhere({ 'affiliate_clicks.brand_id': brandId });

  const countQuery = db('affiliate_clicks').where({ gym_id: gymId });
  if (brandId) countQuery.andWhere({ brand_id: brandId });
  const [{ count }] = await countQuery.count();

  const offset = (page - 1) * limit;
  const clicks = await query.orderBy('affiliate_clicks.created_at', 'desc').limit(limit).offset(offset);

  return { clicks, total: parseInt(count, 10), page, limit };
}

export async function getEarnings(gymId) {
  const tier = await getGymTier(gymId);

  // Total clicks
  const [{ count: totalClicks }] = await db('affiliate_clicks')
    .where({ gym_id: gymId })
    .whereNotNull('clicked_at')
    .count();

  // Conversions
  const [{ count: conversions }] = await db('affiliate_clicks')
    .where({ gym_id: gymId, converted: true })
    .count();

  // Total earned by gym
  const [{ total: totalEarned }] = await db('affiliate_clicks')
    .where({ gym_id: gymId, converted: true })
    .sum('commission_to_gym_paise as total');

  // Total paid out
  const [{ total: paidOut }] = await db('affiliate_payouts')
    .where({ gym_id: gymId, status: 'paid' })
    .sum('amount_paise as total');

  // By brand
  const byBrand = await db('affiliate_clicks')
    .where({ 'affiliate_clicks.gym_id': gymId })
    .whereNotNull('clicked_at')
    .join('affiliate_brands', 'affiliate_clicks.brand_id', 'affiliate_brands.id')
    .groupBy('affiliate_brands.id', 'affiliate_brands.name')
    .select(
      'affiliate_brands.name',
      db.raw('COUNT(*) as clicks'),
      db.raw('SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions'),
      db.raw('SUM(commission_to_gym_paise) as earned_paise')
    );

  // By month (last 6 months)
  const byMonth = await db.raw(`
    SELECT TO_CHAR(DATE_TRUNC('month', clicked_at), 'YYYY-MM') as month,
           COUNT(*) as clicks,
           SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions,
           SUM(commission_to_gym_paise) as earned_paise
    FROM affiliate_clicks
    WHERE gym_id = ? AND clicked_at IS NOT NULL AND clicked_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', clicked_at)
    ORDER BY month
  `, [gymId]);

  return {
    tier,
    totalClicks: parseInt(totalClicks, 10),
    conversions: parseInt(conversions, 10),
    totalEarned: parseInt(totalEarned || 0, 10),
    pendingPayout: parseInt(totalEarned || 0, 10) - parseInt(paidOut || 0, 10),
    paidOut: parseInt(paidOut || 0, 10),
    byBrand,
    byMonth: byMonth.rows,
  };
}

export async function getPayouts(gymId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const payouts = await db('affiliate_payouts')
    .where({ gym_id: gymId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
  return { payouts };
}

// --- Admin ---

export async function createBrand(data) {
  const [brand] = await db('affiliate_brands').insert(data).returning('*');
  return brand;
}

export async function updateBrand(brandId, updates) {
  const allowed = ['name', 'category', 'commission_rate_percent', 'commission_flat_paise', 'base_url', 'logo_url', 'description', 'active'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowed.includes(key))
  );
  const [brand] = await db('affiliate_brands')
    .where({ id: brandId })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');
  if (!brand) throw new NotFoundError('Brand');
  return brand;
}

export async function markPayoutPaid(gymId, { amountPaise, periodStart, periodEnd, notes }) {
  const [payout] = await db('affiliate_payouts')
    .insert({
      gym_id: gymId,
      amount_paise: amountPaise,
      status: 'paid',
      period_start: periodStart,
      period_end: periodEnd,
      paid_at: new Date(),
      notes,
    })
    .returning('*');
  return payout;
}

// Generate affiliate links for newsletter (per member)
export async function generateNewsletterLinks(gymId, memberId) {
  const brands = await db('affiliate_brands')
    .where({ active: true })
    .orderByRaw('RANDOM()')
    .limit(2);

  const links = [];
  for (const brand of brands) {
    const result = await generateLink(gymId, {
      brandId: brand.id,
      memberId,
      productUrl: brand.base_url,
    });
    links.push({
      brandName: brand.name,
      brandCategory: brand.category,
      description: brand.description,
      url: result.trackingUrl,
    });
  }
  return links;
}
