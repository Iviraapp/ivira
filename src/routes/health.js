// ═══════════════════════════════════════════════════════════════════
// health.js — Enhanced health check
//
// Replace the existing GET /health handler with this.
// Shows exactly which integrations are configured so you can verify
// env vars are set correctly after Railway deploy.
// ═══════════════════════════════════════════════════════════════════

import db from '../config/database.js';
import config from '../config/index.js';

export default async function healthRoutes(fastify) {

  fastify.get('/health', async (request, reply) => {
    const checks = {};
    let dbOk = false;
    let redisOk = false;

    // Database ping
    try {
      await db.raw('SELECT 1');
      dbOk = true;
    } catch { dbOk = false; }

    // Redis ping
    try {
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      if (redis) {
        await redis.ping();
        redisOk = true;
      }
    } catch { redisOk = false; }

    checks.database  = dbOk    ? 'connected'    : 'ERROR — check DATABASE_URL';
    checks.redis     = redisOk ? 'connected'    : 'ERROR — check REDIS_URL';
    checks.deepseek  = config.deepseek?.enabled  ? 'configured' : 'missing DEEPSEEK_API_KEY';
    checks.anthropic = config.anthropic?.enabled  ? 'configured' : 'missing ANTHROPIC_API_KEY';
    checks.razorpay  = config.razorpay?.keyId     ? 'configured' : 'missing RAZORPAY_KEY_ID';
    checks.firebase  = config.firebase?.isAvailable ? 'configured' : 'missing FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY';
    checks.sms       = config.sms?.authKey        ? 'configured' : 'missing SMS_AUTH_KEY';
    checks.email     = config.email?.isAvailable   ? 'configured' : 'missing RESEND_API_KEY';
    checks.blob      = config.blob?.enabled        ? 'configured' : 'missing BLOB_READ_WRITE_TOKEN (photos use DB fallback)';
    checks.sentry    = process.env.SENTRY_DSN      ? 'configured' : 'missing SENTRY_DSN';
    checks.wati      = config.wati?.apiToken       ? 'configured' : 'missing WATI_API_TOKEN (WhatsApp disabled)';
    checks.stripe    = config.stripe?.enabled       ? 'configured' : 'missing STRIPE_SECRET_KEY (required for US/UAE/UK/AU gyms)';

    const critical = ['database', 'redis'];
    const hasErrors = critical.some(k => checks[k].startsWith('ERROR'));

    return reply
      .code(hasErrors ? 503 : 200)
      .send({
        status:      hasErrors ? 'degraded' : 'ok',
        version:     process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv,
        uptime:      Math.floor(process.uptime()),
        services:    checks,
      });
  });

  // Kubernetes-style liveness probe (no DB check — just "is the process alive")
  fastify.get('/ping', async () => ({ pong: true, ts: Date.now() }));
}
