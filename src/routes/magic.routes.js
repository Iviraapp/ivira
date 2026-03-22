import * as magicLinkService from '../services/magic-link.service.js';

export default async function magicRoutes(fastify) {
  // POST /auth/magic-link - Request a magic link
  fastify.post('/auth/magic-link', async (request, reply) => {
    const { email, role } = request.body;
    if (!email) return reply.code(400).send({ error: 'Email is required' });

    try {
      const result = await magicLinkService.createMagicLink(email, role || 'owner');
      return { message: 'Magic link sent to your email', expiresAt: result.expiresAt };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // GET /auth/magic/:token - Verify magic link
  fastify.get('/auth/magic/:token', async (request, reply) => {
    try {
      const result = await magicLinkService.verifyMagicLink(request.params.token);
      // Redirect to appropriate page with token
      if (result.role === 'owner') {
        return reply.redirect(`/login?token=${result.token}&gym=${result.gym.id}`);
      }
      return reply.redirect(`/member/${result.member.gym_id}?verified=true`);
    } catch (err) {
      return reply.redirect('/login?error=invalid_link');
    }
  });
}
