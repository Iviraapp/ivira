export async function up(knex) {
  await knex.schema.createTable('affiliate_campaigns', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name').notNullable()
    t.uuid('brand_id') // references affiliate brands
    t.enum('campaign_type', ['CPV', 'CPM', 'CPI', 'CPA']).defaultTo('CPA')
    t.string('offer_url').notNullable()
    t.string('postback_url')
    t.string('fallback_url')
    t.integer('payout_amount_paise').defaultTo(0)
    t.enum('payout_type', ['fixed', 'percent']).defaultTo('fixed')
    t.integer('daily_cap').defaultTo(0) // 0 = unlimited
    t.integer('total_cap').defaultTo(0)
    t.integer('today_conversions').defaultTo(0)
    t.integer('total_conversions').defaultTo(0)
    t.integer('total_clicks').defaultTo(0)
    t.enum('status', ['active', 'paused', 'ended']).defaultTo('active')
    t.date('start_date')
    t.date('end_date')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('affiliate_conversions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('click_token', 32).notNullable().unique()
    t.uuid('campaign_id').notNullable().references('id').inTable('affiliate_campaigns').onDelete('CASCADE')
    t.uuid('gym_id').references('id').inTable('gyms').onDelete('SET NULL')
    t.enum('status', ['click', 'converted', 'rejected', 'pending']).defaultTo('click')
    t.string('conversion_type') // install, purchase, lead, sale
    t.integer('value_paise').defaultTo(0)
    t.integer('gym_commission_paise').defaultTo(0)
    t.integer('platform_commission_paise').defaultTo(0)
    t.string('sub1')
    t.string('sub2')
    t.string('sub3')
    t.string('sub4')
    t.string('sub5')
    t.string('ip_address')
    t.text('user_agent')
    t.enum('postback_status', ['pending', 'sent', 'failed']).defaultTo('pending')
    t.integer('postback_attempts').defaultTo(0)
    t.timestamp('postback_sent_at')
    t.timestamp('clicked_at').defaultTo(knex.fn.now())
    t.timestamp('converted_at')
    t.timestamps(true, true)
    t.index(['campaign_id', 'status'])
    t.index(['gym_id'])
    t.index(['click_token'])
  })

  await knex.schema.createTable('affiliate_postback_logs', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('conversion_id').notNullable().references('id').inTable('affiliate_conversions').onDelete('CASCADE')
    t.string('url').notNullable()
    t.integer('http_status')
    t.text('response_body')
    t.boolean('success').defaultTo(false)
    t.integer('attempt_number').defaultTo(1)
    t.timestamps(true, true)
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('affiliate_postback_logs')
  await knex.schema.dropTableIfExists('affiliate_conversions')
  await knex.schema.dropTableIfExists('affiliate_campaigns')
}
