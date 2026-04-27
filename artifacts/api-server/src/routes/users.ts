import { Router, type IRouter } from "express";
import multer from "multer";
import { db, usersTable, reviewsTable, gameRequestsTable, bidsTable, profilePurchasesTable, questEntriesTable, streamingAccountsTable, gamingAccountsTable, profileVotesTable, userPhotosTable, STREAMING_PLATFORMS, GAMING_PLATFORMS } from "@workspace/db";
import { eq, desc, and, ne, sql, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { toIso, toIsoRequired } from "../lib/dates";
import { recalculateTrustFactor } from "../trust-factor";
import { awardTrustPoints } from "../trust-score";
import { validate, sanitize, UpdateProfileSchema, PostQuestSchema } from "../lib/validate";
import { verifyLimiter } from "../lib/rate-limit";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();

const ALLOWED_ID_MIMETYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_ID_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ID_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_ID_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP, HEIC) or PDF are accepted for identity documents."));
    }
  },
});

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
  const userId = parseInt(req.params.id as string);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    bio: usersTable.bio,
    country: usersTable.country,
    gender: usersTable.gender,
    trustFactor: usersTable.trustFactor,
    trustScore: usersTable.trustScore,
    points: usersTable.points,
    idVerified: usersTable.idVerified,
    profileBackground: usersTable.profileBackground,
    profileTitle: usersTable.profileTitle,
    profilePhotoUrl: usersTable.profilePhotoUrl,
    galleryPhotoUrls: usersTable.galleryPhotoUrls,
    createdAt: sql<string>`to_char(${usersTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
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
      createdAt: sql<string>`to_char(${reviewsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      reviewerName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
    .where(eq(reviewsTable.revieweeId, userId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(10),

    db.select({
      id: gameRequestsTable.id,
      gameName: gameRequestsTable.gameName,
      platform: gameRequestsTable.platform,
      createdAt: sql<string>`to_char(${gameRequestsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(gameRequestsTable)
    .where(and(eq(gameRequestsTable.userId, userId), eq(gameRequestsTable.status, "completed")))
    .orderBy(desc(gameRequestsTable.createdAt))
    .limit(10),

    db.select({
      requestId: bidsTable.requestId,
      gameName: gameRequestsTable.gameName,
      platform: gameRequestsTable.platform,
      createdAt: sql<string>`to_char(${bidsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(bidsTable)
    .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(and(eq(bidsTable.bidderId, userId), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "completed")))
    .orderBy(desc(bidsTable.createdAt))
    .limit(10),

    db.select({ itemId: profilePurchasesTable.itemId })
    .from(profilePurchasesTable)
    .where(eq(profilePurchasesTable.userId, userId)),

    db.select({
      id:        questEntriesTable.id,
      userId:    questEntriesTable.userId,
      gameName:  questEntriesTable.gameName,
      helpType:  questEntriesTable.helpType,
      playstyle: questEntriesTable.playstyle,
      createdAt: sql<string>`to_char(${questEntriesTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
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
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(bidsTable)
    .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(and(eq(bidsTable.bidderId, userId), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "completed"))),

    // Total completed sessions as hirer (untruncated count)
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
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
    createdAt: toIsoRequired(user.createdAt),
    profilePhotoUrl: user.profilePhotoUrl ?? null,
    galleryPhotoUrls: user.galleryPhotoUrls ?? [],
    avgRating,
    reviewCount: reviews.length,
    wouldPlayAgainPercent,
    reviews: reviews.map((r) => ({ ...r, createdAt: toIsoRequired(r.createdAt) })),
    sessionsAsHirer: completedAsHirer.map((s) => ({ ...s, createdAt: toIsoRequired(s.createdAt) })),
    sessionsAsGamer: completedAsGamer.map((s) => ({ ...s, createdAt: toIso(s.createdAt) })),
    sessionsAsGamerCount,
    sessionsAsHirerCount,
    beginnerFriendly,
    purchasedItems: purchases.map((p) => p.itemId),
    questEntries: questEntries.map((q) => ({ ...q, createdAt: toIsoRequired(q.createdAt) })),
    streamingAccounts,
    gamingAccounts,
  });
});

router.get("/quest", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const entries = await db
    .select({
      id:        questEntriesTable.id,
      userId:    questEntriesTable.userId,
      gameName:  questEntriesTable.gameName,
      helpType:  questEntriesTable.helpType,
      playstyle: questEntriesTable.playstyle,
      createdAt: sql<string>`to_char(${questEntriesTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(questEntriesTable)
    .where(eq(questEntriesTable.userId, user.id))
    .orderBy(questEntriesTable.createdAt);
  res.json(entries);
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

  res.status(201).json({ ...entry, createdAt: toIsoRequired(entry.createdAt) });
});

router.delete("/quest/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const entryId = parseInt(req.params.id as string);
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

/* ── PHOTO ROUTES ─────────────────────────────────────────────── */

router.post("/profile/photo/upload-url", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { name, size, contentType, fileHash } = req.body as { name?: string; size?: number; contentType?: string; fileHash?: string };
  if (!contentType || !contentType.startsWith("image/")) {
    res.status(400).json({ error: "Only image uploads are allowed" });
    return;
  }
  if (!size || size > 8 * 1024 * 1024) {
    res.status(400).json({ error: "File too large. Maximum 8 MB." });
    return;
  }
  if (fileHash && typeof fileHash === "string") {
    const [existing] = await db.select({ id: userPhotosTable.id }).from(userPhotosTable)
      .where(and(eq(userPhotosTable.userId, user.id), eq(userPhotosTable.photoHash, fileHash)));
    if (existing) {
      res.status(409).json({ error: "duplicate", message: "This photo has already been uploaded. Please upload a unique photo." });
      return;
    }
  }
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch {
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/profile/photo", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { objectPath, fileHash } = req.body as { objectPath?: string; fileHash?: string };
  if (!objectPath || typeof objectPath !== "string" || !objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }
  if (fileHash && typeof fileHash === "string") {
    const [existing] = await db.select({ id: userPhotosTable.id }).from(userPhotosTable)
      .where(and(eq(userPhotosTable.userId, user.id), eq(userPhotosTable.photoHash, fileHash)));
    if (existing) {
      res.status(409).json({ error: "duplicate", message: "This photo has already been uploaded. Please upload a unique photo." });
      return;
    }
  }
  const [currentPhoto] = await db.select({ profilePhotoUrl: usersTable.profilePhotoUrl }).from(usersTable).where(eq(usersTable.id, user.id));
  const isFirstPhoto = !currentPhoto?.profilePhotoUrl;
  await db.update(usersTable).set({ profilePhotoUrl: objectPath }).where(eq(usersTable.id, user.id));
  await db.insert(userPhotosTable).values({ userId: user.id, objectPath, photoType: "profile", status: "needs_review", photoHash: fileHash ?? null });
  if (isFirstPhoto) {
    await awardTrustPoints(user.id, "profile_photo_uploaded");
  }
  res.json({ success: true, profilePhotoUrl: objectPath });
});

router.delete("/profile/photo", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  await db.update(usersTable).set({ profilePhotoUrl: null }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

router.post("/profile/gallery/upload-url", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { name, size, contentType, fileHash } = req.body as { name?: string; size?: number; contentType?: string; fileHash?: string };
  if (!contentType || !contentType.startsWith("image/")) {
    res.status(400).json({ error: "Only image uploads are allowed" });
    return;
  }
  if (!size || size > 8 * 1024 * 1024) {
    res.status(400).json({ error: "File too large. Maximum 8 MB." });
    return;
  }
  const [currentUser] = await db.select({ galleryPhotoUrls: usersTable.galleryPhotoUrls }).from(usersTable).where(eq(usersTable.id, user.id));
  if ((currentUser?.galleryPhotoUrls?.length ?? 0) >= 4) {
    res.status(400).json({ error: "Maximum 4 additional photos allowed" });
    return;
  }
  if (fileHash && typeof fileHash === "string") {
    const [existing] = await db.select({ id: userPhotosTable.id }).from(userPhotosTable)
      .where(and(eq(userPhotosTable.userId, user.id), eq(userPhotosTable.photoHash, fileHash)));
    if (existing) {
      res.status(409).json({ error: "duplicate", message: "This photo has already been uploaded. Please upload a unique photo." });
      return;
    }
  }
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch {
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/profile/gallery", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { objectPath, fileHash } = req.body as { objectPath?: string; fileHash?: string };
  if (!objectPath || typeof objectPath !== "string" || !objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Invalid objectPath" });
    return;
  }
  const [currentUser] = await db.select({ galleryPhotoUrls: usersTable.galleryPhotoUrls }).from(usersTable).where(eq(usersTable.id, user.id));
  const current = currentUser?.galleryPhotoUrls ?? [];
  if (current.length >= 4) {
    res.status(400).json({ error: "Maximum 4 additional photos allowed" });
    return;
  }
  if (fileHash && typeof fileHash === "string") {
    const [existing] = await db.select({ id: userPhotosTable.id }).from(userPhotosTable)
      .where(and(eq(userPhotosTable.userId, user.id), eq(userPhotosTable.photoHash, fileHash)));
    if (existing) {
      res.status(409).json({ error: "duplicate", message: "This photo has already been uploaded. Please upload a unique photo." });
      return;
    }
  }
  const updated = [...current, objectPath];
  await db.update(usersTable).set({ galleryPhotoUrls: updated }).where(eq(usersTable.id, user.id));
  await db.insert(userPhotosTable).values({ userId: user.id, objectPath, photoType: "gallery", status: "needs_review", photoHash: fileHash ?? null });
  res.json({ success: true, galleryPhotoUrls: updated });
});

router.delete("/profile/gallery/:index", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const index = parseInt(req.params.index as string);
  if (isNaN(index) || index < 0) { res.status(400).json({ error: "Invalid index" }); return; }
  const [currentUser] = await db.select({ galleryPhotoUrls: usersTable.galleryPhotoUrls }).from(usersTable).where(eq(usersTable.id, user.id));
  const current = currentUser?.galleryPhotoUrls ?? [];
  if (index >= current.length) { res.status(404).json({ error: "Photo not found" }); return; }
  const updated = current.filter((_, i) => i !== index);
  await db.update(usersTable).set({ galleryPhotoUrls: updated }).where(eq(usersTable.id, user.id));
  res.json({ success: true, galleryPhotoUrls: updated });
});

/* ─────────────────────────────────────────────────────────────── */

router.post("/profile/verify", requireAuth, verifyLimiter, upload.single("idDocument"), async (req, res): Promise<void> => {
  const user = req.user!;

  const hasFile = !!req.file;
  const hasBody = req.body?.confirm === "true";

  if (!hasFile && !hasBody) {
    res.status(400).json({ error: "Please upload an ID document or confirm the verification request." });
    return;
  }

  // Sanitise the filename: strip any path separators or non-printable characters.
  const safeFilename = req.file
    ? req.file.originalname.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 120)
    : null;
  const officialIdPath = safeFilename
    ? `pending/${Date.now()}_${safeFilename}`
    : `pending/${Date.now()}`;

  // Security: idVerified is intentionally NOT set here.
  // The verification request is queued for admin review (24–48 hrs).
  // Admin approves via POST /admin/users/:id/set-verified.
  await db.update(usersTable).set({
    officialIdPath,
  }).where(eq(usersTable.id, user.id));

  res.json({
    success: true,
    idVerified: false,
    verificationPending: true,
    message: "Your verification request has been submitted. Our team will review it within 24–48 hours and your Verified badge will appear once approved.",
  });
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
  res.json(purchases.map((p) => ({ ...p, purchasedAt: toIsoRequired(p.purchasedAt) })));
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
    purchase: { ...purchase, purchasedAt: toIsoRequired(purchase.purchasedAt) },
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
  const { platform } = req.params as Record<string, string>;

  await db.delete(streamingAccountsTable)
    .where(and(eq(streamingAccountsTable.userId, user.id), eq(streamingAccountsTable.platform, platform)));

  res.json({ success: true });
});

/* ── GAMING ACCOUNTS ─────────────────────────────────────────────── */

router.get("/gaming-accounts", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const accounts = await db.select({
    platform: gamingAccountsTable.platform,
    username: gamingAccountsTable.username,
    status: gamingAccountsTable.status,
  })
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

  const existingAccounts = await db.select({ id: gamingAccountsTable.userId }).from(gamingAccountsTable).where(eq(gamingAccountsTable.userId, user.id));
  const isFirstGamingAccount = existingAccounts.length === 0;

  await db.delete(gamingAccountsTable)
    .where(and(eq(gamingAccountsTable.userId, user.id), eq(gamingAccountsTable.platform, platform)));

  const [account] = await db.insert(gamingAccountsTable).values({
    userId: user.id,
    platform,
    username: username.trim(),
    status: "pending_review",
  }).returning({ platform: gamingAccountsTable.platform, username: gamingAccountsTable.username, status: gamingAccountsTable.status });

  if (isFirstGamingAccount) {
    await awardTrustPoints(user.id, "gaming_account_linked");
  }

  res.status(201).json({ success: true, account });
});

router.delete("/gaming-accounts/:platform", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { platform } = req.params as Record<string, string>;

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
  const profileId = parseInt(req.params.id as string);
  if (isNaN(profileId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [likesRow, dislikesRow, myVoteRow] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(profileVotesTable)
      .where(and(eq(profileVotesTable.userId, profileId), eq(profileVotesTable.voteType, "like"))),
    db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
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
  const profileId = parseInt(req.params.id as string);
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
