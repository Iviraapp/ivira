export function up(knex) {
  return knex.schema
    .createTable('exercises', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.string('name').notNullable();
      t.string('category').notNullable(); // chest, back, shoulders, arms, legs, core, cardio, full_body
      t.string('equipment'); // barbell, dumbbell, machine, cable, bodyweight, band, kettlebell
      t.string('muscle_group'); // primary muscle
      t.text('instructions');
      t.boolean('is_default').defaultTo(true);
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('SET NULL');
      t.timestamps(true, true);
    })
    .createTable('workout_sessions', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE');
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('SET NULL');
      t.string('name'); // "Push Day", "Leg Day", etc.
      t.string('workout_type'); // strength, cardio, hiit, yoga, crossfit, functional
      t.date('session_date').notNullable();
      t.integer('duration_minutes');
      t.integer('total_volume'); // total weight * reps
      t.text('notes');
      t.timestamps(true, true);
    })
    .createTable('exercise_sets', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('session_id').notNullable().references('id').inTable('workout_sessions').onDelete('CASCADE');
      t.uuid('exercise_id').notNullable().references('id').inTable('exercises').onDelete('CASCADE');
      t.integer('set_number').notNullable();
      t.decimal('weight_kg');
      t.integer('reps');
      t.integer('duration_seconds'); // for timed exercises like planks
      t.decimal('distance_km'); // for cardio
      t.boolean('is_warmup').defaultTo(false);
      t.string('rpe'); // rate of perceived exertion 1-10
      t.text('notes');
      t.timestamps(true, true);
    })
    .createTable('workout_templates', t => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.string('name').notNullable();
      t.string('category'); // push, pull, legs, upper, lower, full_body, cardio
      t.string('difficulty'); // beginner, intermediate, advanced
      t.jsonb('exercises').defaultTo('[]'); // [{exercise_id, sets, reps, rest_seconds}]
      t.integer('estimated_minutes');
      t.boolean('is_default').defaultTo(false);
      t.uuid('created_by'); // member_id if user-created
      t.uuid('gym_id').references('id').inTable('gyms').onDelete('SET NULL');
      t.timestamps(true, true);
    })
    .then(() => knex.schema.raw('CREATE INDEX idx_workout_sessions_member ON workout_sessions(member_id, session_date DESC)'))
    .then(() => knex.schema.raw('CREATE INDEX idx_exercise_sets_session ON exercise_sets(session_id)'));
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('exercise_sets')
    .dropTableIfExists('workout_sessions')
    .dropTableIfExists('workout_templates')
    .dropTableIfExists('exercises');
}
