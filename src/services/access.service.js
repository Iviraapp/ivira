import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// In-memory map of connected kiosk WebSocket connections
// Key: "gymId:deviceId", Value: WebSocket instance
const kioskConnections = new Map();

/**
 * Register a kiosk WebSocket connection.
 */
export function registerKiosk(gymId, deviceId, ws) {
  const key = `${gymId}:${deviceId}`;
  kioskConnections.set(key, ws);
}

/**
 * Unregister a kiosk WebSocket connection on disconnect.
 */
export function unregisterKiosk(gymId, deviceId) {
  const key = `${gymId}:${deviceId}`;
  kioskConnections.delete(key);
}

/**
 * Send an unlock command to a connected kiosk device.
 */
export async function sendUnlockCommand(gymId, deviceId, { memberId, initiatedBy, duration = 5 }) {
  const key = `${gymId}:${deviceId}`;
  const ws = kioskConnections.get(key);

  if (!ws || ws.readyState !== 1) {
    await logAccess(gymId, {
      memberId,
      action: 'unlock',
      method: 'remote',
      initiatedBy,
      deviceId,
      result: 'failure',
      metadata: { reason: 'Kiosk not connected' },
    });
    throw new ValidationError('Kiosk device is not connected');
  }

  const message = JSON.stringify({
    type: 'unlock',
    memberId,
    initiatedBy,
    duration,
    timestamp: new Date().toISOString(),
  });

  ws.send(message);

  const log = await logAccess(gymId, {
    memberId,
    action: 'unlock',
    method: 'remote',
    initiatedBy,
    deviceId,
    result: 'success',
    metadata: { duration },
  });

  return log;
}

/**
 * Send a lock command to a connected kiosk device.
 */
export async function sendLockCommand(gymId, deviceId, { initiatedBy }) {
  const key = `${gymId}:${deviceId}`;
  const ws = kioskConnections.get(key);

  if (!ws || ws.readyState !== 1) {
    await logAccess(gymId, {
      action: 'lock',
      method: 'remote',
      initiatedBy,
      deviceId,
      result: 'failure',
      metadata: { reason: 'Kiosk not connected' },
    });
    throw new ValidationError('Kiosk device is not connected');
  }

  const message = JSON.stringify({
    type: 'lock',
    initiatedBy,
    timestamp: new Date().toISOString(),
  });

  ws.send(message);

  const log = await logAccess(gymId, {
    action: 'lock',
    method: 'remote',
    initiatedBy,
    deviceId,
    result: 'success',
  });

  return log;
}

/**
 * Insert an access log entry.
 */
export async function logAccess(gymId, { memberId, action, method, initiatedBy, deviceId, result, metadata }) {
  const [log] = await db('access_logs')
    .insert({
      gym_id: gymId,
      member_id: memberId || null,
      action,
      method,
      initiated_by: initiatedBy,
      device_id: deviceId,
      result,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .returning('*');

  return log;
}

/**
 * Get paginated access log history for a gym.
 */
export async function getAccessLogs(gymId, { page = 1, limit = 50, action } = {}) {
  const query = db('access_logs').where({ gym_id: gymId });

  if (action) {
    query.andWhere({ action });
  }

  const countQuery = query.clone().count();
  const [{ count }] = await countQuery;

  const offset = (page - 1) * limit;
  const logs = await db('access_logs')
    .where({ gym_id: gymId })
    .modify((qb) => {
      if (action) qb.andWhere({ action });
    })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { logs, total: parseInt(count, 10), page, limit };
}

/**
 * List all currently connected kiosks for a gym.
 */
export function getConnectedKiosks(gymId) {
  const kiosks = [];
  for (const [key, ws] of kioskConnections.entries()) {
    const [connGymId, deviceId] = key.split(':');
    if (connGymId === gymId && ws.readyState === 1) {
      kiosks.push({ deviceId, connectedAt: ws._connectedAt });
    }
  }
  return kiosks;
}
