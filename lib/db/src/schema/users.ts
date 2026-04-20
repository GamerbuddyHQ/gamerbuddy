import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
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
  lockedUntil:   timestamp("locked_until", { withTimezone: true }),
  profilePhotoUrl: text("profile_photo_url"),
  galleryPhotoUrls: text("gallery_photo_urls").array().notNull().default([]),
  gamerbuddyId: text("gamerbuddy_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
