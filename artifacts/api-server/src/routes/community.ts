import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suggestionsTable,
  suggestionVotesTable,
  suggestionCommentsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const LINK_STRIP_RE = /(?:https?:\/\/\S+|www\.\S+|\b\S+\.(?:com|net|org|io|co|app|gg|tv|me|ly|link|xyz|info|gov|edu)(?:\/\S*)?)/gi;

function stripLinks(text: string): string {
  return text.replace(LINK_STRIP_RE, "").replace(/ {2,}/g, " ").trim();
}

/* ──────────────────────────────────────────────────────────────
   GET /community/suggestions?sort=newest|liked|discussed
────────────────────────────────────────────────────────────── */
router.get("/community/suggestions", async (req, res): Promise<void> => {
  const sort = (req.query.sort as string) ?? "newest";
  const currentUserId = req.user?.id ?? null;

  const rows = await db
    .select({
      id: suggestionsTable.id,
      title: suggestionsTable.title,
      body: suggestionsTable.body,
      createdAt: suggestionsTable.createdAt,
      userId: suggestionsTable.userId,
      authorName: usersTable.name,
      likes: sql<number>`cast(count(case when ${suggestionVotesTable.vote} = 'up' then 1 end) as int)`,
      dislikes: sql<number>`cast(count(case when ${suggestionVotesTable.vote} = 'down' then 1 end) as int)`,
    })
    .from(suggestionsTable)
    .leftJoin(usersTable, eq(suggestionsTable.userId, usersTable.id))
    .leftJoin(suggestionVotesTable, eq(suggestionVotesTable.suggestionId, suggestionsTable.id))
    .groupBy(suggestionsTable.id, usersTable.name);

  const commentCounts = await db
    .select({
      suggestionId: suggestionCommentsTable.suggestionId,
      cnt: sql<number>`cast(count(*) as int)`,
    })
    .from(suggestionCommentsTable)
    .groupBy(suggestionCommentsTable.suggestionId);

  const commentMap = new Map(commentCounts.map((r) => [r.suggestionId, r.cnt]));

  let myVotes: Map<number, string> = new Map();
  if (currentUserId) {
    const votes = await db
      .select()
      .from(suggestionVotesTable)
      .where(eq(suggestionVotesTable.userId, currentUserId));
    myVotes = new Map(votes.map((v) => [v.suggestionId, v.vote]));
  }

  const enriched = rows.map((r) => ({
    ...r,
    commentCount: commentMap.get(r.id) ?? 0,
    myVote: myVotes.get(r.id) ?? null,
  }));

  if (sort === "liked") {
    enriched.sort((a, b) => b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === "discussed") {
    enriched.sort((a, b) => b.commentCount - a.commentCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(enriched);
});

/* ──────────────────────────────────────────────────────────────
   POST /community/suggestions
────────────────────────────────────────────────────────────── */
router.post("/community/suggestions", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { title, body } = req.body as { title?: string; body?: string };

  if (!title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "Title and body are required" });
    return;
  }
  const cleanTitle = stripLinks(title.trim());
  const cleanBody  = stripLinks(body.trim());
  if (!cleanTitle) { res.status(400).json({ error: "Title is required" }); return; }
  if (!cleanBody)  { res.status(400).json({ error: "Body is required" });  return; }
  if (cleanTitle.length > 120) {
    res.status(400).json({ error: "Title must be 120 characters or less" });
    return;
  }
  if (cleanBody.length > 1000) {
    res.status(400).json({ error: "Body must be 1000 characters or less" });
    return;
  }

  const [suggestion] = await db
    .insert(suggestionsTable)
    .values({ userId: user.id, title: cleanTitle, body: cleanBody })
    .returning();

  res.status(201).json({ ...suggestion, authorName: user.name, likes: 0, dislikes: 0, commentCount: 0, myVote: null });
});

/* ──────────────────────────────────────────────────────────────
   POST /community/suggestions/:id/vote  { vote: 'up'|'down' }
   DELETE /community/suggestions/:id/vote  (removes vote)
────────────────────────────────────────────────────────────── */
router.post("/community/suggestions/:id/vote", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const suggestionId = parseInt(req.params.id, 10);
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
  const suggestionId = parseInt(req.params.id, 10);

  const rows = await db
    .select({
      id: suggestionCommentsTable.id,
      suggestionId: suggestionCommentsTable.suggestionId,
      userId: suggestionCommentsTable.userId,
      parentId: suggestionCommentsTable.parentId,
      body: suggestionCommentsTable.body,
      createdAt: suggestionCommentsTable.createdAt,
      authorName: usersTable.name,
    })
    .from(suggestionCommentsTable)
    .leftJoin(usersTable, eq(suggestionCommentsTable.userId, usersTable.id))
    .where(eq(suggestionCommentsTable.suggestionId, suggestionId))
    .orderBy(suggestionCommentsTable.createdAt);

  const topLevel = rows.filter((r) => !r.parentId);
  const replies = rows.filter((r) => !!r.parentId);

  const threaded = topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parentId === c.id),
  }));

  res.json(threaded);
});

/* ──────────────────────────────────────────────────────────────
   POST /community/suggestions/:id/comments  { body, parentId? }
────────────────────────────────────────────────────────────── */
router.post("/community/suggestions/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const suggestionId = parseInt(req.params.id, 10);
  const { body, parentId } = req.body as { body?: string; parentId?: number | null };

  if (!body?.trim()) { res.status(400).json({ error: "Comment body is required" }); return; }
  const cleanBody = stripLinks(body.trim());
  if (!cleanBody) { res.status(400).json({ error: "Comment body is required" }); return; }
  if (cleanBody.length > 500) { res.status(400).json({ error: "Comment must be 500 characters or less" }); return; }

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

  res.status(201).json({ ...comment, authorName: user.name, replies: [] });
});

export default router;
