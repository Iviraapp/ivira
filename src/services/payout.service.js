import db from '../config/database.js';
import config from '../config/index.js';

// The Split: 1% IVIRA, 70% Trainer, 29% Gym — atomic SQL transaction
export async function processMarketplacePayout(bookingId, gymId, professionalId, totalAmountPaise, razorpayPaymentId) {
  return db.transaction(async (trx) => {
    const platformFeePaise = Math.round(totalAmountPaise * 0.01);
    const trainerPayoutPaise = Math.round(totalAmountPaise * 0.70);
    const gymPayoutPaise = totalAmountPaise - platformFeePaise - trainerPayoutPaise; // ~29%, absorbs rounding

    const [payout] = await trx('marketplace_payouts')
      .insert({
        booking_id: bookingId,
        gym_id: gymId,
        professional_id: professionalId,
        total_amount_paise: totalAmountPaise,
        platform_fee_paise: platformFeePaise,
        trainer_payout_paise: trainerPayoutPaise,
        gym_payout_paise: gymPayoutPaise,
        razorpay_payment_id: razorpayPaymentId,
        payout_status: 'processing',
      })
      .returning('*');

    // Update platform fees table if it exists
    try {
      await trx('platform_fees').insert({
        gym_id: gymId,
        fee_type: 'marketplace_commission',
        amount_paise: platformFeePaise,
        reference_id: payout.id,
        reference_type: 'marketplace_payout',
      });
    } catch {
      // platform_fees table may not exist yet
    }

    return payout;
  });
}

export async function updatePayoutStatus(razorpayPaymentId, status, razorpayTransferId = null) {
  const update = { payout_status: status };
  if (status === 'paid') update.paid_at = new Date();
  if (razorpayTransferId) update.razorpay_transfer_id = razorpayTransferId;

  const [payout] = await db('marketplace_payouts')
    .where({ razorpay_payment_id: razorpayPaymentId })
    .update(update)
    .returning('*');

  return payout;
}

export async function getPayoutLedger(gymId = null, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  let query = db('marketplace_payouts')
    .leftJoin('gyms', 'marketplace_payouts.gym_id', 'gyms.id');

  if (gymId) query = query.where('marketplace_payouts.gym_id', gymId);

  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
  const { total } = await countQuery;

  const payouts = await query
    .select('marketplace_payouts.*', 'gyms.gym_name')
    .orderBy('marketplace_payouts.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  // Aggregate stats
  const [stats] = await db('marketplace_payouts')
    .modify((qb) => { if (gymId) qb.where({ gym_id: gymId }); })
    .select(
      db.raw('COALESCE(SUM(total_amount_paise), 0) as total_volume'),
      db.raw('COALESCE(SUM(platform_fee_paise), 0) as total_platform_fees'),
      db.raw('COALESCE(SUM(trainer_payout_paise), 0) as total_trainer_payouts'),
      db.raw('COALESCE(SUM(gym_payout_paise), 0) as total_gym_payouts'),
      db.raw("COUNT(*) FILTER (WHERE payout_status = 'paid') as paid_count"),
      db.raw("COUNT(*) FILTER (WHERE payout_status = 'processing') as processing_count")
    );

  return { payouts, stats, pagination: { page, limit, total: parseInt(total, 10) } };
}
