import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { round2, recordTransaction, formatWallets, checkDepositAnomaly } from "./wallets";

// ─────────────────────────────────────────────────────────────
// PAYMENT KEYS — all sourced from environment variables.
//
// RAZORPAY (UPI, cards, net banking, wallets):
//   RAZORPAY_KEY_ID     — Test: rzp_test_...   Live: rzp_live_...
//   RAZORPAY_KEY_SECRET — Test secret key      Live secret key
//
// EXCHANGE RATE:
//   INR_PER_USD — default 84 (update periodically or use a live rate API)
//
// SECURITY NOTES:
//   - Secret key NEVER leaves this file; only the key_id is sent to clients
//   - Every incoming payment is verified server-side before any wallet is credited
//   - The referenceId (paymentId) is stored with a partial unique index so
//     replaying the same payment ID cannot double-credit the wallet
// ─────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
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

// ── Payment Config ──────────────────────────────────────────────────────────
router.get("/payments/config", requireAuth, async (_req, res): Promise<void> => {
  res.json({
    razorpayEnabled: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
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
  const [wallet] = await db
    .select({ hiringBalance: walletsTable.hiringBalance })
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.id));
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  if (round2(wallet.hiringBalance + amount) > MAX_AMOUNT) {
    const canAdd = Math.max(0, round2(MAX_AMOUNT - wallet.hiringBalance));
    res.status(400).json({
      error: `This deposit would exceed the $${MAX_AMOUNT.toFixed(2)} wallet cap. Current balance: $${wallet.hiringBalance.toFixed(2)}. You can add up to $${canAdd.toFixed(2)}.`,
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
    `Deposited $${rounded.toFixed(2)} via Razorpay (${paymentId})`,
    paymentId,
  );

  req.log.info({ userId: user.id, amount: rounded, paymentId }, "Razorpay deposit credited to hiring wallet");
  res.json(formatWallets(updated));
});

export default router;
