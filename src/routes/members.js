import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../config/database.js';
import * as memberService from '../services/member.service.js';

const addMemberSchema = {
  body: {
    type: 'object',
    required: ['name', 'phone'],
    properties: {
      name: { type: 'string', minLength: 2 },
      phone: { type: 'string', minLength: 10 },
      email: { type: 'string', format: 'email' },
      dateOfBirth: { type: 'string', format: 'date' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
    },
  },
};

const memberOtpRequestSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
};

const memberOtpVerifySchema = {
  body: {
    type: 'object',
    required: ['email', 'otp'],
    properties: {
      email: { type: 'string', format: 'email' },
      otp: { type: 'string', minLength: 6, maxLength: 6 },
    },
  },
};

// Pre-handler to verify member JWT token
async function verifyMemberToken(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid authorization header' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwt.secret);
    if (decoded.role !== 'member' || decoded.gymId !== request.params.gymId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    request.member = decoded;
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export default async function memberRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // --- Member OTP login (public) ---
  fastify.post('/gyms/:gymId/members/otp/request', { schema: memberOtpRequestSchema }, async (request) => {
    return memberService.requestMemberOTP(request.params.gymId, request.body.email);
  });

  fastify.post('/gyms/:gymId/members/otp/verify', { schema: memberOtpVerifySchema }, async (request) => {
    return memberService.verifyMemberOTP(request.params.gymId, request.body.email, request.body.otp);
  });

  // --- Member self-service (member JWT auth) ---
  fastify.get('/gyms/:gymId/members/me', { preHandler: [verifyMemberToken] }, async (request) => {
    return memberService.getMemberProfile(request.params.gymId, request.member.memberId);
  });

  fastify.get('/gyms/:gymId/members/me/checkins', { preHandler: [verifyMemberToken] }, async (request) => {
    const { page, limit } = request.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    return memberService.getMemberCheckins(request.params.gymId, request.member.memberId, { page: safePage, limit: safeLimit });
  });

  // GET /gyms/:gymId/members/me/export — Member self-service data export (GDPR/DPDPA)
  fastify.get('/gyms/:gymId/members/me/export', { preHandler: [verifyMemberToken] }, async (request, reply) => {
    const { gymId } = request.params;
    const memberId = request.member.memberId;

    const tables = [
      ['members', { id: memberId, gym_id: gymId }],
      ['memberships', { member_id: memberId, gym_id: gymId }],
      ['checkins', { member_id: memberId, gym_id: gymId }],
      ['payments', { member_id: memberId, gym_id: gymId }],
    ];

    const results = {};
    for (const [table, where] of tables) {
      try {
        results[table] = await db(table).where(where).orderBy('created_at', 'desc').limit(200);
      } catch {
        results[table] = []; // Table may not exist
      }
    }

    // Sanitize sensitive fields
    if (results.members && results.members[0]) {
      const m = results.members[0];
      results.member = { name: m.name, email: m.email, phone: m.phone, status: m.status, created_at: m.created_at };
      delete results.members;
    }

    reply.header('Content-Disposition', 'attachment; filename="my-ivira-data.json"');
    return {
      exported_at: new Date().toISOString(),
      request_by: 'member_self_service',
      ...results,
    };
  });

  // DELETE /gyms/:gymId/members/me — Member self-service account deletion (GDPR/DPDPA soft delete)
  fastify.delete('/gyms/:gymId/members/me', { preHandler: [verifyMemberToken] }, async (request, reply) => {
    const { gymId } = request.params;
    const memberId = request.member.memberId;

    const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });
    if (member.status === 'deleted') return reply.code(409).send({ error: 'Account already deleted' });

    // Soft delete — anonymize PII
    await db('members').where({ id: memberId }).update({
      name: 'Deleted Member',
      phone: null,
      email: `deleted_${memberId}@removed.invalid`,
      date_of_birth: null,
      profile_photo_url: null,
      status: 'deleted',
      updated_at: new Date(),
    });

    // Cancel active memberships
    await db('memberships')
      .where({ member_id: memberId, gym_id: gymId, status: 'active' })
      .update({ status: 'cancelled', updated_at: new Date() });

    return { message: 'Your account has been deleted. Your financial records are retained for accounting compliance.' };
  });

  // PATCH /gyms/:gymId/members/me — Member update own profile
  fastify.patch('/gyms/:gymId/members/me', { preHandler: [verifyMemberToken] }, async (request, reply) => {
    const { gymId } = request.params;
    const memberId = request.member.memberId;

    const { name, email, gender, date_of_birth } = request.body || {};
    const updates = {};
    if (name && name.length >= 2) updates.name = name;
    if (email) updates.email = email;
    if (gender && ['male', 'female', 'other'].includes(gender)) updates.gender = gender;
    if (date_of_birth) updates.date_of_birth = date_of_birth;

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ error: 'No valid fields to update' });
    }

    updates.updated_at = new Date();
    const [updated] = await db('members').where({ id: memberId, gym_id: gymId }).update(updates).returning('id, name, email, phone, gender, status, created_at');
    return { member: updated };
  });

  // --- Member profile photo upload (30-day cooldown) ---
  fastify.put('/gyms/:gymId/members/me/photo', { preHandler: [verifyMemberToken] }, async (request, reply) => {
    const { image, mimetype } = request.body || {};
    if (!image) return reply.code(400).send({ error: 'No image provided' });

    const result = await memberService.updateMemberPhoto(
      request.params.gymId,
      request.member.memberId,
      image,
      mimetype || 'image/jpeg'
    );
    return result;
  });

  // --- Gym owner routes (owner JWT auth) ---
  fastify.post('/gyms/:gymId/members', { schema: addMemberSchema, ...authHooks }, async (request, reply) => {
    const member = await memberService.addMember(request.params.gymId, request.body);
    return reply.code(201).send({ member });
  });

  fastify.get('/gyms/:gymId/members', authHooks, async (request) => {
    const { page, limit, status, search } = request.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    return memberService.listMembers(request.params.gymId, { page: safePage, limit: safeLimit, status, search });
  });

  fastify.get('/gyms/:gymId/members/:memberId', authHooks, async (request) => {
    const member = await memberService.getMember(request.params.gymId, request.params.memberId);
    return { member };
  });

  fastify.patch('/gyms/:gymId/members/:memberId', authHooks, async (request) => {
    const member = await memberService.updateMember(
      request.params.gymId,
      request.params.memberId,
      request.body
    );
    return { member };
  });

  // GET /gyms/:gymId/members/:memberId/export — GDPR data export
  fastify.get('/gyms/:gymId/members/:memberId/export', authHooks, async (request, reply) => {
    const { gymId, memberId } = request.params;

    const [member, memberships, checkins, payments, workouts, nutrition] = await Promise.all([
      db('members').where({ id: memberId, gym_id: gymId }).first(),
      db('memberships').where({ member_id: memberId, gym_id: gymId }),
      db('checkins').where({ member_id: memberId, gym_id: gymId }).orderBy('checked_in_at', 'desc').limit(100),
      db('payments').where({ member_id: memberId, gym_id: gymId }).orderBy('created_at', 'desc').limit(100),
      db('workout_sessions').where({ member_id: memberId, gym_id: gymId }).orderBy('created_at', 'desc').limit(50),
      db('nutrition_logs').where({ member_id: memberId, gym_id: gymId }).orderBy('date', 'desc').limit(100),
    ]);

    if (!member) return reply.code(404).send({ error: 'Member not found' });

    return {
      exported_at: new Date().toISOString(),
      member: { name: member.name, phone: member.phone, email: member.email, status: member.status, created_at: member.created_at },
      memberships,
      checkins,
      payments: payments.map(p => ({ ...p, amount: p.amount_paise / 100 })),
      workouts,
      nutrition,
    };
  });

  // POST /gyms/:gymId/members/:memberId/memberships/:membershipId/pause — Pause membership
  fastify.post('/gyms/:gymId/members/:memberId/memberships/:membershipId/pause', authHooks, async (request, reply) => {
    const { gymId, memberId, membershipId } = request.params;
    const { reason } = request.body || {};

    const membership = await db('memberships').where({ id: membershipId, member_id: memberId, gym_id: gymId }).first();
    if (!membership) return reply.code(404).send({ error: 'Membership not found' });
    if (membership.status !== 'active') return reply.code(409).send({ error: 'Only active memberships can be paused' });

    const [updated] = await db('memberships')
      .where({ id: membershipId })
      .update({
        status: 'paused',
        paused_at: new Date(),
        pause_reason: reason || null,
        updated_at: new Date(),
      })
      .returning('*');

    return { membership: updated, message: 'Membership paused' };
  });

  // POST /gyms/:gymId/members/:memberId/memberships/:membershipId/resume — Resume membership
  fastify.post('/gyms/:gymId/members/:memberId/memberships/:membershipId/resume', authHooks, async (request, reply) => {
    const { gymId, memberId, membershipId } = request.params;

    const membership = await db('memberships').where({ id: membershipId, member_id: memberId, gym_id: gymId }).first();
    if (!membership) return reply.code(404).send({ error: 'Membership not found' });
    if (membership.status !== 'paused') return reply.code(409).send({ error: 'Only paused memberships can be resumed' });

    // Extend end_date by the number of days paused
    const pausedDays = Math.ceil((Date.now() - new Date(membership.paused_at).getTime()) / (1000 * 60 * 60 * 24));
    const newEndDate = new Date(membership.end_date);
    newEndDate.setDate(newEndDate.getDate() + pausedDays);

    const [updated] = await db('memberships')
      .where({ id: membershipId })
      .update({
        status: 'active',
        end_date: newEndDate.toISOString().split('T')[0],
        paused_at: null,
        pause_reason: null,
        updated_at: new Date(),
      })
      .returning('*');

    return { membership: updated, message: `Membership resumed. Extended by ${pausedDays} days.` };
  });
}
