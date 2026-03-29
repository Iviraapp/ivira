/**
 * Open Squads — make gym_id nullable on pods table so B2C users
 * (without a gym) can create and join squads.
 */
export function up(knex) {
  return knex.schema.alterTable('pods', (t) => {
    t.uuid('gym_id').nullable().alter()
  })
}

export function down(knex) {
  return knex.schema.alterTable('pods', (t) => {
    t.uuid('gym_id').notNullable().alter()
  })
}
