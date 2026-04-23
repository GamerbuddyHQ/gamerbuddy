import { pgTable, integer, real, text, timestamp, serial } from "drizzle-orm/pg-core";

export const platformFeesTable = pgTable("platform_fees", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id"),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PlatformFee = typeof platformFeesTable.$inferSelect;
