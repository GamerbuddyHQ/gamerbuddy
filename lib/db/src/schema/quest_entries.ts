import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const questEntriesTable = sqliteTable("quest_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameName: text("game_name").notNull(),
  helpType: text("help_type").notNull(),
  playstyle: text("playstyle").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type QuestEntry = typeof questEntriesTable.$inferSelect;
export type InsertQuestEntry = typeof questEntriesTable.$inferInsert;
