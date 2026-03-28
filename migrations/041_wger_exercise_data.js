/**
 * Add wger exercise library fields to exercises table.
 * Stores wger IDs, images, muscles, and rich descriptions so the app
 * can display exercise illustrations and targeted muscle groups.
 */
export function up(knex) {
  return knex.schema.alterTable('exercises', t => {
    t.integer('wger_id').unique();                    // wger exercise ID for dedup
    t.string('image_url');                            // Primary exercise image
    t.string('image_url_secondary');                  // Secondary image (end position)
    t.string('video_url');                            // Demo video URL
    t.jsonb('muscles_primary').defaultTo('[]');       // [{id, name, image_url_front, image_url_back}]
    t.jsonb('muscles_secondary').defaultTo('[]');     // Same structure
    t.text('description_html');                       // Rich HTML description from wger
    t.jsonb('aliases').defaultTo('[]');               // Alternative names
  });
}

export function down(knex) {
  return knex.schema.alterTable('exercises', t => {
    t.dropColumn('wger_id');
    t.dropColumn('image_url');
    t.dropColumn('image_url_secondary');
    t.dropColumn('video_url');
    t.dropColumn('muscles_primary');
    t.dropColumn('muscles_secondary');
    t.dropColumn('description_html');
    t.dropColumn('aliases');
  });
}
