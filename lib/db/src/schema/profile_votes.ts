import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";

export const profileVotesTable = pgTable(
  "profile_votes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    voterId: integer("voter_id").notNull(),
    voteType: text("vote_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.voterId)],
);

export type ProfileVote = typeof profileVotesTable.$inferSelect;
