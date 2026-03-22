/**
 * Create push_tokens table for FCM device token storage.
 */
export async function up(knex) {
  await knex.schema.createTable('push_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').references('id').inTable('members').onDelete('CASCADE');
    t.uuid('staff_id').references('id').inTable('gym_staff').onDelete('CASCADE');
    t.text('device_token').notNullable();
    t.text('platform').notNullable(); // ios, android, web
    t.jsonb('device_info');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);

    t.unique(['device_token']);
    t.index('gym_id');
    t.index('member_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('push_tokens');
}
