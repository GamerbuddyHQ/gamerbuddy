import { Router, type IRouter } from "express";
import { db, gameRequestsTable, walletsTable, usersTable, bidsTable, reviewsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { createNotification, sendEmailNotification } from "../notifications-helper";

const router: IRouter = Router();

const MIN_HIRING_BALANCE = 10.75;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function recordTx(userId: number, wallet: "hiring" | "earnings", type: string, amount: number, description: string) {
  await db.insert(walletTransactionsTable).values({
    userId, wallet, type, amount: String(round2(Math.abs(amount))), description,
  });
}

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
  },
  userName?: string,
  userIdVerified?: boolean,
) {
  return {
    id: req.id,
    userId: req.userId,
    userName: userName ?? "Unknown",
    userIdVerified: userIdVerified ?? false,
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
  };
}

router.get("/requests", async (req, res): Promise<void> => {
  const { platform, skillLevel, status } = req.query as {
    platform?: string;
    skillLevel?: string;
    status?: string;
  };

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
      userName: usersTable.name,
      userIdVerified: usersTable.idVerified,
      bidCount: sql<number>`(SELECT COUNT(*) FROM bids WHERE bids.request_id = ${gameRequestsTable.id})`.mapWith(Number),
      lowestBid: sql<string | null>`(SELECT MIN(price) FROM bids WHERE bids.request_id = ${gameRequestsTable.id} AND bids.status = 'pending')`,
    })
    .from(gameRequestsTable)
    .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
    .orderBy(desc(gameRequestsTable.createdAt));

  const filtered = result.filter((r) => {
    if (platform && r.platform !== platform) return false;
    if (skillLevel && r.skillLevel !== skillLevel) return false;
    if (status && r.status !== status) return false;
    return true;
  });

  res.json(filtered.map((r) => formatRequest(r, r.userName ?? "Unknown", r.userIdVerified ?? false)));
});

router.get("/requests/my", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

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
      userName: usersTable.name,
    })
    .from(gameRequestsTable)
    .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
    .where(eq(gameRequestsTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(formatRequest(result, result.userName ?? "Unknown"));
});

router.post("/requests", requireAuth, async (req, res): Promise<void> => {
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

  const { gameName, platform, skillLevel, objectives } = req.body as {
    gameName?: string;
    platform?: string;
    skillLevel?: string;
    objectives?: string;
  };

  if (!gameName || !platform || !skillLevel || !objectives) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: "Invalid platform" });
    return;
  }

  if (!VALID_SKILL_LEVELS.includes(skillLevel)) {
    res.status(400).json({ error: "Invalid skill level" });
    return;
  }

  const [gameRequest] = await db
    .insert(gameRequestsTable)
    .values({
      userId: user.id,
      gameName,
      platform,
      skillLevel,
      objectives,
      status: "open",
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

function formatBid(bid: {
  id: number;
  requestId: number;
  bidderId: number;
  price: string;
  message: string;
  status: string;
  discordUsername?: string | null;
  createdAt: Date;
}, bidderName?: string, bidderIdVerified?: boolean) {
  return {
    id: bid.id,
    requestId: bid.requestId,
    bidderId: bid.bidderId,
    bidderName: bidderName ?? "Unknown",
    bidderIdVerified: bidderIdVerified ?? false,
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
    })
    .from(bidsTable)
    .leftJoin(usersTable, eq(bidsTable.bidderId, usersTable.id))
    .where(eq(bidsTable.requestId, requestId))
    .orderBy(desc(bidsTable.createdAt));

  res.json(rows.map((r) => formatBid(r, r.bidderName ?? "Unknown", r.bidderIdVerified ?? false)));
});

router.post("/requests/:id/bids", requireAuth, async (req, res): Promise<void> => {
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

  const { price, message } = req.body as { price?: number; message?: string };

  if (!price || typeof price !== "number" || price <= 0) {
    res.status(400).json({ error: "Price must be a positive number" });
    return;
  }

  if (!message || message.trim().length < 5) {
    res.status(400).json({ error: "Message must be at least 5 characters" });
    return;
  }

  const [existing] = await db
    .select()
    .from(bidsTable)
    .where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.bidderId, user.id)));

  if (existing) {
    res.status(409).json({ error: "You have already placed a bid on this request" });
    return;
  }

  const [bid] = await db
    .insert(bidsTable)
    .values({
      requestId,
      bidderId: user.id,
      price: String(price),
      message: message.trim(),
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

  const bidPrice = parseFloat(bid.price);

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.hiringBalance < bidPrice) {
    res.status(400).json({ error: `Insufficient hiring balance. Need $${bidPrice.toFixed(2)} for escrow.` });
    return;
  }

  const { discordUsername } = req.body as { discordUsername?: string };

  const newHiringBalance = round2(wallet.hiringBalance - bidPrice);
  await db.update(walletsTable)
    .set({ hiringBalance: newHiringBalance })
    .where(eq(walletsTable.userId, user.id));

  await db.update(bidsTable).set({ status: "accepted", discordUsername: discordUsername?.trim() || null }).where(eq(bidsTable.id, bidId));
  await db.update(bidsTable).set({ status: "rejected" }).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "pending")));
  await db.update(gameRequestsTable)
    .set({ status: "in_progress", escrowAmount: String(bidPrice), acceptedBidId: bidId })
    .where(eq(gameRequestsTable.id, requestId));

  await recordTx(user.id, "hiring", "escrow_held", bidPrice, `Escrow held for session: ${gameRequest.gameName}`);

  // Notify the accepted gamer
  void createNotification({
    userId: bid.bidderId,
    type: "bid_accepted",
    title: "Your Bid Was Accepted! 🎮",
    message: `${user.name} accepted your bid of $${bidPrice.toFixed(2)} for ${gameRequest.gameName}. Head to the session to get started!`,
    link: `/requests/${requestId}`,
  });

  req.log.info({ userId: user.id, requestId, bidId, escrow: bidPrice }, "Bid accepted — escrow held");
  res.json({ success: true, message: "Bid accepted. Funds are held in escrow until session is complete." });
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
  if (gameRequest.status !== "in_progress") { res.status(400).json({ error: "Request is not in progress" }); return; }
  if (!gameRequest.startedAt) { res.status(400).json({ error: "The gamer must start the session before you can approve payment" }); return; }

  const [acceptedBid] = await db.select().from(bidsTable).where(and(eq(bidsTable.requestId, requestId), eq(bidsTable.status, "accepted")));

  const escrow = round2(parseFloat(String(gameRequest.escrowAmount ?? "0")));
  const gamerPayout = round2(escrow * 0.9);
  const platformFee = round2(escrow - gamerPayout);

  // Move to awaiting_reviews — both parties must review before it's fully complete
  await db.update(gameRequestsTable).set({ status: "awaiting_reviews" }).where(eq(gameRequestsTable.id, requestId));

  // Release escrow to gamer immediately (payout is guaranteed once hirer approves)
  if (acceptedBid && gamerPayout > 0) {
    const [gamerWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, acceptedBid.bidderId));
    if (gamerWallet) {
      await db.update(walletsTable)
        .set({ earningsBalance: round2(gamerWallet.earningsBalance + gamerPayout) })
        .where(eq(walletsTable.userId, acceptedBid.bidderId));
    }
    await recordTx(acceptedBid.bidderId, "earnings", "session_payout", gamerPayout, `Earnings for session: ${gameRequest.gameName} (90% after fee)`);
  }

  // Notify the gamer that payment has been released
  if (acceptedBid) {
    const [gamerUser] = await db.select({ email: usersTable.email, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, acceptedBid.bidderId));
    void createNotification({
      userId: acceptedBid.bidderId,
      type: "payment_released",
      title: "Payment Released! 💸",
      message: `$${gamerPayout.toFixed(2)} has been released to your Earnings wallet for ${gameRequest.gameName}. Leave a review to earn 50 bonus points!`,
      link: `/requests/${requestId}`,
    });
    if (gamerUser) {
      void sendEmailNotification({
        to: gamerUser.email,
        subject: `Payment of $${gamerPayout.toFixed(2)} received — Gamerbuddy`,
        body: `Hi ${gamerUser.name},\n\n$${gamerPayout.toFixed(2)} has been added to your Earnings wallet for your ${gameRequest.gameName} session.\n\nLeave a review to earn 50 bonus points!\n\nGamerbuddy`,
      });
    }
  }

  // Also notify the hirer to leave their review
  void createNotification({
    userId: user.id,
    type: "payment_released",
    title: "Payment Approved — Review Required",
    message: `You released $${gamerPayout.toFixed(2)} for ${gameRequest.gameName}. Leave a review now to earn 50 points!`,
    link: `/requests/${requestId}`,
  });

  req.log.info({ userId: user.id, requestId, gamerPayout, platformFee }, "Payment released — awaiting reviews");
  res.json({
    success: true,
    message: "Payment released! Both players must now leave a review to earn 50 points each.",
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

  const { rating, comment } = req.body as { rating?: number; comment?: string };
  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 10) {
    res.status(400).json({ error: "Rating must be a whole number from 1 to 10" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    requestId,
    reviewerId: user.id,
    revieweeId,
    rating,
    comment: comment?.trim() || null,
  }).returning();

  // Adjust reviewee's trust factor
  const trustDelta = Math.round((rating - 5) * 2);
  await db.update(usersTable)
    .set({ trustFactor: sql`LEAST(GREATEST(${usersTable.trustFactor} + ${trustDelta}, 0), 1000)` })
    .where(eq(usersTable.id, revieweeId));

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
  const [gamerWalletForGift] = await db.select().from(walletsTable).where(eq(walletsTable.userId, acceptedBid.bidderId));

  await db.update(walletsTable).set({ hiringBalance: round2(wallet.hiringBalance - giftAmount) }).where(eq(walletsTable.userId, user.id));
  if (gamerWalletForGift) {
    await db.update(walletsTable)
      .set({ earningsBalance: round2(gamerWalletForGift.earningsBalance + giftAmount) })
      .where(eq(walletsTable.userId, acceptedBid.bidderId));
  }

  await recordTx(user.id, "hiring", "gift_sent", giftAmount, `Tip/gift sent for session: ${gameRequest.gameName}`);
  await recordTx(acceptedBid.bidderId, "earnings", "gift_received", giftAmount, `Tip/gift received for session: ${gameRequest.gameName}`);

  res.json({ success: true, message: `Gift of $${giftAmount.toFixed(2)} sent!` });
});

export default router;
