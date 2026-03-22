export function up(knex) {
  return knex.schema
    .createTable('workout_logs', (t) => {
      t.increments('id').primary();
      t.integer('member_id').references('id').inTable('members').notNullable().onDelete('CASCADE');
      t.integer('gym_id').references('id').inTable('gyms').notNullable().onDelete('CASCADE');
      t.date('log_date').notNullable().defaultTo(knex.fn.now());
      t.string('workout_type', 50).notNullable(); // strength, cardio, hiit, yoga, crossfit, functional, other
      t.integer('duration_minutes').notNullable();
      t.integer('calories_burned').nullable();
      t.text('notes').nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_workout_logs_member_date ON workout_logs(member_id, log_date)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_workout_logs_gym ON workout_logs(gym_id)'));
}

export function down(knex) {
  return knex.schema.dropTableIfExists('workout_logs');
}
