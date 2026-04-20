import { Router, type IRouter } from "express";
import { db, walletsTable, walletTransactionsTable, gameRequestsTable, platformFeesTable } from "@workspace/db";
import { eq, desc, sql, and, gte, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { withdrawLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

export const MIN_DEPOSIT = 10.75;
export const MAX_DEPOSIT = 1000;
export const MIN_WITHDRAWAL_BALANCE = 100;

// Deposits/withdrawals above this threshold are flagged in server logs for
// manual review. This does NOT block the transaction — it creates an audit trail.
const ANOMALY_DEPOSIT_THRESHOLD = 500;
const ANOMALY_BID_THRESHOLD = 500;

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatWallets(wallet: {
  hiringBalance: number;
  earningsBalance: number;
  escrowBalance?: number;
}) {
  return {
    hiringBalance: round2(wallet.hiringBalance),
    earningsBalance: round2(wallet.earningsBalance),
    escrowBalance: round2(wallet.escrowBalance ?? 0),
    canWithdraw: round2(wallet.earningsBalance) >= MIN_WITHDRAWAL_BALANCE,
    canPostRequest: round2(wallet.hiringBalance) >= MIN_DEPOSIT,
  };
}

/**
 * Record a wallet transaction in the audit log.
 *
 * @param referenceId  Optional external payment ID (Razorpay paymentId).
 *                     When provided, the DB's partial
 *                     unique index prevents the same external payment from ever
 *                     being recorded twice, even on retried requests.
 */
export async function recordTransaction(
  userId: number,
  wallet: "hiring" | "earnings",
  type: string,
  amount: number,
  description: string,
  referenceId?: string,
): Promise<void> {
  await db.insert(walletTransactionsTable).values({
    userId,
    wallet,
    type,
    amount: String(round2(Math.abs(amount))),
    description,
    referenceId: referenceId ?? null,
  });
}

/**
 * Anomaly check — logs a WARN when an amount exceeds threshold.
 * Does NOT block the operation; provides an audit trail for manual review.
 */
export function checkDepositAnomaly(
  userId: number,
  amount: number,
  context: string,
  log: { warn: (obj: object, msg: string) => void },
): void {
  if (amount > ANOMALY_DEPOSIT_THRESHOLD) {
    log.warn(
      { userId, amount, context, threshold: ANOMALY_DEPOSIT_THRESHOLD },
      `ANOMALY: Large deposit detected ($${amount.toFixed(2)}) — flagged for review`,
    );
  }
}

export function checkBidAnomaly(
  userId: number,
  amount: number,
  context: string,
  log: { warn: (obj: object, msg: string) => void },
): void {
  if (amount > ANOMALY_BID_THRESHOLD) {
    log.warn(
      { userId, amount, context, threshold: ANOMALY_BID_THRESHOLD },
      `ANOMALY: Unusually large bid ($${amount.toFixed(2)}) — flagged for review`,
    );
  }
}

/**
 * Atomically deduct `amount` from hiringBalance using a SQL-level WHERE guard.
 * Returns the updated wallet row, or null if the balance was insufficient
 * (race-condition-safe: the WHERE clause prevents over-deduction even under
 * concurrent requests).
 */
export async function deductHiringBalance(
  userId: number,
  amount: number,
): Promise<{ hiringBalance: number; earningsBalance: number } | null> {
  const rounded = round2(amount);
  const [updated] = await db
    .update(walletsTable)
    .set({ hiringBalance: sql`hiring_balance - ${rounded}` })
    .where(
      and(
        eq(walletsTable.userId, userId),
        gte(walletsTable.hiringBalance, rounded),
      ),
    )
    .returning();
  return updated ?? null;
}

// ── GET /wallets ────────────────────────────────────────────────────────────
router.get("/wallets", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  // Compute total escrow currently held for this user's in-progress requests
  const [escrowRow] = await db
    .select({ total: sum(gameRequestsTable.escrowAmount) })
    .from(gameRequestsTable)
    .where(and(eq(gameRequestsTable.userId, user.id), eq(gameRequestsTable.status, "in_progress")));

  const escrowBalance = round2(parseFloat(escrowRow?.total ?? "0") || 0);

  res.json(formatWallets({ ...wallet, escrowBalance }));
});

// ── GET /admin/platform-earnings ─────────────────────────────────────────────
// Shows the platform owner's accumulated fee earnings.
// Protected: only accessible to the admin user ID defined in ADMIN_USER_ID env var.
// Falls back to user ID 1 if the env var is not set.
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID ?? "1", 10);

router.get("/admin/platform-earnings", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.id !== ADMIN_USER_ID) {
    res.status(403).json({ error: "Access denied." });
    return;
  }
  const fees = await db
    .select()
    .from(platformFeesTable)
    .orderBy(desc(platformFeesTable.createdAt))
    .limit(200);

  const [totals] = await db
    .select({
      total: sum(platformFeesTable.amount),
      sessionTotal: sql<string>`sum(case when type = 'session_fee' then amount else 0 end)`,
      bulkTotal: sql<string>`sum(case when type = 'bulk_session_fee' then amount else 0 end)`,
      giftTotal: sql<string>`sum(case when type = 'gift_fee' then amount else 0 end)`,
    })
    .from(platformFeesTable);

  res.json({
    totalFees: round2(parseFloat(totals?.total ?? "0") || 0),
    sessionFees: round2(parseFloat(totals?.sessionTotal ?? "0") || 0),
    bulkFees: round2(parseFloat(totals?.bulkTotal ?? "0") || 0),
    giftFees: round2(parseFloat(totals?.giftTotal ?? "0") || 0),
    feeCount: fees.length,
    fees: fees.map((f) => ({
      ...f,
      amount: round2(parseFloat(f.amount)),
      createdAt: f.createdAt.toISOString(),
    })),
  });
});

// ── GET /wallets/transactions ───────────────────────────────────────────────
router.get("/wallets/transactions", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const txns = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, user.id))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(50);

  res.json(txns.map((t) => ({
    ...t,
    amount: parseFloat(t.amount),
    createdAt: t.createdAt.toISOString(),
  })));
});

// ── POST /wallets/deposit (dev/test only — real deposits go via /payments/*) ─
router.post("/wallets/deposit", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { amount } = req.body as { amount?: number };

  if (amount == null || typeof amount !== "number") {
    res.status(400).json({ error: "Amount is required" });
    return;
  }

  const rounded = round2(amount);

  if (rounded < MIN_DEPOSIT || rounded > MAX_DEPOSIT) {
    res.status(400).json({
      error: `Amount must be between $${MIN_DEPOSIT.toFixed(2)} and $${MAX_DEPOSIT.toFixed(2)}`,
    });
    return;
  }

  checkDepositAnomaly(user.id, rounded, "manual-deposit", req.log);

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  if (round2(wallet.hiringBalance + rounded) > MAX_DEPOSIT) {
    const canAdd = round2(MAX_DEPOSIT - wallet.hiringBalance);
    res.status(400).json({
      error: `This deposit would exceed the $${MAX_DEPOSIT.toFixed(2)} wallet cap. Current balance: $${wallet.hiringBalance.toFixed(2)}. You can add up to $${canAdd.toFixed(2)}.`,
    });
    return;
  }

  const [updated] = await db
    .update(walletsTable)
    .set({ hiringBalance: round2(wallet.hiringBalance + rounded) })
    .where(eq(walletsTable.userId, user.id))
    .returning();

  await recordTransaction(user.id, "hiring", "deposit", rounded, `Deposited $${rounded.toFixed(2)} to Hiring Wallet`);

  req.log.info({ userId: user.id, amount: rounded }, "Deposit to hiring wallet");
  res.json(formatWallets(updated));
});

// ── POST /wallets/withdraw ──────────────────────────────────────────────────
// Regional payout policy:
//   • India       → UPI (Razorpay instant payout), method = "upi"
//   • International → Bank Transfer (Razorpay International, Monday batch), method = "bank_transfer"
// Rate limited: 3 attempts per 10-minute window per user.
router.post("/wallets/withdraw", requireAuth, withdrawLimiter, async (req, res): Promise<void> => {
  const user = req.user!;
  const { amount, withdrawalMethod, details } = req.body as {
    amount?: number;
    withdrawalMethod?: string;
    details?: string;
  };

  if (amount == null || typeof amount !== "number") {
    res.status(400).json({ error: "Amount is required" });
    return;
  }

  const rounded = round2(amount);

  if (rounded <= 0) {
    res.status(400).json({ error: "Withdrawal amount must be positive" });
    return;
  }

  // Determine the correct method based on the user's country
  const isIndian = user.country === "India";
  const expectedMethod = isIndian ? "upi" : "bank_transfer";
  const effectiveMethod = withdrawalMethod ?? expectedMethod;

  // Enforce that the method matches the user's country
  if (isIndian && effectiveMethod !== "upi") {
    res.status(400).json({ error: "Indian accounts must withdraw via UPI. Please use your UPI ID." });
    return;
  }
  if (!isIndian && effectiveMethod === "upi") {
    res.status(400).json({ error: "UPI is only available for Indian accounts. Please use bank transfer." });
    return;
  }

  // Validate payout details
  if (effectiveMethod === "upi" && !details?.trim()) {
    res.status(400).json({ error: "Please enter your UPI ID (e.g. yourname@paytm)" });
    return;
  }
  if (effectiveMethod === "bank_transfer" && !details?.trim()) {
    res.status(400).json({ error: "Please enter your bank account details (Account No, IFSC/SWIFT, Bank Name)" });
    return;
  }

  // Atomic deduction: WHERE earnings_balance >= rounded prevents negative balance
  // even if two withdraw requests arrive simultaneously.
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  if (round2(wallet.earningsBalance) < MIN_WITHDRAWAL_BALANCE) {
    res.status(400).json({
      error: `You need at least $${MIN_WITHDRAWAL_BALANCE.toFixed(2)} in your Earnings Wallet to withdraw`,
    });
    return;
  }

  if (rounded > round2(wallet.earningsBalance)) {
    res.status(400).json({ error: "Amount exceeds your earnings balance" });
    return;
  }

  // Atomic deduction with balance guard in WHERE clause
  const [updated] = await db
    .update(walletsTable)
    .set({ earningsBalance: sql`earnings_balance - ${rounded}` })
    .where(
      and(
        eq(walletsTable.userId, user.id),
        gte(walletsTable.earningsBalance, rounded),
      ),
    )
    .returning();

  if (!updated) {
    res.status(400).json({ error: "Insufficient earnings balance. Please refresh and try again." });
    return;
  }

  const methodLabel = effectiveMethod === "upi"
    ? `UPI (${details?.trim()})`
    : `Bank Transfer (${details?.trim()})`;

  await recordTransaction(
    user.id,
    "earnings",
    "withdrawal",
    rounded,
    `Withdrew $${rounded.toFixed(2)} via ${methodLabel}`,
  );

  req.log.info({ userId: user.id, amount: rounded, method: effectiveMethod }, "Withdrawal from earnings wallet");
  res.json({ ...formatWallets(updated), withdrawalMethod: effectiveMethod, details: details?.trim() });
});

export default router;
