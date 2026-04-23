import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  officialIdPath: text("official_id_path"),
  idVerified: integer("id_verified", { mode: "boolean" }).notNull().default(false),
  points: integer("points").notNull().default(0),
  bio: text("bio"),
  trustFactor: integer("trust_factor").notNull().default(50),
  profileBackground: text("profile_background"),
  profileTitle: text("profile_title"),
  country: text("country"),
  gender: text("gender"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
  profilePhotoUrl: text("profile_photo_url"),
  galleryPhotoUrls: text("gallery_photo_urls", { mode: "json" }).$type<string[]>().notNull().default([]),
  gamerbuddyId: text("gamerbuddy_id").unique(),
  communityBanned: integer("community_banned", { mode: "boolean" }).notNull().default(false),
  isModerator: integer("is_moderator", { mode: "boolean" }).notNull().default(false),
  moderatorAppointedAt: integer("moderator_appointed_at", { mode: "timestamp" }),
  trustScore: integer("trust_score").notNull().default(0),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  phoneVerified: integer("phone_verified", { mode: "boolean" }).notNull().default(false),
  isActivated: integer("is_activated", { mode: "boolean" }).notNull().default(false),
  activationRegion: text("activation_region"),
  activationPaidAt: integer("activation_paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
