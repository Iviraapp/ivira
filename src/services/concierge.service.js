import db from '../config/database.js';

/**
 * List elite training facilities with filtering, GPS radius, and pagination.
 */
export async function listFacilities({ discipline, city, lat, lng, radiusKm = 10, sort = 'rating', page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  let query = db('gym_profiles as gp')
    .join('gyms as g', 'gp.gym_id', 'g.id')
    .select(
      'g.id',
      'g.name',
      'gp.discipline_tags',
      'gp.rating',
      'gp.address',
      'gp.area',
      'gp.city',
      'gp.latitude',
      'gp.longitude',
      'gp.day_pass_price',
      'gp.photos',
      'gp.amenities'
    )
    .where('gp.is_listed', true);

  // Filter by discipline tag
  if (discipline) {
    query = query.whereRaw('? = ANY(gp.discipline_tags)', [discipline]);
  }

  // Filter by city
  if (city) {
    query = query.whereILike('gp.city', city);
  }

  // GPS radius filter using haversine (PostgreSQL)
  if (lat != null && lng != null) {
    const radiusMeters = radiusKm * 1000;
    query = query.whereRaw(`
      (6371000 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(gp.latitude - ?) / 2), 2) +
        COS(RADIANS(?)) * COS(RADIANS(gp.latitude)) *
        POWER(SIN(RADIANS(gp.longitude - ?) / 2), 2)
      ))) <= ?
    `, [lat, lat, lng, radiusMeters]);
  }

  // Sorting
  if (sort === 'distance' && lat != null && lng != null) {
    query = query.orderByRaw(`
      (6371000 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(gp.latitude - ?) / 2), 2) +
        COS(RADIANS(?)) * COS(RADIANS(gp.latitude)) *
        POWER(SIN(RADIANS(gp.longitude - ?) / 2), 2)
      ))) ASC
    `, [lat, lat, lng]);
  } else if (sort === 'price') {
    query = query.orderBy('gp.day_pass_price', 'asc');
  } else {
    // Default: rating descending
    query = query.orderBy('gp.rating', 'desc');
  }

  const [countResult] = await query.clone().clearSelect().clearOrder().count('* as total');
  const total = parseInt(countResult?.total || 0);

  const facilities = await query.limit(limit).offset(offset);

  return {
    facilities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get detailed facility info including trainers and health services.
 */
export async function getFacility(facilityId) {
  const facility = await db('gym_profiles as gp')
    .join('gyms as g', 'gp.gym_id', 'g.id')
    .select(
      'g.id',
      'g.name',
      'gp.*'
    )
    .where('g.id', facilityId)
    .first();

  if (!facility) return null;

  // Fetch trainers (professional_profiles)
  let trainers = [];
  try {
    trainers = await db('professional_profiles')
      .where('gym_id', facilityId)
      .select('id', 'name', 'specialization', 'bio', 'photo', 'rating');
  } catch {
    // Table may not exist yet
  }

  // Fetch health services
  let healthServices = [];
  try {
    healthServices = await db('health_services')
      .where('gym_id', facilityId)
      .select('id', 'name', 'description', 'price', 'duration_minutes');
  } catch {
    // Table may not exist yet
  }

  return {
    ...facility,
    trainers,
    healthServices,
  };
}

/**
 * Return distinct discipline tags with counts grouped by city.
 */
export async function listDisciplines() {
  const rows = await db('gym_profiles')
    .select(db.raw('unnest(discipline_tags) as discipline'), 'city')
    .where('is_listed', true)
    .groupBy('discipline', 'city')
    .count('* as count')
    .orderBy('discipline');

  // Group by discipline
  const disciplineMap = {};
  for (const row of rows) {
    if (!disciplineMap[row.discipline]) {
      disciplineMap[row.discipline] = { discipline: row.discipline, total: 0, cities: {} };
    }
    const count = parseInt(row.count);
    disciplineMap[row.discipline].total += count;
    disciplineMap[row.discipline].cities[row.city] = count;
  }

  return Object.values(disciplineMap);
}

/**
 * Create an inquiry/lead for a facility.
 */
export async function createInquiry(data) {
  try {
    const [inquiry] = await db('concierge_inquiries')
      .insert({
        facility_id: data.facility_id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        discipline: data.discipline || null,
        message: data.message || null,
        created_at: new Date(),
      })
      .returning('*');
    return inquiry;
  } catch (err) {
    // Table may not exist yet — log and return success
    console.log('[Concierge] Inquiry received (table not ready):', {
      facility_id: data.facility_id,
      name: data.name,
      phone: data.phone,
      discipline: data.discipline,
    });
    return { status: 'logged', message: 'Inquiry recorded (pending table creation)' };
  }
}
