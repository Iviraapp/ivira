import * as conciergeService from '../services/concierge.service.js';

const listFacilitiesSchema = {
  querystring: {
    type: 'object',
    properties: {
      discipline: { type: 'string', enum: ['mma', 'yoga', 'boxing', 'crossfit', 'kickboxing', 'strength', 'functional'] },
      city: { type: 'string' },
      lat: { type: 'number', minimum: -90, maximum: 90 },
      lng: { type: 'number', minimum: -180, maximum: 180 },
      radius_km: { type: 'number', minimum: 1, maximum: 100, default: 10 },
      sort: { type: 'string', enum: ['rating', 'distance', 'price'], default: 'rating' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    },
  },
};

const createInquirySchema = {
  body: {
    type: 'object',
    required: ['name', 'phone'],
    properties: {
      facility_id: { type: 'string', format: 'uuid' },
      facility_name: { type: 'string', maxLength: 200 },
      facility_place_id: { type: 'string', maxLength: 200 },
      name: { type: 'string', minLength: 2, maxLength: 100 },
      phone: { type: 'string', minLength: 10, maxLength: 15 },
      email: { type: 'string', format: 'email' },
      discipline: { type: 'string' },
      inquiry_type: { type: 'string', enum: ['contact', 'trial', 'callback', 'general'] },
      source: { type: 'string', maxLength: 50 },
      message: { type: 'string', maxLength: 1000 },
    },
  },
};

export default async function conciergeRoutes(fastify) {
  // GET /concierge/facilities — list facilities with filters
  fastify.get('/concierge/facilities', { schema: listFacilitiesSchema }, async (request, reply) => {
    const { discipline, city, lat, lng, radius_km, sort, page, limit } = request.query;
    const result = await conciergeService.listFacilities({
      discipline,
      city,
      lat,
      lng,
      radiusKm: radius_km,
      sort,
      page,
      limit,
    });
    return reply.send(result);
  });

  // GET /concierge/facilities/:facilityId — detailed facility info
  fastify.get('/concierge/facilities/:facilityId', async (request, reply) => {
    const facility = await conciergeService.getFacility(request.params.facilityId);
    if (!facility) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Facility not found' });
    }
    return reply.send(facility);
  });

  // GET /concierge/disciplines — list available disciplines with city counts
  fastify.get('/concierge/disciplines', async (request, reply) => {
    const disciplines = await conciergeService.listDisciplines();
    return reply.send({ disciplines });
  });

  // POST /concierge/inquiries — create an inquiry/lead
  fastify.post('/concierge/inquiries', { schema: createInquirySchema }, async (request, reply) => {
    const inquiry = await conciergeService.createInquiry(request.body);
    return reply.code(201).send(inquiry);
  });
}
