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
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
