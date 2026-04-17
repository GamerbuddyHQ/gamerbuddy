import { Router, type IRouter } from "express";
import multer from "multer";
import { db, usersTable, reviewsTable, gameRequestsTable, bidsTable, profilePurchasesTable, questEntriesTable, streamingAccountsTable, gamingAccountsTable, profileVotesTable, STREAMING_PLATFORMS, GAMING_PLATFORMS } from "@workspace/db";
import { eq, desc, and, ne, sql, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { recalculateTrustFactor } from "../trust-factor";
import { validate, sanitize, UpdateProfileSchema, PostQuestSchema } from "../lib/validate";

const upload = multer({ storage: multer.memoryStorage() });

const router: IRouter = Router();

export const SHOP_ITEMS: Record<string, { id: string; type: "background" | "title"; label: string; cost: number; description: string }> = {
  "bg-neon-purple":  { id: "bg-neon-purple",  type: "background", label: "Neon Purple",   cost: 300, description: "Electric purple gradient glow" },
  "bg-cyber-blue":   { id: "bg-cyber-blue",   type: "background", label: "Cyber Blue",    cost: 300, description: "Neon cyan deep-space vibe" },
  "bg-fire-red":     { id: "bg-fire-red",     type: "background", label: "Fire Red",      cost: 300, description: "Blazing orange-red inferno" },
  "bg-matrix-green": { id: "bg-matrix-green", type: "background", label: "Matrix Green",  cost: 300, description: "Hacker terminal aesthetic" },
  "bg-gold-rush":    { id: "bg-gold-rush",    type: "background", label: "Gold Rush",     cost: 500, description: "Legendary golden aura" },
  "bg-arctic":       { id: "bg-arctic",       type: "background", label: "Arctic Ice",    cost: 300, description: "Ice-cold blue-white shimmer" },
  "bg-void":         { id: "bg-void",         type: "background", label: "Void Black",    cost: 200, description: "Pure darkness with star dust" },
  "title-carry-god":      { id: "title-carry-god",      type: "title", label: "Carry God",      cost: 150, description: "For the MVPs who win alone" },
  "title-shadow-sniper":  { id: "title-shadow-sniper",  type: "title", label: "Shadow Sniper",  cost: 150, description: "Silent. Lethal. Precise." },
  "title-raid-boss":      { id: "title-raid-boss",      type: "title", label: "Raid Boss",      cost: 150, description: "Unmatched in group content" },
  "title-xp-farmer":      { id: "title-xp-farmer",      type: "title", label: "XP Farmer",      cost: 100, description: "Grinds so you don't have to" },
  "title-pro-gamer":      { id: "title-pro-gamer",      type: "title", label: "Pro Gamer",       cost: 100, description: "The classic" },
  "title-squad-leader":   { id: "title-squad-leader",   type: "title", label: "Squad Leader",   cost: 200, description: "Born to command" },
  "title-headshot-king":  { id: "title-headshot-king",  type: "title", label: "Headshot King",  cost: 200, description: "Unerring aim, every time" },
};

router.get("/users/:id", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    bio: usersTable.bio,
    country: usersTable.country,
    gender: usersTable.gender,
    trustFactor: usersTable.trustFactor,
    points: usersTable.points,
    idVerified: usersTable.idVerified,
    profileBackground: usersTable.profileBackground,
    profileTitle: usersTable.profileTitle,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [
    reviews,
    completedAsHirer,
    completedAsGamer,
    purchases,
    questEntries,
    streamingAccounts,
    gamingAccounts,
    gamerSessionsTotal,
    hirerSessionsTotal,
    beginnerReviews,
  ] = await Promise.all([
    db.select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      wouldPlayAgain: reviewsTable.wouldPlayAgain,
      createdAt: reviewsTable.createdAt,
      reviewerName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
    .where(eq(reviewsTable.revieweeId, userId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(10),

    db.select({ id: gameRequestsTable.id, gameName: gameRequestsTable.gameName, platform: gameRequestsTable.platform, createdAt: gameRequestsTable.createdAt })
    .from(gameRequestsTable)
    .where(and(eq(gameRequestsTable.userId, userId), eq(gameRequestsTable.status, "completed")))
    .orderBy(desc(gameRequestsTable.createdAt))
    .limit(10),

    db.select({ requestId: bidsTable.requestId, gameName: gameRequestsTable.gameName, platform: gameRequestsTable.platform, createdAt: bidsTable.createdAt })
    .from(bidsTable)
    .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(and(eq(bidsTable.bidderId, userId), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "completed")))
    .orderBy(desc(bidsTable.createdAt))
    .limit(10),

    db.select({ itemId: profilePurchasesTable.itemId })
    .from(profilePurchasesTable)
    .where(eq(profilePurchasesTable.userId, userId)),

    db.select()
    .from(questEntriesTable)
    .where(eq(questEntriesTable.userId, userId))
    .orderBy(questEntriesTable.createdAt),

    db.select({ platform: streamingAccountsTable.platform, username: streamingAccountsTable.username })
    .from(streamingAccountsTable)
    .where(eq(streamingAccountsTable.userId, userId)),

    db.select({ platform: gamingAccountsTable.platform, username: gamingAccountsTable.username })
    .from(gamingAccountsTable)
    .where(eq(gamingAccountsTable.userId, userId)),

    // Total completed sessions as gamer (untruncated count)
    db.select({ count: sql<string>`COUNT(*)::int` })
    .from(bidsTable)
    .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(and(eq(bidsTable.bidderId, userId), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "completed"))),

    // Total completed sessions as hirer (untruncated count)
    db.select({ count: sql<string>`COUNT(*)::int` })
    .from(gameRequestsTable)
    .where(and(eq(gameRequestsTable.userId, userId), eq(gameRequestsTable.status, "completed"))),

    // Reviews on beginner-level sessions for Beginner-Friendly badge
    db.select({ rating: reviewsTable.rating })
    .from(reviewsTable)
    .leftJoin(gameRequestsTable, eq(reviewsTable.requestId, gameRequestsTable.id))
    .where(and(eq(reviewsTable.revieweeId, userId), eq(gameRequestsTable.skillLevel, "Beginner"))),
  ]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const sessionsAsGamerCount = parseInt(String(gamerSessionsTotal[0]?.count ?? 0));
  const sessionsAsHirerCount = parseInt(String(hirerSessionsTotal[0]?.count ?? 0));
  const beginnerFriendly =
    beginnerReviews.length >= 3 &&
    beginnerReviews.reduce((s, r) => s + r.rating, 0) / beginnerReviews.length >= 7.5;

  const reviewsWithWPA = reviews.filter((r) => r.wouldPlayAgain === "yes" || r.wouldPlayAgain === "no");
  const wouldPlayAgainPercent = reviewsWithWPA.length > 0
    ? Math.round((reviewsWithWPA.filter((r) => r.wouldPlayAgain === "yes").length / reviewsWithWPA.length) * 100)
    : null;

  res.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
    avgRating,
    reviewCount: reviews.length,
    wouldPlayAgainPercent,
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    sessionsAsHirer: completedAsHirer.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    sessionsAsGamer: completedAsGamer.map((s) => ({ ...s, createdAt: s.createdAt?.toISOString() })),
    sessionsAsGamerCount,
    sessionsAsHirerCount,
    beginnerFriendly,
    purchasedItems: purchases.map((p) => p.itemId),
    questEntries: questEntries.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })),
    streamingAccounts,
    gamingAccounts,
  });
});

router.get("/quest", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const entries = await db.select().from(questEntriesTable).where(eq(questEntriesTable.userId, user.id)).orderBy(questEntriesTable.createdAt);
  res.json(entries.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })));
});

router.post("/quest", requireAuth, validate(PostQuestSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const { gameName, helpType, playstyle } = req.body as { gameName: string; helpType: string; playstyle: string };

  const existing = await db.select().from(questEntriesTable).where(eq(questEntriesTable.userId, user.id));
  if (existing.length >= 10) {
    res.status(400).json({ error: "Maximum 10 quest entries allowed" });
    return;
  }

  const [entry] = await db.insert(questEntriesTable).values({
    userId: user.id,
    gameName:  sanitize(gameName),
    helpType:  sanitize(helpType),
    playstyle: sanitize(playstyle),
  }).returning();

  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

router.delete("/quest/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const entryId = parseInt(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid entry ID" }); return; }

  const [entry] = await db.select().from(questEntriesTable).where(and(eq(questEntriesTable.id, entryId), eq(questEntriesTable.userId, user.id)));
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }

  await db.delete(questEntriesTable).where(eq(questEntriesTable.id, entryId));
  res.json({ success: true });
});

router.patch("/profile", requireAuth, validate(UpdateProfileSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const { bio, profileBackground, profileTitle, country, gender } = req.body as {
    bio?: string | null;
    profileBackground?: string | null;
    profileTitle?: string | null;
    country?: string | null;
    gender?: string | null;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (bio !== undefined) {
    updates.bio = bio ? sanitize(bio).slice(0, 500) || null : null;
  }
  if (profileBackground !== undefined) {
    updates.profileBackground = profileBackground || null;
  }
  if (profileTitle !== undefined) {
    updates.profileTitle = profileTitle || null;
  }
  if (country !== undefined) {
    updates.country = country || null;
  }
  if (gender !== undefined) {
    updates.gender = gender || null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
  res.json({ success: true, ...updates });
});

router.post("/profile/verify", requireAuth, upload.single("idDocument"), async (req, res): Promise<void> => {
  const user = req.user!;

  const hasFile = !!req.file;
  const hasBody = req.body?.confirm === "true";

  if (!hasFile && !hasBody) {
    res.status(400).json({ error: "Please upload an ID document or confirm the verification request." });
    return;
  }

  const officialIdPath = req.file ? `uploads/${Date.now()}_${req.file.originalname}` : `submitted/${Date.now()}`;

  await db.update(usersTable).set({
    officialIdPath,
    idVerified: true,
  }).where(eq(usersTable.id, user.id));

  res.json({ success: true, idVerified: true, message: "Identity verified successfully." });
});

router.get("/profile/shop", (_req, res): void => {
  res.json(Object.values(SHOP_ITEMS));
});

router.get("/profile/purchases", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const purchases = await db
    .select({ itemId: profilePurchasesTable.itemId, purchasedAt: profilePurchasesTable.purchasedAt })
    .from(profilePurchasesTable)
    .where(eq(profilePurchasesTable.userId, user.id))
    .orderBy(desc(profilePurchasesTable.purchasedAt));
  res.json(purchases.map((p) => ({ ...p, purchasedAt: p.purchasedAt.toISOString() })));
});

router.post("/profile/purchase", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { itemId } = req.body as { itemId?: string };
  if (!itemId || !SHOP_ITEMS[itemId]) {
    res.status(400).json({ error: "Unknown item" });
    return;
  }

  const item = SHOP_ITEMS[itemId];

  const [existing] = await db
    .select()
    .from(profilePurchasesTable)
    .where(and(eq(profilePurchasesTable.userId, user.id), eq(profilePurchasesTable.itemId, itemId)));
  if (existing) {
    res.status(409).json({ error: "Already purchased" });
    return;
  }

  const [fresh] = await db.select({ points: usersTable.points }).from(usersTable).where(eq(usersTable.id, user.id));
  if (!fresh || fresh.points < item.cost) {
    res.status(400).json({ error: `Not enough points. Need ${item.cost}, have ${fresh?.points ?? 0}.` });
    return;
  }

  await db.update(usersTable).set({ points: sql`${usersTable.points} - ${item.cost}` }).where(eq(usersTable.id, user.id));
  const [purchase] = await db.insert(profilePurchasesTable).values({ userId: user.id, itemId }).returning();

  res.status(201).json({
    success: true,
    purchase: { ...purchase, purchasedAt: purchase.purchasedAt.toISOString() },
    newPoints: fresh.points - item.cost,
  });
});

/* ── STREAMING ACCOUNTS ──────────────────────────────────────── */

router.get("/streaming-accounts", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const accounts = await db.select({ platform: streamingAccountsTable.platform, username: streamingAccountsTable.username })
    .from(streamingAccountsTable)
    .where(eq(streamingAccountsTable.userId, user.id));
  res.json(accounts);
});

router.post("/streaming-accounts", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { platform, username } = req.body as { platform?: string; username?: string };

  if (!platform || !(STREAMING_PLATFORMS as readonly string[]).includes(platform)) {
    res.status(400).json({ error: "Invalid platform", valid: STREAMING_PLATFORMS });
    return;
  }
  if (!username || username.trim().length < 1 || username.trim().length > 64) {
    res.status(400).json({ error: "Username must be 1–64 characters" });
    return;
  }

  await db.delete(streamingAccountsTable)
    .where(and(eq(streamingAccountsTable.userId, user.id), eq(streamingAccountsTable.platform, platform)));

  const [account] = await db.insert(streamingAccountsTable).values({
    userId: user.id,
    platform,
    username: username.trim(),
  }).returning({ platform: streamingAccountsTable.platform, username: streamingAccountsTable.username });

  res.status(201).json({ success: true, account });
});

router.delete("/streaming-accounts/:platform", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { platform } = req.params;

  await db.delete(streamingAccountsTable)
    .where(and(eq(streamingAccountsTable.userId, user.id), eq(streamingAccountsTable.platform, platform)));

  res.json({ success: true });
});

/* ── GAMING ACCOUNTS ─────────────────────────────────────────────── */

router.get("/gaming-accounts", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const accounts = await db.select({ platform: gamingAccountsTable.platform, username: gamingAccountsTable.username })
    .from(gamingAccountsTable)
    .where(eq(gamingAccountsTable.userId, user.id));
  res.json(accounts);
});

router.post("/gaming-accounts", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { platform, username } = req.body as { platform?: string; username?: string };

  if (!platform || !(GAMING_PLATFORMS as readonly string[]).includes(platform)) {
    res.status(400).json({ error: "Invalid platform", valid: GAMING_PLATFORMS });
    return;
  }
  if (!username || username.trim().length < 1 || username.trim().length > 64) {
    res.status(400).json({ error: "Username/ID must be 1–64 characters" });
    return;
  }

  const trimmedUsername = username.trim().toLowerCase();

  const [duplicate] = await db
    .select({ userId: gamingAccountsTable.userId })
    .from(gamingAccountsTable)
    .where(
      and(
        eq(gamingAccountsTable.platform, platform),
        eq(sql`LOWER(${gamingAccountsTable.username})`, trimmedUsername),
        ne(gamingAccountsTable.userId, user.id),
      ),
    )
    .limit(1);

  if (duplicate) {
    res.status(409).json({ error: "This gaming account is already linked to another profile." });
    return;
  }

  await db.delete(gamingAccountsTable)
    .where(and(eq(gamingAccountsTable.userId, user.id), eq(gamingAccountsTable.platform, platform)));

  const [account] = await db.insert(gamingAccountsTable).values({
    userId: user.id,
    platform,
    username: username.trim(),
  }).returning({ platform: gamingAccountsTable.platform, username: gamingAccountsTable.username });

  res.status(201).json({ success: true, account });
});

router.delete("/gaming-accounts/:platform", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { platform } = req.params;

  await db.delete(gamingAccountsTable)
    .where(and(eq(gamingAccountsTable.userId, user.id), eq(gamingAccountsTable.platform, platform)));

  res.json({ success: true });
});

/* ─── Profile votes ──────────────────────────────────────────────── */

async function havePlayedTogether(viewerId: number, profileId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: sql<number>`1` })
    .from(gameRequestsTable)
    .innerJoin(bidsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(
      and(
        eq(gameRequestsTable.status, "completed"),
        eq(bidsTable.status, "accepted"),
        or(
          and(eq(gameRequestsTable.userId, viewerId), eq(bidsTable.bidderId, profileId)),
          and(eq(gameRequestsTable.userId, profileId), eq(bidsTable.bidderId, viewerId)),
        ),
      ),
    )
    .limit(1);
  return !!row;
}

router.get("/users/:id/votes", requireAuth, async (req, res): Promise<void> => {
  const viewer = req.user!;
  const profileId = parseInt(req.params.id);
  if (isNaN(profileId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [likesRow, dislikesRow, myVoteRow] = await Promise.all([
    db.select({ count: sql<string>`COUNT(*)::int` })
      .from(profileVotesTable)
      .where(and(eq(profileVotesTable.userId, profileId), eq(profileVotesTable.voteType, "like"))),
    db.select({ count: sql<string>`COUNT(*)::int` })
      .from(profileVotesTable)
      .where(and(eq(profileVotesTable.userId, profileId), eq(profileVotesTable.voteType, "dislike"))),
    db.select({ voteType: profileVotesTable.voteType })
      .from(profileVotesTable)
      .where(and(eq(profileVotesTable.userId, profileId), eq(profileVotesTable.voterId, viewer.id))),
  ]);

  const isSelf = viewer.id === profileId;
  const canVote = !isSelf && await havePlayedTogether(viewer.id, profileId);

  res.json({
    likes: parseInt(String(likesRow[0]?.count ?? 0)),
    dislikes: parseInt(String(dislikesRow[0]?.count ?? 0)),
    myVote: myVoteRow[0]?.voteType ?? null,
    canVote,
  });
});

router.post("/users/:id/vote", requireAuth, async (req, res): Promise<void> => {
  const voter = req.user!;
  const profileId = parseInt(req.params.id);
  if (isNaN(profileId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  if (voter.id === profileId) { res.status(400).json({ error: "Cannot vote on your own profile" }); return; }

  const { voteType } = req.body as { voteType?: string };
  if (voteType !== "like" && voteType !== "dislike") {
    res.status(400).json({ error: "voteType must be 'like' or 'dislike'" });
    return;
  }

  const eligible = await havePlayedTogether(voter.id, profileId);
  if (!eligible) {
    res.status(403).json({ error: "You must have completed a session with this user to vote" });
    return;
  }

  const [existing] = await db
    .select()
    .from(profileVotesTable)
    .where(and(eq(profileVotesTable.userId, profileId), eq(profileVotesTable.voterId, voter.id)));

  if (existing) {
    if (existing.voteType === voteType) {
      // Clicking the same button again — remove the vote
      await db.delete(profileVotesTable).where(eq(profileVotesTable.id, existing.id));
      await recalculateTrustFactor(profileId);
      res.json({ success: true, action: "removed", myVote: null });
      return;
    }
    // Changing vote is not allowed — one vote per profile, final
    res.status(409).json({ error: "You have already voted on this profile. Only one vote is allowed." });
    return;
  }

  // New vote
  await db.insert(profileVotesTable).values({ userId: profileId, voterId: voter.id, voteType });
  await recalculateTrustFactor(profileId);

  res.json({ success: true, action: "added", myVote: voteType });
});

export default router;
