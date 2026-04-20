import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export const TRUST_POINTS = 5;

export type TrustPointReason =
  | "session_complete_review"
  | "high_rating"
  | "gaming_account_linked"
  | "profile_photo_uploaded"
  | "good_community_behavior";

/**
 * Awards +5 Trust Score points to a user for a specific action.
 * There is no maximum — the score grows indefinitely.
 */
export async function awardTrustPoints(
  userId: number,
  reason: TrustPointReason,
): Promise<number> {
  const [updated] = await db
    .update(usersTable)
    .set({ trustScore: sql`${usersTable.trustScore} + ${TRUST_POINTS}` })
    .where(eq(usersTable.id, userId))
    .returning({ trustScore: usersTable.trustScore });

  return updated?.trustScore ?? 0;
}
