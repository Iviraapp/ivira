import Razorpay from 'razorpay';
import db from '../config/database.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { notifyDayPassPurchase } from './day-pass-notification.service.js';

const razorpayEnabled = !!(config.razorpay.keyId && config.razorpay.keyId !== 'your-key-id');

let razorpay;
function getRazorpay() {
  if (!razorpay && razorpayEnabled) {
    razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpay;
}

/**
 * Haversine distance in kilometers between two lat/lng points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Upsert a gym's public discovery profile.
 */
export async function updateGymProfile(gymId, data) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');

  const payload = {
    gym_id: gymId,
    description: data.description,
    amenities: data.amenities ? JSON.stringify(data.amenities) : undefined,
    photos: data.photos ? JSON.stringify(data.photos) : undefined,
    timings: data.timings,
    address: data.address,
    city: data.city?.toLowerCase().trim(),
    area: data.area?.toLowerCase().trim(),
    latitude: data.latitude,
    longitude: data.longitude,
    day_pass_paise: data.dayPassPaise,
    accepts_day_pass: data.acceptsDayPass,
    is_listed: data.isListed,
    updated_at: new Date(),
  };

  // Remove undefined keys
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const existing = await db('gym_profiles').where({ gym_id: gymId }).first();

  if (existing) {
    const [profile] = await db('gym_profiles')
      .where({ gym_id: gymId })
      .update(payload)
      .returning('*');
    return profile;
  }

  const [profile] = await db('gym_profiles')
    .insert({ ...payload, gym_id: gymId })
    .returning('*');
  return profile;
}

/**
 * Get a gym's public profile joined with gym base data.
 */
export async function getGymProfile(gymId) {
  const profile = await db('gym_profiles')
    .where({ 'gym_profiles.gym_id': gymId })
    .join('gyms', 'gym_profiles.gym_id', 'gyms.id')
    .select(
      'gym_profiles.*',
      'gyms.gym_name as gym_name',
      'gyms.owner_phone as gym_phone',
    )
    .first();

  if (!profile) throw new NotFoundError('Gym profile');

  return {
    ...profile,
    amenities: typeof profile.amenities === 'string' ? JSON.parse(profile.amenities) : profile.amenities,
    photos: typeof profile.photos === 'string' ? JSON.parse(profile.photos) : profile.photos,
  };
}

/**
 * Search publicly listed gyms with optional geo, city, area, and amenity filters.
 */
export async function searchGyms({ city, area, amenities, lat, lng, radius = 10, page = 1, limit = 20 } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (page - 1) * limit;

  const query = db('gym_profiles')
    .where({ 'gym_profiles.is_listed': true })
    .join('gyms', 'gym_profiles.gym_id', 'gyms.id')
    .select(
      'gym_profiles.*',
      'gyms.gym_name as gym_name',
      'gyms.owner_phone as gym_phone',
    );

  const countQuery = db('gym_profiles').where({ is_listed: true });

  if (city) {
    const cityLower = city.toLowerCase().trim();
    query.andWhere('gym_profiles.city', cityLower);
    countQuery.andWhere('city', cityLower);
  }

  if (area) {
    const areaLower = area.toLowerCase().trim();
    query.andWhere('gym_profiles.area', areaLower);
    countQuery.andWhere('area', areaLower);
  }

  if (amenities && amenities.length > 0) {
    const amenityList = Array.isArray(amenities) ? amenities : [amenities];
    for (const amenity of amenityList) {
      query.andWhereRaw('gym_profiles.amenities::text ILIKE ?', [`%${amenity}%`]);
      countQuery.andWhereRaw('amenities::text ILIKE ?', [`%${amenity}%`]);
    }
  }

  // If lat/lng provided, apply bounding box pre-filter for performance
  if (lat != null && lng != null) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusKm)) {
      throw new ValidationError('Invalid latitude, longitude, or radius');
    }

    // Rough bounding box (1 degree ~ 111km)
    const deltaLat = radiusKm / 111;
    const deltaLng = radiusKm / (111 * Math.cos((latNum * Math.PI) / 180));

    query
      .andWhere('gym_profiles.latitude', '>=', latNum - deltaLat)
      .andWhere('gym_profiles.latitude', '<=', latNum + deltaLat)
      .andWhere('gym_profiles.longitude', '>=', lngNum - deltaLng)
      .andWhere('gym_profiles.longitude', '<=', lngNum + deltaLng);

    countQuery
      .andWhereNotNull('latitude')
      .andWhere('latitude', '>=', latNum - deltaLat)
      .andWhere('latitude', '<=', latNum + deltaLat)
      .andWhere('longitude', '>=', lngNum - deltaLng)
      .andWhere('longitude', '<=', lngNum + deltaLng);
  }

  const [{ count }] = await countQuery.count();

  let gyms = await query
    .orderBy('gym_profiles.avg_rating', 'desc')
    .limit(limit)
    .offset(offset);

  // Post-filter by exact haversine distance if geo search
  if (lat != null && lng != null) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    gyms = gyms
      .map((g) => ({
        ...g,
        amenities: typeof g.amenities === 'string' ? JSON.parse(g.amenities) : g.amenities,
        photos: typeof g.photos === 'string' ? JSON.parse(g.photos) : g.photos,
        distance_km: haversineKm(latNum, lngNum, parseFloat(g.latitude), parseFloat(g.longitude)),
      }))
      .filter((g) => g.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  } else {
    gyms = gyms.map((g) => ({
      ...g,
      amenities: typeof g.amenities === 'string' ? JSON.parse(g.amenities) : g.amenities,
      photos: typeof g.photos === 'string' ? JSON.parse(g.photos) : g.photos,
    }));
  }

  return { gyms, total: parseInt(count, 10), page, limit };
}

/**
 * Add a review for a gym and update aggregate rating.
 */
export async function addReview(gymId, { memberId, reviewerName, rating, comment }) {
  if (!rating || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }
  if (!reviewerName || reviewerName.trim().length < 2) {
    throw new ValidationError('Reviewer name is required (min 2 characters)');
  }

  const profile = await db('gym_profiles').where({ gym_id: gymId, is_listed: true }).first();
  if (!profile) throw new NotFoundError('Gym profile');

  const [review] = await db('gym_reviews')
    .insert({
      gym_id: gymId,
      member_id: memberId || null,
      reviewer_name: reviewerName.trim(),
      rating: parseInt(rating, 10),
      comment: comment?.trim() || null,
    })
    .returning('*');

  // Recompute avg_rating and review_count from source of truth
  const stats = await db('gym_reviews')
    .where({ gym_id: gymId })
    .select(
      db.raw('COUNT(*)::int as review_count'),
      db.raw('ROUND(AVG(rating)::numeric, 2) as avg_rating'),
    )
    .first();

  await db('gym_profiles')
    .where({ gym_id: gymId })
    .update({
      avg_rating: stats.avg_rating,
      review_count: stats.review_count,
      updated_at: new Date(),
    });

  return review;
}

/**
 * Get paginated reviews for a gym.
 */
export async function getReviews(gymId, page = 1, limit = 20) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (page - 1) * limit;

  const [{ count }] = await db('gym_reviews').where({ gym_id: gymId }).count();

  const reviews = await db('gym_reviews')
    .where({ gym_id: gymId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { reviews, total: parseInt(count, 10), page, limit };
}

/**
 * Purchase a day pass for a gym. Creates a day_pass record and a Razorpay order.
 */
export async function purchaseDayPass(gymId, { buyerName, buyerPhone, validDate }) {
  if (!buyerName || buyerName.trim().length < 2) {
    throw new ValidationError('Buyer name is required');
  }
  if (!buyerPhone || buyerPhone.trim().length < 10) {
    throw new ValidationError('Valid phone number is required');
  }
  if (!validDate) {
    throw new ValidationError('Valid date is required');
  }

  const profile = await db('gym_profiles')
    .where({ gym_id: gymId, is_listed: true, accepts_day_pass: true })
    .first();
  if (!profile) throw new NotFoundError('Gym does not accept day passes');

  if (!profile.day_pass_paise || profile.day_pass_paise <= 0) {
    throw new ValidationError('Day pass price not configured for this gym');
  }

  const [dayPass] = await db('day_passes')
    .insert({
      gym_id: gymId,
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim(),
      valid_date: validDate,
      amount_paise: profile.day_pass_paise,
      status: 'pending',
    })
    .returning('*');

  const rz = getRazorpay();

  if (rz) {
    const order = await rz.orders.create({
      amount: profile.day_pass_paise,
      currency: 'INR',
      receipt: `dp_${dayPass.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        gym_id: gymId,
        day_pass_id: dayPass.id,
        buyer_phone: buyerPhone,
      },
    });

    await db('day_passes')
      .where({ id: dayPass.id })
      .update({ razorpay_order_id: order.id, updated_at: new Date() });

    return { dayPass: { ...dayPass, razorpay_order_id: order.id }, razorpayOrder: order };
  }

  // Dev mode: auto-mark as paid
  const [updated] = await db('day_passes')
    .where({ id: dayPass.id })
    .update({
      status: 'paid',
      razorpay_order_id: `dev_${Date.now()}`,
      paid_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');

  // Fire-and-forget notifications in dev mode (auto-paid)
  notifyDayPassPurchase(updated).catch(err => console.error('[DayPass] Notification error:', err.message));

  return { dayPass: updated, devMode: true };
}

/**
 * Verify day pass payment after Razorpay callback.
 */
export async function verifyDayPassPayment(dayPassId, paymentId) {
  const dayPass = await db('day_passes').where({ id: dayPassId }).first();
  if (!dayPass) throw new NotFoundError('Day pass');

  if (dayPass.status === 'paid') {
    throw new ValidationError('Day pass is already paid');
  }

  const [updated] = await db('day_passes')
    .where({ id: dayPassId })
    .update({
      status: 'paid',
      razorpay_payment_id: paymentId,
      paid_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');

  // Fire-and-forget notifications after payment confirmed
  notifyDayPassPurchase(updated).catch(err => console.error('[DayPass] Notification error:', err.message));

  return updated;
}
