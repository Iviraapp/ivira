export async function up(knex) {
  // Only create if not exists
  const exists = await knex.schema.hasTable('store_orders')
  if (!exists) {
    await knex.schema.createTable('store_orders', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('member_id').nullable().references('id').inTable('members').onDelete('SET NULL')
      table.jsonb('items').notNullable().defaultTo('[]')
      table.integer('total_paise').notNullable().defaultTo(0)
      table.string('payment_method', 30).defaultTo('cash')
      table.string('status', 30).defaultTo('confirmed')
      table.text('notes').nullable()
      table.timestamps(true, true)
    })
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('store_orders')
}
