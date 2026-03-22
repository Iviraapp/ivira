import db from '../config/database.js';
import { logAction } from './audit.service.js';

const DEFAULT_FEATURES = {
  whatsapp_api: false,
  marketplace_access: false,
  custom_domain: false,
  ai_nutritionist: false,
  advanced_analytics: false,
  white_label: false,
};

export async function getGymFeatures(gymId) {
  let config = await db('gym_feature_config').where({ gym_id: gymId }).first();
  if (!config) {
    // Return defaults
    return { gym_id: gymId, ...DEFAULT_FEATURES, custom_features: {} };
  }
  return config;
}

export async function updateGymFeatures(gymId, features, adminId, ipAddress) {
  const allowed = ['whatsapp_api', 'marketplace_access', 'custom_domain', 'ai_nutritionist', 'advanced_analytics', 'white_label'];
  const filtered = {};
  for (const key of allowed) {
    if (key in features) filtered[key] = !!features[key];
  }
  if (features.custom_features) filtered.custom_features = JSON.stringify(features.custom_features);
  filtered.updated_by = adminId;
  filtered.updated_at = new Date();

  const existing = await db('gym_feature_config').where({ gym_id: gymId }).first();

  let result;
  if (existing) {
    [result] = await db('gym_feature_config').where({ gym_id: gymId }).update(filtered).returning('*');
  } else {
    [result] = await db('gym_feature_config').insert({ gym_id: gymId, ...DEFAULT_FEATURES, ...filtered }).returning('*');
  }

  // Audit log
  await logAction(adminId, 'toggle_feature', {
    targetTenant: gymId,
    targetType: 'feature',
    metadata: { changes: filtered },
    ipAddress,
  });

  return result;
}

export async function getAllGymFeatures(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const configs = await db('gym_feature_config')
    .leftJoin('gyms', 'gym_feature_config.gym_id', 'gyms.id')
    .select('gym_feature_config.*', 'gyms.gym_name', 'gyms.city')
    .orderBy('gym_feature_config.updated_at', 'desc')
    .limit(limit)
    .offset(offset);

  return configs;
}
