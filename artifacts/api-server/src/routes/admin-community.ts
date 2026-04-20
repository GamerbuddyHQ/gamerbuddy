/**
 * Admin Community Moderation Routes
 * All routes require the admin cookie session (requireAdminAuth).
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  suggestionsTable,
  suggestionVotesTable,
  suggestionCommentsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, ilike, or, desc } from "drizzle-orm";
import { requireAdminAuth } from "./admin-auth";

const router = Router();

/* ── GET /admin/community/posts
   Returns all posts (any status) with author info, votes, comment count.
   Optional query params: ?search=keyword&author=name
──────────────────────────────────────────────────────────────────────── */
router.get("/admin/community/posts", requireAdminAuth, async (req, res): Promise<void> => {
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const authorFilter = (req.query.author as string | undefined)?.trim() ?? "";

  const rows = await db
    .select({
      id:            suggestionsTable.id,
      title:         suggestionsTable.title,
      body:          suggestionsTable.body,
      status:        suggestionsTable.status,
      category:      suggestionsTable.category,
      createdAt:     suggestionsTable.createdAt,
      userId:        suggestionsTable.userId,
      authorName:    usersTable.name,
      authorEmail:   usersTable.email,
      gamerbuddyId:  usersTable.gamerbuddyId,
      communityBanned: usersTable.communityBanned,
      likes:    sql<number>`cast(count(case when ${suggestionVotesTable.vote} = 'up'   then 1 end) as int)`,
      dislikes: sql<number>`cast(count(case when ${suggestionVotesTable.vote} = 'down' then 1 end) as int)`,
    })
    .from(suggestionsTable)
    .leftJoin(usersTable,          eq(suggestionsTable.userId,     usersTable.id))
    .leftJoin(suggestionVotesTable, eq(suggestionVotesTable.suggestionId, suggestionsTable.id))
    .groupBy(
      suggestionsTable.id,
      usersTable.name,
      usersTable.email,
      usersTable.gamerbuddyId,
      usersTable.communityBanned,
    )
    .orderBy(desc(suggestionsTable.createdAt));

  // Comment counts
  const commentCounts = await db
    .select({
      suggestionId: suggestionCommentsTable.suggestionId,
      cnt: sql<number>`cast(count(*) as int)`,
    })
    .from(suggestionCommentsTable)
    .groupBy(suggestionCommentsTable.suggestionId);

  const commentMap = new Map(commentCounts.map((r) => [r.suggestionId, r.cnt]));

  let enriched = rows.map((r) => ({
    ...r,
    commentCount: commentMap.get(r.id) ?? 0,
  }));

  // Apply filters in JS (simple, works for small-medium datasets)
  if (search) {
    const lower = search.toLowerCase();
    enriched = enriched.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) ||
        r.body.toLowerCase().includes(lower)
    );
  }
  if (authorFilter) {
    const lower = authorFilter.toLowerCase();
    enriched = enriched.filter(
      (r) =>
        (r.authorName ?? "").toLowerCase().includes(lower) ||
        (r.authorEmail ?? "").toLowerCase().includes(lower) ||
        (r.gamerbuddyId ?? "").toLowerCase().includes(lower)
    );
  }

  res.json({ total: enriched.length, posts: enriched });
});

/* ── POST /admin/community/posts/:id/hide   — set status = 'hidden' ────── */
router.post("/admin/community/posts/:id/hide", requireAdminAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ status: "hidden" })
    .where(eq(suggestionsTable.id, id))
    .returning({ id: suggestionsTable.id, status: suggestionsTable.status });

  if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
  req.log?.info({ action: "admin_hide_post", postId: id }, "Post hidden by admin");
  res.json({ success: true, id: updated.id, status: updated.status });
});

/* ── POST /admin/community/posts/:id/restore — set status = 'visible' ─── */
router.post("/admin/community/posts/:id/restore", requireAdminAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ status: "visible" })
    .where(eq(suggestionsTable.id, id))
    .returning({ id: suggestionsTable.id, status: suggestionsTable.status });

  if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
  req.log?.info({ action: "admin_restore_post", postId: id }, "Post restored by admin");
  res.json({ success: true, id: updated.id, status: updated.status });
});

/* ── DELETE /admin/community/posts/:id — permanent delete ──────────────── */
router.delete("/admin/community/posts/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [post] = await db.select({ id: suggestionsTable.id }).from(suggestionsTable).where(eq(suggestionsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  await db.delete(suggestionsTable).where(eq(suggestionsTable.id, id));
  req.log?.info({ action: "admin_delete_post", postId: id }, "Post permanently deleted by admin");
  res.json({ success: true });
});

/* ── POST /admin/community/users/:id/ban — set communityBanned = true ─── */
router.post("/admin/community/users/:id/ban", requireAdminAuth, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ communityBanned: true })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, communityBanned: usersTable.communityBanned });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  req.log?.info({ action: "admin_community_ban", targetUserId: userId }, "User banned from community by admin");
  res.json({ success: true, user: updated });
});

/* ── POST /admin/community/users/:id/unban — set communityBanned = false ─ */
router.post("/admin/community/users/:id/unban", requireAdminAuth, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ communityBanned: false })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, communityBanned: usersTable.communityBanned });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  req.log?.info({ action: "admin_community_unban", targetUserId: userId }, "User unbanned from community by admin");
  res.json({ success: true, user: updated });
});

export default router;
