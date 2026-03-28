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

    // Auto-sync wger exercise database if empty (runs once after first deploy)
    try {
      const knex = (await import('./config/database.js')).default;
      const [{ count }] = await knex('exercises').whereNotNull('wger_id').count('id as count');
      if (parseInt(count) === 0) {
        console.log('[wger-sync] No wger exercises found — starting initial sync...');
        const { syncExercises } = await import('./services/wger-sync.service.js');
        syncExercises(knex).then(r => {
          console.log(`[wger-sync] Initial sync complete: ${r.inserted} inserted`);
        }).catch(err => {
          console.warn('[wger-sync] Initial sync failed:', err?.message);
        });
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
