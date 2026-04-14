/**
 * Admin-only routes — all endpoints require the requesting user to be the
 * platform owner (userId === 1). Any other authenticated user gets a 403.
 */

import { Router, type IRouter, type RequestHandler } from "express";
import { db, usersTable, walletTransactionsTable, reportsTable } from "@workspace/db";
import { eq, desc, gt, or, isNotNull, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── requireAdmin — must come after requireAuth ────────────────────────────
const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.id !== 1) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

// ── GET /admin/security ───────────────────────────────────────────────────
// Returns three sections in one request to minimize round-trips:
//   • loginAttempts  — users with any failed login history or current lock
//   • suspicious     — large transactions + filed reports
//   • transactions   — most recent 100 wallet movements across all users
router.get(
  "/admin/security",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const now = new Date();

    const [loginAttempts, largeTransactions, reports, recentTransactions] =
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

    res.json({
      generatedAt: now.toISOString(),
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
  requireAuth,
  requireAdmin,
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

    req.log.info({ adminId: req.user!.id, targetUserId: userId }, "Admin cleared account lockout");
    res.json({ success: true });
  },
);

export default router;
