export async function up(knex) {
  await knex.schema.createTable('leads', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name', 255).notNullable()
    table.string('gym_name', 255).notNullable()
    table.string('phone', 20).notNullable()
    table.string('email', 255).notNullable()
    table.string('package_interest', 50).nullable()
    table.string('source', 100).defaultTo('landing')
    table.string('status', 20).defaultTo('new')
    table.text('notes').nullable()
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now())

    table.index('status')
    table.index('created_at')
  })

  await knex.schema.alterTable('gyms', table => {
    table.string('package_type', 20).notNullable().defaultTo('standard')
    table.jsonb('active_features').defaultTo('[]')
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('leads')
  await knex.schema.alterTable('gyms', table => {
    table.dropColumn('package_type')
    table.dropColumn('active_features')
  })
}
