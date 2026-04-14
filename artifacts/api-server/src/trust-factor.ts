import { db, usersTable, reviewsTable, gameRequestsTable, bidsTable, profileVotesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * Recalculates and persists a user's Trust Factor from scratch.
 *
 * Formula (0–100):
 *   Component 1 — Rating quality    (0–60 pts)
 *     Bayesian avg blended with neutral prior 7.5/10 (weight 3), scaled to 60.
 *     Prevents a single outlier review from dominating.
 *
 *   Component 2 — Session experience (0–30 pts)
 *     sqrt(totalSessions / 50) × 30  — early sessions count more; caps at 50 sessions.
 *
 *   Component 3 — Review volume      (0–10 pts)
 *     Linear, capped at 10 reviews.
 *
 *   Component 4 — Vote sentiment     (−5 to +5 pts)
 *     netVotes = likes − dislikes, clamped to ±10 to prevent gaming.
 *     votePts = round(clamp(netVotes, −10, 10) × 0.5)
 *     Community likes give a small boost; dislikes give a small penalty.
 */
export async function recalculateTrustFactor(userId: number): Promise<number> {
  const [tfRow, gamerRow, hirerRow, likesRow, dislikesRow] = await Promise.all([
    // Average rating + review count
    db
      .select({
        avg: sql<string>`AVG(${reviewsTable.rating})`,
        count: sql<string>`COUNT(*)::int`,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.revieweeId, userId)),

    // Completed sessions as gamer
    db
      .select({ count: sql<string>`COUNT(*)::int` })
      .from(bidsTable)
      .leftJoin(gameRequestsTable, eq(bidsTable.requestId, gameRequestsTable.id))
      .where(
        and(
          eq(bidsTable.bidderId, userId),
          eq(bidsTable.status, "accepted"),
          eq(gameRequestsTable.status, "completed"),
        ),
      ),

    // Completed sessions as hirer
    db
      .select({ count: sql<string>`COUNT(*)::int` })
      .from(gameRequestsTable)
      .where(and(eq(gameRequestsTable.userId, userId), eq(gameRequestsTable.status, "completed"))),

    // Likes received
    db
      .select({ count: sql<string>`COUNT(*)::int` })
      .from(profileVotesTable)
      .where(and(eq(profileVotesTable.userId, userId), eq(profileVotesTable.voteType, "like"))),

    // Dislikes received
    db
      .select({ count: sql<string>`COUNT(*)::int` })
      .from(profileVotesTable)
      .where(and(eq(profileVotesTable.userId, userId), eq(profileVotesTable.voteType, "dislike"))),
  ]);

  const reviewCount = parseInt(String(tfRow[0]?.count ?? 0));
  const rawAvg      = parseFloat(tfRow[0]?.avg ?? "5");
  const gamerSess   = parseInt(String(gamerRow[0]?.count ?? 0));
  const hirerSess   = parseInt(String(hirerRow[0]?.count ?? 0));
  const likes       = parseInt(String(likesRow[0]?.count ?? 0));
  const dislikes    = parseInt(String(dislikesRow[0]?.count ?? 0));

  const totalSess   = gamerSess + hirerSess;

  // Component 1: Rating quality (0–60 pts) — Bayesian average
  const priorMean   = 7.5;
  const priorWeight = 3;
  const bayesianAvg = (rawAvg * reviewCount + priorMean * priorWeight) / (reviewCount + priorWeight);
  const ratingPts   = Math.round((bayesianAvg / 10) * 60);

  // Component 2: Session experience (0–30 pts) — sqrt scale
  const sessionPts  = Math.round(Math.min(Math.sqrt(totalSess / 50), 1) * 30);

  // Component 3: Review volume (0–10 pts) — linear, cap 10
  const volumePts   = Math.min(reviewCount, 10);

  // Component 4: Vote sentiment (−5 to +5 pts)
  const netVotes    = Math.max(-10, Math.min(10, likes - dislikes));
  const votePts     = Math.round(netVotes * 0.5);

  const newTF = Math.min(100, Math.max(0, ratingPts + sessionPts + volumePts + votePts));

  await db.update(usersTable).set({ trustFactor: newTF }).where(eq(usersTable.id, userId));

  return newTF;
}
