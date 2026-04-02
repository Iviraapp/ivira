import axios from 'axios'
import config from '../config/index.js'

const COUNTRY_DIAL_CODES = {
  IN: '91', AE: '971', GB: '44', US: '1', AU: '61',
  CA: '1', SG: '65', NZ: '64', SA: '966', QA: '974',
}

function getWhatsAppNumber(phone, countryCode = 'IN') {
  const clean = phone.replace(/\D/g, '')
  const dialCode = COUNTRY_DIAL_CODES[countryCode] || '91'
  // If already has the correct prefix, return as-is
  if (clean.startsWith(dialCode)) return clean
  // Strip any existing country code prefix and re-add correct one
  const stripped = clean.replace(/^(91|971|44|1|61|65|64|966|974)/, '')
  return dialCode + stripped
}

const watiClient = () => {
  if (!config.wati?.apiUrl || !config.wati?.apiToken) return null
  return axios.create({
    baseURL: config.wati.apiUrl,
    headers: { Authorization: `Bearer ${config.wati.apiToken}` },
    timeout: 10000,
  })
}

export async function sendTemplateMessage(phone, templateName, params, countryCode = 'IN') {
  const client = watiClient()
  if (!client) {
    console.log(`[WhatsApp-DEV] Template: ${templateName} to ${phone}`, params)
    return { success: true, dev: true }
  }
  const whatsappNumber = getWhatsAppNumber(phone, countryCode)
  const { data } = await client.post(
    `/api/v1/sendTemplateMessage?whatsappNumber=${whatsappNumber}`,
    {
      template_name: templateName,
      broadcast_name: `ivira_${templateName}_${Date.now()}`,
      parameters: params.map(p => ({ name: p.name, value: p.value })),
    }
  )
  return data
}

export async function sendCheckInAlert(member, gym, countryCode = 'IN') {
  return sendTemplateMessage(member.phone, 'checkin_confirmed', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
  ], countryCode)
}

export async function sendRenewalReminder(member, gym, daysLeft, countryCode = 'IN') {
  const renewalLink = `${config.baseUrl}/member/${gym.id}`
  return sendTemplateMessage(member.phone, 'renewal_reminder', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'days_left', value: String(daysLeft) },
    { name: 'renewal_link', value: renewalLink },
  ], countryCode)
}

export async function sendPaymentConfirmation(member, gym, amountPaise, invoiceUrl, countryCode = 'IN') {
  const amount = (amountPaise / 100).toLocaleString('en-IN')
  return sendTemplateMessage(member.phone, 'payment_confirmed', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'amount', value: `₹${amount}` },
    { name: 'invoice_url', value: invoiceUrl || '' },
  ], countryCode)
}

export async function sendWinBackMessage(member, gym, offerText, countryCode = 'IN') {
  const link = `${config.baseUrl}/member/${gym.id}`
  return sendTemplateMessage(member.phone, 'win_back', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'offer_text', value: offerText },
    { name: 'link', value: link },
  ], countryCode)
}

export async function sendStreakNudge(member, gym, streakDays, countryCode = 'IN') {
  return sendTemplateMessage(member.phone, 'streak_nudge', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'streak_days', value: String(streakDays) },
  ], countryCode)
}

export async function sendCheckinPromo(member, brand, discount, link, countryCode = 'IN') {
  return sendTemplateMessage(member.phone, 'checkin_promo', [
    { name: 'member_name', value: member.name },
    { name: 'brand_name', value: brand.name },
    { name: 'discount', value: discount },
    { name: 'link', value: link },
  ], countryCode)
}

export async function sendInvoiceWhatsApp(member, invoice, countryCode = 'IN') {
  const amount = ((invoice.total_paise || 0) / 100).toLocaleString('en-IN')
  return sendTemplateMessage(member.phone, 'invoice_generated', [
    { name: 'member_name', value: member.name },
    { name: 'invoice_number', value: invoice.invoice_number || '\u2014' },
    { name: 'amount', value: `\u20B9${amount}` },
    { name: 'gym_name', value: invoice.gym_name || 'your gym' },
  ], countryCode)
}

export async function sendBroadcast(gymId, memberPhones, templateName, params, countryCode = 'IN') {
  const results = { sent: 0, failed: 0, errors: [] }
  for (const phone of memberPhones) {
    try {
      await sendTemplateMessage(phone, templateName, params, countryCode)
      results.sent++
      // Rate limit: 10/second
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      results.failed++
      results.errors.push({ phone, error: err.message })
    }
  }
  return results
}
