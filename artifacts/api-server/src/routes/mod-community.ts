/**
 * Moderator Community Routes
 * Accessible by users with isModerator=true OR the main admin cookie.
 * Moderators can: hide/restore/delete posts, pin/unpin, ban/unban authors, post Mod comments.
 * All moderator actions (except admin acting through this route) are logged.
 */

import { Router, type RequestHandler } from "express";
import { db } from "@workspace/db";
import {
  suggestionsTable,
  suggestionCommentsTable,
  usersTable,
  sessionsTable,
  moderatorActionsTable,
} from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { verifyAdminToken } from "./admin-auth";

const router = Router();

/* ── Moderator + Admin auth middleware ─────────────────────────────────── */
export const requireModOrAdmin: RequestHandler = async (req, res, next) => {
  // 1. Admin cookie grants all mod powers
  const adminToken = (req.cookies as Record<string, string>)?.admin_token;
  if (adminToken && verifyAdminToken(adminToken)) {
    (req as any).modUserId = null;
    (req as any).isAdmin   = true;
    next();
    return;
  }

  // 2. Regular user session with isModerator flag
  const sessionToken = (req.cookies as Record<string, string>)?.session_token;
  if (!sessionToken) {
    res.status(401).json({ error: "Moderator authentication required" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, sessionToken), gt(sessionsTable.expiresAt, new Date())));

  if (!session) { res.status(401).json({ error: "Session expired or invalid" }); return; }

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, isModerator: usersTable.isModerator })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (!user || !user.isModerator) {
    res.status(403).json({ error: "Moderator access required" });
    return;
  }

  (req as any).modUserId = user.id;
  (req as any).modName   = user.name;
  (req as any).isAdmin   = false;
  next();
};

/* ── Helper: log a moderator action ────────────────────────────────────── */
async function logMod(
  modId: number,
  action: string,
  targetType: string,
  targetId: number,
  meta?: Record<string, unknown>,
) {
  await db.insert(moderatorActionsTable).values({
    moderatorId: modId,
    action,
    targetType,
    targetId,
    meta: meta ?? null,
  });
}

/* ── GET /mod/auth/me ───────────────────────────────────────────────────── */
router.get("/mod/auth/me", async (req, res): Promise<void> => {
  const adminToken = (req.cookies as Record<string, string>)?.admin_token;
  if (adminToken && verifyAdminToken(adminToken)) {
    res.json({ isModerator: true, isAdmin: true, name: "Gamerbuddy Team" });
    return;
  }

  const sessionToken = (req.cookies as Record<string, string>)?.session_token;
  if (!sessionToken) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, sessionToken), gt(sessionsTable.expiresAt, new Date())));

  if (!session) { res.status(401).json({ error: "Session expired" }); return; }

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, isModerator: usersTable.isModerator, gamerbuddyId: usersTable.gamerbuddyId })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (!user || !user.isModerator) {
    res.status(403).json({ error: "Not a moderator" }); return;
  }

  res.json({ isModerator: true, isAdmin: false, name: user.name, userId: user.id, gamerbuddyId: user.gamerbuddyId });
});

/* ── POST /mod/community/posts/:id/hide ────────────────────────────────── */
router.post("/mod/community/posts/:id/hide", requireModOrAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ status: "hidden" })
    .where(eq(suggestionsTable.id, id))
    .returning({ id: suggestionsTable.id, status: suggestionsTable.status });

  if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
  const modId = (req as any).modUserId as number | null;
  if (!((req as any).isAdmin) && modId) await logMod(modId, "hide_post", "post", id);
  res.json({ success: true, id: updated.id, status: updated.status });
});

/* ── POST /mod/community/posts/:id/restore ──────────────────────────────── */
router.post("/mod/community/posts/:id/restore", requireModOrAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ status: "visible" })
    .where(eq(suggestionsTable.id, id))
    .returning({ id: suggestionsTable.id, status: suggestionsTable.status });

  if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
  const modId = (req as any).modUserId as number | null;
  if (!((req as any).isAdmin) && modId) await logMod(modId, "restore_post", "post", id);
  res.json({ success: true, id: updated.id, status: updated.status });
});

/* ── DELETE /mod/community/posts/:id — permanent delete ────────────────── */
router.delete("/mod/community/posts/:id", requireModOrAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [post] = await db.select({ id: suggestionsTable.id }).from(suggestionsTable).where(eq(suggestionsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  await db.delete(suggestionsTable).where(eq(suggestionsTable.id, id));
  const modId = (req as any).modUserId as number | null;
  if (!((req as any).isAdmin) && modId) await logMod(modId, "delete_post", "post", id);
  res.json({ success: true });
});

/* ── POST /mod/community/posts/:id/pin — toggle pin (max 5) ────────────── */
router.post("/mod/community/posts/:id/pin", requireModOrAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db
    .select({ id: suggestionsTable.id, isPinned: suggestionsTable.isPinned })
    .from(suggestionsTable)
    .where(eq(suggestionsTable.id, id));

  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }

  const newPinned = !existing.isPinned;
  if (newPinned) {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`cast(count(*) as int)` })
      .from(suggestionsTable)
      .where(eq(suggestionsTable.isPinned, true));
    if (cnt >= 5) {
      res.status(400).json({ error: "Maximum 5 posts can be pinned at once. Unpin one first." });
      return;
    }
  }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ isPinned: newPinned })
    .where(eq(suggestionsTable.id, id))
    .returning({ id: suggestionsTable.id, isPinned: suggestionsTable.isPinned });

  const modId = (req as any).modUserId as number | null;
  if (!((req as any).isAdmin) && modId) await logMod(modId, newPinned ? "pin_post" : "unpin_post", "post", id);
  res.json({ success: true, id: updated.id, isPinned: updated.isPinned });
});

/* ── POST /mod/community/suggestions/:id/comment — post a Mod comment ──── */
router.post("/mod/community/suggestions/:id/comment", requireModOrAdmin, async (req, res): Promise<void> => {
  const suggestionId = parseInt(req.params.id as string, 10);
  if (isNaN(suggestionId)) { res.status(400).json({ error: "Invalid suggestion ID" }); return; }

  const body = (req.body?.body as string | undefined)?.trim();
  if (!body) { res.status(400).json({ error: "Comment body is required" }); return; }

  const [suggestion] = await db.select({ id: suggestionsTable.id }).from(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  if (!suggestion) { res.status(404).json({ error: "Post not found" }); return; }

  const modId   = (req as any).modUserId as number | null;
  const modName = (req as any).modName  as string | undefined;
  const isAdmin = (req as any).isAdmin  as boolean;

  // Resolve author: admin uses id=1, moderator uses their own id
  let authorId = modId;
  if (isAdmin || !modId) {
    const [adminUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "gamerbuddyhq@gmail.com"));
    authorId = adminUser?.id ?? 1;
  }

  const [comment] = await db
    .insert(suggestionCommentsTable)
    .values({
      suggestionId,
      userId:         authorId!,
      parentId:       null,
      body,
      isAdminComment: isAdmin,
      isModComment:   !isAdmin,
      isPinned:       false,
    })
    .returning();

  if (!isAdmin && modId) await logMod(modId, "mod_comment", "post", suggestionId, { commentId: comment.id });

  const authorLabel = isAdmin ? "Gamerbuddy Team" : (modName ?? "Moderator");
  res.status(201).json({ ...comment, authorName: authorLabel, authorCountry: null, replies: [] });
});

/* ── POST /mod/community/users/:userId/ban ──────────────────────────────── */
router.post("/mod/community/users/:userId/ban", requireModOrAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ communityBanned: true })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, communityBanned: usersTable.communityBanned });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  const modId = (req as any).modUserId as number | null;
  if (!((req as any).isAdmin) && modId) await logMod(modId, "ban_user", "user", userId);
  res.json({ success: true, user: updated });
});

/* ── POST /mod/community/users/:userId/unban ────────────────────────────── */
router.post("/mod/community/users/:userId/unban", requireModOrAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ communityBanned: false })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, communityBanned: usersTable.communityBanned });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  const modId = (req as any).modUserId as number | null;
  if (!((req as any).isAdmin) && modId) await logMod(modId, "unban_user", "user", userId);
  res.json({ success: true, user: updated });
});

export default router;
