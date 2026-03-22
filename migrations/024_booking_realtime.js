/**
 * Migration: Real-time Booking System
 *
 * - Adds missing columns to class_sessions (max_capacity) and class_bookings (price_paise)
 * - Creates gym_occupancy table for live check-in tracking
 * - Creates gym_announcements table for milestones, at-risk alerts, streaks
 * - Adds partial unique index to prevent double-bookings
 */
export async function up(knex) {
  // Fix class_sessions: add max_capacity if missing
  const hasMaxCap = await knex.schema.hasColumn('class_sessions', 'max_capacity');
  if (!hasMaxCap) {
    await knex.schema.alterTable('class_sessions', (t) => {
      t.integer('max_capacity').defaultTo(20);
    });
  }

  // Fix class_bookings: add price_paise if missing
  const hasPrice = await knex.schema.hasColumn('class_bookings', 'price_paise');
  if (!hasPrice) {
    await knex.schema.alterTable('class_bookings', (t) => {
      t.integer('price_paise').defaultTo(0);
    });
  }

  // Add cancelled_at to class_bookings if missing
  const hasCancelledAt = await knex.schema.hasColumn('class_bookings', 'cancelled_at');
  if (!hasCancelledAt) {
    await knex.schema.alterTable('class_bookings', (t) => {
      t.timestamp('cancelled_at').nullable();
    });
  }

  // Partial unique index: one active booking per member per session
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_class_bookings_unique_active
    ON class_bookings (session_id, member_id)
    WHERE status != 'cancelled'
  `);

  // Gym occupancy — one row per gym, updated on every check-in
  const hasOccupancy = await knex.schema.hasTable('gym_occupancy');
  if (!hasOccupancy) {
    await knex.schema.createTable('gym_occupancy', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
      t.integer('current_count').defaultTo(0);
      t.integer('capacity').defaultTo(100);
      t.timestamp('last_checkin_at').nullable();
      t.timestamp('updated_at').defaultTo(knex.fn.now());
      t.unique('gym_id');
    });
  }

  // Gym announcements — milestones, at-risk alerts, streak wins
  const hasAnnouncements = await knex.schema.hasTable('gym_announcements');
  if (!hasAnnouncements) {
    await knex.schema.createTable('gym_announcements', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').nullable().references('id').inTable('members').onDelete('SET NULL');
      t.string('type').notNullable(); // milestone, streak, challenge, at_risk, general, booking
      t.string('title').notNullable();
      t.text('body').nullable();
      t.jsonb('metadata').nullable();
      t.boolean('is_read').defaultTo(false);
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
      t.index(['gym_id', 'created_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('gym_announcements');
  await knex.schema.dropTableIfExists('gym_occupancy');
  await knex.raw('DROP INDEX IF EXISTS idx_class_bookings_unique_active');
}
