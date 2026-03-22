import { createClient } from 'redis';
import config from './index.js';

const redis = createClient({ url: config.redis.url });

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

export async function connectRedis() {
  await redis.connect();
  return redis;
}

export default redis;
