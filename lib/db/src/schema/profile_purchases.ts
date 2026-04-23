import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const profilePurchasesTable = pgTable("profile_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  itemId: text("item_id").notNull(),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
});

export type ProfilePurchase = typeof profilePurchasesTable.$inferSelect;
