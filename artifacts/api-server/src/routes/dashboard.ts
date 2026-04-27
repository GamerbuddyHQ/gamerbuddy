import { Router, type IRouter } from "express";
import { db, walletsTable, gameRequestsTable, bidsTable, reviewsTable } from "@workspace/db";
import { eq, desc, count, and, inArray, not, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { toIsoRequired } from "../lib/dates";

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
    .select({
      id:         gameRequestsTable.id,
      userId:     gameRequestsTable.userId,
      gameName:   gameRequestsTable.gameName,
      platform:   gameRequestsTable.platform,
      skillLevel: gameRequestsTable.skillLevel,
      objectives: gameRequestsTable.objectives,
      status:     gameRequestsTable.status,
      createdAt:  sql<string>`to_char(${gameRequestsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
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
    .where(and(eq(gameRequestsTable.userId, user.id), eq(gameRequestsTable.status, "open")));

  // ── Pending reviews: sessions awaiting_reviews where user hasn't reviewed yet ──

  // As hirer: my requests that are awaiting_reviews
  const hirerAwaitingRequests = await db
    .select({ id: gameRequestsTable.id, gameName: gameRequestsTable.gameName })
    .from(gameRequestsTable)
    .where(and(eq(gameRequestsTable.userId, user.id), eq(gameRequestsTable.status, "awaiting_reviews")));

  // As gamer: accepted bids on awaiting_reviews requests
  const gamerAwaitingBids = await db
    .select({ requestId: bidsTable.requestId, gameName: gameRequestsTable.gameName })
    .from(bidsTable)
    .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(and(eq(bidsTable.bidderId, user.id), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "awaiting_reviews")));

  // Find which ones user has already reviewed
  const allAwaitingIds = [
    ...hirerAwaitingRequests.map((r) => r.id),
    ...gamerAwaitingBids.map((b) => b.requestId!),
  ].filter(Boolean);

  let alreadyReviewedIds: number[] = [];
  if (allAwaitingIds.length > 0) {
    const existing = await db
      .select({ requestId: reviewsTable.requestId })
      .from(reviewsTable)
      .where(and(eq(reviewsTable.reviewerId, user.id), inArray(reviewsTable.requestId, allAwaitingIds)));
    alreadyReviewedIds = existing.map((r) => r.requestId);
  }

  const pendingReviewSessions = [
    ...hirerAwaitingRequests
      .filter((r) => !alreadyReviewedIds.includes(r.id))
      .map((r) => ({ requestId: r.id, gameName: r.gameName, role: "hirer" as const })),
    ...gamerAwaitingBids
      .filter((b) => !alreadyReviewedIds.includes(b.requestId!))
      .map((b) => ({ requestId: b.requestId!, gameName: b.gameName, role: "gamer" as const })),
  ];

  const hiringBalance = wallet?.hiringBalance ?? 0;
  const earningsBalance = wallet?.earningsBalance ?? 0;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      idVerified: user.idVerified,
      createdAt: toIsoRequired(user.createdAt),
    },
    wallets: {
      hiringBalance,
      earningsBalance,
      canWithdraw: earningsBalance >= MIN_WITHDRAWAL_BALANCE,
      canPostRequest: hiringBalance >= MIN_DEPOSIT,
    },
    totalRequestsPosted: totalCountResult?.count ?? 0,
    openRequestsCount: openCountResult?.count ?? 0,
    pendingReviewSessions,
    recentRequests: recentRequests.map((r) => ({
      id:         r.id,
      userId:     r.userId,
      userName:   user.name,
      gameName:   r.gameName,
      platform:   r.platform,
      skillLevel: r.skillLevel,
      objectives: r.objectives,
      status:     r.status,
      createdAt:  r.createdAt,
    })),
  });
});

export default router;
