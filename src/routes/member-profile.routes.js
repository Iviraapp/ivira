import * as profileService from '../services/member-profile.service.js';
import eventBus from '../services/event-bus.service.js';

export default async function memberProfileRoutes(fastify) {
  // GET /member/profile/:memberId
  fastify.get('/member/profile/:memberId', async (request) => {
    return profileService.getProfile(request.params.memberId);
  });

  // PATCH /member/profile/:memberId
  fastify.patch('/member/profile/:memberId', async (request) => {
    const profile = await profileService.updateProfile(request.params.memberId, request.body);

    // Broadcast onboarding completion
    if (request.body.is_onboarded) {
      const member = await fastify.db('members').where({ id: request.params.memberId }).first();
      if (member) {
        eventBus.publish(member.gym_id, 'member_onboarded', {
          memberId: member.id, name: member.name, goal: request.body.primary_goal,
        });
      }
    }
    return profile;
  });

  // GET /member/photos/:memberId
  fastify.get('/member/photos/:memberId', async (request) => {
    const { visibility } = request.query; // 'all' or 'shared'
    return profileService.getTransformationPhotos(
      request.params.memberId,
      visibility === 'shared' ? 'trainer' : null
    );
  });

  // POST /member/photos/:memberId
  fastify.post('/member/photos/:memberId', async (request) => {
    const member = await fastify.db('members').where({ id: request.params.memberId }).first();
    const photo = await profileService.addTransformationPhoto(
      request.params.memberId,
      member?.gym_id,
      request.body
    );

    // Notify trainer if shared
    if (request.body.privacy === 'trainer' && member) {
      eventBus.publish(member.gym_id, 'transformation_uploaded', {
        memberId: member.id, name: member.name, category: request.body.category,
      });
    }
    return photo;
  });

  // GET /member/achievements/:memberId
  fastify.get('/member/achievements/:memberId', async (request) => {
    return profileService.getAchievements(request.params.memberId);
  });
}
