/**
 * Pod Chat — add 'message' type to pod_feed for in-pod messaging.
 * No new table needed; messages stored as pod_feed entries with type='message'
 * and data={ text, image_url? }.
 */
export async function up(knex) {
  // Add 'message' value to the pod_feed_type enum
  // Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL
  await knex.raw(`ALTER TYPE "pod_feed_type" ADD VALUE IF NOT EXISTS 'message'`)
}

export function down(knex) {
  // Enum values cannot be removed in PostgreSQL without recreating the type.
  // Clean up message data instead.
  return knex('pod_feed').where('type', 'message').del()
}
