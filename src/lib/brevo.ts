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
