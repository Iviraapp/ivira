import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.gmail.user,
        pass: config.gmail.appPassword,
      },
    });
  }
  return transporter;
}

export async function sendOTPEmail(email, otp) {
  const mail = getTransporter();

  await mail.sendMail({
    from: `"IVIRA" <${config.gmail.user}>`,
    to: email,
    subject: 'Security Verification — IVIRA',
    text: `SECURITY VERIFICATION\n\nYour code: ${otp}\n\nEnter this code to access your IVIRA dashboard.\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please secure your account immediately.`,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Security Verification</title>
  <!--[if mso]>
  <style>table,td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#000000;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Inner card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;line-height:1;">
                    IVIRA
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:#6B7280;line-height:1.4;">
                Security Verification
              </p>
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.5;">
                Enter this code to access your IVIRA dashboard.
              </p>
            </td>
          </tr>

          <!-- OTP Code Block -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:360px;">
                <tr>
                  <td style="border-top:2px solid #7C3AED;padding:0;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:28px 20px;border-left:1px solid #1F1F1F;border-right:1px solid #1F1F1F;border-bottom:1px solid #1F1F1F;background-color:#000000;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;color:#FFFFFF;letter-spacing:12px;line-height:1;text-align:center;">
                      ${otp}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:60px;">
                <tr>
                  <td style="height:1px;background-color:#1F1F1F;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry notice -->
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;color:#6B7280;line-height:1.5;">
                This code expires in 5 minutes.
              </p>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;color:#4B5563;line-height:1.5;">
                If you didn&rsquo;t request this, please secure your account immediately.
              </p>
            </td>
          </tr>

          <!-- Footer divider -->
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td style="height:1px;background-color:#1F1F1F;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer brand -->
          <tr>
            <td align="center">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:500;color:#374151;line-height:1.4;">
                Secured by IVIRA Guard
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
