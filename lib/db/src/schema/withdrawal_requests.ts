import { pgTable, integer, real, text, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"),
  country: text("country"),
  payoutDetails: text("payout_details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  adminNote: text("admin_note"),
});

export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
