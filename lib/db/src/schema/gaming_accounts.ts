import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const GAMING_PLATFORMS = ["steam", "epic", "psn", "xbox", "switch"] as const;
export type GamingPlatform = (typeof GAMING_PLATFORMS)[number];

export const gamingAccountsTable = sqliteTable("gaming_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  status: text("status").notNull().default("pending_review"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type GamingAccount = typeof gamingAccountsTable.$inferSelect;
