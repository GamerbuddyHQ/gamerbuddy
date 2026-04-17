import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";

export const platformFeesTable = pgTable("platform_fees", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformFee = typeof platformFeesTable.$inferSelect;
