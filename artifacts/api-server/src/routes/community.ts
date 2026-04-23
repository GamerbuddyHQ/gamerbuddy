import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suggestionsTable,
  suggestionVotesTable,
  suggestionCommentsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { requireAuth, loadUser } from "../middlewares/auth";
import { validate, sanitizeComment, sanitizeSuggestionText, PostSuggestionSchema, PostCommentSchema } from "../lib/validate";
import { suggestionLimiter, commentLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

const LINK_STRIP_RE = /(?:https?:\/\/\S+|www\.\S+|\b\S+\.(?:com|net|org|io|co|app|gg|tv|me|ly|link|xyz|info|gov|edu)(?:\/\S*)?)/gi;

function stripLinks(text: string): string {
  return text.replace(LINK_STRIP_RE, "").replace(/ {2,}/g, " ").trim();
}

/* Admin detection — first registered user (id=1) is the platform owner */
function isAdmin(user: { id: number; email: string }): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "admin@gamerbuddy.com").split(",").map((e) => e.trim().toLowerCase());
  return user.id === 1 || adminEmails.includes(user.email.toLowerCase());
}

const VALID_STATUSES = ["visible", "hidden", "spam"] as const;
type SuggestionStatus = (typeof VALID_STATUSES)[number];

/* ──────────────────────────────────────────────────────────────
   GET /community/suggestions?sort=newest|liked|discussed
   Admins see all; normal users only see 'visible'
────────────────────────────────────────────────────────────── */
router.get("/community/suggestions", loadUser, async (req, res): Promise<void> => {
  const sort = (req.query.sort as string) ?? "newest";
  const currentUser = req.user ?? null;
  const adminMode = currentUser ? isAdmin(currentUser) : false;

  const rows = await db
    .select({
      id: suggestionsTable.id,
      title: suggestionsTable.title,
      body: suggestionsTable.body,
      status: suggestionsTable.status,
      category: suggestionsTable.category,
      isPinned: suggestionsTable.isPinned,
      createdAt: suggestionsTable.createdAt,
      userId: suggestionsTable.userId,
      authorName: usersTable.name,
      authorCountry: usersTable.country,
      likes: sql<number>`cast(count(case when ${suggestionVotesTable.vote} = 'up' then 1 end) as int)`,
      dislikes: sql<number>`cast(count(case when ${suggestionVotesTable.vote} = 'down' then 1 end) as int)`,
    })
    .from(suggestionsTable)
    .leftJoin(usersTable, eq(suggestionsTable.userId, usersTable.id))
    .leftJoin(suggestionVotesTable, eq(suggestionVotesTable.suggestionId, suggestionsTable.id))
    .groupBy(suggestionsTable.id, usersTable.name, usersTable.country);

  const commentCounts = await db
    .select({
      suggestionId: suggestionCommentsTable.suggestionId,
      cnt: sql<number>`cast(count(*) as int)`,
    })
    .from(suggestionCommentsTable)
    .groupBy(suggestionCommentsTable.suggestionId);

  const commentMap = new Map(commentCounts.map((r) => [r.suggestionId, r.cnt]));

  let myVotes: Map<number, string> = new Map();
  if (currentUser) {
    const votes = await db
      .select()
      .from(suggestionVotesTable)
      .where(eq(suggestionVotesTable.userId, currentUser.id));
    myVotes = new Map(votes.map((v) => [v.suggestionId, v.vote]));
  }

  const enriched = rows
    .filter((r) => adminMode || r.status === "visible")
    .map((r) => ({
      ...r,
      commentCount: commentMap.get(r.id) ?? 0,
      myVote: myVotes.get(r.id) ?? null,
    }));

  if (sort === "liked") {
    enriched.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sort === "discussed") {
    enriched.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.commentCount - a.commentCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    enriched.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  res.json(enriched);
});

/* ──────────────────────────────────────────────────────────────
   POST /community/suggestions
────────────────────────────────────────────────────────────── */
router.post("/community/suggestions", requireAuth, suggestionLimiter, validate(PostSuggestionSchema), async (req, res): Promise<void> => {
  const user = req.user!;

  // Check if user is banned from community posting
  if ((user as { communityBanned?: boolean }).communityBanned) {
    res.status(403).json({ error: "You have been banned from posting in the community." });
    return;
  }

  const { title, body, category } = req.body as { title: string; body: string; category: string };

  const cleanTitle = sanitizeSuggestionText(title);
  const cleanBody  = sanitizeSuggestionText(body);

  if (!cleanTitle) { res.status(400).json({ error: "Title cannot be empty after sanitization" }); return; }
  if (!cleanBody)  { res.status(400).json({ error: "Body cannot be empty after sanitization" });  return; }

  const [suggestion] = await db
    .insert(suggestionsTable)
    .values({ userId: user.id, title: cleanTitle, body: cleanBody, status: "visible", category })
    .returning();

  res.status(201).json({ ...suggestion, authorName: user.name, likes: 0, dislikes: 0, commentCount: 0, myVote: null });
});

/* ──────────────────────────────────────────────────────────────
   PATCH /community/suggestions/:id/moderate   (admin only)
   Body: { action: 'approve' | 'hide' | 'spam' }
────────────────────────────────────────────────────────────── */
router.patch("/community/suggestions/:id/moderate", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isAdmin(user)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const suggestionId = parseInt(req.params.id as string, 10);
  if (isNaN(suggestionId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { action } = req.body as { action?: string };
  const statusMap: Record<string, SuggestionStatus> = {
    approve: "visible",
    hide:    "hidden",
    spam:    "spam",
  };

  if (!action || !statusMap[action]) {
    res.status(400).json({ error: "action must be 'approve', 'hide', or 'spam'" });
    return;
  }

  const [suggestion] = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  if (!suggestion) { res.status(404).json({ error: "Suggestion not found" }); return; }

  const [updated] = await db
    .update(suggestionsTable)
    .set({ status: statusMap[action] })
    .where(eq(suggestionsTable.id, suggestionId))
    .returning();

  res.json({ success: true, status: updated.status });
});

/* ──────────────────────────────────────────────────────────────
   DELETE /community/suggestions/:id   (admin only)
────────────────────────────────────────────────────────────── */
router.delete("/community/suggestions/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (!isAdmin(user)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const suggestionId = parseInt(req.params.id as string, 10);
  if (isNaN(suggestionId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [suggestion] = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  if (!suggestion) { res.status(404).json({ error: "Suggestion not found" }); return; }

  await db.delete(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  res.json({ success: true });
});

/* ──────────────────────────────────────────────────────────────
   POST /community/suggestions/:id/vote  { vote: 'up'|'down' }
────────────────────────────────────────────────────────────── */
router.post("/community/suggestions/:id/vote", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const suggestionId = parseInt(req.params.id as string, 10);
  const { vote } = req.body as { vote?: string };

  if (!vote || !["up", "down"].includes(vote)) {
    res.status(400).json({ error: "vote must be 'up' or 'down'" });
    return;
  }

  const [suggestion] = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  if (!suggestion) { res.status(404).json({ error: "Suggestion not found" }); return; }

  const [existing] = await db
    .select()
    .from(suggestionVotesTable)
    .where(and(eq(suggestionVotesTable.suggestionId, suggestionId), eq(suggestionVotesTable.userId, user.id)));

  if (existing) {
    if (existing.vote === vote) {
      await db.delete(suggestionVotesTable).where(eq(suggestionVotesTable.id, existing.id));
      res.json({ myVote: null });
    } else {
      await db.update(suggestionVotesTable).set({ vote }).where(eq(suggestionVotesTable.id, existing.id));
      res.json({ myVote: vote });
    }
  } else {
    await db.insert(suggestionVotesTable).values({ suggestionId, userId: user.id, vote });
    res.json({ myVote: vote });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /community/suggestions/:id/comments
────────────────────────────────────────────────────────────── */
router.get("/community/suggestions/:id/comments", async (req, res): Promise<void> => {
  const suggestionId = parseInt(req.params.id as string, 10);

  const rows = await db
    .select({
      id: suggestionCommentsTable.id,
      suggestionId: suggestionCommentsTable.suggestionId,
      userId: suggestionCommentsTable.userId,
      parentId: suggestionCommentsTable.parentId,
      body: suggestionCommentsTable.body,
      isAdminComment: suggestionCommentsTable.isAdminComment,
      isModComment:   suggestionCommentsTable.isModComment,
      isPinned: suggestionCommentsTable.isPinned,
      createdAt: suggestionCommentsTable.createdAt,
      authorName: usersTable.name,
      authorCountry: usersTable.country,
    })
    .from(suggestionCommentsTable)
    .leftJoin(usersTable, eq(suggestionCommentsTable.userId, usersTable.id))
    .where(eq(suggestionCommentsTable.suggestionId, suggestionId))
    .orderBy(suggestionCommentsTable.createdAt);

  const topLevel = rows.filter((r) => !r.parentId);
  const replies = rows.filter((r) => !!r.parentId);

  // Pinned comments first, then chronological
  topLevel.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const threaded = topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parentId === c.id),
  }));

  res.json(threaded);
});

/* ──────────────────────────────────────────────────────────────
   POST /community/suggestions/:id/comments  { body, parentId? }
────────────────────────────────────────────────────────────── */
router.post("/community/suggestions/:id/comments", requireAuth, commentLimiter, validate(PostCommentSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const suggestionId = parseInt(req.params.id as string, 10);
  const { body, parentId } = req.body as { body: string; parentId?: number | null };

  const cleanBody = sanitizeComment(body);
  if (!cleanBody) { res.status(400).json({ error: "Comment body cannot be empty after sanitization" }); return; }

  const [suggestion] = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));
  if (!suggestion) { res.status(404).json({ error: "Suggestion not found" }); return; }

  if (parentId) {
    const [parent] = await db.select().from(suggestionCommentsTable).where(eq(suggestionCommentsTable.id, parentId));
    if (!parent || parent.suggestionId !== suggestionId) {
      res.status(400).json({ error: "Invalid parent comment" });
      return;
    }
  }

  const [comment] = await db
    .insert(suggestionCommentsTable)
    .values({ suggestionId, userId: user.id, parentId: parentId ?? null, body: cleanBody })
    .returning();

  res.status(201).json({ ...comment, authorName: user.name, authorCountry: user.country ?? null, replies: [] });
});

export default router;
