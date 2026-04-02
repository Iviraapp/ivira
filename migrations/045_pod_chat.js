/**
 * Pod Chat — 'message' type is already supported by pod_feed's text column.
 * This migration is a no-op since pod_feed.type is VARCHAR, not an enum.
 */
export async function up(knex) {
  // pod_feed.type is a text/varchar column — 'message' value works without schema change
  return Promise.resolve()
}

export function down(knex) {
  return knex('pod_feed').where('type', 'message').del()
}
