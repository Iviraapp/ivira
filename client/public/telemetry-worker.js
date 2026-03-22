/**
 * IVIRA Telemetry Web Worker
 *
 * Runs in a background thread to:
 * 1. Poll wearable/health APIs for live data
 * 2. Maintain a local metrics buffer
 * 3. Sync data to the service worker / API without blocking the UI
 * 4. Track desktop activity for the Nudge Engine
 */

let syncInterval = null;
let activityTimer = null;
let metricsBuffer = [];
let lastActivity = Date.now();
let nudgeEnabled = true;
let syncEndpoint = '/api/v1/telemetry/sync';

const SYNC_INTERVAL = 30000;  // 30s sync cycle
const ACTIVITY_CHECK = 60000; // 1 min activity check

// ── Message Handler ────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'INIT':
      if (data?.endpoint) syncEndpoint = data.endpoint;
      if (data?.token) self._authToken = data.token;
      startSyncLoop();
      startActivityMonitor();
      self.postMessage({ type: 'WORKER_READY', timestamp: Date.now() });
      break;

    case 'STOP':
      stopSyncLoop();
      stopActivityMonitor();
      break;

    case 'INGEST':
      // Accept telemetry data from the main thread
      ingestMetric(data);
      break;

    case 'WEARABLE_DATA':
      // Batch ingest from wearable sync
      if (Array.isArray(data)) {
        data.forEach(d => ingestMetric(d));
      }
      break;

    case 'USER_ACTIVE':
      lastActivity = Date.now();
      break;

    case 'GET_METRICS':
      self.postMessage({
        type: 'METRICS_SNAPSHOT',
        data: getMetricsSnapshot(),
        timestamp: Date.now(),
      });
      break;

    case 'SET_NUDGE':
      nudgeEnabled = !!data?.enabled;
      break;

    case 'FORCE_SYNC':
      flushToServer();
      break;

    default:
      break;
  }
});

// ── Metric Ingestion ───────────────────────────────────────
function ingestMetric(metric) {
  if (!metric) return;
  metricsBuffer.push({
    ...metric,
    ts: metric.ts || Date.now(),
    synced: false,
  });

  // Keep buffer bounded (max 1000 entries)
  if (metricsBuffer.length > 1000) {
    metricsBuffer = metricsBuffer.slice(-500);
  }

  // Broadcast live update to main thread
  self.postMessage({
    type: 'METRIC_UPDATE',
    data: metric,
    bufferSize: metricsBuffer.length,
  });
}

// ── Metrics Snapshot ───────────────────────────────────────
function getMetricsSnapshot() {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  const recent = metricsBuffer.filter(m => m.ts > last24h);

  // Aggregate by type
  const byType = {};
  for (const m of recent) {
    const t = m.type || 'unknown';
    if (!byType[t]) byType[t] = { count: 0, latest: null, values: [] };
    byType[t].count++;
    byType[t].latest = m;
    if (m.value !== undefined) byType[t].values.push(m.value);
  }

  // Compute summary stats
  const summary = {};
  for (const [type, data] of Object.entries(byType)) {
    const vals = data.values;
    summary[type] = {
      count: data.count,
      latest: data.latest,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
    };
  }

  return {
    totalEvents: recent.length,
    pendingSync: metricsBuffer.filter(m => !m.synced).length,
    summary,
    lastActivity,
    uptimeMs: now - (self._startTime || now),
  };
}

// ── Sync Loop ──────────────────────────────────────────────
function startSyncLoop() {
  self._startTime = Date.now();
  stopSyncLoop();
  syncInterval = setInterval(() => {
    flushToServer();
  }, SYNC_INTERVAL);
}

function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

async function flushToServer() {
  const unsynced = metricsBuffer.filter(m => !m.synced);
  if (unsynced.length === 0) return;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (self._authToken) headers['Authorization'] = `Bearer ${self._authToken}`;

    const res = await fetch(syncEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        events: unsynced,
        flushedAt: Date.now(),
        source: 'desktop-worker',
      }),
    });

    if (res.ok) {
      // Mark as synced
      for (const m of unsynced) {
        m.synced = true;
      }
      // Clean old synced data (keep last 100)
      const synced = metricsBuffer.filter(m => m.synced);
      if (synced.length > 100) {
        metricsBuffer = [
          ...synced.slice(-100),
          ...metricsBuffer.filter(m => !m.synced),
        ];
      }

      self.postMessage({
        type: 'SYNC_COMPLETE',
        count: unsynced.length,
        timestamp: Date.now(),
      });
    }
  } catch (e) {
    // Offline — data stays in buffer, will retry next cycle
    self.postMessage({
      type: 'SYNC_FAILED',
      pending: unsynced.length,
      error: e.message,
    });
  }
}

// ── Activity Monitor (for Nudge Engine) ────────────────────
function startActivityMonitor() {
  stopActivityMonitor();
  activityTimer = setInterval(() => {
    const inactiveMs = Date.now() - lastActivity;

    // If user has been inactive for the nudge interval, trigger nudge
    if (nudgeEnabled && inactiveMs >= 60 * 60 * 1000) {
      self.postMessage({
        type: 'NUDGE_TRIGGER',
        inactiveMinutes: Math.round(inactiveMs / 60000),
        timestamp: Date.now(),
      });
      // Reset to avoid spam
      lastActivity = Date.now();
    }

    // Send heartbeat
    self.postMessage({
      type: 'HEARTBEAT',
      inactiveMs,
      bufferSize: metricsBuffer.length,
      pendingSync: metricsBuffer.filter(m => !m.synced).length,
    });
  }, ACTIVITY_CHECK);
}

function stopActivityMonitor() {
  if (activityTimer) {
    clearInterval(activityTimer);
    activityTimer = null;
  }
}
