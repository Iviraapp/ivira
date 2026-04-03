import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
      city: { type: 'string', minLength: 2, maxLength: 100 },
      address: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      country_code: { type: 'string', minLength: 2, maxLength: 2, default: 'IN' },
      timezone: { type: 'string' },
      currency: { type: 'string', minLength: 3, maxLength: 3, default: 'INR' },
      payment_gateway: { type: 'string', enum: ['razorpay', 'stripe'], default: 'razorpay' },
      turnstileToken: { type: 'string' },
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
  const loginRateLimit = {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
  }
  const otpRateLimit = {
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } }
  }

  // Request email OTP for gym owner login
  fastify.post('/auth/otp/email/request', { schema: emailOtpRequestSchema, ...otpRateLimit }, async (request) => {
    return authService.requestEmailOTP(request.body.email);
  });

  // Verify email OTP and get JWT token
  fastify.post('/auth/otp/email/verify', { schema: emailOtpVerifySchema, ...otpRateLimit }, async (request) => {
    return authService.verifyEmailOTP(request.body.email, request.body.otp);
  });

  // B2C: Request OTP for member login (no gymId required)
  fastify.post('/auth/b2c/otp/request', { schema: emailOtpRequestSchema, ...otpRateLimit }, async (request) => {
    return authService.requestB2CLoginOTP(request.body.email);
  });

  // B2C: Verify OTP and get JWT token + member data
  fastify.post('/auth/b2c/otp/verify', { schema: emailOtpVerifySchema, ...otpRateLimit }, async (request) => {
    return authService.verifyB2CLoginOTP(request.body.email, request.body.otp);
  });

  // Register a new gym (public)
  fastify.post('/auth/register', { schema: registerSchema }, async (request, reply) => {
    // Verify Turnstile CAPTCHA
    const { verifyTurnstile } = await import('../utils/turnstile.js')
    const turnstileOk = await verifyTurnstile(request.body.turnstileToken, request.ip)
    if (!turnstileOk) return reply.code(403).send({ error: 'CAPTCHA_FAILED', message: 'Please complete the CAPTCHA verification.' })

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
  fastify.post('/auth/find-gyms', { ...otpRateLimit }, async (request, reply) => {
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

    // Determine if email or phone and send OTP
    const isEmail = contact.includes('@')
    if (isEmail) {
      const { sendOTPEmail } = await import('../services/email.service.js')
      await sendOTPEmail(contact, otp).catch(err => request.log.warn({ err }, 'Failed to send recovery OTP email'))
    }
    request.log.info({ contact, method: isEmail ? 'email' : 'sms' }, 'Subdomain recovery OTP generated')

    return reply.send({ success: true, message: 'OTP sent to your registered contact', method: isEmail ? 'email' : 'sms' })
  })

  // Verify OTP and return gyms — subdomain recovery
  fastify.post('/auth/verify-subdomain-otp', { ...otpRateLimit }, async (request, reply) => {
    const { contact, otp } = request.body || {}
    if (!contact || !otp) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Contact and OTP required' })

    // Verify OTP (timing-safe comparison)
    const storedOtp = await redis.get(`subdomain_otp:${contact}`)
    if (!storedOtp || !otp || storedOtp.length !== otp.length ||
        !crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(otp))) {
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
    ...otpRateLimit,
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

  // B2C: Get member profile (for gym-less users)
  fastify.get('/auth/b2c/profile', {
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const memberId = request.user.memberId;
    if (!memberId) return reply.code(401).send({ error: 'Not a member token' });

    const member = await db('members').where('id', memberId).first();
    if (!member) return reply.code(404).send({ error: 'Member not found' });

    const profile = await db('member_profiles').where({ member_id: memberId }).first();

    return {
      member: {
        ...member,
        fitness_goal: profile?.primary_goal || null,
        weight: profile?.current_weight_grams ? profile.current_weight_grams / 1000 : null,
        height: profile?.height_cm || null,
        is_onboarded: profile?.is_onboarded || false,
      },
    };
  });

  // B2C: Update member profile (onboarding)
  fastify.patch('/auth/b2c/profile', {
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const memberId = request.user.memberId;
    if (!memberId) return reply.code(401).send({ error: 'Not a member token' });

    const { name, fitness_goal, weight, height, date_of_birth, gender, weight_unit } = request.body;

    // Update members table (name, date_of_birth, gender)
    const memberUpdates = { updated_at: new Date() };
    if (name) memberUpdates.name = name;
    if (date_of_birth) memberUpdates.date_of_birth = date_of_birth;
    if (gender) memberUpdates.gender = gender;
    await db('members').where('id', memberId).update(memberUpdates);

    // Update member_profiles table (goal, weight, height)
    const profileUpdates = { updated_at: new Date(), is_onboarded: true, onboarded_at: new Date() };
    if (fitness_goal) profileUpdates.primary_goal = fitness_goal;
    if (weight) {
      // Convert lbs to grams if needed, otherwise kg to grams
      const weightKg = weight_unit === 'lbs' ? weight * 0.453592 : weight;
      profileUpdates.current_weight_grams = Math.round(weightKg * 1000);
    }
    if (height) profileUpdates.height_cm = height;

    const existing = await db('member_profiles').where({ member_id: memberId }).first();
    if (existing) {
      await db('member_profiles').where({ member_id: memberId }).update(profileUpdates);
    } else {
      await db('member_profiles').insert({ member_id: memberId, ...profileUpdates });
    }

    // Return merged profile
    const member = await db('members').where('id', memberId).first();
    const profile = await db('member_profiles').where({ member_id: memberId }).first();
    return {
      success: true,
      member: {
        ...member,
        fitness_goal: profile?.primary_goal || null,
        weight: profile?.current_weight_grams ? profile.current_weight_grams / 1000 : null,
        height: profile?.height_cm || null,
        is_onboarded: true,
      },
    };
  });

  // Google OAuth login/signup
  fastify.post('/auth/google', {
    schema: {
      body: {
        type: 'object',
        required: ['idToken'],
        properties: {
          idToken: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'member'], default: 'member' },
          gymId: { type: 'string' }, // optional, for member linking
        },
      },
    },
  }, async (request, reply) => {
    const { idToken, role = 'member', gymId } = request.body

    // Verify Google ID token
    let googleUser
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
      if (!res.ok) return reply.code(401).send({ error: 'Invalid Google token' })
      googleUser = await res.json()
      if (!googleUser.email) return reply.code(401).send({ error: 'Google account has no email' })
    } catch {
      return reply.code(401).send({ error: 'Google token verification failed' })
    }

    const email = googleUser.email.toLowerCase()
    const name = googleUser.name || email.split('@')[0]
    const picture = googleUser.picture || null

    if (role === 'owner') {
      // Look up existing gym owner by email
      let gym = await db('gyms').where('owner_email', email).first()

      if (!gym) {
        // Create new gym + owner account
        const [newGym] = await db('gyms').insert({
          gym_name: `${name}'s Gym`,
          owner_name: name,
          owner_email: email,
          owner_phone: '',
          city: '',
          country_code: 'IN',
          currency: 'INR',
          payment_gateway: 'razorpay',
          google_id: googleUser.sub,
          photo_url: picture,
          trial_ends_at: new Date(Date.now() + 14 * 86400000),
        }).returning('*')
        gym = newGym
      }

      const token = jwt.sign(
        { gymId: gym.id, email, role: 'owner', name },
        config.jwt.secret,
        { expiresIn: '7d' }
      )

      return { token, gym, isNewGym: !gym.owner_phone }
    }

    // Member login/signup
    let member = await db('members').where('email', email).first()

    if (!member && gymId) {
      // Create new member linked to gym
      const [newMember] = await db('members').insert({
        gym_id: gymId,
        name,
        email,
        phone: '',
        google_id: googleUser.sub,
        photo_url: picture,
        status: 'active',
      }).returning('*')
      member = newMember
    } else if (!member) {
      // No gym specified — create unlinked member
      return reply.code(404).send({
        error: 'NO_GYM',
        message: 'No account found. Please join a gym first or provide a gym code.',
        email,
        name,
      })
    }

    const token = jwt.sign(
      { memberId: member.id, gymId: member.gym_id, email, role: 'member' },
      config.jwt.secret,
      { expiresIn: '7d' }
    )

    return { token, memberId: member.id, gymId: member.gym_id, member }
  })

  // Admin: one-time test gym setup (protected by secret)
  fastify.post('/admin/setup-test-gym', async (request, reply) => {
    // Disable entirely in production
    if (process.env.NODE_ENV === 'production') {
      return reply.code(404).send({ error: 'Not found' });
    }

    // Rate limit: max 3 requests per hour via Redis
    const rateLimitKey = 'admin:setup-test-gym:rate';
    const attempts = parseInt(await redis.get(rateLimitKey) || '0', 10);
    if (attempts >= 3) {
      return reply.code(429).send({ error: 'Too many requests. Try again later.' });
    }
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 3600); // 1 hour TTL

    // Timing-safe secret comparison
    const { secret } = request.body || {};
    const secretStr = String(secret || '');
    const expectedStr = String(config.jwt.secret || '');
    const secretBuf = Buffer.from(secretStr);
    const expectedBuf = Buffer.from(expectedStr);
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

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

  // Logout — blacklist the current token so it cannot be reused
  fastify.post('/logout', { preHandler: [fastify.verifyToken] }, async (request, reply) => {
    const token = request.headers.authorization?.slice(7);
    if (token && fastify.blacklistToken) {
      await fastify.blacklistToken(token);
    }
    return { message: 'Logged out successfully' };
  });

  // Refresh JWT token (extend expiry without re-login, supports expired tokens within 30-day grace window)
  fastify.post('/auth/refresh', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const result = await authService.refreshToken(token);
    return result;
  });

  // ── Staff / Trainer OTP Login ─────────────────────────────────────────────

  fastify.post('/staff/login/otp/email', { schema: emailOtpRequestSchema, ...otpRateLimit }, async (request) => {
    return authService.requestStaffLoginOTP(request.body.email);
  });

  fastify.post('/staff/login/verify/email', { schema: emailOtpVerifySchema, ...otpRateLimit }, async (request) => {
    return authService.verifyStaffLoginOTP(request.body.email, request.body.otp);
  });

  // ── Password-based Login ──────────────────────────────────────────────

  const passwordLoginRateLimit = {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
  }

  // Check if gym owner has a password set
  fastify.post('/auth/check-password', {
    ...otpRateLimit,
    schema: { body: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } },
  }, async (request) => {
    const result = await authService.hasPassword(request.body.email);
    return { hasPassword: result };
  });

  // Login with email + password
  fastify.post('/auth/login/password', {
    ...passwordLoginRateLimit,
    schema: { body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 } } } },
  }, async (request, reply) => {
    try {
      const result = await authService.loginWithPassword(request.body.email, request.body.password);
      return result;
    } catch (err) {
      if (err.message === 'PASSWORD_NOT_SET') {
        return reply.code(400).send({ error: 'PASSWORD_NOT_SET', message: 'Password not set for this account. Please use OTP login first and set a password.' });
      }
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
  });

  // Set/update password (requires authentication)
  fastify.post('/auth/set-password', {
    preHandler: [fastify.verifyToken],
    schema: { body: { type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 8 } } } },
  }, async (request, reply) => {
    const gymId = request.user.gymId;
    if (!gymId) return reply.code(403).send({ error: 'Only gym owners can set a password' });
    const result = await authService.setGymPassword(gymId, request.body.password);
    return result;
  });

  // ── Member phone OTP (gym-agnostic) ────────────────────────────────────
  fastify.post('/auth/member/otp/request', {
    ...otpRateLimit,
    schema: { body: { type: 'object', required: ['phone'], properties: { phone: { type: 'string', minLength: 10, maxLength: 15 } } } },
  }, async (request, reply) => {
    const rawPhone = request.body.phone.trim().replace(/\D/g, '')
    const member = await db('members')
      .where(function () { this.where('phone', rawPhone).orWhere('phone', `+91${rawPhone}`).orWhere('phone', rawPhone.replace(/^91/, '')) })
      .select('id', 'gym_id', 'name', 'email', 'phone').first()
    if (!member) return reply.code(404).send({ error: 'MEMBER_NOT_FOUND', message: 'No account found for this phone number.' })
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    await redis.set(`member_otp:${rawPhone}`, JSON.stringify({ otp, memberId: member.id, gymId: member.gym_id }), { EX: 300 })
    if (process.env.NODE_ENV !== 'production') request.log.info({ phone: rawPhone, otp }, 'Member OTP (dev)')
    const gym = member.gym_id ? await db('gyms').where('id', member.gym_id).select('gym_name', 'city').first() : null
    return { success: true, message: 'OTP sent', gymHint: gym ? { gymName: gym.gym_name, city: gym.city } : null }
  })

  fastify.post('/auth/member/otp/verify', {
    ...otpRateLimit,
    schema: { body: { type: 'object', required: ['phone', 'otp'], properties: { phone: { type: 'string' }, otp: { type: 'string', minLength: 4, maxLength: 6 } } } },
  }, async (request, reply) => {
    const rawPhone = request.body.phone.trim().replace(/\D/g, '')
    const stored = await redis.get(`member_otp:${rawPhone}`)
    if (!stored) return reply.code(401).send({ error: 'OTP_EXPIRED', message: 'OTP expired. Request a new one.' })
    const { otp, memberId, gymId } = JSON.parse(stored)
    if (request.body.otp !== otp) return reply.code(401).send({ error: 'INVALID_OTP', message: 'Incorrect OTP.' })
    await redis.del(`member_otp:${rawPhone}`)
    const member = await db('members').where('id', memberId).first()
    if (!member) return reply.code(404).send({ error: 'Member not found' })
    const token = jwt.sign({ memberId, gymId, email: member.email, role: 'member' }, config.jwt.secret, { expiresIn: '7d' })
    return { token, memberId, gymId, member }
  })

  fastify.get('/auth/member/gym-by-phone', {
    schema: { querystring: { type: 'object', required: ['phone'], properties: { phone: { type: 'string' } } } },
  }, async (request, reply) => {
    const rawPhone = request.query.phone.trim().replace(/\D/g, '')
    const member = await db('members').where(function () { this.where('phone', rawPhone).orWhere('phone', `+91${rawPhone}`) }).select('gym_id').first()
    if (!member?.gym_id) return reply.code(404).send({ error: 'Not found' })
    const gym = await db('gyms').where('id', member.gym_id).select('id', 'gym_name', 'city', 'logo_url').first()
    return { gym_id: gym.id, gym_name: gym.gym_name, city: gym.city, logo_url: gym.logo_url }
  })
}
