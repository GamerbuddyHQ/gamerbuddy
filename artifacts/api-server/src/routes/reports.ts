import { Router, type IRouter } from "express";
import { db, reportsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const VALID_REASONS = [
  "Off-platform payment request",
  "Toxicity / harassment",
  "Account sharing / fraud",
  "No-show / abandoned session",
  "Inappropriate content",
  "Other",
];

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { reportedUserId, reason, description } = req.body as {
    reportedUserId?: number;
    reason?: string;
    description?: string;
  };

  if (!reportedUserId || typeof reportedUserId !== "number") {
    res.status(400).json({ error: "reportedUserId is required" });
    return;
  }

  if (reportedUserId === user.id) {
    res.status(400).json({ error: "You cannot report yourself" });
    return;
  }

  if (!reason || !VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason", validReasons: VALID_REASONS });
    return;
  }

  const [reported] = await db.select().from(usersTable).where(eq(usersTable.id, reportedUserId));
  if (!reported) { res.status(404).json({ error: "User not found" }); return; }

  const [report] = await db.insert(reportsTable).values({
    reporterId: user.id,
    reportedUserId,
    reason,
    description: description?.trim() || null,
  }).returning();

  req.log.info({ reporterId: user.id, reportedUserId, reason }, "User reported");
  res.status(201).json({ success: true, reportId: report.id });
});

export { VALID_REASONS };
export default router;
