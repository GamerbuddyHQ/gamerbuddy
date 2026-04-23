import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const contactOtpsTable = sqliteTable("contact_otps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  contact: text("contact").notNull(),
  otpHash: text("otp_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ContactOtp = typeof contactOtpsTable.$inferSelect;
