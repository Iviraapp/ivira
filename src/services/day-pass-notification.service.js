import db from '../config/database.js';
import config from '../config/index.js';
import { sendTemplateMessage } from './whatsapp.service.js';
import { sendSMS } from './sms.service.js';
import { sendEmail } from './email.service.js';

/**
 * Get notification settings for a gym, with defaults.
 */
async function getNotifPrefs(gymId) {
  const gym = await db('gyms').where({ id: gymId }).select('notification_settings').first();
  return {
    whatsapp_enabled: true,
    sms_enabled: true,
    email_enabled: true,
    day_pass_alerts: true,
    ...((gym?.notification_settings) || {}),
  };
}

/**
 * Notify gym owner about a new day pass purchase.
 * Called after successful payment/creation of a day pass.
 */
export async function notifyDayPassPurchase(dayPass) {
  const gym = await db('gyms').where({ id: dayPass.gym_id }).first();
  if (!gym) return;

  const prefs = await getNotifPrefs(gym.id);
  if (!prefs.day_pass_alerts) return;

  const amount = ((dayPass.amount_paise || dayPass.price_paise || 0) / 100).toLocaleString('en-IN');
  const dashboardUrl = `${config.baseUrl}/dashboard/payments`;

  // 1. Email to gym owner
  if (prefs.email_enabled && gym.owner_email) {
    try {
      await sendEmail({
        from: `IVIRA <${config.email.user}>`,
        to: gym.owner_email,
        subject: `New Daily Pass Purchased — ${dayPass.buyer_name}`,
        html: buildOwnerEmailHtml({
          ownerName: gym.owner_name,
          gymName: gym.gym_name,
          buyerName: dayPass.buyer_name,
          buyerPhone: dayPass.buyer_phone,
          amount,
          validDate: dayPass.valid_date,
          dashboardUrl,
        }),
      });
    } catch (err) {
      console.error('[DayPass] Owner email failed:', err.message);
    }
  }

  // 2. WhatsApp to gym owner
  if (prefs.whatsapp_enabled && gym.owner_phone) {
    try {
      await sendTemplateMessage(gym.owner_phone, 'day_pass_purchased', [
        { name: 'owner_name', value: gym.owner_name || 'Owner' },
        { name: 'buyer_name', value: dayPass.buyer_name },
        { name: 'buyer_phone', value: dayPass.buyer_phone },
        { name: 'amount', value: `₹${amount}` },
        { name: 'valid_date', value: dayPass.valid_date },
        { name: 'dashboard_url', value: dashboardUrl },
      ]);
    } catch (err) {
      console.error('[DayPass] Owner WhatsApp failed:', err.message);
    }
  }

  // 3. SMS to gym owner
  if (prefs.sms_enabled && gym.owner_phone) {
    try {
      await sendSMS(
        gym.owner_phone,
        `New Daily Pass purchased by ${dayPass.buyer_name} (${dayPass.buyer_phone}) for ₹${amount} on ${dayPass.valid_date}. Please verify their check-in. — ${gym.gym_name} via IVIRA`
      );
    } catch (err) {
      console.error('[DayPass] Owner SMS failed:', err.message);
    }
  }

  // 4. Welcome email to buyer (if we can derive their email — for now use phone)
  // Day pass buyers typically only provide phone, so we send WhatsApp/SMS instructions
  if (prefs.whatsapp_enabled && dayPass.buyer_phone) {
    try {
      await sendTemplateMessage(dayPass.buyer_phone, 'day_pass_welcome', [
        { name: 'buyer_name', value: dayPass.buyer_name },
        { name: 'gym_name', value: gym.gym_name },
        { name: 'valid_date', value: dayPass.valid_date },
        { name: 'gym_address', value: gym.address || '' },
      ]);
    } catch (err) {
      console.error('[DayPass] Buyer WhatsApp failed:', err.message);
    }
  }

  if (prefs.sms_enabled && dayPass.buyer_phone) {
    try {
      await sendSMS(
        dayPass.buyer_phone,
        `Hi ${dayPass.buyer_name}! Your Daily Pass for ${gym.gym_name} on ${dayPass.valid_date} is confirmed. Show this SMS at the front desk. Address: ${gym.address || 'Contact gym for directions.'}. Enjoy your workout!`
      );
    } catch (err) {
      console.error('[DayPass] Buyer SMS failed:', err.message);
    }
  }
}

/**
 * HTML email template for gym owner notification.
 */
function buildOwnerEmailHtml({ ownerName, gymName, buyerName, buyerPhone, amount, validDate, dashboardUrl }) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; background: #0D0D14; color: #F0F0F5; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="padding: 32px 28px 20px; background: linear-gradient(135deg, #00D68F, #00B87A);">
        <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #fff;">
          New Daily Pass Purchased
        </h1>
        <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.85);">
          ${gymName}
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 28px;">
        <p style="font-size: 15px; color: #B0B0C8; margin: 0 0 20px;">
          Hi ${ownerName || 'there'},<br/>
          A new daily pass has been purchased. Please verify their check-in when they arrive.
        </p>

        <!-- Buyer Details Card -->
        <div style="background: #1A1A2E; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.06);">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #8B8BA3; width: 110px;">Visitor</td>
              <td style="padding: 6px 0; font-size: 14px; color: #F0F0F5; font-weight: 600;">${buyerName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #8B8BA3;">Phone</td>
              <td style="padding: 6px 0; font-size: 14px; color: #F0F0F5;">
                <a href="tel:${buyerPhone}" style="color: #00D4FF; text-decoration: none;">${buyerPhone}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #8B8BA3;">Amount</td>
              <td style="padding: 6px 0; font-size: 14px; color: #00D68F; font-weight: 700;">₹${amount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #8B8BA3;">Valid Date</td>
              <td style="padding: 6px 0; font-size: 14px; color: #F0F0F5; font-weight: 600;">${validDate}</td>
            </tr>
          </table>
        </div>

        <!-- CTA -->
        <a href="${dashboardUrl}" style="display: block; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, #6C5CE7, #00D4FF); color: #fff; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 700;">
          View in Dashboard →
        </a>

        <p style="font-size: 12px; color: #5A5A72; margin: 20px 0 0; text-align: center;">
          You're receiving this because day pass alerts are enabled in your IVIRA settings.
        </p>
      </div>
    </div>
  `;
}
