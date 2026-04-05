import db from '../config/database.js';
import config from '../config/index.js';

/**
 * Weekly Digest Cron Job
 *
 * Runs daily at 9 AM IST but only sends on Mondays.
 * Sends a branded HTML email to each gym owner summarising
 * the previous week's check-ins, revenue, new members, and
 * at-risk members via the Resend API.
 */

export async function sendWeeklyDigests() {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek !== 1) return; // Only run on Mondays (1 = Monday)

  if (!config.email.resendApiKey && !config.email.enabled) {
    console.log('[WeeklyDigest] Email not configured — skipping');
    return;
  }

  const gyms = await db('gyms')
    .whereNotNull('owner_email')
    .where('owner_email', '!=', '')
    .select('id', 'gym_name', 'owner_name', 'owner_email', 'city');

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekStart = weekAgo.toISOString().split('T')[0];
  const weekEnd = today.toISOString().split('T')[0];

  for (const gym of gyms) {
    try {
      // Gather stats
      const [
        totalMembers,
        newMembers,
        weekCheckins,
        checkinMethods,
        revenue,
        atRiskMembers,
        topStreak,
        activePods,
      ] = await Promise.all([
        db('members').where({ gym_id: gym.id, status: 'active' }).count('* as count').first(),
        db('members').where({ gym_id: gym.id }).where('created_at', '>=', weekStart).count('* as count').first(),
        db('checkins').where({ gym_id: gym.id }).whereBetween('checked_in_at', [weekStart, weekEnd]).count('* as count').first(),
        db('checkins').where({ gym_id: gym.id }).whereBetween('checked_in_at', [weekStart, weekEnd])
          .select('method').count('* as count').groupBy('method'),
        db('payments').where({ gym_id: gym.id, status: 'captured' }).whereBetween('paid_at', [weekStart, weekEnd])
          .sum('amount_paise as total').first(),
        db('members').where({ gym_id: gym.id, status: 'active' })
          .where('last_checkin_at', '<', weekStart)
          .whereNotNull('last_checkin_at')
          .count('* as count').first(),
        db('members').where({ gym_id: gym.id }).orderBy('streak', 'desc').select('name', 'streak').first(),
        db('pods').where({ gym_id: gym.id, is_active: true }).count('* as count').first(),
      ]);

      const stats = {
        totalMembers: parseInt(totalMembers?.count || 0),
        newMembers: parseInt(newMembers?.count || 0),
        weekCheckins: parseInt(weekCheckins?.count || 0),
        checkinBreakdown: checkinMethods.reduce((acc, m) => {
          acc[m.method || 'unknown'] = parseInt(m.count);
          return acc;
        }, {}),
        revenue: parseInt(revenue?.total || 0),
        atRisk: parseInt(atRiskMembers?.count || 0),
        topStreak: topStreak ? `${topStreak.name} (${topStreak.streak}d)` : 'None yet',
        activePods: parseInt(activePods?.count || 0),
      };

      // Skip gyms with no activity
      if (stats.weekCheckins === 0 && stats.newMembers === 0) continue;

      const revenueFormatted = (stats.revenue / 100).toLocaleString();
      const checkinBreakdown = Object.entries(stats.checkinBreakdown)
        .map(([method, count]) => `${count} ${method.toUpperCase()}`)
        .join(' · ') || 'None';

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#07080F;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="color:#10B981;font-size:11px;letter-spacing:4px;font-weight:700;">WEEKLY DIGEST</span>
    <h1 style="color:#F0F2F8;font-size:24px;margin:8px 0 4px;font-weight:800;">Your Week at ${gym.gym_name}</h1>
    <p style="color:rgba(240,242,248,0.4);font-size:13px;margin:0;">${weekStart} — ${weekEnd}</p>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:24px;">
    <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:16px;padding:20px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
      <div style="color:#10B981;font-size:28px;font-weight:800;">${stats.weekCheckins}</div>
      <div style="color:rgba(240,242,248,0.4);font-size:11px;margin-top:4px;">CHECK-INS</div>
    </div>
    <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:16px;padding:20px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
      <div style="color:#F0F2F8;font-size:28px;font-weight:800;">₹${revenueFormatted}</div>
      <div style="color:rgba(240,242,248,0.4);font-size:11px;margin-top:4px;">REVENUE</div>
    </div>
  </div>

  <div style="background:rgba(255,255,255,0.04);border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.06);">
    <div style="color:rgba(240,242,248,0.4);font-size:11px;letter-spacing:1px;margin-bottom:12px;">THIS WEEK</div>
    <div style="color:#F0F2F8;font-size:14px;line-height:2;">
      👥 <strong>${stats.totalMembers}</strong> active members (${stats.newMembers} new)<br>
      📱 Check-ins: ${checkinBreakdown}<br>
      🔥 Top streak: ${stats.topStreak}<br>
      🎯 ${stats.activePods} active Circles<br>
      ${stats.atRisk > 0 ? `⚠️ <span style="color:#FF4D6D;">${stats.atRisk} at-risk members</span> (missed 7+ days)` : '✅ No at-risk members'}
    </div>
  </div>

  <a href="https://ivira.app/dashboard" style="display:block;background:#10B981;color:#07080F;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
    Open Dashboard →
  </a>

  <p style="text-align:center;color:rgba(240,242,248,0.25);font-size:11px;margin-top:32px;">
    IVIRA · ${gym.city || 'Your Gym'}<br>
    <a href="https://ivira.app/settings" style="color:rgba(240,242,248,0.3);">Unsubscribe</a>
  </p>
</div>
</body>
</html>`;

      // Send via Resend
      if (config.email.resendApiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.email.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'IVIRA <digest@ivira.app>',
            to: gym.owner_email,
            subject: `📊 Your week at ${gym.gym_name} — ${stats.weekCheckins} check-ins`,
            html,
          }),
        });
      }

      console.log(`[WeeklyDigest] Sent to ${gym.owner_email} (${gym.gym_name})`);
    } catch (err) {
      console.warn(`[WeeklyDigest] Failed for gym ${gym.id}:`, err?.message);
    }
  }
}
