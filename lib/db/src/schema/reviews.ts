import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { gameRequestsTable } from "./requests";

export const reviewsTable = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id").notNull().references(() => gameRequestsTable.id),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  revieweeId: integer("reviewee_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  wouldPlayAgain: text("would_play_again"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Review = typeof reviewsTable.$inferSelect;
