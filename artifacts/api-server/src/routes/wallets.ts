import { Router, type IRouter } from "express";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

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
}) {
  return {
    hiringBalance: round2(wallet.hiringBalance),
    earningsBalance: round2(wallet.earningsBalance),
    canWithdraw: round2(wallet.earningsBalance) >= MIN_WITHDRAWAL_BALANCE,
    canPostRequest: round2(wallet.hiringBalance) >= MIN_DEPOSIT,
  };
}

/**
 * Record a wallet transaction in the audit log.
 *
 * @param referenceId  Optional external payment ID (Razorpay paymentId or
 *                     Stripe paymentIntentId). When provided, the DB's partial
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

  res.json(formatWallets(wallet));
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
router.post("/wallets/withdraw", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { amount } = req.body as { amount?: number };

  if (amount == null || typeof amount !== "number") {
    res.status(400).json({ error: "Amount is required" });
    return;
  }

  const rounded = round2(amount);

  if (rounded <= 0) {
    res.status(400).json({ error: "Withdrawal amount must be positive" });
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

  await recordTransaction(user.id, "earnings", "withdrawal", rounded, `Withdrew $${rounded.toFixed(2)} from Earnings Wallet`);

  req.log.info({ userId: user.id, amount: rounded }, "Withdrawal from earnings wallet");
  res.json(formatWallets(updated));
});

export default router;
