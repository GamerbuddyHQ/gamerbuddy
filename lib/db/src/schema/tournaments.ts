import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
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
  prizePool: numeric("prize_pool", { precision: 10, scale: 2 }).notNull(),
  entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  rules: text("rules").notNull(),
  prizeDistribution: text("prize_distribution").notNull(),
  status: text("status").notNull().default("open"),
  winnersData: text("winners_data"),
  platformFeeCollected: numeric("platform_fee_collected", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const tournamentRegistrationsTable = pgTable("tournament_registrations", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournamentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  userName: text("user_name").notNull(),
  status: text("status").notNull().default("registered"),
  placement: integer("placement"),
  prizeWon: numeric("prize_won", { precision: 10, scale: 2 }),
  entryFeePaid: numeric("entry_fee_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});
