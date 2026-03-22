/**
 * Add google_place_id to gym_profiles so we can match
 * Google Places results to local gyms for day pass purchases.
 */
export async function up(knex) {
  await knex.schema.alterTable('gym_profiles', (t) => {
    t.string('google_place_id').nullable().unique();
    t.index('google_place_id');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('gym_profiles', (t) => {
    t.dropIndex('google_place_id');
    t.dropColumn('google_place_id');
  });
}
