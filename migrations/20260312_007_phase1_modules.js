/**
 * Phase 1: Super Admin, Classes/Booking, Staff/HR, Member Discovery,
 * GST Invoices, AI Churn, Sponsored Newsletter, Cron Jobs
 */
export async function up(knex) {
  // ── Super Admin ──
  await knex.schema.createTable('super_admins', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('email').notNullable().unique()
    t.string('password_hash').notNullable()
    t.string('name').notNullable()
    t.enum('role', ['super_admin', 'support']).defaultTo('super_admin')
    t.boolean('is_active').defaultTo(true)
    t.timestamp('last_login_at')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('subscription_packages', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name').notNullable()
    t.string('slug').notNullable().unique()
    t.integer('price_paise').notNullable()
    t.enum('billing_cycle', ['monthly', 'quarterly', 'yearly']).defaultTo('yearly')
    t.integer('max_members').notNullable()
    t.jsonb('features').defaultTo('{}')
    t.boolean('is_active').defaultTo(true)
    t.integer('sort_order').defaultTo(0)
    t.timestamps(true, true)
  })

  // ── Classes & PT Booking ──
  await knex.schema.createTable('gym_classes', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.string('name').notNullable()
    t.text('description')
    t.enum('class_type', ['group', 'pt', 'workshop']).defaultTo('group')
    t.integer('duration_minutes').defaultTo(60)
    t.integer('max_capacity').defaultTo(20)
    t.integer('price_paise').defaultTo(0)
    t.uuid('trainer_id')
    t.boolean('is_active').defaultTo(true)
    t.timestamps(true, true)
  })

  await knex.schema.createTable('class_sessions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('class_id').notNullable().references('id').inTable('gym_classes').onDelete('CASCADE')
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.date('session_date').notNullable()
    t.time('start_time').notNullable()
    t.time('end_time').notNullable()
    t.uuid('trainer_id')
    t.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).defaultTo('scheduled')
    t.integer('current_bookings').defaultTo(0)
    t.text('notes')
    t.timestamps(true, true)
    t.index(['gym_id', 'session_date'])
  })

  await knex.schema.createTable('class_bookings', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('session_id').notNullable().references('id').inTable('class_sessions').onDelete('CASCADE')
    t.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.enum('status', ['booked', 'attended', 'cancelled', 'no_show']).defaultTo('booked')
    t.timestamp('booked_at').defaultTo(knex.fn.now())
    t.timestamp('cancelled_at')
    t.timestamps(true, true)
    t.unique(['session_id', 'member_id'])
  })

  // ── Staff & HR ──
  await knex.schema.createTable('gym_staff', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.string('name').notNullable()
    t.string('phone')
    t.string('email')
    t.enum('role', ['owner', 'manager', 'trainer', 'front_desk', 'cleaner']).defaultTo('trainer')
    t.integer('salary_paise').defaultTo(0)
    t.enum('status', ['active', 'inactive', 'terminated']).defaultTo('active')
    t.date('join_date').defaultTo(knex.fn.now())
    t.date('exit_date')
    t.text('notes')
    t.string('emergency_contact')
    t.string('id_proof_type')
    t.string('id_proof_number')
    t.timestamps(true, true)
    t.index(['gym_id', 'status'])
  })

  await knex.schema.createTable('staff_attendance', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('staff_id').notNullable().references('id').inTable('gym_staff').onDelete('CASCADE')
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.date('date').notNullable()
    t.time('check_in')
    t.time('check_out')
    t.enum('status', ['present', 'absent', 'half_day', 'leave']).defaultTo('present')
    t.text('notes')
    t.timestamps(true, true)
    t.unique(['staff_id', 'date'])
  })

  await knex.schema.createTable('staff_commissions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('staff_id').notNullable().references('id').inTable('gym_staff').onDelete('CASCADE')
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.uuid('member_id').references('id').inTable('members').onDelete('SET NULL')
    t.enum('type', ['pt_session', 'referral', 'bonus', 'deduction']).defaultTo('pt_session')
    t.integer('amount_paise').notNullable()
    t.text('description')
    t.date('period_start')
    t.date('period_end')
    t.boolean('is_paid').defaultTo(false)
    t.timestamps(true, true)
    t.index(['gym_id', 'staff_id'])
  })

  // ── Member Discovery ──
  await knex.schema.createTable('gym_profiles', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('gym_id').notNullable().unique().references('id').inTable('gyms').onDelete('CASCADE')
    t.text('description')
    t.jsonb('amenities').defaultTo('[]')
    t.jsonb('photos').defaultTo('[]')
    t.jsonb('timings').defaultTo('{}')
    t.string('address')
    t.string('city')
    t.string('area')
    t.decimal('latitude', 10, 7)
    t.decimal('longitude', 10, 7)
    t.integer('day_pass_paise').defaultTo(0)
    t.boolean('accepts_day_pass').defaultTo(false)
    t.boolean('is_listed').defaultTo(false)
    t.float('avg_rating').defaultTo(0)
    t.integer('review_count').defaultTo(0)
    t.timestamps(true, true)
    t.index(['city', 'is_listed'])
  })

  await knex.schema.createTable('gym_reviews', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.uuid('member_id').references('id').inTable('members').onDelete('SET NULL')
    t.string('reviewer_name')
    t.integer('rating').notNullable()
    t.text('comment')
    t.boolean('is_verified').defaultTo(false)
    t.timestamps(true, true)
    t.index(['gym_id', 'rating'])
  })

  await knex.schema.createTable('day_passes', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.string('buyer_name').notNullable()
    t.string('buyer_phone').notNullable()
    t.date('valid_date').notNullable()
    t.integer('price_paise').notNullable()
    t.enum('status', ['pending', 'paid', 'used', 'expired']).defaultTo('pending')
    t.string('razorpay_order_id')
    t.string('razorpay_payment_id')
    t.timestamps(true, true)
  })

  // ── GST Invoices ──
  await knex.schema.createTable('invoices', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.uuid('member_id').references('id').inTable('members').onDelete('SET NULL')
    t.uuid('payment_id').references('id').inTable('payments').onDelete('SET NULL')
    t.string('invoice_number').notNullable()
    t.date('invoice_date').notNullable()
    t.date('due_date')
    t.integer('subtotal_paise').notNullable()
    t.decimal('gst_rate', 5, 2).defaultTo(18.00)
    t.integer('cgst_paise').defaultTo(0)
    t.integer('sgst_paise').defaultTo(0)
    t.integer('igst_paise').defaultTo(0)
    t.integer('total_paise').notNullable()
    t.string('buyer_name')
    t.string('buyer_gstin')
    t.text('buyer_address')
    t.string('seller_gstin')
    t.text('seller_address')
    t.jsonb('line_items').defaultTo('[]')
    t.enum('status', ['draft', 'issued', 'paid', 'cancelled']).defaultTo('draft')
    t.timestamps(true, true)
    t.index(['gym_id', 'invoice_date'])
    t.unique(['gym_id', 'invoice_number'])
  })

  // ── AI Churn Prediction ──
  await knex.schema.createTable('churn_scores', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.float('risk_score').notNullable() // 0.0 to 1.0
    t.enum('risk_level', ['low', 'medium', 'high', 'critical']).defaultTo('low')
    t.jsonb('factors').defaultTo('{}')
    t.date('scored_at').defaultTo(knex.fn.now())
    t.timestamps(true, true)
    t.index(['gym_id', 'risk_level'])
    t.index(['member_id'])
  })

  // ── Sponsored Newsletter Slots ──
  await knex.schema.createTable('newsletter_sponsors', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('brand_name').notNullable()
    t.string('brand_logo_url')
    t.text('ad_html').notNullable()
    t.string('cta_url').notNullable()
    t.integer('cpm_paise').defaultTo(0) // cost per 1000 impressions
    t.integer('budget_paise').defaultTo(0)
    t.integer('spent_paise').defaultTo(0)
    t.integer('impressions').defaultTo(0)
    t.integer('clicks').defaultTo(0)
    t.boolean('is_active').defaultTo(true)
    t.date('start_date')
    t.date('end_date')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('newsletter_sponsor_placements', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('sponsor_id').notNullable().references('id').inTable('newsletter_sponsors').onDelete('CASCADE')
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    t.string('newsletter_id')
    t.integer('impressions').defaultTo(0)
    t.integer('clicks').defaultTo(0)
    t.integer('revenue_paise').defaultTo(0)
    t.timestamps(true, true)
  })

  // ── Cron Job Logs ──
  await knex.schema.createTable('cron_logs', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('job_name').notNullable()
    t.enum('status', ['started', 'completed', 'failed']).defaultTo('started')
    t.jsonb('result').defaultTo('{}')
    t.text('error')
    t.integer('duration_ms')
    t.timestamp('started_at').defaultTo(knex.fn.now())
    t.timestamp('completed_at')
    t.timestamps(true, true)
    t.index(['job_name', 'started_at'])
  })
}

export async function down(knex) {
  const tables = [
    'cron_logs', 'newsletter_sponsor_placements', 'newsletter_sponsors',
    'churn_scores', 'invoices', 'day_passes', 'gym_reviews', 'gym_profiles',
    'staff_commissions', 'staff_attendance', 'gym_staff',
    'class_bookings', 'class_sessions', 'gym_classes',
    'subscription_packages', 'super_admins',
  ]
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table)
  }
}
