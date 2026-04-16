import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { round2, recordTransaction, formatWallets, checkDepositAnomaly } from "./wallets";

// ─────────────────────────────────────────────────────────────
// PAYMENT KEYS — all sourced from environment variables.
//
// RAZORPAY (Indian UPI & cards):
//   RAZORPAY_KEY_ID     — Test: rzp_test_...   Live: rzp_live_...
//   RAZORPAY_KEY_SECRET — Test secret key      Live secret key
//
// STRIPE (International cards):
//   STRIPE_SECRET_KEY      — Test: sk_test_...  Live: sk_live_...
//   STRIPE_PUBLISHABLE_KEY — Test: pk_test_...  Live: pk_live_...
//
// EXCHANGE RATE:
//   INR_PER_USD — default 84 (update periodically or use a live rate API)
//
// SECURITY NOTES:
//   - Secret keys NEVER leave this file; only the publishable key is sent to clients
//   - Every incoming payment is verified server-side before any wallet is credited
//   - The referenceId (paymentId / paymentIntentId) is stored with a partial unique
//     index so replaying the same payment ID cannot double-credit the wallet
// ─────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
const INR_PER_USD = parseFloat(process.env.INR_PER_USD ?? "84");

const MIN_AMOUNT = 10.75;
const MAX_AMOUNT = 1000;

const router: IRouter = Router();

// ── Idempotency guard ───────────────────────────────────────────────────────
// Returns true if this external payment reference has already been recorded.
// The partial unique index on wallet_transactions.reference_id enforces this
// at the DB level too, but we check explicitly to return a clean 409 response.
async function isAlreadyProcessed(referenceId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: walletTransactionsTable.id })
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.referenceId, referenceId))
    .limit(1);
  return !!existing;
}

// ── Payment Config (public key only — secret key never sent to client) ──────
router.get("/payments/config", requireAuth, async (_req, res): Promise<void> => {
  res.json({
    razorpayEnabled: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
    stripeEnabled: !!(STRIPE_SECRET_KEY && STRIPE_PUBLISHABLE_KEY),
    // publishableKey is safe to expose — it is the pk_test_ / pk_live_ key, NOT the secret
    stripePublishableKey: STRIPE_PUBLISHABLE_KEY || null,
  });
});

// ── Razorpay: Create Order ──────────────────────────────────────────────────
router.post("/payments/razorpay/create-order", requireAuth, async (req, res): Promise<void> => {
  const { amount } = req.body as { amount?: number };

  if (!amount || typeof amount !== "number" || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    res.status(400).json({ error: `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}` });
    return;
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    res.status(503).json({
      error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment secrets.",
    });
    return;
  }

  // Anomaly: flag unusually large deposit attempts
  checkDepositAnomaly(req.user!.id, amount, "razorpay-create-order", req.log);

  // Balance cap — block order creation if deposit would push wallet over $1,000
  const [walletRzp] = await db
    .select({ hiringBalance: walletsTable.hiringBalance })
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.id));
  if (!walletRzp) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  if (round2(walletRzp.hiringBalance + amount) > MAX_AMOUNT) {
    const canAdd = Math.max(0, round2(MAX_AMOUNT - walletRzp.hiringBalance));
    res.status(400).json({
      error: `This deposit would exceed the $${MAX_AMOUNT.toFixed(2)} wallet cap. Current balance: $${walletRzp.hiringBalance.toFixed(2)}. You can add up to $${canAdd.toFixed(2)}.`,
    });
    return;
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    const amountPaise = Math.round(amount * INR_PER_USD * 100);
    const amountInr = amountPaise / 100;

    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `gby_${Date.now()}`,
      notes: {
        usd_amount: String(amount),
        user_id: String(req.user!.id),
      },
    });

    req.log.info({ userId: req.user!.id, amountUsd: amount, amountPaise }, "Razorpay order created");

    res.json({
      orderId: order.id,
      amountInr,
      amountUsd: amount,
      currency: "INR",
      // keyId is the PUBLIC key — safe to send to the browser
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    req.log.error(err, "Razorpay create-order failed");
    res.status(500).json({ error: err.message ?? "Failed to create payment order. Please try again." });
  }
});

// ── Razorpay: Verify Payment & Credit Wallet ────────────────────────────────
// Security flow:
//   1. Validate required fields are present
//   2. Verify HMAC-SHA256 signature (proves Razorpay actually processed this)
//   3. Check idempotency — reject if paymentId was already credited (replay attack)
//   4. Credit the wallet atomically
//   5. Record transaction with referenceId for future idempotency checks
router.post("/payments/razorpay/verify", requireAuth, async (req, res): Promise<void> => {
  const { orderId, paymentId, signature, amountUsd } = req.body as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
    amountUsd?: number;
  };

  if (!orderId || !paymentId || !signature || !amountUsd) {
    res.status(400).json({ error: "Missing payment verification fields" });
    return;
  }

  if (typeof amountUsd !== "number" || amountUsd < MIN_AMOUNT || amountUsd > MAX_AMOUNT) {
    res.status(400).json({ error: `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}` });
    return;
  }

  if (!RAZORPAY_KEY_SECRET) {
    res.status(503).json({ error: "Razorpay is not configured" });
    return;
  }

  // 1. Verify the HMAC-SHA256 signature — prevents fabricated payment claims
  const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSig !== signature) {
    req.log.warn(
      { userId: req.user!.id, orderId, paymentId },
      "SECURITY: Razorpay signature mismatch — possible replay/fraud attempt",
    );
    res.status(400).json({ error: "Payment signature verification failed. Do not retry this payment." });
    return;
  }

  // 2. Idempotency check — reject if this paymentId was already credited
  if (await isAlreadyProcessed(paymentId)) {
    req.log.warn(
      { userId: req.user!.id, paymentId },
      "SECURITY: Duplicate Razorpay paymentId — possible double-credit attempt",
    );
    res.status(409).json({ error: "This payment has already been processed." });
    return;
  }

  // 3. Anomaly check
  checkDepositAnomaly(req.user!.id, amountUsd, "razorpay-verify", req.log);

  const user = req.user!;
  const rounded = round2(amountUsd);

  // 4. Atomic wallet credit via SQL increment (avoids read-then-write race)
  const [updated] = await db
    .update(walletsTable)
    .set({ hiringBalance: sql`hiring_balance + ${rounded}` })
    .where(eq(walletsTable.userId, user.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  // 5. Record transaction with external referenceId for idempotency
  await recordTransaction(
    user.id,
    "hiring",
    "deposit",
    rounded,
    `Deposited $${rounded.toFixed(2)} via Razorpay UPI/Card (${paymentId})`,
    paymentId,
  );

  req.log.info({ userId: user.id, amount: rounded, paymentId }, "Razorpay deposit credited to hiring wallet");
  res.json(formatWallets(updated));
});

// ── Stripe: Create PaymentIntent ────────────────────────────────────────────
// The STRIPE_SECRET_KEY is used only server-side. The frontend receives only
// the client_secret (which allows completing the payment, not reading it).
router.post("/payments/stripe/create-intent", requireAuth, async (req, res): Promise<void> => {
  const { amount } = req.body as { amount?: number };

  if (!amount || typeof amount !== "number" || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    res.status(400).json({ error: `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}` });
    return;
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(503).json({
      error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment secrets.",
    });
    return;
  }

  // Anomaly: flag large deposits before creating the intent
  checkDepositAnomaly(req.user!.id, amount, "stripe-create-intent", req.log);

  // Balance cap — block intent creation if deposit would push wallet over $1,000
  const [walletStr] = await db
    .select({ hiringBalance: walletsTable.hiringBalance })
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.id));
  if (!walletStr) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  if (round2(walletStr.hiringBalance + amount) > MAX_AMOUNT) {
    const canAdd = Math.max(0, round2(MAX_AMOUNT - walletStr.hiringBalance));
    res.status(400).json({
      error: `This deposit would exceed the $${MAX_AMOUNT.toFixed(2)} wallet cap. Current balance: $${walletStr.hiringBalance.toFixed(2)}. You can add up to $${canAdd.toFixed(2)}.`,
    });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const amountCents = Math.round(amount * 100);

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description: "Gamerbuddy — Hiring Wallet top-up",
      metadata: {
        usd_amount: String(amount),
        user_id: String(req.user!.id),
      },
    });

    req.log.info({ userId: req.user!.id, amountCents, intentId: intent.id }, "Stripe PaymentIntent created");

    res.json({
      clientSecret: intent.client_secret,
      intentId: intent.id,
      // publishableKey is the public pk_test_/pk_live_ key — safe for the browser
      publishableKey: STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err: any) {
    req.log.error(err, "Stripe create-intent failed");
    res.status(500).json({ error: err.message ?? "Failed to initialise Stripe. Please try again." });
  }
});

// ── Stripe: Confirm & Credit Wallet ────────────────────────────────────────
// Security flow:
//   1. Retrieve the PaymentIntent from Stripe (server-to-server — cannot be faked)
//   2. Assert status === "succeeded"
//   3. Assert user_id metadata matches the authenticated user
//   4. Assert amount matches within ±1 cent tolerance
//   5. Check idempotency — reject if this intentId was already credited
//   6. Credit wallet atomically; record with referenceId
router.post("/payments/stripe/confirm", requireAuth, async (req, res): Promise<void> => {
  const { paymentIntentId, amountUsd } = req.body as {
    paymentIntentId?: string;
    amountUsd?: number;
  };

  if (!paymentIntentId || !amountUsd) {
    res.status(400).json({ error: "Missing paymentIntentId or amountUsd" });
    return;
  }

  if (typeof amountUsd !== "number" || amountUsd < MIN_AMOUNT || amountUsd > MAX_AMOUNT) {
    res.status(400).json({ error: `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}` });
    return;
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // 1. Retrieve from Stripe servers — never trust the frontend alone
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 2. Payment must have succeeded
    if (intent.status !== "succeeded") {
      res.status(400).json({
        error: `Payment not completed. Status: ${intent.status}. Please contact support if funds were debited.`,
      });
      return;
    }

    // 3. Intent must belong to the authenticated user
    if (intent.metadata.user_id && intent.metadata.user_id !== String(req.user!.id)) {
      req.log.warn(
        { paymentIntentId, userId: req.user!.id, intentUserId: intent.metadata.user_id },
        "SECURITY: Stripe PaymentIntent user_id mismatch — possible account hijack attempt",
      );
      res.status(403).json({ error: "Payment does not belong to this account" });
      return;
    }

    // 4. Amount tolerance ±1 cent (floating-point rounding guard)
    const expectedCents = Math.round(amountUsd * 100);
    if (Math.abs(intent.amount - expectedCents) > 1) {
      req.log.warn(
        { paymentIntentId, intentAmount: intent.amount, expectedCents, userId: req.user!.id },
        "SECURITY: Stripe amount mismatch — possible tampering",
      );
      res.status(400).json({ error: "Payment amount mismatch. Please contact support." });
      return;
    }

    // 5. Idempotency check — reject if already credited
    if (await isAlreadyProcessed(paymentIntentId)) {
      req.log.warn(
        { userId: req.user!.id, paymentIntentId },
        "SECURITY: Duplicate Stripe paymentIntentId — possible double-credit attempt",
      );
      res.status(409).json({ error: "This payment has already been processed." });
      return;
    }

    // Anomaly check
    checkDepositAnomaly(req.user!.id, amountUsd, "stripe-confirm", req.log);

    const user = req.user!;
    const rounded = round2(amountUsd);

    // 6. Atomic wallet credit via SQL increment
    const [updated] = await db
      .update(walletsTable)
      .set({ hiringBalance: sql`hiring_balance + ${rounded}` })
      .where(eq(walletsTable.userId, user.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    // Record transaction with external referenceId for idempotency
    await recordTransaction(
      user.id,
      "hiring",
      "deposit",
      rounded,
      `Deposited $${rounded.toFixed(2)} via Stripe Card (${paymentIntentId})`,
      paymentIntentId,
    );

    req.log.info({ userId: user.id, amount: rounded, paymentIntentId }, "Stripe deposit credited to hiring wallet");
    res.json(formatWallets(updated));
  } catch (err: any) {
    req.log.error(err, "Stripe confirm failed");
    res.status(500).json({ error: err.message ?? "Failed to confirm payment. Please contact support." });
  }
});

export default router;
