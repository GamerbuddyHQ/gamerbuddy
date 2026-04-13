import { Router, type IRouter } from "express";
import multer from "multer";
import { db, usersTable, reviewsTable, gameRequestsTable, bidsTable, profilePurchasesTable, questEntriesTable, streamingAccountsTable, STREAMING_PLATFORMS } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

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
    trustFactor: usersTable.trustFactor,
    points: usersTable.points,
    idVerified: usersTable.idVerified,
    profileBackground: usersTable.profileBackground,
    profileTitle: usersTable.profileTitle,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [reviews, completedAsHirer, completedAsGamer, purchases, questEntries, streamingAccounts] = await Promise.all([
    db.select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
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
  ]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  res.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
    avgRating,
    reviewCount: reviews.length,
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    sessionsAsHirer: completedAsHirer.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    sessionsAsGamer: completedAsGamer.map((s) => ({ ...s, createdAt: s.createdAt?.toISOString() })),
    purchasedItems: purchases.map((p) => p.itemId),
    questEntries: questEntries.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })),
    streamingAccounts,
  });
});

router.get("/quest", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const entries = await db.select().from(questEntriesTable).where(eq(questEntriesTable.userId, user.id)).orderBy(questEntriesTable.createdAt);
  res.json(entries.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })));
});

router.post("/quest", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { gameName, helpType, playstyle } = req.body as { gameName?: string; helpType?: string; playstyle?: string };

  if (!gameName?.trim() || !helpType?.trim() || !playstyle?.trim()) {
    res.status(400).json({ error: "gameName, helpType, and playstyle are required" });
    return;
  }

  const existing = await db.select().from(questEntriesTable).where(eq(questEntriesTable.userId, user.id));
  if (existing.length >= 10) {
    res.status(400).json({ error: "Maximum 10 quest entries allowed" });
    return;
  }

  const [entry] = await db.insert(questEntriesTable).values({
    userId: user.id,
    gameName: gameName.trim().slice(0, 60),
    helpType: helpType.trim().slice(0, 100),
    playstyle: playstyle.trim().slice(0, 60),
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

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { bio, profileBackground, profileTitle } = req.body as {
    bio?: string;
    profileBackground?: string | null;
    profileTitle?: string | null;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (typeof bio === "string") {
    updates.bio = bio.trim().slice(0, 300) || null;
  }
  if (profileBackground !== undefined) {
    updates.profileBackground = profileBackground || null;
  }
  if (profileTitle !== undefined) {
    updates.profileTitle = profileTitle || null;
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

export default router;
