/**
 * Create access_logs table for remote unlock/lock event tracking.
 */
export async function up(knex) {
  await knex.schema.createTable('access_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').references('id').inTable('members').onDelete('SET NULL');
    t.text('action').notNullable(); // 'unlock', 'lock', 'deny'
    t.text('method').notNullable(); // 'remote', 'qr', 'nfc', 'manual'
    t.text('initiated_by'); // staff name/id
    t.text('device_id'); // kiosk identifier
    t.text('result').notNullable(); // 'success', 'failure'
    t.jsonb('metadata');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    t.index(['gym_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('access_logs');
}
