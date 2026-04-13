import { Router, type IRouter } from "express";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

export const MIN_DEPOSIT = 10.75;
export const MAX_DEPOSIT = 1000;
export const MIN_WITHDRAWAL_BALANCE = 100;

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

export async function recordTransaction(
  userId: number,
  wallet: "hiring" | "earnings",
  type: string,
  amount: number,
  description: string,
) {
  await db.insert(walletTransactionsTable).values({
    userId,
    wallet,
    type,
    amount: String(round2(Math.abs(amount))),
    description,
  });
}

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

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
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

  const [updated] = await db
    .update(walletsTable)
    .set({ earningsBalance: round2(wallet.earningsBalance - rounded) })
    .where(eq(walletsTable.userId, user.id))
    .returning();

  await recordTransaction(user.id, "earnings", "withdrawal", rounded, `Withdrew $${rounded.toFixed(2)} from Earnings Wallet`);

  req.log.info({ userId: user.id, amount: rounded }, "Withdrawal from earnings wallet");
  res.json(formatWallets(updated));
});

export default router;
