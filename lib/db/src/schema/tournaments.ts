import { pgTable, integer, text, real, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  gameName: text("game_name").notNull(),
  platform: text("platform").notNull(),
  tournamentType: text("tournament_type").notNull(),
  maxPlayers: integer("max_players").notNull(),
  currentPlayers: integer("current_players").notNull().default(0),
  prizePool: real("prize_pool").notNull(),
  entryFee: real("entry_fee").notNull().default(0),
  rules: text("rules").notNull(),
  prizeDistribution: text("prize_distribution").notNull(),
  status: text("status").notNull().default("open"),
  winnersData: text("winners_data"),
  platformFeeCollected: real("platform_fee_collected"),
  country: text("country").notNull().default("any"),
  region: text("region").notNull().default("any"),
  genderPreference: text("gender_preference").notNull().default("any"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const tournamentRegistrationsTable = pgTable("tournament_registrations", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournamentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  userName: text("user_name").notNull(),
  status: text("status").notNull().default("pending"),
  placement: integer("placement"),
  prizeWon: real("prize_won"),
  entryFeePaid: real("entry_fee_paid").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
