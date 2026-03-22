/**
 * Add gym-specific membership plans table and dunning tracking columns
 */
export function up(knex) {
  return knex.schema
    // Gym-specific membership plans (Monthly, Quarterly, Annual etc.)
    .createTable('gym_plans', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('gym_id').notNullable().references('gyms.id').onDelete('CASCADE');
      t.string('name').notNullable(); // "Monthly", "Quarterly", "Annual"
      t.integer('duration_months').notNullable();
      t.integer('price_paise').notNullable();
      t.text('description');
      t.boolean('active').defaultTo(true);
      t.timestamps(true, true);
      t.index(['gym_id', 'active']);
    })
    // Add dunning columns to memberships
    .alterTable('memberships', (t) => {
      t.integer('dunning_step').defaultTo(0); // 0=none, 1=day0, 2=day1, 3=day3, 4=day5, 5=day7
      t.timestamp('dunning_next_at').nullable();
      t.uuid('plan_id').nullable().references('gym_plans.id');
    })
    // Add plan_id to members for quick reference
    .alterTable('members', (t) => {
      t.uuid('current_plan_id').nullable().references('gym_plans.id');
    });
}

export function down(knex) {
  return knex.schema
    .alterTable('members', (t) => {
      t.dropColumn('current_plan_id');
    })
    .alterTable('memberships', (t) => {
      t.dropColumn('dunning_step');
      t.dropColumn('dunning_next_at');
      t.dropColumn('plan_id');
    })
    .dropTableIfExists('gym_plans');
}
