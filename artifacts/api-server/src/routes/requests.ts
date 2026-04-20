import { Router, type IRouter } from "express";
import { db, gameRequestsTable, walletsTable, usersTable, bidsTable, reviewsTable, streamingAccountsTable, gamingAccountsTable, questEntriesTable, platformFeesTable } from "@workspace/db";
import { eq, desc, and, sql, inArray, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { createNotification, sendEmailNotification } from "../notifications-helper";
import { recalculateTrustFactor } from "../trust-factor";
import { validate, sanitize, PostRequestSchema, PlaceBidSchema } from "../lib/validate";
import { bidLimiter, postRequestLimiter } from "../lib/rate-limit";
import { round2, recordTransaction as recordTx, checkBidAnomaly } from "./wallets";

const router: IRouter = Router();

const MIN_HIRING_BALANCE = 10.75;

const VALID_PLATFORMS = [
  "PC",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
  "Steam Deck",
  "iOS",
  "Android",
];

const VALID_SKILL_LEVELS = ["Beginner", "Intermediate", "Expert", "Chill"];

/* ── Expiry helpers ──────────────────────────────────────────────────────── */
function calcExpiresAt(option: string): Date | null {
  const now = new Date();
  if (option === "24h") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (option === "48h") return new Date(now.getTime() + 48 * 60 * 60 * 1000);
  if (option === "7d")  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return null; // "forever"
}

function formatRequest(
  req: {
    id: number;
    userId: number;
    gameName: string;
    platform: string;
    skillLevel: string;
    objectives: string;
    status: string;
    escrowAmount?: string | null;
    startedAt?: Date | null;
    createdAt: Date;
    bidCount?: number | null;
    lowestBid?: string | null;
    isBulkHiring?: boolean | null;
    bulkGamersNeeded?: number | null;
    acceptedBidsCount?: number | null;
    avgBidderTrustFactor?: string | null;
    avgBidderRating?: string | null;
    hasStreamingBidder?: boolean | null;
    hasQuestBidder?: boolean | null;
    preferredCountry?: string | null;
    preferredGender?: string | null;
    expiresAt?: Date | null;
    hirerRegion?: string | null;
    sessionHours?: number | null;
  },
  userName?: string,
  userIdVerified?: boolean,
  userProfilePhotoUrl?: string | null,
) {
  const hirerRegion = req.hirerRegion ?? "international";
  const sessionHours = req.sessionHours ?? null;
  const minBidPerHour = hirerRegion === "india" ? 200 : 5;
  const minBidCurrency = hirerRegion === "india" ? "INR" : "USD";
  const minBidTotal = sessionHours ? minBidPerHour * sessionHours : null;

  return {
    id: req.id,
    userId: req.userId,
    userName: userName ?? "Unknown",
    userIdVerified: userIdVerified ?? false,
    userProfilePhotoUrl: userProfilePhotoUrl ?? null,
    gameName: req.gameName,
    platform: req.platform,
    skillLevel: req.skillLevel,
    objectives: req.objectives,
    status: req.status,
    escrowAmount: req.escrowAmount ? parseFloat(String(req.escrowAmount)) : null,
    startedAt: req.startedAt ? req.startedAt.toISOString() : null,
    createdAt: req.createdAt.toISOString(),
    bidCount: req.bidCount ?? 0,
    lowestBid: req.lowestBid ? parseFloat(String(req.lowestBid)) : null,
    isBulkHiring: req.isBulkHiring ?? false,
    bulkGamersNeeded: req.bulkGamersNeeded ?? null,
    acceptedBidsCount: req.acceptedBidsCount ?? 0,
    avgBidderTrustFactor: req.avgBidderTrustFactor ? parseFloat(String(req.avgBidderTrustFactor)) : null,
    avgBidderRating: req.avgBidderRating ? parseFloat(String(req.avgBidderRating)) : null,
    hasStreamingBidder: req.hasStreamingBidder ?? false,
    hasQuestBidder: req.hasQuestBidder ?? false,
    preferredCountry: req.preferredCountry ?? "any",
    preferredGender: req.preferredGender ?? "any",
    expiresAt: req.expiresAt ? req.expiresAt.toISOString() : null,
    hirerRegion,
    sessionHours,
    minBidPerHour,
    minBidCurrency,
    minBidTotal,
  };
}

router.get("/requests", async (req, res): Promise<void> => {
  const { platform, skillLevel, status, includeExpired } = req.query as {
    platform?: string;
    skillLevel?: string;
    status?: string;
    includeExpired?: string;
  };

  // Auto-expire: mark open requests whose expiresAt has passed and have 0 bids
  const now = new Date();
  await db
    .update(gameRequestsTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(gameRequestsTable.status, "open"),
        sql`${gameRequestsTable.expiresAt} IS NOT NULL`,
        sql`${gameRequestsTable.expiresAt} <= ${now}`,
        sql`(SELECT COUNT(*) FROM bids WHERE bids.request_id = ${gameRequestsTable.id}) = 0`,
      ),
    );

  const result = await db
    .select({
      id: gameRequestsTable.id,
      userId: gameRequestsTable.userId,
      gameName: gameRequestsTable.gameName,
      platform: gameRequestsTable.platform,
      skillLevel: gameRequestsTable.skillLevel,
      objectives: gameRequestsTable.objectives,
      status: gameRequestsTable.status,
      createdAt: gameRequestsTable.createdAt,
      isBulkHiring: gameRequestsTable.isBulkHiring,
      bulkGamersNeeded: gameRequestsTable.bulkGamersNeeded,
      preferredCountry: gameRequestsTable.preferredCountry,
      preferredGender: gameRequestsTable.preferredGender,
      expiresAt: gameRequestsTable.expiresAt,
      hirerRegion: gameRequestsTable.hirerRegion,
      sessionHours: gameRequestsTable.sessionHours,
      userName: usersTable.name,
      userIdVerified: usersTable.idVerified,
      userProfilePhotoUrl: usersTable.profilePhotoUrl,
      bidCount: sql<number>`(SELECT COUNT(*) FROM bids WHERE bids.request_id = ${gameRequestsTable.id})`.mapWith(Number),
      lowestBid: sql<string | null>`(SELECT MIN(price) FROM bids WHERE bids.request_id = ${gameRequestsTable.id} AND bids.status = 'pending')`,
      acceptedBidsCount: sql<number>`(SELECT COUNT(*) FROM bids WHERE bids.request_id = ${gameRequestsTable.id} AND bids.status = 'accepted')`.mapWith(Number),
      avgBidderTrustFactor: sql<string | null>`(SELECT AVG(u.trust_factor) FROM bids b JOIN users u ON u.id = b.bidder_id WHERE b.request_id = ${gameRequestsTable.id} AND b.status != 'rejected')`,
      avgBidderRating: sql<string | null>`(SELECT AVG(r.rating) FROM bids b JOIN reviews r ON r.reviewee_id = b.bidder_id WHERE b.request_id = ${gameRequestsTable.id} AND b.status != 'rejected')`,
      hasStreamingBidder: sql<boolean>`(EXISTS(SELECT 1 FROM bids b JOIN streaming_accounts sa ON sa.user_id = b.bidder_id WHERE b.request_id = ${gameRequestsTable.id} AND b.status != 'rejected'))`,
      hasQuestBidder: sql<boolean>`(EXISTS(SELECT 1 FROM bids b JOIN quest_entries qe ON qe.user_id = b.bidder_id WHERE b.request_id = ${gameRequestsTable.id} AND b.status != 'rejected'))`,
    })
    .from(gameRequestsTable)
    .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
    .orderBy(desc(gameRequestsTable.createdAt));

  const showExpired = includeExpired === "true";

  const filtered = result.filter((r) => {
    if (r.isBulkHiring) return false; // Phase 1: bulk hiring hidden
    if (!showExpired && r.status === "expired") return false; // hide expired by default
    if (platform && r.platform !== platform) return false;
    if (skillLevel && r.skillLevel !== skillLevel) return false;
    if (status && r.status !== status) return false;
    return true;
  });

  res.json(filtered.map((r) => formatRequest(r, r.userName ?? "Unknown", r.userIdVerified ?? false, r.userProfilePhotoUrl)));
});

router.get("/requests/my", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  // Auto-expire open requests with passed expiresAt and 0 bids before returning
  const now = new Date();
  await db
    .update(gameRequestsTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(gameRequestsTable.userId, user.id),
        eq(gameRequestsTable.status, "open"),
        sql`${gameRequestsTable.expiresAt} IS NOT NULL`,
        sql`${gameRequestsTable.expiresAt} <= ${now}`,
        sql`(SELECT COUNT(*) FROM bids WHERE bids.request_id = ${gameRequestsTable.id}) = 0`,
      ),
    );

  const result = await db
    .select()
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.userId, user.id))
    .orderBy(desc(gameRequestsTable.createdAt));

  res.json(result.map((r) => formatRequest(r, user.name)));
});

router.get("/requests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  const [result] = await db
    .select({
      id: gameRequestsTable.id,
      userId: gameRequestsTable.userId,
      gameName: gameRequestsTable.gameName,
      platform: gameRequestsTable.platform,
      skillLevel: gameRequestsTable.skillLevel,
      objectives: gameRequestsTable.objectives,
      status: gameRequestsTable.status,
      escrowAmount: gameRequestsTable.escrowAmount,
      startedAt: gameRequestsTable.startedAt,
      createdAt: gameRequestsTable.createdAt,
      isBulkHiring: gameRequestsTable.isBulkHiring,
      bulkGamersNeeded: gameRequestsTable.bulkGamersNeeded,
      preferredCountry: gameRequestsTable.preferredCountry,
      preferredGender: gameRequestsTable.preferredGender,
      expiresAt: gameRequestsTable.expiresAt,
      userName: usersTable.name,
      userIdVerified: usersTable.idVerified,
      userProfilePhotoUrl: usersTable.profilePhotoUrl,
      hirerRegion: gameRequestsTable.hirerRegion,
      sessionHours: gameRequestsTable.sessionHours,
      acceptedBidsCount: sql<number>`(SELECT COUNT(*) FROM bids WHERE bids.request_id = ${gameRequestsTable.id} AND bids.status = 'accepted')`.mapWith(Number),
    })
    .from(gameRequestsTable)
    .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
    .where(eq(gameRequestsTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(formatRequest(result, result.userName ?? "Unknown", result.userIdVerified ?? false, result.userProfilePhotoUrl));
});

router.post("/requests", requireAuth, postRequestLimiter, validate(PostRequestSchema), async (req, res): Promise<void> => {
  const user = req.user!;

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  if (!wallet || wallet.hiringBalance < MIN_HIRING_BALANCE) {
    res.status(400).json({
      error: `You need at least ${MIN_HIRING_BALANCE} in your hiring wallet to post a request`,
    });
    return;
  }

  const [gamingAccountCheck] = await db
    .select({ userId: gamingAccountsTable.userId })
    .from(gamingAccountsTable)
    .where(eq(gamingAccountsTable.userId, user.id))
    .limit(1);

  if (!gamingAccountCheck) {
    res.status(403).json({
      error: "You must link at least one gaming account (Steam, Epic, PlayStation, Xbox, or Nintendo Switch) before posting a request.",
    });
    return;
  }

  const { gameName, platform, skillLevel, objectives, isBulkHiring, bulkGamersNeeded, preferredCountry, preferredGender, expiryOption, hirerRegion, sessionHours } = req.body as {
    gameName: string; platform: string; skillLevel: string; objectives: string;
    isBulkHiring: boolean; bulkGamersNeeded?: number;
    preferredCountry: string; preferredGender: string;
    expiryOption?: string;
    hirerRegion?: string;
    sessionHours?: number | null;
  };

  if (isBulkHiring) {
    res.status(400).json({
      error: "Bulk Hiring is coming in Phase 2. For now, you can only post single hiring requests.",
    });
    return;
  }

  const expiresAt = calcExpiresAt(expiryOption ?? "forever");
  const resolvedRegion = hirerRegion === "india" ? "india" : "international";

  const [gameRequest] = await db
    .insert(gameRequestsTable)
    .values({
      userId: user.id,
      gameName:     sanitize(gameName),
      platform,
      skillLevel,
      objectives:   sanitize(objectives),
      status: "open",
      isBulkHiring: Boolean(isBulkHiring),
      bulkGamersNeeded: isBulkHiring ? Number(bulkGamersNeeded) : null,
      preferredCountry: preferredCountry || "any",
      preferredGender:  preferredGender  || "any",
      expiresAt,
      hirerRegion: resolvedRegion,
      sessionHours: sessionHours ? Number(sessionHours) : null,
    })
    .returning();

  const newHiringBalance = round2(wallet.hiringBalance - MIN_HIRING_BALANCE);
  await db
    .update(walletsTable)
    .set({ hiringBalance: newHiringBalance })
    .where(eq(walletsTable.userId, user.id));

  await recordTx(user.id, "hiring", "request_fee", MIN_HIRING_BALANCE, `Platform fee for posting: ${gameName}`);

  req.log.info({ userId: user.id, gameName }, "Game request posted");
  res.status(201).json(formatRequest(gameRequest, user.name));
});

function formatBid(
  bid: {
    id: number;
    requestId: number;
    bidderId: number;
    price: string;
    message: string;
    status: string;
    discordUsername?: string | null;
    createdAt: Date;
  },
  bidderName?: string,
  bidderIdVerified?: boolean,
  bidderTrustFactor?: number,
  bidderSessionsAsGamerCount?: number,
  bidderBio?: string | null,
  bidderAvgRating?: number | null,
  bidderHasStreaming?: boolean,
  bidderHasQuestForGame?: boolean,
  bidderCountry?: string | null,
  bidderGender?: string | null,
  bidderGamingAccounts?: { platform: string; username: string }[],
  bidderProfilePhotoUrl?: string | null,
) {
  return {
    id: bid.id,
    requestId: bid.requestId,
    bidderId: bid.bidderId,
    bidderName: bidderName ?? "Unknown",
    bidderIdVerified: bidderIdVerified ?? false,
    bidderTrustFactor: bidderTrustFactor ?? 50,
    bidderSessionsAsGamerCount: bidderSessionsAsGamerCount ?? 0,
    bidderBio: bidderBio ?? null,
    bidderAvgRating: bidderAvgRating ?? null,
    bidderHasStreaming: bidderHasStreaming ?? false,
    bidderHasQuestForGame: bidderHasQuestForGame ?? false,
    bidderCountry: bidderCountry ?? null,
    bidderGender: bidderGender ?? null,
    bidderGamingAccounts: bidderGamingAccounts ?? [],
    bidderProfilePhotoUrl: bidderProfilePhotoUrl ?? null,
    price: parseFloat(bid.price),
    message: bid.message,
    status: bid.status,
    discordUsername: bid.discordUsername ?? null,
    createdAt: bid.createdAt.toISOString(),
  };
}

router.get("/requests/:id/bids", async (req, res): Promise<void> => {
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  // Fetch request gameName for quest matching
  const [gameReq] = await db
    .select({ gameName: gameRequestsTable.gameName })
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.id, requestId))
    .limit(1);
  const gameName = gameReq?.gameName ?? "";

  const rows = await db
    .select({
      id: bidsTable.id,
      requestId: bidsTable.requestId,
      bidderId: bidsTable.bidderId,
      price: bidsTable.price,
      message: bidsTable.message,
      status: bidsTable.status,
      discordUsername: bidsTable.discordUsername,
      createdAt: bidsTable.createdAt,
      bidderName: usersTable.name,
      bidderIdVerified: usersTable.idVerified,
      bidderTrustFactor: usersTable.trustFactor,
      bidderBio: usersTable.bio,
      bidderCountry: usersTable.country,
      bidderGender: usersTable.gender,
      bidderProfilePhotoUrl: usersTable.profilePhotoUrl,
    })
    .from(bidsTable)
    .leftJoin(usersTable, eq(bidsTable.bidderId, usersTable.id))
    .where(eq(bidsTable.requestId, requestId))
    .orderBy(desc(bidsTable.createdAt));

  const bidderIds = [...new Set(rows.map((r) => r.bidderId).filter(Boolean))] as number[];

  // Batch queries — all run in parallel
  const [sessionCounts, ratingRows, streamingRows, questRows, gamingRows] = await Promise.all([
    // Completed session counts
    bidderIds.length > 0
      ? db.select({ bidderId: bidsTable.bidderId, count: sql<string>`COUNT(*)::int` })
          .from(bidsTable)
          .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
          .where(and(inArray(bidsTable.bidderId, bidderIds), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "completed")))
          .groupBy(bidsTable.bidderId)
      : Promise.resolve([]),
    // Average rating per bidder
    bidderIds.length > 0
      ? db.select({
            revieweeId: reviewsTable.revieweeId,
            avg: sql<string>`AVG(${reviewsTable.rating})::float`,
          })
          .from(reviewsTable)
          .where(inArray(reviewsTable.revieweeId, bidderIds))
          .groupBy(reviewsTable.revieweeId)
      : Promise.resolve([]),
    // Which bidders have streaming accounts
    bidderIds.length > 0
      ? db.select({ userId: streamingAccountsTable.userId })
          .from(streamingAccountsTable)
          .where(inArray(streamingAccountsTable.userId, bidderIds))
      : Promise.resolve([]),
    // Which bidders have a quest entry for this game
    bidderIds.length > 0 && gameName
      ? db.select({ userId: questEntriesTable.userId })
          .from(questEntriesTable)
          .where(and(inArray(questEntriesTable.userId, bidderIds), sql`LOWER(${questEntriesTable.gameName}) = LOWER(${gameName})`))
      : Promise.resolve([]),
    // Gaming accounts for each bidder
    bidderIds.length > 0
      ? db.select({ userId: gamingAccountsTable.userId, platform: gamingAccountsTable.platform, username: gamingAccountsTable.username })
          .from(gamingAccountsTable)
          .where(inArray(gamingAccountsTable.userId, bidderIds))
      : Promise.resolve([]),
  ]);

  const sessMap: Record<number, number> = {};
  for (const s of sessionCounts) sessMap[s.bidderId] = parseInt(String(s.count));

  const ratingMap: Record<number, number> = {};
  for (const r of ratingRows) ratingMap[r.revieweeId] = parseFloat(String(r.avg));

  const streamingSet = new Set((streamingRows as { userId: number }[]).map((r) => r.userId));
  const questSet = new Set((questRows as { userId: number }[]).map((r) => r.userId));

  const gamingMap: Record<number, { platform: string; username: string }[]> = {};
  for (const g of gamingRows as { userId: number; platform: string; username: string }[]) {
    if (!gamingMap[g.userId]) gamingMap[g.userId] = [];
    gamingMap[g.userId].push({ platform: g.platform, username: g.username });
  }

  res.json(
    rows.map((r) =>
      formatBid(
        r,
        r.bidderName ?? "Unknown",
        r.bidderIdVerified ?? false,
        r.bidderTrustFactor ?? 50,
        sessMap[r.bidderId] ?? 0,
        r.bidderBio ?? null,
        ratingMap[r.bidderId] ?? null,
        streamingSet.has(r.bidderId),
        questSet.has(r.bidderId),
        r.bidderCountry ?? null,
        r.bidderGender ?? null,
        gamingMap[r.bidderId] ?? [],
        r.bidderProfilePhotoUrl ?? null,
      ),
    ),
  );
});

router.post("/requests/:id/bids", requireAuth, bidLimiter, validate(PlaceBidSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  const [gameRequest] = await db
    .select()
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.id, requestId));

  if (!gameRequest) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (gameRequest.status !== "open") {
    res.status(400).json({ error: "This request is no longer open for bids" });
    return;
  }

  if (gameRequest.userId === user.id) {
    res.status(400).json({ error: "You cannot bid on your own request" });
    return;
  }

  const [bidderGamingCheck] = await db
    .select({ userId: gamingAccountsTable.userId })
    .from(gamingAccountsTable)
    .where(eq(gamingAccountsTable.userId, user.id))
    .limit(1);

  if (!bidderGamingCheck) {
    res.status(403).json({
      error: "You must link at least one gaming account (Steam, Epic, PlayStation, Xbox, or Nintendo Switch) to place bids.",
    });
    return;
  }

  const { price, message } = req.body as { price: number; message: string };

  const [existing] = await db
    .select()
    .from(bidsTable)
    .where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.bidderId, user.id)));

  if (existing) {
    res.status(409).json({ error: "You have already placed a bid on this request" });
    return;
  }

  // Anomaly detection — flag unusually large bids for manual review
  checkBidAnomaly(user.id, round2(price), `request:${requestId}`, req.log);

  const [bid] = await db
    .insert(bidsTable)
    .values({
      requestId,
      bidderId: user.id,
      price: String(round2(price)),
      message: sanitize(message),
      status: "pending",
    })
    .returning();

  req.log.info({ userId: user.id, requestId, price }, "Bid placed");

  // Notify the request owner about the new bid
  void createNotification({
    userId: gameRequest.userId,
    type: "new_bid",
    title: "New Bid Received",
    message: `${user.name} placed a bid of $${price.toFixed(2)} on your ${gameRequest.gameName} request.`,
    link: `/requests/${requestId}`,
  });

  res.status(201).json(formatBid(bid, user.name));
});

router.post("/requests/:id/bids/:bidId/accept", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  const bidId = parseInt(req.params.bidId);
  if (isNaN(requestId) || isNaN(bidId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }
  if (gameRequest.userId !== user.id) { res.status(403).json({ error: "Only the hirer can accept bids" }); return; }
  if (gameRequest.status !== "open") { res.status(400).json({ error: "Request is not open" }); return; }

  const [bid] = await db.select().from(bidsTable).where(and(eq(bidsTable.id, bidId), eq(bidsTable.requestId, requestId)));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }
  if (bid.status !== "pending") { res.status(400).json({ error: "This bid is no longer pending" }); return; }

  const bidPrice = parseFloat(bid.price);

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.hiringBalance < bidPrice) {
    res.status(400).json({ error: `Insufficient hiring balance. Need $${bidPrice.toFixed(2)} for escrow.` });
    return;
  }

  const { discordUsername } = req.body as { discordUsername?: string };

  if (gameRequest.isBulkHiring) {
    // ── BULK MODE: reserve slot — payment is collected in full at roster lock ──
    const acceptedBidsRows = await db
      .select({ price: bidsTable.price })
      .from(bidsTable)
      .where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));
    const acceptedCount = acceptedBidsRows.length;
    const slotsNeeded = gameRequest.bulkGamersNeeded ?? 0;

    if (acceptedCount >= slotsNeeded) {
      res.status(400).json({ error: `All ${slotsNeeded} slots are already filled for this bulk request` });
      return;
    }

    // Soft balance check: hirer's wallet must cover all accepted bids + this new bid
    const currentAcceptedTotal = round2(acceptedBidsRows.reduce((s, r) => s + parseFloat(String(r.price)), 0));
    const projectedTotal = round2(currentAcceptedTotal + bidPrice);
    if (!wallet || wallet.hiringBalance < projectedTotal) {
      res.status(400).json({
        error: `Insufficient hiring balance. Accepting this gamer would bring your total to $${projectedTotal.toFixed(2)}, but your wallet only has $${wallet?.hiringBalance?.toFixed(2) ?? "0.00"}.`,
      });
      return;
    }

    // Reserve the slot — no wallet deduction yet; payment is collected at lock
    await db.update(bidsTable)
      .set({ status: "accepted", discordUsername: discordUsername?.trim() || null })
      .where(eq(bidsTable.id, bidId));

    const newAcceptedCount = acceptedCount + 1;
    const slotsFilled = newAcceptedCount >= slotsNeeded;

    // If all slots auto-filled, collect the full group payment immediately
    if (slotsFilled) {
      const allAcceptedBids = await db
        .select({ price: bidsTable.price })
        .from(bidsTable)
        .where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));
      const groupTotal = round2(allAcceptedBids.reduce((s, r) => s + parseFloat(String(r.price)), 0));
      // Atomic deduction with balance guard — prevents over-deduction under concurrency
      const [deductedBulk] = await db
        .update(walletsTable)
        .set({ hiringBalance: sql`hiring_balance - ${groupTotal}` })
        .where(and(eq(walletsTable.userId, user.id), gte(walletsTable.hiringBalance, groupTotal)))
        .returning();
      if (!deductedBulk) {
        res.status(400).json({ error: "Insufficient hiring balance to complete group escrow. Please refresh." });
        return;
      }
      await db.update(gameRequestsTable)
        .set({ status: "in_progress", startedAt: new Date(), escrowAmount: String(groupTotal) })
        .where(eq(gameRequestsTable.id, requestId));
      await recordTx(user.id, "hiring", "escrow_held", groupTotal,
        `Group escrow for ${gameRequest.gameName} — ${newAcceptedCount} gamers ($${groupTotal.toFixed(2)} total)`);
    } else {
      // Keep request open, escrow stays 0 until lock
      await db.update(gameRequestsTable)
        .set({ escrowAmount: "0" })
        .where(eq(gameRequestsTable.id, requestId));
    }

    void createNotification({
      userId: bid.bidderId,
      type: "bid_accepted",
      title: "Your Slot is Reserved! 🎮",
      message: `${user.name} reserved your slot in the bulk ${gameRequest.gameName} session for $${bidPrice.toFixed(2)}. Payment processes when the roster is locked.`,
      link: `/requests/${requestId}`,
    });

    const remainingSlots = slotsNeeded - newAcceptedCount;
    req.log.info({ userId: user.id, requestId, bidId, acceptedCount: newAcceptedCount, slotsNeeded, projectedTotal }, "Bulk bid accepted (slot reserved)");
    res.json({
      success: true,
      slotsFilled,
      acceptedCount: newAcceptedCount,
      remainingSlots,
      projectedTotal,
      message: slotsFilled
        ? `All ${slotsNeeded} slots filled! Group payment of $${projectedTotal.toFixed(2)} collected and session is now in progress.`
        : `Slot reserved. ${remainingSlots} slot${remainingSlots !== 1 ? "s" : ""} remaining. Total will be $${projectedTotal.toFixed(2)} at lock.`,
    });
  } else {
    // ── SINGLE-GAMER MODE (original flow) ──
    // Atomic deduction: SQL-level WHERE gte(hiringBalance, bidPrice) prevents
    // double-deduction if two accept requests race.
    const [deducted] = await db
      .update(walletsTable)
      .set({ hiringBalance: sql`hiring_balance - ${bidPrice}` })
      .where(and(eq(walletsTable.userId, user.id), gte(walletsTable.hiringBalance, bidPrice)))
      .returning();
    if (!deducted) {
      res.status(400).json({ error: "Insufficient hiring balance. Please refresh and try again." });
      return;
    }

    await db.update(bidsTable).set({ status: "accepted", discordUsername: discordUsername?.trim() || null }).where(eq(bidsTable.id, bidId));
    await db.update(bidsTable).set({ status: "rejected" }).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "pending")));
    await db.update(gameRequestsTable)
      .set({ status: "in_progress", escrowAmount: String(bidPrice), acceptedBidId: bidId })
      .where(eq(gameRequestsTable.id, requestId));

    await recordTx(user.id, "hiring", "escrow_held", bidPrice, `Escrow held for session: ${gameRequest.gameName}`);

    void createNotification({
      userId: bid.bidderId,
      type: "bid_accepted",
      title: "Your Bid Was Accepted! 🎮",
      message: `${user.name} accepted your bid of $${bidPrice.toFixed(2)} for ${gameRequest.gameName}. Head to the session to get started!`,
      link: `/requests/${requestId}`,
    });

    req.log.info({ userId: user.id, requestId, bidId, escrow: bidPrice }, "Bid accepted — escrow held");
    res.json({ success: true, message: "Bid accepted. Funds are held in escrow until session is complete." });
  }
});

router.post("/requests/:id/lock", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }
  if (!gameRequest.isBulkHiring) { res.status(400).json({ error: "Only bulk hiring requests can be locked" }); return; }
  if (gameRequest.userId !== user.id) { res.status(403).json({ error: "Only the hirer can lock the roster" }); return; }
  if (gameRequest.status !== "open") { res.status(400).json({ error: "Request is not open" }); return; }

  // Fetch all accepted bids to compute group total
  const acceptedBids = await db
    .select({ id: bidsTable.id, price: bidsTable.price, bidderId: bidsTable.bidderId })
    .from(bidsTable)
    .where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));
  const acceptedCount = acceptedBids.length;

  if (acceptedCount < 1) {
    res.status(400).json({ error: "Accept at least 1 gamer before locking the roster" });
    return;
  }

  // ── Group payment: total = sum of all accepted bid prices ──
  const groupTotal = round2(acceptedBids.reduce((s, b) => s + parseFloat(String(b.price)), 0));
  const platformFee = round2(groupTotal * 0.1);
  const gamersTotal = round2(groupTotal - platformFee);  // 90% shared across gamers

  // Verify hirer has enough balance
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.hiringBalance < groupTotal) {
    res.status(400).json({
      error: `Insufficient hiring balance. Group total is $${groupTotal.toFixed(2)} but your wallet has $${(wallet?.hiringBalance ?? 0).toFixed(2)}.`,
    });
    return;
  }

  // Atomic deduction with balance guard — prevents double-deduction under concurrency
  const [lockDeducted] = await db
    .update(walletsTable)
    .set({ hiringBalance: sql`hiring_balance - ${groupTotal}` })
    .where(and(eq(walletsTable.userId, user.id), gte(walletsTable.hiringBalance, groupTotal)))
    .returning();

  if (!lockDeducted) {
    res.status(400).json({ error: "Insufficient hiring balance. Please refresh and try again." });
    return;
  }

  // Set group escrow and transition to in_progress
  await db.update(gameRequestsTable)
    .set({ status: "in_progress", startedAt: new Date(), escrowAmount: String(groupTotal) })
    .where(eq(gameRequestsTable.id, requestId));

  // Record single group transaction
  await recordTx(
    user.id, "hiring", "escrow_held", groupTotal,
    `Group escrow for ${gameRequest.gameName} — ${acceptedCount} gamer${acceptedCount !== 1 ? "s" : ""} ($${groupTotal.toFixed(2)} total, 10% fee = $${platformFee.toFixed(2)})`,
  );

  req.log.info({ userId: user.id, requestId, acceptedCount, groupTotal, platformFee, gamersTotal }, "Bulk roster locked — group escrow collected");
  res.json({
    success: true,
    acceptedCount,
    groupTotal,
    platformFee,
    gamersTotal,
    message: `Roster locked with ${acceptedCount} gamer${acceptedCount !== 1 ? "s" : ""}! $${groupTotal.toFixed(2)} collected — gamers will receive $${gamersTotal.toFixed(2)} total on completion.`,
  });
});

router.post("/requests/:id/start", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }
  if (gameRequest.status !== "in_progress") { res.status(400).json({ error: "No active session to start" }); return; }
  if (gameRequest.startedAt) { res.status(400).json({ error: "Session already started" }); return; }

  const [acceptedBid] = await db.select().from(bidsTable).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));
  if (!acceptedBid || acceptedBid.bidderId !== user.id) {
    res.status(403).json({ error: "Only the accepted gamer can start the session" });
    return;
  }

  const now = new Date();
  await db.update(gameRequestsTable).set({ startedAt: now }).where(eq(gameRequestsTable.id, requestId));

  // Notify the hirer that the session has started
  void createNotification({
    userId: gameRequest.userId,
    type: "session_started",
    title: "Session Started! 🎮",
    message: `The gamer has started the ${gameRequest.gameName} session. You'll be able to approve payment once they're done.`,
    link: `/requests/${requestId}`,
  });

  req.log.info({ userId: user.id, requestId }, "Session started by gamer");
  res.json({ success: true, startedAt: now.toISOString(), message: "Session started! The hirer will be notified." });
});

router.post("/requests/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }
  if (gameRequest.userId !== user.id) { res.status(403).json({ error: "Only the hirer can complete a session" }); return; }
  if (!gameRequest.startedAt) { res.status(400).json({ error: "The session must be started before you can approve payment" }); return; }

  // ── Atomic status guard ──────────────────────────────────────────────────
  // Update status with an explicit WHERE status='in_progress' check.
  // If 0 rows are affected, another request already completed/cancelled this
  // session — we return 409 instead of paying out twice.
  const [statusFlipped] = await db
    .update(gameRequestsTable)
    .set({ status: gameRequest.isBulkHiring ? "completed" : "awaiting_reviews" })
    .where(and(eq(gameRequestsTable.id, requestId), eq(gameRequestsTable.status, "in_progress")))
    .returning({ id: gameRequestsTable.id });

  if (!statusFlipped) {
    res.status(409).json({ error: "This session has already been completed or cancelled." });
    return;
  }

  if (gameRequest.isBulkHiring) {
    // ── BULK MODE: distribute 90% of group escrow to each gamer proportionally ──
    const acceptedBids = await db.select().from(bidsTable)
      .where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));

    const groupTotal = round2(acceptedBids.reduce((s, b) => s + parseFloat(String(b.price)), 0));
    const platformFee = round2(groupTotal * 0.1);

    let totalPaid = 0;
    for (const bid of acceptedBids) {
      const bidPrice = round2(parseFloat(String(bid.price)));
      const gamerPayout = round2(bidPrice * 0.9);
      const bidFee = round2(bidPrice - gamerPayout);
      totalPaid = round2(totalPaid + gamerPayout);

      if (gamerPayout > 0) {
        await db
          .update(walletsTable)
          .set({ earningsBalance: sql`earnings_balance + ${gamerPayout}` })
          .where(eq(walletsTable.userId, bid.bidderId));
        await recordTx(bid.bidderId, "earnings", "session_payout", gamerPayout,
          `Bulk session payout: ${gameRequest.gameName} — 90% of $${bidPrice.toFixed(2)} ($${bidFee.toFixed(2)} platform fee deducted)`);
      }

      void createNotification({
        userId: bid.bidderId,
        type: "payment_released",
        title: "Bulk Session Payout! 💸",
        message: `$${gamerPayout.toFixed(2)} has been released to your Earnings wallet for the bulk ${gameRequest.gameName} session. (90% of your $${bidPrice.toFixed(2)} bid — $${bidFee.toFixed(2)} platform fee deducted)`,
        link: `/requests/${requestId}`,
      });
    }

    // Record platform fee on hirer's transaction history and in the platform ledger
    if (platformFee > 0) {
      await recordTx(user.id, "hiring", "platform_fee", platformFee,
        `Platform fee (10%): Bulk ${gameRequest.gameName} — $${groupTotal.toFixed(2)} × 10%`);
      await db.insert(platformFeesTable).values({
        requestId,
        amount: String(platformFee),
        type: "bulk_session_fee",
        description: `Bulk: ${gameRequest.gameName} — $${groupTotal.toFixed(2)} group total × 10% (${acceptedBids.length} gamers, hirer #${user.id})`,
      });
    }

    req.log.info({ userId: user.id, requestId, gamerCount: acceptedBids.length, groupTotal, platformFee, totalPaid }, "Bulk session completed — group payout distributed — platform fee recorded");
    res.json({
      success: true,
      message: `Bulk session completed! ${acceptedBids.length} gamer${acceptedBids.length !== 1 ? "s" : ""} paid $${totalPaid.toFixed(2)} total (90%). Platform fee: $${platformFee.toFixed(2)} (10%).`,
      gamerCount: acceptedBids.length,
      groupTotal,
      platformFee,
      totalPaid,
    });
    return;
  }

  // ── SINGLE-GAMER MODE (original flow) ──
  const [acceptedBid] = await db.select().from(bidsTable).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));

  const escrow = round2(parseFloat(String(gameRequest.escrowAmount ?? "0")));
  const gamerPayout = round2(escrow * 0.9);
  const platformFee = round2(escrow - gamerPayout);

  // Status already flipped to "awaiting_reviews" by the atomic guard above.

  // Release escrow to gamer immediately using an atomic SQL increment —
  // prevents payout duplication if this block somehow runs twice.
  if (acceptedBid && gamerPayout > 0) {
    await db
      .update(walletsTable)
      .set({ earningsBalance: sql`earnings_balance + ${gamerPayout}` })
      .where(eq(walletsTable.userId, acceptedBid.bidderId));
    await recordTx(
      acceptedBid.bidderId, "earnings", "session_payout", gamerPayout,
      `Session payout: ${gameRequest.gameName} — 90% of $${escrow.toFixed(2)} escrow ($${platformFee.toFixed(2)} platform fee deducted)`,
    );
  }

  // Record the 10% platform fee on the hirer's transaction history and in the platform ledger
  if (platformFee > 0) {
    await recordTx(
      user.id, "hiring", "platform_fee", platformFee,
      `Platform fee (10%): ${gameRequest.gameName} — $${platformFee.toFixed(2)} of $${escrow.toFixed(2)} escrow`,
    );
    await db.insert(platformFeesTable).values({
      requestId,
      amount: String(platformFee),
      type: "session_fee",
      description: `Session: ${gameRequest.gameName} — $${escrow.toFixed(2)} × 10% (hirer #${user.id} → gamer #${acceptedBid?.bidderId ?? "?"})`
    });
  }

  if (acceptedBid) {
    const [gamerUser] = await db.select({ email: usersTable.email, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, acceptedBid.bidderId));
    void createNotification({
      userId: acceptedBid.bidderId,
      type: "payment_released",
      title: "Payment Released! 💸",
      message: `$${gamerPayout.toFixed(2)} has been released to your Earnings wallet for ${gameRequest.gameName}. (90% of $${escrow.toFixed(2)} — $${platformFee.toFixed(2)} platform fee deducted.) Leave a review to earn 50 bonus points!`,
      link: `/requests/${requestId}`,
    });
    if (gamerUser) {
      void sendEmailNotification({
        to: gamerUser.email,
        subject: `Payment of $${gamerPayout.toFixed(2)} received — Gamerbuddy`,
        body: `Hi ${gamerUser.name},\n\n$${gamerPayout.toFixed(2)} has been added to your Earnings wallet for your ${gameRequest.gameName} session.\n\n(90% of $${escrow.toFixed(2)} escrow — $${platformFee.toFixed(2)} platform fee deducted.)\n\nLeave a review to earn 50 bonus points!\n\nGamerbuddy`,
      });
    }
  }

  void createNotification({
    userId: user.id,
    type: "payment_released",
    title: "Payment Approved — Review Required",
    message: `You released $${gamerPayout.toFixed(2)} for ${gameRequest.gameName}. (10% platform fee: $${platformFee.toFixed(2)}) Leave a review now to earn 50 points!`,
    link: `/requests/${requestId}`,
  });

  req.log.info({ userId: user.id, requestId, escrow, gamerPayout, platformFee }, "Payment released — platform fee recorded — awaiting reviews");
  res.json({
    success: true,
    message: `Payment released! Gamer receives $${gamerPayout.toFixed(2)} (90%). Platform fee: $${platformFee.toFixed(2)} (10%). Both players must now leave a review to earn 50 points each.`,
    escrow,
    gamerPayout,
    platformFee,
    awaitingReviews: true,
  });
});

router.post("/requests/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }
  if (gameRequest.userId !== user.id) { res.status(403).json({ error: "Only the hirer can cancel" }); return; }
  if (!["open", "in_progress"].includes(gameRequest.status)) {
    res.status(400).json({ error: "Only open or in-progress requests can be cancelled" });
    return;
  }

  let refundAmount = 0;

  if (gameRequest.status === "in_progress" && gameRequest.escrowAmount) {
    refundAmount = round2(parseFloat(String(gameRequest.escrowAmount)));
    if (refundAmount > 0) {
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
      if (wallet) {
        await db.update(walletsTable)
          .set({ hiringBalance: round2(wallet.hiringBalance + refundAmount) })
          .where(eq(walletsTable.userId, user.id));
        await recordTx(user.id, "hiring", "escrow_refund", refundAmount, `Escrow refunded: ${gameRequest.gameName} (session cancelled)`);
      }
    }
  }

  await db.update(gameRequestsTable).set({ status: "cancelled" }).where(eq(gameRequestsTable.id, requestId));
  res.json({ success: true, refundAmount });
});

router.get("/requests/:id/reviews", async (req, res): Promise<void> => {
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const rows = await db
    .select({
      id: reviewsTable.id,
      requestId: reviewsTable.requestId,
      reviewerId: reviewsTable.reviewerId,
      revieweeId: reviewsTable.revieweeId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      wouldPlayAgain: reviewsTable.wouldPlayAgain,
      createdAt: reviewsTable.createdAt,
      reviewerName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
    .where(eq(reviewsTable.requestId, requestId));

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/requests/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }

  // Allow review when awaiting_reviews OR already completed (late review edge-case)
  if (!["awaiting_reviews", "completed"].includes(gameRequest.status)) {
    res.status(400).json({ error: "Reviews can only be submitted after payment is released" });
    return;
  }

  const [acceptedBid] = await db.select().from(bidsTable).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));

  const isHirer = gameRequest.userId === user.id;
  const isGamer = acceptedBid && acceptedBid.bidderId === user.id;
  if (!isHirer && !isGamer) { res.status(403).json({ error: "You were not part of this session" }); return; }

  const revieweeId = isHirer ? acceptedBid!.bidderId : gameRequest.userId;

  const [existing] = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.requestId, requestId), eq(reviewsTable.reviewerId, user.id)));
  if (existing) { res.status(409).json({ error: "You have already reviewed this session" }); return; }

  const { rating, comment, wouldPlayAgain } = req.body as { rating?: number; comment?: string; wouldPlayAgain?: string };
  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 10) {
    res.status(400).json({ error: "Rating must be a whole number from 1 to 10" });
    return;
  }
  const wpa = wouldPlayAgain === "yes" || wouldPlayAgain === "no" || wouldPlayAgain === "maybe" ? wouldPlayAgain : null;

  const [review] = await db.insert(reviewsTable).values({
    requestId,
    reviewerId: user.id,
    revieweeId,
    rating,
    comment: comment?.trim() || null,
    wouldPlayAgain: wpa,
  }).returning();

  // Recalculate trust factor from scratch (rating quality + session experience +
  // review volume + vote sentiment) — votes are now a permanent formula component
  await recalculateTrustFactor(revieweeId);

  // Notify the reviewee about the new review
  void createNotification({
    userId: revieweeId,
    type: "review_received",
    title: "You Received a Review",
    message: `${user.name} rated the ${gameRequest.gameName} session ${rating}/10.${comment?.trim() ? ` "${comment.trim().slice(0, 60)}${comment.trim().length > 60 ? "…" : ""}"` : ""}`,
    link: `/requests/${requestId}`,
  });

  // Check if both hirer AND gamer have now submitted reviews
  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.requestId, requestId));
  const hirerId = gameRequest.userId;
  const gamerId = acceptedBid?.bidderId;
  const hirerReviewed = allReviews.some((r) => r.reviewerId === hirerId);
  const gamerReviewed = gamerId != null && allReviews.some((r) => r.reviewerId === gamerId);
  const bothReviewed = hirerReviewed && gamerReviewed;

  if (bothReviewed) {
    // Mark session as fully completed and award 50 pts to each party
    await db.update(gameRequestsTable)
      .set({ status: "completed" })
      .where(eq(gameRequestsTable.id, requestId));

    await db.update(usersTable)
      .set({ points: sql`${usersTable.points} + 50` })
      .where(eq(usersTable.id, hirerId));

    if (gamerId != null) {
      await db.update(usersTable)
        .set({ points: sql`${usersTable.points} + 50` })
        .where(eq(usersTable.id, gamerId));
    }

    // Notify both parties that the session is fully complete
    void createNotification({
      userId: hirerId,
      type: "session_complete",
      title: "Session Complete! +50 Points 🏆",
      message: `The ${gameRequest.gameName} session is fully complete. Both reviews received — 50 points added to your account!`,
      link: `/requests/${requestId}`,
    });
    if (gamerId != null) {
      void createNotification({
        userId: gamerId,
        type: "session_complete",
        title: "Session Complete! +50 Points 🏆",
        message: `The ${gameRequest.gameName} session is fully complete. Both reviews received — 50 points added to your account!`,
        link: `/requests/${requestId}`,
      });
    }

    req.log.info({ requestId, hirerId, gamerId }, "Both reviews submitted — session completed, 50 pts awarded each");
    res.status(201).json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      bothReviewed: true,
      pointsAwarded: 50,
      sessionCompleted: true,
    });
  } else {
    // Only one review submitted so far — waiting on the other party
    res.status(201).json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      bothReviewed: false,
      pointsAwarded: 0,
      sessionCompleted: false,
    });
  }
});

router.post("/requests/:id/gift", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request ID" }); return; }

  const [gameRequest] = await db.select().from(gameRequestsTable).where(eq(gameRequestsTable.id, requestId));
  if (!gameRequest) { res.status(404).json({ error: "Request not found" }); return; }
  if (gameRequest.userId !== user.id) { res.status(403).json({ error: "Only the hirer can send a gift" }); return; }
  if (gameRequest.status !== "completed") { res.status(400).json({ error: "Session must be completed first" }); return; }

  const { amount } = req.body as { amount?: number };
  if (!amount || typeof amount !== "number" || amount <= 0) { res.status(400).json({ error: "Gift amount must be positive" }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.hiringBalance < amount) { res.status(400).json({ error: "Insufficient hiring wallet balance for gift" }); return; }

  const [acceptedBid] = await db.select().from(bidsTable).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));
  if (!acceptedBid) { res.status(404).json({ error: "No accepted bid found" }); return; }

  const giftAmount = round2(amount);
  const giftFee = round2(giftAmount * 0.1);
  const gamerGift = round2(giftAmount - giftFee); // 90% goes to gamer

  // Atomic deduct full gift from hirer
  const [deductedGift] = await db
    .update(walletsTable)
    .set({ hiringBalance: sql`hiring_balance - ${giftAmount}` })
    .where(and(eq(walletsTable.userId, user.id), gte(walletsTable.hiringBalance, giftAmount)))
    .returning();
  if (!deductedGift) {
    res.status(400).json({ error: "Insufficient hiring wallet balance for gift" });
    return;
  }

  // Credit 90% to gamer atomically
  await db
    .update(walletsTable)
    .set({ earningsBalance: sql`earnings_balance + ${gamerGift}` })
    .where(eq(walletsTable.userId, acceptedBid.bidderId));

  // Record all three transactions
  await recordTx(user.id, "hiring", "gift_sent", giftAmount,
    `Tip sent for ${gameRequest.gameName} — $${gamerGift.toFixed(2)} to gamer + $${giftFee.toFixed(2)} platform fee (10%)`);
  await recordTx(acceptedBid.bidderId, "earnings", "gift_received", gamerGift,
    `Tip received for ${gameRequest.gameName} — 90% of $${giftAmount.toFixed(2)} tip ($${giftFee.toFixed(2)} platform fee deducted)`);
  await recordTx(user.id, "hiring", "platform_fee", giftFee,
    `Platform fee (10%) on tip for ${gameRequest.gameName}: $${giftFee.toFixed(2)}`);

  // Record in platform ledger
  await db.insert(platformFeesTable).values({
    requestId,
    amount: String(giftFee),
    type: "gift_fee",
    description: `Tip: ${gameRequest.gameName} — $${giftAmount.toFixed(2)} × 10% (hirer #${user.id} → gamer #${acceptedBid.bidderId})`,
  });

  req.log.info({ userId: user.id, requestId, giftAmount, gamerGift, giftFee }, "Tip sent — 90% to gamer, 10% platform fee recorded");
  res.json({
    success: true,
    message: `Tip of $${giftAmount.toFixed(2)} sent! Gamer receives $${gamerGift.toFixed(2)} (90%). Platform fee: $${giftFee.toFixed(2)} (10%).`,
    giftAmount,
    gamerGift,
    giftFee,
  });
});

export default router;
