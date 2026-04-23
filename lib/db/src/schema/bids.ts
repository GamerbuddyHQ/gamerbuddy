import { pgTable, integer, text, real, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gameRequestsTable } from "./requests";

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => gameRequestsTable.id),
  bidderId: integer("bidder_id").notNull().references(() => usersTable.id),
  price: real("price").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  discordUsername: text("discord_username"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Bid = typeof bidsTable.$inferSelect;
