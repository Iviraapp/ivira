export function up(knex) {
  return knex.schema
    .createTable('member_profiles', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('member_id').references('id').inTable('members').unique().notNullable();
      t.string('primary_goal').defaultTo('stay_fit'); // lose_weight, build_muscle, stay_fit
      t.boolean('is_onboarded').defaultTo(false);
      t.boolean('biometric_enabled').defaultTo(false);
      t.text('biometric_credential_id');
      t.string('health_sync_provider'); // google_fit, apple_health, null
      t.integer('daily_step_goal').defaultTo(8000);
      t.integer('current_weight_grams');
      t.integer('target_weight_grams');
      t.integer('height_cm');
      t.timestamp('onboarded_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('trainer_sessions', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('trainer_id').notNullable();
      t.uuid('member_id').references('id').inTable('members').notNullable();
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.date('session_date').notNullable();
      t.time('start_time').notNullable();
      t.time('end_time');
      t.string('session_type').defaultTo('pt'); // pt, group, assessment
      t.string('status').defaultTo('scheduled'); // scheduled, completed, cancelled, no_show
      t.text('notes');
      t.integer('rating');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('transformation_photos', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('member_id').references('id').inTable('members').notNullable();
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.string('image_url').notNullable();
      t.string('placeholder_url');
      t.string('privacy').defaultTo('private'); // private, trainer, public
      t.string('category').defaultTo('progress'); // front, side, back, progress
      t.date('taken_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('member_achievements', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('member_id').references('id').inTable('members').notNullable();
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.string('achievement_type').notNullable();
      t.jsonb('metadata').defaultTo('{}');
      t.timestamp('earned_at').defaultTo(knex.fn.now());
    })
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON member_profiles(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_trainer_sessions_trainer_date ON trainer_sessions(trainer_id, session_date)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_trainer_sessions_member ON trainer_sessions(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_trainer_sessions_gym ON trainer_sessions(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_transformation_photos_member ON transformation_photos(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_member_achievements_member ON member_achievements(member_id)'));
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('member_achievements')
    .dropTableIfExists('transformation_photos')
    .dropTableIfExists('trainer_sessions')
    .dropTableIfExists('member_profiles');
}
