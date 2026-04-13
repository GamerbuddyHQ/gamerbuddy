import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const gameRequestsTable = pgTable("game_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  gameName: text("game_name").notNull(),
  platform: text("platform").notNull(),
  skillLevel: text("skill_level").notNull(),
  objectives: text("objectives").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGameRequestSchema = createInsertSchema(gameRequestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGameRequest = z.infer<typeof insertGameRequestSchema>;
export type GameRequest = typeof gameRequestsTable.$inferSelect;
