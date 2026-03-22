export function up(knex) {
  return knex.schema
    .alterTable('members', (t) => {
      t.string('subscription_tier').defaultTo('standard').notNullable() // standard | elite
      t.string('city', 100)
      t.string('state', 100)
      t.boolean('show_location_data').defaultTo(false)
    })
    .createTable('daily_activity', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE')
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE')
      t.date('date').notNullable()
      t.integer('steps').defaultTo(0)
      t.decimal('distance_km', 8, 3).defaultTo(0)
      t.string('source', 50) // apple_health, health_connect, manual, pedometer
      t.integer('active_minutes').defaultTo(0)
      t.integer('calories_burned').defaultTo(0)
      t.timestamps(true, true)
      t.unique(['member_id', 'date'])
    })
    .createTable('leaderboard_cache', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE')
      t.string('scope', 20).notNullable() // gym, city, state, global
      t.string('scope_value', 100) // city name, state name, or null for gym/global
      t.date('date').notNullable()
      t.jsonb('rankings').defaultTo('[]') // [{memberId, name, steps, rank, streak}]
      t.timestamps(true, true)
      t.unique(['gym_id', 'scope', 'scope_value', 'date'])
    })
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('leaderboard_cache')
    .dropTableIfExists('daily_activity')
    .alterTable('members', (t) => {
      t.dropColumn('subscription_tier')
      t.dropColumn('city')
      t.dropColumn('state')
      t.dropColumn('show_location_data')
    })
}
