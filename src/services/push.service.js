import admin from 'firebase-admin';
import db from '../config/database.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Register (upsert) a push token for a member or staff member.
 */
export async function registerToken(gymId, { memberId, staffId, deviceToken, platform, deviceInfo }) {
  if (!deviceToken || !platform) {
    throw new ValidationError('deviceToken and platform are required');
  }
  if (!['ios', 'android', 'web'].includes(platform)) {
    throw new ValidationError('platform must be ios, android, or web');
  }

  const [token] = await db('push_tokens')
    .insert({
      gym_id: gymId,
      member_id: memberId || null,
      staff_id: staffId || null,
      device_token: deviceToken,
      platform,
      device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
      is_active: true,
    })
    .onConflict('device_token')
    .merge({
      gym_id: gymId,
      member_id: memberId || null,
      staff_id: staffId || null,
      platform,
      device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
      is_active: true,
      updated_at: db.fn.now(),
    })
    .returning('*');

  return token;
}

/**
 * Deactivate a push token.
 */
export async function removeToken(deviceToken) {
  if (!deviceToken) {
    throw new ValidationError('deviceToken is required');
  }

  await db('push_tokens')
    .where({ device_token: deviceToken })
    .update({ is_active: false, updated_at: db.fn.now() });

  return { success: true };
}

/**
 * Send push notification to all active devices of a member.
 */
export async function sendToMember(gymId, memberId, { title, body, data }) {
  const tokens = await db('push_tokens')
    .where({ gym_id: gymId, member_id: memberId, is_active: true })
    .select('device_token');

  if (!tokens.length) return { sent: 0 };

  const results = await Promise.allSettled(
    tokens.map((t) => sendToToken(t.device_token, { title, body, data }))
  );

  return { sent: results.filter((r) => r.status === 'fulfilled' && r.value.success).length };
}

/**
 * Send push notification to all staff/owner devices of a gym.
 */
export async function sendToGym(gymId, { title, body, data }) {
  const tokens = await db('push_tokens')
    .where({ gym_id: gymId, is_active: true })
    .whereNotNull('staff_id')
    .select('device_token');

  if (!tokens.length) return { sent: 0 };

  const results = await Promise.allSettled(
    tokens.map((t) => sendToToken(t.device_token, { title, body, data }))
  );

  return { sent: results.filter((r) => r.status === 'fulfilled' && r.value.success).length };
}

/**
 * Batch send push notifications to multiple members.
 */
export async function sendBulk(gymId, memberIds, { title, body, data }) {
  if (!memberIds?.length) return { sent: 0 };

  const tokens = await db('push_tokens')
    .where({ gym_id: gymId, is_active: true })
    .whereIn('member_id', memberIds)
    .select('device_token');

  if (!tokens.length) return { sent: 0 };

  const results = await Promise.allSettled(
    tokens.map((t) => sendToToken(t.device_token, { title, body, data }))
  );

  return { sent: results.filter((r) => r.status === 'fulfilled' && r.value.success).length };
}

/**
 * Send push notification to a single device token.
 * Deactivates token if it is no longer registered with FCM.
 */
export async function sendToToken(token, { title, body, data }) {
  try {
    const message = {
      token,
      notification: { title, body },
    };
    if (data) {
      // FCM data values must be strings
      message.data = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      );
    }

    await admin.messaging().send(message);
    return { success: true };
  } catch (err) {
    // Token is invalid or unregistered — deactivate it
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      await db('push_tokens')
        .where({ device_token: token })
        .update({ is_active: false, updated_at: db.fn.now() });
    }
    return { success: false, error: err.code || err.message };
  }
}
