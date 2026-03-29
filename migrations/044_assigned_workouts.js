export const up = async (knex) => {
  await knex.schema.createTable('assigned_workouts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('trainer_id').notNullable();
    t.uuid('gym_id').notNullable();
    t.uuid('member_id').notNullable();
    t.string('title').notNullable();
    t.text('description');
    t.jsonb('exercises').defaultTo('[]');
    t.date('scheduled_date');
    t.text('notes');
    t.string('status').defaultTo('pending'); // pending, done, cancelled
    t.timestamps(true, true);
  });
  await knex.schema.table('assigned_workouts', (t) => {
    t.index(['member_id', 'status']);
    t.index(['trainer_id']);
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('assigned_workouts');
};
