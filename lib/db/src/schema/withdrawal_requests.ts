import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const withdrawalRequestsTable = sqliteTable("withdrawal_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"),
  country: text("country"),
  payoutDetails: text("payout_details"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  adminNote: text("admin_note"),
});

export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
