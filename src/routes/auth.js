import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../config/database.js';
import redis from '../config/redis.js';
import * as authService from '../services/auth.service.js';

const registerSchema = {
  body: {
    type: 'object',
    required: ['ownerName', 'ownerPhone', 'ownerEmail', 'gymName', 'city'],
    properties: {
      ownerName: { type: 'string', minLength: 2 },
      ownerPhone: { type: 'string', minLength: 10 },
      ownerEmail: { type: 'string', format: 'email' },
      gymName: { type: 'string', minLength: 2 },
      city: { type: 'string', enum: ['bengaluru', 'hyderabad', 'chennai', 'mumbai'] },
      address: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
    },
  },
};

const emailOtpRequestSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
};

const emailOtpVerifySchema = {
  body: {
    type: 'object',
    required: ['email', 'otp'],
    properties: {
      email: { type: 'string', format: 'email' },
      otp: { type: 'string', minLength: 6, maxLength: 6 },
    },
  },
};

export default async function authRoutes(fastify) {
  // Request email OTP for gym owner login
  fastify.post('/auth/otp/email/request', { schema: emailOtpRequestSchema }, async (request) => {
    return authService.requestEmailOTP(request.body.email);
  });

  // Verify email OTP and get JWT token
  fastify.post('/auth/otp/email/verify', { schema: emailOtpVerifySchema }, async (request) => {
    return authService.verifyEmailOTP(request.body.email, request.body.otp);
  });

  // B2C: Request OTP for member login (no gymId required)
  fastify.post('/auth/b2c/otp/request', { schema: emailOtpRequestSchema }, async (request) => {
    return authService.requestB2CLoginOTP(request.body.email);
  });

  // B2C: Verify OTP and get JWT token + member data
  fastify.post('/auth/b2c/otp/verify', { schema: emailOtpVerifySchema }, async (request) => {
    return authService.verifyB2CLoginOTP(request.body.email, request.body.otp);
  });

  // Register a new gym (public)
  fastify.post('/auth/register', { schema: registerSchema }, async (request, reply) => {
    const gym = await authService.registerGym(request.body);
    return reply.code(201).send({ gym });
  });

  // Get current gym profile
  fastify.get('/auth/me', { preHandler: [fastify.verifyToken] }, async (request) => {
    if (request.user.gymId) {
      const gym = await authService.getGymById(request.user.gymId);
      return { gym };
    }
    const gym = await authService.getGymByFirebaseUid(request.user.uid);
    return { gym };
  });

  // Find gyms by email or phone (rate limited) — subdomain recovery
  fastify.post('/auth/find-gyms', async (request, reply) => {
    const { contact } = request.body || {}
    if (!contact) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Email or phone required' })

    // Rate limiting: check Redis for attempts
    const rateLimitKey = `find_gyms:${contact}`
    const attempts = await redis.get(rateLimitKey) || 0
    if (parseInt(attempts) >= 3) {
      return reply.code(429).send({ error: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' })
    }

    // Increment attempts with 15min TTL
    await redis.incr(rateLimitKey)
    await redis.expire(rateLimitKey, 900)

    // Generate OTP and send
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    await redis.set(`subdomain_otp:${contact}`, otp, { EX: 300 })

    // Determine if email or phone
    const isEmail = contact.includes('@')
    // TODO: Send OTP via email or SMS
    request.log.info({ contact, otp }, 'Subdomain recovery OTP generated')

    return reply.send({ success: true, message: 'OTP sent to your registered contact', method: isEmail ? 'email' : 'sms' })
  })

  // Verify OTP and return gyms — subdomain recovery
  fastify.post('/auth/verify-subdomain-otp', async (request, reply) => {
    const { contact, otp } = request.body || {}
    if (!contact || !otp) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Contact and OTP required' })

    // Verify OTP
    const storedOtp = await redis.get(`subdomain_otp:${contact}`)
    if (!storedOtp || storedOtp !== otp) {
      return reply.code(401).send({ error: 'INVALID_OTP', message: 'Invalid or expired OTP' })
    }

    // Clear OTP
    await redis.del(`subdomain_otp:${contact}`)

    // Find gyms
    const isEmail = contact.includes('@')
    const query = isEmail
      ? db('gyms').where('owner_email', contact)
      : db('gyms').where('owner_phone', contact)

    const gyms = await query.select('id', 'gym_name', 'subdomain', 'owner_name', 'status')

    return reply.send({ gyms })
  })

  // Resolve gym invite code (public — shows gym name for sign-up UI)
  fastify.get('/auth/resolve-code/:code', async (request, reply) => {
    const { code } = request.params;
    if (!code || code.length < 4) return reply.code(400).send({ error: 'Invalid code' });
    const gym = await db('gyms')
      .where('invite_code', code.toUpperCase())
      .select('id', 'gym_name', 'city', 'logo_url')
      .first();
    if (!gym) return reply.code(404).send({ error: 'GYM_NOT_FOUND', message: 'Invalid invite code' });
    return { gymId: gym.id, gymName: gym.gym_name, city: gym.city, logoUrl: gym.logo_url };
  });

  // B2C: Register new member with name/phone and optional gym invite code
  fastify.post('/auth/b2c/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'phone'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', minLength: 10, maxLength: 15 },
          inviteCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { name, email, phone, inviteCode } = request.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if member already exists
    const existing = await db('members').where('email', normalizedEmail).first();
    if (existing) {
      return reply.code(409).send({ error: 'ALREADY_EXISTS', message: 'An account with this email already exists. Please sign in instead.' });
    }

    // Resolve invite code if provided
    let gymId = null;
    if (inviteCode) {
      const gym = await db('gyms').where('invite_code', inviteCode.toUpperCase()).select('id').first();
      if (!gym) return reply.code(400).send({ error: 'INVALID_CODE', message: 'Invalid gym invite code' });
      gymId = gym.id;
    }

    // Store registration data in Redis (pending OTP verification)
    await redis.set(`b2c_register:${normalizedEmail}`, JSON.stringify({
      name: name.trim(),
      phone: phone.trim(),
      gymId,
    }), { EX: 600 }); // 10 minutes

    // Send OTP using the existing B2C flow
    const result = await authService.requestB2CLoginOTP(normalizedEmail);
    return { ...result, registered: true };
  });

  // Connect member to gym via invite code (authenticated)
  fastify.post('/auth/connect-gym', {
    preHandler: [fastify.verifyToken],
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', minLength: 4, maxLength: 10 },
        },
      },
    },
  }, async (request, reply) => {
    const { code } = request.body;
    const memberId = request.user.memberId;
    if (!memberId) return reply.code(401).send({ error: 'Not a member token' });

    const gym = await db('gyms').where('invite_code', code.toUpperCase()).select('id', 'gym_name').first();
    if (!gym) return reply.code(404).send({ error: 'INVALID_CODE', message: 'Invalid invite code' });

    await db('members').where('id', memberId).update({ gym_id: gym.id, updated_at: new Date() });

    // Re-issue token with gymId
    const token = jwt.sign(
      { memberId, gymId: gym.id, email: request.user.email, role: 'member' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    return { token, gymId: gym.id, gymName: gym.gym_name };
  });

  // Admin: one-time test gym setup (protected by secret)
  fastify.post('/admin/setup-test-gym', async (request, reply) => {
    const { secret } = request.body || {};
    if (secret !== config.jwt.secret) return reply.code(403).send({ error: 'Forbidden' });

    const GYM_ID = 'e1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6';
    const results = [];

    // Create or update gym
    const existing = await db('gyms').where({ id: GYM_ID }).first();
    if (existing) {
      await db('gyms').where({ id: GYM_ID }).update({
        gym_name: 'IVIRA Test Gym — Fort Worth',
        address: '545 Harrold St, Fort Worth, TX 76107',
        city: 'Fort Worth',
        latitude: 32.75307193,
        longitude: -97.34792413,
        status: 'active',
        invite_code: existing.invite_code || 'GYM-FWTX01',
        updated_at: new Date(),
      });
      results.push('Updated existing gym');
    } else {
      await db('gyms').insert({
        id: GYM_ID,
        owner_firebase_uid: 'test_bexley_fw',
        owner_name: 'Niel (Test)',
        owner_phone: '+10000000000',
        owner_email: 'admin@ivira.app',
        gym_name: 'IVIRA Test Gym — Fort Worth',
        address: '545 Harrold St, Fort Worth, TX 76107',
        city: 'Fort Worth',
        latitude: 32.75307193,
        longitude: -97.34792413,
        status: 'active',
        invite_code: 'GYM-FWTX01',
      });
      results.push('Created gym');
    }

    // Setup members
    for (const email of ['admin@ivira.app', 'task261190@gmail.com']) {
      let member = await db('members').where({ email }).first();
      if (member) {
        await db('members').where({ id: member.id }).update({ gym_id: GYM_ID, status: 'active', updated_at: new Date() });
        results.push(`Linked ${email} to gym`);
      } else {
        const [m] = await db('members').insert({
          name: email === 'admin@ivira.app' ? 'Niel (Admin)' : 'Niel (Test)',
          email,
          phone: email === 'admin@ivira.app' ? '+10000000001' : '+10000000002',
          gym_id: GYM_ID,
          status: 'active',
          gender: 'male',
        }).returning('*');
        member = m;
        results.push(`Created member ${email}: ${member.id}`);
      }

      // Ensure active membership
      const hasMembership = await db('memberships')
        .where({ member_id: member.id, gym_id: GYM_ID, status: 'active' })
        .first();
      if (!hasMembership) {
        await db('memberships').insert({
          member_id: member.id,
          gym_id: GYM_ID,
          plan_name: 'QA Unlimited',
          amount_paise: 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active',
        });
        results.push(`Created membership for ${email}`);
      }
    }

    const gym = await db('gyms').where({ id: GYM_ID }).first();
    const members = await db('members').where({ gym_id: GYM_ID }).select('id', 'name', 'email', 'status');
    return { gym: { id: gym.id, name: gym.gym_name, invite_code: gym.invite_code, lat: gym.latitude, lng: gym.longitude }, members, actions: results };
  });

  // Refresh JWT token (extend expiry without re-login)
  fastify.post('/auth/refresh', { preHandler: [fastify.verifyToken] }, async (request) => {
    const user = request.user;
    // Issue a fresh 7-day token with the same claims
    const token = jwt.sign(
      { gymId: user.gymId, email: user.email, role: user.role || 'owner' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
    return { token };
  });
}
