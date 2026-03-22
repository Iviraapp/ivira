export async function up(knex) {
  // Persistent fasting state (survives app close)
  await knex.schema.createTable('member_fasting_state', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').notNullable();
    t.string('protocol', 10).notNullable().defaultTo('16:8');
    t.timestamp('start_time', { useTz: true }).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['gym_id', 'member_id']);
  });

  // Fasting log history
  const hasFastingLogs = await knex.schema.hasTable('fasting_logs');
  if (!hasFastingLogs) {
    await knex.schema.createTable('fasting_logs', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
      t.uuid('member_id').notNullable();
      t.string('protocol', 10).notNullable().defaultTo('16:8');
      t.timestamp('start_time', { useTz: true });
      t.timestamp('end_time', { useTz: true });
      t.integer('duration_minutes').defaultTo(0);
      t.boolean('completed').defaultTo(false);
      t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      t.index(['gym_id', 'member_id']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('fasting_logs');
  await knex.schema.dropTableIfExists('member_fasting_state');
}
