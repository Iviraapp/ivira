export async function up(knex) {
  const has = await knex.schema.hasTable('gym_passport_visits')
  if (!has) {
    await knex.schema.createTable('gym_passport_visits', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('member_id').notNullable()
      t.uuid('home_gym_id').notNullable() // member's primary gym
      t.uuid('visited_gym_id').notNullable() // gym they're visiting
      t.string('visit_type', 20).defaultTo('day_pass') // day_pass, trial, reciprocal
      t.integer('amount_paise').defaultTo(0)
      t.string('status', 20).defaultTo('active') // active, completed, cancelled
      t.timestamp('valid_from').defaultTo(knex.fn.now())
      t.timestamp('valid_until').notNullable()
      t.timestamp('checked_in_at').nullable()
      t.timestamp('created_at').defaultTo(knex.fn.now())
    })
  }

  // Gym partnership table
  const hasPartners = await knex.schema.hasTable('gym_partnerships')
  if (!hasPartners) {
    await knex.schema.createTable('gym_partnerships', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('gym_a_id').notNullable().references('id').inTable('gyms')
      t.uuid('gym_b_id').notNullable().references('id').inTable('gyms')
      t.string('type', 20).defaultTo('reciprocal') // reciprocal, one_way
      t.integer('day_pass_price_paise').defaultTo(0) // 0 = free for members
      t.boolean('is_active').defaultTo(true)
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.unique(['gym_a_id', 'gym_b_id'])
    })
  }
}
export async function down(knex) {
  await knex.schema.dropTableIfExists('gym_passport_visits')
  await knex.schema.dropTableIfExists('gym_partnerships')
}
