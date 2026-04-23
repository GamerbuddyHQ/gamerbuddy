import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const tournamentsTable = sqliteTable("tournaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const tournamentRegistrationsTable = sqliteTable("tournament_registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tournamentId: integer("tournament_id").notNull().references(() => tournamentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  userName: text("user_name").notNull(),
  status: text("status").notNull().default("pending"),
  placement: integer("placement"),
  prizeWon: real("prize_won"),
  entryFeePaid: real("entry_fee_paid").notNull().default(0),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
