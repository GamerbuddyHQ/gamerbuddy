import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const profilePurchasesTable = sqliteTable("profile_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  itemId: text("item_id").notNull(),
  purchasedAt: integer("purchased_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ProfilePurchase = typeof profilePurchasesTable.$inferSelect;
