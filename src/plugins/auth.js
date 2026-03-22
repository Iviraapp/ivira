import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

let firebaseInitialized = false;

async function initFirebase() {
  if (firebaseInitialized) return;
  const admin = (await import('firebase-admin')).default;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
  });
  firebaseInitialized = true;
}

async function authPlugin(fastify) {
  if (config.firebase.enabled) {
    await initFirebase();
  } else {
    fastify.log.warn('Firebase not configured — using JWT-only auth (email OTP)');
  }

  fastify.decorate('verifyToken', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    // Try JWT first (email OTP login)
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      // JWT from email OTP login has { gymId, email, role }
      request.user = { gymId: decoded.gymId, email: decoded.email, role: decoded.role, memberId: decoded.memberId };
      return;
    } catch {
      // Not a valid JWT — fall through to Firebase
    }

    // Try Firebase if configured
    if (config.firebase.enabled) {
      try {
        const admin = (await import('firebase-admin')).default;
        const decoded = await admin.auth().verifyIdToken(token);
        request.user = decoded;
        return;
      } catch {
        // Invalid Firebase token
      }
    }

    return reply.code(401).send({ error: 'Invalid or expired token' });
  });

  // Decorator to check if user owns the gym they're accessing
  fastify.decorate('verifyGymOwner', async (request, reply) => {
    const { gymId } = request.params;
    if (!gymId) return;

    let gym;

    // JWT-based auth (email OTP): user has gymId directly
    if (request.user.gymId) {
      if (request.user.gymId !== gymId) {
        return reply.code(403).send({ error: 'You do not have access to this gym' });
      }
      gym = await fastify.db('gyms').where({ id: gymId }).first();
    } else {
      // Firebase-based auth: match by firebase UID
      gym = await fastify.db('gyms')
        .where({ id: gymId, owner_firebase_uid: request.user.uid })
        .first();
    }

    if (!gym) {
      return reply.code(403).send({ error: 'You do not have access to this gym' });
    }
    request.gym = gym;
  });

  // Decorator to check if authenticated member matches the memberId in the URL
  fastify.decorate('verifyMember', async (request, reply) => {
    const { memberId } = request.params;
    if (!memberId) return;

    // If route has memberId param, verify the authenticated member matches
    if (request.user.role === 'member' && request.user.memberId && request.user.memberId !== memberId) {
      return reply.code(403).send({ error: 'You can only access your own data' });
    }

    // For gym owners (non-member role), allow access to any member's data
  });
}

export default fp(authPlugin, { name: 'auth' });
