/**
 * Visitor analytics routes
 * POST /api/analytics/event       — record single event (public, no auth)
 * POST /api/analytics/events      — record batch events (beacon support)
 * POST /api/analytics/identify    — link visitor to user
 * GET  /api/analytics/summary     — admin summary (auth required)
 * GET  /api/analytics/funnel      — conversion funnel (auth required)
 * GET  /api/analytics/daily       — daily chart data (auth required)
 */
import { recordEvent, recordEvents, linkVisitorToUser, getAnalyticsSummary, getConversionFunnel, getDailyEvents } from '../services/analytics.service.js'

export default async function analyticsRoutes(fastify) {
  // ── Public: Record single event ─────────────────────────────
  fastify.post('/analytics/event', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['visitor_id', 'session_id', 'event_name'],
        properties: {
          visitor_id:    { type: 'string', maxLength: 64 },
          session_id:    { type: 'string', maxLength: 64 },
          user_id:       { type: 'string' },
          event_name:    { type: 'string', maxLength: 100 },
          page_url:      { type: 'string', maxLength: 2048 },
          page_path:     { type: 'string', maxLength: 500 },
          referrer:      { type: 'string', maxLength: 2048 },
          device_type:   { type: 'string', maxLength: 20 },
          browser:       { type: 'string', maxLength: 100 },
          os:            { type: 'string', maxLength: 100 },
          screen_width:  { type: 'integer' },
          screen_height: { type: 'integer' },
          utm_source:    { type: 'string', maxLength: 255 },
          utm_medium:    { type: 'string', maxLength: 255 },
          utm_campaign:  { type: 'string', maxLength: 255 },
          utm_term:      { type: 'string', maxLength: 255 },
          utm_content:   { type: 'string', maxLength: 255 },
          metadata:      { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body
    const event = await recordEvent({
      visitorId:   body.visitor_id,
      sessionId:   body.session_id,
      userId:      body.user_id || null,
      eventName:   body.event_name,
      pageUrl:     body.page_url,
      pagePath:    body.page_path,
      referrer:    body.referrer,
      deviceType:  body.device_type,
      browser:     body.browser,
      os:          body.os,
      screenWidth: body.screen_width,
      screenHeight:body.screen_height,
      utmSource:   body.utm_source,
      utmMedium:   body.utm_medium,
      utmCampaign: body.utm_campaign,
      utmTerm:     body.utm_term,
      utmContent:  body.utm_content,
      metadata:    body.metadata,
      ip:          request.ip,
      userAgent:   request.headers['user-agent'],
    })
    return { ok: true, event_id: event.id }
  })

  // ── Public: Batch events (for sendBeacon) ────────────────────
  fastify.post('/analytics/events', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            maxItems: 20,
            items: {
              type: 'object',
              required: ['visitor_id', 'session_id', 'event_name'],
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const ip = request.ip
    const userAgent = request.headers['user-agent']
    const enriched = request.body.events.map(evt => ({
      visitorId:   evt.visitor_id,
      sessionId:   evt.session_id,
      userId:      evt.user_id || null,
      eventName:   evt.event_name,
      pageUrl:     evt.page_url,
      pagePath:    evt.page_path,
      referrer:    evt.referrer,
      deviceType:  evt.device_type,
      browser:     evt.browser,
      os:          evt.os,
      metadata:    evt.metadata,
      ip,
      userAgent,
    }))
    const results = await recordEvents(enriched)
    return { ok: true, recorded: results.length }
  })

  // ── Public: Identify visitor → user link ─────────────────────
  fastify.post('/analytics/identify', {
    schema: {
      body: {
        type: 'object',
        required: ['visitor_id', 'user_id'],
        properties: {
          visitor_id: { type: 'string' },
          user_id:    { type: 'string' },
          user_type:  { type: 'string', enum: ['member', 'owner', 'trainer', 'admin'] },
        },
      },
    },
  }, async (request, reply) => {
    const { visitor_id, user_id, user_type } = request.body
    await linkVisitorToUser(visitor_id, user_id, user_type)
    return { ok: true }
  })

  // ── Admin: Analytics summary ─────────────────────────────────
  fastify.get('/analytics/summary', {
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const days = parseInt(request.query.days) || 30
    return getAnalyticsSummary({ days })
  })

  // ── Admin: Conversion funnel ─────────────────────────────────
  fastify.get('/analytics/funnel', {
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const days = parseInt(request.query.days) || 30
    return getConversionFunnel({ days })
  })

  // ── Admin: Daily chart data ──────────────────────────────────
  fastify.get('/analytics/daily', {
    preHandler: [fastify.verifyToken],
  }, async (request, reply) => {
    const days = parseInt(request.query.days) || 30
    const eventName = request.query.event || null
    return getDailyEvents({ days, eventName })
  })
}
