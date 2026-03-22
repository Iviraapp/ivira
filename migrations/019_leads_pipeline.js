export async function up(knex) {
  await knex.schema.alterTable('leads', table => {
    table.string('owner_name', 255).nullable()
    table.uuid('assigned_to').nullable()
    table.timestamp('converted_at', { useTz: true }).nullable()
    table.uuid('converted_gym_id').nullable()
  })
}

export async function down(knex) {
  await knex.schema.alterTable('leads', table => {
    table.dropColumn('owner_name')
    table.dropColumn('assigned_to')
    table.dropColumn('converted_at')
    table.dropColumn('converted_gym_id')
  })
}
