export async function up(knex) {
  // Gym suspension
  const hasSuspended = await knex.schema.hasColumn('gyms', 'is_suspended')
  if (!hasSuspended) {
    await knex.schema.alterTable('gyms', t => {
      t.boolean('is_suspended').defaultTo(false)
      t.string('suspension_reason', 500).nullable()
      t.timestamp('suspended_at').nullable()
      t.boolean('is_verified').defaultTo(false)
      t.timestamp('verified_at').nullable()
    })
  }

  // Member suspension
  const hasMemberSuspended = await knex.schema.hasColumn('members', 'is_suspended')
  if (!hasMemberSuspended) {
    await knex.schema.alterTable('members', t => {
      t.boolean('is_suspended').defaultTo(false)
      t.string('suspension_reason', 500).nullable()
    })
  }

  // Support tickets enhancement
  const hasTickets = await knex.schema.hasTable('support_tickets')
  if (!hasTickets) {
    await knex.schema.createTable('support_tickets', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('gym_id').nullable().references('id').inTable('gyms')
      t.uuid('member_id').nullable()
      t.string('submitted_by_email', 200)
      t.string('submitted_by_name', 200)
      t.string('subject', 300).notNullable()
      t.text('message').notNullable()
      t.string('category', 50).defaultTo('general') // general, billing, technical, complaint, refund
      t.string('priority', 20).defaultTo('normal') // low, normal, high, urgent
      t.string('status', 20).defaultTo('open') // open, in_progress, resolved, closed
      t.text('admin_notes').nullable()
      t.string('assigned_to', 200).nullable()
      t.timestamp('resolved_at').nullable()
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.timestamp('updated_at').defaultTo(knex.fn.now())
    })
  } else {
    // Add missing columns if table exists
    const hasStatus = await knex.schema.hasColumn('support_tickets', 'status')
    if (!hasStatus) {
      await knex.schema.alterTable('support_tickets', t => {
        t.string('status', 20).defaultTo('open')
        t.text('admin_notes').nullable()
        t.string('assigned_to', 200).nullable()
        t.timestamp('resolved_at').nullable()
      })
    }
  }

  // Content reports
  const hasReports = await knex.schema.hasTable('content_reports')
  if (!hasReports) {
    await knex.schema.createTable('content_reports', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('reported_by').notNullable() // member_id
      t.string('content_type', 50).notNullable() // 'pod_feed', 'message', 'profile'
      t.uuid('content_id').notNullable()
      t.string('reason', 50).notNullable() // 'spam', 'harassment', 'inappropriate', 'misinformation'
      t.text('description').nullable()
      t.string('status', 20).defaultTo('pending') // pending, reviewed, actioned, dismissed
      t.text('admin_action').nullable()
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.timestamp('reviewed_at').nullable()
    })
  }

  // Feature flags per gym
  const hasFlags = await knex.schema.hasTable('gym_feature_flags')
  if (!hasFlags) {
    await knex.schema.createTable('gym_feature_flags', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.uuid('gym_id').notNullable().references('id').inTable('gyms')
      t.string('feature', 100).notNullable()
      t.boolean('enabled').defaultTo(true)
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.unique(['gym_id', 'feature'])
    })
  }

  // App version tracking
  const hasAppVersion = await knex.schema.hasTable('app_versions')
  if (!hasAppVersion) {
    await knex.schema.createTable('app_versions', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid())
      t.string('platform', 10).notNullable() // android, ios
      t.string('version', 20).notNullable()
      t.string('build_number', 20)
      t.boolean('force_update').defaultTo(false)
      t.string('download_url', 500)
      t.text('release_notes')
      t.timestamp('released_at').defaultTo(knex.fn.now())
    })
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('app_versions')
  await knex.schema.dropTableIfExists('gym_feature_flags')
  await knex.schema.dropTableIfExists('content_reports')
  await knex.schema.dropTableIfExists('support_tickets')
  await knex.schema.alterTable('members', t => { t.dropColumn('is_suspended'); t.dropColumn('suspension_reason') })
  await knex.schema.alterTable('gyms', t => { t.dropColumn('is_suspended'); t.dropColumn('suspension_reason'); t.dropColumn('suspended_at'); t.dropColumn('is_verified'); t.dropColumn('verified_at') })
}
