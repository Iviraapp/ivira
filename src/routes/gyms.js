import * as authService from '../services/auth.service.js';
import * as checkinService from '../services/checkin.service.js';
import * as paymentService from '../services/payment.service.js';
import config from '../config/index.js';
import db from '../config/database.js';

const updateSchema = {
  body: {
    type: 'object',
    properties: {
      gym_name: { type: 'string', minLength: 2 },
      address: { type: 'string' },
      city: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      logo_url: { type: 'string' },
    },
  },
};

export default async function gymRoutes(fastify) {
  const authHooks = { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] };

  // Get gym details
  fastify.get('/gyms/:gymId', authHooks, async (request) => {
    return { gym: request.gym };
  });

  // Get gym invite code
  fastify.get('/gyms/:gymId/invite-code', authHooks, async (request) => {
    const gym = await db('gyms').where('id', request.params.gymId).select('invite_code').first();
    return { inviteCode: gym?.invite_code || null };
  });

  // Regenerate gym invite code
  fastify.post('/gyms/:gymId/invite-code/regenerate', authHooks, async (request) => {
    const newCode = 'GYM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await db('gyms').where('id', request.params.gymId).update({ invite_code: newCode, updated_at: new Date() });
    return { inviteCode: newCode };
  });

  // Update gym
  fastify.patch('/gyms/:gymId', { schema: updateSchema, ...authHooks }, async (request) => {
    const gym = await authService.updateGym(request.params.gymId, request.body);
    return { gym };
  });

  // Update onboarding step
  fastify.patch('/gyms/:gymId/onboarding', {
    schema: {
      body: {
        type: 'object',
        required: ['step'],
        properties: {
          step: { type: 'integer', minimum: 0, maximum: 4 },
        },
      },
    },
    ...authHooks,
  }, async (request) => {
    const [gym] = await db('gyms')
      .where({ id: request.params.gymId })
      .update({ onboarding_step: request.body.step, updated_at: new Date() })
      .returning('*');
    return { gym };
  });

  // ─── Notification Settings ───────────────────────────────────

  // GET notification settings
  fastify.get('/gyms/:gymId/notification-settings', authHooks, async (request) => {
    const gym = await db('gyms').where({ id: request.params.gymId }).select('notification_settings').first();
    const defaults = {
      whatsapp_enabled: true, sms_enabled: true, email_enabled: true,
      payment_reminders: true, expiry_alerts: true, checkin_summary: false,
      marketing: false, day_pass_alerts: true,
    };
    return { settings: { ...defaults, ...(gym?.notification_settings || {}) } };
  });

  // PATCH notification settings
  fastify.patch('/gyms/:gymId/notification-settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          whatsapp_enabled: { type: 'boolean' },
          sms_enabled: { type: 'boolean' },
          email_enabled: { type: 'boolean' },
          payment_reminders: { type: 'boolean' },
          expiry_alerts: { type: 'boolean' },
          checkin_summary: { type: 'boolean' },
          marketing: { type: 'boolean' },
          day_pass_alerts: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
    ...authHooks,
  }, async (request) => {
    const gymId = request.params.gymId;
    const current = await db('gyms').where({ id: gymId }).select('notification_settings').first();
    const defaults = {
      whatsapp_enabled: true, sms_enabled: true, email_enabled: true,
      payment_reminders: true, expiry_alerts: true, checkin_summary: false,
      marketing: false, day_pass_alerts: true,
    };
    const merged = { ...defaults, ...(current?.notification_settings || {}), ...request.body };

    const [gym] = await db('gyms')
      .where({ id: gymId })
      .update({ notification_settings: JSON.stringify(merged), updated_at: new Date() })
      .returning('*');

    return { settings: merged };
  });

  // Dashboard stats
  fastify.get('/gyms/:gymId/stats', authHooks, async (request) => {
    const gymId = request.params.gymId;

    const [
      todayCheckins,
      todayRevenue,
      totalMembers,
      activeMembers,
      expiredMembers,
      expiringSoon,
      recentCheckins,
      weeklyCheckins,
      weekRevenue,
      monthRevenue,
    ] = await Promise.all([
      checkinService.getTodayCheckinCount(gymId),
      paymentService.getTodayRevenue(gymId),
      db('members').where({ gym_id: gymId }).count().first(),
      db('members').where({ gym_id: gymId, status: 'active' }).count().first(),
      db('members').where({ gym_id: gymId, status: 'expired' }).count().first(),
      db('memberships')
        .where({ 'memberships.gym_id': gymId, 'memberships.status': 'active' })
        .whereBetween('end_date', [
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ])
        .join('members', 'memberships.member_id', 'members.id')
        .select('members.name', 'members.phone', 'memberships.end_date', 'members.id as member_id')
        .limit(10),
      db('checkins')
        .where({ 'checkins.gym_id': gymId })
        .orderBy('checked_in_at', 'desc')
        .join('members', 'checkins.member_id', 'members.id')
        .select('checkins.*', 'members.name as member_name')
        .limit(5),
      db.raw(`
        SELECT DATE(checked_in_at) as date, COUNT(*) as count
        FROM checkins
        WHERE gym_id = ? AND checked_in_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(checked_in_at)
        ORDER BY date
      `, [gymId]),
      db.raw(`
        SELECT COALESCE(SUM(amount_paise), 0) as total
        FROM payments
        WHERE gym_id = ? AND status = 'captured' AND paid_at >= CURRENT_DATE - INTERVAL '7 days'
      `, [gymId]),
      db.raw(`
        SELECT COALESCE(SUM(amount_paise), 0) as total
        FROM payments
        WHERE gym_id = ? AND status = 'captured' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)
      `, [gymId]),
    ]);

    return {
      todayCheckins,
      todayRevenue,
      weekRevenue: parseInt(weekRevenue.rows[0]?.total || 0, 10),
      monthRevenue: parseInt(monthRevenue.rows[0]?.total || 0, 10),
      totalMembers: parseInt(totalMembers.count, 10),
      activeMembers: parseInt(activeMembers.count, 10),
      expiredMembers: parseInt(expiredMembers.count, 10),
      expiringSoon,
      recentCheckins,
      weeklyCheckins: weeklyCheckins.rows,
      checkinUrl: `${config.baseUrl}/checkin.html?gym=${gymId}`,
    };
  });

  // Daily revenue analytics — for dashboard chart (last N days)
  fastify.get('/gyms/:gymId/analytics/revenue', authHooks, async (request) => {
    const gymId = request.params.gymId;
    const days = Math.min(parseInt(request.query.days) || 7, 90);

    const result = await db.raw(`
      SELECT
        DATE(paid_at) as date,
        COALESCE(SUM(amount_paise), 0) as revenue,
        COUNT(*) as transactions
      FROM payments
      WHERE gym_id = ? AND status = 'captured' AND paid_at >= CURRENT_DATE - INTERVAL '1 day' * ?
      GROUP BY DATE(paid_at)
      ORDER BY date
    `, [gymId, days]);

    // Fill gaps with zero-revenue days
    const revenueMap = {};
    for (const row of result.rows) {
      revenueMap[row.date] = { revenue: parseInt(row.revenue) / 100, transactions: parseInt(row.transactions) };
    }

    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en', { weekday: 'short' });
      daily.push({
        date: dayLabel,
        fullDate: dateStr,
        revenue: revenueMap[dateStr]?.revenue || 0,
        transactions: revenueMap[dateStr]?.transactions || 0,
      });
    }

    return { daily };
  });

  // Analytics endpoint — monthly revenue, churn, peak hours
  fastify.get('/gyms/:gymId/analytics', authHooks, async (request) => {
    const gymId = request.params.gymId;

    const [monthlyRevenue, peakHours, churnData, memberGrowth] = await Promise.all([
      // Monthly revenue — last 6 months
      db.raw(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') as month,
          SUM(amount_paise) as revenue,
          COUNT(*) as transactions
        FROM payments
        WHERE gym_id = ? AND status = 'captured' AND paid_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY month
      `, [gymId]),

      // Peak hours heatmap — checkins by day of week and hour
      db.raw(`
        SELECT
          EXTRACT(DOW FROM checked_in_at) as day_of_week,
          EXTRACT(HOUR FROM checked_in_at) as hour,
          COUNT(*) as count
        FROM checkins
        WHERE gym_id = ? AND checked_in_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(DOW FROM checked_in_at), EXTRACT(HOUR FROM checked_in_at)
        ORDER BY day_of_week, hour
      `, [gymId]),

      // Churn rate — members who went inactive/expired in last 3 months
      db.raw(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', updated_at), 'YYYY-MM') as month,
          COUNT(*) FILTER (WHERE status IN ('inactive', 'expired', 'suspended')) as churned,
          COUNT(*) as total
        FROM members
        WHERE gym_id = ? AND updated_at >= NOW() - INTERVAL '3 months'
        GROUP BY DATE_TRUNC('month', updated_at)
        ORDER BY month
      `, [gymId]),

      // Member growth — new members per month
      db.raw(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          COUNT(*) as new_members
        FROM members
        WHERE gym_id = ? AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `, [gymId]),
    ]);

    return {
      monthlyRevenue: monthlyRevenue.rows,
      peakHours: peakHours.rows,
      churn: churnData.rows.map(r => ({
        ...r,
        churnRate: r.total > 0 ? Math.round((r.churned / r.total) * 100) : 0,
      })),
      memberGrowth: memberGrowth.rows,
    };
  });

  // Gym data export (GDPR / DPDPA)
  fastify.post('/gyms/:gymId/data/export', { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }, async (request, reply) => {
    const { gymId } = request.params

    // Collect all gym data in parallel
    const [gym, members, payments, staff, checkins, memberships] = await Promise.all([
      db('gyms').where({ id: gymId }).first(),
      db('members').where({ gym_id: gymId }).select('id','name','email','phone','status','created_at'),
      db('payments').where({ gym_id: gymId }).select('id','member_id','amount_paise','status','method','paid_at','created_at'),
      db('staff').where({ gym_id: gymId }).select('id','name','email','role','status','created_at'),
      db('checkins').where({ gym_id: gymId }).orderBy('created_at','desc').limit(1000),
      db('memberships').where({ gym_id: gymId }).select('id','member_id','plan_name','start_date','end_date','status'),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      gym: { id: gym.id, name: gym.gym_name || gym.name, email: gym.email, created_at: gym.created_at },
      summary: {
        total_members: members.length,
        total_payments: payments.length,
        total_staff: staff.length,
        total_checkins: checkins.length,
      },
      members,
      memberships,
      payments,
      staff,
      checkins,
    }

    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', `attachment; filename="ivira-export-${gymId}-${Date.now()}.json"`)
    return reply.send(exportData)
  })

  // Gym data deletion (GDPR / DPDPA) — soft delete + PII anonymisation
  fastify.delete('/gyms/:gymId/data', { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }, async (request, reply) => {
    const { gymId } = request.params

    // Anonymise member PII (name, email, phone) instead of hard delete
    // This preserves financial records for legal/tax compliance
    await db('members')
      .where({ gym_id: gymId })
      .update({
        name: db.raw("'Deleted Member ' || LEFT(id::text, 8)"),
        email: db.raw("'deleted_' || LEFT(id::text, 8) || '@deleted.invalid'"),
        phone: db.raw("'0000000000'"),
        updated_at: new Date(),
      })

    // Anonymise staff PII
    await db('staff')
      .where({ gym_id: gymId })
      .update({
        name: db.raw("'Deleted Staff ' || LEFT(id::text, 8)"),
        email: db.raw("'deleted_' || LEFT(id::text, 8) || '@deleted.invalid'"),
        phone: db.raw("'0000000000'"),
        updated_at: new Date(),
      })

    // Mark gym as deleted
    await db('gyms')
      .where({ id: gymId })
      .update({
        status: 'deleted',
        gym_name: 'Deleted Gym',
        email: db.raw("'deleted_' || LEFT(id::text, 8) || '@deleted.invalid'"),
        updated_at: new Date(),
      })

    return reply.send({
      deleted: true,
      message: 'All personal data has been anonymised. Financial records are retained for 7 years as required by law.',
      anonymised_at: new Date().toISOString(),
    })
  })

  // GET /gyms/:gymId/kiosk/status — check if kiosk has sent a heartbeat recently
  fastify.get('/gyms/:gymId/kiosk/status', { preHandler: [fastify.verifyToken, fastify.verifyGymOwner] }, async (request, reply) => {
    const { gymId } = request.params

    // Check if any kiosk sent a heartbeat in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    let online = false
    let lastSeen = null

    try {
      const lastHeartbeat = await db('kiosk_logs')
        .where({ gym_id: gymId })
        .where('created_at', '>=', fiveMinutesAgo)
        .orderBy('created_at', 'desc')
        .first()

      if (lastHeartbeat) {
        online = true
        lastSeen = lastHeartbeat.created_at
      } else {
        // Fall back to checking any recent kiosk activity
        const anyRecent = await db('kiosk_logs')
          .where({ gym_id: gymId })
          .orderBy('created_at', 'desc')
          .first()
        lastSeen = anyRecent?.created_at || null
      }
    } catch (_) {
      // kiosk_logs table may not exist — return online=false gracefully
    }

    return reply.send({
      online,
      lastSeen,
      gymId,
    })
  })
}
