import { Router, type IRouter } from "express";
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const MIN_DEPOSIT = 10.75;
const MAX_DEPOSIT = 1000;
const MIN_WITHDRAWAL_BALANCE = 100;

function formatWallets(wallet: {
  hiringBalance: number;
  earningsBalance: number;
}) {
  return {
    hiringBalance: wallet.hiringBalance,
    earningsBalance: wallet.earningsBalance,
    canWithdraw: wallet.earningsBalance >= MIN_WITHDRAWAL_BALANCE,
    canPostRequest: wallet.hiringBalance >= MIN_DEPOSIT,
  };
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

router.post("/wallets/deposit", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { amount } = req.body as { amount?: number };

  if (amount == null || typeof amount !== "number") {
    res.status(400).json({ error: "Amount is required" });
    return;
  }

  if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
    res.status(400).json({
      error: `Amount must be between ${MIN_DEPOSIT} and ${MAX_DEPOSIT}`,
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
    .set({ hiringBalance: wallet.hiringBalance + amount })
    .where(eq(walletsTable.userId, user.id))
    .returning();

  req.log.info({ userId: user.id, amount }, "Deposit to hiring wallet");
  res.json(formatWallets(updated));
});

router.post("/wallets/withdraw", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { amount } = req.body as { amount?: number };

  if (amount == null || typeof amount !== "number") {
    res.status(400).json({ error: "Amount is required" });
    return;
  }

  if (amount <= 0) {
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

  if (wallet.earningsBalance < MIN_WITHDRAWAL_BALANCE) {
    res.status(400).json({
      error: `You need at least ${MIN_WITHDRAWAL_BALANCE} in your earnings wallet to withdraw`,
    });
    return;
  }

  if (amount > wallet.earningsBalance) {
    res.status(400).json({ error: "Insufficient earnings balance" });
    return;
  }

  const [updated] = await db
    .update(walletsTable)
    .set({ earningsBalance: wallet.earningsBalance - amount })
    .where(eq(walletsTable.userId, user.id))
    .returning();

  req.log.info({ userId: user.id, amount }, "Withdrawal from earnings wallet");
  res.json(formatWallets(updated));
});

export default router;
