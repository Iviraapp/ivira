/**
 * IVIRA Role-Based Access Control
 *
 * Usage in routes:
 *   preHandler: [fastify.verifyToken, fastify.verifyGymOwner, fastify.requireRole(['owner', 'manager'])]
 */
import fp from 'fastify-plugin';

// Permission matrix per role
export const ROLE_PERMISSIONS = {
  super_admin: ['*'],                          // full platform access

  owner: ['*'],                                // full gym access

  manager: [
    'members.read', 'members.create', 'members.update',
    'staff.read',
    'classes.read', 'classes.create', 'classes.update',
    'checkins.read', 'checkins.create',
    'payments.read',
    'analytics.read',
    'leads.read', 'leads.create', 'leads.update',
    'newsletters.read',
  ],

  trainer: [
    'members.read',
    'classes.read',
    'checkins.read',
    'trainer.read', 'trainer.update',
    'workout_sessions.read', 'workout_sessions.create',
  ],

  front_desk: [
    'members.read', 'members.create',
    'checkins.read', 'checkins.create',
    'classes.read',
    'payments.read',
  ],

  cleaner: [],                                 // no data access

  member: [
    'members.self',
    'classes.read',
    'checkins.self',
    'ai.read',
    'leaderboard.read',
    'referrals.self',
    'nutrition.self',
    'workout_sessions.self',
  ],
};

function hasPermission(role, required) {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  return required.some(p => perms.includes(p));
}

async function permissionsPlugin(fastify) {
  /**
   * Decorator: requireRole(roles)
   * Pass array of allowed roles: ['owner', 'manager']
   * Must be used AFTER verifyToken in preHandler chain.
   */
  fastify.decorate('requireRole', (roles) => {
    return async function roleGuard(request, reply) {
      const role = request.user?.role;
      if (!role) {
        return reply.code(401).send({ error: 'Not authenticated' });
      }
      const allowed = Array.isArray(roles) ? roles : [roles];
      if (!allowed.includes(role) && role !== 'super_admin') {
        return reply.code(403).send({
          error: 'INSUFFICIENT_ROLE',
          message: `This action requires one of: ${allowed.join(', ')}`,
        });
      }
    };
  });

  /**
   * Decorator: requirePermission(permissions)
   * Fine-grained permission check. Pass array of permissions needed.
   * User needs ANY ONE of the listed permissions.
   */
  fastify.decorate('requirePermission', (permissions) => {
    return async function permissionGuard(request, reply) {
      const role = request.user?.role;
      if (!role) {
        return reply.code(401).send({ error: 'Not authenticated' });
      }
      const required = Array.isArray(permissions) ? permissions : [permissions];
      if (!hasPermission(role, required)) {
        return reply.code(403).send({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `Missing required permissions: ${required.join(', ')}`,
        });
      }
    };
  });
}

export default fp(permissionsPlugin, { name: 'permissions' });
