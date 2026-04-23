import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const walletTransactionsTable = sqliteTable("wallet_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  wallet: text("wallet").notNull(),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  referenceId: text("reference_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
