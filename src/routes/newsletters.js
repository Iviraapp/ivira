import * as newsletterService from '../services/newsletter.service.js';
import db from '../config/database.js';

const sendSchema = {
  body: {
    type: 'object',
    properties: {
      template: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      customSubject: { type: 'string' },
      customBody: { type: 'string' },
      language: { type: 'string', enum: ['en', 'hi', 'te', 'ta', 'kn'] },
      recipients: { type: 'string' },
      individualEmails: { type: 'array', items: { type: 'string', format: 'email' } },
      isHtml: { type: 'boolean' },
      cc: { type: 'array', items: { type: 'string' } },
      bcc: { type: 'array', items: { type: 'string' } },
      replyTo: { type: 'string' },
      fromName: { type: 'string' },
      scheduledAt: { type: 'string' },
    },
  },
};

export default async function newsletterRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Get available templates (with optional language)
  fastify.get('/gyms/:gymId/newsletters/templates', authHooks, async (request) => {
    const lang = request.query.lang || 'en';
    return { templates: newsletterService.getTemplates(lang) };
  });

  // Get supported languages
  fastify.get('/gyms/:gymId/newsletters/languages', authHooks, async () => {
    return { languages: newsletterService.getSupportedLanguages() };
  });

  // Generate AI content
  fastify.post('/gyms/:gymId/newsletters/generate', {
    schema: {
      body: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string', minLength: 3 },
          tone: { type: 'string', enum: ['friendly', 'professional', 'motivational', 'urgent'] },
        },
      },
    },
    ...authHooks,
  }, async (request) => {
    return newsletterService.generateAIContent(request.params.gymId, request.body);
  });

  // Send newsletter
  fastify.post('/gyms/:gymId/newsletters/send', { schema: sendSchema, ...authHooks }, async (request) => {
    return newsletterService.sendNewsletter(request.params.gymId, request.body);
  });

  // Send test email to the logged-in user
  fastify.post('/gyms/:gymId/newsletters/test', { schema: sendSchema, ...authHooks }, async (request) => {
    const gym = await db('gyms').where({ id: request.params.gymId }).first();
    if (!gym) return { error: 'Gym not found' };
    // Use owner_email from the gyms table, or the email from the JWT token
    const ownerEmail = gym.owner_email || request.user?.email;
    if (!ownerEmail) return { error: 'No email configured for your account. Update your gym profile with an owner email.' };
    return newsletterService.sendNewsletter(request.params.gymId, {
      ...request.body,
      recipients: 'individual',
      individualEmails: [ownerEmail],
    });
  });

  // Get recipient counts for all types
  fastify.get('/gyms/:gymId/newsletters/recipient-counts', authHooks, async (request) => {
    const gymId = request.params.gymId;

    const [allResult] = await db('members')
      .where({ gym_id: gymId })
      .whereNotNull('email').where('email', '!=', '')
      .count();

    const [activeResult] = await db('members')
      .where({ gym_id: gymId, status: 'active' })
      .whereNotNull('email').where('email', '!=', '')
      .count();

    const inWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const [expiringResult] = await db('members')
      .where({ gym_id: gymId, status: 'active' })
      .whereNotNull('email').where('email', '!=', '')
      .whereIn('id', function () {
        this.select('member_id').from('memberships')
          .where({ gym_id: gymId, status: 'active' })
          .whereBetween('end_date', [today, inWeek]);
      })
      .count();

    return {
      all: parseInt(allResult.count, 10),
      active: parseInt(activeResult.count, 10),
      expiring: parseInt(expiringResult.count, 10),
    };
  });

  // List sent newsletters
  fastify.get('/gyms/:gymId/newsletters', authHooks, async (request) => {
    const { page, limit } = request.query;
    return newsletterService.getNewsletters(request.params.gymId, { page, limit });
  });
}
