import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userPhotosTable = pgTable("user_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  photoType: text("photo_type").notNull(), // "profile" | "gallery"
  status: text("status").notNull().default("needs_review"), // needs_review | approved | rejected
  photoHash: text("photo_hash"), // SHA-256 hex of file content — for duplicate detection
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserPhoto = typeof userPhotosTable.$inferSelect;
