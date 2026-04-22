import { Router, type IRouter } from "express";
import bcryptjs from "bcryptjs";
import { db, usersTable, emailOtpsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { otpSendLimiter } from "../lib/rate-limit";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/email-otp/send
// Generates a 6-digit OTP, hashes it, saves to DB, and emails it.
// Rate-limited to 3 sends per hour per user.
router.post(
  "/auth/email-otp/send",
  requireAuth,
  otpSendLimiter,
  async (req, res): Promise<void> => {
    const user = req.user!;

    if (user.emailVerified) {
      res.status(400).json({ error: "Your email is already verified." });
      return;
    }

    const otp = generateOtp();
    const otpHash = await bcryptjs.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any existing OTPs for this user then insert a fresh one
    await db.delete(emailOtpsTable).where(eq(emailOtpsTable.userId, user.id));
    await db.insert(emailOtpsTable).values({
      userId: user.id,
      email: user.email,
      otpHash,
      expiresAt,
    });

    try {
      await sendOtpEmail(user.email, otp);
    } catch (err) {
      req.log.error({ err, userId: user.id }, "Failed to send OTP email");
      res.status(500).json({ error: "Failed to send email. Please try again." });
      return;
    }

    req.log.info({ userId: user.id }, "OTP sent");
    res.json({ message: "OTP sent to your email address. It expires in 10 minutes." });
  },
);

// POST /auth/email-otp/verify
// Verifies the submitted OTP. Max 3 attempts before OTP is invalidated.
router.post(
  "/auth/email-otp/verify",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;

    if (user.emailVerified) {
      res.status(400).json({ error: "Your email is already verified." });
      return;
    }

    const { otp } = req.body as { otp?: string };
    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
      res.status(400).json({ error: "Please enter a valid 6-digit code." });
      return;
    }

    const [record] = await db
      .select()
      .from(emailOtpsTable)
      .where(eq(emailOtpsTable.userId, user.id))
      .orderBy(desc(emailOtpsTable.createdAt))
      .limit(1);

    if (!record) {
      res.status(400).json({ error: "No verification code found. Please request a new one." });
      return;
    }

    if (record.expiresAt < new Date()) {
      await db.delete(emailOtpsTable).where(eq(emailOtpsTable.id, record.id));
      res.status(400).json({ error: "Your code has expired. Please request a new one." });
      return;
    }

    if (record.attempts >= 3) {
      await db.delete(emailOtpsTable).where(eq(emailOtpsTable.id, record.id));
      res.status(400).json({ error: "Too many incorrect attempts. Please request a new code." });
      return;
    }

    const valid = await bcryptjs.compare(otp.trim(), record.otpHash);
    if (!valid) {
      const newAttempts = record.attempts + 1;
      await db
        .update(emailOtpsTable)
        .set({ attempts: newAttempts })
        .where(eq(emailOtpsTable.id, record.id));

      const remaining = 3 - newAttempts;
      if (remaining <= 0) {
        await db.delete(emailOtpsTable).where(eq(emailOtpsTable.id, record.id));
        res.status(400).json({ error: "Too many incorrect attempts. Please request a new code." });
      } else {
        res.status(400).json({
          error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
          attemptsRemaining: remaining,
        });
      }
      return;
    }

    // ── Success ────────────────────────────────────────────────────────────
    await db.delete(emailOtpsTable).where(eq(emailOtpsTable.id, record.id));

    const newTrustFactor = Math.min(100, (user.trustFactor ?? 50) + 5);
    await db
      .update(usersTable)
      .set({ emailVerified: true, trustFactor: newTrustFactor })
      .where(eq(usersTable.id, user.id));

    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));

    req.log.info({ userId: user.id }, "Email verified");
    res.json({
      message: "Email verified successfully!",
      user: {
        id: updated.id,
        emailVerified: updated.emailVerified,
        trustFactor: updated.trustFactor,
      },
    });
  },
);

export default router;
