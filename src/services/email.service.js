import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter;

// --- Resend HTTP API (works on Railway, no SMTP needed) ---
async function sendViaResend({ from, to, subject, text, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.email.resendApiKey}`,
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error ${response.status}: ${err}`);
  }

  return response.json();
}

// --- SMTP fallback (for local dev or non-Railway environments) ---
export function getTransporter() {
  if (!transporter) {
    const provider = config.email.provider;

    if (provider === 'microsoft') {
      transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false,
        },
      });
    } else if (provider === 'gmail') {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
    }
  }
  return transporter;
}

// --- Unified send function ---
export async function sendEmail({ from, to, subject, text, html }) {
  // Prefer Resend (HTTP-based, works everywhere including Railway)
  if (config.email.resendApiKey) {
    return sendViaResend({ from, to, subject, text, html });
  }

  // Fallback to SMTP
  const mail = getTransporter();
  if (!mail) {
    throw new Error('No email provider configured');
  }
  return mail.sendMail({ from, to, subject, text, html });
}

// --- OTP Email ---
export async function sendOTPEmail(email, otp) {
  const digits = otp.toString().split('');

  await sendEmail({
    from: `IVIRA <${config.email.user}>`,
    to: email,
    subject: 'Your verification code — IVIRA',
    text: `Your IVIRA verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Verification Code</title>
  <!--[if mso]>
  <style>table,td,p { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#050A12;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050A12;">
    <tr>
      <td align="center" style="padding:48px 16px 56px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;width:100%;">

          <!-- Shield icon + Logo -->
          <tr>
            <td align="center" style="padding-bottom:44px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:48px;height:48px;background-color:#0D1526;border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;line-height:48px;">
                          &#128274;
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;color:#FFFFFF;letter-spacing:4px;line-height:1;text-align:center;">
                    IVIRA
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td align="center" style="padding-bottom:6px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#FFFFFF;line-height:1.3;">
                Verify your identity
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:400;color:#7A8599;line-height:1.5;">
                Use the code below to sign in to your account
              </p>
            </td>
          </tr>

          <!-- OTP Card -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:380px;border-radius:16px;overflow:hidden;">
                <!-- Gradient top bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#10B981 0%,#34D399 50%,#10B981 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" style="padding:32px 24px;background-color:#0B1224;border-left:1px solid #151E33;border-right:1px solid #151E33;border-bottom:1px solid #151E33;border-radius:0 0 16px 16px;">
                    <!-- Individual digit boxes -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${digits.map(d => `<td style="width:48px;height:58px;background-color:#0F1A30;border:1px solid #1C2A47;border-radius:10px;text-align:center;vertical-align:middle;margin:0 4px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;color:#FFFFFF;line-height:58px;">${d}</td><td style="width:8px;">&nbsp;</td>`).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Timer badge -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:8px 16px;background-color:#0D1526;border-radius:20px;border:1px solid #151E33;">
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:500;color:#7A8599;line-height:1;">
                      &#9202; Expires in 5 minutes
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What's waiting for you -->
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#34D399;line-height:1;">
                What&rsquo;s waiting inside
              </p>
            </td>
          </tr>

          <!-- Feature cards - 2x2 grid -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:400px;">
                <tr>
                  <td style="width:50%;padding:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="padding:16px 14px;background-color:#0B1224;border:1px solid #151E33;border-radius:12px;">
                          <p style="margin:0 0 6px;font-size:20px;line-height:1;">&#129504;</p>
                          <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#FFFFFF;line-height:1.2;">Vira AI Coach</p>
                          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5A6A82;line-height:1.4;">Personalised workout &amp; diet advice, anytime</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width:50%;padding:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="padding:16px 14px;background-color:#0B1224;border:1px solid #151E33;border-radius:12px;">
                          <p style="margin:0 0 6px;font-size:20px;line-height:1;">&#128248;</p>
                          <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#FFFFFF;line-height:1.2;">Food Scanner</p>
                          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5A6A82;line-height:1.4;">Snap a photo, get instant nutrition data</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="padding:16px 14px;background-color:#0B1224;border:1px solid #151E33;border-radius:12px;">
                          <p style="margin:0 0 6px;font-size:20px;line-height:1;">&#127939;</p>
                          <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#FFFFFF;line-height:1.2;">Activity Tracking</p>
                          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5A6A82;line-height:1.4;">Steps, sleep, workouts &amp; fasting all in one</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width:50%;padding:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td style="padding:16px 14px;background-color:#0B1224;border:1px solid #151E33;border-radius:12px;">
                          <p style="margin:0 0 6px;font-size:20px;line-height:1;">&#127942;</p>
                          <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#FFFFFF;line-height:1.2;">Challenges</p>
                          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#5A6A82;line-height:1.4;">Compete, earn badges &amp; stay motivated</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Motivational nudge -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:380px;">
                <tr>
                  <td style="padding:18px 24px;background:linear-gradient(135deg,#0D1A3A 0%,#132044 100%);border:1px solid #1A2A4F;border-radius:12px;text-align:center;">
                    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;line-height:1.3;">
                      Your health journey continues &#128170;
                    </p>
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;color:#7A8599;line-height:1.4;">
                      Every login is a step towards a healthier you. Keep going!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security info -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#3D4A5C;line-height:1.5;text-align:center;">
                Didn&rsquo;t request this? You can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer divider -->
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td style="height:1px;background-color:#111827;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;color:#2D3748;line-height:1.4;">
                Secured by IVIRA &middot; ivira.app
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`,
  });
}
