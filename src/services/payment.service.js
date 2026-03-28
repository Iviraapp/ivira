import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import db from '../config/database.js';
import config from '../config/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// Platform fee: 1% of transaction amount
export function calculatePlatformFee(amountPaise) {
  return Math.round(amountPaise * 0.01);
}

export function validatePlatformFee(amountPaise, feePaise) {
  const expectedFee = calculatePlatformFee(amountPaise);
  // Allow 1 paise rounding tolerance
  if (Math.abs(feePaise - expectedFee) > 1) {
    throw new ValidationError('Platform fee integrity check failed');
  }
  return true;
}

const razorpayEnabled = !!(config.razorpay.keyId && config.razorpay.keyId !== 'your-key-id');

let razorpay;
function getRazorpay() {
  if (!razorpay && razorpayEnabled) {
    razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpay;
}

export async function createMembership(gymId, memberId, { planName, amountPaise, startDate, endDate, autoRenew = true }) {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member');

  const [membership] = await db('memberships')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      plan_name: planName,
      amount_paise: amountPaise,
      start_date: startDate,
      end_date: endDate,
      auto_renew: autoRenew,
    })
    .returning('*');

  return membership;
}

// Collect payment from a member — creates membership + payment in one step
export async function collectPayment(gymId, memberId, { planName, amountPaise, months = 1 }) {
  const member = await db('members').where({ id: memberId, gym_id: gymId }).first();
  if (!member) throw new NotFoundError('Member');

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  // Create or update membership
  const [membership] = await db('memberships')
    .insert({
      member_id: memberId,
      gym_id: gymId,
      plan_name: planName || 'Monthly',
      amount_paise: amountPaise,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    })
    .returning('*');

  // Mark member as active
  await db('members')
    .where({ id: memberId, gym_id: gymId })
    .update({ status: 'active', updated_at: new Date() });

  const rz = getRazorpay();

  if (rz) {
    // Production: create Razorpay order
    const order = await rz.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `g${gymId.slice(0,8)}_m${membership.id.slice(0,8)}`,
      notes: { gym_id: gymId, membership_id: membership.id, member_id: memberId },
    });

    const platformFeePaise = calculatePlatformFee(amountPaise);
    const netAmountPaise = amountPaise - platformFeePaise;

    const [payment] = await db('payments')
      .insert({
        membership_id: membership.id,
        gym_id: gymId,
        member_id: memberId,
        amount_paise: amountPaise,
        platform_fee_paise: platformFeePaise,
        net_amount_paise: netAmountPaise,
        razorpay_order_id: order.id,
        status: 'pending',
      })
      .returning('*');

    return { payment, membership, razorpayOrder: order };
  } else {
    // Dev mode: simulate captured payment
    const platformFeePaise = calculatePlatformFee(amountPaise);
    const netAmountPaise = amountPaise - platformFeePaise;

    const [payment] = await db('payments')
      .insert({
        membership_id: membership.id,
        gym_id: gymId,
        member_id: memberId,
        amount_paise: amountPaise,
        platform_fee_paise: platformFeePaise,
        net_amount_paise: netAmountPaise,
        razorpay_order_id: `dev_${Date.now()}`,
        status: 'captured',
        method: 'dev_simulate',
        paid_at: new Date(),
      })
      .returning('*');

    return { payment, membership, devMode: true };
  }
}

export async function createPaymentOrder(gymId, membershipId) {
  const membership = await db('memberships')
    .where({ id: membershipId, gym_id: gymId })
    .first();
  if (!membership) throw new NotFoundError('Membership');

  const platformFeePaise = calculatePlatformFee(membership.amount_paise);
  const netAmountPaise = membership.amount_paise - platformFeePaise;

  const rz = getRazorpay();
  if (!rz) {
    // Dev mode
    const [payment] = await db('payments')
      .insert({
        membership_id: membershipId,
        gym_id: gymId,
        member_id: membership.member_id,
        amount_paise: membership.amount_paise,
        platform_fee_paise: platformFeePaise,
        net_amount_paise: netAmountPaise,
        razorpay_order_id: `dev_${Date.now()}`,
        status: 'captured',
        method: 'dev_simulate',
        paid_at: new Date(),
      })
      .returning('*');

    return { payment, devMode: true };
  }

  const order = await rz.orders.create({
    amount: membership.amount_paise,
    currency: 'INR',
    receipt: `gym_${gymId}_mem_${membershipId}`,
    notes: {
      gym_id: gymId,
      membership_id: membershipId,
      member_id: membership.member_id,
    },
  });

  const [payment] = await db('payments')
    .insert({
      membership_id: membershipId,
      gym_id: gymId,
      member_id: membership.member_id,
      amount_paise: membership.amount_paise,
      platform_fee_paise: platformFeePaise,
      net_amount_paise: netAmountPaise,
      razorpay_order_id: order.id,
      status: 'pending',
    })
    .returning('*');

  return { payment, razorpayOrder: order };
}

export function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function handlePaymentCaptured(razorpayPaymentId, razorpayOrderId, paymentData) {
  // Look up the existing payment to get amount for fee calculation
  const existingPayment = await db('payments')
    .where({ razorpay_order_id: razorpayOrderId })
    .first();

  const amountPaise = existingPayment?.amount_paise || paymentData.amount;
  const platformFeePaise = calculatePlatformFee(amountPaise);
  const netAmountPaise = amountPaise - platformFeePaise;

  // Validate fee integrity if already set during order creation
  if (existingPayment?.platform_fee_paise) {
    validatePlatformFee(amountPaise, existingPayment.platform_fee_paise);
  }

  const [payment] = await db('payments')
    .where({ razorpay_order_id: razorpayOrderId })
    .update({
      status: 'captured',
      razorpay_payment_id: razorpayPaymentId,
      method: paymentData.method,
      razorpay_data: paymentData,
      platform_fee_paise: platformFeePaise,
      net_amount_paise: netAmountPaise,
      paid_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');

  // Fire-and-forget WhatsApp + SMS notifications + revenue ledger sync
  if (payment) {
    const [member, gym] = await Promise.all([
      db('members').where({ id: payment.member_id }).first(),
      db('gyms').where({ id: payment.gym_id }).first(),
    ]);

    if (member && gym) {
      Promise.all([
        import('../services/whatsapp.service.js').then(({ sendPaymentConfirmation }) =>
          sendPaymentConfirmation(member, gym, payment.amount_paise).catch(err => console.warn('[PaymentService] notification/sync failed:', err?.message))
        ),
        import('../services/sms.service.js').then(({ sendPaymentSMS }) =>
          sendPaymentSMS(member.phone, member.name, payment.amount_paise, gym.name || gym.gym_name).catch(err => console.warn('[PaymentService] notification/sync failed:', err?.message))
        ),
      ]).catch(err => console.warn('[PaymentService] notification/sync failed:', err?.message))
    }

    // Sync to revenue ledger (fire-and-forget)
    import('./revenue.service.js').then(({ syncPaymentToLedger }) =>
      syncPaymentToLedger(payment).catch(err => console.warn('[PaymentService] notification/sync failed:', err?.message))
    ).catch(err => console.warn('[PaymentService] notification/sync failed:', err?.message))
  }

  return payment;
}

export async function handlePaymentFailed(razorpayOrderId, paymentData) {
  const [payment] = await db('payments')
    .where({ razorpay_order_id: razorpayOrderId })
    .update({
      status: 'failed',
      razorpay_data: paymentData,
      updated_at: new Date(),
    })
    .returning('*');

  return payment;
}

export async function getPayments(gymId, { page = 1, limit = 50, status, memberId } = {}) {
  const query = db('payments')
    .where({ 'payments.gym_id': gymId })
    .join('members', 'payments.member_id', 'members.id')
    .select('payments.*', 'members.name as member_name', 'members.phone as member_phone');

  if (status) query.andWhere({ 'payments.status': status });
  if (memberId) query.andWhere({ 'payments.member_id': memberId });

  const countQuery = db('payments').where({ gym_id: gymId });
  if (status) countQuery.andWhere({ status });
  if (memberId) countQuery.andWhere({ member_id: memberId });
  const [{ count }] = await countQuery.count();

  const offset = (page - 1) * limit;
  const payments = await query.orderBy('payments.created_at', 'desc').limit(limit).offset(offset);

  return { payments, total: parseInt(count, 10), page, limit };
}

// Dashboard stats
export async function getTodayRevenue(gymId) {
  const result = await db('payments')
    .where({ gym_id: gymId, status: 'captured' })
    .andWhereRaw('DATE(paid_at) = CURRENT_DATE')
    .sum('amount_paise as total');
  return parseInt(result[0]?.total || 0, 10);
}
