import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import config from '../config/index.js';
import { AppError, NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors.js';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedBuffer = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(hashBuffer, derivedBuffer);
}

export async function createAdmin(email, password, name) {
  if (!email || !password || !name) {
    throw new ValidationError('Email, password, and name are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db('super_admins').where({ email: normalizedEmail }).first();
  if (existing) {
    throw new ValidationError('Admin with this email already exists');
  }

  const passwordHash = hashPassword(password);

  const [admin] = await db('super_admins')
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      name: name.trim(),
    })
    .returning(['id', 'email', 'name', 'created_at']);

  return admin;
}

export async function loginAdmin(email, password) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const admin = await db('super_admins').where({ email: normalizedEmail }).first();
  if (!admin) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = verifyPassword(password, admin.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: 'super_admin' },
    config.jwt.secret,
    { expiresIn: '24h' }
  );

  return { token, admin: { id: admin.id, email: admin.email, name: admin.name } };
}

export async function listGyms(page = 1, limit = 20, search = '', status = '') {
  const offset = (page - 1) * limit;

  let query = db('gyms')
    .select(
      'gyms.*',
      db.raw('(SELECT COUNT(*) FROM members WHERE members.gym_id = gyms.id) AS member_count')
    );

  if (search) {
    query = query.where(function () {
      this.whereILike('gym_name', `%${search}%`)
        .orWhereILike('owner_name', `%${search}%`)
        .orWhereILike('owner_email', `%${search}%`)
        .orWhereILike('city', `%${search}%`);
    });
  }

  if (status) {
    query = query.where('gyms.status', status);
  }

  // Clone for count before applying pagination
  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
  const { total } = await countQuery;

  const gyms = await query
    .orderBy('gyms.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    gyms,
    pagination: {
      page,
      limit,
      total: parseInt(total, 10),
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getGymDetail(gymId) {
  const gym = await db('gyms')
    .select(
      'gyms.*',
      db.raw('(SELECT COUNT(*) FROM members WHERE members.gym_id = gyms.id) AS member_count'),
      db.raw('(SELECT COUNT(*) FROM members WHERE members.gym_id = gyms.id AND members.status = ?) AS active_member_count', ['active']),
      db.raw('(SELECT COALESCE(SUM(amount_paise), 0) FROM payments WHERE payments.gym_id = gyms.id AND payments.status = ?) AS total_revenue', ['captured'])
    )
    .where('gyms.id', gymId)
    .first();

  if (!gym) {
    throw new NotFoundError('Gym');
  }

  // Get subscription info
  const subscription = await db('gym_subscriptions')
    .where({ gym_id: gymId })
    .orderBy('created_at', 'desc')
    .first();

  // Get recent payments
  const recentPayments = await db('payments')
    .where({ gym_id: gymId })
    .orderBy('created_at', 'desc')
    .limit(10);

  return {
    ...gym,
    subscription: subscription || null,
    recent_payments: recentPayments,
  };
}

export async function listPackages() {
  const packages = await db('subscription_packages')
    .orderBy('price_paise', 'asc');
  return packages;
}

export async function createPackage(data) {
  const { name, slug, max_members, price_paise, billing_cycle, features } = data;

  if (!name || !slug) {
    throw new ValidationError('Package name and slug are required');
  }

  const existing = await db('subscription_packages').where({ slug }).first();
  if (existing) {
    throw new ValidationError('Package with this slug already exists');
  }

  const [pkg] = await db('subscription_packages')
    .insert({
      name,
      slug,
      max_members: max_members || 100,
      price_paise: price_paise || 0,
      billing_cycle: billing_cycle || 'yearly',
      features: features ? JSON.stringify(features) : null,
    })
    .returning('*');

  return pkg;
}

export async function updatePackage(id, data) {
  const allowed = ['name', 'max_members', 'price_paise', 'billing_cycle', 'features', 'is_active'];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key))
  );

  if (filtered.features && typeof filtered.features !== 'string') {
    filtered.features = JSON.stringify(filtered.features);
  }

  const [pkg] = await db('subscription_packages')
    .where({ id })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!pkg) {
    throw new NotFoundError('Package');
  }

  return pkg;
}

export async function getStats() {
  const [gymStats] = await db('gyms')
    .select(
      db.raw('COUNT(*) AS total_gyms'),
      db.raw('COUNT(*) FILTER (WHERE status = ?) AS active_gyms', ['active']),
      db.raw('COUNT(*) FILTER (WHERE status = ?) AS trial_gyms', ['trial']),
      db.raw('COUNT(*) FILTER (WHERE status = ?) AS suspended_gyms', ['suspended'])
    );

  const [memberStats] = await db('members')
    .select(
      db.raw('COUNT(*) AS total_members'),
      db.raw('COUNT(*) FILTER (WHERE status = ?) AS active_members', ['active'])
    );

  const [revenueStats] = await db('payments')
    .where({ status: 'captured' })
    .select(
      db.raw('COALESCE(SUM(amount_paise), 0) AS total_revenue'),
      db.raw('COUNT(*) AS total_payments')
    );

  const [subscriptionStats] = await db('gym_subscriptions')
    .where({ status: 'active' })
    .select(db.raw('COUNT(*) AS active_subscriptions'));

  return {
    gyms: {
      total: parseInt(gymStats.total_gyms, 10),
      active: parseInt(gymStats.active_gyms, 10),
      trial: parseInt(gymStats.trial_gyms, 10),
      suspended: parseInt(gymStats.suspended_gyms, 10),
    },
    members: {
      total: parseInt(memberStats.total_members, 10),
      active: parseInt(memberStats.active_members, 10),
    },
    revenue: {
      total: parseInt(revenueStats.total_revenue, 10),
      total_payments: parseInt(revenueStats.total_payments, 10),
    },
    subscriptions: {
      active: parseInt(subscriptionStats.active_subscriptions, 10),
    },
  };
}

export async function getRevenueChart(period = '12months') {
  let months = 12;
  if (period === '6months') months = 6;
  if (period === '24months') months = 24;

  const rows = await db.raw(`
    SELECT
      TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COALESCE(SUM(amount_paise), 0) AS revenue,
      COUNT(*) AS payment_count
    FROM payments
    WHERE status = 'captured'
      AND created_at >= NOW() - INTERVAL '${months} months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY month ASC
  `);

  return rows.rows;
}

export async function suspendGym(gymId) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) {
    throw new NotFoundError('Gym');
  }

  if (gym.status === 'suspended') {
    throw new ValidationError('Gym is already suspended');
  }

  const [updated] = await db('gyms')
    .where({ id: gymId })
    .update({ status: 'suspended', updated_at: new Date() })
    .returning('*');

  return updated;
}

export async function activateGym(gymId) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) {
    throw new NotFoundError('Gym');
  }

  if (gym.status === 'active') {
    throw new ValidationError('Gym is already active');
  }

  const [updated] = await db('gyms')
    .where({ id: gymId })
    .update({ status: 'active', updated_at: new Date() })
    .returning('*');

  return updated;
}
