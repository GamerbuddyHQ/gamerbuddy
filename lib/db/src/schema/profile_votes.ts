import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profileVotesTable = sqliteTable(
  "profile_votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    voterId: integer("voter_id").notNull(),
    voteType: text("vote_type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("profile_votes_user_voter_idx").on(t.userId, t.voterId)],
);

export type ProfileVote = typeof profileVotesTable.$inferSelect;
