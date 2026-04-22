import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const isDev = process.env.NODE_ENV !== "production";

const FROM_ADDRESS = "Gamerbuddy <noreply@gamerbuddy.app>";

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const client = getClient();

  if (!client) {
    if (isDev) {
      console.log(`\n[DEV MODE — EMAIL OTP] To: ${toEmail}  Code: ${otp}\n`);
      return;
    }
    throw new Error("Email service not configured. Set RESEND_API_KEY.");
  }

  await client.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: "Your Gamerbuddy verification code",
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
