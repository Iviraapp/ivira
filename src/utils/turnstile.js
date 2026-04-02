import config from '../config/index.js'

export async function verifyTurnstile(token, ip) {
  if (!config.turnstile.enabled) return true // Skip in dev

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: config.turnstile.secretKey,
      response: token,
      remoteip: ip,
    }),
  })
  const data = await res.json()
  return data.success === true
}
