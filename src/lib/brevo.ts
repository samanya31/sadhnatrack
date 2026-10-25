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
    console.error('❌ Brevo Email API failed:', response.status, errorData);
    throw new Error(errorData.message || `Brevo Email API failed with status ${response.status}`);
  }

  const result = await response.json().catch(() => ({}));
  return result;
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

/**
 * Send approval confirmation email to Center In-charge with Center Access Code & onboarding instructions.
 */
export const sendBrevoCenterApprovedEmail = async ({
  toEmail,
  inchargeName,
  centerName,
  accessCode,
  loginUrl = 'https://sadhnaspace.vercel.app/login',
}: {
  toEmail: string;
  inchargeName: string;
  centerName: string;
  accessCode: string;
  loginUrl?: string;
}) => {
  const subject = `🎉 Congratulations! Your Center "${centerName}" is Approved on Sadhana Track`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 28px; }
        .logo { font-size: 26px; font-weight: 900; color: #ea580c; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; border: 1px solid #a7f3d0; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 14px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 14px 0; }
        .code-box { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px dashed #f97316; padding: 22px; border-radius: 16px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #c2410c; margin-bottom: 6px; }
        .code-value { font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #ea580c; font-family: monospace; }
        .step-box { background: #f8fafc; border-radius: 14px; padding: 18px 20px; margin: 18px 0; border: 1px solid #e2e8f0; }
        .step-item { display: flex; gap: 12px; margin-bottom: 12px; }
        .step-item:last-child { margin-bottom: 0; }
        .step-num { width: 24px; height: 24px; background: #ea580c; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step-text { font-size: 13px; color: #334155; line-height: 1.5; }
        .btn { display: inline-block; background: #ea580c; color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin-top: 18px; text-align: center; }
        .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">🪷 Sadhana Track</div>
          <div class="badge">Center Approved & Activated</div>
          <div class="title">Hare Krishna, ${inchargeName}! 🙏</div>
        </div>

        <p class="text">
          We are pleased to inform you that your application for <strong>${centerName}</strong> has been officially reviewed and approved by the Super Admin.
        </p>

        <div class="code-box">
          <div class="code-label">Your Center Access Code</div>
          <div class="code-value">${accessCode}</div>
          <p style="font-size: 12px; color: #7c2d12; margin: 8px 0 0 0; font-weight: 600;">
            Share this code with your students so they can join your center during signup.
          </p>
        </div>

        <div class="step-box">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
            📋 How to Onboard Your Students:
          </div>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-text">
              <strong>Share Access Code:</strong> Ask your students to visit <a href="${loginUrl}" style="color: #ea580c; font-weight: 700;">Sadhana Track</a> and click <em>"Sign up now"</em>.
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-text">
              <strong>Select "Joining Center":</strong> Students enter their name, email, phone number, and enter your Center Access Code: <strong style="color: #ea580c; font-family: monospace;">${accessCode}</strong>.
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-text">
              <strong>Track & Guide:</strong> You can log in using your registered email and password to view your student directory, daily sadhana logs, and analytical reports in your Center Admin portal.
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="btn">Log In to Center Admin Portal →</a>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Sadhana Track • Spiritual Excellence Platform
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendBrevoEmail({
    toEmail,
    toName: inchargeName,
    subject,
    htmlContent,
  });
};

