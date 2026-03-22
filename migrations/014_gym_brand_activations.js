export function up(knex) {
  return knex.schema.createTable('gym_brand_activations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
    table.uuid('brand_id').notNullable().references('id').inTable('affiliate_brands').onDelete('CASCADE')
    table.boolean('is_active').defaultTo(true)
    table.timestamp('activated_at').defaultTo(knex.fn.now())
    table.timestamp('deactivated_at')
    table.unique(['gym_id', 'brand_id'])
    table.index('gym_id')
  })
}

export function down(knex) {
  return knex.schema.dropTableIfExists('gym_brand_activations')
}
