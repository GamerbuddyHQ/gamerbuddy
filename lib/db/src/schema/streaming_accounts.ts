import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const STREAMING_PLATFORMS = ["twitch", "youtube", "kick", "facebook", "tiktok"] as const;
export type StreamingPlatform = (typeof STREAMING_PLATFORMS)[number];

export const streamingAccountsTable = sqliteTable("streaming_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type StreamingAccount = typeof streamingAccountsTable.$inferSelect;
