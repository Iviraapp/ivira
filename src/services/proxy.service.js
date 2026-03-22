import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import db from '../config/database.js';
import config from '../config/index.js';
import { logAction } from './audit.service.js';

export async function startProxySession(adminId, targetGymId, reason, ipAddress) {
  // Verify gym exists
  const gym = await db('gyms').where({ id: targetGymId }).first();
  if (!gym) throw new Error('Gym not found');

  // End any existing active sessions for this admin
  await db('proxy_sessions')
    .where({ admin_id: adminId, is_active: true })
    .update({ is_active: false, ended_at: new Date() });

  const proxyToken = randomBytes(32).toString('hex');

  const [session] = await db('proxy_sessions')
    .insert({
      admin_id: adminId,
      target_gym_id: targetGymId,
      proxy_token: proxyToken,
      reason,
      ip_address: ipAddress,
    })
    .returning('*');

  // Generate a proxy JWT that looks like a gym owner token but has proxy metadata
  const token = jwt.sign(
    {
      gymId: targetGymId,
      email: gym.owner_email,
      role: 'owner',
      isProxy: true,
      proxySessionId: session.id,
      adminId,
    },
    config.jwt.secret,
    { expiresIn: '2h' }
  );

  // Log the action
  await logAction(adminId, 'login_as_owner', {
    targetTenant: targetGymId,
    targetType: 'gym',
    metadata: { reason, gym_name: gym.gym_name },
    ipAddress,
  });

  return { token, session, gym };
}

export async function endProxySession(sessionId, adminId) {
  const [session] = await db('proxy_sessions')
    .where({ id: sessionId, admin_id: adminId })
    .update({ is_active: false, ended_at: new Date() })
    .returning('*');

  if (session) {
    await logAction(adminId, 'end_proxy_session', {
      targetTenant: session.target_gym_id,
      metadata: { duration_ms: new Date() - new Date(session.started_at) },
    });
  }

  return session;
}

export async function logProxyAction(proxySessionId, method, path, requestBody, responseStatus) {
  await db('proxy_action_logs').insert({
    proxy_session_id: proxySessionId,
    method,
    path,
    request_body: requestBody ? JSON.stringify(requestBody) : null,
    response_status: responseStatus,
  });
}

export async function getProxySessions(page = 1, limit = 20, adminId = null) {
  const offset = (page - 1) * limit;
  let query = db('proxy_sessions')
    .leftJoin('super_admins', 'proxy_sessions.admin_id', 'super_admins.id')
    .leftJoin('gyms', 'proxy_sessions.target_gym_id', 'gyms.id')
    .select(
      'proxy_sessions.*',
      'super_admins.name as admin_name',
      'gyms.gym_name'
    );

  if (adminId) query = query.where('proxy_sessions.admin_id', adminId);

  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
  const { total } = await countQuery;

  const sessions = await query.orderBy('proxy_sessions.started_at', 'desc').limit(limit).offset(offset);

  return { sessions, pagination: { page, limit, total: parseInt(total, 10) } };
}

export async function getSessionActions(sessionId) {
  return db('proxy_action_logs')
    .where({ proxy_session_id: sessionId })
    .orderBy('created_at', 'asc');
}
