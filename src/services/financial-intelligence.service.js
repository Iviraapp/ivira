/**
 * IVIRA Financial Intelligence Service
 *
 * AI-powered financial analysis for gym owners:
 * - MRR, ARPU, churn rate, failed payment recovery
 * - GEO-aware tax compliance (GST/VAT/Sales Tax)
 * - Revenue leakage detection
 * - Smart dunning suggestions
 * - Gateway-specific insights (Razorpay UPI / Stripe)
 */
import db from '../config/database.js';

// ── GEO Tax Configuration ──────────────────────────────────────────
const TAX_RULES = {
  IN: {
    name: 'India',
    type: 'GST',
    rate: 18,
    components: { CGST: 9, SGST: 9 },
    hsnCode: '99972',
    label: 'Goods & Services Tax',
    currency: 'INR',
    gateway: 'razorpay',
  },
  AE: {
    name: 'UAE',
    type: 'VAT',
    rate: 5,
    components: { VAT: 5 },
    label: 'Value Added Tax',
    currency: 'AED',
    gateway: 'stripe',
  },
  GB: {
    name: 'United Kingdom',
    type: 'VAT',
    rate: 20,
    components: { VAT: 20 },
    label: 'Value Added Tax',
    currency: 'GBP',
    gateway: 'stripe',
  },
  DE: {
    name: 'Germany',
    type: 'VAT',
    rate: 19,
    components: { VAT: 19 },
    label: 'Mehrwertsteuer (VAT)',
    currency: 'EUR',
    gateway: 'stripe',
  },
  US: {
    name: 'United States',
    type: 'Sales Tax',
    rate: null, // Varies by state
    components: {},
    label: 'State Sales Tax',
    currency: 'USD',
    gateway: 'stripe',
    stateRates: {
      CA: 7.25, NY: 8, TX: 6.25, FL: 6, IL: 6.25,
      PA: 6, OH: 5.75, GA: 4, NC: 4.75, MI: 6,
      NJ: 6.625, VA: 5.3, WA: 6.5, AZ: 5.6, MA: 6.25,
      TN: 7, IN: 7, MO: 4.225, MD: 6, WI: 5,
      CO: 2.9, MN: 6.875, SC: 6, AL: 4, LA: 4.45,
    },
  },
  AU: {
    name: 'Australia',
    type: 'GST',
    rate: 10,
    components: { GST: 10 },
    label: 'Goods & Services Tax',
    currency: 'AUD',
    gateway: 'stripe',
  },
  CA: {
    name: 'Canada',
    type: 'GST/HST',
    rate: 5,
    components: { GST: 5 },
    label: 'GST/HST',
    currency: 'CAD',
    gateway: 'stripe',
  },
  SG: {
    name: 'Singapore',
    type: 'GST',
    rate: 9,
    components: { GST: 9 },
    label: 'Goods & Services Tax',
    currency: 'SGD',
    gateway: 'stripe',
  },
};

// ── Core Financial Metrics ─────────────────────────────────────────

/**
 * Calculate MRR (Monthly Recurring Revenue) for a gym.
 */
export async function calculateMRR(gymId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Active memberships with recurring revenue
  const activeMemberships = await db('memberships')
    .where({ gym_id: gymId })
    .whereIn('status', ['active', 'past_due'])
    .where('end_date', '>=', now);

  let mrr = 0;
  activeMemberships.forEach(m => {
    const amount = m.amount_paise || 0;
    // Normalize to monthly
    const durationDays = Math.max(1, Math.round(
      (new Date(m.end_date) - new Date(m.start_date)) / (1000 * 60 * 60 * 24)
    ));
    const monthlyAmount = durationDays > 0 ? (amount / durationDays) * 30 : amount;
    mrr += monthlyAmount;
  });

  // Previous month MRR for trend
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const prevPayments = await db('payments')
    .where({ gym_id: gymId, status: 'captured' })
    .where('created_at', '>=', prevMonthStart)
    .where('created_at', '<=', prevMonthEnd)
    .sum('amount_paise as total')
    .first();

  const prevMRR = (prevPayments?.total || 0);
  const mrrChange = prevMRR > 0 ? ((mrr - prevMRR) / prevMRR) * 100 : 0;

  return {
    mrr: Math.round(mrr),
    mrr_formatted: formatCurrency(Math.round(mrr)),
    previous_mrr: prevMRR,
    change_pct: +mrrChange.toFixed(1),
    trend: mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'flat',
    active_subscriptions: activeMemberships.length,
  };
}

/**
 * Calculate ARPU (Average Revenue Per User).
 */
export async function calculateARPU(gymId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeMembers = await db('members')
    .where({ gym_id: gymId, status: 'active' })
    .count('id as count')
    .first();

  const monthRevenue = await db('payments')
    .where({ gym_id: gymId, status: 'captured' })
    .where('created_at', '>=', monthStart)
    .sum('amount_paise as total')
    .first();

  const memberCount = parseInt(activeMembers?.count || 0);
  const revenue = monthRevenue?.total || 0;
  const arpu = memberCount > 0 ? Math.round(revenue / memberCount) : 0;

  // Previous month comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const prevRevenue = await db('payments')
    .where({ gym_id: gymId, status: 'captured' })
    .where('created_at', '>=', prevMonthStart)
    .where('created_at', '<=', prevMonthEnd)
    .sum('amount_paise as total')
    .first();

  const prevMembers = await db('members')
    .where({ gym_id: gymId })
    .where('created_at', '<=', prevMonthEnd)
    .whereIn('status', ['active', 'expired'])
    .count('id as count')
    .first();

  const prevMemberCount = parseInt(prevMembers?.count || 1);
  const prevARPU = (prevRevenue?.total || 0) / prevMemberCount;
  const arpuChange = prevARPU > 0 ? ((arpu - prevARPU) / prevARPU) * 100 : 0;

  return {
    arpu: arpu,
    arpu_formatted: formatCurrency(arpu),
    active_members: memberCount,
    monthly_revenue: revenue,
    change_pct: +arpuChange.toFixed(1),
    trend: arpuChange > 0 ? 'up' : arpuChange < 0 ? 'down' : 'flat',
  };
}

/**
 * Analyze failed payment recovery rates.
 */
export async function analyzePaymentRecovery(gymId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const failedPayments = await db('payments')
    .where({ gym_id: gymId })
    .whereIn('status', ['failed', 'pending'])
    .where('created_at', '>=', since);

  const recoveredPayments = await db('payments')
    .where({ gym_id: gymId, status: 'captured' })
    .where('created_at', '>=', since)
    .whereIn('member_id', failedPayments.map(p => p.member_id).filter(Boolean));

  const totalFailed = failedPayments.length;
  const totalRecovered = recoveredPayments.length;
  const recoveryRate = totalFailed > 0 ? Math.round((totalRecovered / totalFailed) * 100) : 100;

  const failedAmount = failedPayments.reduce((sum, p) => sum + (p.amount_paise || 0), 0);
  const recoveredAmount = recoveredPayments.reduce((sum, p) => sum + (p.amount_paise || 0), 0);
  const leakageAmount = failedAmount - recoveredAmount;

  // Group by payment method
  const byMethod = {};
  failedPayments.forEach(p => {
    const method = p.method || 'unknown';
    if (!byMethod[method]) byMethod[method] = { failed: 0, amount: 0 };
    byMethod[method].failed++;
    byMethod[method].amount += p.amount_paise || 0;
  });

  return {
    total_failed: totalFailed,
    total_recovered: totalRecovered,
    recovery_rate: recoveryRate,
    failed_amount: failedAmount,
    failed_amount_formatted: formatCurrency(failedAmount),
    recovered_amount: recoveredAmount,
    recovered_amount_formatted: formatCurrency(recoveredAmount),
    leakage_amount: leakageAmount,
    leakage_formatted: formatCurrency(leakageAmount),
    by_method: byMethod,
    period_days: days,
  };
}

/**
 * Get members with pending/failed payments for nudge suggestions.
 */
export async function getPendingNudges(gymId) {
  const pendingMembers = await db('memberships as ms')
    .join('members as m', 'm.id', 'ms.member_id')
    .where('ms.gym_id', gymId)
    .where(function() {
      this.where('ms.status', 'expired')
        .orWhere('ms.status', 'past_due')
        .orWhere(function() {
          this.where('ms.status', 'active')
            .where('ms.end_date', '<', new Date());
        });
    })
    .select(
      'm.id', 'm.name', 'm.phone', 'm.email', 'm.status as member_status',
      'ms.end_date', 'ms.amount_paise', 'ms.plan_name', 'ms.dunning_step',
      'ms.status as membership_status'
    )
    .orderBy('ms.end_date', 'asc')
    .limit(50);

  // Calculate days overdue
  const now = new Date();
  const nudges = pendingMembers.map(m => {
    const daysOverdue = Math.max(0, Math.floor((now - new Date(m.end_date)) / (1000 * 60 * 60 * 24)));
    let urgency = 'low';
    let suggestedChannel = 'whatsapp';

    if (daysOverdue > 14) {
      urgency = 'critical';
      suggestedChannel = 'call';
    } else if (daysOverdue > 7) {
      urgency = 'high';
      suggestedChannel = 'sms';
    } else if (daysOverdue > 3) {
      urgency = 'medium';
      suggestedChannel = 'whatsapp';
    }

    return {
      member_id: m.id,
      name: m.name,
      phone: m.phone ? maskPhone(m.phone) : null,
      plan: m.plan_name,
      amount: formatCurrency(m.amount_paise || 0),
      amount_paise: m.amount_paise || 0,
      days_overdue: daysOverdue,
      dunning_step: m.dunning_step || 0,
      urgency,
      suggested_channel: suggestedChannel,
      suggested_message: generateNudgeMessage(m.name, daysOverdue, m.plan_name),
    };
  });

  const totalOverdue = nudges.reduce((sum, n) => sum + n.amount_paise, 0);

  return {
    members: nudges,
    total_count: nudges.length,
    total_overdue_amount: totalOverdue,
    total_overdue_formatted: formatCurrency(totalOverdue),
    urgency_breakdown: {
      critical: nudges.filter(n => n.urgency === 'critical').length,
      high: nudges.filter(n => n.urgency === 'high').length,
      medium: nudges.filter(n => n.urgency === 'medium').length,
      low: nudges.filter(n => n.urgency === 'low').length,
    },
  };
}

/**
 * Revenue leakage analysis — identify where money is being lost.
 */
export async function analyzeRevenueLeakage(gymId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leakages = [];

  // 1. Failed UPI autopay mandates
  const failedUPI = await db('payments')
    .where({ gym_id: gymId, status: 'failed' })
    .where('created_at', '>=', monthStart)
    .where(function() {
      this.where('method', 'upi').orWhere('method', 'emandate');
    });

  if (failedUPI.length > 0) {
    const upiAmount = failedUPI.reduce((s, p) => s + (p.amount_paise || 0), 0);
    leakages.push({
      type: 'failed_upi_autopay',
      title: 'Failed UPI Autopay Renewals',
      description: `${failedUPI.length} UPI autopay payments failed this month, often due to bank server downtime or expired mandates.`,
      amount: upiAmount,
      amount_formatted: formatCurrency(upiAmount),
      affected_members: failedUPI.length,
      action: `Send WhatsApp reminders to ${failedUPI.length} members to re-verify their UPI mandate.`,
      priority: 'high',
    });
  }

  // 2. Expired memberships without renewal
  const expiredNoRenewal = await db('memberships')
    .where({ gym_id: gymId, status: 'expired' })
    .where('end_date', '>=', new Date(now.getTime() - 30 * 86400000))
    .where('end_date', '<', now);

  if (expiredNoRenewal.length > 0) {
    const lostRevenue = expiredNoRenewal.reduce((s, m) => s + (m.amount_paise || 0), 0);
    leakages.push({
      type: 'expired_no_renewal',
      title: 'Expired Memberships Without Renewal',
      description: `${expiredNoRenewal.length} memberships expired in the last 30 days without renewal.`,
      amount: lostRevenue,
      amount_formatted: formatCurrency(lostRevenue),
      affected_members: expiredNoRenewal.length,
      action: `Run a "Win-back" campaign with a 10% discount for returning members.`,
      priority: expiredNoRenewal.length > 10 ? 'critical' : 'medium',
    });
  }

  // 3. Pending invoices
  const pendingInvoices = await db('invoices')
    .where({ gym_id: gymId, status: 'issued' })
    .where('due_date', '<', now);

  if (pendingInvoices.length > 0) {
    const pendingAmount = pendingInvoices.reduce((s, i) => s + (i.total_paise || 0), 0);
    leakages.push({
      type: 'overdue_invoices',
      title: 'Overdue Unpaid Invoices',
      description: `${pendingInvoices.length} invoices are past their due date.`,
      amount: pendingAmount,
      amount_formatted: formatCurrency(pendingAmount),
      affected_members: pendingInvoices.length,
      action: `Send payment reminders via SMS for the ${pendingInvoices.length} overdue invoices.`,
      priority: 'high',
    });
  }

  // 4. Dunning stalled members
  const stalledDunning = await db('memberships')
    .where({ gym_id: gymId })
    .where('dunning_step', '>=', 3)
    .whereIn('status', ['past_due', 'paused']);

  if (stalledDunning.length > 0) {
    const stalledAmount = stalledDunning.reduce((s, m) => s + (m.amount_paise || 0), 0);
    leakages.push({
      type: 'stalled_dunning',
      title: 'Stalled Automatic Payment Retries',
      description: `${stalledDunning.length} members have been stuck in the payment retry process for too long.`,
      amount: stalledAmount,
      amount_formatted: formatCurrency(stalledAmount),
      affected_members: stalledDunning.length,
      action: `These members need personal outreach. Recommend a phone call to resolve payment issues.`,
      priority: 'critical',
    });
  }

  const totalLeakage = leakages.reduce((sum, l) => sum + l.amount, 0);

  return {
    leakages,
    total_leakage: totalLeakage,
    total_formatted: formatCurrency(totalLeakage),
    health_score: calculateFinancialHealth(totalLeakage, leakages.length),
  };
}

/**
 * Get GEO-aware tax compliance status.
 */
export function getTaxCompliance(countryCode, stateCode) {
  const rules = TAX_RULES[countryCode?.toUpperCase()] || TAX_RULES.IN;
  let effectiveRate = rules.rate;

  if (rules.type === 'Sales Tax' && rules.stateRates && stateCode) {
    effectiveRate = rules.stateRates[stateCode.toUpperCase()] || 0;
  }

  return {
    country: rules.name,
    country_code: countryCode?.toUpperCase() || 'IN',
    tax_type: rules.type,
    tax_label: rules.label,
    rate: effectiveRate,
    components: rules.components,
    hsn_code: rules.hsnCode || null,
    currency: rules.currency,
    recommended_gateway: rules.gateway,
    compliance_notes: generateComplianceNotes(rules, effectiveRate),
  };
}

/**
 * Generate comprehensive financial summary.
 */
export async function getFinancialSummary(gymId, countryCode = 'IN', stateCode = null) {
  const [mrr, arpu, recovery, nudges, leakage] = await Promise.all([
    calculateMRR(gymId),
    calculateARPU(gymId),
    analyzePaymentRecovery(gymId),
    getPendingNudges(gymId),
    analyzeRevenueLeakage(gymId),
  ]);

  const tax = getTaxCompliance(countryCode, stateCode);

  // Generate AI insights
  const insights = generateInsights({ mrr, arpu, recovery, nudges, leakage, tax });

  return {
    mrr,
    arpu,
    payment_recovery: recovery,
    pending_nudges: nudges,
    revenue_leakage: leakage,
    tax_compliance: tax,
    insights,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Get churn financial impact.
 */
export async function getChurnFinancialImpact(gymId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Members who departed this month
  const churned = await db('members')
    .where({ gym_id: gymId, status: 'expired' })
    .where('updated_at', '>=', monthStart);

  // Revenue lost from churned members
  const churnedMemberships = await db('memberships')
    .where({ gym_id: gymId })
    .whereIn('member_id', churned.map(m => m.id))
    .orderBy('end_date', 'desc');

  const lostRevenue = churnedMemberships.reduce((sum, m) => sum + (m.amount_paise || 0), 0);

  // At-risk members (from churn scores)
  const atRisk = await db('churn_scores')
    .where({ gym_id: gymId })
    .where('risk_level', 'critical')
    .count('id as count')
    .first();

  const highRisk = await db('churn_scores')
    .where({ gym_id: gymId })
    .where('risk_level', 'high')
    .count('id as count')
    .first();

  return {
    churned_this_month: churned.length,
    lost_revenue: lostRevenue,
    lost_revenue_formatted: formatCurrency(lostRevenue),
    at_risk_critical: parseInt(atRisk?.count || 0),
    at_risk_high: parseInt(highRisk?.count || 0),
    projected_loss: formatCurrency(lostRevenue * 1.5), // Estimated if at-risk also churn
  };
}

// ── Revenue Timeline ───────────────────────────────────────────────

export async function getRevenueTimeline(gymId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const dailyRevenue = await db('payments')
    .where({ gym_id: gymId, status: 'captured' })
    .where('created_at', '>=', since)
    .select(db.raw("DATE(created_at) as date"))
    .sum('amount_paise as revenue')
    .count('id as transactions')
    .groupByRaw('DATE(created_at)')
    .orderBy('date', 'asc');

  return {
    timeline: dailyRevenue.map(d => ({
      date: d.date,
      revenue: parseInt(d.revenue || 0),
      revenue_formatted: formatCurrency(parseInt(d.revenue || 0)),
      transactions: parseInt(d.transactions || 0),
    })),
    period_days: days,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(paise, currency = 'INR') {
  const amount = paise / 100;
  if (currency === 'INR') {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function generateNudgeMessage(name, daysOverdue, plan) {
  const firstName = (name || 'Member').split(' ')[0];
  if (daysOverdue <= 3) {
    return `Hi ${firstName}! Your ${plan || 'membership'} renewal is due. Tap here to renew and keep your streak going! 🙌`;
  }
  if (daysOverdue <= 7) {
    return `Hey ${firstName}, your ${plan || 'membership'} expired ${daysOverdue} days ago. Renew now to avoid losing your progress data.`;
  }
  return `${firstName}, we miss you at the gym! Your membership expired ${daysOverdue} days ago. Come back with a special renewal offer.`;
}

function calculateFinancialHealth(totalLeakage, issueCount) {
  if (issueCount === 0) return { score: 95, label: 'Excellent', color: '#22C55E' };
  if (totalLeakage < 50000) return { score: 80, label: 'Good', color: '#22C55E' }; // < ₹500
  if (totalLeakage < 200000) return { score: 60, label: 'Needs Attention', color: '#F59E0B' }; // < ₹2000
  if (totalLeakage < 500000) return { score: 40, label: 'At Risk', color: '#EA4335' }; // < ₹5000
  return { score: 20, label: 'Critical', color: '#DC2626' };
}

function generateComplianceNotes(rules, rate) {
  const notes = [];
  if (rules.type === 'GST' && rules.hsnCode) {
    notes.push(`Use HSN code ${rules.hsnCode} for fitness services on all invoices.`);
    notes.push(`${rate}% GST applies: ${Object.entries(rules.components).map(([k, v]) => `${v}% ${k}`).join(' + ')}.`);
    notes.push('File GSTR-1 monthly and GSTR-3B quarterly.');
  } else if (rules.type === 'VAT') {
    notes.push(`${rate}% VAT applies to all membership fees and services.`);
    notes.push('Issue VAT-compliant invoices with your VAT registration number.');
  } else if (rules.type === 'Sales Tax') {
    notes.push(rate ? `${rate}% state sales tax applies.` : 'Check your state for applicable sales tax rate.');
    notes.push('Gym memberships may be exempt in some states — verify with your CPA.');
  }
  return notes;
}

function generateInsights(data) {
  const insights = [];

  // MRR insight
  if (data.mrr.change_pct < -5) {
    insights.push({
      type: 'warning',
      title: 'Revenue Declining',
      message: `Your monthly recurring revenue dropped ${Math.abs(data.mrr.change_pct)}% from last month. This is mainly driven by ${data.nudges.total_count} members with overdue payments.`,
      action: 'Send bulk WhatsApp reminders to overdue members',
      priority: 'high',
    });
  } else if (data.mrr.change_pct > 10) {
    insights.push({
      type: 'success',
      title: 'Strong Revenue Growth',
      message: `Great news! MRR grew ${data.mrr.change_pct}% this month with ${data.mrr.active_subscriptions} active subscriptions.`,
      priority: 'low',
    });
  }

  // Recovery insight
  if (data.recovery.recovery_rate < 50) {
    insights.push({
      type: 'alert',
      title: 'Low Payment Recovery Rate',
      message: `Only ${data.recovery.recovery_rate}% of failed payments were recovered. ${data.recovery.leakage_formatted} in revenue is at risk.`,
      action: 'Enable automatic payment retries and add SMS reminders',
      priority: 'critical',
    });
  }

  // Leakage insight
  if (data.leakage.leakages.length > 0) {
    const topLeakage = data.leakage.leakages.sort((a, b) => b.amount - a.amount)[0];
    insights.push({
      type: 'info',
      title: 'Top Revenue Leak',
      message: `"${topLeakage.title}" is your biggest revenue leak at ${topLeakage.amount_formatted} affecting ${topLeakage.affected_members} members.`,
      action: topLeakage.action,
      priority: topLeakage.priority,
    });
  }

  // Tax insight
  if (data.tax) {
    insights.push({
      type: 'compliance',
      title: `${data.tax.tax_type} Compliance`,
      message: `${data.tax.rate}% ${data.tax.tax_label} applies to your gym services. Ensure all invoices include proper tax breakdowns.`,
      priority: 'medium',
    });
  }

  return insights;
}

export default {
  calculateMRR,
  calculateARPU,
  analyzePaymentRecovery,
  getPendingNudges,
  analyzeRevenueLeakage,
  getTaxCompliance,
  getFinancialSummary,
  getChurnFinancialImpact,
  getRevenueTimeline,
};
