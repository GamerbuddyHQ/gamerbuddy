import { pgTable, serial, integer, doublePrecision, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("pending"),
  country: text("country"),
  payoutDetails: text("payout_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  adminNote: text("admin_note"),
});

export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
