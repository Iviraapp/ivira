/**
 * IVIRA First-Party Analytics — lightweight visitor tracking
 *
 * Generates visitor_id + session_id cookies, captures UTM params,
 * device info, and sends events to /api/analytics/event.
 * Respects cookie consent — no cookies set until user opts in.
 */

const COOKIE_VID     = 'ivira_vid'
const COOKIE_SID     = 'ivira_session'
const COOKIE_SOURCE  = 'ivira_source'
const COOKIE_CONSENT = 'ivira_consent'
const SESSION_TTL    = 30 * 60 * 1000  // 30 minutes
const VISITOR_TTL    = 365              // days
const API_URL        = '/api/v1/analytics/event'
const BATCH_URL      = '/api/v1/analytics/events'
const IDENTIFY_URL   = '/api/v1/analytics/identify'

// ── Cookie helpers ──────────────────────────────────────────────
function setCookie(name, value, days) {
  const d = new Date()
  d.setTime(d.getTime() + days * 86400000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax;Secure`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax;Secure`
}

// ── UUID generation ─────────────────────────────────────────────
function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ── Device detection ────────────────────────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent
  let deviceType = 'desktop'
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet'
  else if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) deviceType = 'mobile'

  let browser = 'Unknown'
  if (/edg\//i.test(ua))        browser = 'Edge'
  else if (/opr\//i.test(ua))   browser = 'Opera'
  else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua))   browser = 'Safari'
  else if (/firefox/i.test(ua)) browser = 'Firefox'

  let os = 'Unknown'
  if (/windows/i.test(ua))           os = 'Windows'
  else if (/mac os/i.test(ua))       os = 'macOS'
  else if (/android/i.test(ua))      os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua))        os = 'Linux'

  return { deviceType, browser, os }
}

// ── UTM extraction ──────────────────────────────────────────────
function getUTMParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source:   params.get('utm_source')   || undefined,
    utm_medium:   params.get('utm_medium')   || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term:     params.get('utm_term')     || undefined,
    utm_content:  params.get('utm_content')  || undefined,
  }
}

// ── State ───────────────────────────────────────────────────────
let _visitorId = null
let _sessionId = null
let _device = null
let _utm = null
let _queue = []
let _flushing = false
let _initialized = false

// ── Consent ─────────────────────────────────────────────────────
export function hasConsent() {
  return getCookie(COOKIE_CONSENT) === 'true'
}

export function grantConsent() {
  setCookie(COOKIE_CONSENT, 'true', 365)
  // Initialize tracking now that we have consent
  if (!_initialized) init()
}

export function revokeConsent() {
  deleteCookie(COOKIE_CONSENT)
  deleteCookie(COOKIE_VID)
  deleteCookie(COOKIE_SID)
  deleteCookie(COOKIE_SOURCE)
  _visitorId = null
  _sessionId = null
  _initialized = false
}

// ── Init ────────────────────────────────────────────────────────
function init() {
  if (_initialized) return
  if (!hasConsent()) return

  // Visitor ID — persistent 1 year
  _visitorId = getCookie(COOKIE_VID)
  if (!_visitorId) {
    _visitorId = uuid()
    setCookie(COOKIE_VID, _visitorId, VISITOR_TTL)
  }

  // Session ID — resets after 30min inactivity
  _sessionId = getCookie(COOKIE_SID)
  if (!_sessionId) {
    _sessionId = uuid()
  }
  // Always refresh session cookie TTL
  setCookie(COOKIE_SID, _sessionId, SESSION_TTL / 86400000)

  // UTM / source tracking
  _utm = getUTMParams()
  const hasUTM = Object.values(_utm).some(Boolean)
  if (hasUTM) {
    setCookie(COOKIE_SOURCE, JSON.stringify(_utm), 30)
  } else {
    const stored = getCookie(COOKIE_SOURCE)
    if (stored) {
      try { _utm = JSON.parse(stored) } catch { /* ignore */ }
    }
  }

  _device = getDeviceInfo()
  _initialized = true

  // Auto-track page view
  trackPageView()

  // Track visibility change (session duration)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // Flush on beforeunload
  window.addEventListener('beforeunload', flush)
}

// ── Event sending ───────────────────────────────────────────────
function buildPayload(eventName, metadata = {}) {
  return {
    visitor_id:   _visitorId,
    session_id:   _sessionId,
    event_name:   eventName,
    page_url:     window.location.href,
    page_path:    window.location.pathname,
    referrer:     document.referrer || undefined,
    device_type:  _device?.deviceType,
    browser:      _device?.browser,
    os:           _device?.os,
    screen_width: window.screen?.width,
    screen_height:window.screen?.height,
    utm_source:   _utm?.utm_source,
    utm_medium:   _utm?.utm_medium,
    utm_campaign: _utm?.utm_campaign,
    utm_term:     _utm?.utm_term,
    utm_content:  _utm?.utm_content,
    metadata:     Object.keys(metadata).length ? metadata : undefined,
  }
}

async function sendEvent(payload) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    return res.ok
  } catch {
    // Queue for retry
    _queue.push(payload)
    return false
  }
}

function flush() {
  if (!_queue.length || _flushing) return
  _flushing = true

  // Use sendBeacon for reliability on page unload
  if (navigator.sendBeacon && _queue.length > 0) {
    const blob = new Blob(
      [JSON.stringify({ events: _queue.slice(0, 20) })],
      { type: 'application/json' }
    )
    navigator.sendBeacon(BATCH_URL, blob)
    _queue = _queue.slice(20)
  }
  _flushing = false
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Track a custom event
 */
export function track(eventName, metadata = {}) {
  if (!_initialized || !hasConsent()) return
  // Refresh session cookie on each interaction
  setCookie(COOKIE_SID, _sessionId, SESSION_TTL / 86400000)
  sendEvent(buildPayload(eventName, metadata))
}

/**
 * Track page view (called automatically on init + route changes)
 */
export function trackPageView(path) {
  if (!_initialized || !hasConsent()) return
  const payload = buildPayload('page_view')
  if (path) {
    payload.page_path = path
    payload.page_url = window.location.origin + path
  }
  sendEvent(payload)
}

/**
 * Identify user (call on login/signup)
 */
export function identify(userId, userType = 'member') {
  if (!_visitorId || !hasConsent()) return
  fetch(IDENTIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitor_id: _visitorId,
      user_id: userId,
      user_type: userType,
    }),
    keepalive: true,
  }).catch(() => {})

  // Also tag future events with user_id
  const origBuild = buildPayload
  // Store user_id for future events
  window.__ivira_uid = userId
}

/**
 * Get current visitor ID (for cross-platform linking)
 */
export function getVisitorId() { return _visitorId }
export function getSessionId() { return _sessionId }

// ── Predefined event helpers ────────────────────────────────────
export const events = {
  findGymOpened:    (meta) => track('find_gym_opened', meta),
  gymViewed:        (meta) => track('gym_viewed', meta),
  buyPassClicked:   (meta) => track('buy_pass_clicked', meta),
  checkoutStarted:  (meta) => track('checkout_started', meta),
  paymentCompleted: (meta) => track('payment_completed', meta),
  login:            (meta) => track('login', meta),
  signup:           (meta) => track('signup', meta),
  appDownload:      (meta) => track('app_download', meta),
  leadCaptured:     (meta) => track('lead_captured', meta),
}

// ── Route change listener (for SPAs) ────────────────────────────
let _lastPath = null
export function setupRouteTracking() {
  if (typeof window === 'undefined') return

  // Listen for popstate (back/forward)
  window.addEventListener('popstate', () => {
    if (window.location.pathname !== _lastPath) {
      _lastPath = window.location.pathname
      trackPageView(_lastPath)
    }
  })

  // Patch pushState/replaceState
  const origPush = history.pushState
  const origReplace = history.replaceState

  history.pushState = function (...args) {
    origPush.apply(this, args)
    if (window.location.pathname !== _lastPath) {
      _lastPath = window.location.pathname
      trackPageView(_lastPath)
    }
  }

  history.replaceState = function (...args) {
    origReplace.apply(this, args)
    if (window.location.pathname !== _lastPath) {
      _lastPath = window.location.pathname
      trackPageView(_lastPath)
    }
  }

  _lastPath = window.location.pathname
}

// ── Auto-init ───────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  // Try to init immediately if consent already granted
  if (hasConsent()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { init(); setupRouteTracking() })
    } else {
      init()
      setupRouteTracking()
    }
  }
}

export default { track, trackPageView, identify, events, hasConsent, grantConsent, revokeConsent, getVisitorId, getSessionId, setupRouteTracking }
