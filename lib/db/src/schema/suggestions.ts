import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  category: text("category").notNull().default("other"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suggestionVotesTable = pgTable("suggestion_votes", {
  id: serial("id").primaryKey(),
  suggestionId: integer("suggestion_id").notNull().references(() => suggestionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  vote: text("vote").notNull(), // 'up' | 'down'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suggestionCommentsTable = pgTable("suggestion_comments", {
  id: serial("id").primaryKey(),
  suggestionId: integer("suggestion_id").notNull().references(() => suggestionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  isAdminComment: boolean("is_admin_comment").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Suggestion = typeof suggestionsTable.$inferSelect;
export type SuggestionVote = typeof suggestionVotesTable.$inferSelect;
export type SuggestionComment = typeof suggestionCommentsTable.$inferSelect;
