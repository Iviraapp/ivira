import db from '../config/database.js';
import * as kioskService from '../services/kiosk.service.js';

export default async function kioskRoutes(fastify) {
  // GET /kiosk/:gymId/members - Download active members for offline mode
  fastify.get('/kiosk/:gymId/members', async (request) => {
    const { gymId } = request.params;
    const members = await kioskService.getActiveMembers(gymId);
    return { members, synced_at: new Date().toISOString() };
  });

  // POST /kiosk/:gymId/sync - Sync offline check-ins
  fastify.post('/kiosk/:gymId/sync', async (request) => {
    const { gymId } = request.params;
    const { checkins } = request.body;
    const result = await kioskService.syncCheckins(gymId, checkins);
    return result;
  });

  // POST /kiosk/:gymId/heartbeat - Kiosk heartbeat
  fastify.post('/kiosk/:gymId/heartbeat', async (request) => {
    const { gymId } = request.params;
    const { deviceId, deviceInfo } = request.body;
    const result = await kioskService.recordHeartbeat(gymId, deviceId, deviceInfo);
    return result;
  });

  // GET /kiosk/:gymId/ads - Get active ads for kiosk
  fastify.get('/kiosk/:gymId/ads', async (request) => {
    const { gymId } = request.params;
    const gym = await db('gyms').where({ id: gymId }).select('city').first();
    const { getActiveAds } = await import('../services/ad-campaign.service.js');
    const ads = await getActiveAds(gym?.city, null);
    return { ads };
  });
}
