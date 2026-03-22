import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import * as checkinService from '../services/checkin.service.js';

// Verify member JWT (same as members.js but co-located for NFC route)
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

const qrGenerateSchema = {
  body: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: { type: 'string', minLength: 10 },
    },
  },
};

const qrCheckinSchema = {
  body: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      deviceId: { type: 'string' },
    },
  },
};

const otpRequestSchema = {
  body: {
    type: 'object',
    required: ['phone'],
    properties: {
      phone: { type: 'string', minLength: 10 },
    },
  },
};

const otpVerifySchema = {
  body: {
    type: 'object',
    required: ['phone', 'code'],
    properties: {
      phone: { type: 'string', minLength: 10 },
      code: { type: 'string', minLength: 4, maxLength: 6 },
    },
  },
};

export default async function checkinRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Generate QR token for a member (public — used by member-facing page)
  fastify.post('/gyms/:gymId/qr/generate', { schema: qrGenerateSchema }, async (request) => {
    return checkinService.generateQRToken(request.params.gymId, request.body.phone);
  });

  // Validate QR token and check in (gym owner scans)
  fastify.post('/gyms/:gymId/checkin', { schema: qrCheckinSchema, ...authHooks }, async (request, reply) => {
    const checkin = await checkinService.qrCheckin(
      request.params.gymId,
      request.body.token,
      {
        latitude: request.body.latitude,
        longitude: request.body.longitude,
        deviceId: request.body.deviceId,
      }
    );
    return reply.code(201).send({ checkin });
  });

  // Request OTP for check-in
  fastify.post('/gyms/:gymId/checkins/otp/request', { schema: otpRequestSchema, ...authHooks }, async (request) => {
    return checkinService.requestOTP(request.params.gymId, request.body.phone);
  });

  // Verify OTP and check in
  fastify.post('/gyms/:gymId/checkins/otp/verify', { schema: otpVerifySchema, ...authHooks }, async (request, reply) => {
    const checkin = await checkinService.verifyOTPCheckin(
      request.params.gymId,
      request.body.phone,
      request.body.code
    );
    return reply.code(201).send({ checkin });
  });

  // Manual check-in by staff (quick verification)
  fastify.post('/gyms/:gymId/checkins/manual', {
    schema: {
      body: {
        type: 'object',
        required: ['memberId'],
        properties: {
          memberId: { type: 'string', format: 'uuid' },
          staffName: { type: 'string' },
        },
      },
    },
    ...authHooks,
  }, async (request, reply) => {
    const checkin = await checkinService.manualCheckin(
      request.params.gymId,
      request.body.memberId,
      { staffName: request.body.staffName }
    );
    return reply.code(201).send({ checkin });
  });

  // NFC tap check-in (member auth — member taps phone on gym's NFC kiosk)
  // Flow: member opens app → taps NFC → phone reads kiosk tag UID →
  //       app sends tag UID + member identity (from JWT) → backend verifies + checks in
  fastify.post('/gyms/:gymId/checkins/nfc', {
    schema: {
      body: {
        type: 'object',
        required: ['tag_uid'],
        properties: {
          tag_uid: { type: 'string', minLength: 1 },
        },
      },
    },
    preHandler: [verifyMemberToken],
  }, async (request, reply) => {
    const checkin = await checkinService.nfcCheckin(
      request.params.gymId,
      request.member.memberId,
      request.body.tag_uid
    );
    return reply.code(201).send({ checkin });
  });

  // List check-ins
  fastify.get('/gyms/:gymId/checkins', authHooks, async (request) => {
    const { page, limit, date, memberId } = request.query;
    return checkinService.getCheckins(request.params.gymId, { page, limit, date, memberId });
  });

  // --- NFC Tag Management ---

  // Link NFC tag to member (gym owner)
  fastify.post('/gyms/:gymId/nfc-tags/link', {
    schema: {
      body: {
        type: 'object',
        required: ['memberId', 'tagUid'],
        properties: {
          memberId: { type: 'string', format: 'uuid' },
          tagUid: { type: 'string', minLength: 1 },
          tagType: { type: 'string', enum: ['ndef', 'mifare', 'iso14443'] },
        },
      },
    },
    ...authHooks,
  }, async (request, reply) => {
    const { gymId } = request.params;
    const { memberId, tagUid, tagType } = request.body;

    const db = (await import('../config/database.js')).default;

    // Verify member exists
    const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });

    // Upsert NFC tag
    const [tag] = await db('nfc_tags')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        tag_uid: tagUid,
        tag_type: tagType || 'ndef',
        is_active: true,
      })
      .onConflict(['gym_id', 'tag_uid'])
      .merge({ member_id: memberId, is_active: true, updated_at: new Date() })
      .returning('*');

    return reply.code(201).send({ tag });
  });

  // List NFC tags for a gym
  fastify.get('/gyms/:gymId/nfc-tags', authHooks, async (request) => {
    const db = (await import('../config/database.js')).default;
    const tags = await db('nfc_tags')
      .select('nfc_tags.*', 'members.name as member_name', 'members.phone as member_phone')
      .leftJoin('members', 'nfc_tags.member_id', 'members.id')
      .where('nfc_tags.gym_id', request.params.gymId)
      .where('nfc_tags.is_active', true)
      .orderBy('nfc_tags.linked_at', 'desc');
    return { tags };
  });

  // Deactivate NFC tag
  fastify.delete('/gyms/:gymId/nfc-tags/:tagId', authHooks, async (request, reply) => {
    const db = (await import('../config/database.js')).default;
    await db('nfc_tags')
      .where({ id: request.params.tagId, gym_id: request.params.gymId })
      .update({ is_active: false, updated_at: new Date() });
    return reply.code(204).send();
  });
}
