export function up(knex) {
  return knex.schema
    .createTable('professional_profiles', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('staff_id').references('id').inTable('gym_staff').onDelete('SET NULL')
      table.string('name').notNullable()
      table.string('phone')
      table.string('email')
      table.string('type').notNullable().defaultTo('trainer') // trainer, dietitian, physio, yoga
      table.text('bio')
      table.jsonb('specialties').defaultTo('[]')
      table.jsonb('certifications').defaultTo('[]') // [{name, issuer, year, document_url, verified}]
      table.string('photo_url')
      table.boolean('is_verified').defaultTo(false)
      table.string('verification_status').defaultTo('pending') // pending, approved, rejected
      table.decimal('avg_rating', 3, 2).defaultTo(0)
      table.integer('total_reviews').defaultTo(0)
      table.integer('total_sessions').defaultTo(0)
      table.boolean('is_active').defaultTo(true)
      table.boolean('terms_accepted').defaultTo(false)
      table.timestamp('terms_accepted_at')
      table.timestamps(true, true)
      table.index('gym_id')
    })
    .createTable('health_services', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('professional_id').notNullable().references('id').inTable('professional_profiles').onDelete('CASCADE')
      table.string('title').notNullable()
      table.text('description')
      table.string('type').notNullable() // pt_session, diet_plan, physio, yoga, group_class, custom_pack
      table.integer('price_paise').notNullable()
      table.integer('platform_fee_paise').notNullable() // 5% of price
      table.integer('duration_minutes')
      table.string('validity_period') // e.g. '30 days', '12 weeks'
      table.integer('max_sessions') // for packs
      table.boolean('is_active').defaultTo(true)
      table.jsonb('metadata').defaultTo('{}') // extra config
      table.timestamps(true, true)
      table.index('gym_id')
      table.index('professional_id')
    })
    .createTable('service_bookings', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('service_id').notNullable().references('id').inTable('health_services').onDelete('CASCADE')
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('professional_id').notNullable().references('id').inTable('professional_profiles').onDelete('CASCADE')
      table.string('status').defaultTo('pending') // pending, confirmed, completed, cancelled, no_show
      table.string('payment_status').defaultTo('unpaid') // unpaid, paid, refunded
      table.integer('amount_paise')
      table.integer('trainer_payout_paise') // 85%
      table.integer('gym_commission_paise') // 10%
      table.integer('platform_fee_paise') // 5%
      table.date('booking_date')
      table.time('start_time')
      table.time('end_time')
      table.text('notes')
      table.string('razorpay_payment_id')
      table.timestamps(true, true)
      table.index(['gym_id', 'booking_date'])
      table.index('member_id')
      table.index('professional_id')
    })
    .createTable('legal_consents', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable() // can be professional_id, member_id, or gym owner
      table.string('user_type').notNullable() // trainer, member, owner
      table.string('contract_version').notNullable() // v1, v2, etc.
      table.string('contract_type').notNullable() // platform_participation, terms_of_service, privacy_policy
      table.string('ip_address')
      table.string('user_agent')
      table.timestamp('accepted_at').defaultTo(knex.fn.now())
      table.index('user_id')
    })
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('legal_consents')
    .dropTableIfExists('service_bookings')
    .dropTableIfExists('health_services')
    .dropTableIfExists('professional_profiles')
}
