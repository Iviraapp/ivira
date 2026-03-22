export async function up(knex) {
  // Add height/weight to members table
  await knex.schema.alterTable('members', (t) => {
    t.decimal('height_cm', 5, 1).nullable();
    t.decimal('weight_kg', 5, 1).nullable();
    t.decimal('bmi', 4, 1).nullable();
    t.string('bmi_category', 20).nullable();
  });

  // Body stats history for trend tracking
  await knex.schema.createTable('body_stats_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').notNullable();
    t.decimal('height_cm', 5, 1).nullable();
    t.decimal('weight_kg', 5, 1).nullable();
    t.decimal('bmi', 4, 1).nullable();
    t.string('bmi_category', 20).nullable();
    t.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['gym_id', 'member_id']);
    t.index(['member_id', 'recorded_at']);
  });

  // Member photos table
  await knex.schema.createTable('member_photos', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
    t.uuid('member_id').notNullable();
    t.string('type', 20).notNullable().defaultTo('progress'); // progress | profile
    t.text('url').notNullable();
    t.text('thumbnail_url').nullable();
    t.jsonb('metadata').nullable(); // dimensions, file size, etc.
    t.timestamp('taken_at').nullable();
    t.timestamps(true, true);
    t.index(['gym_id', 'member_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('member_photos');
  await knex.schema.dropTableIfExists('body_stats_log');
  await knex.schema.alterTable('members', (t) => {
    t.dropColumn('height_cm');
    t.dropColumn('weight_kg');
    t.dropColumn('bmi');
    t.dropColumn('bmi_category');
  });
}
