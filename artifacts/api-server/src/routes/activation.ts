import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, usersTable, walletTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { recordTransaction } from "./wallets";
import type { Request } from "express";

const router: IRouter = Router();

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const INR_PER_USD         = parseFloat(process.env.INR_PER_USD ?? "84");

// Activation fee config
const INDIA_FEE_INR  = 149;          // ₹149 fixed
const GLOBAL_FEE_USD = 5;            // $5 USD
const GLOBAL_FEE_INR = Math.round(GLOBAL_FEE_USD * INR_PER_USD); // ~₹420

// ── Region detection ─────────────────────────────────────────────────────────
// Priority: phone code → IP country headers → default global
function detectRegion(user: { phone: string; country?: string | null }, req: Request): "india" | "global" {
  if (user.phone?.startsWith("+91")) return "india";
  if (user.country === "IN") return "india";

  // IP-based: check Cloudflare/proxy headers
  const cfCountry = req.headers["cf-ipcountry"] as string | undefined;
  const xCountry  = req.headers["x-country-code"] as string | undefined;
  const ipCountry = (cfCountry ?? xCountry ?? "").toUpperCase();
  if (ipCountry === "IN") return "india";

  return "global";
}

function feeForRegion(region: "india" | "global") {
  return region === "india"
    ? { amountInr: INDIA_FEE_INR,  amountUsd: null,           currency: "INR", label: "₹149" }
    : { amountInr: GLOBAL_FEE_INR, amountUsd: GLOBAL_FEE_USD, currency: "INR", label: "$5"  };
}

async function isAlreadyProcessed(referenceId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: walletTransactionsTable.id })
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.referenceId, referenceId))
    .limit(1);
  return !!existing;
}

// ── GET /api/payments/activation/info ────────────────────────────────────────
router.get("/payments/activation/info", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const region = detectRegion(user, req);
  const fee = feeForRegion(region);

  res.json({
    isActivated: user.isActivated ?? false,
    region,
    razorpayEnabled: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
    ...fee,
    keyId: RAZORPAY_KEY_ID || null,
    message:
      `Pay a one-time ${fee.label} activation fee to fully activate your account and help keep Gamerbuddy free from fake accounts.`,
  });
});

// ── POST /api/payments/activation/create-order ───────────────────────────────
router.post("/payments/activation/create-order", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  if (user.isActivated) {
    res.status(400).json({ error: "Your account is already activated." });
    return;
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    // Dev/test mode — return a mock order so UI can be tested
    const region = detectRegion(user, req);
    const fee = feeForRegion(region);
    res.json({
      orderId: `dev_order_${Date.now()}`,
      amountInr: fee.amountInr,
      currency: "INR",
      keyId: null,
      region,
      devMode: true,
    });
    return;
  }

  try {
    const region = detectRegion(user, req);
    const fee = feeForRegion(region);

    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    const amountPaise = fee.amountInr * 100;
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `gbact_${user.id}_${Date.now()}`,
      notes: {
        type: "activation",
        region,
        user_id: String(user.id),
        label: fee.label,
      },
    });

    req.log.info({ userId: user.id, region, amountInr: fee.amountInr }, "Activation order created");

    res.json({
      orderId: order.id,
      amountInr: fee.amountInr,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
      region,
      label: fee.label,
    });
  } catch (err: any) {
    req.log.error(err, "Activation create-order failed");
    res.status(500).json({ error: err.message ?? "Failed to create payment order." });
  }
});

// ── POST /api/payments/activation/verify ─────────────────────────────────────
router.post("/payments/activation/verify", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  if (user.isActivated) {
    res.status(400).json({ error: "Account is already activated." });
    return;
  }

  const { orderId, paymentId, signature, devMode } = req.body as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
    devMode?: boolean;
  };

  // Dev mode bypass (no Razorpay configured)
  if (devMode && !RAZORPAY_KEY_ID) {
    const region = detectRegion(user, req);
    await db
      .update(usersTable)
      .set({ isActivated: true, activationRegion: region, activationPaidAt: new Date() })
      .where(eq(usersTable.id, user.id));
    req.log.info({ userId: user.id, region }, "Activation via dev-mode bypass");
    const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
    res.json({ isActivated: true, region, user: updated });
    return;
  }

  if (!orderId || !paymentId || !signature) {
    res.status(400).json({ error: "Missing payment verification fields." });
    return;
  }

  if (!RAZORPAY_KEY_SECRET) {
    res.status(503).json({ error: "Razorpay is not configured." });
    return;
  }

  // Verify HMAC signature
  const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSig !== signature) {
    req.log.warn({ userId: user.id, orderId, paymentId }, "Activation: signature mismatch");
    res.status(400).json({ error: "Payment signature verification failed." });
    return;
  }

  if (await isAlreadyProcessed(paymentId)) {
    req.log.warn({ userId: user.id, paymentId }, "Activation: duplicate paymentId");
    res.status(409).json({ error: "This payment has already been processed." });
    return;
  }

  const region = detectRegion(user, req);
  const fee = feeForRegion(region);

  // Record fee in transactions (non-wallet — platform revenue)
  await recordTransaction(
    user.id,
    "hiring",
    "activation_fee",
    region === "india" ? 0 : fee.amountUsd ?? GLOBAL_FEE_USD,
    `One-time account activation fee (${fee.label}) — ${paymentId}`,
    paymentId,
  );

  await db
    .update(usersTable)
    .set({ isActivated: true, activationRegion: region, activationPaidAt: new Date() })
    .where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id, region, paymentId }, "Account activated");

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  res.json({
    isActivated: true,
    region,
    message: "Your account is now fully activated! You can now post requests and place bids.",
  });
});

export default router;
