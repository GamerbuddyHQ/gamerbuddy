import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const STREAMING_PLATFORMS = ["twitch", "youtube", "kick", "facebook", "tiktok"] as const;
export type StreamingPlatform = (typeof STREAMING_PLATFORMS)[number];

export const streamingAccountsTable = pgTable("streaming_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StreamingAccount = typeof streamingAccountsTable.$inferSelect;
