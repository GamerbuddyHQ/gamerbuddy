import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const reportsTable = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterId: integer("reporter_id").notNull().references(() => usersTable.id),
  reportedUserId: integer("reported_user_id").notNull().references(() => usersTable.id),
  reason: text("reason").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Report = typeof reportsTable.$inferSelect;
