import { randomBytes, scryptSync } from 'crypto'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export async function seed(knex) {
  // Super Admin
  await knex('super_admins').del()
  await knex('super_admins').insert([
    {
      email: 'admin@ivira.app',
      password_hash: hashPassword('IVIRA@2026!'),
      name: 'IVIRA Admin',
      role: 'super_admin',
    },
  ])

  // Subscription Packages
  await knex('subscription_packages').del()
  await knex('subscription_packages').insert([
    {
      name: 'Starter',
      slug: 'starter',
      price_paise: 1200000, // ₹12,000/yr
      billing_cycle: 'yearly',
      max_members: 100,
      features: JSON.stringify({
        checkins: true, payments: true, newsletter: false,
        classes: false, staff: 3, analytics: 'basic',
      }),
      sort_order: 1,
    },
    {
      name: 'Growth',
      slug: 'growth',
      price_paise: 2400000, // ₹24,000/yr
      billing_cycle: 'yearly',
      max_members: 500,
      features: JSON.stringify({
        checkins: true, payments: true, newsletter: true,
        classes: true, staff: 10, analytics: 'advanced',
        affiliate: true,
      }),
      sort_order: 2,
    },
    {
      name: 'Pro',
      slug: 'pro',
      price_paise: 4800000, // ₹48,000/yr
      billing_cycle: 'yearly',
      max_members: 2000,
      features: JSON.stringify({
        checkins: true, payments: true, newsletter: true,
        classes: true, staff: -1, analytics: 'full',
        affiliate: true, churn_prediction: true,
        gst_invoices: true, discovery: true,
      }),
      sort_order: 3,
    },
  ])
}
