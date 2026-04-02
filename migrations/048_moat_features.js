/**
 * Migration 048 — Moat features
 *
 * 1. gyms.gps_radius_meters       — per-gym GPS check-in radius
 * 2. gym_profiles.discipline_tags — for concierge/day-pass discovery
 * 3. gym_profiles.day_pass_price  — alias of day_pass_paise (readable)
 * 4. gym_feed                     — real gym announcements / owner posts
 * 5. member_outcome_snapshots     — weekly outcome data for analytics
 */

export async function up(knex) {

  // ── 1. Per-gym GPS radius ──────────────────────────────────────
  const hasGpsRadius = await knex.schema.hasColumn('gyms', 'gps_radius_meters')
  if (!hasGpsRadius) {
    await knex.schema.alterTable('gyms', t => {
      t.integer('gps_radius_meters').defaultTo(150)
    })
  }

  // ── 2. discipline_tags on gym_profiles ─────────────────────────
  // Required by concierge.service.js: WHERE discipline = ANY(gp.discipline_tags)
  const hasDisciplineTags = await knex.schema.hasColumn('gym_profiles', 'discipline_tags')
  if (!hasDisciplineTags) {
    await knex.schema.alterTable('gym_profiles', t => {
      t.specificType('discipline_tags', 'text[]').defaultTo('{}')
      t.string('rating', 10).defaultTo('0')  // concierge sorts by this
    })
    // Index for discipline tag array search
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_gym_profiles_discipline_tags
      ON gym_profiles USING GIN (discipline_tags)
    `)
  }

  // ── 3. gym_feed — real owner posts / announcements ─────────────
  const hasFeed = await knex.schema.hasTable('gym_feed')
  if (!hasFeed) {
    await knex.schema.createTable('gym_feed', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      t.uuid('posted_by').nullable()  // null = auto-generated (milestone, etc.)
      // type: announcement | milestone | challenge | event | tip
      t.string('type', 30).notNullable().defaultTo('announcement')
      t.string('title', 200).notNullable()
      t.text('body').nullable()
      t.string('image_url', 500).nullable()
      t.string('cta_label', 80).nullable()   // e.g. "Book Now", "Join Challenge"
      t.string('cta_url', 500).nullable()
      t.boolean('is_pinned').defaultTo(false)
      t.boolean('is_active').defaultTo(true)
      t.jsonb('metadata').defaultTo('{}')    // flexible extra data
      t.timestamp('created_at').defaultTo(knex.fn.now())
      t.timestamp('updated_at').defaultTo(knex.fn.now())
      t.index(['gym_id', 'created_at'])
      t.index(['gym_id', 'is_pinned', 'created_at'])
    })
  }

  // ── 4. member_outcome_snapshots — weekly outcome data ──────────
  // Powers the "Member Outcome Analytics" dashboard card.
  // One row per member per week. Written by cron, read by analytics endpoint.
  const hasSnapshots = await knex.schema.hasTable('member_outcome_snapshots')
  if (!hasSnapshots) {
    await knex.schema.createTable('member_outcome_snapshots', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      t.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      t.date('week_start').notNullable()        // Monday of the week (YYYY-MM-DD)
      t.integer('checkin_count').defaultTo(0)
      t.integer('streak_days').defaultTo(0)
      t.integer('total_steps').defaultTo(0)
      t.integer('workout_count').defaultTo(0)
      t.decimal('avg_sleep_score', 5, 2).nullable()
      t.decimal('avg_calories', 8, 2).nullable()
      t.decimal('fitness_score', 5, 2).nullable()  // IVIRA proprietary score
      t.boolean('used_vira_ai').defaultTo(false)
      t.boolean('used_circles').defaultTo(false)
      t.boolean('used_sleep_tracker').defaultTo(false)
      t.boolean('used_food_scanner').defaultTo(false)
      t.timestamps(true, true)
      t.unique(['member_id', 'week_start'])
      t.index(['gym_id', 'week_start'])
    })
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('member_outcome_snapshots')
  await knex.schema.dropTableIfExists('gym_feed')
  // Don't drop columns on down to avoid data loss — just log
  console.log('down: gps_radius_meters and discipline_tags columns left in place')
}
