import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { bidsTable } from "./bids";

export const messagesTable = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bidId: integer("bid_id").notNull().references(() => bidsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Message = typeof messagesTable.$inferSelect;
