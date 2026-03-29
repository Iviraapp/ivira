import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import config from '../config/index.js';
import redis from '../config/redis.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors.js';
import { normalizePhone, generateOTP, isValidEmail } from '../utils/validators.js';
import { sendOTPEmail } from './email.service.js';
import { geocodeAddress } from './geocoding.service.js';

export async function registerGym({ ownerName, ownerPhone, ownerEmail, gymName, city, address, latitude, longitude }) {
  const phone = normalizePhone(ownerPhone);
  const email = ownerEmail.toLowerCase().trim();

  const existing = await db('gyms').where({ owner_email: email }).first();
  if (existing) {
    throw new ValidationError('A gym is already registered with this email');
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + config.app.trialDays);

  // Auto-geocode if coordinates not provided but address/city is known
  let resolvedLat = latitude;
  let resolvedLng = longitude;
  if ((resolvedLat == null || resolvedLng == null) && (address || city)) {
    try {
      const geocoded = await geocodeAddress(address || `${gymName}, ${city}`);
      if (geocoded) {
        resolvedLat = resolvedLat ?? geocoded.lat;
        resolvedLng = resolvedLng ?? geocoded.lng;
      }
    } catch {
      // Geocoding is best-effort — never block registration
    }
  }

  const [gym] = await db('gyms')
    .insert({
      owner_firebase_uid: email, // use email as unique identifier
      owner_name: ownerName,
      owner_phone: phone,
      owner_email: email,
      gym_name: gymName,
      city,
      address,
      latitude: resolvedLat ?? null,
      longitude: resolvedLng ?? null,
      status: 'trial',
      trial_ends_at: trialEndsAt,
    })
    .returning('*');

  return gym;
}

export async function getGymByFirebaseUid(firebaseUid) {
  const gym = await db('gyms').where({ owner_firebase_uid: firebaseUid }).first();
  if (!gym) throw new NotFoundError('Gym');
  return gym;
}

export async function getGymById(gymId) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');
  return gym;
}

// --- Email OTP Login ---

export async function requestEmailOTP(email) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email address');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check gym owner exists with this email
  const gym = await db('gyms').where({ owner_email: normalizedEmail }).first();
  if (!gym) {
    throw new NotFoundError('No gym account found with this email');
  }

  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store OTP in PostgreSQL
  await db('otp_codes').insert({
    email: normalizedEmail,
    code: otp,
    purpose: 'login',
    used: false,
    expires_at: expiresAt,
  });

  // Cache in Redis for fast lookup (5 min TTL)
  const redisKey = `otp:login:${normalizedEmail}`;
  await redis.set(redisKey, otp, { EX: 300 });

  // Send OTP via email
  if (config.email.enabled) {
    await sendOTPEmail(normalizedEmail, otp);
  } else {
    // Dev mode: log OTP to console
    console.log(`[DEV] Email OTP for ${normalizedEmail}: ${otp}`);
  }

  return { message: 'OTP sent to your email' };
}

export async function verifyEmailOTP(email, code) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email address');
  }

  const normalizedEmail = email.toLowerCase().trim();
  let valid = false;

  // Try Redis first
  const redisKey = `otp:login:${normalizedEmail}`;
  const cached = await redis.get(redisKey);
  if (cached && cached === code) {
    valid = true;
    await redis.del(redisKey);
  }

  // Fallback to PostgreSQL
  if (!valid) {
    const otpRecord = await db('otp_codes')
      .where({
        email: normalizedEmail,
        code,
        purpose: 'login',
        used: false,
      })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (!otpRecord) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }
    valid = true;
  }

  // Mark all OTPs for this email as used
  await db('otp_codes')
    .where({ email: normalizedEmail, purpose: 'login', used: false })
    .update({ used: true });

  // Get gym
  const gym = await db('gyms').where({ owner_email: normalizedEmail }).first();
  if (!gym) {
    throw new NotFoundError('Gym');
  }

  // Generate JWT
  const token = jwt.sign(
    { gymId: gym.id, email: normalizedEmail, role: 'owner' },
    config.jwt.secret,
    { expiresIn: '7d' }
  );

  return { token, gym };
}

// --- B2C Member OTP Login (gym-independent) ---

export async function requestB2CLoginOTP(email) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email address');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store OTP in PostgreSQL
  await db('otp_codes').insert({
    email: normalizedEmail,
    code: otp,
    purpose: 'login',
    used: false,
    expires_at: expiresAt,
  });

  // Cache in Redis for fast lookup (5 min TTL)
  const redisKey = `otp:b2c:${normalizedEmail}`;
  await redis.set(redisKey, otp, { EX: 300 });

  // Send OTP via email
  if (config.email.enabled) {
    await sendOTPEmail(normalizedEmail, otp);
  } else {
    console.log(`[DEV] B2C OTP for ${normalizedEmail}: ${otp}`);
  }

  return { message: 'OTP sent to your email' };
}

export async function verifyB2CLoginOTP(email, code) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email address');
  }

  const normalizedEmail = email.toLowerCase().trim();
  let valid = false;

  // Try Redis first
  const redisKey = `otp:b2c:${normalizedEmail}`;
  const cached = await redis.get(redisKey);
  if (cached && cached === code) {
    valid = true;
    await redis.del(redisKey);
  }

  // Fallback to PostgreSQL
  if (!valid) {
    const otpRecord = await db('otp_codes')
      .where({
        email: normalizedEmail,
        code,
        purpose: 'login',
        used: false,
      })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (!otpRecord) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }
  }

  // Check if this email is already a member at any gym
  const existingMember = await db('members')
    .where({ email: normalizedEmail })
    .first();

  let memberId = existingMember?.id;
  let gymId = existingMember?.gym_id || null;

  // If no member record exists, create a new member
  if (!existingMember) {
    // Check if there's pending registration data (from /auth/b2c/register)
    let regData = null;
    try {
      const raw = await redis.get(`b2c_register:${normalizedEmail}`);
      if (raw) {
        regData = JSON.parse(raw);
        await redis.del(`b2c_register:${normalizedEmail}`);
      }
    } catch {}

    const [newMember] = await db('members')
      .insert({
        email: normalizedEmail,
        name: regData?.name || normalizedEmail.split('@')[0],
        phone: regData?.phone || '',
        gym_id: regData?.gymId || null,
        status: 'active',
      })
      .returning('*');
    memberId = newMember.id;
    gymId = regData?.gymId || null;
  }

  // Mark OTPs as used AFTER member creation succeeds
  await db('otp_codes')
    .where({ email: normalizedEmail, purpose: 'login', used: false })
    .update({ used: true });

  // Generate JWT
  const token = jwt.sign(
    { memberId, gymId, email: normalizedEmail, role: 'member' },
    config.jwt.secret,
    { expiresIn: '7d' }
  );

  const member = existingMember || await db('members').where({ id: memberId }).first();

  return { token, member, gymId };
}

export async function refreshToken(token) {
  try {
    // Try normal verify first
    let decoded = jwt.verify(token, config.jwt.secret);
    // Token still valid — issue fresh one
    const newToken = jwt.sign(
      { ...decoded, iat: undefined, exp: undefined },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
    return { token: newToken };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Allow refresh within 48 hours of expiry
      const decoded = jwt.decode(token);
      if (!decoded) throw new UnauthorizedError('Invalid token');
      const expiredAt = new Date(decoded.exp * 1000);
      const hoursSinceExpiry = (Date.now() - expiredAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceExpiry > 48) throw new UnauthorizedError('Token too old to refresh');

      const newToken = jwt.sign(
        { gymId: decoded.gymId, memberId: decoded.memberId, email: decoded.email, role: decoded.role },
        config.jwt.secret,
        { expiresIn: '7d' }
      );
      return { token: newToken };
    }
    throw new UnauthorizedError('Invalid token');
  }
}

export async function updateGym(gymId, updates) {
  const allowed = ['gym_name', 'address', 'latitude', 'longitude', 'logo_url', 'city', 'preferred_language', 'onboarding_step'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowed.includes(key))
  );

  const [gym] = await db('gyms')
    .where({ id: gymId })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!gym) throw new NotFoundError('Gym');
  return gym;
}

// ── Staff / Trainer OTP Login ──────────────────────────────────────────────

export async function requestStaffLoginOTP(email) {
  if (!isValidEmail(email)) throw new ValidationError('Invalid email address');
  const normalizedEmail = email.toLowerCase().trim();

  // Staff must exist and have an email
  const staff = await db('staff').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();
  if (!staff) throw new NotFoundError('Staff member not found with this email');
  if (staff.status === 'terminated') throw new UnauthorizedError('Account is no longer active');

  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db('otp_codes').insert({
    email: normalizedEmail,
    code: otp,
    purpose: 'staff_login',
    used: false,
    expires_at: expiresAt,
  });

  const redisKey = `otp:staff:${normalizedEmail}`;
  await redis.set(redisKey, otp, { EX: 300 });

  if (config.email.enabled) {
    await sendOTPEmail(normalizedEmail, otp, { name: staff.name });
  } else {
    console.log(`[DEV] Staff OTP for ${normalizedEmail}: ${otp}`);
  }

  return { message: 'OTP sent to your email', name: staff.name };
}

export async function verifyStaffLoginOTP(email, code) {
  if (!isValidEmail(email)) throw new ValidationError('Invalid email address');
  const normalizedEmail = email.toLowerCase().trim();
  let valid = false;

  // Try Redis first
  const redisKey = `otp:staff:${normalizedEmail}`;
  const cached = await redis.get(redisKey);
  if (cached && cached === code) {
    valid = true;
    await redis.del(redisKey);
  }

  // Fallback to DB
  if (!valid) {
    const otpRecord = await db('otp_codes')
      .where({ email: normalizedEmail, purpose: 'staff_login', used: false })
      .where('expires_at', '>', new Date())
      .where('code', code)
      .first();
    if (otpRecord) {
      valid = true;
      await db('otp_codes')
        .where({ email: normalizedEmail, purpose: 'staff_login', used: false })
        .update({ used: true });
    }
  }

  if (!valid) throw new UnauthorizedError('Invalid or expired OTP');

  const staff = await db('staff').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();
  if (!staff) throw new NotFoundError('Staff member');
  if (staff.status === 'terminated') throw new UnauthorizedError('Account is no longer active');

  const token = jwt.sign(
    {
      staffId: staff.id,
      gymId: staff.gym_id,
      name: staff.name,
      email: normalizedEmail,
      role: staff.role, // 'trainer', 'manager', 'front_desk', etc.
    },
    config.jwt.secret,
    { expiresIn: '30d' }
  );

  return {
    token,
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      gymId: staff.gym_id,
    },
  };
}
