const CACHE_VERSION = 'ivira-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const TELEMETRY_CACHE = `${CACHE_VERSION}-telemetry`;

const PRE_CACHE_URLS = [
  '/',
  '/offline.html',
];

// ── Nudge Engine Configuration ─────────────────────────────
const NUDGE_INTERVAL = 60 * 60 * 1000; // 60 minutes
const NUDGE_TYPES = [
  {
    tag: 'hydration',
    title: 'HYDRATION CHECK',
    body: 'Time to drink water. Stay hydrated to maintain peak performance.',
    icon: '/icons/icon-96.png',
    badge: '/icons/icon-72.png',
  },
  {
    tag: 'movement',
    title: 'MOVEMENT BREAK',
    body: 'You\'ve been seated for a while. Stand, stretch, walk — reset your body.',
    icon: '/icons/icon-96.png',
    badge: '/icons/icon-72.png',
  },
  {
    tag: 'rest',
    title: 'REST & RECOVERY',
    body: 'Take 5 minutes to breathe deeply. Recovery is part of performance.',
    icon: '/icons/icon-96.png',
    badge: '/icons/icon-72.png',
  },
];

let nudgeIndex = 0;
let nudgeTimer = null;

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRE_CACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
  startNudgeEngine();
});

// ── Fetch: Route to appropriate strategy ───────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // API calls: network-first with offline queue
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ── Message Handler (from Web Worker / main thread) ────────
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'ENABLE_NUDGES':
      startNudgeEngine();
      break;

    case 'DISABLE_NUDGES':
      stopNudgeEngine();
      break;

    case 'SET_NUDGE_INTERVAL':
      stopNudgeEngine();
      startNudgeEngine(data.interval || NUDGE_INTERVAL);
      break;

    case 'SYNC_TELEMETRY':
      // Queue telemetry data for background sync
      cacheTelemetryData(data);
      break;

    case 'FLUSH_QUEUE':
      // Flush any queued offline data
      flushSyncQueue();
      break;

    default:
      break;
  }
});

// ── Push Notification Handler ──────────────────────────────
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'IVIRA';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-96.png',
    badge: '/icons/icon-72.png',
    tag: payload.tag || 'ivira-push',
    vibrate: [100, 50, 100],
    data: payload.data || {},
    actions: payload.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click Handler ─────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes('ivira.app') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(data.url || '/');
    })
  );
});

// ── Background Sync ────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'ivira-telemetry-sync') {
    event.waitUntil(flushSyncQueue());
  }
});

// ── Nudge Engine ───────────────────────────────────────────
function startNudgeEngine(interval = NUDGE_INTERVAL) {
  stopNudgeEngine();
  nudgeTimer = setInterval(() => {
    sendNudge();
  }, interval);
}

function stopNudgeEngine() {
  if (nudgeTimer) {
    clearInterval(nudgeTimer);
    nudgeTimer = null;
  }
}

async function sendNudge() {
  // Check if notifications are permitted
  if (self.registration && Notification.permission === 'granted') {
    const nudge = NUDGE_TYPES[nudgeIndex % NUDGE_TYPES.length];
    nudgeIndex++;

    await self.registration.showNotification(nudge.title, {
      body: nudge.body,
      icon: nudge.icon,
      badge: nudge.badge,
      tag: `ivira-nudge-${nudge.tag}`,
      silent: false,
      requireInteraction: false,
      data: { type: 'nudge', category: nudge.tag },
      actions: [
        { action: 'done', title: 'Done' },
        { action: 'snooze', title: 'Remind later' },
      ],
    });

    // Log nudge to telemetry cache
    cacheTelemetryData({
      type: 'nudge_sent',
      category: nudge.tag,
      timestamp: Date.now(),
    });
  }
}

// ── Telemetry Sync Queue (Offline-First) ───────────────────
async function cacheTelemetryData(data) {
  try {
    const cache = await caches.open(TELEMETRY_CACHE);
    const queueKey = `/ivira-sync-queue/${Date.now()}`;
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(queueKey, response);
  } catch (e) {
    // Silently fail — data will be retried
  }
}

async function flushSyncQueue() {
  try {
    const cache = await caches.open(TELEMETRY_CACHE);
    const keys = await cache.keys();
    const queueKeys = keys.filter(r => r.url.includes('ivira-sync-queue'));

    if (queueKeys.length === 0) return;

    const batch = [];
    for (const req of queueKeys) {
      const res = await cache.match(req);
      if (res) {
        const data = await res.json();
        batch.push(data);
      }
    }

    // Attempt to flush to API
    const flushRes = await fetch('/api/v1/telemetry/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch, flushedAt: Date.now() }),
    });

    if (flushRes.ok) {
      // Clear flushed items
      for (const req of queueKeys) {
        await cache.delete(req);
      }
      // Notify clients
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({ type: 'SYNC_COMPLETE', count: batch.length });
      }
    }
  } catch (e) {
    // Network unavailable — items stay queued for next attempt
  }
}

// ── Helpers ────────────────────────────────────────────────
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(pathname);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
