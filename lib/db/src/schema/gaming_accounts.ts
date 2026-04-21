import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const GAMING_PLATFORMS = ["steam", "epic", "psn", "xbox", "switch"] as const;
export type GamingPlatform = (typeof GAMING_PLATFORMS)[number];

export const gamingAccountsTable = pgTable("gaming_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GamingAccount = typeof gamingAccountsTable.$inferSelect;
