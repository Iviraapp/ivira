export async function up(knex) {
  const hasGoogleId = await knex.schema.hasColumn('gyms', 'google_id')
  if (!hasGoogleId) {
    await knex.schema.alterTable('gyms', t => {
      t.string('google_id', 100).nullable()
      t.string('photo_url', 500).nullable()
    })
  }
  const hasMemberGoogleId = await knex.schema.hasColumn('members', 'google_id')
  if (!hasMemberGoogleId) {
    await knex.schema.alterTable('members', t => {
      t.string('google_id', 100).nullable()
    })
  }
}

export function down(knex) {
  return Promise.all([
    knex.schema.alterTable('gyms', t => { t.dropColumn('google_id'); t.dropColumn('photo_url') }),
    knex.schema.alterTable('members', t => { t.dropColumn('google_id') }),
  ])
}
