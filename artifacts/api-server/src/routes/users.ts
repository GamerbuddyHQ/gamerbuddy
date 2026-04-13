import { Router, type IRouter } from "express";
import { db, usersTable, reviewsTable, gameRequestsTable, bidsTable, walletsTable } from "@workspace/db";
import { eq, desc, and, avg } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

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
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const reviews = await db
    .select({
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
    .limit(10);

  const completedAsHirer = await db
    .select({ id: gameRequestsTable.id, gameName: gameRequestsTable.gameName, createdAt: gameRequestsTable.createdAt })
    .from(gameRequestsTable)
    .where(and(eq(gameRequestsTable.userId, userId), eq(gameRequestsTable.status, "completed")))
    .orderBy(desc(gameRequestsTable.createdAt))
    .limit(5);

  const completedAsGamer = await db
    .select({ requestId: bidsTable.requestId, gameName: gameRequestsTable.gameName, createdAt: bidsTable.createdAt })
    .from(bidsTable)
    .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
    .where(and(eq(bidsTable.bidderId, userId), eq(bidsTable.status, "accepted"), eq(gameRequestsTable.status, "completed")))
    .orderBy(desc(bidsTable.createdAt))
    .limit(5);

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
  });
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { bio } = req.body as { bio?: string };

  if (typeof bio !== "string") {
    res.status(400).json({ error: "bio must be a string" });
    return;
  }

  const trimmed = bio.trim().slice(0, 300);

  await db.update(usersTable).set({ bio: trimmed || null }).where(eq(usersTable.id, user.id));
  res.json({ success: true, bio: trimmed || null });
});

export default router;
