export async function up(knex) {
  const has = await knex.schema.hasColumn('members', 'streak_freeze_available')
  if (!has) {
    await knex.schema.alterTable('members', t => {
      t.boolean('streak_freeze_available').defaultTo(true)
      t.timestamp('streak_freeze_used_at').nullable()
      t.timestamp('streak_freeze_granted_at').defaultTo(knex.fn.now())
    })
  }
}

export async function down(knex) {
  await knex.schema.alterTable('members', t => {
    t.dropColumn('streak_freeze_available')
    t.dropColumn('streak_freeze_used_at')
    t.dropColumn('streak_freeze_granted_at')
  })
}
