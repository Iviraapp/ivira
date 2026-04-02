import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  db: {
    url: process.env.DATABASE_URL || 'postgresql://ivira:ivira@localhost:5432/ivira',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    enabled: !!(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PROJECT_ID !== 'your-project-id' &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ),
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  wati: {
    apiUrl: process.env.WATI_API_URL,
    apiToken: process.env.WATI_API_TOKEN,
  },

  sms: {
    authKey: process.env.SMS_AUTH_KEY,
    senderId: process.env.SMS_SENDER_ID || 'IVIRA',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'resend',
    user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'admin@ivira.app',
    password: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD,
    resendApiKey: process.env.RESEND_API_KEY,
    enabled: !!(
      process.env.RESEND_API_KEY ||
      ((process.env.EMAIL_USER || process.env.GMAIL_USER) &&
       (process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD))
    ),
  },

  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('FATAL: JWT_SECRET must be set in production'); })()
      : 'ivira-dev-secret-DO-NOT-USE-IN-PROD'),
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    enabled: !!process.env.ANTHROPIC_API_KEY,
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    enabled: !!process.env.DEEPSEEK_API_KEY,
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    enabled: !!process.env.OPENROUTER_API_KEY,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    enabled: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
  },

  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY,
    enabled: !!(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY),
  },

  blob: {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    enabled: !!process.env.BLOB_READ_WRITE_TOKEN,
  },

  googleWallet: {
    issuerEmail: process.env.GOOGLE_WALLET_ISSUER_EMAIL,
    issuerKey: process.env.GOOGLE_WALLET_PRIVATE_KEY,  // PEM private key
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID,     // from Google Pay & Wallet Console
    enabled: !!(process.env.GOOGLE_WALLET_ISSUER_EMAIL && process.env.GOOGLE_WALLET_PRIVATE_KEY),
  },

  appleWallet: {
    passTypeId: process.env.APPLE_PASS_TYPE_ID,       // e.g. pass.app.ivira.membership
    teamId: process.env.APPLE_TEAM_ID,
    certPem: process.env.APPLE_PASS_CERT_PEM,
    keyPem: process.env.APPLE_PASS_KEY_PEM,
    enabled: !!(process.env.APPLE_PASS_TYPE_ID && process.env.APPLE_PASS_CERT_PEM),
  },

  adminSecret: process.env.ADMIN_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FATAL: ADMIN_SECRET must be set in production'); })()
    : 'ivira-dev-admin-DO-NOT-USE-IN-PROD'),

  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,

  app: {
    trialDays: parseInt(process.env.TRIAL_DAYS || '14', 10),
    gpsRadiusMeters: parseInt(process.env.GPS_RADIUS_METERS || '150', 10),
    trialMaxMembers: parseInt(process.env.TRIAL_MAX_MEMBERS || '50', 10),
  },

  features: {
    trialGuard: process.env.ENABLE_TRIAL_GUARD === 'true',   // default: OFF — set to 'true' when ready
    auditLog: process.env.ENABLE_AUDIT_LOG !== 'false',       // default: ON — set to 'false' to disable
    tokenBlacklist: process.env.ENABLE_TOKEN_BLACKLIST !== 'false', // default: ON (fails open)
  },
};

// Production will throw before reaching here if secrets are missing (see IIFE guards above)

export default config;
