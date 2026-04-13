import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(60);

  res.json(rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));

  res.json({ count: rows.length });
});

router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));

  res.json({ success: true });
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));

  res.json({ success: true });
});

router.delete("/notifications/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));

  res.json({ success: true });
});

export default router;
