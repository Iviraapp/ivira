export function up(knex) {
  return knex.schema
    .createTable('member_wallets', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.integer('balance_paise').defaultTo(0)
      table.integer('total_credited_paise').defaultTo(0)
      table.integer('total_spent_paise').defaultTo(0)
      table.timestamps(true, true)
      table.unique(['member_id', 'gym_id'])
    })
    .createTable('wallet_transactions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('wallet_id').notNullable().references('id').inTable('member_wallets').onDelete('CASCADE')
      table.uuid('gym_id').notNullable()
      table.string('type').notNullable() // credit_purchase, purchase, refund, bonus
      table.integer('amount_paise').notNullable()
      table.integer('bonus_paise').defaultTo(0) // bonus credits received
      table.string('description')
      table.string('reference_id') // payment_id or order_id
      table.string('reference_type') // payment, store_order, service_booking
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.index('wallet_id')
      table.index('gym_id')
    })
    .createTable('credit_packs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE') // null = global
      table.string('name').notNullable()
      table.integer('price_paise').notNullable()
      table.integer('credit_paise').notNullable() // actual credits received (price + bonus)
      table.integer('bonus_paise').notNullable().defaultTo(0)
      table.boolean('is_active').defaultTo(true)
      table.integer('sort_order').defaultTo(0)
      table.timestamps(true, true)
    })
    .createTable('member_badges', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.string('badge_type').notNullable() // streak_100, early_bird, power_lifter, consistency_30, first_checkin
      table.string('badge_name').notNullable()
      table.string('badge_icon') // emoji or icon key
      table.timestamp('earned_at').defaultTo(knex.fn.now())
      table.index(['member_id', 'gym_id'])
      table.unique(['member_id', 'gym_id', 'badge_type'])
    })
    .then(() => {
      // Add churn_risk_flag to members if not exists
      return knex.schema.alterTable('members', table => {
        table.boolean('at_risk').defaultTo(false)
        table.timestamp('at_risk_since')
      })
    })
}

export function down(knex) {
  return knex.schema
    .alterTable('members', table => {
      table.dropColumn('at_risk')
      table.dropColumn('at_risk_since')
    })
    .dropTableIfExists('member_badges')
    .dropTableIfExists('credit_packs')
    .dropTableIfExists('wallet_transactions')
    .dropTableIfExists('member_wallets')
}
