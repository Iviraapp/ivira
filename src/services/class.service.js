import db from '../config/database.js';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';
import eventBus from './event-bus.service.js';

// ── Class CRUD ──────────────────────────────────────────────────────────────

export async function createClass(gymId, data) {
  const {
    name, description, class_type, duration_minutes,
    max_capacity, price_paise, trainer_id,
  } = data;

  if (!name || !class_type || !duration_minutes) {
    throw new ValidationError('name, class_type, and duration_minutes are required');
  }

  if (trainer_id) {
    const trainer = await db('gym_staff')
      .where({ id: trainer_id, gym_id: gymId })
      .whereNot({ status: 'terminated' })
      .first();
    if (!trainer) throw new NotFoundError('Trainer');
  }

  const [gymClass] = await db('gym_classes')
    .insert({
      gym_id: gymId,
      name,
      description: description || null,
      class_type,
      duration_minutes,
      max_capacity: max_capacity || 20,
      price_paise: price_paise || 0,
      trainer_id: trainer_id || null,
    })
    .returning('*');

  return gymClass;
}

export async function listClasses(gymId, { type, active } = {}) {
  const query = db('gym_classes').where({ gym_id: gymId });

  if (type) query.andWhere({ class_type: type });
  if (active !== undefined) query.andWhere({ is_active: active });

  const classes = await query.orderBy('created_at', 'desc');
  return { classes };
}

export async function getClass(gymId, classId) {
  const gymClass = await db('gym_classes')
    .where({ id: classId, gym_id: gymId })
    .first();

  if (!gymClass) throw new NotFoundError('Class');

  const upcomingSessions = await db('class_sessions')
    .where({ class_id: classId })
    .where('session_date', '>=', new Date().toISOString().slice(0, 10))
    .whereNot({ status: 'cancelled' })
    .orderBy('session_date', 'asc')
    .orderBy('start_time', 'asc')
    .limit(20);

  return { ...gymClass, upcoming_sessions: upcomingSessions };
}

export async function updateClass(gymId, classId, data) {
  const allowed = [
    'name', 'description', 'class_type', 'duration_minutes',
    'max_capacity', 'price_paise', 'trainer_id', 'is_active',
  ];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key))
  );

  if (Object.keys(filtered).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  if (filtered.trainer_id) {
    const trainer = await db('gym_staff')
      .where({ id: filtered.trainer_id, gym_id: gymId })
      .whereNot({ status: 'terminated' })
      .first();
    if (!trainer) throw new NotFoundError('Trainer');
  }

  const [updated] = await db('gym_classes')
    .where({ id: classId, gym_id: gymId })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!updated) throw new NotFoundError('Class');
  return updated;
}

export async function deleteClass(gymId, classId) {
  const [updated] = await db('gym_classes')
    .where({ id: classId, gym_id: gymId })
    .update({ is_active: false, updated_at: new Date() })
    .returning('*');

  if (!updated) throw new NotFoundError('Class');
  return updated;
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(gymId, data) {
  const { class_id, session_date, start_time, end_time, trainer_id } = data;

  if (!class_id || !session_date || !start_time || !end_time) {
    throw new ValidationError('class_id, session_date, start_time, and end_time are required');
  }

  const gymClass = await db('gym_classes')
    .where({ id: class_id, gym_id: gymId, is_active: true })
    .first();
  if (!gymClass) throw new NotFoundError('Class');

  if (trainer_id) {
    const trainer = await db('gym_staff')
      .where({ id: trainer_id, gym_id: gymId })
      .whereNot({ status: 'terminated' })
      .first();
    if (!trainer) throw new NotFoundError('Trainer');
  }

  const [session] = await db('class_sessions')
    .insert({
      class_id,
      gym_id: gymId,
      session_date,
      start_time,
      end_time,
      trainer_id: trainer_id || gymClass.trainer_id || null,
      max_capacity: gymClass.max_capacity,
      current_bookings: 0,
      status: 'scheduled',
    })
    .returning('*');

  return session;
}

export async function listSessions(gymId, { date, classId, status } = {}) {
  const query = db('class_sessions as s')
    .join('gym_classes as c', 's.class_id', 'c.id')
    .where('s.gym_id', gymId)
    .select(
      's.*',
      'c.name as class_name',
      'c.class_type',
      'c.duration_minutes',
      'c.price_paise',
    );

  if (date) query.andWhere('s.session_date', date);
  if (classId) query.andWhere('s.class_id', classId);
  if (status) query.andWhere('s.status', status);

  const sessions = await query
    .orderBy('s.session_date', 'asc')
    .orderBy('s.start_time', 'asc');

  return { sessions };
}

// ── Bookings (transaction-safe) ─────────────────────────────────────────────

export async function bookSession(gymId, sessionId, memberId) {
  if (!memberId) throw new ValidationError('memberId is required');

  return db.transaction(async (trx) => {
    // Lock the session row to prevent race conditions
    const session = await trx('class_sessions')
      .where({ id: sessionId, gym_id: gymId })
      .forUpdate()
      .first();

    if (!session) throw new NotFoundError('Session');

    if (session.status === 'cancelled') {
      throw new AppError('This session has been cancelled', 400, 'SESSION_CANCELLED');
    }

    if (session.current_bookings >= (session.max_capacity || 20)) {
      throw new AppError('Session is fully booked', 400, 'SESSION_FULL');
    }

    // Check member belongs to gym
    const member = await trx('members')
      .where({ id: memberId, gym_id: gymId })
      .first();
    if (!member) throw new NotFoundError('Member');

    // Prevent duplicate booking (also enforced by partial unique index)
    const existing = await trx('class_bookings')
      .where({ session_id: sessionId, member_id: memberId })
      .whereNot({ status: 'cancelled' })
      .first();
    if (existing) {
      throw new AppError('Member already booked for this session', 400, 'DUPLICATE_BOOKING');
    }

    // Get class info for event data
    const gymClass = await trx('gym_classes')
      .where({ id: session.class_id })
      .first();

    const [booking] = await trx('class_bookings')
      .insert({
        session_id: sessionId,
        member_id: memberId,
        gym_id: gymId,
        status: 'confirmed',
        price_paise: gymClass?.price_paise || 0,
        booked_at: new Date(),
      })
      .returning('*');

    await trx('class_sessions')
      .where({ id: sessionId })
      .increment('current_bookings', 1);

    const spotsLeft = (session.max_capacity || 20) - session.current_bookings - 1;

    // Publish real-time event to gym dashboard
    eventBus.publish(gymId, 'booking', {
      bookingId: booking.id,
      sessionId,
      memberId,
      member_name: member.name,
      member_phone: member.phone,
      className: gymClass?.name || 'Class',
      sessionDate: session.session_date,
      startTime: session.start_time,
      spotsLeft,
      pricePaise: gymClass?.price_paise || 0,
    });

    // Sync booking revenue to ledger (fire-and-forget)
    if (gymClass?.price_paise > 0) {
      import('./revenue.service.js').then(({ syncBookingToLedger }) =>
        syncBookingToLedger(gymId, booking.id, gymClass.price_paise).catch(err => console.warn('[ClassService]', err?.message))
      ).catch(err => console.warn('[ClassService]', err?.message))
    }

    return { ...booking, member_name: member.name, class_name: gymClass?.name, spots_left: spotsLeft };
  });
}

export async function cancelBooking(gymId, bookingId, memberId) {
  if (!memberId) throw new ValidationError('memberId is required');

  return db.transaction(async (trx) => {
    const booking = await trx('class_bookings')
      .where({ id: bookingId, gym_id: gymId, member_id: memberId })
      .whereNot({ status: 'cancelled' })
      .forUpdate()
      .first();

    if (!booking) throw new NotFoundError('Booking');

    const [updated] = await trx('class_bookings')
      .where({ id: bookingId })
      .update({ status: 'cancelled', cancelled_at: new Date() })
      .returning('*');

    await trx('class_sessions')
      .where({ id: booking.session_id })
      .where('current_bookings', '>', 0)
      .decrement('current_bookings', 1);

    // Get session and class info for event
    const session = await trx('class_sessions').where({ id: booking.session_id }).first();
    const gymClass = session ? await trx('gym_classes').where({ id: session.class_id }).first() : null;
    const member = await trx('members').where({ id: memberId }).first();

    eventBus.publish(gymId, 'booking_cancelled', {
      bookingId,
      sessionId: booking.session_id,
      memberId,
      member_name: member?.name,
      className: gymClass?.name,
    });

    return updated;
  });
}

export async function getSessionBookings(gymId, sessionId) {
  const session = await db('class_sessions')
    .where({ id: sessionId, gym_id: gymId })
    .first();
  if (!session) throw new NotFoundError('Session');

  const bookings = await db('class_bookings as b')
    .join('members as m', 'b.member_id', 'm.id')
    .where('b.session_id', sessionId)
    .where('b.gym_id', gymId)
    .select(
      'b.*',
      'm.name as member_name',
      'm.phone as member_phone',
      'm.email as member_email',
    )
    .orderBy('b.booked_at', 'desc');

  return { session, bookings };
}

export async function getMemberBookings(gymId, memberId) {
  const member = await db('members')
    .where({ id: memberId, gym_id: gymId })
    .first();
  if (!member) throw new NotFoundError('Member');

  const bookings = await db('class_bookings as b')
    .join('class_sessions as s', 'b.session_id', 's.id')
    .join('gym_classes as c', 's.class_id', 'c.id')
    .where('b.member_id', memberId)
    .where('b.gym_id', gymId)
    .select(
      'b.*',
      's.session_date',
      's.start_time',
      's.end_time',
      'c.name as class_name',
      'c.class_type',
    )
    .orderBy('s.session_date', 'desc')
    .orderBy('s.start_time', 'desc');

  return { bookings };
}

// ── Occupancy helpers ───────────────────────────────────────────────────────

export async function getOccupancy(gymId) {
  let row = await db('gym_occupancy').where({ gym_id: gymId }).first();
  if (!row) {
    // Initialize if no row exists
    [row] = await db('gym_occupancy')
      .insert({ gym_id: gymId, current_count: 0 })
      .onConflict('gym_id')
      .merge()
      .returning('*');
  }
  return row;
}

export async function recordCheckinEvent(gymId, memberId, memberName, method) {
  // Upsert occupancy count
  await db('gym_occupancy')
    .insert({
      gym_id: gymId,
      current_count: 1,
      last_checkin_at: new Date(),
      updated_at: new Date(),
    })
    .onConflict('gym_id')
    .merge({
      current_count: db.raw('gym_occupancy.current_count + 1'),
      last_checkin_at: new Date(),
      updated_at: new Date(),
    });

  // Publish SSE event
  eventBus.publish(gymId, 'checkin', {
    memberId,
    member_name: memberName,
    method,
    timestamp: new Date().toISOString(),
  });
}

// ── Announcements ───────────────────────────────────────────────────────────

export async function listAnnouncements(gymId, { limit = 50, offset = 0, type } = {}) {
  const query = db('gym_announcements')
    .where({ gym_id: gymId });

  if (type) query.andWhere({ type });

  const announcements = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return { announcements };
}

export async function createAnnouncement(gymId, { memberId, type, title, body, metadata } = {}) {
  const [announcement] = await db('gym_announcements')
    .insert({
      gym_id: gymId,
      member_id: memberId || null,
      type,
      title,
      body: body || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .returning('*');

  eventBus.publish(gymId, type === 'at_risk' ? 'at_risk' : 'milestone', {
    announcementId: announcement.id,
    member_name: title,
    details: body,
    type,
    metadata,
  });

  return announcement;
}

// ── Class-level booking / check-in helpers ──────────────────────────────────
// These operate on the next upcoming session for a given class.

async function getNextSessionForClass(gymId, classId, trxOrDb = db) {
  const today = new Date().toISOString().slice(0, 10);
  const session = await trxOrDb('class_sessions')
    .where({ class_id: classId, gym_id: gymId })
    .where('session_date', '>=', today)
    .whereNot({ status: 'cancelled' })
    .orderBy('session_date', 'asc')
    .orderBy('start_time', 'asc')
    .first();
  return session;
}

export async function bookClass(gymId, classId, memberId) {
  if (!memberId) throw new ValidationError('member_id is required');

  const gymClass = await db('gym_classes')
    .where({ id: classId, gym_id: gymId, is_active: true })
    .first();
  if (!gymClass) throw new NotFoundError('Class');

  const session = await getNextSessionForClass(gymId, classId);
  if (!session) {
    throw new AppError('No upcoming session found for this class', 400, 'NO_SESSION');
  }

  return bookSession(gymId, session.id, memberId);
}

export async function cancelClassBooking(gymId, classId, memberId) {
  if (!memberId) throw new ValidationError('member_id is required');

  const gymClass = await db('gym_classes')
    .where({ id: classId, gym_id: gymId })
    .first();
  if (!gymClass) throw new NotFoundError('Class');

  // Find the member's active booking for any upcoming session of this class
  const booking = await db('class_bookings as b')
    .join('class_sessions as s', 'b.session_id', 's.id')
    .where('s.class_id', classId)
    .where('b.member_id', memberId)
    .where('b.gym_id', gymId)
    .whereNot('b.status', 'cancelled')
    .where('s.session_date', '>=', new Date().toISOString().slice(0, 10))
    .select('b.id')
    .first();

  if (!booking) throw new NotFoundError('Booking');

  return cancelBooking(gymId, booking.id, memberId);
}

export async function getClassAttendees(gymId, classId) {
  const gymClass = await db('gym_classes')
    .where({ id: classId, gym_id: gymId })
    .first();
  if (!gymClass) throw new NotFoundError('Class');

  // Return attendees across all upcoming sessions (or most recent if none upcoming)
  const attendees = await db('class_bookings as b')
    .join('class_sessions as s', 'b.session_id', 's.id')
    .join('members as m', 'b.member_id', 'm.id')
    .where('s.class_id', classId)
    .where('b.gym_id', gymId)
    .whereNot('b.status', 'cancelled')
    .select(
      'b.id as booking_id',
      'b.status as booking_status',
      'b.booked_at',
      'b.checked_in_at',
      'm.id as member_id',
      'm.name as member_name',
      'm.phone as member_phone',
      'm.email as member_email',
      's.session_date',
      's.start_time',
      's.end_time',
    )
    .orderBy('s.session_date', 'desc')
    .orderBy('s.start_time', 'desc');

  return { class: gymClass, attendees };
}

export async function classCheckin(gymId, classId, memberId) {
  if (!memberId) throw new ValidationError('member_id is required');

  const gymClass = await db('gym_classes')
    .where({ id: classId, gym_id: gymId, is_active: true })
    .first();
  if (!gymClass) throw new NotFoundError('Class');

  const session = await getNextSessionForClass(gymId, classId);
  if (!session) {
    throw new AppError('No upcoming session found for this class', 400, 'NO_SESSION');
  }

  const member = await db('members')
    .where({ id: memberId, gym_id: gymId })
    .first();
  if (!member) throw new NotFoundError('Member');

  // Find existing booking or create one
  let booking = await db('class_bookings')
    .where({ session_id: session.id, member_id: memberId, gym_id: gymId })
    .whereNot({ status: 'cancelled' })
    .first();

  if (!booking) {
    // Auto-book the member first
    booking = await bookSession(gymId, session.id, memberId);
  }

  // Mark as attended
  const [updated] = await db('class_bookings')
    .where({ id: booking.id || booking.booking_id })
    .update({ status: 'attended', checked_in_at: new Date() })
    .returning('*');

  // Record facility check-in event
  await recordCheckinEvent(gymId, memberId, member.name, 'class_checkin');

  eventBus.publish(gymId, 'class_checkin', {
    classId,
    className: gymClass.name,
    sessionId: session.id,
    memberId,
    member_name: member.name,
    timestamp: new Date().toISOString(),
  });

  return { ...updated, member_name: member.name, class_name: gymClass.name };
}

export async function getAtRiskMembers(gymId) {
  const members = await db('members')
    .where({ gym_id: gymId, at_risk: true, status: 'active' })
    .select('id', 'name', 'phone', 'email', 'at_risk_since', 'last_check_in')
    .orderBy('at_risk_since', 'desc');

  return { members };
}
