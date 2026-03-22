import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import redis from '../config/redis.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors.js';
import { normalizePhone, generateOTP, isValidEmail } from '../utils/validators.js';
import { sendOTPEmail } from './email.service.js';

export async function addMember(gymId, { name, phone, email, dateOfBirth, gender, planId }) {
  const normalizedPhone = normalizePhone(phone);

  // Trial limit enforcement
  const gym = await db('gyms').where({ id: gymId }).first();
  if (gym) {
    let maxMembers = config.app.trialMaxMembers; // default 50 for trial
    // Check if gym has a subscription with a plan
    const subscription = await db('gym_subscriptions')
      .where({ gym_id: gymId, status: 'active' })
      .first();
    if (subscription) {
      const plan = await db('subscription_plans').where({ id: subscription.plan_id }).first();
      if (plan) maxMembers = plan.max_members;
    }

    const [{ count }] = await db('members').where({ gym_id: gymId }).count();
    if (parseInt(count, 10) >= maxMembers) {
      throw new ValidationError(
        `Member limit reached (${maxMembers}). ${gym.status === 'trial' ? 'Upgrade from trial' : 'Upgrade your plan'} to add more members.`
      );
    }
  }

  const existing = await db('members')
    .where({ gym_id: gymId, phone: normalizedPhone })
    .first();

  if (existing) {
    throw new ValidationError('Member with this phone already exists at this gym');
  }

  const [member] = await db('members')
    .insert({
      gym_id: gymId,
      name,
      phone: normalizedPhone,
      email,
      date_of_birth: dateOfBirth,
      gender,
      current_plan_id: planId || null,
    })
    .returning('*');

  return member;
}

export async function listMembers(gymId, { page = 1, limit = 50, status, search } = {}) {
  const query = db('members').where({ gym_id: gymId });

  if (status) query.andWhere({ status });
  if (search) {
    query.andWhere((qb) => {
      qb.where('name', 'ilike', `%${search}%`)
        .orWhere('phone', 'ilike', `%${search}%`);
    });
  }

  const offset = (page - 1) * limit;
  const [{ count }] = await query.clone().count();
  const members = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

  return { members, total: parseInt(count, 10), page, limit };
}

export async function getMember(gymId, memberId) {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member');
  return member;
}

export async function updateMember(gymId, memberId, updates) {
  const allowed = ['name', 'email', 'date_of_birth', 'gender', 'status', 'photo_url', 'height_cm', 'weight_kg', 'show_location_data'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowed.includes(key))
  );

  const [member] = await db('members')
    .where({ id: memberId, gym_id: gymId })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!member) throw new NotFoundError('Member');
  return member;
}

// --- Member Profile Photo Upload (30-day cooldown) ---

const PHOTO_COOLDOWN_DAYS = 30;

export async function updateMemberPhoto(gymId, memberId, base64Image, mimetype = 'image/jpeg') {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member');

  // Enforce 30-day cooldown
  if (member.photo_updated_at) {
    const lastUpdate = new Date(member.photo_updated_at);
    const now = new Date();
    const daysSince = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    if (daysSince < PHOTO_COOLDOWN_DAYS) {
      const daysLeft = Math.ceil(PHOTO_COOLDOWN_DAYS - daysSince);
      throw new ValidationError(
        `Profile photo can only be updated once every 30 days. Try again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
      );
    }
  }

  // Upload image
  const buffer = Buffer.from(base64Image, 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new ValidationError('Photo too large (max 5 MB)');
  }

  let photoUrl;
  if (config.blob.enabled) {
    const { put } = await import('@vercel/blob');
    const ext = mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `member-photos/${gymId}/${memberId}-${Date.now()}.${ext}`;
    const blob = await put(filename, buffer, {
      access: 'public',
      token: config.blob.token,
      contentType: mimetype,
    });
    photoUrl = blob.url;
  } else {
    // Dev fallback
    photoUrl = `data:${mimetype};base64,${base64Image.slice(0, 100)}...`;
  }

  const now = new Date();
  const [updated] = await db('members')
    .where({ id: memberId, gym_id: gymId })
    .update({ photo_url: photoUrl, photo_updated_at: now, updated_at: now })
    .returning('*');

  return {
    photo_url: updated.photo_url,
    photo_updated_at: updated.photo_updated_at,
    next_update_allowed: new Date(now.getTime() + PHOTO_COOLDOWN_DAYS * 86400000),
  };
}

// --- Member Email OTP Login ---

export async function requestMemberOTP(gymId, email) {
  if (!isValidEmail(email)) throw new ValidationError('Invalid email address');
  const normalizedEmail = email.toLowerCase().trim();

  const member = await db('members')
    .where({ gym_id: gymId, email: normalizedEmail })
    .first();
  if (!member) throw new NotFoundError('No member found with this email at this gym');

  const otp = generateOTP(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db('otp_codes').insert({
    email: normalizedEmail,
    code: otp,
    purpose: 'login',
    gym_id: gymId,
    used: false,
    expires_at: expiresAt,
  });

  const redisKey = `otp:member:${gymId}:${normalizedEmail}`;
  await redis.set(redisKey, otp, { EX: 300 });

  if (config.gmail.enabled) {
    const { sendOTPEmail: sendEmail } = await import('./email.service.js');
    await sendEmail(normalizedEmail, otp);
  } else {
    console.log(`[DEV] Member OTP for ${normalizedEmail}: ${otp}`);
  }

  return { message: 'OTP sent to your email' };
}

export async function verifyMemberOTP(gymId, email, code) {
  if (!isValidEmail(email)) throw new ValidationError('Invalid email address');
  const normalizedEmail = email.toLowerCase().trim();

  let valid = false;
  const redisKey = `otp:member:${gymId}:${normalizedEmail}`;
  const cached = await redis.get(redisKey);

  if (cached && cached === code) {
    valid = true;
    await redis.del(redisKey);
  }

  if (!valid) {
    const otpRecord = await db('otp_codes')
      .where({ email: normalizedEmail, code, purpose: 'login', gym_id: gymId, used: false })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();
    if (!otpRecord) throw new UnauthorizedError('Invalid or expired OTP');
  }

  await db('otp_codes')
    .where({ email: normalizedEmail, purpose: 'login', gym_id: gymId, used: false })
    .update({ used: true });

  const member = await db('members')
    .where({ gym_id: gymId, email: normalizedEmail })
    .first();
  if (!member) throw new NotFoundError('Member');

  const token = jwt.sign(
    { memberId: member.id, gymId, email: normalizedEmail, role: 'member' },
    config.jwt.secret,
    { expiresIn: '7d' }
  );

  return { token, member };
}

export async function getMemberProfile(gymId, memberId) {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member');

  const membership = await db('memberships')
    .where({ member_id: memberId, gym_id: gymId })
    .orderBy('created_at', 'desc')
    .first();

  const gym = await db('gyms').where({ id: gymId }).select('gym_name').first();

  return { member, membership, gymName: gym?.gym_name };
}

export async function getMemberCheckins(gymId, memberId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const checkins = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .orderBy('checked_in_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { checkins };
}
