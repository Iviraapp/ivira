import db from '../config/database.js';

export async function getActiveMembers(gymId) {
  const members = await db('members')
    .where({ gym_id: gymId, status: 'active' })
    .select('id', 'name', 'phone', 'status', 'photo_url')
    .orderBy('name', 'asc');

  return members;
}

export async function syncCheckins(gymId, checkins) {
  if (!checkins?.length) return { synced: 0 };

  let synced = 0;
  for (const checkin of checkins) {
    try {
      // Check for duplicates by client_id
      const existing = await db('kiosk_sync_queue')
        .where({ gym_id: gymId, client_id: checkin.clientId, status: 'synced' })
        .first();

      if (existing) continue;

      // Record the check-in
      await db('checkins').insert({
        gym_id: gymId,
        member_id: checkin.memberId,
        method: 'kiosk_offline',
        checked_in_at: checkin.timestamp || new Date(),
      });

      // Mark sync queue entry as synced
      await db('kiosk_sync_queue')
        .where({ gym_id: gymId, client_id: checkin.clientId })
        .update({ status: 'synced', synced_at: new Date() });

      synced++;
    } catch (err) {
      // Log but continue with other check-ins
      console.error(`Failed to sync checkin ${checkin.clientId}:`, err.message);
    }
  }

  return { synced, total: checkins.length };
}

export async function recordHeartbeat(gymId, deviceId, deviceInfo = {}) {
  const existing = await db('kiosk_heartbeats').where({ gym_id: gymId }).first();

  const activeMemberCount = await db('members')
    .where({ gym_id: gymId, status: 'active' })
    .count('* as count')
    .first();

  if (existing) {
    await db('kiosk_heartbeats').where({ gym_id: gymId }).update({
      device_id: deviceId,
      status: 'online',
      active_members_cached: parseInt(activeMemberCount.count, 10),
      last_ping: new Date(),
      device_info: JSON.stringify(deviceInfo),
    });
  } else {
    await db('kiosk_heartbeats').insert({
      gym_id: gymId,
      device_id: deviceId,
      status: 'online',
      active_members_cached: parseInt(activeMemberCount.count, 10),
      device_info: JSON.stringify(deviceInfo),
    });
  }

  return { status: 'ok', activeMembersCached: parseInt(activeMemberCount.count, 10) };
}

export async function getFleetStatus() {
  const heartbeats = await db('kiosk_heartbeats')
    .leftJoin('gyms', 'kiosk_heartbeats.gym_id', 'gyms.id')
    .select(
      'kiosk_heartbeats.*',
      'gyms.gym_name',
      'gyms.city',
      'gyms.status as gym_status'
    )
    .orderBy('kiosk_heartbeats.last_ping', 'desc');

  // Mark stale heartbeats as offline (no ping in 5 min)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const withStatus = heartbeats.map(h => ({
    ...h,
    computed_status: new Date(h.last_ping) < fiveMinAgo ? 'offline' : h.status,
  }));

  return withStatus;
}
