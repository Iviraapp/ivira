import db from '../config/database.js';

export async function logAction(adminId, action, { targetTenant, targetType, targetId, metadata, ipAddress, userAgent } = {}) {
  const [log] = await db('audit_logs')
    .insert({
      admin_id: adminId,
      action,
      target_tenant: targetTenant || null,
      target_type: targetType || null,
      target_id: targetId || null,
      metadata: metadata ? JSON.stringify(metadata) : '{}',
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })
    .returning('*');
  return log;
}

export async function getAuditLogs(page = 1, limit = 50, filters = {}) {
  const offset = (page - 1) * limit;
  let query = db('audit_logs')
    .leftJoin('super_admins', 'audit_logs.admin_id', 'super_admins.id')
    .leftJoin('gyms', 'audit_logs.target_tenant', 'gyms.id')
    .select(
      'audit_logs.*',
      'super_admins.name as admin_name',
      'super_admins.email as admin_email',
      'gyms.gym_name as target_gym_name'
    );

  if (filters.adminId) query = query.where('audit_logs.admin_id', filters.adminId);
  if (filters.action) query = query.where('audit_logs.action', filters.action);
  if (filters.targetTenant) query = query.where('audit_logs.target_tenant', filters.targetTenant);
  if (filters.from) query = query.where('audit_logs.created_at', '>=', filters.from);
  if (filters.to) query = query.where('audit_logs.created_at', '<=', filters.to);

  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
  const { total } = await countQuery;

  const logs = await query.orderBy('audit_logs.created_at', 'desc').limit(limit).offset(offset);

  return { logs, pagination: { page, limit, total: parseInt(total, 10), totalPages: Math.ceil(total / limit) } };
}
