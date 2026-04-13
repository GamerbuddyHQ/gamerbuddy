import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const questEntriesTable = pgTable("quest_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameName: text("game_name").notNull(),
  helpType: text("help_type").notNull(),
  playstyle: text("playstyle").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuestEntry = typeof questEntriesTable.$inferSelect;
export type InsertQuestEntry = typeof questEntriesTable.$inferInsert;
