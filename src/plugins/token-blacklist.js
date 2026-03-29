/**
 * Redis-based JWT token blacklist.
 * Used to invalidate tokens on logout or account compromise
 * without waiting for expiry.
 */
import fp from 'fastify-plugin';
import redis from '../config/redis.js';
import config from '../config/index.js';

const PREFIX = 'token:blacklist:';
const DEFAULT_TTL = 60 * 60 * 24 * 7; // 7 days

async function tokenBlacklistPlugin(fastify) {
  fastify.decorate('blacklistToken', async (token, ttlSeconds = DEFAULT_TTL) => {
    if (!config.features.tokenBlacklist) return; // Feature flag off — skip
    try {
      if (!redis) return; // Redis not available — skip silently
      await redis.set(`${PREFIX}${token}`, '1', { EX: ttlSeconds });
    } catch (err) {
      fastify.log.warn({ err }, 'Failed to blacklist token — Redis unavailable');
    }
  });

  fastify.decorate('isTokenBlacklisted', async (token) => {
    if (!config.features.tokenBlacklist) return false; // Feature flag off — skip
    try {
      if (!redis) return false;
      const val = await redis.get(`${PREFIX}${token}`);
      return val === '1';
    } catch {
      return false; // Fail open — Redis outage should not lock everyone out
    }
  });
}

export default fp(tokenBlacklistPlugin, { name: 'token-blacklist' });
