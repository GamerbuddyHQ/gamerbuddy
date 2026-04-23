import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userPhotosTable = pgTable("user_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  photoType: text("photo_type").notNull(),
  status: text("status").notNull().default("needs_review"),
  photoHash: text("photo_hash"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export type UserPhoto = typeof userPhotosTable.$inferSelect;
