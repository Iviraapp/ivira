import knex from 'knex';
import config from './index.js';

const db = knex({
  client: 'pg',
  connection: config.db.url,
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
});

export default db;
