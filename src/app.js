import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1, // 10% of transactions
  enabled: !!process.env.SENTRY_DSN,
});

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import db from './config/database.js';
import { connectRedis } from './config/redis.js';
import authPlugin from './plugins/auth.js';
import permissionsPlugin from './plugins/permissions.js';
import trialGuardPlugin from './plugins/trial-guard.js';
import auditMiddlewarePlugin from './plugins/audit-middleware.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import gymRoutes from './routes/gyms.js';
import memberRoutes from './routes/members.js';
import checkinRoutes from './routes/checkins.js';
import paymentRoutes from './routes/payments.js';
import newsletterRoutes from './routes/newsletters.js';
import planRoutes from './routes/plans.js';
import affiliateRoutes from './routes/affiliate.js';
import classRoutes from './routes/classes.js';
import staffRoutes from './routes/staff.js';
import superadminRoutes from './routes/superadmin.js';
import discoveryRoutes from './routes/discovery.js';
import invoiceRoutes from './routes/invoices.js';
import churnRoutes from './routes/churn.js';
import sponsorRoutes from './routes/sponsors.js';
import trackingRoutes from './routes/tracking.js';
import externalGymRoutes from './routes/external-gyms.js';
import uploadRoutes from './routes/upload.js';
import pushRoutes from './routes/push.routes.js';
import accessRoutes from './routes/access.routes.js';
import subscriptionRoutes from './routes/subscriptions.js';
import supportRoutes from './routes/support.routes.js';
import platformRoutes from './routes/platform.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import nutritionRoutes from './routes/nutrition.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import sseRoutes from './routes/sse.js';
import memberProfileRoutes from './routes/member-profile.routes.js';
import trainerRoutes from './routes/trainer.routes.js';
import kioskRoutes from './routes/kiosk.routes.js';
import magicRoutes from './routes/magic.routes.js';
import healthOsRoutes from './routes/health.routes.js';
import adAnalyticsRoutes from './routes/ad-analytics.js';
import leaderboardRoutes from './routes/leaderboard.js';
import aiCoachRoutes from './routes/ai-coach.routes.js';
import workoutSessionRoutes from './routes/workout-session.routes.js';
import referralRoutes from './routes/referral.routes.js';
import challengeRoutes from './routes/challenges.routes.js';
import achievementRoutes from './routes/achievements.routes.js';
import recipeRoutes from './routes/recipes.routes.js';
import foodScanRoutes from './routes/food-scan.routes.js';
import sleepRoutes from './routes/sleep.routes.js';
import conciergeRoutes from './routes/concierge.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import financeRoutes from './routes/finance.routes.js';
import podRoutes from './routes/pods.routes.js';
import adminDashboardRoutes from './routes/admin-dashboard.routes.js';
import multipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';
import { startCronJobs } from './cron/scheduler.js';
import { AppError } from './utils/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp(opts = {}) {
  const fastify = Fastify({
    logger: {
      level: opts.logLevel || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    ...opts,
  });

  // CORS
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://app.ivira.app']
      : true,
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Cookie support
  await fastify.register(fastifyCookie);

  // Multipart file uploads
  await fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // WebSocket support (for kiosk remote unlock)
  await fastify.register(websocket);

  // Expose db on fastify instance for plugins
  fastify.decorate('db', db);

  // Connect Redis
  await connectRedis();

  // Auth plugin (Firebase token verification)
  await fastify.register(authPlugin);

  // Permissions plugin — exposes fastify.requireRole() decorator for staff routes
  await fastify.register(permissionsPlugin);

  // Trial guard — exposes fastify.verifyTrial decorator for owner routes
  await fastify.register(trialGuardPlugin);

  // Audit middleware — logs all mutating owner/staff requests to audit_logs
  await fastify.register(auditMiddlewarePlugin);

  // Serve static files (login page etc.)
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/',
  });

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(gymRoutes, { prefix: '/api/v1' });
  await fastify.register(memberRoutes, { prefix: '/api/v1' });
  await fastify.register(checkinRoutes, { prefix: '/api/v1' });
  await fastify.register(paymentRoutes, { prefix: '/api/v1' });
  await fastify.register(newsletterRoutes, { prefix: '/api/v1' });
  await fastify.register(planRoutes, { prefix: '/api/v1' });
  await fastify.register(affiliateRoutes, { prefix: '/api/v1' });
  await fastify.register(classRoutes, { prefix: '/api/v1' });
  await fastify.register(staffRoutes, { prefix: '/api/v1' });
  await fastify.register(superadminRoutes, { prefix: '/api/v1' });
  await fastify.register(discoveryRoutes, { prefix: '/api/v1' });
  await fastify.register(invoiceRoutes, { prefix: '/api/v1' });
  await fastify.register(churnRoutes, { prefix: '/api/v1' });
  await fastify.register(sponsorRoutes, { prefix: '/api/v1' });
  await fastify.register(trackingRoutes, { prefix: '/api/v1' });
  await fastify.register(externalGymRoutes, { prefix: '/api/v1' });
  await fastify.register(uploadRoutes, { prefix: '/api/v1' });
  await fastify.register(pushRoutes, { prefix: '/api/v1' });
  await fastify.register(accessRoutes, { prefix: '/api/v1' });
  await fastify.register(subscriptionRoutes, { prefix: '/api/v1' });
  await fastify.register(supportRoutes, { prefix: '/api/v1' });
  await fastify.register(platformRoutes, { prefix: '/api/v1' });
  await fastify.register(marketplaceRoutes, { prefix: '/api/v1' });
  await fastify.register(walletRoutes, { prefix: '/api/v1' });
  await fastify.register(nutritionRoutes, { prefix: '/api/v1' });
  await fastify.register(leadsRoutes, { prefix: '/api/v1' });
  await fastify.register(kioskRoutes, { prefix: '/api/v1/kiosk' });
  await fastify.register(magicRoutes, { prefix: '/api/v1' });
  await fastify.register(sseRoutes, { prefix: '/api/v1' });
  await fastify.register(memberProfileRoutes, { prefix: '/api/v1' });
  await fastify.register(trainerRoutes, { prefix: '/api/v1' });
  await fastify.register(healthOsRoutes, { prefix: '/api/v1' });
  await fastify.register(adAnalyticsRoutes, { prefix: '/api/v1' });
  await fastify.register(leaderboardRoutes, { prefix: '/api/v1' });
  await fastify.register(aiCoachRoutes, { prefix: '/api/v1' });
  await fastify.register(workoutSessionRoutes, { prefix: '/api/v1' });
  await fastify.register(referralRoutes, { prefix: '/api/v1' });
  await fastify.register(challengeRoutes, { prefix: '/api/v1' });
  await fastify.register(achievementRoutes, { prefix: '/api/v1' });
  await fastify.register(recipeRoutes, { prefix: '/api/v1' });
  await fastify.register(foodScanRoutes, { prefix: '/api/v1' });
  await fastify.register(sleepRoutes, { prefix: '/api/v1' });
  await fastify.register(conciergeRoutes, { prefix: '/api/v1' });
  await fastify.register(analyticsRoutes, { prefix: '/api/v1' });
  await fastify.register(financeRoutes, { prefix: '/api/v1' });
  await fastify.register(podRoutes, { prefix: '/api/v1' });
  await fastify.register(adminDashboardRoutes);
  // APK download route — serve locally if available, otherwise redirect to GitHub Release
  fastify.get('/downloads/ivira-latest.apk', async (request, reply) => {
    const fs = await import('fs');
    const filePath = join(__dirname, '..', 'public', 'downloads', 'ivira-latest.apk');
    const stat = fs.statSync(filePath, { throwIfNoEntry: false });
    // Only serve locally if the file is real (not a Git LFS pointer)
    if (stat && stat.size > 1000) {
      const stream = fs.createReadStream(filePath);
      return reply
        .header('Content-Type', 'application/vnd.android.package-archive')
        .header('Content-Disposition', 'attachment; filename="ivira-latest.apk"')
        .send(stream);
    }
    // Redirect to GitHub Release
    return reply.redirect('https://github.com/Iviraapp/ivira/releases/download/v1.0.0/ivira-latest.apk');
  });

  // Root-level redirect for affiliate click tracking (short URLs)
  fastify.get('/r/:clickToken', async (request, reply) => {
    const { trackClick } = await import('./services/affiliate.service.js');
    const url = await trackClick(request.params.clickToken);
    if (!url) return reply.code(404).send({ error: 'Link not found' });
    return reply.redirect(url);
  });

  // S2S Click tracking
  fastify.get('/track/:clickToken', async (request, reply) => {
    const { handleClick } = await import('./services/tracking.service.js');
    const url = await handleClick(request.params.clickToken, request.ip, request.headers['user-agent']);
    if (!url) return reply.code(404).send({ error: 'Invalid tracking link' });
    reply.setCookie('ivira_ck', request.params.clickToken, { maxAge: 2592000, path: '/' });
    return reply.redirect(url);
  });

  // S2S Postback receiver
  fastify.post('/postback', async (request, reply) => {
    const { handlePostback } = await import('./services/tracking.service.js');
    const { click_id, event, amount, status } = request.body || {};
    if (!click_id) return reply.code(400).send({ error: 'click_id required' });
    const result = await handlePostback(click_id, event, parseInt(amount) || 0, status);
    return reply.send({ status: 'ok', ...result });
  });

  // Health check is registered via healthRoutes plugin (routes/health.js)

  // Request correlation IDs
  fastify.addHook('onRequest', async (request) => {
    request.correlationId = request.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  })

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    if (error.statusCode >= 500 || !error.statusCode) {
      Sentry.captureException(error);
    }

    fastify.log.error(error);
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    });
  });

  // Start cron jobs
  fastify.addHook('onReady', () => {
    if (process.env.NODE_ENV !== 'test') {
      startCronJobs();
      fastify.log.info('Cron jobs started');
    }
  });

  return fastify;
}
