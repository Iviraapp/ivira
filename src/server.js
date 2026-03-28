import config from './config/index.js';
import { buildApp } from './app.js';

const start = async () => {
  try {
    // Run pending migrations on startup in production
    if (process.env.NODE_ENV === 'production') {
      const knex = (await import('./config/database.js')).default;
      console.log('Checking for pending migrations...');
      await knex.migrate.latest();
      console.log('Migrations up to date');
    }

    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    console.log(`IVIRA API running on http://${config.host}:${config.port}`);

    // Auto-sync wger exercise database if no exercises have images
    try {
      const knex = (await import('./config/database.js')).default;
      // Check if image_url column exists (migration 041)
      const hasImageCol = await knex.schema.hasColumn('exercises', 'image_url');
      if (hasImageCol) {
        const [{ count }] = await knex('exercises').whereNotNull('image_url').where('image_url', '!=', '').count('id as count');
        if (parseInt(count) < 10) {
          console.log(`[wger-sync] Only ${count} exercises have images — starting sync...`);
          const { syncExercises, syncFreeExerciseDB } = await import('./services/wger-sync.service.js');
          syncExercises(knex).then(r => {
            console.log(`[wger-sync] Sync complete: ${r.inserted} inserted, ${r.updated} updated`);
            return syncFreeExerciseDB(knex);
          }).then(r => {
            if (r) console.log(`[free-exercise-db] Sync complete: ${r.inserted} inserted`);
          }).catch(err => {
            console.warn('[wger-sync] Sync failed:', err?.message);
          });
        } else {
          console.log(`[wger-sync] ${count} exercises with images — sync not needed`);
        }
      } else {
        console.log('[wger-sync] image_url column not found — run migration 041 first');
      }
    } catch (err) {
      console.warn('[wger-sync] Auto-sync check failed:', err?.message);
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
