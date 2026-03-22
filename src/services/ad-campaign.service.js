import db from '../config/database.js';
import { logAction } from './audit.service.js';

export async function createCampaign(data, adminId) {
  const [campaign] = await db('global_ad_campaigns')
    .insert({
      title: data.title,
      description: data.description || null,
      image_url: data.image_url || null,
      click_url: data.click_url || null,
      target_city: data.target_city || null,
      target_tier: data.target_tier || null,
      active_from: data.active_from,
      active_until: data.active_until,
      is_active: data.is_active !== false,
      created_by: adminId,
    })
    .returning('*');

  await logAction(adminId, 'create_ad_campaign', {
    targetType: 'ad_campaign',
    targetId: campaign.id,
    metadata: { title: data.title },
  });

  return campaign;
}

export async function listCampaigns(page = 1, limit = 20, activeOnly = false) {
  const offset = (page - 1) * limit;
  let query = db('global_ad_campaigns');

  if (activeOnly) {
    query = query
      .where({ is_active: true })
      .where('active_from', '<=', new Date())
      .where('active_until', '>=', new Date());
  }

  const countQuery = query.clone().clearOrder().count('* as total').first();
  const { total } = await countQuery;

  const campaigns = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

  return { campaigns, pagination: { page, limit, total: parseInt(total, 10) } };
}

export async function updateCampaign(id, data) {
  const allowed = ['title', 'description', 'image_url', 'click_url', 'target_city', 'target_tier', 'active_from', 'active_until', 'is_active'];
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  const [campaign] = await db('global_ad_campaigns').where({ id }).update(filtered).returning('*');
  if (!campaign) throw new Error('Campaign not found');
  return campaign;
}

export async function deleteCampaign(id) {
  await db('global_ad_campaigns').where({ id }).del();
}

export async function recordImpression(campaignId) {
  await db('global_ad_campaigns').where({ id: campaignId }).increment('impressions', 1);
}

export async function recordClick(campaignId) {
  await db('global_ad_campaigns').where({ id: campaignId }).increment('clicks', 1);
}

export async function getActiveAds(city = null, tier = null) {
  let query = db('global_ad_campaigns')
    .where({ is_active: true })
    .where('active_from', '<=', new Date())
    .where('active_until', '>=', new Date());

  if (city) {
    query = query.where(function () {
      this.whereNull('target_city').orWhere('target_city', city);
    });
  }
  if (tier) {
    query = query.where(function () {
      this.whereNull('target_tier').orWhere('target_tier', tier);
    });
  }

  return query.orderBy('created_at', 'desc');
}
