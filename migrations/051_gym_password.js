export async function up(knex) {
  const has = await knex.schema.hasColumn('gyms', 'password_hash')
  if (!has) {
    await knex.schema.alterTable('gyms', t => {
      t.string('password_hash', 100).nullable()
      t.timestamp('password_set_at').nullable()
    })
  }
}

export async function down(knex) {
  await knex.schema.alterTable('gyms', t => {
    t.dropColumn('password_hash')
    t.dropColumn('password_set_at')
  })
}
