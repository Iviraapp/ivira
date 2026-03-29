import {
  runMembershipExpiryCheck,
  runDunningReminders,
  runChurnScoring,
  runDailyStats,
  runTrialExpiryCheck,
  flagAtRiskMembers,
  checkMilestones,
  resetOccupancy,
  logCronStart,
  logCronEnd,
  logCronError,
} from '../services/cron.service.js';
import { runBehavioralEngineForAllGyms } from '../services/behavioral-ai-cron.js';
import { runRenewalReminders } from './renewal-reminders.js';
import { runCheckinStreakNudge } from './checkin-streak.js';
import { getPodJobs } from './pod-jobs.js';
import { runClassReminders } from './class-reminders.js';

/**
 * Cron Scheduler
 *
 * Runs background jobs at configured intervals using setInterval.
 * Each job execution is wrapped in structured logging (cron_logs table)
 * with duration tracking and error capture.
 *
 * Usage:
 *   import { startCronJobs, stopCronJobs } from './cron/scheduler.js';
 *   startCronJobs();          // call on server startup
 *   stopCronJobs();           // call on graceful shutdown
 */

const jobs = [
  { name: 'membership_expiry_check', fn: runMembershipExpiryCheck, intervalHours: 24 },
  { name: 'dunning_reminders', fn: runDunningReminders, intervalHours: 12 },
  { name: 'churn_scoring', fn: runChurnScoring, intervalHours: 24 },
  { name: 'daily_stats', fn: runDailyStats, intervalHours: 24 },
  { name: 'trial_expiry_check', fn: runTrialExpiryCheck, intervalHours: 24 },
  { name: 'at_risk_flagging', fn: flagAtRiskMembers, intervalHours: 12 },
  { name: 'milestone_alerts', fn: checkMilestones, intervalHours: 6 },
  { name: 'occupancy_reset', fn: resetOccupancy, intervalHours: 24 },
  { name: 'behavioral_ai_engine', fn: runBehavioralEngineForAllGyms, intervalHours: 4 },
  { name: 'class_reminders', fn: runClassReminders, intervalHours: 1 },
  ...getPodJobs().intervalJobs,
];

/**
 * Time-of-day scheduled jobs (IST).
 * These run once daily at a specific hour/minute in Asia/Kolkata timezone.
 * Each entry recalculates the next run time after execution.
 */
const dailyJobs = [
  { name: 'renewal_reminders', fn: runRenewalReminders, hour: 10, minute: 0 },   // 10:00 AM IST
  { name: 'checkin_streak_nudge', fn: runCheckinStreakNudge, hour: 20, minute: 0 }, // 8:00 PM IST
  ...getPodJobs().dailyJobs,
];

/**
 * Calculate milliseconds until the next occurrence of a given IST hour:minute.
 * If the time has already passed today, schedules for tomorrow.
 */
function msUntilIST(hour, minute) {
  // Get current time in IST
  const nowUtc = Date.now();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  const nowIst = new Date(nowUtc + istOffsetMs);

  // Build target time today in IST
  const targetIst = new Date(nowIst);
  targetIst.setUTCHours(hour, minute, 0, 0);

  // If we've already passed the target time today, schedule for tomorrow
  if (targetIst <= nowIst) {
    targetIst.setUTCDate(targetIst.getUTCDate() + 1);
  }

  // Convert target IST back to UTC timestamp and compute delta
  const targetUtc = targetIst.getTime() - istOffsetMs;
  return targetUtc - nowUtc;
}

/** @type {Map<string, NodeJS.Timeout>} */
const activeIntervals = new Map();

/** @type {Map<string, boolean>} */
const runningJobs = new Map();

/**
 * Execute a single job with cron logging and concurrency guard.
 * Prevents overlapping runs of the same job.
 */
async function executeJob(job) {
  // Skip if this job is already running (previous run took longer than interval)
  if (runningJobs.get(job.name)) {
    console.warn(`[cron] Skipping ${job.name} — previous run still in progress`);
    return;
  }

  runningJobs.set(job.name, true);
  let logId;

  try {
    logId = await logCronStart(job.name);
    console.log(`[cron] Starting ${job.name} (log: ${logId})`);

    const result = await job.fn();

    await logCronEnd(logId, result);
    console.log(`[cron] Completed ${job.name} (log: ${logId})`);
  } catch (error) {
    console.error(`[cron] Failed ${job.name}:`, error.message);
    if (logId) {
      await logCronError(logId, error).catch((err) => {
        console.error(`[cron] Failed to log error for ${job.name}:`, err.message);
      });
    }
  } finally {
    runningJobs.set(job.name, false);
  }
}

/**
 * Schedule a daily job to run at a specific IST time.
 * After each execution, it re-schedules itself for the next day.
 */
function scheduleDailyJob(job) {
  const delayMs = msUntilIST(job.hour, job.minute);
  const delayHours = (delayMs / (1000 * 60 * 60)).toFixed(1);
  const timeStr = `${String(job.hour).padStart(2, '0')}:${String(job.minute).padStart(2, '0')}`;

  console.log(`[cron] Scheduled ${job.name} at ${timeStr} IST (next run in ${delayHours}h)`);

  const timeoutId = setTimeout(async () => {
    await executeJob(job);
    // Re-schedule for the next day (only if not stopped)
    if (activeIntervals.has(job.name)) {
      scheduleDailyJob(job);
    }
  }, delayMs);

  if (timeoutId.unref) {
    timeoutId.unref();
  }

  activeIntervals.set(job.name, timeoutId);
}

/**
 * Start all cron jobs. Each job runs at its configured interval.
 * membership_expiry_check also runs immediately on startup.
 */
export function startCronJobs() {
  if (activeIntervals.size > 0) {
    console.warn('[cron] Jobs already running — call stopCronJobs() first');
    return;
  }

  const totalJobs = jobs.length + dailyJobs.length;
  console.log(`[cron] Starting ${totalJobs} scheduled jobs`);

  // Interval-based jobs
  for (const job of jobs) {
    const intervalMs = job.intervalHours * 60 * 60 * 1000;

    const intervalId = setInterval(() => {
      executeJob(job);
    }, intervalMs);

    // Prevent interval from keeping the process alive during shutdown
    if (intervalId.unref) {
      intervalId.unref();
    }

    activeIntervals.set(job.name, intervalId);
    console.log(`[cron] Scheduled ${job.name} every ${job.intervalHours}h`);
  }

  // Time-of-day IST jobs
  for (const job of dailyJobs) {
    scheduleDailyJob(job);
  }

  // Run membership_expiry_check immediately on startup (non-blocking)
  const expiryJob = jobs.find((j) => j.name === 'membership_expiry_check');
  if (expiryJob) {
    console.log('[cron] Running membership_expiry_check on startup');
    executeJob(expiryJob);
  }
}

/**
 * Stop all cron jobs. Call this during graceful shutdown.
 */
export function stopCronJobs() {
  if (activeIntervals.size === 0) {
    console.log('[cron] No jobs to stop');
    return;
  }

  console.log(`[cron] Stopping ${activeIntervals.size} scheduled jobs`);

  const dailyJobNames = new Set(dailyJobs.map((j) => j.name));

  for (const [name, timerId] of activeIntervals) {
    if (dailyJobNames.has(name)) {
      clearTimeout(timerId);
    } else {
      clearInterval(timerId);
    }
    console.log(`[cron] Stopped ${name}`);
  }

  activeIntervals.clear();
  runningJobs.clear();
}
