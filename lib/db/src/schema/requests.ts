import { pgTable, integer, text, real, boolean, timestamp, serial } from "drizzle-orm/pg-core";
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
  escrowAmount: real("escrow_amount"),
  acceptedBidId: integer("accepted_bid_id"),
  startedAt: timestamp("started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isBulkHiring: boolean("is_bulk_hiring").notNull().default(false),
  bulkGamersNeeded: integer("bulk_gamers_needed"),
  preferredCountry: text("preferred_country").default("any"),
  preferredGender: text("preferred_gender").default("any"),
  expiresAt: timestamp("expires_at"),
  hirerRegion: text("hirer_region").notNull().default("international"),
  sessionHours: integer("session_hours"),
  additionalGoals: text("additional_goals"),
  expectedDuration: text("expected_duration"),
  playStyle: text("play_style"),
});

export const insertGameRequestSchema = createInsertSchema(gameRequestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGameRequest = z.infer<typeof insertGameRequestSchema>;
export type GameRequest = typeof gameRequestsTable.$inferSelect;
