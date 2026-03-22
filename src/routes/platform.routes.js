import db from '../config/database.js';
import config from '../config/index.js';

// Super admin endpoints for platform fee tracking
export default async function platformRoutes(fastify) {
  // Get total platform fees collected
  fastify.get('/super/platform/revenue', async (request, reply) => {
    const adminSecret = request.headers['x-admin-secret'];
    if (adminSecret !== config.adminSecret) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Total fees
    const totalResult = await db('payments')
      .where('status', 'captured')
      .sum('platform_fee_paise as total')
      .first();

    // Monthly breakdown
    const monthly = await db('payments')
      .where('status', 'captured')
      .whereNotNull('platform_fee_paise')
      .select(db.raw("to_char(paid_at, 'YYYY-MM') as month"))
      .sum('platform_fee_paise as fees')
      .sum('amount_paise as volume')
      .groupByRaw("to_char(paid_at, 'YYYY-MM')")
      .orderBy('month', 'desc')
      .limit(12);

    // Per-gym breakdown
    const perGym = await db('payments')
      .where('payments.status', 'captured')
      .join('gyms', 'payments.gym_id', 'gyms.id')
      .select('gyms.gym_name', 'payments.gym_id')
      .sum('payments.platform_fee_paise as fees')
      .count('* as transactions')
      .groupBy('payments.gym_id', 'gyms.gym_name')
      .orderBy('fees', 'desc')
      .limit(50);

    reply.send({
      total_fees_paise: parseInt(totalResult?.total || 0),
      monthly_breakdown: monthly,
      per_gym: perGym,
    });
  });

  // Daily close report with fee breakdown for gym owner
  fastify.get('/gyms/:gymId/reports/daily-close', {
    preHandler: [fastify.verifyToken, fastify.verifyGymOwner],
  }, async (request, reply) => {
    const { gymId } = request.params;
    const { date } = request.query; // YYYY-MM-DD format
    const targetDate = date || new Date().toISOString().split('T')[0];

    const payments = await db('payments')
      .where({ gym_id: gymId, status: 'captured' })
      .whereRaw('DATE(paid_at) = ?', [targetDate]);

    const totalSales = payments.reduce((s, p) => s + (p.amount_paise || 0), 0);
    const totalFees = payments.reduce((s, p) => s + (p.platform_fee_paise || 0), 0);
    const netPayout = totalSales - totalFees;

    reply.send({
      date: targetDate,
      total_sales_paise: totalSales,
      platform_fee_paise: totalFees,
      net_payout_paise: netPayout,
      transaction_count: payments.length,
      transactions: payments,
    });
  });
}
