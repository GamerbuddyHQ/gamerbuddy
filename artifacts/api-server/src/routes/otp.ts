import { Router, type IRouter } from "express";
import bcryptjs from "bcryptjs";
import { db, usersTable, contactOtpsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

const SEND_LIMIT = 3;
const EXPIRY_MS = 10 * 60 * 1000;

const sendCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = sendCounts.get(key);
  if (!entry || entry.resetAt < now) {
    sendCounts.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= SEND_LIMIT) return false;
  entry.count++;
  return true;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/otp/send
// channel: "email" | "phone"
// For phone: SMS is not yet active — returns 501 with a clear message.
router.post("/otp/send", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { channel } = req.body as { channel?: string };

  if (!channel || !["email", "phone"].includes(channel)) {
    res.status(400).json({ error: 'channel must be "email" or "phone".' });
    return;
  }

  if (channel === "phone") {
    res.status(501).json({
      error: "SMS verification is coming soon. Please use email verification for now.",
      comingSoon: true,
    });
    return;
  }

  if (channel === "email" && user.emailVerified) {
    res.status(400).json({ error: "Your email is already verified." });
    return;
  }

  const rateLimitKey = `${user.id}:${channel}`;
  if (!checkRateLimit(rateLimitKey)) {
    res.status(429).json({ error: "Too many requests. Maximum 3 OTP sends per hour." });
    return;
  }

  const contact = channel === "email" ? user.email : (user.phone ?? "");
  if (!contact) {
    res.status(400).json({ error: "No contact information available for this channel." });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcryptjs.hash(otp, 8);
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await db
    .delete(contactOtpsTable)
    .where(and(eq(contactOtpsTable.userId, user.id), eq(contactOtpsTable.channel, channel)));

  await db.insert(contactOtpsTable).values({
    userId: user.id,
    channel,
    contact,
    otpHash,
    expiresAt,
  });

  try {
    await sendOtpEmail(contact, otp);
  } catch (err) {
    req.log.error({ err, userId: user.id }, "Failed to send OTP");
    res.status(500).json({ error: "Failed to send verification code. Please try again." });
    return;
  }

  req.log.info({ userId: user.id, channel }, "OTP sent via unified route");
  res.json({
    message: `Verification code sent to your ${channel === "email" ? "email address" : "phone number"}. It expires in 10 minutes.`,
    channel,
  });
});

// POST /api/otp/verify
// channel: "email" | "phone", otp: string
router.post("/otp/verify", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { channel, otp } = req.body as { channel?: string; otp?: string };

  if (!channel || !["email", "phone"].includes(channel)) {
    res.status(400).json({ error: 'channel must be "email" or "phone".' });
    return;
  }

  if (channel === "phone") {
    res.status(501).json({ error: "SMS verification is coming soon.", comingSoon: true });
    return;
  }

  if (channel === "email" && user.emailVerified) {
    res.status(400).json({ error: "Your email is already verified." });
    return;
  }

  if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
    res.status(400).json({ error: "Please enter a valid 6-digit code." });
    return;
  }

  const [record] = await db
    .select()
    .from(contactOtpsTable)
    .where(
      and(
        eq(contactOtpsTable.userId, user.id),
        eq(contactOtpsTable.channel, channel),
      ),
    )
    .orderBy(desc(contactOtpsTable.createdAt))
    .limit(1);

  if (!record) {
    res.status(400).json({ error: "No verification code found. Please request a new one." });
    return;
  }

  if (record.expiresAt < new Date()) {
    await db.delete(contactOtpsTable).where(eq(contactOtpsTable.id, record.id));
    res.status(400).json({ error: "Your code has expired. Please request a new one." });
    return;
  }

  if (record.attempts >= 3) {
    await db.delete(contactOtpsTable).where(eq(contactOtpsTable.id, record.id));
    res.status(400).json({ error: "Too many incorrect attempts. Please request a new code." });
    return;
  }

  const valid = await bcryptjs.compare(otp.trim(), record.otpHash);
  if (!valid) {
    const newAttempts = record.attempts + 1;
    await db
      .update(contactOtpsTable)
      .set({ attempts: newAttempts })
      .where(eq(contactOtpsTable.id, record.id));

    const remaining = 3 - newAttempts;
    if (remaining <= 0) {
      await db.delete(contactOtpsTable).where(eq(contactOtpsTable.id, record.id));
      res.status(400).json({ error: "Too many incorrect attempts. Please request a new code." });
    } else {
      res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        attemptsRemaining: remaining,
      });
    }
    return;
  }

  await db.delete(contactOtpsTable).where(eq(contactOtpsTable.id, record.id));

  const trustBonus = 5;
  const newTrustFactor = Math.min(100, (user.trustFactor ?? 50) + trustBonus);
  const updates: Record<string, unknown> = { trustFactor: newTrustFactor };
  if (channel === "email") updates.emailVerified = true;
  if (channel === "phone") updates.phoneVerified = true;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id, channel }, "Contact verified");
  res.json({
    message: `${channel === "email" ? "Email" : "Phone"} verified successfully!`,
    channel,
    user: {
      id: updated.id,
      emailVerified: updated.emailVerified,
      phoneVerified: updated.phoneVerified,
      trustFactor: updated.trustFactor,
    },
  });
});

export default router;
