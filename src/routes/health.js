import db from '../config/database.js'
import config from '../config/index.js'

export default async function healthRoutes(fastify) {

  fastify.get('/health', async (request, reply) => {
    const results = {}
    const errors = []

    // 1. Database
    try { await db.raw('SELECT 1'); results.database = { status: 'ok' } }
    catch (err) { results.database = { status: 'error', error: err.message }; errors.push('database') }

    // 2. Redis
    try {
      const { default: redis } = await import('../config/redis.js')
      await redis.ping()
      results.redis = { status: 'ok' }
    } catch (err) { results.redis = { status: 'error', error: err.message }; errors.push('redis') }

    // 3. DeepSeek
    if (!config.deepseek.enabled) {
      results.deepseek = { status: 'missing', message: 'Set DEEPSEEK_API_KEY' }
    } else {
      try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.deepseek.apiKey}` },
          body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }),
        })
        results.deepseek = res.ok ? { status: 'ok', model: 'deepseek-chat' } : { status: 'error', error: `HTTP ${res.status}` }
        if (!res.ok) errors.push('deepseek')
      } catch (err) { results.deepseek = { status: 'error', error: err.message }; errors.push('deepseek') }
    }

    // 4. Anthropic
    if (!config.anthropic.enabled) {
      results.anthropic = { status: 'missing', message: 'Set ANTHROPIC_API_KEY' }
    } else {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { 'Content-Type': 'application/json', 'x-api-key': config.anthropic.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }),
        })
        results.anthropic = res.ok ? { status: 'ok', model: 'claude-haiku-4-5-20251001' } : { status: 'error', error: `HTTP ${res.status}` }
        if (!res.ok) errors.push('anthropic')
      } catch (err) { results.anthropic = { status: 'error', error: err.message }; errors.push('anthropic') }
    }

    // 5. Razorpay
    if (!config.razorpay.keyId) {
      results.razorpay = { status: 'missing', message: 'Set RAZORPAY_KEY_ID' }
    } else {
      try {
        const res = await fetch('https://api.razorpay.com/v1/plans', {
          signal: AbortSignal.timeout(8000),
          headers: { 'Authorization': 'Basic ' + Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64') },
        })
        const ok = res.status === 200 || res.status === 400
        results.razorpay = ok ? { status: 'ok', webhook_secret: config.razorpay.webhookSecret ? 'set' : 'MISSING' } : { status: 'error', error: `HTTP ${res.status}` }
        if (!ok) errors.push('razorpay')
      } catch (err) { results.razorpay = { status: 'error', error: err.message }; errors.push('razorpay') }
    }

    // 6. Stripe
    if (!config.stripe?.enabled) {
      results.stripe = { status: 'missing', message: 'Set STRIPE_SECRET_KEY for international payments' }
    } else {
      try {
        const res = await fetch('https://api.stripe.com/v1/balance', { signal: AbortSignal.timeout(8000), headers: { 'Authorization': `Bearer ${config.stripe.secretKey}` } })
        results.stripe = res.ok ? { status: 'ok', webhook_secret: config.stripe.webhookSecret ? 'set' : 'MISSING' } : { status: 'error', error: `HTTP ${res.status}` }
        if (!res.ok) errors.push('stripe')
      } catch (err) { results.stripe = { status: 'error', error: err.message }; errors.push('stripe') }
    }

    // 7. Firebase
    if (!config.firebase?.enabled) {
      results.firebase = { status: 'missing', message: 'Set FIREBASE_PROJECT_ID + CLIENT_EMAIL + PRIVATE_KEY for push notifications' }
    } else {
      results.firebase = { status: 'ok', project: config.firebase.projectId }
    }

    // 8. Resend
    if (!config.email?.resendApiKey) {
      results.resend = { status: 'missing', message: 'Set RESEND_API_KEY for emails' }
    } else {
      try {
        const res = await fetch('https://api.resend.com/domains', { signal: AbortSignal.timeout(8000), headers: { 'Authorization': `Bearer ${config.email.resendApiKey}` } })
        results.resend = res.ok ? { status: 'ok' } : { status: 'error', error: `HTTP ${res.status}` }
        if (!res.ok) errors.push('resend')
      } catch (err) { results.resend = { status: 'error', error: err.message }; errors.push('resend') }
    }

    // 9. WhatsApp (WATI)
    if (!config.wati?.apiUrl || !config.wati?.apiToken) {
      results.whatsapp = { status: 'missing', message: 'Set WATI_API_URL + WATI_API_TOKEN' }
    } else {
      results.whatsapp = { status: 'ok', provider: 'WATI' }
    }

    // 10. SMS (MSG91)
    if (!config.sms?.authKey) {
      results.sms = { status: 'missing', message: 'Set SMS_AUTH_KEY for OTP' }
    } else {
      results.sms = { status: 'ok', sender_id: config.sms.senderId }
    }

    // 11. Gemini
    if (!config.gemini?.enabled) {
      results.gemini = { status: 'missing', message: 'Set GEMINI_API_KEY for Workout Analyzer' }
    } else {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.gemini.apiKey}`, { signal: AbortSignal.timeout(8000) })
        results.gemini = res.ok ? { status: 'ok' } : { status: 'error', error: `HTTP ${res.status}` }
        if (!res.ok) errors.push('gemini')
      } catch (err) { results.gemini = { status: 'error', error: err.message }; errors.push('gemini') }
    }

    // 12. Blob
    if (!config.blob?.enabled) {
      results.blob = { status: 'missing', message: 'Set BLOB_READ_WRITE_TOKEN for photo storage' }
    } else {
      results.blob = { status: 'ok' }
    }

    // 13. Sentry
    results.sentry = process.env.SENTRY_DSN ? { status: 'ok' } : { status: 'missing', message: 'Set SENTRY_DSN' }

    // 14. Turnstile + Google
    results.turnstile = config.turnstile?.enabled ? { status: 'ok' } : { status: 'missing', message: 'Set TURNSTILE_SECRET_KEY' }
    results.googleAuth = config.google?.enabled ? { status: 'ok' } : { status: 'missing', message: 'Set GOOGLE_CLIENT_ID' }

    // 15. Secrets
    results.secrets = {
      jwt_secret: process.env.JWT_SECRET ? 'set' : 'ERROR — insecure dev default',
      admin_secret: process.env.ADMIN_SECRET ? 'set' : 'ERROR — insecure dev default',
      base_url: config.baseUrl,
    }
    if (!process.env.JWT_SECRET) errors.push('jwt_secret')
    if (!process.env.ADMIN_SECRET) errors.push('admin_secret')

    const critical = ['database', 'redis', 'jwt_secret', 'admin_secret']
    const hasCriticalError = critical.some(k => errors.includes(k))

    return reply.code(hasCriticalError ? 503 : 200).send({
      status: hasCriticalError ? 'critical' : errors.length > 0 ? 'degraded' : 'ok',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      errors_found: errors,
      services: results,
    })
  })

  fastify.get('/ping', async () => ({ pong: true, ts: Date.now() }))
}
