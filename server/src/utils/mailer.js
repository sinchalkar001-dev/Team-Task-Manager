const nodemailer = require('nodemailer');

function hasSmtpEnv() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOtpEmail({ to, otp }) {
  // If SMTP isn't configured, fallback to console output for dev.
  if (!hasSmtpEnv()) {
    // eslint-disable-next-line no-console
    console.log(`[DEV OTP] Email verification OTP for ${to}: ${otp}`);
    return { delivered: false, dev: true };
  }

  const transporter = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: 'Your verification code (OTP)',
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    html: `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;line-height:1.4">
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="margin:0 0 12px">Use this OTP to verify your email address:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;display:inline-block">${otp}</div>
      <p style="margin:12px 0 0;color:#6b7280">This code expires in 10 minutes.</p>
    </div>`,
  });

  return { delivered: true };
}

module.exports = { sendOtpEmail, hasSmtpEnv };
