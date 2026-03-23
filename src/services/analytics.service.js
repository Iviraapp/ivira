/**
 * First-party visitor analytics service
 * Handles visitor tracking, session management, and event recording
 */
import crypto from 'crypto'
import db from '../config/database.js'

// ── Helpers ─────────────────────────────────────────────────────
function hashIP(ip) {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip + 'ivira_salt_2026').digest('hex').slice(0, 16)
}

function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', browserVersion: '', os: 'Unknown', osVersion: '', deviceType: 'desktop' }

  // Device type
  let deviceType = 'desktop'
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet'
  else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) deviceType = 'mobile'

  // Browser
  let browser = 'Unknown', browserVersion = ''
  if (/edg\//i.test(ua))        { browser = 'Edge';    browserVersion = ua.match(/edg\/([\d.]+)/i)?.[1] || '' }
  else if (/opr\//i.test(ua))   { browser = 'Opera';   browserVersion = ua.match(/opr\/([\d.]+)/i)?.[1] || '' }
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) { browser = 'Chrome'; browserVersion = ua.match(/chrome\/([\d.]+)/i)?.[1] || '' }
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua))   { browser = 'Safari'; browserVersion = ua.match(/version\/([\d.]+)/i)?.[1] || '' }
  else if (/firefox\//i.test(ua)) { browser = 'Firefox'; browserVersion = ua.match(/firefox\/([\d.]+)/i)?.[1] || '' }

  // OS
  let os = 'Unknown', osVersion = ''
  if (/windows nt/i.test(ua))          { os = 'Windows';  osVersion = ua.match(/windows nt ([\d.]+)/i)?.[1] || '' }
  else if (/mac os x/i.test(ua))       { os = 'macOS';    osVersion = (ua.match(/mac os x ([\d_]+)/i)?.[1] || '').replace(/_/g, '.') }
  else if (/android/i.test(ua))        { os = 'Android';  osVersion = ua.match(/android ([\d.]+)/i)?.[1] || '' }
  else if (/iphone|ipad|ipod/i.test(ua)) { os = 'iOS';   osVersion = (ua.match(/os ([\d_]+)/i)?.[1] || '').replace(/_/g, '.') }
  else if (/linux/i.test(ua))          { os = 'Linux';    osVersion = '' }

  return { browser, browserVersion, os, osVersion, deviceType }
}

// ── Core Functions ──────────────────────────────────────────────

/**
 * Ensure visitor record exists, return it
 */
async function ensureVisitor(visitorId, { referrer, utmSource, utmMedium, utmCampaign, deviceType, browser, os, country, city } = {}) {
  let visitor = await db('visitors').where('visitor_id', visitorId).first()

  if (!visitor) {
    const [created] = await db('visitors').insert({
      visitor_id: visitorId,
      first_referrer: referrer || null,
      first_utm_source: utmSource || null,
      first_utm_medium: utmMedium || null,
      first_utm_campaign: utmCampaign || null,
      first_device_type: deviceType || null,
      first_browser: browser || null,
      first_os: os || null,
      first_country: country || null,
      first_city: city || null,
    }).returning('*')
    return created
  }

  // Update last seen
  await db('visitors').where('visitor_id', visitorId).update({
    last_seen_at: db.fn.now(),
  })

  return visitor
}

/**
 * Ensure session record exists, return it
 */
async function ensureSession(sessionId, visitorId, { referrer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, landingPage, deviceType, browser, browserVersion, os, osVersion, screenWidth, screenHeight, country, city, ipHash, userId } = {}) {
  let session = await db('sessions').where('session_id', sessionId).first()

  if (!session) {
    // Increment visitor session count
    await db('visitors').where('visitor_id', visitorId).increment('total_sessions', 1)

    const [created] = await db('sessions').insert({
      session_id: sessionId,
      visitor_id: visitorId,
      user_id: userId || null,
      referrer: referrer || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      utm_term: utmTerm || null,
      utm_content: utmContent || null,
      landing_page: landingPage || null,
      device_type: deviceType || null,
      browser: browser || null,
      browser_version: browserVersion || null,
      os: os || null,
      os_version: osVersion || null,
      screen_width: screenWidth || null,
      screen_height: screenHeight || null,
      country: country || null,
      city: city || null,
      ip_hash: ipHash || null,
    }).returning('*')
    return created
  }

  // Update last activity
  await db('sessions').where('session_id', sessionId).update({
    last_activity_at: db.fn.now(),
    user_id: userId || session.user_id,
  })

  return session
}

/**
 * Record a visitor event
 */
export async function recordEvent({ visitorId, sessionId, userId, eventName, pageUrl, pagePath, referrer, deviceType, browser, os, metadata, ip, userAgent, screenWidth, screenHeight, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, country, city }) {
  if (!visitorId || !sessionId || !eventName) {
    throw new Error('visitor_id, session_id, and event_name are required')
  }

  // Parse user agent if provided
  const parsed = parseUserAgent(userAgent)
  const finalDeviceType = deviceType || parsed.deviceType
  const finalBrowser = browser || parsed.browser
  const finalOs = os || parsed.os

  const ipHash = hashIP(ip)

  // Ensure visitor & session exist (upsert)
  await ensureVisitor(visitorId, {
    referrer, utmSource, utmMedium, utmCampaign,
    deviceType: finalDeviceType, browser: finalBrowser, os: finalOs,
    country, city,
  })

  await ensureSession(sessionId, visitorId, {
    referrer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent,
    landingPage: pageUrl,
    deviceType: finalDeviceType,
    browser: finalBrowser,
    browserVersion: parsed.browserVersion,
    os: finalOs,
    osVersion: parsed.osVersion,
    screenWidth, screenHeight,
    country, city,
    ipHash,
    userId,
  })

  // Insert event
  const [event] = await db('visitor_events').insert({
    visitor_id: visitorId,
    session_id: sessionId,
    user_id: userId || null,
    event_name: eventName,
    page_url: pageUrl || null,
    page_path: pagePath || null,
    referrer: referrer || null,
    device_type: finalDeviceType,
    browser: finalBrowser,
    os: finalOs,
    metadata: metadata ? JSON.stringify(metadata) : '{}',
  }).returning('*')

  // Update counters
  await db('visitors').where('visitor_id', visitorId).increment('total_events', 1)
  await db('sessions').where('session_id', sessionId).update({
    event_count: db.raw('event_count + 1'),
    page_count: eventName === 'page_view' ? db.raw('page_count + 1') : db.raw('page_count'),
    last_activity_at: db.fn.now(),
  })

  return event
}

/**
 * Batch record multiple events (for beacon/sendBeacon)
 */
export async function recordEvents(events) {
  const results = []
  for (const evt of events) {
    try {
      const result = await recordEvent(evt)
      results.push(result)
    } catch (e) {
      console.error('[Analytics] Failed to record event:', e.message)
    }
  }
  return results
}

/**
 * Link a visitor to a user (on login/signup)
 */
export async function linkVisitorToUser(visitorId, userId, userType) {
  await db('visitors').where('visitor_id', visitorId).update({
    user_id: userId,
    user_type: userType || 'member',
  })
  // Also update current session
  await db('sessions').where('visitor_id', visitorId).whereNull('user_id').update({
    user_id: userId,
  })
}

// ── Query Functions (for admin dashboard) ───────────────────────

/**
 * Get visitor analytics summary
 */
export async function getAnalyticsSummary({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const [visitors] = await db('visitors')
    .where('first_seen_at', '>=', since)
    .count('* as count')

  const [sessions] = await db('sessions')
    .where('started_at', '>=', since)
    .count('* as count')

  const [events] = await db('visitor_events')
    .where('timestamp', '>=', since)
    .count('* as count')

  const [pageViews] = await db('visitor_events')
    .where('event_name', 'page_view')
    .where('timestamp', '>=', since)
    .count('* as count')

  const topPages = await db('visitor_events')
    .select('page_path')
    .where('event_name', 'page_view')
    .where('timestamp', '>=', since)
    .groupBy('page_path')
    .orderByRaw('count(*) desc')
    .limit(10)
    .count('* as views')

  const topSources = await db('sessions')
    .select('utm_source')
    .where('started_at', '>=', since)
    .whereNotNull('utm_source')
    .groupBy('utm_source')
    .orderByRaw('count(*) desc')
    .limit(10)
    .count('* as sessions')

  const deviceBreakdown = await db('sessions')
    .select('device_type')
    .where('started_at', '>=', since)
    .groupBy('device_type')
    .count('* as count')

  const browserBreakdown = await db('sessions')
    .select('browser')
    .where('started_at', '>=', since)
    .groupBy('browser')
    .orderByRaw('count(*) desc')
    .limit(5)
    .count('* as count')

  return {
    period: { days, since },
    totals: {
      visitors: parseInt(visitors.count),
      sessions: parseInt(sessions.count),
      events: parseInt(events.count),
      pageViews: parseInt(pageViews.count),
    },
    topPages,
    topSources,
    deviceBreakdown,
    browserBreakdown,
  }
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const funnelSteps = [
    'page_view',
    'find_gym_opened',
    'gym_viewed',
    'buy_pass_clicked',
    'checkout_started',
    'payment_completed',
  ]

  const funnel = []
  for (const step of funnelSteps) {
    const [result] = await db('visitor_events')
      .where('event_name', step)
      .where('timestamp', '>=', since)
      .countDistinct('visitor_id as unique_visitors')
    funnel.push({
      step,
      uniqueVisitors: parseInt(result.unique_visitors),
    })
  }

  return funnel
}

/**
 * Get daily event counts for charting
 */
export async function getDailyEvents({ days = 30, eventName } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let query = db('visitor_events')
    .select(db.raw("date_trunc('day', timestamp) as day"))
    .where('timestamp', '>=', since)
    .groupByRaw("date_trunc('day', timestamp)")
    .orderBy('day')
    .count('* as count')
    .countDistinct('visitor_id as unique_visitors')

  if (eventName) {
    query = query.where('event_name', eventName)
  }

  return query
}

export default {
  recordEvent,
  recordEvents,
  linkVisitorToUser,
  getAnalyticsSummary,
  getConversionFunnel,
  getDailyEvents,
}
