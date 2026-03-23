/**
 * First-party visitor analytics — visitors, sessions, events
 */
export function up(knex) {
  return knex.schema
    .createTable('visitors', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.string('visitor_id', 64).notNullable().unique()          // cookie ivira_vid
      t.uuid('user_id').nullable()                                 // linked member/owner if logged in
      t.string('user_type', 20).nullable()                         // 'member', 'owner', 'trainer', 'admin'
      t.string('first_referrer', 2048).nullable()
      t.string('first_utm_source', 255).nullable()
      t.string('first_utm_medium', 255).nullable()
      t.string('first_utm_campaign', 255).nullable()
      t.string('first_device_type', 20).nullable()                 // desktop, mobile, tablet
      t.string('first_browser', 100).nullable()
      t.string('first_os', 100).nullable()
      t.string('first_country', 2).nullable()
      t.string('first_city', 100).nullable()
      t.integer('total_sessions').defaultTo(0)
      t.integer('total_events').defaultTo(0)
      t.timestamp('first_seen_at').defaultTo(knex.fn.now())
      t.timestamp('last_seen_at').defaultTo(knex.fn.now())
      t.timestamp('created_at').defaultTo(knex.fn.now())
    })
    .createTable('sessions', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.string('session_id', 64).notNullable().unique()            // cookie ivira_session
      t.string('visitor_id', 64).notNullable().references('visitor_id').inTable('visitors').onDelete('CASCADE')
      t.uuid('user_id').nullable()
      t.string('referrer', 2048).nullable()
      t.string('utm_source', 255).nullable()
      t.string('utm_medium', 255).nullable()
      t.string('utm_campaign', 255).nullable()
      t.string('utm_term', 255).nullable()
      t.string('utm_content', 255).nullable()
      t.string('landing_page', 2048).nullable()
      t.string('device_type', 20).nullable()
      t.string('browser', 100).nullable()
      t.string('browser_version', 50).nullable()
      t.string('os', 100).nullable()
      t.string('os_version', 50).nullable()
      t.integer('screen_width').nullable()
      t.integer('screen_height').nullable()
      t.string('country', 2).nullable()
      t.string('city', 100).nullable()
      t.string('ip_hash', 64).nullable()                           // hashed IP for privacy
      t.integer('event_count').defaultTo(0)
      t.integer('page_count').defaultTo(0)
      t.integer('duration_seconds').nullable()
      t.timestamp('started_at').defaultTo(knex.fn.now())
      t.timestamp('last_activity_at').defaultTo(knex.fn.now())
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.index('visitor_id')
      t.index('started_at')
    })
    .createTable('visitor_events', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.string('visitor_id', 64).notNullable().references('visitor_id').inTable('visitors').onDelete('CASCADE')
      t.string('session_id', 64).notNullable().references('session_id').inTable('sessions').onDelete('CASCADE')
      t.uuid('user_id').nullable()
      t.string('event_name', 100).notNullable()
      t.string('page_url', 2048).nullable()
      t.string('page_path', 500).nullable()
      t.string('referrer', 2048).nullable()
      t.string('device_type', 20).nullable()
      t.string('browser', 100).nullable()
      t.string('os', 100).nullable()
      t.jsonb('metadata').defaultTo('{}')
      t.timestamp('timestamp').defaultTo(knex.fn.now())
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.index('visitor_id')
      t.index('session_id')
      t.index('event_name')
      t.index('timestamp')
      t.index(['event_name', 'timestamp'])
    })
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('visitor_events')
    .dropTableIfExists('sessions')
    .dropTableIfExists('visitors')
}
