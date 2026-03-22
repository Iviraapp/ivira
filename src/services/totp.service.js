import { randomBytes, createCipheriv, createDecipheriv, createHmac } from 'crypto';
import db from '../config/database.js';
import config from '../config/index.js';

// TOTP implementation (RFC 6238) — no external dependency
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateSecret(length = 20) {
  const bytes = randomBytes(length);
  let secret = '';
  for (const b of bytes) {
    secret += BASE32_CHARS[b % 32];
  }
  return secret;
}

function base32Decode(input) {
  let bits = '';
  for (const c of input.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hmacSha1(key, data) {
  return createHmac('sha1', key).update(data).digest();
}

function generateTOTP(secret, timeStep = 30, digits = 6) {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(time));

  const key = base32Decode(secret);
  const hmac = hmacSha1(key, timeBuffer);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % (10 ** digits);

  return code.toString().padStart(digits, '0');
}

function verifyTOTP(secret, token, window = 1) {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000 / timeStep);
  for (let i = -window; i <= window; i++) {
    const time = now + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));
    const key = base32Decode(secret);
    const hmac = hmacSha1(key, timeBuffer);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % (10 ** 6);
    if (code.toString().padStart(6, '0') === token) return true;
  }
  return false;
}

// Encrypt/decrypt secret for storage
const ALGO = 'aes-256-gcm';
const ENC_KEY = Buffer.from((config.jwt.secret + '0'.repeat(32)).slice(0, 32));

function encryptSecret(plaintext) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, ENC_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptSecret(ciphertext) {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGO, ENC_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

export async function setupTOTP(adminId) {
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  const encryptedSecret = encryptSecret(secret);

  // Upsert — replace existing if re-setting up
  await db('admin_totp_secrets').where({ admin_id: adminId }).del();
  await db('admin_totp_secrets').insert({
    admin_id: adminId,
    encrypted_secret: encryptedSecret,
    is_verified: false,
    backup_codes: backupCodes,
  });

  // Generate otpauth URI for QR code
  const admin = await db('super_admins').where({ id: adminId }).first();
  const otpauthUrl = `otpauth://totp/IVIRA:${admin.email}?secret=${secret}&issuer=IVIRA&digits=6&period=30`;

  return { secret, otpauthUrl, backupCodes };
}

export async function verifyAndEnableTOTP(adminId, token) {
  const record = await db('admin_totp_secrets').where({ admin_id: adminId }).first();
  if (!record) throw new Error('TOTP not set up');

  const secret = decryptSecret(record.encrypted_secret);
  const valid = verifyTOTP(secret, token);
  if (!valid) return { valid: false };

  await db('admin_totp_secrets').where({ admin_id: adminId }).update({
    is_verified: true,
    verified_at: new Date(),
  });

  return { valid: true };
}

export async function validateTOTP(adminId, token) {
  const record = await db('admin_totp_secrets').where({ admin_id: adminId, is_verified: true }).first();
  if (!record) return { valid: false, reason: '2fa_not_setup' };

  const secret = decryptSecret(record.encrypted_secret);

  // Check TOTP token
  if (verifyTOTP(secret, token)) return { valid: true };

  // Check backup codes
  if (record.backup_codes?.includes(token.toUpperCase())) {
    const updatedCodes = record.backup_codes.filter(c => c !== token.toUpperCase());
    await db('admin_totp_secrets').where({ admin_id: adminId }).update({ backup_codes: updatedCodes });
    return { valid: true, backup_code_used: true };
  }

  return { valid: false };
}

export async function hasTOTPEnabled(adminId) {
  const record = await db('admin_totp_secrets').where({ admin_id: adminId, is_verified: true }).first();
  return !!record;
}
