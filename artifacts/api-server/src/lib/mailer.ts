import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const isDev = process.env.NODE_ENV !== "production";

function createTransport() {
  if (!GMAIL_USER || !GMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    if (isDev) {
      console.log(`\n[DEV MODE — EMAIL OTP] To: ${toEmail}  Code: ${otp}\n`);
      return;
    }
    throw new Error("Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  await transport.sendMail({
    from: `"Gamerbuddy" <${GMAIL_USER}>`,
    to: toEmail,
    subject: "Your Gamerbuddy email verification code",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f12;border-radius:16px;border:1px solid rgba(168,85,247,0.25);">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:32px">🎮</span>
          <h2 style="color:#a855f7;margin:8px 0 4px;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">Gamerbuddy</h2>
          <p style="color:#71717a;font-size:13px;margin:0;">Email Verification</p>
        </div>
        <p style="color:#d4d4d8;font-size:14px;margin-bottom:8px;">Your verification code is:</p>
        <div style="background:rgba(168,85,247,0.12);border:1.5px solid rgba(168,85,247,0.35);border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#a855f7;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#71717a;font-size:12px;margin:16px 0 0;">This code expires in <strong style="color:#d4d4d8;">10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;" />
        <p style="color:#52525b;font-size:11px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
