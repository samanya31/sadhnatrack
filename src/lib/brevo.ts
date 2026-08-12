/**
 * Brevo REST API v3 Integration
 * Uses VITE_BREVO_API_KEY from environment variables to send transactional OTP emails.
 */

export interface SendEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

export const sendBrevoEmail = async ({
  toEmail,
  toName,
  subject,
  htmlContent,
}: SendEmailOptions) => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY;
  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'sadhnastaff@gmail.com';
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Sadhana Track';

  if (!apiKey) {
    throw new Error('VITE_BREVO_API_KEY is not defined in your environment variables (.env file).');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: toEmail.trim(),
          name: toName ? toName.trim() : toEmail.trim(),
        },
      ],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Brevo Email API failed with status ${response.status}`);
  }

  return await response.json();
};

/**
 * Send a 6-digit OTP code via Brevo API for Password Reset or Account Verification.
 */
export const sendBrevoOtpEmail = async (toEmail: string, otpCode: string, type: 'reset' | 'signup' = 'reset') => {
  const isReset = type === 'reset';
  const subject = isReset 
    ? `${otpCode} is your Password Reset Code - Sadhana Track` 
    : `${otpCode} is your Verification Code - Sadhana Track`;

  const title = isReset ? 'Reset Your Password' : 'Verify Your Account';
  const description = isReset 
    ? 'You requested to reset your password for your Sadhana Track account. Use the 6-digit verification code below:' 
    : 'Welcome to Sadhana Track! Use the 6-digit verification code below to verify your account:';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdfaf5; margin: 0; padding: 40px 20px; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 900; color: #ea580c; text-transform: uppercase; letter-spacing: 2px; }
        .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 10px; }
        .text { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; text-align: center; }
        .otp-box { background: #fff7ed; border: 2px dashed #fdba74; padding: 20px; border-radius: 16px; text-align: center; margin-bottom: 24px; }
        .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #c2410c; font-family: monospace; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div className="card">
        <div className="header">
          <div className="logo">Sadhana Track</div>
          <div className="title">${title}</div>
        </div>
        <p className="text">${description}</p>
        <div className="otp-box">
          <div className="otp-code">${otpCode}</div>
        </div>
        <p className="text" style="font-size: 12px; color: #94a3b8;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        <div className="footer">
          &copy; ${new Date().getFullYear()} Sadhana Track. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendBrevoEmail({
    toEmail,
    subject,
    htmlContent,
  });
};

/**
 * Send daily digest of students who have NOT submitted Sadhana entries today.
 */
export const sendBrevoMissingSadhanaDigest = async ({
  adminEmail,
  adminName,
  centerName,
  dateStr,
  missingStudents,
}: {
  adminEmail: string;
  adminName: string;
  centerName: string;
  dateStr: string;
  missingStudents: Array<{ full_name: string; email: string }>;
}) => {
  const subject = `⚠️ Unsubmitted Sadhana Alert: ${missingStudents.length} Students Pending (${centerName}) - ${dateStr}`;

  const studentRowsHtml = missingStudents
    .map(
      (s, index) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">${index + 1}. ${s.full_name}</td>
        <td style="padding: 12px 16px; color: #64748b;">${s.email}</td>
        <td style="padding: 12px 16px; text-align: right;"><span style="background: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800;">PENDING</span></td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdfaf5; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 900; color: #ea580c; text-transform: uppercase; letter-spacing: 2px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 10px; }
        .badge { background: #fff7ed; border: 1px solid #fdba74; color: #c2410c; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; display: inline-block; margin-top: 10px; }
        .table-container { margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
        th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">Sadhana Track</div>
          <div class="title">Daily Unsubmitted Sadhana Alert</div>
          <div class="badge">Center: ${centerName} • Date: ${dateStr}</div>
        </div>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Hare Krishna <strong>${adminName}</strong> Prabhu / Mataji,
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          The following <strong>${missingStudents.length} student(s)</strong> have not submitted their daily Sadhana entry for today (${dateStr}):
        </p>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email Address</th>
                <th style="text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
          Please reach out to encourage them to submit their daily spiritual log on Sadhana Track.
        </p>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Sadhana Track • Automated BACE Coordinator Digest
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendBrevoEmail({
    toEmail: adminEmail,
    toName: adminName,
    subject,
    htmlContent,
  });
};

