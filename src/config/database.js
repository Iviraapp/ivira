import knex from 'knex';
import config from './index.js';

const db = knex({
  client: 'pg',
  connection: config.db.url,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    // Statement timeout: abort any query running longer than 30 seconds
    afterCreate(conn, done) {
      conn.query('SET statement_timeout = 30000;', (err) => done(err, conn));
    },
  },
  acquireConnectionTimeout: 30000,
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
});

export default db;
