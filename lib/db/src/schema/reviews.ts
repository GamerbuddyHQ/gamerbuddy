import { pgTable, integer, text, timestamp, serial, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gameRequestsTable } from "./requests";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => gameRequestsTable.id),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  revieweeId: integer("reviewee_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  wouldPlayAgain: text("would_play_again"),
  isFlagged: boolean("is_flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  flaggedAt: timestamp("flagged_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Review = typeof reviewsTable.$inferSelect;
