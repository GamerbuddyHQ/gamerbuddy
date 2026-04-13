import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  wallet: text("wallet").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
