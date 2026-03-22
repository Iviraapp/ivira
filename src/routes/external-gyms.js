import * as googlePlaces from '../services/google-places.service.js';
import * as discoveryService from '../services/discovery.service.js';
import db from '../config/database.js';
import config from '../config/index.js';

export default async function externalGymRoutes(fastify) {
  // ─── Public routes (no auth needed) ───────────────────────────

  // Match a Google place_id to a local gym — returns day pass info if available
  fastify.get('/external/gyms/match/:placeId', async (request) => {
    const { placeId } = request.params;

    const profile = await db('gym_profiles')
      .where({ google_place_id: placeId, is_listed: true })
      .first();

    if (!profile) {
      return { matched: false };
    }

    const gym = await db('gyms').where({ id: profile.gym_id }).first();

    return {
      matched: true,
      gym_id: profile.gym_id,
      gym_name: gym?.gym_name || '',
      accepts_day_pass: !!profile.accepts_day_pass,
      day_pass_paise: profile.day_pass_paise || 0,
    };
  });

  // Purchase day pass for a matched Google Places gym
  fastify.post('/external/gyms/match/:placeId/day-pass', async (request, reply) => {
    const { placeId } = request.params;
    const { buyerName, buyerPhone, validDate } = request.body || {};

    const profile = await db('gym_profiles')
      .where({ google_place_id: placeId, is_listed: true, accepts_day_pass: true })
      .first();

    if (!profile) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'This gym does not accept day passes through IVIRA',
      });
    }

    const result = await discoveryService.purchaseDayPass(profile.gym_id, {
      buyerName,
      buyerPhone,
      validDate,
    });

    return reply.code(201).send(result);
  });

  // Nearby gym search via Google Places
  fastify.get('/external/gyms/nearby', async (request, reply) => {
    if (!config.googlePlaces.enabled) {
      return reply.code(503).send({
        error: 'GOOGLE_PLACES_DISABLED',
        message: 'Google Places API is not configured',
      });
    }

    const { lat, lng, radius, pageToken } = request.query;

    if (!lat || !lng) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'lat and lng query params are required',
      });
    }

    const result = await googlePlaces.searchNearbyGyms({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius, 10) || 5000,
      pageToken,
    });

    return result;
  });

  // Text search for gyms (fallback when no geolocation)
  fastify.get('/external/gyms/search', async (request, reply) => {
    if (!config.googlePlaces.enabled) {
      return reply.code(503).send({
        error: 'GOOGLE_PLACES_DISABLED',
        message: 'Google Places API is not configured',
      });
    }

    const { query, lat, lng } = request.query;

    if (!query) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'query param is required',
      });
    }

    const result = await googlePlaces.textSearchGyms({
      query,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    });

    return result;
  });

  // Place details
  fastify.get('/external/gyms/:placeId', async (request, reply) => {
    if (!config.googlePlaces.enabled) {
      return reply.code(503).send({
        error: 'GOOGLE_PLACES_DISABLED',
        message: 'Google Places API is not configured',
      });
    }

    const details = await googlePlaces.getPlaceDetails(request.params.placeId);
    return details;
  });

  // Photo proxy — keeps API key server-side
  // New Places API photo names have slashes: "places/PLACE_ID/photos/PHOTO_REF"
  // so we use a wildcard to capture the full path
  fastify.get('/external/gyms/photos/*', async (request, reply) => {
    if (!config.googlePlaces.enabled) {
      return reply.code(503).send({
        error: 'GOOGLE_PLACES_DISABLED',
        message: 'Google Places API is not configured',
      });
    }

    const photoName = request.params['*'];
    if (!photoName) {
      return reply.code(400).send({ error: 'Photo reference is required' });
    }

    const maxWidth = parseInt(request.query.maxwidth, 10) || 400;
    const photoUrl = googlePlaces.getPhotoUrl(photoName, maxWidth);

    // New API with skipHttpRedirect returns JSON with photoUri
    const metaRes = await fetch(photoUrl);
    if (!metaRes.ok) {
      return reply.code(metaRes.status).send({ error: 'Failed to fetch photo' });
    }

    const meta = await metaRes.json();
    const imageUrl = meta.photoUri;

    if (!imageUrl) {
      return reply.code(404).send({ error: 'Photo not found' });
    }

    // Fetch actual image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return reply.code(imgRes.status).send({ error: 'Failed to fetch photo image' });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    reply
      .header('Content-Type', contentType)
      .header('Cache-Control', 'public, max-age=86400')
      .send(buffer);
  });
}
