import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export async function createPlan(gymId, { name, durationMonths, pricePaise, description }) {
  const [plan] = await db('gym_plans')
    .insert({
      gym_id: gymId,
      name,
      duration_months: durationMonths,
      price_paise: pricePaise,
      description,
    })
    .returning('*');
  return plan;
}

export async function listPlans(gymId) {
  return db('gym_plans')
    .where({ gym_id: gymId, active: true })
    .orderBy('price_paise', 'asc');
}

export async function getPlan(gymId, planId) {
  const plan = await db('gym_plans').where({ id: planId, gym_id: gymId }).first();
  if (!plan) throw new NotFoundError('Plan');
  return plan;
}

export async function updatePlan(gymId, planId, updates) {
  const allowed = ['name', 'duration_months', 'price_paise', 'description', 'active'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowed.includes(key))
  );

  const [plan] = await db('gym_plans')
    .where({ id: planId, gym_id: gymId })
    .update({ ...filtered, updated_at: new Date() })
    .returning('*');

  if (!plan) throw new NotFoundError('Plan');
  return plan;
}

export async function deletePlan(gymId, planId) {
  const [plan] = await db('gym_plans')
    .where({ id: planId, gym_id: gymId })
    .update({ active: false, updated_at: new Date() })
    .returning('*');
  if (!plan) throw new NotFoundError('Plan');
  return plan;
}
