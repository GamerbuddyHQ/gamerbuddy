import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { round2, recordTransaction, formatWallets } from "./wallets";

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
// ─────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
const INR_PER_USD = parseFloat(process.env.INR_PER_USD ?? "84");

const MIN_AMOUNT = 10.75;
const MAX_AMOUNT = 1000;

const router: IRouter = Router();

// ── Payment Config (public key only — no secret exposed) ───────────────────
// Used by the frontend to initialise Stripe.js before creating a PaymentIntent.
router.get("/payments/config", requireAuth, async (_req, res): Promise<void> => {
  res.json({
    razorpayEnabled: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
    stripeEnabled: !!(STRIPE_SECRET_KEY && STRIPE_PUBLISHABLE_KEY),
    // publishableKey is safe to expose — it is NOT the secret key
    stripePublishableKey: STRIPE_PUBLISHABLE_KEY || null,
  });
});

// ── Razorpay: Create Order ──────────────────────────────────────────────────
// Returns an order to be opened in the Razorpay Checkout modal on the frontend.
// Amount is in USD; we convert to INR paise for Razorpay's API.
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

  try {
    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    // Convert USD → INR paise (Razorpay requires integer paise)
    const amountPaise = Math.round(amount * INR_PER_USD * 100);
    const amountInr = amountPaise / 100;

    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `gby_${Date.now()}`,
      notes: {
        usd_amount: String(amount),
        user_id: String(req.user!.id),
        // Notes are visible in the Razorpay dashboard
      },
    });

    req.log.info({ userId: req.user!.id, amountUsd: amount, amountPaise }, "Razorpay order created");

    res.json({
      orderId: order.id,
      amountInr,
      amountUsd: amount,
      currency: "INR",
      // keyId returned here so frontend doesn't need a separate env var
      // The key_id (not key_secret) is safe to expose to the browser
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    req.log.error(err, "Razorpay create-order failed");
    res.status(500).json({ error: err.message ?? "Failed to create payment order. Please try again." });
  }
});

// ── Razorpay: Verify Payment & Credit Wallet ───────────────────────────────
// Called after the Razorpay modal reports success. We verify the HMAC
// signature before crediting the wallet to prevent replay attacks.
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

  if (!RAZORPAY_KEY_SECRET) {
    res.status(503).json({ error: "Razorpay is not configured" });
    return;
  }

  // Verify the HMAC-SHA256 signature using the order_id|payment_id body
  const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSig !== signature) {
    req.log.warn({ orderId, paymentId }, "Razorpay signature mismatch — possible fraud attempt");
    res.status(400).json({ error: "Payment signature verification failed. Do not retry this payment." });
    return;
  }

  const user = req.user!;
  const rounded = round2(amountUsd);

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const [updated] = await db
    .update(walletsTable)
    .set({ hiringBalance: round2(wallet.hiringBalance + rounded) })
    .where(eq(walletsTable.userId, user.id))
    .returning();

  await recordTransaction(
    user.id,
    "hiring",
    "deposit",
    rounded,
    `Deposited $${rounded.toFixed(2)} via Razorpay UPI/Card (${paymentId})`,
  );

  req.log.info({ userId: user.id, amount: rounded, paymentId }, "Razorpay deposit credited to hiring wallet");
  res.json(formatWallets(updated));
});

// ── Stripe: Create PaymentIntent ────────────────────────────────────────────
// Creates a Stripe PaymentIntent. The client_secret is returned to the
// frontend where it's used with Stripe.js to confirm the payment.
// Amount is in USD cents (USD × 100).
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

  try {
    const Stripe = (await import("stripe")).default;
    // To switch to live: replace sk_test_... with sk_live_... in STRIPE_SECRET_KEY
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
      // publishableKey is safe to expose (it's the pk_test_ / pk_live_ key)
      publishableKey: STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err: any) {
    req.log.error(err, "Stripe create-intent failed");
    res.status(500).json({ error: err.message ?? "Failed to initialise Stripe. Please try again." });
  }
});

// ── Stripe: Confirm & Credit Wallet ────────────────────────────────────────
// After Stripe.js confirms the card payment on the frontend, call this
// to retrieve + verify the PaymentIntent server-side before crediting.
router.post("/payments/stripe/confirm", requireAuth, async (req, res): Promise<void> => {
  const { paymentIntentId, amountUsd } = req.body as {
    paymentIntentId?: string;
    amountUsd?: number;
  };

  if (!paymentIntentId || !amountUsd) {
    res.status(400).json({ error: "Missing paymentIntentId or amountUsd" });
    return;
  }

  if (!STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Retrieve the intent from Stripe — never trust the frontend alone
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      res.status(400).json({
        error: `Payment not completed. Status: ${intent.status}. Please contact support if funds were debited.`,
      });
      return;
    }

    // Guard: intent must belong to this user
    if (intent.metadata.user_id && intent.metadata.user_id !== String(req.user!.id)) {
      req.log.warn({ paymentIntentId, userId: req.user!.id }, "Stripe PaymentIntent user_id mismatch");
      res.status(403).json({ error: "Payment does not belong to this account" });
      return;
    }

    // Guard: amount tolerance ±1 cent (to handle floating-point rounding)
    const expectedCents = Math.round(amountUsd * 100);
    if (Math.abs(intent.amount - expectedCents) > 1) {
      req.log.warn({ paymentIntentId, intentAmount: intent.amount, expectedCents }, "Stripe amount mismatch");
      res.status(400).json({ error: "Payment amount mismatch. Please contact support." });
      return;
    }

    const user = req.user!;
    const rounded = round2(amountUsd);

    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const [updated] = await db
      .update(walletsTable)
      .set({ hiringBalance: round2(wallet.hiringBalance + rounded) })
      .where(eq(walletsTable.userId, user.id))
      .returning();

    await recordTransaction(
      user.id,
      "hiring",
      "deposit",
      rounded,
      `Deposited $${rounded.toFixed(2)} via Stripe Card (${paymentIntentId})`,
    );

    req.log.info({ userId: user.id, amount: rounded, paymentIntentId }, "Stripe deposit credited to hiring wallet");
    res.json(formatWallets(updated));
  } catch (err: any) {
    req.log.error(err, "Stripe confirm failed");
    res.status(500).json({ error: err.message ?? "Failed to confirm payment. Please contact support." });
  }
});

export default router;
