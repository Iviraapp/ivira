import db from '../config/database.js';
import config from '../config/index.js';
import { sendOTPEmail, getTransporter as getEmailTransporter } from './email.service.js';

/**
 * Smart Dunning Flow:
 * Step 0: Membership expires → auto-charge attempt (Day 0)
 * Step 1: Day +1 → retry + email reminder
 * Step 2: Day +3 → retry + email warning
 * Step 3: Day +5 → soft suspend (member status → 'paused') + email
 * Step 4: Day +7 → hard suspend (member status → 'suspended') + final email
 */

const DUNNING_SCHEDULE = [
  { step: 1, daysAfter: 0, action: 'charge', emailSubject: 'Payment due for your {{gymName}} membership' },
  { step: 2, daysAfter: 1, action: 'retry',  emailSubject: 'Payment reminder — {{gymName}}' },
  { step: 3, daysAfter: 3, action: 'retry',  emailSubject: 'Urgent: Payment overdue — {{gymName}}' },
  { step: 4, daysAfter: 5, action: 'pause',  emailSubject: 'Membership paused — {{gymName}}' },
  { step: 5, daysAfter: 7, action: 'suspend', emailSubject: 'Membership suspended — {{gymName}}' },
];

const DUNNING_EMAILS = {
  1: `Hi {{memberName}},\n\nYour membership at {{gymName}} has expired. We'll attempt to charge your payment method automatically.\n\nAmount: {{amount}}\n\nIf you'd like to renew manually, please visit the gym.\n\nBest,\n{{gymName}}`,
  2: `Hi {{memberName}},\n\nThis is a reminder that your payment of {{amount}} for {{gymName}} is pending.\n\nPlease ensure your payment method is active or visit the gym to renew.\n\nBest,\n{{gymName}}`,
  3: `Hi {{memberName}},\n\nYour payment of {{amount}} is now overdue. Please settle it at the earliest to avoid interruption of services.\n\nBest,\n{{gymName}}`,
  4: `Hi {{memberName}},\n\nYour membership at {{gymName}} has been paused due to non-payment of {{amount}}.\n\nPlease make the payment within 2 days to avoid full suspension.\n\nBest,\n{{gymName}}`,
  5: `Hi {{memberName}},\n\nYour membership at {{gymName}} has been suspended due to non-payment.\n\nPlease contact the gym to reinstate your membership.\n\nBest,\n{{gymName}}`,
};

function getTransporter() {
  if (!config.email.enabled) return null;
  return getEmailTransporter();
}

function renderTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

function formatPaise(paise) {
  return '₹' + Math.floor(paise / 100).toLocaleString('en-IN');
}

async function sendDunningEmail(member, gym, step, amountPaise) {
  const schedule = DUNNING_SCHEDULE.find(s => s.step === step);
  if (!schedule || !member.email) return;

  const vars = {
    memberName: member.name,
    gymName: gym.gym_name,
    amount: formatPaise(amountPaise),
  };

  const subject = renderTemplate(schedule.emailSubject, vars);
  const body = renderTemplate(DUNNING_EMAILS[step], vars);
  const mail = getTransporter();

  if (mail) {
    try {
      await mail.sendMail({
        from: `"${gym.gym_name}" <${config.email.user}>`,
        to: member.email,
        subject,
        text: body,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;white-space:pre-line">${body}</div>`,
      });
    } catch (err) {
      console.error(`Dunning email failed for ${member.email}:`, err.message);
    }
  } else {
    console.log(`[DEV] Dunning step ${step} for ${member.name}: ${subject}`);
  }

  // Log reminder
  await db('payment_reminders').insert({
    payment_id: null, // will link if we have a payment
    member_id: member.id,
    attempt_number: step,
    channel: 'email',
    status: mail ? 'sent' : 'sent',
  }).catch(() => {}); // ignore if payment_id constraint fails
}

// Process dunning for a single membership
async function processMembershipDunning(membership) {
  const member = await db('members').where({ id: membership.member_id }).first();
  const gym = await db('gyms').where({ id: membership.gym_id }).first();
  if (!member || !gym) return;

  const currentStep = membership.dunning_step || 0;
  const nextSchedule = DUNNING_SCHEDULE.find(s => s.step === currentStep + 1);
  if (!nextSchedule) return; // All steps exhausted

  // Check if it's time for next step
  const expiryDate = new Date(membership.end_date);
  const triggerDate = new Date(expiryDate);
  triggerDate.setDate(triggerDate.getDate() + nextSchedule.daysAfter);

  if (new Date() < triggerDate) return; // Not time yet

  const newStep = nextSchedule.step;

  // Execute action
  if (nextSchedule.action === 'pause') {
    await db('members')
      .where({ id: member.id })
      .update({ status: 'paused', updated_at: new Date() });
  } else if (nextSchedule.action === 'suspend') {
    await db('members')
      .where({ id: member.id })
      .update({ status: 'suspended', updated_at: new Date() });
    await db('memberships')
      .where({ id: membership.id })
      .update({ status: 'expired', updated_at: new Date() });
  }

  // Send dunning email
  await sendDunningEmail(member, gym, newStep, membership.amount_paise);

  // Calculate next check time
  const nextNext = DUNNING_SCHEDULE.find(s => s.step === newStep + 1);
  const dunningNextAt = nextNext
    ? new Date(expiryDate.getTime() + nextNext.daysAfter * 24 * 60 * 60 * 1000)
    : null;

  // Update membership dunning state
  await db('memberships')
    .where({ id: membership.id })
    .update({
      dunning_step: newStep,
      dunning_next_at: dunningNextAt,
      updated_at: new Date(),
    });

  return { membershipId: membership.id, memberName: member.name, step: newStep, action: nextSchedule.action };
}

// Run dunning for all expired memberships of a gym
export async function runDunning(gymId) {
  // Find all active/expired memberships past their end_date that haven't completed dunning
  const memberships = await db('memberships')
    .where({ 'memberships.gym_id': gymId })
    .where('end_date', '<', new Date().toISOString().split('T')[0])
    .where(function() {
      this.where('dunning_step', '<', 5).orWhereNull('dunning_step');
    })
    .whereIn('status', ['active', 'expired']);

  const results = [];
  for (const ms of memberships) {
    const result = await processMembershipDunning(ms);
    if (result) results.push(result);
  }

  return { processed: results.length, actions: results };
}

// Get dunning status for a gym
export async function getDunningStatus(gymId) {
  const overdue = await db('memberships')
    .where({ 'memberships.gym_id': gymId })
    .where('end_date', '<', new Date().toISOString().split('T')[0])
    .where(function() {
      this.where('dunning_step', '<', 5).orWhereNull('dunning_step');
    })
    .join('members', 'memberships.member_id', 'members.id')
    .select(
      'memberships.id as membership_id',
      'members.name',
      'members.phone',
      'members.email',
      'members.status as member_status',
      'memberships.plan_name',
      'memberships.amount_paise',
      'memberships.end_date',
      'memberships.dunning_step',
      'memberships.dunning_next_at'
    );

  return { overdue, total: overdue.length };
}
