import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bidsTable } from "./bids";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").notNull().references(() => bidsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
