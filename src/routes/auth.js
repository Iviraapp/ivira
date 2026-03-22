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
