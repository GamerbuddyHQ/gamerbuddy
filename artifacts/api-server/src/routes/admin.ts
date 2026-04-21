/**
 * Admin-only routes — all endpoints require a valid admin session cookie.
 * Auth is handled by requireAdminAuth (email + password + secret key login).
 */

import { Router, type IRouter } from "express";
import { db, usersTable, walletTransactionsTable, reportsTable, walletsTable, withdrawalRequestsTable, platformFeesTable, gameRequestsTable } from "@workspace/db";
import { eq, desc, gt, or, isNotNull, sql, and, gte, inArray, not, count, sum, lt } from "drizzle-orm";
import { round2, recordTransaction } from "./wallets";
import { requireAdminAuth } from "./admin-auth";

const router: IRouter = Router();

// ── GET /admin/security ───────────────────────────────────────────────────
// Returns three sections in one request to minimize round-trips:
//   • loginAttempts  — users with any failed login history or current lock
//   • suspicious     — large transactions + filed reports
//   • transactions   — most recent 100 wallet movements across all users
router.get(
  "/admin/security",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    const now = new Date();

    const [loginAttempts, largeTransactions, reports, recentTransactions, userStats] =
      await Promise.all([

        // ── 1. Users with failed login attempts or active lock ────────────
        db
          .select({
            id:            usersTable.id,
            name:          usersTable.name,
            email:         usersTable.email,
            loginAttempts: usersTable.loginAttempts,
            lockedUntil:   usersTable.lockedUntil,
            createdAt:     usersTable.createdAt,
          })
          .from(usersTable)
          .where(
            or(
              gt(usersTable.loginAttempts, 0),
              isNotNull(usersTable.lockedUntil),
            ),
          )
          .orderBy(desc(usersTable.loginAttempts), desc(usersTable.lockedUntil))
          .limit(50),

        // ── 2a. Large transactions (amount ≥ $500 anomaly threshold) ──────
        db
          .select({
            id:          walletTransactionsTable.id,
            userId:      walletTransactionsTable.userId,
            userName:    usersTable.name,
            wallet:      walletTransactionsTable.wallet,
            type:        walletTransactionsTable.type,
            amount:      walletTransactionsTable.amount,
            description: walletTransactionsTable.description,
            referenceId: walletTransactionsTable.referenceId,
            createdAt:   walletTransactionsTable.createdAt,
          })
          .from(walletTransactionsTable)
          .leftJoin(usersTable, eq(walletTransactionsTable.userId, usersTable.id))
          .where(gte(sql`${walletTransactionsTable.amount}::numeric`, 500))
          .orderBy(desc(walletTransactionsTable.createdAt))
          .limit(50),

        // ── 2b. All user reports ──────────────────────────────────────────
        db
          .select({
            id:               reportsTable.id,
            reporterId:       reportsTable.reporterId,
            reporterName:     sql<string>`ru.name`,
            reportedUserId:   reportsTable.reportedUserId,
            reportedUserName: sql<string>`ud.name`,
            reason:           reportsTable.reason,
            description:      reportsTable.description,
            createdAt:        reportsTable.createdAt,
          })
          .from(reportsTable)
          .leftJoin(
            sql`users ru`,
            sql`ru.id = ${reportsTable.reporterId}`,
          )
          .leftJoin(
            sql`users ud`,
            sql`ud.id = ${reportsTable.reportedUserId}`,
          )
          .orderBy(desc(reportsTable.createdAt))
          .limit(100),

        // ── 3. Recent wallet transactions (all users) ─────────────────────
        db
          .select({
            id:          walletTransactionsTable.id,
            userId:      walletTransactionsTable.userId,
            userName:    usersTable.name,
            wallet:      walletTransactionsTable.wallet,
            type:        walletTransactionsTable.type,
            amount:      walletTransactionsTable.amount,
            description: walletTransactionsTable.description,
            referenceId: walletTransactionsTable.referenceId,
            createdAt:   walletTransactionsTable.createdAt,
          })
          .from(walletTransactionsTable)
          .leftJoin(usersTable, eq(walletTransactionsTable.userId, usersTable.id))
          .orderBy(desc(walletTransactionsTable.createdAt))
          .limit(100),

        // ── 4. Aggregate user stats ───────────────────────────────────────
        Promise.all([
          db.select({ total: count() }).from(usersTable),
          db.select({ total: count() }).from(usersTable).where(eq(usersTable.idVerified, true)),
          db.select({ total: count() }).from(usersTable).where(
            and(isNotNull(usersTable.officialIdPath), not(usersTable.idVerified))
          ),
          db.select({ total: count() }).from(usersTable).where(eq(usersTable.communityBanned, true)),
        ]),
      ]);

    // Annotate each login entry with computed lock status
    const annotatedLogins = loginAttempts.map((u) => {
      const isCurrentlyLocked =
        u.lockedUntil !== null && u.lockedUntil > now;
      const minutesRemaining =
        isCurrentlyLocked
          ? Math.ceil((u.lockedUntil!.getTime() - now.getTime()) / 60_000)
          : 0;
      return {
        ...u,
        createdAt:     u.createdAt.toISOString(),
        lockedUntil:   u.lockedUntil ? u.lockedUntil.toISOString() : null,
        isCurrentlyLocked,
        minutesRemaining,
      };
    });

    const [totalResult, verifiedResult, pendingResult, bannedResult] = userStats;

    res.json({
      generatedAt: now.toISOString(),
      users: {
        total:    Number(totalResult[0]?.total   ?? 0),
        verified: Number(verifiedResult[0]?.total ?? 0),
        pending:  Number(pendingResult[0]?.total  ?? 0),
        banned:   Number(bannedResult[0]?.total   ?? 0),
      },
      loginAttempts: annotatedLogins,
      suspicious: {
        largeTransactions: largeTransactions.map((t) => ({
          ...t,
          amount:    parseFloat(String(t.amount)),
          createdAt: t.createdAt.toISOString(),
        })),
        reports: reports.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      transactions: recentTransactions.map((t) => ({
        ...t,
        amount:    parseFloat(String(t.amount)),
        createdAt: t.createdAt.toISOString(),
      })),
    });
  },
);

// ── POST /admin/security/clear-lockout/:userId ────────────────────────────
// Lets the admin manually reset a user's failed-login counter + lock.
router.post(
  "/admin/security/clear-lockout/:userId",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }

    await db
      .update(usersTable)
      .set({ loginAttempts: 0, lockedUntil: null })
      .where(eq(usersTable.id, userId));

    req.log.info({ adminId: "admin", targetUserId: userId }, "Admin cleared account lockout");
    res.json({ success: true });
  },
);

// ── GET /admin/platform-earnings ──────────────────────────────────────────
// Returns platform fee stats with time breakdowns, geo split, and ledger.
router.get(
  "/admin/platform-earnings",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    const now = new Date();
    const todayStart  = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart   = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart  = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [fees, completedStats, indiaFees, globalFees] = await Promise.all([
      // Full ledger with user/request context — last 50 entries
      db
        .select({
          id:            platformFeesTable.id,
          requestId:     platformFeesTable.requestId,
          amount:        platformFeesTable.amount,
          type:          platformFeesTable.type,
          description:   platformFeesTable.description,
          createdAt:     platformFeesTable.createdAt,
          hirerRegion:   gameRequestsTable.hirerRegion,
          gameName:      gameRequestsTable.gameName,
          hirerName:     usersTable.name,
          hirerGbId:     usersTable.gamerbuddyId,
        })
        .from(platformFeesTable)
        .leftJoin(gameRequestsTable, eq(platformFeesTable.requestId, gameRequestsTable.id))
        .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
        .orderBy(desc(platformFeesTable.createdAt))
        .limit(50),

      // Completed session / quest counts
      db
        .select({ total: count() })
        .from(gameRequestsTable)
        .where(eq(gameRequestsTable.status, "completed")),

      // India fees (hirerRegion = 'india')
      db
        .select({ total: sum(platformFeesTable.amount), cnt: count() })
        .from(platformFeesTable)
        .leftJoin(gameRequestsTable, eq(platformFeesTable.requestId, gameRequestsTable.id))
        .where(eq(gameRequestsTable.hirerRegion, "india")),

      // Global/international fees
      db
        .select({ total: sum(platformFeesTable.amount), cnt: count() })
        .from(platformFeesTable)
        .leftJoin(gameRequestsTable, eq(platformFeesTable.requestId, gameRequestsTable.id))
        .where(sql`${gameRequestsTable.hirerRegion} != 'india' OR ${gameRequestsTable.hirerRegion} IS NULL`),
    ]);

    // Time-bucket totals computed in JS from full ledger
    function bucketTotal(since: Date) {
      return fees
        .filter((f) => f.createdAt >= since)
        .reduce((s, f) => s + parseFloat(String(f.amount)), 0);
    }
    function typeTotal(t: string) {
      return fees.filter((f) => f.type === t).reduce((s, f) => s + parseFloat(String(f.amount)), 0);
    }

    const totalFees   = fees.reduce((s, f) => s + parseFloat(String(f.amount)), 0);
    const todayFees   = bucketTotal(todayStart);
    const weekFees    = bucketTotal(weekStart);
    const monthFees   = bucketTotal(monthStart);
    const sessionFees = typeTotal("session_fee");
    const bulkFees    = typeTotal("bulk_session_fee");
    const giftFees    = typeTotal("gift_fee");

    res.json({
      generatedAt:       now.toISOString(),
      totalFees:         round2(totalFees),
      todayFees:         round2(todayFees),
      weekFees:          round2(weekFees),
      monthFees:         round2(monthFees),
      sessionFees:       round2(sessionFees),
      bulkFees:          round2(bulkFees),
      giftFees:          round2(giftFees),
      feeCount:          fees.length,
      completedSessions: completedStats[0]?.total ?? 0,
      india: {
        total: round2(parseFloat(String(indiaFees[0]?.total ?? 0))),
        count: Number(indiaFees[0]?.cnt ?? 0),
      },
      global: {
        total: round2(parseFloat(String(globalFees[0]?.total ?? 0))),
        count: Number(globalFees[0]?.cnt ?? 0),
      },
      fees: fees.map((f) => ({
        id:          f.id,
        requestId:   f.requestId,
        amount:      parseFloat(String(f.amount)),
        type:        f.type,
        description: f.description,
        createdAt:   f.createdAt.toISOString(),
        hirerRegion: f.hirerRegion ?? "international",
        gameName:    f.gameName ?? null,
        hirerName:   f.hirerName ?? null,
        hirerGbId:   f.hirerGbId ?? null,
      })),
    });
  },
);

// ── GET /admin/process-payouts ────────────────────────────────────────────
// Returns all users with an earnings balance >= $100 who are eligible for
// payout. Admin uses this list to process transfers manually via the
// Razorpay dashboard (UPI for India, bank transfer for international).
// Serverless-safe: read-only query, no background processing.
router.get(
  "/admin/process-payouts",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    const MIN_PAYOUT = 100;

    const eligible = await db
      .select({
        userId: walletsTable.userId,
        userName: usersTable.name,
        email: usersTable.email,
        country: usersTable.country,
        earningsBalance: walletsTable.earningsBalance,
      })
      .from(walletsTable)
      .leftJoin(usersTable, eq(walletsTable.userId, usersTable.id))
      .where(gte(walletsTable.earningsBalance, MIN_PAYOUT))
      .orderBy(desc(walletsTable.earningsBalance));

    res.json({
      generatedAt: new Date().toISOString(),
      minPayoutThreshold: MIN_PAYOUT,
      count: eligible.length,
      users: eligible.map((u) => ({
        userId: u.userId,
        name: u.userName ?? "Unknown",
        email: u.email ?? "",
        country: u.country ?? "Unknown",
        payoutMethod: u.country === "India" ? "UPI (Razorpay)" : "Bank Transfer (Razorpay International)",
        earningsBalance: parseFloat(String(u.earningsBalance)),
      })),
    });
  },
);

// ── GET /admin/withdrawal-requests ────────────────────────────────────────
// Lists all withdrawal requests (pending first, then recent paid/cancelled).
router.get(
  "/admin/withdrawal-requests",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    const requests = await db
      .select({
        id:             withdrawalRequestsTable.id,
        userId:         withdrawalRequestsTable.userId,
        userName:       usersTable.name,
        email:          usersTable.email,
        gamerbuddyId:   usersTable.gamerbuddyId,
        amount:         withdrawalRequestsTable.amount,
        status:         withdrawalRequestsTable.status,
        country:        withdrawalRequestsTable.country,
        payoutDetails:  withdrawalRequestsTable.payoutDetails,
        createdAt:      withdrawalRequestsTable.createdAt,
        paidAt:         withdrawalRequestsTable.paidAt,
        adminNote:      withdrawalRequestsTable.adminNote,
        earningsBalance: walletsTable.earningsBalance,
      })
      .from(withdrawalRequestsTable)
      .leftJoin(usersTable, eq(withdrawalRequestsTable.userId, usersTable.id))
      .leftJoin(walletsTable, eq(withdrawalRequestsTable.userId, walletsTable.userId))
      .orderBy(
        sql`CASE WHEN ${withdrawalRequestsTable.status} = 'pending' THEN 0 ELSE 1 END`,
        desc(withdrawalRequestsTable.createdAt),
      )
      .limit(200);

    res.json({
      generatedAt: new Date().toISOString(),
      pendingCount: requests.filter((r) => r.status === "pending").length,
      requests: requests.map((r) => ({
        ...r,
        amount: round2(r.amount),
        earningsBalance: round2(r.earningsBalance ?? 0),
        createdAt: r.createdAt.toISOString(),
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      })),
    });
  },
);

// ── POST /admin/withdrawal-requests/:id/mark-paid ─────────────────────────
// Marks a pending withdrawal request as paid, deducts balance, records txn.
router.post(
  "/admin/withdrawal-requests/:id/mark-paid",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      res.status(400).json({ error: "Invalid request ID" });
      return;
    }

    const [wr] = await db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.id, requestId))
      .limit(1);

    if (!wr) {
      res.status(404).json({ error: "Withdrawal request not found" });
      return;
    }
    if (wr.status !== "pending") {
      res.status(400).json({ error: `Request is already ${wr.status}` });
      return;
    }

    // Atomic deduction — guard against over-deduction
    const [updatedWallet] = await db
      .update(walletsTable)
      .set({ earningsBalance: sql`earnings_balance - ${wr.amount}` })
      .where(
        and(
          eq(walletsTable.userId, wr.userId),
          gte(walletsTable.earningsBalance, wr.amount),
        ),
      )
      .returning();

    if (!updatedWallet) {
      res.status(400).json({
        error: `User's earnings balance ($${round2(
          (await db.select({ b: walletsTable.earningsBalance }).from(walletsTable).where(eq(walletsTable.userId, wr.userId)).then(([r]) => r?.b ?? 0))
        ).toFixed(2)}) is less than the requested amount ($${wr.amount.toFixed(2)}). Cannot mark as paid.`,
      });
      return;
    }

    // Mark as paid
    const now = new Date();
    await db
      .update(withdrawalRequestsTable)
      .set({ status: "paid", paidAt: now })
      .where(eq(withdrawalRequestsTable.id, requestId));

    // Record transaction in audit log
    await recordTransaction(
      wr.userId,
      "earnings",
      "withdrawal",
      wr.amount,
      `Withdrawal payout $${wr.amount.toFixed(2)} — processed by admin (Req #${requestId})`,
    );

    req.log.info({ adminId: "admin", requestId, userId: wr.userId, amount: wr.amount }, "Admin marked withdrawal as paid");

    res.json({
      success: true,
      requestId,
      userId: wr.userId,
      amount: wr.amount,
      newEarningsBalance: round2(updatedWallet.earningsBalance),
      paidAt: now.toISOString(),
    });
  },
);

// ── POST /admin/withdrawal-requests/process-all ───────────────────────────
// Bulk mark ALL pending withdrawal requests as paid.
router.post(
  "/admin/withdrawal-requests/process-all",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const pending = await db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.status, "pending"));

    if (pending.length === 0) {
      res.json({ processed: 0, failed: 0, results: [] });
      return;
    }

    const results: { requestId: number; userId: number; amount: number; success: boolean; error?: string }[] = [];

    for (const wr of pending) {
      const [updatedWallet] = await db
        .update(walletsTable)
        .set({ earningsBalance: sql`earnings_balance - ${wr.amount}` })
        .where(
          and(
            eq(walletsTable.userId, wr.userId),
            gte(walletsTable.earningsBalance, wr.amount),
          ),
        )
        .returning();

      if (!updatedWallet) {
        results.push({ requestId: wr.id, userId: wr.userId, amount: wr.amount, success: false, error: "Insufficient balance" });
        continue;
      }

      const now = new Date();
      await db.update(withdrawalRequestsTable).set({ status: "paid", paidAt: now }).where(eq(withdrawalRequestsTable.id, wr.id));
      await recordTransaction(wr.userId, "earnings", "withdrawal", wr.amount, `Withdrawal payout $${wr.amount.toFixed(2)} — bulk processed by admin (Req #${wr.id})`);
      results.push({ requestId: wr.id, userId: wr.userId, amount: wr.amount, success: true });
    }

    const succeeded = results.filter((r) => r.success).length;
    req.log.info({ adminId: "admin", processed: succeeded, failed: results.length - succeeded }, "Admin bulk-processed withdrawal requests");
    res.json({ processed: succeeded, failed: results.length - succeeded, results });
  },
);

// ── GET /admin/pending-verifications ──────────────────────────────────────
// Lists users who submitted a verification request (officialIdPath is set)
// but have not yet been approved (idVerified = false).
router.get(
  "/admin/pending-verifications",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    const pending = await db
      .select({
        id:             usersTable.id,
        name:           usersTable.name,
        email:          usersTable.email,
        gamerbuddyId:   usersTable.gamerbuddyId,
        country:        usersTable.country,
        idVerified:     usersTable.idVerified,
        officialIdPath: usersTable.officialIdPath,
        createdAt:      usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        and(
          isNotNull(usersTable.officialIdPath),
          not(usersTable.idVerified),
        ),
      )
      .orderBy(desc(usersTable.createdAt))
      .limit(200);

    res.json({
      generatedAt: new Date().toISOString(),
      pendingCount: pending.length,
      verifications: pending.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  },
);

// ── POST /admin/users/:id/set-verified ────────────────────────────────────
// Approves or revokes the Verified badge for a user.
// Body: { verified: true | false }
router.post(
  "/admin/users/:id/set-verified",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }

    const { verified } = req.body as { verified?: boolean };
    if (typeof verified !== "boolean") {
      res.status(400).json({ error: "Body must contain { verified: true | false }" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ idVerified: verified })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, idVerified: usersTable.idVerified, name: usersTable.name });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    req.log.info(
      { adminId: "admin", targetUserId: userId, verified },
      `Admin ${verified ? "approved" : "revoked"} verification for user ${userId}`,
    );

    res.json({
      success: true,
      userId: updated.id,
      name: updated.name,
      idVerified: updated.idVerified,
    });
  },
);

export default router;
