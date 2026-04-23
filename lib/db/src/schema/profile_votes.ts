import { pgTable, integer, text, timestamp, serial, uniqueIndex } from "drizzle-orm/pg-core";

export const profileVotesTable = pgTable(
  "profile_votes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    voterId: integer("voter_id").notNull(),
    voteType: text("vote_type").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profile_votes_user_voter_idx").on(t.userId, t.voterId)],
);

export type ProfileVote = typeof profileVotesTable.$inferSelect;
