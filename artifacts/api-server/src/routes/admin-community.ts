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
  moderatorActionsTable,
} from "@workspace/db";
import { eq, sql, ilike, or, desc, and, gte } from "drizzle-orm";
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
      isPinned:      suggestionsTable.isPinned,
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
    .orderBy(desc(suggestionsTable.isPinned), desc(suggestionsTable.createdAt));

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

/* ── POST /admin/community/posts/:id/pin — toggle pin on a post (max 5 pinned) */
router.post("/admin/community/posts/:id/pin", requireAdminAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db
    .select({ id: suggestionsTable.id, isPinned: suggestionsTable.isPinned })
    .from(suggestionsTable)
    .where(eq(suggestionsTable.id, id));

  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }

  const newPinned = !existing.isPinned;

  // Enforce max 5 pinned posts at a time
  if (newPinned) {
    const pinnedCount = await db
      .select({ cnt: sql<number>`cast(count(*) as int)` })
      .from(suggestionsTable)
      .where(eq(suggestionsTable.isPinned, true));
    if ((pinnedCount[0]?.cnt ?? 0) >= 5) {
      res.status(400).json({ error: "Maximum 5 posts can be pinned at once. Unpin one first." });
      return;
    }
  }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ isPinned: newPinned })
    .where(eq(suggestionsTable.id, id))
    .returning({ id: suggestionsTable.id, isPinned: suggestionsTable.isPinned });

  req.log?.info({ action: newPinned ? "admin_pin_post" : "admin_unpin_post", postId: id }, "Admin toggled post pin");
  res.json({ success: true, id: updated.id, isPinned: updated.isPinned });
});

/* ── POST /admin/community/suggestions/:id/comment — admin posts a comment */
router.post("/admin/community/suggestions/:id/comment", requireAdminAuth, async (req, res): Promise<void> => {
  const suggestionId = parseInt(req.params.id, 10);
  if (isNaN(suggestionId)) { res.status(400).json({ error: "Invalid suggestion ID" }); return; }

  const body = (req.body?.body as string | undefined)?.trim();
  if (!body) { res.status(400).json({ error: "Comment body is required" }); return; }

  const [suggestion] = await db.select({ id: suggestionsTable.id }).from(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  if (!suggestion) { res.status(404).json({ error: "Post not found" }); return; }

  // Look up the admin user by email, fall back to user ID 1 if not registered yet
  let [adminUser] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.email, "gamerbuddyhq@gmail.com"));

  if (!adminUser) {
    // Fall back to the earliest registered user as the "system" author
    [adminUser] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .orderBy(usersTable.id)
      .limit(1);
  }

  if (!adminUser) { res.status(500).json({ error: "No users exist yet — cannot post comment" }); return; }

  const [comment] = await db
    .insert(suggestionCommentsTable)
    .values({
      suggestionId,
      userId: adminUser.id,
      parentId: null,
      body,
      isAdminComment: true,
      isPinned: false,
    })
    .returning();

  req.log?.info({ action: "admin_comment", suggestionId }, "Admin posted a comment");
  res.status(201).json({ ...comment, authorName: "Gamerbuddy Team", authorCountry: null, replies: [] });
});

/* ── POST /admin/community/comments/:commentId/pin — toggle pin ────────── */
router.post("/admin/community/comments/:commentId/pin", requireAdminAuth, async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment ID" }); return; }

  const [existing] = await db
    .select({ id: suggestionCommentsTable.id, isPinned: suggestionCommentsTable.isPinned })
    .from(suggestionCommentsTable)
    .where(eq(suggestionCommentsTable.id, commentId));

  if (!existing) { res.status(404).json({ error: "Comment not found" }); return; }

  const newPinned = !existing.isPinned;
  const [updated] = await db
    .update(suggestionCommentsTable)
    .set({ isPinned: newPinned })
    .where(eq(suggestionCommentsTable.id, commentId))
    .returning({ id: suggestionCommentsTable.id, isPinned: suggestionCommentsTable.isPinned });

  req.log?.info({ action: newPinned ? "admin_pin_comment" : "admin_unpin_comment", commentId }, "Admin toggled comment pin");
  res.json({ success: true, id: updated.id, isPinned: updated.isPinned });
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

/* ── GET /admin/community/moderators — list all moderators ─────────────── */
router.get("/admin/community/moderators", requireAdminAuth, async (req, res): Promise<void> => {
  const mods = await db
    .select({
      id:                   usersTable.id,
      name:                 usersTable.name,
      email:                usersTable.email,
      gamerbuddyId:         usersTable.gamerbuddyId,
      profilePhotoUrl:      usersTable.profilePhotoUrl,
      moderatorAppointedAt: usersTable.moderatorAppointedAt,
      createdAt:            usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.isModerator, true))
    .orderBy(usersTable.moderatorAppointedAt);
  res.json(mods);
});

/* ── GET /admin/community/users/search?q= — search users ──────────────── */
router.get("/admin/community/users/search", requireAdminAuth, async (req, res): Promise<void> => {
  const q = ((req.query.q as string | undefined) ?? "").trim();
  if (!q || q.length < 2) { res.json([]); return; }

  const users = await db
    .select({
      id:           usersTable.id,
      name:         usersTable.name,
      email:        usersTable.email,
      gamerbuddyId: usersTable.gamerbuddyId,
      isModerator:  usersTable.isModerator,
    })
    .from(usersTable)
    .where(
      or(
        ilike(usersTable.name, `%${q}%`),
        ilike(usersTable.gamerbuddyId, `%${q}%`),
        ilike(usersTable.email, `%${q}%`),
      )
    )
    .limit(10);

  res.json(users);
});

/* ── POST /admin/community/moderators/:userId — appoint ────────────────── */
router.post("/admin/community/moderators/:userId", requireAdminAuth, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.email === "gamerbuddyhq@gmail.com") {
    res.status(400).json({ error: "Cannot modify the main admin account" }); return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isModerator: true, moderatorAppointedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, isModerator: usersTable.isModerator });

  req.log?.info({ action: "admin_appoint_moderator", targetUserId: userId }, `${user.name} appointed as moderator`);
  res.json({ success: true, user: updated });
});

/* ── DELETE /admin/community/moderators/:userId — remove ───────────────── */
router.delete("/admin/community/moderators/:userId", requireAdminAuth, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ isModerator: false })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, name: usersTable.name, isModerator: usersTable.isModerator });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  req.log?.info({ action: "admin_remove_moderator", targetUserId: userId }, "Moderator removed");
  res.json({ success: true, user: updated });
});

/* ── GET /admin/community/moderators/actions — action log ──────────────── */
router.get("/admin/community/moderators/actions", requireAdminAuth, async (req, res): Promise<void> => {
  const period = (req.query.period as string | undefined) ?? "all";
  const search = ((req.query.search as string | undefined) ?? "").trim().toLowerCase();

  const now = new Date();
  let since: Date | null = null;
  if (period === "today") {
    since = new Date(now); since.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    since = new Date(now); since.setDate(since.getDate() - 7);
  } else if (period === "month") {
    since = new Date(now); since.setDate(since.getDate() - 30);
  }

  const conditions = since
    ? and(gte(moderatorActionsTable.createdAt, since))
    : undefined;

  const rows = await db
    .select({
      id:          moderatorActionsTable.id,
      action:      moderatorActionsTable.action,
      targetType:  moderatorActionsTable.targetType,
      targetId:    moderatorActionsTable.targetId,
      meta:        moderatorActionsTable.meta,
      createdAt:   moderatorActionsTable.createdAt,
      moderatorId: moderatorActionsTable.moderatorId,
      modName:     usersTable.name,
      modGbId:     usersTable.gamerbuddyId,
    })
    .from(moderatorActionsTable)
    .leftJoin(usersTable, eq(moderatorActionsTable.moderatorId, usersTable.id))
    .where(conditions)
    .orderBy(desc(moderatorActionsTable.createdAt))
    .limit(500);

  const filtered = search
    ? rows.filter(r =>
        (r.modName ?? "").toLowerCase().includes(search) ||
        (r.modGbId ?? "").toLowerCase().includes(search) ||
        r.action.toLowerCase().includes(search)
      )
    : rows;

  res.json(filtered);
});

export default router;
