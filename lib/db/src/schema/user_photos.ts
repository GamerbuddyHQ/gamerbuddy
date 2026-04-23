import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const userPhotosTable = sqliteTable("user_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  photoType: text("photo_type").notNull(),
  status: text("status").notNull().default("needs_review"),
  photoHash: text("photo_hash"),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type UserPhoto = typeof userPhotosTable.$inferSelect;
