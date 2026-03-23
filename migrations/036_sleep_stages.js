/**
 * Add advanced sleep tracking fields — sleep stages, efficiency, audio events.
 * Supports the IVIRA Sleep Engine (accelerometer + audio based tracking).
 */
export function up(knex) {
  return knex.schema.alterTable('sleep_logs', (table) => {
    // Sleep stage breakdown (minutes spent in each stage)
    table.integer('deep_minutes').nullable();
    table.integer('rem_minutes').nullable();
    table.integer('light_minutes').nullable();
    table.integer('awake_minutes').nullable();

    // Advanced metrics
    table.integer('efficiency').nullable();         // Sleep efficiency % (0-100)
    table.integer('onset_latency').nullable();       // Minutes to fall asleep
    table.integer('awakenings').nullable();           // Number of awakenings
    table.integer('sleep_cycles').nullable();         // Number of complete cycles

    // Audio event summary
    table.integer('snoring_minutes').nullable();
    table.integer('audio_events_count').nullable();

    // Full timeline data (JSONB for stage-by-stage and audio events)
    table.jsonb('stage_timeline').nullable();         // [{time, stage, energy}]
    table.jsonb('audio_events').nullable();           // [{time, type, level}]

    // Source of tracking data
    table.string('source', 30).nullable();           // 'manual', 'apple_health', 'health_connect', 'ivira_engine'
  });
}

export function down(knex) {
  return knex.schema.alterTable('sleep_logs', (table) => {
    table.dropColumn('deep_minutes');
    table.dropColumn('rem_minutes');
    table.dropColumn('light_minutes');
    table.dropColumn('awake_minutes');
    table.dropColumn('efficiency');
    table.dropColumn('onset_latency');
    table.dropColumn('awakenings');
    table.dropColumn('sleep_cycles');
    table.dropColumn('snoring_minutes');
    table.dropColumn('audio_events_count');
    table.dropColumn('stage_timeline');
    table.dropColumn('audio_events');
    table.dropColumn('source');
  });
}
