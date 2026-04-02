import axios from 'axios'
import config from '../config/index.js'

const COUNTRY_DIAL_CODES = {
  IN: '91', AE: '971', GB: '44', US: '1', AU: '61',
  CA: '1', SG: '65', NZ: '64', SA: '966', QA: '974',
}

function getSMSNumber(phone, countryCode = 'IN') {
  const clean = phone.replace(/\D/g, '')
  const dialCode = COUNTRY_DIAL_CODES[countryCode] || '91'
  // If already has the correct prefix, return as-is
  if (clean.startsWith(dialCode)) return clean
  // Strip any existing country code prefix and re-add correct one
  const stripped = clean.replace(/^(91|971|44|1|61|65|64|966|974)/, '')
  return dialCode + stripped
}

const msg91Client = () => {
  if (!config.sms?.authKey) return null
  return axios.create({
    baseURL: 'https://control.msg91.com/api/v5',
    headers: { authkey: config.sms.authKey },
    timeout: 10000,
  })
}

export async function sendSMS(phone, message, countryCode = 'IN') {
  const client = msg91Client()
  if (!client) {
    console.log(`[SMS-DEV] To: ${phone} | ${message}`)
    return { success: true, dev: true }
  }
  const dialCode = COUNTRY_DIAL_CODES[countryCode] || '91'
  const fullNumber = getSMSNumber(phone, countryCode)
  // MSG91 expects country code separately and phone without it
  const phoneWithoutDialCode = fullNumber.startsWith(dialCode)
    ? fullNumber.slice(dialCode.length)
    : fullNumber
  const { data } = await client.post('/flow/', {
    sender: config.sms.senderId || 'IVIRA',
    route: '4', // transactional
    country: dialCode,
    sms: [{ message, to: [phoneWithoutDialCode] }],
  })
  return data
}

export async function sendRenewalSMS(phone, memberName, gymName, daysLeft, countryCode = 'IN') {
  return sendSMS(phone,
    `Hi ${memberName}, your ${gymName} membership expires in ${daysLeft} days. Call us to renew.`,
    countryCode
  )
}

export async function sendPaymentSMS(phone, memberName, amount, gymName, countryCode = 'IN') {
  const formatted = (amount / 100).toLocaleString('en-IN')
  return sendSMS(phone,
    `Payment of Rs.${formatted} received for ${gymName} membership. Thank you, ${memberName}!`,
    countryCode
  )
}

export async function sendOTPSMS(phone, otp, countryCode = 'IN') {
  return sendSMS(phone, `Your IVIRA OTP is ${otp}. Valid for 5 minutes.`, countryCode)
}
