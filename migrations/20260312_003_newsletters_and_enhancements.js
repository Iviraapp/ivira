/**
 * Add newsletters table, expand member statuses, add QR check-in tracking
 */
export function up(knex) {
  return knex.schema
    // Newsletters table
    .createTable('newsletters', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.string('subject').notNullable();
      t.text('body').notNullable();
      t.string('template').notNullable(); // welcome, renewal, motivation
      t.integer('recipients_count').defaultTo(0);
      t.timestamp('sent_at');
      t.timestamps(true, true);
    })
    // Drop the old check constraint on members.status and add expanded one
    .raw(`
      ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
      ALTER TABLE members ADD CONSTRAINT members_status_check
        CHECK (status IN ('active', 'inactive', 'suspended', 'paused', 'expired'));
    `);
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('newsletters')
    .raw(`
      ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
      ALTER TABLE members ADD CONSTRAINT members_status_check
        CHECK (status IN ('active', 'inactive', 'suspended'));
    `);
}
