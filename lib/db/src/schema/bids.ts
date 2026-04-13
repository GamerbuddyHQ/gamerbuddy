import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gameRequestsTable } from "./requests";

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => gameRequestsTable.id),
  bidderId: integer("bidder_id").notNull().references(() => usersTable.id),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  discordUsername: text("discord_username"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Bid = typeof bidsTable.$inferSelect;
