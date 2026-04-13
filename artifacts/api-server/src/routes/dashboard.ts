import { Router, type IRouter } from "express";
import { db, walletsTable, gameRequestsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const MIN_DEPOSIT = 10.75;
const MIN_WITHDRAWAL_BALANCE = 100;

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  const recentRequests = await db
    .select()
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.userId, user.id))
    .orderBy(desc(gameRequestsTable.createdAt))
    .limit(5);

  const [totalCountResult] = await db
    .select({ count: count() })
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.userId, user.id));

  const [openCountResult] = await db
    .select({ count: count() })
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.userId, user.id));

  const hiringBalance = wallet?.hiringBalance ?? 0;
  const earningsBalance = wallet?.earningsBalance ?? 0;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      idVerified: user.idVerified,
      createdAt: user.createdAt.toISOString(),
    },
    wallets: {
      hiringBalance,
      earningsBalance,
      canWithdraw: earningsBalance >= MIN_WITHDRAWAL_BALANCE,
      canPostRequest: hiringBalance >= MIN_DEPOSIT,
    },
    totalRequestsPosted: totalCountResult?.count ?? 0,
    openRequestsCount: openCountResult?.count ?? 0,
    recentRequests: recentRequests.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: user.name,
      gameName: r.gameName,
      platform: r.platform,
      skillLevel: r.skillLevel,
      objectives: r.objectives,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

export default router;
