import PDFDocument from 'pdfkit';
import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const GST_RATE = 0.18;
const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

/**
 * Generate the next sequential invoice number for a gym in the current month.
 * Format: GYM-YYYYMM-NNNN (e.g., GYM-202603-0001)
 */
export async function getNextInvoiceNumber(gymId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `GYM-${year}${month}-`;

  const lastInvoice = await db('invoices')
    .where({ gym_id: gymId })
    .andWhere('invoice_number', 'like', `${prefix}%`)
    .orderBy('invoice_number', 'desc')
    .first();

  let nextSeq = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoice_number.split('-').pop(), 10);
    nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Create a GST invoice for a gym.
 * Calculates 18% GST split into 9% CGST + 9% SGST (intra-state).
 */
export async function createInvoice(gymId, { memberId, paymentId, lineItems, buyerName, buyerGstin, buyerAddress }) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');

  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    throw new ValidationError('At least one line item is required');
  }
  if (!buyerName || buyerName.trim().length < 2) {
    throw new ValidationError('Buyer name is required');
  }

  // Validate and compute line items
  let subtotalPaise = 0;
  const processedItems = lineItems.map((item, index) => {
    if (!item.description) {
      throw new ValidationError(`Line item ${index + 1}: description is required`);
    }
    if (!item.amountPaise || item.amountPaise <= 0) {
      throw new ValidationError(`Line item ${index + 1}: amountPaise must be positive`);
    }

    const quantity = item.quantity || 1;
    const itemTotal = item.amountPaise * quantity;
    subtotalPaise += itemTotal;

    return {
      description: item.description,
      quantity,
      unit_price_paise: item.amountPaise,
      total_paise: itemTotal,
      hsn_code: item.hsnCode || '99972', // Default HSN for fitness services
    };
  });

  const cgstPaise = Math.round(subtotalPaise * CGST_RATE);
  const sgstPaise = Math.round(subtotalPaise * SGST_RATE);
  const totalGstPaise = cgstPaise + sgstPaise;
  const totalPaise = subtotalPaise + totalGstPaise;

  const invoiceNumber = await getNextInvoiceNumber(gymId);

  const [invoice] = await db('invoices')
    .insert({
      gym_id: gymId,
      member_id: memberId || null,
      payment_id: paymentId || null,
      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      buyer_name: buyerName.trim(),
      buyer_gstin: buyerGstin?.trim() || null,
      buyer_address: buyerAddress?.trim() || null,
      line_items: JSON.stringify(processedItems),
      subtotal_paise: subtotalPaise,
      cgst_paise: cgstPaise,
      sgst_paise: sgstPaise,
      igst_paise: 0,
      total_paise: totalPaise,
      gst_rate: GST_RATE,
      status: 'issued',
    })
    .returning('*');

  return {
    ...invoice,
    line_items: processedItems,
  };
}

/**
 * Get a single invoice with member name.
 */
export async function getInvoice(gymId, invoiceId) {
  const invoice = await db('invoices')
    .where({ 'invoices.id': invoiceId, 'invoices.gym_id': gymId })
    .leftJoin('members', 'invoices.member_id', 'members.id')
    .select('invoices.*', 'members.name as member_name')
    .first();

  if (!invoice) throw new NotFoundError('Invoice');

  return {
    ...invoice,
    line_items: typeof invoice.line_items === 'string'
      ? JSON.parse(invoice.line_items)
      : invoice.line_items,
  };
}

/**
 * List invoices for a gym with pagination and optional filters.
 */
export async function listInvoices(gymId, { page = 1, limit = 50, month, year, status } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (page - 1) * limit;

  const query = db('invoices')
    .where({ 'invoices.gym_id': gymId })
    .leftJoin('members', 'invoices.member_id', 'members.id')
    .select('invoices.*', 'members.name as member_name');

  const countQuery = db('invoices').where({ gym_id: gymId });

  if (status) {
    query.andWhere('invoices.status', status);
    countQuery.andWhere('status', status);
  }

  if (year) {
    const yearInt = parseInt(year, 10);
    query.andWhereRaw('EXTRACT(YEAR FROM invoices.created_at) = ?', [yearInt]);
    countQuery.andWhereRaw('EXTRACT(YEAR FROM created_at) = ?', [yearInt]);
  }

  if (month) {
    const monthInt = parseInt(month, 10);
    query.andWhereRaw('EXTRACT(MONTH FROM invoices.created_at) = ?', [monthInt]);
    countQuery.andWhereRaw('EXTRACT(MONTH FROM created_at) = ?', [monthInt]);
  }

  const [{ count }] = await countQuery.count();

  const invoices = await query
    .orderBy('invoices.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    invoices: invoices.map((inv) => ({
      ...inv,
      line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : inv.line_items,
    })),
    total: parseInt(count, 10),
    page,
    limit,
  };
}

/**
 * Update an invoice's status (e.g., issued -> paid, cancelled).
 */
export async function updateInvoiceStatus(gymId, invoiceId, status) {
  const validStatuses = ['issued', 'paid', 'cancelled', 'void'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const invoice = await db('invoices').where({ id: invoiceId, gym_id: gymId }).first();
  if (!invoice) throw new NotFoundError('Invoice');

  if (invoice.status === 'void') {
    throw new ValidationError('Cannot update a voided invoice');
  }
  if (invoice.status === 'cancelled' && status !== 'void') {
    throw new ValidationError('Cancelled invoices can only be voided');
  }

  const [updated] = await db('invoices')
    .where({ id: invoiceId, gym_id: gymId })
    .update({ status, updated_at: new Date() })
    .returning('*');

  return {
    ...updated,
    line_items: typeof updated.line_items === 'string'
      ? JSON.parse(updated.line_items)
      : updated.line_items,
  };
}

/**
 * Get invoice statistics for a gym for a given month/year.
 */
export async function getInvoiceStats(gymId, month, year) {
  const now = new Date();
  const targetYear = parseInt(year, 10) || now.getFullYear();
  const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);

  const stats = await db('invoices')
    .where({ gym_id: gymId })
    .andWhereRaw('EXTRACT(YEAR FROM created_at) = ?', [targetYear])
    .andWhereRaw('EXTRACT(MONTH FROM created_at) = ?', [targetMonth])
    .select(
      db.raw('COALESCE(SUM(total_paise), 0)::bigint as total_invoiced_paise'),
      db.raw('COALESCE(SUM(cgst_paise + sgst_paise + igst_paise), 0)::bigint as total_gst_paise'),
      db.raw('COALESCE(SUM(CASE WHEN status = \'issued\' THEN total_paise ELSE 0 END), 0)::bigint as pending_paise'),
      db.raw('COALESCE(SUM(CASE WHEN status = \'paid\' THEN total_paise ELSE 0 END), 0)::bigint as paid_paise'),
      db.raw('COUNT(*)::int as total_invoices'),
      db.raw('COUNT(CASE WHEN status = \'paid\' THEN 1 END)::int as paid_count'),
      db.raw('COUNT(CASE WHEN status = \'issued\' THEN 1 END)::int as pending_count'),
      db.raw('COUNT(CASE WHEN status = \'cancelled\' THEN 1 END)::int as cancelled_count'),
    )
    .first();

  return {
    month: targetMonth,
    year: targetYear,
    totalInvoicedPaise: parseInt(stats.total_invoiced_paise, 10),
    totalGstPaise: parseInt(stats.total_gst_paise, 10),
    pendingPaise: parseInt(stats.pending_paise, 10),
    paidPaise: parseInt(stats.paid_paise, 10),
    totalInvoices: stats.total_invoices,
    paidCount: stats.paid_count,
    pendingCount: stats.pending_count,
    cancelledCount: stats.cancelled_count,
  };
}

// ---------------------------------------------------------------------------
// PDF Invoice Generation
// ---------------------------------------------------------------------------

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * Convert a number (in paise) to Indian-English words.
 * Supports up to 99,99,99,999 (i.e. ~100 crore rupees).
 * Returns e.g. "Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six and Seventy-Eight Paise Only"
 */
export function numberToWords(paise) {
  if (paise === 0) return 'Rupees Zero Only';

  const rupees = Math.floor(paise / 100);
  const paisePart = paise % 100;

  function twoDigits(n) {
    if (n < 20) return ONES[n];
    const t = TENS[Math.floor(n / 10)];
    const o = ONES[n % 10];
    return o ? `${t}-${o}` : t;
  }

  function threeDigits(n) {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts = [];
    if (h) parts.push(`${ONES[h]} Hundred`);
    if (rest) parts.push(twoDigits(rest));
    return parts.join(' and ');
  }

  function indianGrouping(n) {
    if (n === 0) return '';
    const parts = [];
    // Last three digits (hundreds)
    const hundreds = n % 1000;
    let remaining = Math.floor(n / 1000);
    // Thousands group (2 digits in Indian system)
    const thousands = remaining % 100;
    remaining = Math.floor(remaining / 100);
    // Lakhs group (2 digits)
    const lakhs = remaining % 100;
    remaining = Math.floor(remaining / 100);
    // Crores group (remaining)
    const crores = remaining;

    if (crores) parts.push(`${twoDigits(crores)} Crore`);
    if (lakhs) parts.push(`${twoDigits(lakhs)} Lakh`);
    if (thousands) parts.push(`${twoDigits(thousands)} Thousand`);
    if (hundreds) parts.push(threeDigits(hundreds));

    return parts.join(' ');
  }

  const rupeesWords = indianGrouping(rupees);
  const paiseWords = paisePart ? twoDigits(paisePart) : '';

  const parts = [];
  parts.push('Rupees');
  parts.push(rupeesWords || 'Zero');
  if (paiseWords) {
    parts.push(`and ${paiseWords} Paise`);
  }
  parts.push('Only');
  return parts.join(' ');
}

/**
 * Generate a PDF invoice buffer for download.
 * @param {string} gymId
 * @param {string} invoiceId
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePDF(gymId, invoiceId) {
  // Fetch invoice with gym + member info
  const invoice = await db('invoices')
    .where({ 'invoices.id': invoiceId, 'invoices.gym_id': gymId })
    .leftJoin('members', 'invoices.member_id', 'members.id')
    .leftJoin('gyms', 'invoices.gym_id', 'gyms.id')
    .select(
      'invoices.*',
      'members.name as member_name',
      'members.email as member_email',
      'members.phone as member_phone',
      'gyms.gym_name as gym_name',
      'gyms.address as gym_address',
      'gyms.owner_phone as gym_phone',
    )
    .first();

  if (!invoice) throw new NotFoundError('Invoice');

  const lineItems = typeof invoice.line_items === 'string'
    ? JSON.parse(invoice.line_items)
    : invoice.line_items;

  const formatRupees = (paise) => {
    const amount = (paise / 100).toFixed(2);
    // Indian comma grouping
    const [whole, decimal] = amount.split('.');
    const lastThree = whole.slice(-3);
    const rest = whole.slice(0, -3);
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (rest ? ',' : '') + lastThree;
    return `${formatted}.${decimal}`;
  };

  const formatDateShort = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ---- Build PDF ----
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfReady = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const PAGE_WIDTH = doc.page.width;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const BLUE = '#2563EB';
  const GRAY = '#64748B';
  const DARK = '#0F172A';
  const LIGHT_GRAY = '#F1F5F9';

  // ---- HEADER ----
  doc.font('Helvetica-Bold').fontSize(28).fillColor(BLUE).text('IVIRA', MARGIN, MARGIN);

  const headerRightX = PAGE_WIDTH - MARGIN;
  doc.font('Helvetica').fontSize(12).fillColor(GRAY)
    .text('TAX INVOICE', MARGIN, MARGIN, { align: 'right', width: CONTENT_WIDTH });

  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text(invoice.invoice_number, MARGIN, MARGIN + 18, { align: 'right', width: CONTENT_WIDTH });

  doc.font('Helvetica').fontSize(9).fillColor(GRAY)
    .text(`Issue Date: ${formatDateShort(invoice.created_at)}`, MARGIN, MARGIN + 34, { align: 'right', width: CONTENT_WIDTH });

  const dueDate = new Date(invoice.created_at);
  dueDate.setDate(dueDate.getDate() + 7);
  doc.text(`Due Date: ${formatDateShort(dueDate)}`, MARGIN, MARGIN + 47, { align: 'right', width: CONTENT_WIDTH });

  // Divider
  const dividerY = MARGIN + 68;
  doc.moveTo(MARGIN, dividerY).lineTo(PAGE_WIDTH - MARGIN, dividerY).strokeColor('#E2E8F0').lineWidth(1).stroke();

  // ---- PARTIES (two columns) ----
  const partiesY = dividerY + 16;
  const colWidth = CONTENT_WIDTH / 2 - 10;

  // From (left)
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('From', MARGIN, partiesY);
  let y = partiesY + 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(invoice.gym_name || 'Gym', MARGIN, y);
  y += 16;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  if (invoice.gym_address) { doc.text(invoice.gym_address, MARGIN, y, { width: colWidth }); y += doc.heightOfString(invoice.gym_address, { width: colWidth }) + 4; }
  if (invoice.gym_gstin) { doc.text(`GSTIN: ${invoice.gym_gstin}`, MARGIN, y); y += 13; }
  if (invoice.gym_phone) { doc.text(`Phone: ${invoice.gym_phone}`, MARGIN, y); y += 13; }

  // Bill To (right)
  const rightX = MARGIN + colWidth + 20;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Bill To', rightX, partiesY);
  let yR = partiesY + 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(invoice.buyer_name || invoice.member_name || '-', rightX, yR, { width: colWidth });
  yR += 16;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  if (invoice.member_email) { doc.text(invoice.member_email, rightX, yR, { width: colWidth }); yR += 13; }
  if (invoice.member_phone) { doc.text(`Phone: ${invoice.member_phone}`, rightX, yR); yR += 13; }
  if (invoice.buyer_gstin) { doc.text(`GSTIN: ${invoice.buyer_gstin}`, rightX, yR); yR += 13; }
  if (invoice.buyer_address) { doc.text(invoice.buyer_address, rightX, yR, { width: colWidth }); yR += doc.heightOfString(invoice.buyer_address, { width: colWidth }) + 4; }

  // ---- LINE ITEMS TABLE ----
  const tableTop = Math.max(y, yR) + 20;
  const colDesc = MARGIN;
  const colHSN = MARGIN + CONTENT_WIDTH * 0.45;
  const colPeriod = MARGIN + CONTENT_WIDTH * 0.58;
  const colAmount = MARGIN + CONTENT_WIDTH * 0.78;
  const ROW_HEIGHT = 28;

  // Table header background
  doc.rect(MARGIN, tableTop, CONTENT_WIDTH, ROW_HEIGHT).fill('#F8FAFC');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY);
  doc.text('Description', colDesc + 8, tableTop + 8);
  doc.text('HSN', colHSN, tableTop + 8);
  doc.text('Qty', colPeriod, tableTop + 8);
  doc.text('Amount (\u20B9)', colAmount, tableTop + 8, { width: CONTENT_WIDTH - (colAmount - MARGIN) - 8, align: 'right' });

  // Header bottom line
  doc.moveTo(MARGIN, tableTop + ROW_HEIGHT).lineTo(PAGE_WIDTH - MARGIN, tableTop + ROW_HEIGHT).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

  // Line items
  let rowY = tableTop + ROW_HEIGHT;
  for (const item of lineItems) {
    doc.font('Helvetica').fontSize(9).fillColor(DARK);
    doc.text(item.description, colDesc + 8, rowY + 8, { width: colHSN - colDesc - 16 });
    doc.fillColor(GRAY).text(item.hsn_code || '99972', colHSN, rowY + 8);
    doc.text(String(item.quantity || 1), colPeriod, rowY + 8);
    doc.fillColor(DARK).text(formatRupees(item.total_paise), colAmount, rowY + 8, { width: CONTENT_WIDTH - (colAmount - MARGIN) - 8, align: 'right' });
    doc.moveTo(MARGIN, rowY + ROW_HEIGHT).lineTo(PAGE_WIDTH - MARGIN, rowY + ROW_HEIGHT).strokeColor('#F1F5F9').lineWidth(0.5).stroke();
    rowY += ROW_HEIGHT;
  }

  // Summary rows
  const summaryX = colPeriod;
  const summaryValX = colAmount;
  const summaryWidth = CONTENT_WIDTH - (summaryValX - MARGIN) - 8;

  const drawSummaryRow = (label, valuePaise, opts = {}) => {
    rowY += 4;
    if (opts.bg) {
      doc.rect(summaryX - 8, rowY - 2, PAGE_WIDTH - MARGIN - summaryX + 8, 24).fill(opts.bg);
    }
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      .fillColor(opts.textColor || DARK)
      .text(label, summaryX, rowY + 4);
    doc.text(formatRupees(valuePaise), summaryValX, rowY + 4, { width: summaryWidth, align: 'right' });
    rowY += 22;
  };

  rowY += 4;
  doc.moveTo(summaryX - 8, rowY).lineTo(PAGE_WIDTH - MARGIN, rowY).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

  drawSummaryRow('Subtotal', invoice.subtotal_paise);

  if (invoice.igst_paise && invoice.igst_paise > 0) {
    drawSummaryRow('IGST @ 18%', invoice.igst_paise);
  } else {
    drawSummaryRow('CGST @ 9%', invoice.cgst_paise);
    drawSummaryRow('SGST @ 9%', invoice.sgst_paise);
  }

  drawSummaryRow('TOTAL', invoice.total_paise, { bold: true, bg: BLUE, textColor: '#FFFFFF' });

  // ---- FOOTER ----
  rowY += 16;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text('Amount in words:', MARGIN, rowY);
  rowY += 14;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(numberToWords(invoice.total_paise), MARGIN, rowY, { width: CONTENT_WIDTH });
  rowY += doc.heightOfString(numberToWords(invoice.total_paise), { width: CONTENT_WIDTH }) + 16;

  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Payment terms: Due within 7 days of issue', MARGIN, rowY);
  rowY += 18;
  doc.text(`Thank you for being a member of ${invoice.gym_name || 'our gym'}!`, MARGIN, rowY);

  // Watermark - bottom right
  const watermarkY = doc.page.height - MARGIN - 14;
  doc.font('Helvetica').fontSize(8).fillColor('#CBD5E1')
    .text('Powered by IVIRA', MARGIN, watermarkY, { align: 'right', width: CONTENT_WIDTH });

  doc.end();
  return pdfReady;
}

// ---------------------------------------------------------------------------
// Send Invoice (email or WhatsApp)
// ---------------------------------------------------------------------------

/**
 * Send invoice via email or WhatsApp.
 * method: 'email' | 'whatsapp'
 */
export async function sendInvoice(gymId, invoiceId, method) {
  const invoice = await getInvoice(gymId, invoiceId)

  // getInvoice doesn't join gyms, so fetch gym_name separately
  const gym = await db('gyms').where({ id: gymId }).first()
  const gymName = gym?.gym_name || gym?.name || null

  if (method === 'email') {
    if (!invoice.member_id) throw new ValidationError('Invoice has no linked member')
    const member = await db('members').where({ id: invoice.member_id }).first()
    if (!member?.email) throw new ValidationError('Member has no email address')

    const pdfBuffer = await generateInvoicePDF(gymId, invoiceId)
    const { sendInvoiceEmail } = await import('./email.service.js')
    await sendInvoiceEmail({
      to: member.email,
      memberName: member.name,
      invoiceNumber: invoice.invoice_number,
      totalPaise: invoice.total_paise,
      gymName,
      pdfBuffer,
    })
    return { sent: true, method: 'email', to: member.email }
  }

  if (method === 'whatsapp') {
    if (!invoice.member_id) throw new ValidationError('Invoice has no linked member')
    const member = await db('members').where({ id: invoice.member_id }).first()
    if (!member?.phone) throw new ValidationError('Member has no phone number')

    const { sendInvoiceWhatsApp } = await import('./whatsapp.service.js')
    await sendInvoiceWhatsApp(member, { ...invoice, gym_name: gymName })
    return { sent: true, method: 'whatsapp', to: member.phone }
  }

  throw new ValidationError('method must be email or whatsapp')
}
