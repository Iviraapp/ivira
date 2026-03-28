/**
 * Pods — Accountability engine tables.
 * Tables: goal_types, pods, pod_members, pod_commitments, pod_feed, pod_nudges, pod_health
 */
exports.up = function (knex) {
  return knex.schema
    // Goal types (gym, study, meditation, productivity, etc.)
    .createTable('goal_types', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.string('name').notNullable().unique()
      t.string('icon').defaultTo('target')
      t.string('default_commit_text').defaultTo('Complete my session')
      t.string('color').defaultTo('#22C55E')
      t.timestamp('created_at').defaultTo(knex.fn.now())
    })

    // Pods — the accountability group unit
    .createTable('pods', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('CASCADE')
      t.string('name').notNullable()
      t.string('goal_type') // e.g. 'Gym', 'Study' — simple string, not FK
      t.enu('intensity', ['casual', 'serious', 'hardcore']).defaultTo('serious')
      t.enu('time_preference', ['morning', 'afternoon', 'evening', 'flexible']).defaultTo('flexible')
      t.string('timezone').defaultTo('UTC')
      t.integer('max_members').defaultTo(5)
      t.decimal('consistency_multiplier', 4, 2).defaultTo(1.0)
      t.enu('tier', ['bronze', 'silver', 'gold', 'diamond']).defaultTo('bronze')
      t.boolean('is_active').defaultTo(true)
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.timestamp('updated_at').defaultTo(knex.fn.now())
    })

    // Pod membership — includes streak tracking per member-pod pair
    .createTable('pod_members', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('pod_id').references('id').inTable('pods').onDelete('CASCADE')
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE')
      t.enu('role', ['member', 'captain', 'leader']).defaultTo('member')
      t.enu('status', ['active', 'paused', 'removed']).defaultTo('active')
      t.integer('current_streak').defaultTo(0)
      t.integer('longest_streak').defaultTo(0)
      t.date('last_checkin_date')
      t.timestamp('joined_at').defaultTo(knex.fn.now())
      t.timestamp('updated_at').defaultTo(knex.fn.now())
      t.unique(['pod_id', 'member_id'])
    })

    // Daily commitments — one per member per pod per day
    .createTable('pod_commitments', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE')
      t.uuid('pod_id').references('id').inTable('pods').onDelete('CASCADE')
      t.date('date').notNullable()
      t.time('committed_time')
      t.string('commitment_text').defaultTo('Complete my session')
      t.enu('status', ['pending', 'checked_in', 'missed']).defaultTo('pending')
      t.string('checkin_method') // manual, auto_gym, auto_gps, auto_workout
      t.timestamp('checked_in_at')
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.timestamp('updated_at').defaultTo(knex.fn.now())
      t.unique(['member_id', 'pod_id', 'date'])
    })

    // Pod activity feed — social timeline
    .createTable('pod_feed', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('pod_id').references('id').inTable('pods').onDelete('CASCADE')
      t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE')
      t.enu('type', ['checkin', 'commitment', 'missed', 'nudge', 'milestone', 'joined']).notNullable()
      t.jsonb('data').defaultTo('{}')
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.index(['pod_id', 'created_at'])
    })

    // Nudges — pings between pod members
    .createTable('pod_nudges', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('pod_id').references('id').inTable('pods').onDelete('CASCADE')
      t.uuid('from_member_id').references('id').inTable('members').onDelete('CASCADE')
      t.uuid('to_member_id').references('id').inTable('members').onDelete('CASCADE')
      t.timestamp('created_at').defaultTo(knex.fn.now())
    })

    // Pod health daily snapshots
    .createTable('pod_health', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('pod_id').references('id').inTable('pods').onDelete('CASCADE')
      t.date('date').notNullable()
      t.integer('members_committed').defaultTo(0)
      t.integer('members_checked_in').defaultTo(0)
      t.integer('health_score').defaultTo(0)
      t.boolean('multiplier_active').defaultTo(false)
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.unique(['pod_id', 'date'])
    })

    // Seed default goal types
    .then(() =>
      knex('goal_types').insert([
        { name: 'Gym', icon: 'activity', default_commit_text: 'Hit the gym', color: '#22C55E' },
        { name: 'Study', icon: 'book-open', default_commit_text: 'Study session', color: '#6366F1' },
        { name: 'Meditation', icon: 'sun', default_commit_text: 'Meditate', color: '#8B5CF6' },
        { name: 'Running', icon: 'navigation', default_commit_text: 'Go for a run', color: '#F97316' },
        { name: 'Yoga', icon: 'wind', default_commit_text: 'Yoga practice', color: '#EC4899' },
        { name: 'Productivity', icon: 'zap', default_commit_text: 'Deep work session', color: '#EAB308' },
      ])
    )
}

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('pod_health')
    .dropTableIfExists('pod_nudges')
    .dropTableIfExists('pod_feed')
    .dropTableIfExists('pod_commitments')
    .dropTableIfExists('pod_members')
    .dropTableIfExists('pods')
    .dropTableIfExists('goal_types')
}
