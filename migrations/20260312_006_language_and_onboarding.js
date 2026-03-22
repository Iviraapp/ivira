/**
 * Add preferred_language and onboarding_step to gyms table
 */
export function up(knex) {
  return knex.schema.alterTable('gyms', (t) => {
    t.string('preferred_language', 5).notNullable().defaultTo('en');
    t.integer('onboarding_step').notNullable().defaultTo(0);
  });
}

export function down(knex) {
  return knex.schema.alterTable('gyms', (t) => {
    t.dropColumn('preferred_language');
    t.dropColumn('onboarding_step');
  });
}
