/**
 * Audit Middleware
 *
 * Logs all mutating operations (POST / PUT / PATCH / DELETE) by gym owners,
 * managers, trainers, and front-desk staff to the `audit_logs` table.
 *
 * Super admin actions are logged separately in superadmin.service.js.
 * Member actions are not logged here.
 *
 * Uses the onResponse hook so it never blocks the request path.
 * Errors are swallowed — a failed audit write must never affect the caller.
 *
 * Table mapping (audit_logs was originally built for super-admin use):
 *   action        → "<METHOD> <route-pattern>"
 *   target_tenant → gym_id from the request
 *   target_type   → last non-UUID path segment (resource type)
 *   target_id     → memberId / staffId / sessionId from route params
 *   ip_address    → request.ip
 *   user_agent    → User-Agent header (truncated to 200 chars)
 *   metadata      → actor_role, actor_id, actor_email, status_code
 *   admin_id      → null (not a super admin action)
 */
import fp from 'fastify-plugin';
import config from '../config/index.js';

const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SKIP_PATTERNS = [
  /^\/health/,
  /^\/api\/v1\/auth\//,
  /^\/api\/v1\/gyms\/[^/]+\/members\/otp/,
  /^\/webhooks\//,
];

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Returns the last non-UUID, non-query-string path segment as the resource type.
 * e.g. /api/v1/gyms/abc/members/xyz  → "members"
 *      /api/v1/gyms/abc/payments      → "payments"
 */
function extractResourceType(url) {
  const path = url.split('?')[0];
  const parts = path.split('/').filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!UUID_RE.test(parts[i])) {
      return parts[i];
    }
  }
  return 'unknown';
}

async function auditPlugin(fastify) {
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      // Feature flag — skip audit logging when disabled (default: ON)
      if (!config.features.auditLog) return;

      // Only log mutating HTTP methods
      if (!AUDIT_METHODS.has(request.method)) return;

      const role = request.user?.role;
      // Only log gym-level staff roles; members and super admins are excluded
      if (!role || role === 'member' || role === 'super_admin') return;

      const url = request.url;
      if (SKIP_PATTERNS.some(p => p.test(url))) return;

      // Skip 5xx noise — transient server errors are not useful audit entries
      if (reply.statusCode >= 500) return;

      const gymId = request.user?.gymId || request.params?.gymId;
      if (!gymId) return;

      const action = `${request.method} ${request.routeOptions?.url || url}`;
      const resourceType = extractResourceType(url);
      const resourceId =
        request.params?.memberId ||
        request.params?.staffId ||
        request.params?.sessionId ||
        null;

      const metadata = {
        actor_role: role,
        actor_id: request.user?.staffId || request.user?.sub || request.user?.email || null,
        actor_email: request.user?.email || null,
        status_code: reply.statusCode,
      };

      // Insert is fire-and-forget; errors must not propagate
      await fastify.db('audit_logs').insert({
        action,
        target_tenant: gymId,
        target_type: resourceType,
        target_id: resourceId,
        ip_address: request.ip,
        user_agent: request.headers['user-agent']?.slice(0, 200) || null,
        metadata,
        created_at: new Date(),
      }).catch(err => {
        fastify.log.warn({ err }, 'Audit log insert failed');
      });
    } catch (err) {
      fastify.log.warn({ err }, 'Audit middleware error');
    }
  });
}

export default fp(auditPlugin, { name: 'audit-middleware' });
