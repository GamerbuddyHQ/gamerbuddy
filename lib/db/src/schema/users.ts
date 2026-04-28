import { pgTable, text, integer, boolean, timestamp, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  officialIdPath: text("official_id_path"),
  idVerified: boolean("id_verified").notNull().default(false),
  points: integer("points").notNull().default(0),
  bio: text("bio"),
  trustFactor: integer("trust_factor").notNull().default(50),
  profileBackground: text("profile_background"),
  profileTitle: text("profile_title"),
  country: text("country"),
  gender: text("gender"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  profilePhotoUrl: text("profile_photo_url"),
  galleryPhotoUrls: jsonb("gallery_photo_urls").$type<string[]>().notNull().default([]),
  gamerbuddyId: text("gamerbuddy_id").unique(),
  communityBanned: boolean("community_banned").notNull().default(false),
  isModerator: boolean("is_moderator").notNull().default(false),
  moderatorAppointedAt: timestamp("moderator_appointed_at"),
  trustScore: integer("trust_score").notNull().default(0),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  isActivated: boolean("is_activated").notNull().default(false),
  activationRegion: text("activation_region"),
  activationPaidAt: timestamp("activation_paid_at"),
  strikes: integer("strikes").notNull().default(0),
  flaggedForBan: boolean("flagged_for_ban").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
