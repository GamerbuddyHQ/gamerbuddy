import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Review = typeof reviewsTable.$inferSelect;
