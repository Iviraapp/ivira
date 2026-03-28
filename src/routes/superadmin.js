import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import config from '../config/index.js';
import db from '../config/database.js';
import * as superadminService from '../services/superadmin.service.js';
import * as totpService from '../services/totp.service.js';
import * as proxyService from '../services/proxy.service.js';
import * as auditService from '../services/audit.service.js';
import * as kioskService from '../services/kiosk.service.js';
import * as featureConfigService from '../services/feature-config.service.js';
import * as adCampaignService from '../services/ad-campaign.service.js';
import * as magicLinkService from '../services/magic-link.service.js';
import * as payoutService from '../services/payout.service.js';
import { syncExercises, syncFreeExerciseDB } from '../services/wger-sync.service.js';

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
  },
};

const listGymsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string', default: '' },
      status: { type: 'string', enum: ['active', 'trial', 'suspended', 'expired', ''], default: '' },
    },
  },
};

const gymIdParams = {
  params: {
    type: 'object',
    required: ['gymId'],
    properties: {
      gymId: { type: 'string', format: 'uuid' },
    },
  },
};

const createPackageSchema = {
  body: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', minLength: 2 },
      slug: { type: 'string', minLength: 2, pattern: '^[a-z0-9_-]+$' },
      max_members: { type: 'integer', minimum: 1 },
      price_monthly: { type: 'integer', minimum: 0 },
      price_yearly: { type: 'integer', minimum: 0 },
      features: { type: 'object' },
    },
  },
};

const updatePackageSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      max_members: { type: 'integer', minimum: 1 },
      price_monthly: { type: 'integer', minimum: 0 },
      price_yearly: { type: 'integer', minimum: 0 },
      features: { type: 'object' },
      is_active: { type: 'boolean' },
    },
  },
};

const revenueChartSchema = {
  querystring: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['6months', '12months', '24months'], default: '12months' },
    },
  },
};

export default async function superadminRoutes(fastify) {
  // Auth middleware for super admin routes
  async function verifySuperAdmin(request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' });
      return reply;
    }
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.role !== 'super_admin') throw new Error();
      request.admin = decoded;
    } catch {
      reply.code(401).send({ error: 'Invalid token' });
      return reply;
    }
  }

  // --- Public (no auth) ---

  // POST /super/login
  fastify.post('/super/login', { schema: loginSchema }, async (request) => {
    const { email, password } = request.body;
    const result = await superadminService.loginAdmin(email, password);
    return { token: result.token, admin: result.admin };
  });

  // --- Protected routes (require super admin JWT) ---

  // GET /super/stats
  fastify.get('/super/stats', { preHandler: [verifySuperAdmin] }, async () => {
    return superadminService.getStats();
  });

  // GET /super/gyms
  fastify.get('/super/gyms', { schema: listGymsSchema, preHandler: [verifySuperAdmin] }, async (request) => {
    const { page, limit, search, status } = request.query;
    return superadminService.listGyms(page, limit, search, status);
  });

  // GET /super/gyms/:gymId
  fastify.get('/super/gyms/:gymId', { schema: gymIdParams, preHandler: [verifySuperAdmin] }, async (request) => {
    return superadminService.getGymDetail(request.params.gymId);
  });

  // PATCH /super/gyms/:gymId/suspend
  fastify.patch('/super/gyms/:gymId/suspend', { schema: gymIdParams, preHandler: [verifySuperAdmin] }, async (request) => {
    const gym = await superadminService.suspendGym(request.params.gymId);
    return { message: 'Gym suspended', gym };
  });

  // PATCH /super/gyms/:gymId/activate
  fastify.patch('/super/gyms/:gymId/activate', { schema: gymIdParams, preHandler: [verifySuperAdmin] }, async (request) => {
    const gym = await superadminService.activateGym(request.params.gymId);
    return { message: 'Gym activated', gym };
  });

  // GET /super/packages
  fastify.get('/super/packages', { preHandler: [verifySuperAdmin] }, async () => {
    return superadminService.listPackages();
  });

  // POST /super/packages
  fastify.post('/super/packages', { schema: createPackageSchema, preHandler: [verifySuperAdmin] }, async (request, reply) => {
    const pkg = await superadminService.createPackage(request.body);
    return reply.code(201).send(pkg);
  });

  // PUT /super/packages/:id
  fastify.put('/super/packages/:id', { schema: updatePackageSchema, preHandler: [verifySuperAdmin] }, async (request) => {
    return superadminService.updatePackage(request.params.id, request.body);
  });

  // GET /super/revenue
  fastify.get('/super/revenue', { schema: revenueChartSchema, preHandler: [verifySuperAdmin] }, async (request) => {
    const { period } = request.query;
    return superadminService.getRevenueChart(period);
  });

  // GET /super/search - Global search across gyms, members, transactions
  fastify.get('/super/search', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { q } = request.query;
    if (!q || q.length < 2) return { results: { gyms: [], members: [], transactions: [] } };

    const searchTerm = `%${q}%`;

    // Search gyms
    const gyms = await db('gyms')
      .where('gym_name', 'ilike', searchTerm)
      .orWhere('city', 'ilike', searchTerm)
      .orWhere('owner_email', 'ilike', searchTerm)
      .select('id', 'gym_name', 'city', 'status', 'owner_email')
      .limit(5);

    // Search members across all gyms
    const members = await db('members')
      .where('name', 'ilike', searchTerm)
      .orWhere('phone', 'ilike', searchTerm)
      .orWhere('email', 'ilike', searchTerm)
      .join('gyms', 'members.gym_id', 'gyms.id')
      .select('members.id', 'members.name', 'members.phone', 'members.status', 'gyms.gym_name', 'members.gym_id')
      .limit(5);

    // Search transactions
    const transactions = await db('payments')
      .where('razorpay_payment_id', 'ilike', searchTerm)
      .orWhere('razorpay_order_id', 'ilike', searchTerm)
      .join('gyms', 'payments.gym_id', 'gyms.id')
      .leftJoin('members', 'payments.member_id', 'members.id')
      .select(
        'payments.id', 'payments.amount_paise', 'payments.status',
        'payments.razorpay_payment_id', 'gyms.gym_name',
        'members.name as member_name', 'payments.gym_id'
      )
      .limit(5);

    return {
      results: {
        gyms: gyms.map(g => ({ ...g, type: 'gym' })),
        members: members.map(m => ({ ...m, type: 'member' })),
        transactions: transactions.map(t => ({ ...t, type: 'transaction' })),
      },
    };
  });

  // ===== TOTP 2FA =====

  // POST /super/totp/setup - Generate TOTP secret + QR URI
  fastify.post('/super/totp/setup', { preHandler: [verifySuperAdmin] }, async (request) => {
    const result = await totpService.setupTOTP(request.admin.id);
    return result;
  });

  // POST /super/totp/verify - Verify TOTP token and enable 2FA
  fastify.post('/super/totp/verify', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { token } = request.body;
    if (!token || token.length !== 6) return { valid: false, error: 'Invalid token format' };
    const result = await totpService.verifyAndEnableTOTP(request.admin.id, token);
    return result;
  });

  // POST /super/totp/validate - Validate TOTP during login
  fastify.post('/super/totp/validate', async (request) => {
    const { adminId, token } = request.body;
    if (!adminId || !token) return { valid: false };
    const result = await totpService.validateTOTP(adminId, token);
    return result;
  });

  // ===== PROXY / LOGIN AS OWNER =====

  // POST /super/proxy/start - Start proxy session
  fastify.post('/super/proxy/start', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { gymId, reason, totpToken } = request.body;
    if (!gymId || !reason) return { error: 'gymId and reason are required' };

    // Verify 2FA before allowing proxy
    const hasTOTP = await totpService.hasTOTPEnabled(request.admin.id);
    if (hasTOTP) {
      if (!totpToken) return { error: '2FA token required for proxy access' };
      const totpResult = await totpService.validateTOTP(request.admin.id, totpToken);
      if (!totpResult.valid) return { error: 'Invalid 2FA token' };
    }

    const ip = request.headers['x-forwarded-for'] || request.ip;
    const result = await proxyService.startProxySession(request.admin.id, gymId, reason, ip);
    return result;
  });

  // POST /super/proxy/end - End proxy session
  fastify.post('/super/proxy/end', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { sessionId } = request.body;
    const session = await proxyService.endProxySession(sessionId, request.admin.id);
    return { session };
  });

  // GET /super/proxy/sessions - List proxy sessions
  fastify.get('/super/proxy/sessions', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { page, limit } = request.query;
    return proxyService.getProxySessions(page || 1, limit || 20);
  });

  // GET /super/proxy/sessions/:sessionId/actions - Get actions from a proxy session
  fastify.get('/super/proxy/sessions/:sessionId/actions', { preHandler: [verifySuperAdmin] }, async (request) => {
    return proxyService.getSessionActions(request.params.sessionId);
  });

  // ===== AUDIT LOG =====

  // GET /super/audit - Get audit logs
  fastify.get('/super/audit', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { page, limit, action, from, to } = request.query;
    return auditService.getAuditLogs(page || 1, limit || 50, { action, from, to });
  });

  // ===== FLEET / KIOSK =====

  // GET /super/fleet - Get all gym kiosk statuses
  fastify.get('/super/fleet', { preHandler: [verifySuperAdmin] }, async (request) => {
    const heartbeats = await kioskService.getFleetStatus();

    // Also get revenue for each gym
    const gymIds = heartbeats.map(h => h.gym_id);
    let revenueMap = {};
    if (gymIds.length > 0) {
      const revenues = await db('payments')
        .whereIn('gym_id', gymIds)
        .where({ status: 'captured' })
        .where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .groupBy('gym_id')
        .select('gym_id', db.raw('COALESCE(SUM(amount_paise), 0) as monthly_revenue'));
      for (const r of revenues) revenueMap[r.gym_id] = parseInt(r.monthly_revenue, 10);
    }

    return heartbeats.map(h => ({
      ...h,
      monthly_revenue: revenueMap[h.gym_id] || 0,
    }));
  });

  // ===== FEATURE PROVISIONING =====

  // GET /super/gyms/:gymId/features - Get gym feature config
  fastify.get('/super/gyms/:gymId/features', { preHandler: [verifySuperAdmin] }, async (request) => {
    return featureConfigService.getGymFeatures(request.params.gymId);
  });

  // PUT /super/gyms/:gymId/features - Update gym feature toggles
  fastify.put('/super/gyms/:gymId/features', { preHandler: [verifySuperAdmin] }, async (request) => {
    const ip = request.headers['x-forwarded-for'] || request.ip;
    const result = await featureConfigService.updateGymFeatures(
      request.params.gymId, request.body, request.admin.id, ip
    );
    return result;
  });

  // ===== AD CAMPAIGNS =====

  // POST /super/ads - Create ad campaign
  fastify.post('/super/ads', { preHandler: [verifySuperAdmin] }, async (request) => {
    return adCampaignService.createCampaign(request.body, request.admin.id);
  });

  // GET /super/ads - List ad campaigns
  fastify.get('/super/ads', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { page, limit, activeOnly } = request.query;
    return adCampaignService.listCampaigns(page || 1, limit || 20, activeOnly === 'true');
  });

  // PUT /super/ads/:id - Update ad campaign
  fastify.put('/super/ads/:id', { preHandler: [verifySuperAdmin] }, async (request) => {
    return adCampaignService.updateCampaign(request.params.id, request.body);
  });

  // DELETE /super/ads/:id - Delete ad campaign
  fastify.delete('/super/ads/:id', { preHandler: [verifySuperAdmin] }, async (request) => {
    await adCampaignService.deleteCampaign(request.params.id);
    return { deleted: true };
  });

  // ===== MAGIC LINK =====

  // POST /super/magic-link - Send magic link (admin can trigger for any user)
  fastify.post('/super/magic-link', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { email, role } = request.body;
    return magicLinkService.createMagicLink(email, role || 'owner');
  });

  // ===== PAYOUT LEDGER =====

  // GET /super/payouts/ledger - Get marketplace payout ledger
  fastify.get('/super/payouts/ledger', { preHandler: [verifySuperAdmin] }, async (request) => {
    const { gymId, page, limit } = request.query;
    return payoutService.getPayoutLedger(gymId || null, page || 1, limit || 50);
  });

  // ===== ANALYTICS =====

  // GET /super/analytics/active-users - DAU/WAU/MAU
  fastify.get('/super/analytics/active-users', { preHandler: [verifySuperAdmin] }, async (request) => {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [dau] = await db('members').where('updated_at', '>', dayAgo).count('id as count');
    const [wau] = await db('members').where('updated_at', '>', weekAgo).count('id as count');
    const [mau] = await db('members').where('updated_at', '>', monthAgo).count('id as count');
    const [total] = await db('members').count('id as count');

    return {
      dau: parseInt(dau.count),
      wau: parseInt(wau.count),
      mau: parseInt(mau.count),
      total: parseInt(total.count),
      timestamp: now.toISOString(),
    };
  });

  // GET /super/analytics/activity-feed - Recent signups and check-ins
  fastify.get('/super/analytics/activity-feed', { preHandler: [verifySuperAdmin] }, async (request) => {
    const limit = Math.min(parseInt(request.query.limit) || 50, 200);

    const recentSignups = await db('members')
      .select('id', 'name', 'email', 'gym_id', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit);

    let recentCheckins = [];
    try {
      recentCheckins = await db('checkins')
        .join('members', 'checkins.member_id', 'members.id')
        .select('checkins.id', 'members.name', 'checkins.gym_id', 'checkins.checked_in_at', 'checkins.method')
        .orderBy('checkins.checked_in_at', 'desc')
        .limit(limit);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    return { recentSignups, recentCheckins };
  });

  // GET /super/analytics/gym-breakdown - Per-gym member stats
  fastify.get('/super/analytics/gym-breakdown', { preHandler: [verifySuperAdmin] }, async (request) => {
    const gymStats = await db('gyms')
      .leftJoin('members', 'gyms.id', 'members.gym_id')
      .select(
        'gyms.id',
        'gyms.gym_name',
        'gyms.city',
        'gyms.status',
        'gyms.created_at',
        db.raw('COUNT(members.id) as member_count'),
        db.raw("COUNT(CASE WHEN members.status = 'active' THEN 1 END) as active_members")
      )
      .groupBy('gyms.id')
      .orderBy('member_count', 'desc');

    return { gyms: gymStats };
  });

  // GET /super/analytics/health-overview - Aggregated health data for today
  fastify.get('/super/analytics/health-overview', { preHandler: [verifySuperAdmin] }, async (request) => {
    const today = new Date().toISOString().split('T')[0];

    let nutritionToday = 0;
    let sleepToday = 0;
    let workoutsToday = 0;

    try {
      const [n] = await db('daily_nutrition_logs').where('log_date', today).count('id as count');
      nutritionToday = parseInt(n.count);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    try {
      const [s] = await db('sleep_logs').where('date', today).count('id as count');
      sleepToday = parseInt(s.count);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    try {
      const [w] = await db('workout_sessions').where('session_date', today).count('id as count');
      workoutsToday = parseInt(w.count);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    return {
      today,
      nutritionLogsToday: nutritionToday,
      sleepLogsToday: sleepToday,
      workoutSessionsToday: workoutsToday,
    };
  });

  // ===== SYSTEM ADMIN TEAM MANAGEMENT =====

  // GET /super/team - List all system admins
  fastify.get('/super/team', { preHandler: [verifySuperAdmin] }, async (request) => {
    const admins = await db('super_admins')
      .select('id', 'email', 'name', 'totp_enabled', 'created_at', 'updated_at')
      .orderBy('created_at', 'asc');
    return { admins };
  });

  // POST /super/team/invite - Invite new system admin
  fastify.post('/super/team/invite', { preHandler: [verifySuperAdmin] }, async (request, reply) => {
    const { email, name } = request.body;
    if (!email) return reply.code(400).send({ error: 'Email required' });

    const existing = await db('super_admins').where({ email: email.toLowerCase() }).first();
    if (existing) return reply.code(409).send({ error: 'Admin already exists' });

    // Generate a temporary password
    const tempPassword = nanoid(12);
    const { scryptSync, randomBytes } = await import('node:crypto');
    const salt = randomBytes(32);
    const hash = scryptSync(tempPassword, salt, 64);
    const passwordHash = salt.toString('hex') + ':' + hash.toString('hex');

    const [admin] = await db('super_admins')
      .insert({
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password_hash: passwordHash,
      })
      .returning(['id', 'email', 'name', 'created_at']);

    // Log the action
    await db('audit_logs').insert({
      admin_id: request.admin.id,
      action: 'team_invite',
      target_type: 'super_admin',
      target_id: admin.id,
      details: JSON.stringify({ email: admin.email }),
    }).catch(err => console.warn('[SuperAdmin]', err?.message));

    return { admin, tempPassword };
  });

  // DELETE /super/team/:adminId - Remove system admin
  fastify.delete('/super/team/:adminId', { preHandler: [verifySuperAdmin] }, async (request, reply) => {
    const { adminId } = request.params;

    // Can't remove yourself
    if (adminId === request.admin.id) {
      return reply.code(400).send({ error: 'Cannot remove yourself' });
    }

    const deleted = await db('super_admins').where({ id: adminId }).del();
    if (!deleted) return reply.code(404).send({ error: 'Admin not found' });

    await db('audit_logs').insert({
      admin_id: request.admin.id,
      action: 'team_remove',
      target_type: 'super_admin',
      target_id: adminId,
    }).catch(err => console.warn('[SuperAdmin]', err?.message));

    return { success: true };
  });

  // PATCH /super/team/:adminId - Update system admin (name, reset password)
  fastify.patch('/super/team/:adminId', { preHandler: [verifySuperAdmin] }, async (request, reply) => {
    const { adminId } = request.params;
    const { name, resetPassword } = request.body;
    const updates = {};

    if (name) updates.name = name;

    let newPassword = null;
    if (resetPassword) {
      newPassword = nanoid(12);
      const { scryptSync, randomBytes } = await import('node:crypto');
      const salt = randomBytes(32);
      const hash = scryptSync(newPassword, salt, 64);
      updates.password_hash = salt.toString('hex') + ':' + hash.toString('hex');
    }

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'No updates provided' });
    }

    updates.updated_at = new Date();
    const [admin] = await db('super_admins')
      .where({ id: adminId })
      .update(updates)
      .returning(['id', 'email', 'name']);

    if (!admin) return reply.code(404).send({ error: 'Admin not found' });

    return { admin, ...(newPassword ? { newPassword } : {}) };
  });

  // ===== MEMBER DETAIL (ADMIN SUPPORT) =====

  // GET /super/members/:memberId - Get detailed member info
  fastify.get('/super/members/:memberId', { preHandler: [verifySuperAdmin] }, async (request, reply) => {
    const { memberId } = request.params;
    const member = await db('members').where({ id: memberId }).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });

    // Get gym info if linked
    let gym = null;
    if (member.gym_id) {
      gym = await db('gyms').where({ id: member.gym_id }).select('id', 'gym_name', 'city', 'status').first();
    }

    // Get recent activity counts
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let recentCheckins = 0;
    let recentWorkouts = 0;
    let recentNutritionLogs = 0;

    try {
      const [c] = await db('checkins').where('member_id', memberId).where('checked_in_at', '>', weekAgo).count('id as count');
      recentCheckins = parseInt(c.count);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    try {
      const [w] = await db('workout_sessions').where('member_id', memberId).where('session_date', '>', weekAgo).count('id as count');
      recentWorkouts = parseInt(w.count);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    try {
      const [n] = await db('daily_nutrition_logs').where('member_id', memberId).where('log_date', '>', weekAgo).count('id as count');
      recentNutritionLogs = parseInt(n.count);
    } catch (err) { console.warn('[SuperAdmin]', err?.message); }

    return {
      member,
      gym,
      activity: { recentCheckins, recentWorkouts, recentNutritionLogs },
    };
  });

  // POST /super/exercises/sync-wger — Sync wger exercise database
  fastify.post('/super/exercises/sync-wger', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    const result = await syncExercises(db);
    return result;
  });

  // POST /super/exercises/sync-free-db — Sync Free Exercise DB
  fastify.post('/super/exercises/sync-free-db', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    const result = await syncFreeExerciseDB(db);
    return result;
  });

  // GET /super/exercises/stats — Exercise library stats
  fastify.get('/super/exercises/stats', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    const [total] = await db('exercises').count('id as count');
    const [withImages] = await db('exercises').whereNotNull('image_url').count('id as count');
    const [withVideos] = await db('exercises').whereNotNull('video_url').count('id as count');
    const [fromWger] = await db('exercises').whereNotNull('wger_id').count('id as count');
    const categories = await db('exercises').select('category').groupBy('category').count('id as count').orderBy('count', 'desc');
    return {
      total: parseInt(total.count),
      with_images: parseInt(withImages.count),
      with_videos: parseInt(withVideos.count),
      from_wger: parseInt(fromWger.count),
      by_category: categories.map(c => ({ category: c.category, count: parseInt(c.count) })),
    };
  });
}
