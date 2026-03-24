/**
 * Apple Wallet + Google Wallet pass generation with geofencing.
 *
 * When a member adds their pass to their phone wallet:
 * - The OS automatically shows the pass on the lock screen when near the gym
 * - Member taps the notification → pass opens with barcode/NFC for check-in
 * - No background location tracking needed — the OS wallet engine handles it
 */
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// ─── Google Wallet ──────────────────────────────────────────────────

const GOOGLE_WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1';

/**
 * Sign a JWT for Google Wallet API calls using the service account.
 */
async function getGoogleAccessToken() {
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: {
      client_email: config.googleWallet.issuerEmail,
      private_key: config.googleWallet.issuerKey?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  return tokenRes.token;
}

/**
 * Create or update a Google Wallet pass class (template) for a gym.
 * One class per gym — defines the layout, colors, and geofence.
 */
async function ensureGooglePassClass(gym) {
  const classId = `${config.googleWallet.issuerId}.ivira_gym_${gym.id.replace(/-/g, '_')}`;
  const accessToken = await getGoogleAccessToken();

  const classObject = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: { fields: [{ fieldPath: 'object.textModulesData["member_name"]' }] },
              },
              endItem: {
                firstValue: { fields: [{ fieldPath: 'object.textModulesData["plan"]' }] },
              },
            },
          },
        ],
      },
    },
    issuerName: 'IVIRA',
    reviewStatus: 'UNDER_REVIEW',
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    // Geofence — triggers lock screen notification when member is near the gym
    ...(gym.latitude && gym.longitude ? {
      locations: [{
        latitude: parseFloat(gym.latitude),
        longitude: parseFloat(gym.longitude),
      }],
    } : {}),
  };

  // Try to get existing class, create if not found
  try {
    const getRes = await fetch(`${GOOGLE_WALLET_API}/genericClass/${classId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (getRes.ok) {
      // Update existing class
      await fetch(`${GOOGLE_WALLET_API}/genericClass/${classId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classObject),
      });
      return classId;
    }
  } catch {}

  // Create new class
  const createRes = await fetch(`${GOOGLE_WALLET_API}/genericClass`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(classObject),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('[GoogleWallet] Failed to create class:', err);
    // Continue anyway — the class might already exist with a different status
  }

  return classId;
}

/**
 * Generate a Google Wallet "Save" URL for a member's gym pass.
 * The pass includes:
 * - Member name, gym name, plan info
 * - QR barcode for scanner check-in
 * - Geofence location (triggers lock screen notification)
 * - Expiry date
 */
export async function generateGoogleWalletPass(gymId, memberId) {
  if (!config.googleWallet.enabled) {
    throw new ValidationError('Google Wallet is not configured');
  }

  const [gym, member] = await Promise.all([
    db('gyms').where({ id: gymId }).first(),
    db('members').where({ id: memberId, gym_id: gymId }).first(),
  ]);

  if (!gym) throw new NotFoundError('Gym');
  if (!member) throw new NotFoundError('Member');

  // Get active membership
  const membership = await db('memberships')
    .where({ member_id: memberId, gym_id: gymId, status: 'active' })
    .first();

  const planName = membership?.plan_name || 'Member';
  const endDate = membership?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Generate a QR token for barcode check-in (long-lived for wallet)
  const qrToken = jwt.sign(
    { memberId, gymId, type: 'wallet-checkin' },
    config.jwt.secret,
    { expiresIn: '365d' }
  );

  // Ensure pass class exists for this gym
  const classId = await ensureGooglePassClass(gym);

  // Create pass object
  const objectId = `${config.googleWallet.issuerId}.ivira_pass_${memberId.replace(/-/g, '_')}_${gymId.replace(/-/g, '_')}`;

  const passObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    hexBackgroundColor: '#0B1224',
    logo: {
      sourceUri: { uri: gym.logo_url || 'https://ivira.app/icon-192.png' },
      contentDescription: { defaultValue: { language: 'en', value: 'IVIRA' } },
    },
    cardTitle: {
      defaultValue: { language: 'en', value: gym.gym_name || 'IVIRA' },
    },
    subheader: {
      defaultValue: { language: 'en', value: 'MEMBER' },
    },
    header: {
      defaultValue: { language: 'en', value: member.name },
    },
    textModulesData: [
      { id: 'member_name', header: 'NAME', body: member.name },
      { id: 'plan', header: 'PLAN', body: planName },
      { id: 'valid_until', header: 'VALID UNTIL', body: new Date(endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) },
    ],
    barcode: {
      type: 'QR_CODE',
      value: qrToken,
      alternateText: `${member.name} — ${planName}`,
    },
    // Geofence — member gets lock screen notification when near the gym
    ...(gym.latitude && gym.longitude ? {
      locations: [{
        latitude: parseFloat(gym.latitude),
        longitude: parseFloat(gym.longitude),
      }],
    } : {}),
    // Notification when near gym
    ...(gym.latitude && gym.longitude ? {
      notifications: {
        upcomingNotification: {
          enableNotification: true,
        },
      },
    } : {}),
    state: 'ACTIVE',
    validTimeInterval: {
      start: { date: new Date().toISOString() },
      end: { date: new Date(endDate).toISOString() },
    },
  };

  // Create the "Add to Google Wallet" JWT
  const claims = {
    iss: config.googleWallet.issuerEmail,
    aud: 'google',
    origins: ['https://ivira.app', 'https://api.ivira.app'],
    typ: 'savetowallet',
    payload: {
      genericObjects: [passObject],
    },
  };

  const privateKey = config.googleWallet.issuerKey?.replace(/\\n/g, '\n');
  const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
  const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

  // Store pass reference in DB for future updates
  await db('wallet_passes').insert({
    member_id: memberId,
    gym_id: gymId,
    platform: 'google',
    pass_id: objectId,
    class_id: classId,
    qr_token: qrToken,
  }).onConflict(['member_id', 'gym_id', 'platform']).merge({
    pass_id: objectId,
    qr_token: qrToken,
    updated_at: new Date(),
  }).catch(() => {
    // Table might not exist yet — non-critical
  });

  return { saveUrl, passId: objectId };
}

// ─── Apple Wallet ───────────────────────────────────────────────────

/**
 * Generate an Apple Wallet .pkpass file for a member's gym pass.
 * Returns base64-encoded .pkpass data.
 *
 * Requires Apple Developer certificates:
 * - Pass Type ID certificate (.p12 → PEM)
 * - WWDR intermediate certificate
 */
export async function generateAppleWalletPass(gymId, memberId) {
  if (!config.appleWallet.enabled) {
    throw new ValidationError('Apple Wallet is not configured. Pass Type ID certificate required.');
  }

  const [gym, member] = await Promise.all([
    db('gyms').where({ id: gymId }).first(),
    db('members').where({ id: memberId, gym_id: gymId }).first(),
  ]);

  if (!gym) throw new NotFoundError('Gym');
  if (!member) throw new NotFoundError('Member');

  const membership = await db('memberships')
    .where({ member_id: memberId, gym_id: gymId, status: 'active' })
    .first();

  const planName = membership?.plan_name || 'Member';
  const endDate = membership?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // QR token for barcode
  const qrToken = jwt.sign(
    { memberId, gymId, type: 'wallet-checkin' },
    config.jwt.secret,
    { expiresIn: '365d' }
  );

  // Build pass.json structure
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: config.appleWallet.passTypeId,
    serialNumber: `ivira_${memberId}_${gymId}`,
    teamIdentifier: config.appleWallet.teamId,
    organizationName: 'IVIRA',
    description: `${gym.gym_name} Membership`,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(11, 18, 36)',   // #0B1224
    labelColor: 'rgb(122, 133, 153)',      // #7A8599
    logoText: gym.gym_name || 'IVIRA',
    generic: {
      primaryFields: [
        { key: 'member', label: 'MEMBER', value: member.name },
      ],
      secondaryFields: [
        { key: 'plan', label: 'PLAN', value: planName },
        { key: 'valid', label: 'VALID UNTIL', value: new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
      ],
      auxiliaryFields: [
        { key: 'gym', label: 'GYM', value: gym.gym_name },
      ],
      backFields: [
        { key: 'address', label: 'Address', value: gym.address || '' },
        { key: 'phone', label: 'Contact', value: gym.owner_phone || '' },
      ],
    },
    barcode: {
      message: qrToken,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
      altText: `${member.name} — ${planName}`,
    },
    barcodes: [{
      message: qrToken,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
      altText: `${member.name} — ${planName}`,
    }],
    // NFC — enables "Hold Near Reader" for tap check-in
    nfc: {
      message: JSON.stringify({ memberId, gymId, type: 'ivira-checkin' }),
      encryptionPublicKey: '',  // Set when NFC encryption is configured
    },
    // Geofence — triggers lock screen notification when near the gym
    ...(gym.latitude && gym.longitude ? {
      locations: [{
        latitude: parseFloat(gym.latitude),
        longitude: parseFloat(gym.longitude),
        relevantText: `You're near ${gym.gym_name} — tap to check in`,
      }],
    } : {}),
    expirationDate: new Date(endDate).toISOString(),
    voided: false,
  };

  // For now return the pass structure. Full .pkpass signing needs
  // the Apple certificates which will be added later.
  // When certs are available, we'll use the `passkit-generator` package
  // to create the signed .pkpass bundle.

  return {
    passJson,
    qrToken,
    message: 'Apple Wallet pass structure ready. Certificates needed for signing.',
  };
}

// ─── Wallet Check-in Token Verification ─────────────────────────────

/**
 * Verify a wallet-generated QR token and check in the member.
 * These tokens are long-lived (365 days) since they're embedded in wallet passes.
 */
export function verifyWalletToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'wallet-checkin') {
      throw new ValidationError('Invalid wallet token');
    }
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ValidationError('Wallet pass has expired. Please update your pass.');
    }
    throw new ValidationError('Invalid wallet token');
  }
}
