import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import redis from '../config/redis.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { distanceMeters, generateOTP, normalizePhone } from '../utils/validators.js';
import { recordCheckinEvent } from './class.service.js';

// Enrich check-in response with member profile + membership for bouncer screen
async function enrichCheckinResponse(checkin, member, gymId) {
  const membership = await db('memberships')
    .where({ member_id: member.id, gym_id: gymId })
    .orderBy('end_date', 'desc')
    .first();

  return {
    ...checkin,
    member_name: member.name,
    member_phone: member.phone,
    member_email: member.email,
    member_photo: member.photo_url || null,
    member_status: member.status,
    member_joined: member.created_at,
    membership: membership ? {
      plan_name: membership.plan_name,
      status: membership.status,
      start_date: membership.start_date,
      end_date: membership.end_date,
      amount_paid: membership.amount_paid,
    } : null,
  };
}

// Generate a JWT-based QR token for a member (expires in 90 seconds)
export async function generateQRToken(gymId, phone) {
  const normalizedPhone = normalizePhone(phone);
  const member = await db('members')
    .where({ gym_id: gymId, phone: normalizedPhone })
    .first();

  if (!member) throw new NotFoundError('Member not found at this gym');
  if (member.status !== 'active') throw new ValidationError('Member is not active');

  const token = jwt.sign(
    { memberId: member.id, gymId, type: 'checkin-qr' },
    config.jwt.secret,
    { expiresIn: '90s' }
  );

  return { token, member: { id: member.id, name: member.name }, expiresIn: 90 };
}

// Validate QR token and create check-in with anti-fraud checks
export async function qrCheckin(gymId, qrToken, { latitude, longitude, deviceId } = {}) {
  // Validate JWT token
  let decoded;
  try {
    decoded = jwt.verify(qrToken, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ValidationError('QR code has expired. Please generate a new one.');
    }
    throw new ValidationError('Invalid QR code');
  }

  if (decoded.type !== 'checkin-qr' || decoded.gymId !== gymId) {
    throw new ValidationError('Invalid QR code for this gym');
  }

  const memberId = decoded.memberId;

  const [gym, member] = await Promise.all([
    db('gyms').where({ id: gymId }).first(),
    db('members').where({ id: memberId, gym_id: gymId }).first(),
  ]);

  if (!gym) throw new NotFoundError('Gym');
  if (!member) throw new NotFoundError('Member');
  if (member.status !== 'active') throw new ValidationError('Member is not active');

  // Anti-fraud: duplicate detection (same member within 10 minutes)
  const recentCheckin = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .where('checked_in_at', '>', new Date(Date.now() - 10 * 60 * 1000))
    .first();

  if (recentCheckin) {
    throw new ValidationError('Already checked in within the last 10 minutes');
  }

  // GPS validation
  let gpsValid = null;
  let distance = null;

  if (latitude && longitude && gym.latitude && gym.longitude) {
    distance = distanceMeters(
      parseFloat(gym.latitude), parseFloat(gym.longitude),
      latitude, longitude
    );
    gpsValid = distance <= config.app.gpsRadiusMeters;
  }

  const [checkin] = await db('checkins')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      method: 'qr',
      latitude,
      longitude,
      distance_meters: distance,
      gps_valid: gpsValid,
    })
    .returning('*');

  // Fire-and-forget: occupancy + real-time event
  recordCheckinEvent(gymId, memberId, member.name, 'qr').catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  // Fire-and-forget WhatsApp notification
  import('../services/whatsapp.service.js').then(({ sendCheckInAlert }) => {
    sendCheckInAlert(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message))
  }).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message))

  // Fire-and-forget affiliate promo
  sendAffiliatePromo(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message))

  // Fire-and-forget: auto-fulfill pod commitments
  fulfillPodCommitmentsFromGymCheckin(memberId).catch(err => console.warn('[CheckinService] pod bridge failed:', err?.message));

  return enrichCheckinResponse(checkin, member, gymId);
}

export async function requestOTP(gymId, phone) {
  const normalizedPhone = normalizePhone(phone);

  const member = await db('members')
    .where({ gym_id: gymId, phone: normalizedPhone })
    .first();

  if (!member) throw new NotFoundError('Member');

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db('otp_codes').insert({
    phone: normalizedPhone,
    code: otp,
    purpose: 'checkin',
    gym_id: gymId,
    expires_at: expiresAt,
  });

  await redis.set(`otp:checkin:${gymId}:${normalizedPhone}`, otp, { EX: 300 });

  // Dev mode: log OTP
  console.log(`[DEV] Check-in OTP for ${normalizedPhone}: ${otp}`);

  return { message: 'OTP sent', phone: normalizedPhone, memberId: member.id };
}

export async function verifyOTPCheckin(gymId, phone, code) {
  const normalizedPhone = normalizePhone(phone);

  const cachedOtp = await redis.get(`otp:checkin:${gymId}:${normalizedPhone}`);

  if (cachedOtp !== code) {
    const otpRecord = await db('otp_codes')
      .where({
        phone: normalizedPhone,
        code,
        purpose: 'checkin',
        gym_id: gymId,
        used: false,
      })
      .where('expires_at', '>', new Date())
      .first();

    if (!otpRecord) throw new ValidationError('Invalid or expired OTP');
  }

  await db('otp_codes')
    .where({ phone: normalizedPhone, code, gym_id: gymId })
    .update({ used: true });
  await redis.del(`otp:checkin:${gymId}:${normalizedPhone}`);

  const member = await db('members')
    .where({ gym_id: gymId, phone: normalizedPhone })
    .first();

  const [checkin] = await db('checkins')
    .insert({
      member_id: member.id,
      gym_id: gymId,
      method: 'otp',
    })
    .returning('*');

  // Fire-and-forget: occupancy + real-time event
  recordCheckinEvent(gymId, member.id, member.name, 'otp').catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  // Fire-and-forget: auto-fulfill pod commitments
  fulfillPodCommitmentsFromGymCheckin(member.id).catch(err => console.warn('[CheckinService] pod bridge failed:', err?.message));

  return checkin;
}

export async function getCheckins(gymId, { page = 1, limit = 50, date, memberId } = {}) {
  const query = db('checkins')
    .where({ 'checkins.gym_id': gymId })
    .join('members', 'checkins.member_id', 'members.id')
    .select('checkins.*', 'members.name as member_name', 'members.phone as member_phone', 'members.photo_url as member_photo');

  if (memberId) query.andWhere({ 'checkins.member_id': memberId });
  if (date) {
    query.andWhereRaw('DATE(checkins.checked_in_at) = ?', [date]);
  }

  const countQuery = db('checkins').where({ gym_id: gymId });
  if (memberId) countQuery.andWhere({ member_id: memberId });
  if (date) countQuery.andWhereRaw('DATE(checked_in_at) = ?', [date]);
  const [{ count }] = await countQuery.count();

  const offset = (page - 1) * limit;
  const checkins = await query.orderBy('checkins.checked_in_at', 'desc').limit(limit).offset(offset);

  return { checkins, total: parseInt(count, 10), page, limit };
}

// Manual check-in by staff (no QR/OTP needed)
export async function manualCheckin(gymId, memberId, { staffName } = {}) {
  const [gym, member] = await Promise.all([
    db('gyms').where({ id: gymId }).first(),
    db('members').where({ id: memberId, gym_id: gymId }).first(),
  ]);

  if (!gym) throw new NotFoundError('Gym');
  if (!member) throw new NotFoundError('Member not found at this gym');
  if (member.status !== 'active') throw new ValidationError('Member is not active');

  // Duplicate detection (same member within 10 minutes)
  const recentCheckin = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .where('checked_in_at', '>', new Date(Date.now() - 10 * 60 * 1000))
    .first();

  if (recentCheckin) {
    throw new ValidationError('Already checked in within the last 10 minutes');
  }

  const [checkin] = await db('checkins')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      method: 'manual',
      notes: staffName ? `Verified by ${staffName}` : 'Staff manual verification',
    })
    .returning('*');

  // Fire-and-forget: occupancy + real-time event
  recordCheckinEvent(gymId, memberId, member.name, 'manual').catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  // Fire-and-forget WhatsApp notification
  import('../services/whatsapp.service.js').then(({ sendCheckInAlert }) => {
    sendCheckInAlert(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
  }).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  // Fire-and-forget affiliate promo
  sendAffiliatePromo(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message))

  // Fire-and-forget: auto-fulfill pod commitments
  fulfillPodCommitmentsFromGymCheckin(memberId).catch(err => console.warn('[CheckinService] pod bridge failed:', err?.message));

  return enrichCheckinResponse(checkin, member, gymId);
}

// NFC tap check-in — optimized for sub-500ms response
//
// Flow: Member opens app → taps phone on gym's NFC kiosk →
//       phone reads kiosk tag UID → app sends tag_uid + member JWT →
//       backend verifies tag belongs to gym (physical presence proof) → checks in member
//
// memberId comes from the verified JWT (trusted identity)
// tagUid comes from the NFC kiosk at the gym entrance (physical presence proof)
export async function nfcCheckin(gymId, memberId, tagUid) {
  const startMs = Date.now();

  // 1. Verify the NFC tag belongs to this gym (proves member is physically at the gym)
  const nfcTag = await db('nfc_tags')
    .where({ gym_id: gymId, tag_uid: tagUid, is_active: true })
    .first();

  if (!nfcTag) {
    throw new NotFoundError('NFC tag not recognized. This tag is not registered to this gym.');
  }

  // 2. Look up the member (identity from JWT, verified by route pre-handler)
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member not found.');
  if (member.status !== 'active') throw new ValidationError('Member is not active');

  // 3. Duplicate detection via Redis (faster than DB query)
  const dedupeKey = `nfc:dedup:${gymId}:${memberId}`;
  try {
    const isDuplicate = await redis.get(dedupeKey);
    if (isDuplicate) {
      throw new ValidationError('Already checked in within the last 10 minutes');
    }
    await redis.set(dedupeKey, '1', 'EX', 600);
  } catch (err) {
    if (err.message !== 'Already checked in within the last 10 minutes') {
      // Redis unavailable — fall back to DB check
      const recentCheckin = await db('checkins')
        .where({ member_id: memberId, gym_id: gymId })
        .where('checked_in_at', '>', new Date(Date.now() - 10 * 60 * 1000))
        .first();
      if (recentCheckin) {
        throw new ValidationError('Already checked in within the last 10 minutes');
      }
    } else {
      throw err;
    }
  }

  // 4. Insert check-in — critical path ends here
  const [checkin] = await db('checkins')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      method: 'nfc',
    })
    .returning('*');

  const responseTimeMs = Date.now() - startMs;
  console.log(`[nfc-checkin] ${member.name} checked in via NFC in ${responseTimeMs}ms`);

  // 5. Fire-and-forget: SSE event, WhatsApp alert, affiliate promo
  recordCheckinEvent(gymId, memberId, member.name, 'nfc').catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  db('gyms').where({ id: gymId }).first().then((gym) => {
    if (!gym) return;
    import('../services/whatsapp.service.js').then(({ sendCheckInAlert }) => {
      sendCheckInAlert(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
    }).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
    sendAffiliatePromo(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
  }).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  // Fire-and-forget: auto-fulfill pod commitments
  fulfillPodCommitmentsFromGymCheckin(memberId).catch(err => console.warn('[CheckinService] pod bridge failed:', err?.message));

  const enriched = await enrichCheckinResponse(checkin, member, gymId);
  return { ...enriched, response_time_ms: responseTimeMs };
}

// GPS proximity check-in — member proves physical presence via device location
export async function gpsCheckin(gymId, memberId, { latitude, longitude }) {
  const [gym, member] = await Promise.all([
    db('gyms').where({ id: gymId }).first(),
    db('members').where({ id: memberId, gym_id: gymId }).first(),
  ]);

  if (!gym) throw new NotFoundError('Gym');
  if (!member) throw new NotFoundError('Member not found at this gym');
  if (member.status !== 'active') throw new ValidationError('Member is not active');

  if (!gym.latitude || !gym.longitude) {
    throw new ValidationError('Gym location not configured. Please contact the gym owner.');
  }

  // Calculate distance from gym
  const distance = distanceMeters(
    parseFloat(gym.latitude), parseFloat(gym.longitude),
    latitude, longitude
  );

  const radiusM = config.app.gpsRadiusMeters || 150;
  if (distance > radiusM) {
    throw new ValidationError(
      `You're ${Math.round(distance)}m from the gym. You need to be within ${radiusM}m to check in.`
    );
  }

  // Duplicate detection (10 min)
  const recentCheckin = await db('checkins')
    .where({ member_id: memberId, gym_id: gymId })
    .where('checked_in_at', '>', new Date(Date.now() - 10 * 60 * 1000))
    .first();

  if (recentCheckin) {
    throw new ValidationError('Already checked in within the last 10 minutes');
  }

  const [checkin] = await db('checkins')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      method: 'gps',
      latitude,
      longitude,
      distance_meters: Math.round(distance * 100) / 100,
      gps_valid: true,
    })
    .returning('*');

  // Fire-and-forget
  recordCheckinEvent(gymId, memberId, member.name, 'gps').catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
  import('../services/whatsapp.service.js').then(({ sendCheckInAlert }) => {
    sendCheckInAlert(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
  }).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));
  sendAffiliatePromo(member, gym).catch(err => console.warn('[CheckinService] notification/sync failed:', err?.message));

  // Fire-and-forget: auto-fulfill pod commitments
  fulfillPodCommitmentsFromGymCheckin(memberId).catch(err => console.warn('[CheckinService] pod bridge failed:', err?.message));

  const enriched = await enrichCheckinResponse(checkin, member, gymId);
  return { ...enriched, distance_meters: Math.round(distance) };
}

// Check-in affiliate promotion hook
async function sendAffiliatePromo(member, gym) {
  try {
    // Check if gym has any active 'Energy Drink' or supplement affiliate
    const activeBrands = await db('gym_brand_activations')
      .where({ gym_id: gym.id, is_active: true })
      .join('affiliate_brands', 'gym_brand_activations.brand_id', 'affiliate_brands.id')
      .whereIn('affiliate_brands.category', ['Supplement', 'Health Foods', 'Food & Beverage'])
      .select('affiliate_brands.*')

    if (activeBrands.length === 0) return

    // Pick a random active brand
    const brand = activeBrands[Math.floor(Math.random() * activeBrands.length)]

    // Generate a tracking link for this member
    const { generateLink } = await import('./affiliate.service.js')
    const { trackingUrl } = await generateLink(gym.id, {
      brandId: brand.id,
      memberId: member.id,
    })

    // Send WhatsApp promo
    const { sendTemplateMessage } = await import('./whatsapp.service.js')
    await sendTemplateMessage(member.phone, 'checkin_promo', [
      { name: 'member_name', value: member.name },
      { name: 'brand_name', value: brand.name },
      { name: 'discount', value: `${brand.commission_rate_percent || 10}%` },
      { name: 'link', value: trackingUrl },
    ])
  } catch (err) {
    // Silent fail - don't break check-in flow
  }
}

// --- Pod commitment bridge ---
// After a gym check-in, auto-fulfill any pending pod commitments for today
const STREAK_MILESTONES = [7, 14, 30, 50, 100];

export async function fulfillPodCommitmentsFromGymCheckin(memberId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find all pending pod commitments for this member today
    const pendingCommitments = await db('pod_commitments')
      .where({ member_id: memberId, date: today, status: 'pending' });

    if (pendingCommitments.length === 0) return;

    for (const commitment of pendingCommitments) {
      await db.transaction(async (trx) => {
        // 1. Update commitment status
        await trx('pod_commitments')
          .where('id', commitment.id)
          .update({
            status: 'checked_in',
            checked_in_at: new Date(),
            checkin_method: 'auto_gym',
            updated_at: new Date(),
          });

        // 2. Update streak
        const podMember = await trx('pod_members')
          .where({ member_id: memberId, pod_id: commitment.pod_id })
          .first();

        if (!podMember) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak;
        if (podMember.last_checkin_date === today) {
          newStreak = podMember.current_streak; // already counted today
        } else if (podMember.last_checkin_date === yesterdayStr) {
          newStreak = podMember.current_streak + 1;
        } else {
          newStreak = 1;
        }

        const longestStreak = Math.max(newStreak, podMember.longest_streak || 0);

        await trx('pod_members')
          .where({ member_id: memberId, pod_id: commitment.pod_id })
          .update({
            current_streak: newStreak,
            longest_streak: longestStreak,
            last_checkin_date: today,
            updated_at: new Date(),
          });

        // 3. Insert checkin feed entry
        await trx('pod_feed').insert({
          pod_id: commitment.pod_id,
          member_id: memberId,
          type: 'checkin',
          data: JSON.stringify({
            commitment_text: commitment.commitment_text,
            method: 'auto_gym',
            streak: newStreak,
          }),
        });

        // 4. Check for streak milestones
        if (STREAK_MILESTONES.includes(newStreak)) {
          await trx('pod_feed').insert({
            pod_id: commitment.pod_id,
            member_id: memberId,
            type: 'milestone',
            data: JSON.stringify({ streak: newStreak }),
          });
        }
      });
    }
  } catch (err) {
    // Silent fail — pod bridge should never break the check-in flow
    console.warn('[CheckinService] pod commitment bridge failed:', err?.message);
  }
}

// Dashboard stats
export async function getTodayCheckinCount(gymId) {
  const [{ count }] = await db('checkins')
    .where({ gym_id: gymId })
    .andWhereRaw('DATE(checked_in_at) = CURRENT_DATE')
    .count();
  return parseInt(count, 10);
}
