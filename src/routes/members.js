import jwt from 'jsonwebtoken';
import config from '../config/index.js';
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
    return memberService.getMemberCheckins(request.params.gymId, request.member.memberId, { page, limit });
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
    return memberService.listMembers(request.params.gymId, { page, limit, status, search });
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
}
