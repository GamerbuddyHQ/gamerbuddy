/**
 * Admin-only routes — all endpoints require a valid admin session cookie.
 * Auth is handled by requireAdminAuth (email + password + secret key login).
 */

import { Router, type IRouter } from "express";
import { db, usersTable, walletTransactionsTable, reportsTable, walletsTable, withdrawalRequestsTable, platformFeesTable, gameRequestsTable, reviewsTable, bidsTable } from "@workspace/db";
import { eq, desc, gt, or, isNotNull, sql, and, gte, inArray, not, count, sum, lt } from "drizzle-orm";
import { round2, recordTransaction } from "./wallets";
import { requireAdminAuth } from "./admin-auth";
import { toIso, toIsoRequired } from "../lib/dates";
import { createNotification } from "../notifications-helper";

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
          .where(gte(walletTransactionsTable.amount, 500))
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
        createdAt:     toIsoRequired(u.createdAt),
        lockedUntil:   toIso(u.lockedUntil),
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
          createdAt: toIsoRequired(t.createdAt),
        })),
        reports: reports.map((r) => ({
          ...r,
          createdAt: toIsoRequired(r.createdAt),
        })),
      },
      transactions: recentTransactions.map((t) => ({
        ...t,
        amount:    parseFloat(String(t.amount)),
        createdAt: toIsoRequired(t.createdAt),
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
    const userId = parseInt(req.params.userId as string, 10);
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

    type FeeRow = {
      id:                       number;
      request_id:               number | null;
      amount:                   number | string;
      type:                     string;
      description:              string;
      created_at:               Date | number;
      hirer_region:             string | null;
      game_name:                string | null;
      platform:                 string | null;
      gross_amount:             number | string | null;
      hirer_id:                 number | null;
      hirer_name:               string | null;
      hirer_gb_id:              string | null;
      gamer_id:                 number | null;
      gamer_name:               string | null;
      gamer_gb_id:              string | null;
      pending_withdrawal_id:    number | null;
      pending_withdrawal_amount: number | string | null;
    };

    const [feeResult, completedStats, indiaFees, globalFees] = await Promise.all([
      // Full ledger — joined with game_requests, hirer, gamer (via accepted bid), pending withdrawal
      db.execute(sql.raw(`
        SELECT
          pf.id,
          pf.request_id,
          pf.amount,
          pf.type,
          pf.description,
          pf.created_at,
          gr.hirer_region,
          gr.game_name,
          gr.platform,
          gr.escrow_amount    AS gross_amount,
          h.id                AS hirer_id,
          h.name              AS hirer_name,
          h.gamerbuddy_id     AS hirer_gb_id,
          g.id                AS gamer_id,
          g.name              AS gamer_name,
          g.gamerbuddy_id     AS gamer_gb_id,
          (SELECT id FROM withdrawal_requests WHERE user_id = g.id AND status = 'pending' ORDER BY created_at ASC LIMIT 1) AS pending_withdrawal_id,
          (SELECT amount FROM withdrawal_requests WHERE user_id = g.id AND status = 'pending' ORDER BY created_at ASC LIMIT 1) AS pending_withdrawal_amount
        FROM platform_fees pf
        LEFT JOIN game_requests gr ON gr.id = pf.request_id
        LEFT JOIN users h          ON h.id  = gr.user_id
        LEFT JOIN bids  b          ON b.id  = gr.accepted_bid_id
        LEFT JOIN users g          ON g.id  = b.bidder_id
        ORDER BY pf.created_at DESC
        LIMIT 50
      `)),

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

    const fees = feeResult.rows as unknown as FeeRow[];

    // Time-bucket totals computed in JS from full ledger
    function bucketTotal(since: Date) {
      const sinceMs = since.getTime();
      return fees
        .filter((f: FeeRow) => {
          const ts = f.created_at instanceof Date ? f.created_at.getTime() : Number(f.created_at);
          return ts >= sinceMs;
        })
        .reduce((s: number, f: FeeRow) => s + parseFloat(String(f.amount)), 0);
    }
    function typeTotal(t: string) {
      return fees.filter((f: FeeRow) => f.type === t).reduce((s: number, f: FeeRow) => s + parseFloat(String(f.amount)), 0);
    }

    const totalFees   = fees.reduce((s: number, f: FeeRow) => s + parseFloat(String(f.amount)), 0);
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
      fees: fees.map((f) => {
        const fee      = parseFloat(String(f.amount));
        const gross    = parseFloat(String(f.gross_amount ?? "0")) || 0;
        const netToGamer = round2(gross - fee);
        return {
          id:                      f.id,
          requestId:               f.request_id,
          amount:                  round2(fee),
          grossAmount:             round2(gross),
          netToGamer:              netToGamer > 0 ? netToGamer : 0,
          type:                    f.type,
          description:             f.description,
          createdAt:               f.created_at instanceof Date ? (toIso(f.created_at) ?? String(f.created_at)) : String(f.created_at),
          hirerRegion:             f.hirer_region ?? "international",
          gameName:                f.game_name    ?? null,
          platform:                f.platform     ?? null,
          hirerId:                 f.hirer_id     ?? null,
          hirerName:               f.hirer_name   ?? null,
          hirerGbId:               f.hirer_gb_id  ?? null,
          gamerId:                 f.gamer_id     ?? null,
          gamerName:               f.gamer_name   ?? null,
          gamerGbId:               f.gamer_gb_id  ?? null,
          pendingWithdrawalId:     f.pending_withdrawal_id    ?? null,
          pendingWithdrawalAmount: round2(parseFloat(String(f.pending_withdrawal_amount ?? "0")) || 0),
        };
      }),
    });
  },
);

// ── GET /admin/hiring-history ─────────────────────────────────────────────
// Full history of all hiring sessions with hirer + gamer info, amounts, fees.
// Uses raw SQL for the self-join on users (hirer vs gamer aliases).
router.get(
  "/admin/hiring-history",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    type RawRow = {
      id:                       number;
      game_name:                string;
      platform:                 string;
      status:                   string;
      escrow_amount:            number | string | null;
      hirer_region:             string;
      created_at:               Date | number;
      started_at:               Date | number | null;
      hirer_id:                 number | null;
      hirer_name:               string | null;
      hirer_gb_id:              string | null;
      bid_price:                number | string | null;
      gamer_id:                 number | null;
      gamer_name:               string | null;
      gamer_gb_id:              string | null;
      fee_amount:               number | string | null;
      pending_withdrawal_id:    number | null;
      pending_withdrawal_amount: number | string | null;
    };

    const rawResult = await db.execute(sql.raw(`
      SELECT
        gr.id,
        gr.game_name,
        gr.platform,
        gr.status,
        gr.escrow_amount,
        gr.hirer_region,
        gr.created_at,
        gr.started_at,
        h.id            AS hirer_id,
        h.name          AS hirer_name,
        h.gamerbuddy_id AS hirer_gb_id,
        b.price         AS bid_price,
        g.id            AS gamer_id,
        g.name          AS gamer_name,
        g.gamerbuddy_id AS gamer_gb_id,
        pf.amount       AS fee_amount,
        (SELECT id FROM withdrawal_requests WHERE user_id = g.id AND status = 'pending' ORDER BY created_at ASC LIMIT 1) AS pending_withdrawal_id,
        (SELECT amount FROM withdrawal_requests WHERE user_id = g.id AND status = 'pending' ORDER BY created_at ASC LIMIT 1) AS pending_withdrawal_amount
      FROM game_requests gr
      LEFT JOIN users h              ON h.id  = gr.user_id
      LEFT JOIN bids  b              ON b.id  = gr.accepted_bid_id
      LEFT JOIN users g              ON g.id  = b.bidder_id
      LEFT JOIN platform_fees pf     ON pf.request_id = gr.id
      ORDER BY gr.created_at DESC
      LIMIT 500
    `));

    const [completedStats, txStats, feeStats, pendingStats] = await Promise.all([
      db.select({ total: count(gameRequestsTable.id) })
        .from(gameRequestsTable)
        .where(eq(gameRequestsTable.status, "completed")),
      db.select({ total: sum(gameRequestsTable.escrowAmount) })
        .from(gameRequestsTable)
        .where(inArray(gameRequestsTable.status, ["completed", "payment_released"])),
      db.select({ total: sum(platformFeesTable.amount) })
        .from(platformFeesTable),
      db.select({ total: sum(withdrawalRequestsTable.amount) })
        .from(withdrawalRequestsTable)
        .where(eq(withdrawalRequestsTable.status, "pending")),
    ]);

    const rows = rawResult.rows as unknown as RawRow[];

    res.json({
      summary: {
        completedSessions:   Number(completedStats[0]?.total ?? 0),
        totalTransacted:     round2(parseFloat(String(txStats[0]?.total ?? "0")) || 0),
        platformEarnings:    round2(parseFloat(String(feeStats[0]?.total ?? "0")) || 0),
        pendingGamerPayouts: round2(parseFloat(String(pendingStats[0]?.total ?? "0")) || 0),
      },
      sessions: rows.map((s) => {
        const escrow   = round2(parseFloat(String(s.escrow_amount ?? "0")) || 0);
        const fee      = round2(parseFloat(String(s.fee_amount    ?? "0")) || 0);
        const bidAmt   = round2(parseFloat(String(s.bid_price     ?? "0")) || 0);
        const gamerAmt = bidAmt > 0 ? bidAmt : round2(escrow - fee);
        return {
          id:                      s.id,
          gameName:                s.game_name,
          platform:                s.platform,
          status:                  s.status,
          escrowAmount:            escrow,
          platformFee:             fee,
          gamerPayout:             gamerAmt,
          hirerRegion:             s.hirer_region ?? "international",
          createdAt:               s.created_at instanceof Date ? (toIso(s.created_at) ?? String(s.created_at)) : String(s.created_at),
          startedAt:               s.started_at ? (s.started_at instanceof Date ? (toIso(s.started_at) ?? String(s.started_at)) : String(s.started_at)) : null,
          pendingWithdrawalId:     s.pending_withdrawal_id   ?? null,
          pendingWithdrawalAmount: round2(parseFloat(String(s.pending_withdrawal_amount ?? "0")) || 0),
          hirer: {
            id:   s.hirer_id   ?? null,
            name: s.hirer_name ?? "Unknown",
            gbId: s.hirer_gb_id ?? null,
          },
          gamer: {
            id:   s.gamer_id   ?? null,
            name: s.gamer_name ?? "Not assigned",
            gbId: s.gamer_gb_id ?? null,
          },
        };
      }),
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
    const MIN_WR_AMOUNT = 100;

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
      .where(gte(withdrawalRequestsTable.amount, Number(MIN_WR_AMOUNT)))
      .orderBy(
        sql`CASE WHEN ${withdrawalRequestsTable.status} = 'pending' THEN 0 ELSE 1 END`,
        desc(withdrawalRequestsTable.createdAt),
      )
      .limit(200);

    res.json({
      generatedAt: new Date().toISOString(),
      minThreshold: MIN_WR_AMOUNT,
      pendingCount: requests.filter((r) => r.status === "pending").length,
      requests: requests.map((r) => ({
        ...r,
        amount: round2(r.amount),
        earningsBalance: round2(r.earningsBalance ?? 0),
        createdAt: toIsoRequired(r.createdAt),
        paidAt: toIso(r.paidAt),
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
    const requestId = parseInt(req.params.id as string, 10);
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
        createdAt: toIsoRequired(u.createdAt),
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
    const userId = parseInt(req.params.id as string, 10);
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

// ── GET /admin/users — full user list with trust stats ────────────────────
router.get(
  "/admin/users",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    try {
      const users = await db
        .select({
          id:            usersTable.id,
          name:          usersTable.name,
          email:         usersTable.email,
          gamerbuddyId:  usersTable.gamerbuddyId,
          idVerified:    usersTable.idVerified,
          isActivated:   usersTable.isActivated,
          trustFactor:   usersTable.trustFactor,
          trustScore:    usersTable.trustScore,
          strikes:       usersTable.strikes,
          flaggedForBan: usersTable.flaggedForBan,
          communityBanned: usersTable.communityBanned,
          profilePhotoUrl: usersTable.profilePhotoUrl,
          bio:           usersTable.bio,
          country:       usersTable.country,
          gender:        usersTable.gender,
          emailVerified: usersTable.emailVerified,
          phoneVerified: usersTable.phoneVerified,
          createdAt:     usersTable.createdAt,
        })
        .from(usersTable)
        .orderBy(desc(usersTable.createdAt));

      // For each user fetch wallet balance + session counts
      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) { res.json({ users: [] }); return; }

      const [wallets, gamerSessions, hirerSessions, gamingAccounts] = await Promise.all([
        db.select({ userId: walletsTable.userId, earningsBalance: walletsTable.earningsBalance, hiringBalance: walletsTable.hiringBalance })
          .from(walletsTable).where(inArray(walletsTable.userId, userIds)),
        db.select({ gamerId: bidsTable.bidderId, cnt: count() })
          .from(bidsTable)
          .innerJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
          .where(and(inArray(bidsTable.bidderId, userIds), eq(bidsTable.status, "accepted"), inArray(gameRequestsTable.status, ["completed", "payment_released"])))
          .groupBy(bidsTable.bidderId),
        db.select({ hirerId: gameRequestsTable.userId, cnt: count() })
          .from(gameRequestsTable)
          .where(and(inArray(gameRequestsTable.userId, userIds), inArray(gameRequestsTable.status, ["completed", "payment_released"])))
          .groupBy(gameRequestsTable.userId),
        db.select({ userId: sql<number>`user_id`, cnt: count() })
          .from(sql`gaming_accounts`)
          .where(sql`user_id = ANY(${userIds})`)
          .groupBy(sql`user_id`),
      ]);

      const walletMap = new Map(wallets.map((w) => [w.userId, w]));
      const gamerMap  = new Map(gamerSessions.map((s) => [s.gamerId, Number(s.cnt)]));
      const hirerMap  = new Map(hirerSessions.map((s) => [s.hirerId, Number(s.cnt)]));
      const gaMap     = new Map(gamingAccounts.map((g) => [Number(g.userId), Number(g.cnt)]));

      const result = users.map((u) => {
        const w = walletMap.get(u.id);
        const hasBio = !!(u.bio?.trim());
        const hasPhoto = !!u.profilePhotoUrl;
        const hasCountry = !!(u.country && u.country !== "any");
        const hasGender = !!(u.gender && u.gender !== "any");
        const hasGaming = (gaMap.get(u.id) ?? 0) > 0;
        const completedFields = [hasPhoto, hasBio, hasGaming, u.emailVerified, u.phoneVerified, hasCountry, hasGender].filter(Boolean).length;
        const profileCompletion = Math.round((completedFields / 7) * 100);

        const tf = u.trustFactor ?? 50;
        const tier = tf >= 76 ? "Gold" : tf >= 51 ? "Blue" : tf >= 26 ? "Yellow" : "Grey";

        return {
          id:              u.id,
          name:            u.name,
          email:           u.email,
          gamerbuddyId:    u.gamerbuddyId,
          idVerified:      u.idVerified,
          isActivated:     u.isActivated,
          trustFactor:     tf,
          trustScore:      u.trustScore ?? 0,
          trustCardTier:   tier,
          strikes:         u.strikes ?? 0,
          flaggedForBan:   u.flaggedForBan ?? false,
          communityBanned: u.communityBanned ?? false,
          profileCompletion,
          earningsBalance: w?.earningsBalance ?? 0,
          hiringBalance:   w?.hiringBalance ?? 0,
          sessionsAsGamer: gamerMap.get(u.id) ?? 0,
          sessionsAsHirer: hirerMap.get(u.id) ?? 0,
          createdAt:       toIsoRequired(u.createdAt),
        };
      });

      res.json({ users: result });
    } catch (err) {
      res.status(500).json({ error: "Failed to load users" });
    }
  },
);

// ── POST /admin/users/:id/strike — issue a strike to a user ───────────────
router.post(
  "/admin/users/:id/strike",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

    const { reason } = req.body as { reason?: string };

    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, strikes: usersTable.strikes, trustFactor: usersTable.trustFactor })
      .from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const newStrikes    = (user.strikes ?? 0) + 1;
    const newTrust      = Math.max(0, (user.trustFactor ?? 50) - 10);
    const flaggedForBan = newStrikes >= 3;

    await db.update(usersTable)
      .set({ strikes: newStrikes, trustFactor: newTrust, flaggedForBan })
      .where(eq(usersTable.id, userId));

    req.log.info({ adminAction: "strike", targetUserId: userId, newStrikes, newTrust, flaggedForBan, reason }, `Strike issued to user ${userId}`);

    res.json({ success: true, userId, name: user.name, strikes: newStrikes, trustFactor: newTrust, flaggedForBan });
  },
);

// ── GET /admin/flagged-reviews — reviews auto-flagged for suspicious activity
router.get(
  "/admin/flagged-reviews",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    try {
      const flagged = await db
        .select({
          id:           reviewsTable.id,
          requestId:    reviewsTable.requestId,
          rating:       reviewsTable.rating,
          comment:      reviewsTable.comment,
          flagReason:   reviewsTable.flagReason,
          flaggedAt:    reviewsTable.flaggedAt,
          createdAt:    reviewsTable.createdAt,
          reviewerId:   reviewsTable.reviewerId,
          revieweeId:   reviewsTable.revieweeId,
          reviewerName: sql<string>`reviewer.name`,
          revieweeName: sql<string>`reviewee.name`,
        })
        .from(reviewsTable)
        .leftJoin(sql`users reviewer`, sql`reviewer.id = ${reviewsTable.reviewerId}`)
        .leftJoin(sql`users reviewee`, sql`reviewee.id = ${reviewsTable.revieweeId}`)
        .where(eq(reviewsTable.isFlagged, true))
        .orderBy(desc(reviewsTable.flaggedAt));

      res.json({ flaggedReviews: flagged.map((r) => ({ ...r, flaggedAt: toIso(r.flaggedAt), createdAt: toIsoRequired(r.createdAt) })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to load flagged reviews" });
    }
  },
);

// ── POST /admin/flagged-reviews/:id/dismiss — clear a flag ────────────────
router.post(
  "/admin/flagged-reviews/:id/dismiss",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.update(reviewsTable).set({ isFlagged: false, flagReason: null, flaggedAt: null }).where(eq(reviewsTable.id, id));
    res.json({ success: true });
  },
);

// ── DELETE /admin/flagged-reviews/:id — delete a fraudulent review ─────────
router.delete(
  "/admin/flagged-reviews/:id",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    res.json({ success: true });
  },
);

// ══════════════════════════════════════════════════════════════════════════════
//  FLAGGED ACCOUNTS — account-level trust & safety actions
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /admin/flagged-accounts ───────────────────────────────────────────
router.get(
  "/admin/flagged-accounts",
  requireAdminAuth,
  async (_req, res): Promise<void> => {
    try {
      const flagged = await db
        .select({
          id:                 usersTable.id,
          name:               usersTable.name,
          email:              usersTable.email,
          gamerbuddyId:       usersTable.gamerbuddyId,
          idVerified:         usersTable.idVerified,
          trustFactor:        usersTable.trustFactor,
          trustScore:         usersTable.trustScore,
          strikes:            usersTable.strikes,
          flaggedForBan:      usersTable.flaggedForBan,
          communityBanned:    usersTable.communityBanned,
          permanentBan:       usersTable.permanentBan,
          accountFlagReason:  usersTable.accountFlagReason,
          accountFlagStatus:  usersTable.accountFlagStatus,
          accountFlaggedAt:   usersTable.accountFlaggedAt,
          disputeText:        usersTable.disputeText,
          disputeSubmittedAt: usersTable.disputeSubmittedAt,
          hasDisputedBefore:  usersTable.hasDisputedBefore,
          emailVerified:      usersTable.emailVerified,
          createdAt:          usersTable.createdAt,
        })
        .from(usersTable)
        .where(inArray(usersTable.accountFlagStatus, ["under_review", "disputed", "resolved"]))
        .orderBy(desc(usersTable.accountFlaggedAt));

      // Enrich each flagged user with session counts + profile completion
      const userIds = flagged.map(u => u.id);
      const [gamerSessions, hirerSessions, gamingAccounts] = userIds.length > 0 ? await Promise.all([
        db.select({ gamerId: bidsTable.bidderId, cnt: count() })
          .from(bidsTable)
          .innerJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
          .where(and(inArray(bidsTable.bidderId, userIds), eq(bidsTable.status, "accepted"), inArray(gameRequestsTable.status, ["completed", "payment_released"])))
          .groupBy(bidsTable.bidderId),
        db.select({ hirerId: gameRequestsTable.userId, cnt: count() })
          .from(gameRequestsTable)
          .where(and(inArray(gameRequestsTable.userId, userIds), inArray(gameRequestsTable.status, ["completed", "payment_released"])))
          .groupBy(gameRequestsTable.userId),
        db.select({ userId: sql<number>`user_id`, cnt: count() })
          .from(sql`gaming_accounts`)
          .where(sql`user_id = ANY(${userIds})`)
          .groupBy(sql`user_id`),
      ]) : [[], [], []];

      const gamerMap = new Map(gamerSessions.map(s => [s.gamerId, Number(s.cnt)]));
      const hirerMap = new Map(hirerSessions.map(s => [s.hirerId, Number(s.cnt)]));
      const gaMap    = new Map(gamingAccounts.map(g => [Number(g.userId), Number(g.cnt)]));

      const result = flagged.map(u => {
        const tf   = u.trustFactor ?? 50;
        const tier = tf >= 76 ? "Gold" : tf >= 51 ? "Blue" : tf >= 26 ? "Yellow" : "Grey";
        const hasGaming   = (gaMap.get(u.id) ?? 0) > 0;
        const completedF  = [!!u.idVerified, hasGaming, u.emailVerified ?? false].filter(Boolean).length;
        return {
          ...u,
          trustCardTier:   tier,
          sessionsAsGamer: gamerMap.get(u.id) ?? 0,
          sessionsAsHirer: hirerMap.get(u.id) ?? 0,
          createdAt:       toIsoRequired(u.createdAt),
          accountFlaggedAt: toIso(u.accountFlaggedAt),
          disputeSubmittedAt: toIso(u.disputeSubmittedAt),
        };
      });

      res.json({ flaggedAccounts: result });
    } catch (err) {
      console.error("flagged-accounts error:", err);
      res.status(500).json({ error: "Failed to load flagged accounts" });
    }
  },
);

// ── POST /admin/users/:id/unflag-account ────────────────────────────────
router.post(
  "/admin/users/:id/unflag-account",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

    const { adminNote } = req.body as { adminNote?: string };

    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, hasDisputedBefore: usersTable.hasDisputedBefore })
      .from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await db.update(usersTable)
      .set({
        accountFlagStatus:  "resolved",
        hasDisputedBefore:  true,   // prevents second dispute on future flags
        flaggedForBan:      false,
      })
      .where(eq(usersTable.id, userId));

    // Notify user of the positive outcome
    void createNotification({
      userId,
      type:    "dispute_resolved",
      title:   "Account Flag Cleared ✓",
      message: adminNote?.trim()
        ? `Good news — your account flag has been reviewed and cleared by our admin team. Note: ${adminNote.trim()}`
        : "Good news — your account flag has been reviewed and cleared by our admin team. Thank you for your patience.",
      link: "/profile/settings",
    });

    req.log.info({ adminAction: "unflag-account", targetUserId: userId }, `Account ${userId} unflagged`);
    res.json({ success: true, userId, name: user.name });
  },
);

// ── POST /admin/users/:id/permanent-ban ──────────────────────────────────
router.post(
  "/admin/users/:id/permanent-ban",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

    const { reason } = req.body as { reason?: string };

    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, strikes: usersTable.strikes })
      .from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await db.update(usersTable)
      .set({
        permanentBan:      true,
        communityBanned:   true,
        flaggedForBan:     true,
        accountFlagStatus: "resolved",
        strikes:           Math.max(user.strikes ?? 0, 3),
      })
      .where(eq(usersTable.id, userId));

    // Notify the banned user
    void createNotification({
      userId,
      type:    "account_flagged",
      title:   "Account Permanently Banned",
      message: reason?.trim()
        ? `Your Player4Hire account has been permanently banned. Reason: ${reason.trim()}. If you believe this is an error, please contact support.`
        : "Your Player4Hire account has been permanently banned due to repeated Trust & Safety violations. Contact support if you believe this is an error.",
      link: "/",
    });

    req.log.info({ adminAction: "permanent-ban", targetUserId: userId, reason }, `User ${userId} permanently banned`);
    res.json({ success: true, userId, name: user.name });
  },
);

// ── POST /admin/flagged-accounts/:userId/resolve-dispute ─────────────────
// Admin reads a dispute and decides to approve (unflag) or confirm the flag
router.post(
  "/admin/flagged-accounts/:userId/resolve-dispute",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const userId = parseInt(req.params.userId as string, 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

    const { approve, adminNote } = req.body as { approve?: boolean; adminNote?: string };
    if (typeof approve !== "boolean") {
      res.status(400).json({ error: "Body must contain { approve: true | false }" });
      return;
    }

    const [user] = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (approve) {
      // Dispute approved — clear the flag
      await db.update(usersTable)
        .set({ accountFlagStatus: "resolved", flaggedForBan: false, hasDisputedBefore: true })
        .where(eq(usersTable.id, userId));

      void createNotification({
        userId,
        type:    "dispute_resolved",
        title:   "Dispute Approved — Account Cleared ✓",
        message: adminNote?.trim()
          ? `Your dispute was reviewed and approved. Your account flag has been removed. Admin note: ${adminNote.trim()}`
          : "Your dispute was reviewed and approved. Your account flag has been removed. Thank you for your patience.",
        link: "/profile/settings",
      });
    } else {
      // Dispute rejected — flag stays; mark hasDisputedBefore so no further disputes
      await db.update(usersTable)
        .set({ accountFlagStatus: "under_review", hasDisputedBefore: true })
        .where(eq(usersTable.id, userId));

      void createNotification({
        userId,
        type:    "dispute_resolved",
        title:   "Dispute Reviewed — Flag Maintained",
        message: adminNote?.trim()
          ? `Your dispute was reviewed. After investigation, the account flag has been maintained. Admin note: ${adminNote.trim()}. You may contact support to appeal further.`
          : "Your dispute was reviewed. After investigation, the account flag has been maintained. Contact support if you wish to appeal further.",
        link: "/profile/settings",
      });
    }

    req.log.info({ adminAction: "resolve-dispute", targetUserId: userId, approve, adminNote }, `Dispute for user ${userId} ${approve ? "approved" : "rejected"}`);
    res.json({ success: true, userId, name: user.name, approved: approve });
  },
);

export default router;
