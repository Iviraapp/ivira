export function up(knex) {
  return knex.schema.alterTable('gyms', (table) => {
    table.integer('gps_radius_meters').defaultTo(150);
  });
}

export function down(knex) {
  return knex.schema.alterTable('gyms', (table) => {
    table.dropColumn('gps_radius_meters');
  });
}
