import axios from 'axios'
import config from '../config/index.js'

const msg91Client = () => {
  if (!config.sms?.authKey) return null
  return axios.create({
    baseURL: 'https://control.msg91.com/api/v5',
    headers: { authkey: config.sms.authKey },
    timeout: 10000,
  })
}

export async function sendSMS(phone, message) {
  const client = msg91Client()
  if (!client) {
    console.log(`[SMS-DEV] To: ${phone} | ${message}`)
    return { success: true, dev: true }
  }
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '')
  const { data } = await client.post('/flow/', {
    sender: config.sms.senderId || 'IVIRA',
    route: '4', // transactional
    country: '91',
    sms: [{ message, to: [cleanPhone] }],
  })
  return data
}

export async function sendRenewalSMS(phone, memberName, gymName, daysLeft) {
  return sendSMS(phone,
    `Hi ${memberName}, your ${gymName} membership expires in ${daysLeft} days. Call us to renew.`
  )
}

export async function sendPaymentSMS(phone, memberName, amount, gymName) {
  const formatted = (amount / 100).toLocaleString('en-IN')
  return sendSMS(phone,
    `Payment of Rs.${formatted} received for ${gymName} membership. Thank you, ${memberName}!`
  )
}

export async function sendOTPSMS(phone, otp) {
  return sendSMS(phone, `Your IVIRA OTP is ${otp}. Valid for 5 minutes.`)
}
