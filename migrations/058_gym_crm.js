export async function up(knex) {
  const has = await knex.schema.hasTable('member_notes')
  if (!has) {
    await knex.schema.createTable('member_notes', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('member_id').notNullable()
      t.uuid('gym_id').notNullable()
      t.uuid('created_by').nullable() // staff/owner who wrote the note
      t.string('type', 30).defaultTo('general') // general, injury, preference, birthday, followup
      t.text('content').notNullable()
      t.boolean('is_pinned').defaultTo(false)
      t.boolean('is_private').defaultTo(true) // only visible to gym staff
      t.timestamp('followup_date').nullable()
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.index(['member_id', 'gym_id'])
    })
  }

  // Add birthday and emergency contact to members
  const hasBirthday = await knex.schema.hasColumn('members', 'birthday_month')
  if (!hasBirthday) {
    await knex.schema.alterTable('members', t => {
      t.integer('birthday_month').nullable()
      t.integer('birthday_day').nullable()
      t.string('emergency_contact_name', 100).nullable()
      t.string('emergency_contact_phone', 20).nullable()
      t.text('injury_notes').nullable()
      t.text('dietary_preferences').nullable()
    })
  }
}
export async function down(knex) {
  await knex.schema.dropTableIfExists('member_notes')
  await knex.schema.alterTable('members', t => {
    t.dropColumn('birthday_month'); t.dropColumn('birthday_day')
    t.dropColumn('emergency_contact_name'); t.dropColumn('emergency_contact_phone')
    t.dropColumn('injury_notes'); t.dropColumn('dietary_preferences')
  })
}
