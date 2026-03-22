export function up(knex) {
  return knex.schema
    .createTable('daily_nutrition_logs', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.uuid('member_id').references('id').inTable('members').notNullable();
      t.date('log_date').notNullable();
      t.text('meal_type').notNullable(); // breakfast, lunch, dinner, snack
      t.text('raw_input');
      t.jsonb('items').defaultTo('[]');
      t.integer('total_calories').defaultTo(0);
      t.integer('total_protein').defaultTo(0);
      t.integer('total_carbs').defaultTo(0);
      t.integer('total_fats').defaultTo(0);
      t.integer('total_fiber').defaultTo(0);
      t.text('source').defaultTo('manual'); // manual, barcode, ai
      t.text('barcode');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('daily_step_logs', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.uuid('member_id').references('id').inTable('members').notNullable();
      t.date('log_date').notNullable();
      t.integer('steps').defaultTo(0);
      t.integer('goal').defaultTo(10000);
      t.text('synced_from').defaultTo('manual'); // healthkit, googlefit, manual
      t.timestamp('synced_at');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.unique(['member_id', 'log_date']);
    })
    .createTable('nutrition_goals', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').references('id').inTable('gyms').notNullable();
      t.uuid('member_id').references('id').inTable('members').notNullable();
      t.text('goal_type').defaultTo('maintain'); // cut, bulk, maintain
      t.integer('calorie_goal').defaultTo(2000);
      t.integer('protein_goal').defaultTo(100);
      t.integer('carb_goal').defaultTo(250);
      t.integer('fat_goal').defaultTo(65);
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
      t.unique(['member_id']);
    })
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_nutrition_logs_member ON daily_nutrition_logs(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_nutrition_logs_gym ON daily_nutrition_logs(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_nutrition_logs_date ON daily_nutrition_logs(log_date)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_nutrition_logs_member_date ON daily_nutrition_logs(member_id, log_date)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_step_logs_member ON daily_step_logs(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_step_logs_gym ON daily_step_logs(gym_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_daily_step_logs_date ON daily_step_logs(log_date)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_nutrition_goals_member ON nutrition_goals(member_id)'))
    .then(() => knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_nutrition_goals_gym ON nutrition_goals(gym_id)'));
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('nutrition_goals')
    .dropTableIfExists('daily_step_logs')
    .dropTableIfExists('daily_nutrition_logs');
}
