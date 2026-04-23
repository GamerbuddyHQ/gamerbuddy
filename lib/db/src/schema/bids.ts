import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { gameRequestsTable } from "./requests";

export const bidsTable = sqliteTable("bids", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id").notNull().references(() => gameRequestsTable.id),
  bidderId: integer("bidder_id").notNull().references(() => usersTable.id),
  price: real("price").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  discordUsername: text("discord_username"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Bid = typeof bidsTable.$inferSelect;
