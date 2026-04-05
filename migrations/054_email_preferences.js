export async function up(knex) {
  // Gym email preferences
  const hasDigest = await knex.schema.hasColumn('gyms', 'weekly_digest_enabled')
  if (!hasDigest) {
    await knex.schema.alterTable('gyms', t => {
      t.boolean('weekly_digest_enabled').defaultTo(true)
      t.timestamp('last_digest_sent_at').nullable()
    })
  }

  // Email log table
  const hasTable = await knex.schema.hasTable('email_logs')
  if (!hasTable) {
    await knex.schema.createTable('email_logs', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('gym_id').nullable().references('id').inTable('gyms')
      t.string('to_email', 200).notNullable()
      t.string('subject', 500)
      t.string('type', 50) // 'weekly_digest', 'manual', 'newsletter', 'notification'
      t.string('status', 20).defaultTo('sent') // 'sent', 'failed', 'queued'
      t.text('error_message').nullable()
      t.jsonb('metadata').defaultTo('{}')
      t.timestamp('sent_at').defaultTo(knex.fn.now())
      t.timestamp('created_at').defaultTo(knex.fn.now())
    })
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('email_logs')
  await knex.schema.alterTable('gyms', t => {
    t.dropColumn('weekly_digest_enabled')
    t.dropColumn('last_digest_sent_at')
  })
}
