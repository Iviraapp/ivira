import db from '../config/database.js';
import config from '../config/index.js';
import { sendEmail } from './email.service.js';

export async function sendWelcomeNotification(member, gym) {
  const loginUrl = `${config.baseUrl}/member/login`;
  const message = `Welcome to ${gym.gym_name}! Your IVIRA Member Hub is ready. Log in here: ${loginUrl}`;

  // Send WhatsApp via WATI if configured
  if (config.wati.apiUrl && config.wati.apiToken) {
    try {
      const phone = member.phone.replace('+', '');
      await fetch(`${config.wati.apiUrl}/api/v1/sendSessionMessage/${phone}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.wati.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageText: message }),
      });
    } catch (err) {
      console.error('WhatsApp welcome failed:', err.message);
    }
  }

  // Send Email if configured
  if (config.email.enabled && member.email) {
    try {
      await sendEmail({
        from: `${gym.gym_name} via IVIRA <${config.email.user}>`,
        to: member.email,
        subject: `Welcome to ${gym.gym_name}!`,
        text: `Hi ${member.name},\n\n${message}\n\nYour gym is using IVIRA for a seamless experience.\n\nSee you at the gym!`,
        html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;">
<tr><td align="center" style="padding-bottom:32px;font-family:'Helvetica Neue',sans-serif;font-size:24px;font-weight:700;color:#FFF;">${gym.gym_name}</td></tr>
<tr><td align="center" style="padding-bottom:8px;font-family:'Helvetica Neue',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6B7280;">ACCESS GRANTED</td></tr>
<tr><td align="center" style="padding-bottom:24px;font-family:'Helvetica Neue',sans-serif;font-size:18px;font-weight:600;color:#FFF;">Welcome, ${member.name}!</td></tr>
<tr><td align="center" style="padding-bottom:32px;font-family:'Helvetica Neue',sans-serif;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">Your Member Hub is ready. Check in with QR codes, browse the marketplace, and track your progress.</td></tr>
<tr><td align="center" style="padding-bottom:32px;">
<a href="${loginUrl}" style="display:inline-block;padding:14px 40px;background:#0055FF;color:#FFF;font-family:'Helvetica Neue',sans-serif;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Open Member Hub</a>
</td></tr>
<tr><td style="height:1px;background:#1F1F1F;"></td></tr>
<tr><td align="center" style="padding-top:20px;font-family:'Helvetica Neue',sans-serif;font-size:11px;color:#374151;">Powered by IVIRA</td></tr>
</table></td></tr></table></body></html>`,
      });
    } catch (err) {
      console.error('Email welcome failed:', err.message);
    }
  }

  return { sent: true };
}
