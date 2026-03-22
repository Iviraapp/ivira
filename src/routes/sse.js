import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import eventBus from '../services/event-bus.service.js';

export default async function sseRoutes(fastify) {
  // GET /events/stream?token=xxx&gymId=xxx&filter=checkin,payment,transaction
  // filter param: comma-separated event types (optional, default: all)
  fastify.get('/events/stream', async (request, reply) => {
    const { token, gymId, filter } = request.query;
    if (!token || !gymId) {
      return reply.code(400).send({ error: 'token and gymId required' });
    }

    // Verify token
    let user;
    try {
      user = jwt.verify(token, config.jwt.secret);
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    // Parse optional event type filter
    const allowedTypes = filter ? filter.split(',').map((t) => t.trim()) : null;

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection event with server capabilities
    reply.raw.write(`data: ${JSON.stringify({
      type: 'connected',
      gymId,
      userId: user.uid || user.id,
      eventTypes: [
        'checkin', 'payment', 'transaction', 'booking', 'booking_cancelled',
        'member_onboarded', 'at_risk', 'milestone', 'fasting_milestone',
        'revenue_update', 'trainer_fee', 'affiliate_commission',
        'meal_logged', 'achievement', 'transformation_uploaded',
      ],
      filter: allowedTypes,
    })}\n\n`);

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      reply.raw.write(`:heartbeat\n\n`);
    }, 30000);

    // Subscribe to gym events with optional filtering
    const unsubscribe = eventBus.subscribeGym(gymId, (event) => {
      // Apply filter if specified
      if (allowedTypes && !allowedTypes.includes(event.type)) return;
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    // Cleanup on disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    // Prevent Fastify from closing the response
    await reply;
  });

  // GET /events/transaction-feed?token=xxx&gymId=xxx
  // Dedicated transaction feed for the financial dashboard
  fastify.get('/events/transaction-feed', async (request, reply) => {
    const { token, gymId } = request.query;
    if (!token || !gymId) {
      return reply.code(400).send({ error: 'token and gymId required' });
    }

    try {
      jwt.verify(token, config.jwt.secret);
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', feed: 'transactions', gymId })}\n\n`);

    const heartbeat = setInterval(() => {
      reply.raw.write(`:heartbeat\n\n`);
    }, 30000);

    const transactionTypes = ['payment', 'transaction', 'revenue_update', 'trainer_fee', 'affiliate_commission', 'booking'];

    const unsubscribe = eventBus.subscribeGym(gymId, (event) => {
      if (!transactionTypes.includes(event.type)) return;
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    await reply;
  });
}
