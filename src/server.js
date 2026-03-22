import config from './config/index.js';
import { buildApp } from './app.js';

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    console.log(`IVIRA API running on http://${config.host}:${config.port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
