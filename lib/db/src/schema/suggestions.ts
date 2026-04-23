import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const suggestionsTable = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  category: text("category").notNull().default("other"),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const suggestionVotesTable = sqliteTable("suggestion_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  suggestionId: integer("suggestion_id").notNull().references(() => suggestionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  vote: text("vote").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const suggestionCommentsTable = sqliteTable("suggestion_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  suggestionId: integer("suggestion_id").notNull().references(() => suggestionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  isAdminComment: integer("is_admin_comment", { mode: "boolean" }).notNull().default(false),
  isModComment: integer("is_mod_comment", { mode: "boolean" }).notNull().default(false),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const moderatorActionsTable = sqliteTable("moderator_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moderatorId: integer("moderator_id").notNull().references(() => usersTable.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  meta: text("meta", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Suggestion = typeof suggestionsTable.$inferSelect;
export type SuggestionVote = typeof suggestionVotesTable.$inferSelect;
export type SuggestionComment = typeof suggestionCommentsTable.$inferSelect;
export type ModeratorAction = typeof moderatorActionsTable.$inferSelect;
