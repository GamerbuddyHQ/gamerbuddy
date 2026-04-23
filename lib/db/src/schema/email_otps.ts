import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const emailOtpsTable = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailOtp = typeof emailOtpsTable.$inferSelect;
