import { randomBytes } from 'crypto';
import db from '../config/database.js';
import config from '../config/index.js';
import { sendOTPEmail } from './email.service.js';
import jwt from 'jsonwebtoken';

export async function createMagicLink(email, role = 'owner') {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the target
  let target;
  if (role === 'owner') {
    target = await db('gyms').where({ owner_email: normalizedEmail }).first();
    if (!target) throw new Error('No gym found with this email');
  } else {
    target = await db('members').where({ email: normalizedEmail }).first();
    if (!target) throw new Error('No member found with this email');
  }

  // Rate limit: max 3 magic links per email per hour
  const recentCount = await db('magic_links')
    .where({ email: normalizedEmail })
    .where('created_at', '>', new Date(Date.now() - 3600000))
    .count('* as count')
    .first();

  if (parseInt(recentCount.count, 10) >= 3) {
    throw new Error('Too many requests. Please try again later.');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db('magic_links').insert({
    email: normalizedEmail,
    token,
    target_role: role,
    target_id: target.id,
    expires_at: expiresAt,
  });

  // Send email with magic link
  const magicUrl = `${config.baseUrl}/auth/magic/${token}`;

  if (config.gmail.enabled) {
    const mail = (await import('./email.service.js')).default;
    // Use the existing email service pattern
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: config.gmail.user, pass: config.gmail.appPassword },
    });

    await transporter.sendMail({
      from: `"IVIRA" <${config.gmail.user}>`,
      to: normalizedEmail,
      subject: 'Sign In to IVIRA — Magic Link',
      text: `Click this link to sign in: ${magicUrl}\n\nThis link expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;">
<tr><td align="center" style="padding-bottom:32px;font-family:'Helvetica Neue',sans-serif;font-size:24px;font-weight:700;color:#FFF;">IVIRA</td></tr>
<tr><td align="center" style="padding-bottom:8px;font-family:'Helvetica Neue',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6B7280;">Magic Link Sign In</td></tr>
<tr><td align="center" style="padding-bottom:32px;font-family:'Helvetica Neue',sans-serif;font-size:15px;color:rgba(255,255,255,0.6);">Click the button below to sign in to your dashboard.</td></tr>
<tr><td align="center" style="padding-bottom:32px;">
<a href="${magicUrl}" style="display:inline-block;padding:14px 40px;background:#7C3AED;color:#FFF;font-family:'Helvetica Neue',sans-serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Sign In</a>
</td></tr>
<tr><td align="center" style="padding-bottom:12px;font-family:'Helvetica Neue',sans-serif;font-size:12px;color:#6B7280;">This link expires in 5 minutes.</td></tr>
<tr><td style="height:1px;background:#1F1F1F;"></td></tr>
<tr><td align="center" style="padding-top:20px;font-family:'Helvetica Neue',sans-serif;font-size:11px;color:#374151;">Secured by IVIRA</td></tr>
</table></td></tr></table></body></html>`,
    });
  }

  return { sent: true, email: normalizedEmail, expiresAt };
}

export async function verifyMagicLink(token) {
  const link = await db('magic_links')
    .where({ token, is_used: false })
    .where('expires_at', '>', new Date())
    .first();

  if (!link) throw new Error('Invalid or expired magic link');

  // Mark as used
  await db('magic_links').where({ id: link.id }).update({ is_used: true });

  // Generate JWT based on role
  if (link.target_role === 'owner') {
    const gym = await db('gyms').where({ id: link.target_id }).first();
    if (!gym) throw new Error('Gym not found');

    const jwtToken = jwt.sign(
      { gymId: gym.id, email: link.email, role: 'owner' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    return { token: jwtToken, role: 'owner', gym };
  }

  // Member
  const member = await db('members').where({ id: link.target_id }).first();
  if (!member) throw new Error('Member not found');

  return { role: 'member', member };
}
