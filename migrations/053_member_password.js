export async function up(knex) {
  const has = await knex.schema.hasColumn('members', 'password_hash')
  if (!has) {
    await knex.schema.alterTable('members', t => {
      t.string('password_hash', 100).nullable()
    })
  }
}

export async function down(knex) {
  await knex.schema.alterTable('members', t => { t.dropColumn('password_hash') })
}
