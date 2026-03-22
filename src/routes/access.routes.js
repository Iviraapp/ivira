import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import * as accessService from '../services/access.service.js';

const unlockSchema = {
  body: {
    type: 'object',
    required: ['deviceId'],
    properties: {
      deviceId: { type: 'string', minLength: 1 },
      memberId: { type: 'string', format: 'uuid' },
      duration: { type: 'number', minimum: 1, maximum: 60, default: 5 },
    },
  },
};

const lockSchema = {
  body: {
    type: 'object',
    required: ['deviceId'],
    properties: {
      deviceId: { type: 'string', minLength: 1 },
    },
  },
};

export default async function accessRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // WebSocket endpoint for kiosk connections
  // Kiosk authenticates via query param: ?token=JWT&deviceId=KIOSK-01
  fastify.get('/gyms/:gymId/access/ws', { websocket: true }, (socket, request) => {
    const { gymId } = request.params;
    const { token, deviceId } = request.query;

    // Authenticate the kiosk connection via JWT query param
    if (!token || !deviceId) {
      socket.send(JSON.stringify({ type: 'error', message: 'Missing token or deviceId' }));
      socket.close(4001, 'Missing token or deviceId');
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
      socket.close(4001, 'Invalid or expired token');
      return;
    }

    // Verify the token grants access to this gym
    if (decoded.gymId && decoded.gymId !== gymId) {
      socket.send(JSON.stringify({ type: 'error', message: 'Token does not match gym' }));
      socket.close(4003, 'Token does not match gym');
      return;
    }

    // Register kiosk connection
    socket._connectedAt = new Date().toISOString();
    accessService.registerKiosk(gymId, deviceId, socket);

    socket.send(JSON.stringify({
      type: 'connected',
      gymId,
      deviceId,
      timestamp: new Date().toISOString(),
    }));

    fastify.log.info({ gymId, deviceId }, 'Kiosk connected');

    // Handle incoming messages from kiosk (e.g., ack, status updates)
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Kiosk can report back results of unlock/lock commands
        if (msg.type === 'ack') {
          fastify.log.info({ gymId, deviceId, ackType: msg.action }, 'Kiosk acknowledged command');
        }

        if (msg.type === 'status') {
          fastify.log.info({ gymId, deviceId, status: msg.status }, 'Kiosk status update');
        }
      } catch {
        fastify.log.warn({ gymId, deviceId }, 'Invalid message from kiosk');
      }
    });

    socket.on('close', () => {
      accessService.unregisterKiosk(gymId, deviceId);
      fastify.log.info({ gymId, deviceId }, 'Kiosk disconnected');
    });

    socket.on('error', (err) => {
      fastify.log.error({ gymId, deviceId, err: err.message }, 'Kiosk WebSocket error');
      accessService.unregisterKiosk(gymId, deviceId);
    });
  });

  // Remote unlock
  fastify.post('/gyms/:gymId/access/unlock', { schema: unlockSchema, ...authHooks }, async (request, reply) => {
    const { gymId } = request.params;
    const { deviceId, memberId, duration } = request.body;
    const initiatedBy = request.user.email || request.user.uid || 'unknown';

    const log = await accessService.sendUnlockCommand(gymId, deviceId, {
      memberId,
      initiatedBy,
      duration: duration || 5,
    });

    return reply.code(200).send({ status: 'unlock_sent', log });
  });

  // Remote lock
  fastify.post('/gyms/:gymId/access/lock', { schema: lockSchema, ...authHooks }, async (request, reply) => {
    const { gymId } = request.params;
    const { deviceId } = request.body;
    const initiatedBy = request.user.email || request.user.uid || 'unknown';

    const log = await accessService.sendLockCommand(gymId, deviceId, { initiatedBy });

    return reply.code(200).send({ status: 'lock_sent', log });
  });

  // Access log history
  fastify.get('/gyms/:gymId/access/logs', authHooks, async (request) => {
    const { page, limit, action } = request.query;
    return accessService.getAccessLogs(request.params.gymId, { page, limit, action });
  });

  // List connected kiosks
  fastify.get('/gyms/:gymId/access/kiosks', authHooks, async (request) => {
    const kiosks = accessService.getConnectedKiosks(request.params.gymId);
    return { kiosks, count: kiosks.length };
  });
}
