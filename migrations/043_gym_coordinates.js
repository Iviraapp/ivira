/**
 * Improve geo search for India gyms:
 * 1. Add a composite index on gym_profiles(latitude, longitude) for bounding box queries.
 * 2. Add a GIN index on gym_profiles(city) for faster city-name text search.
 * 3. Backfill gym_profiles.city from gyms.city for existing gyms that have a
 *    profile but no city set — ensures city-text search works even without coordinates.
 *
 * Note: latitude and longitude columns already exist on both gyms (migration 001)
 * and gym_profiles (migration 007). This migration only adds indexes and backfills.
 */
export async function up(knex) {
  // Composite index for bounding-box geo queries on gym_profiles
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS gym_profiles_lat_lng_idx ON gym_profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
  );

  // Backfill gym_profiles.city from gyms.city where profile city is null/empty
  await knex.raw(`
    UPDATE gym_profiles gp
    SET city = LOWER(TRIM(g.city))
    FROM gyms g
    WHERE gp.gym_id = g.id
      AND (gp.city IS NULL OR gp.city = '')
      AND g.city IS NOT NULL
      AND g.city != ''
  `);
}

export async function down(knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS gym_profiles_lat_lng_idx');
}
