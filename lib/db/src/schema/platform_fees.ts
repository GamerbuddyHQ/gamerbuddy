import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";

export const platformFeesTable = sqliteTable("platform_fees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id"),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type PlatformFee = typeof platformFeesTable.$inferSelect;
