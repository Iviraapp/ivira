import db from '../config/database.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'

// ---- Professional Profiles ----

export async function createProfile(gymId, data) {
  const [profile] = await db('professional_profiles')
    .insert({ gym_id: gymId, ...data })
    .returning('*')
  return profile
}

export async function getProfile(profileId) {
  const profile = await db('professional_profiles').where({ id: profileId }).first()
  if (!profile) throw new NotFoundError('Professional profile')
  return profile
}

export async function listProfiles(gymId, { type } = {}) {
  const query = db('professional_profiles').where({ gym_id: gymId, is_active: true })
  if (type) query.andWhere({ type })
  return query.orderBy('name')
}

export async function updateProfile(profileId, updates) {
  const allowed = ['name', 'phone', 'email', 'type', 'bio', 'specialties', 'certifications', 'photo_url', 'is_active']
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
  const [profile] = await db('professional_profiles')
    .where({ id: profileId })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*')
  if (!profile) throw new NotFoundError('Professional profile')
  return profile
}

export async function verifyProfile(profileId, status) {
  const [profile] = await db('professional_profiles')
    .where({ id: profileId })
    .update({ is_verified: status === 'approved', verification_status: status, updated_at: new Date() })
    .returning('*')
  return profile
}

// ---- Health Services ----

export async function createService(gymId, professionalId, data) {
  const platformFee = Math.round(data.price_paise * 0.05) // 5% platform fee
  const [service] = await db('health_services')
    .insert({
      gym_id: gymId,
      professional_id: professionalId,
      platform_fee_paise: platformFee,
      ...data,
    })
    .returning('*')
  return service
}

export async function listServices(gymId, { type, professionalId } = {}) {
  const query = db('health_services')
    .where({ 'health_services.gym_id': gymId, 'health_services.is_active': true })
    .join('professional_profiles', 'health_services.professional_id', 'professional_profiles.id')
    .select('health_services.*', 'professional_profiles.name as trainer_name', 'professional_profiles.type as trainer_type', 'professional_profiles.is_verified', 'professional_profiles.photo_url as trainer_photo')
  if (type) query.andWhere({ 'health_services.type': type })
  if (professionalId) query.andWhere({ 'health_services.professional_id': professionalId })
  return query.orderBy('health_services.created_at', 'desc')
}

export async function getService(serviceId) {
  const service = await db('health_services')
    .where({ 'health_services.id': serviceId })
    .join('professional_profiles', 'health_services.professional_id', 'professional_profiles.id')
    .select('health_services.*', 'professional_profiles.name as trainer_name')
    .first()
  if (!service) throw new NotFoundError('Service')
  return service
}

// ---- Bookings ----

export function calculateSplit(amountPaise) {
  const trainerPayout = Math.round(amountPaise * 0.85)
  const gymCommission = Math.round(amountPaise * 0.10)
  const platformFee = amountPaise - trainerPayout - gymCommission // remainder to avoid rounding issues
  return { trainerPayout, gymCommission, platformFee }
}

export async function createBooking(gymId, data) {
  const service = await db('health_services').where({ id: data.service_id }).first()
  if (!service) throw new NotFoundError('Service')

  const { trainerPayout, gymCommission, platformFee } = calculateSplit(service.price_paise)

  const [booking] = await db('service_bookings')
    .insert({
      gym_id: gymId,
      service_id: data.service_id,
      member_id: data.member_id,
      professional_id: service.professional_id,
      amount_paise: service.price_paise,
      trainer_payout_paise: trainerPayout,
      gym_commission_paise: gymCommission,
      platform_fee_paise: platformFee,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      notes: data.notes,
    })
    .returning('*')
  return booking
}

export async function listBookings(gymId, { memberId, professionalId, status, page = 1, limit = 50 } = {}) {
  const query = db('service_bookings')
    .where({ 'service_bookings.gym_id': gymId })
    .join('health_services', 'service_bookings.service_id', 'health_services.id')
    .join('members', 'service_bookings.member_id', 'members.id')
    .join('professional_profiles', 'service_bookings.professional_id', 'professional_profiles.id')
    .select(
      'service_bookings.*',
      'health_services.title as service_title',
      'members.name as member_name',
      'professional_profiles.name as trainer_name'
    )

  if (memberId) query.andWhere({ 'service_bookings.member_id': memberId })
  if (professionalId) query.andWhere({ 'service_bookings.professional_id': professionalId })
  if (status) query.andWhere({ 'service_bookings.status': status })

  const countQuery = db('service_bookings').where({ gym_id: gymId })
  if (memberId) countQuery.andWhere({ member_id: memberId })
  if (professionalId) countQuery.andWhere({ professional_id: professionalId })
  if (status) countQuery.andWhere({ status })
  const [{ count }] = await countQuery.count()

  const offset = (page - 1) * limit
  const bookings = await query.orderBy('service_bookings.booking_date', 'desc').limit(limit).offset(offset)

  return { bookings, total: parseInt(count, 10), page, limit }
}

export async function updateBookingStatus(bookingId, status) {
  const [booking] = await db('service_bookings')
    .where({ id: bookingId })
    .update({ status, updated_at: new Date() })
    .returning('*')
  if (!booking) throw new NotFoundError('Booking')
  return booking
}

// ---- Trainer Earnings ----

export async function getTrainerEarnings(professionalId) {
  const [totals] = await db('service_bookings')
    .where({ professional_id: professionalId, payment_status: 'paid' })
    .select(
      db.raw('SUM(trainer_payout_paise) as total_earned'),
      db.raw('COUNT(*) as total_sessions')
    )

  const [pending] = await db('service_bookings')
    .where({ professional_id: professionalId, payment_status: 'paid', status: 'completed' })
    .select(db.raw('SUM(trainer_payout_paise) as settled'))

  return {
    totalEarned: parseInt(totals?.total_earned || 0),
    totalSessions: parseInt(totals?.total_sessions || 0),
    settled: parseInt(pending?.settled || 0),
    pendingPayout: parseInt(totals?.total_earned || 0) - parseInt(pending?.settled || 0),
  }
}

// ---- Legal Consents ----

export async function recordConsent(userId, userType, { contractVersion, contractType, ipAddress, userAgent }) {
  const [consent] = await db('legal_consents')
    .insert({
      user_id: userId,
      user_type: userType,
      contract_version: contractVersion,
      contract_type: contractType,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .returning('*')

  // Update trainer terms_accepted
  if (userType === 'trainer') {
    await db('professional_profiles')
      .where({ id: userId })
      .update({ terms_accepted: true, terms_accepted_at: new Date() })
  }

  return consent
}
