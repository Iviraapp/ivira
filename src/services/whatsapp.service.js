import axios from 'axios'
import config from '../config/index.js'

const watiClient = () => {
  if (!config.wati?.apiUrl || !config.wati?.apiToken) return null
  return axios.create({
    baseURL: config.wati.apiUrl,
    headers: { Authorization: `Bearer ${config.wati.apiToken}` },
    timeout: 10000,
  })
}

export async function sendTemplateMessage(phone, templateName, params) {
  const client = watiClient()
  if (!client) {
    console.log(`[WhatsApp-DEV] Template: ${templateName} to ${phone}`, params)
    return { success: true, dev: true }
  }
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '')
  const { data } = await client.post(
    `/api/v1/sendTemplateMessage?whatsappNumber=91${cleanPhone}`,
    {
      template_name: templateName,
      broadcast_name: `ivira_${templateName}_${Date.now()}`,
      parameters: params.map(p => ({ name: p.name, value: p.value })),
    }
  )
  return data
}

export async function sendCheckInAlert(member, gym) {
  return sendTemplateMessage(member.phone, 'checkin_confirmed', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
  ])
}

export async function sendRenewalReminder(member, gym, daysLeft) {
  const renewalLink = `${config.baseUrl}/member/${gym.id}`
  return sendTemplateMessage(member.phone, 'renewal_reminder', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'days_left', value: String(daysLeft) },
    { name: 'renewal_link', value: renewalLink },
  ])
}

export async function sendPaymentConfirmation(member, gym, amountPaise, invoiceUrl) {
  const amount = (amountPaise / 100).toLocaleString('en-IN')
  return sendTemplateMessage(member.phone, 'payment_confirmed', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'amount', value: `₹${amount}` },
    { name: 'invoice_url', value: invoiceUrl || '' },
  ])
}

export async function sendWinBackMessage(member, gym, offerText) {
  const link = `${config.baseUrl}/member/${gym.id}`
  return sendTemplateMessage(member.phone, 'win_back', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'offer_text', value: offerText },
    { name: 'link', value: link },
  ])
}

export async function sendStreakNudge(member, gym, streakDays) {
  return sendTemplateMessage(member.phone, 'streak_nudge', [
    { name: 'member_name', value: member.name },
    { name: 'gym_name', value: gym.name || gym.gym_name },
    { name: 'streak_days', value: String(streakDays) },
  ])
}

export async function sendCheckinPromo(member, brand, discount, link) {
  return sendTemplateMessage(member.phone, 'checkin_promo', [
    { name: 'member_name', value: member.name },
    { name: 'brand_name', value: brand.name },
    { name: 'discount', value: discount },
    { name: 'link', value: link },
  ])
}

export async function sendBroadcast(gymId, memberPhones, templateName, params) {
  const results = { sent: 0, failed: 0, errors: [] }
  for (const phone of memberPhones) {
    try {
      await sendTemplateMessage(phone, templateName, params)
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
