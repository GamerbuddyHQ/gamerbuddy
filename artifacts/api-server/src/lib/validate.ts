import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// ─── HTML entity escaping ────────────────────────────────────────────────────
// React auto-escapes JSX, but we sanitize on the server as defence-in-depth so
// that content stored in the DB is always safe for any future renderer.
const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

// Sanitize a plain-text field (no embedded markup allowed at all).
export function sanitize(str: string): string {
  return escapeHtml(str.trim());
}

// Strip bare URLs from plain text (business rule: no link promotion in posts/comments)
const LINK_RE = /(?:https?:\/\/\S+|www\.\S+|\b\S+\.(?:com|net|org|io|co|app|gg|tv|me|ly|link|xyz|info|gov|edu)(?:\/\S*)?)/gi;
function stripLinks(text: string): string {
  return text.replace(LINK_RE, "").replace(/ {2,}/g, " ").trim();
}

// Sanitize a community comment body that may contain [gif:URL] markers.
// Rules:
//   1. Only Tenor media URLs are allowed inside gif markers.
//   2. Everything outside markers has bare URLs stripped, then gets HTML-escaped.
//   3. Emoji characters pass through untouched (plain text codepoints).
const GIF_MARKER_RE = /\[gif:(https?:\/\/[^\]]{1,512})\]/g;
const TENOR_ORIGIN_RE = /^https:\/\/media\.tenor\.com\//;

export function sanitizeComment(raw: string): string {
  const segments: string[] = [];
  let lastIndex = 0;

  for (const match of raw.matchAll(GIF_MARKER_RE)) {
    const url = match[1];
    const start = match.index!;

    // Strip links + escape the plain text before this marker
    if (start > lastIndex) {
      segments.push(escapeHtml(stripLinks(raw.slice(lastIndex, start))));
    }

    // Only preserve the marker if it's a genuine Tenor media URL
    if (TENOR_ORIGIN_RE.test(url)) {
      segments.push(`[gif:${url}]`);
    }
    // Otherwise drop the marker silently

    lastIndex = start + match[0].length;
  }

  // Remaining text after the last marker
  if (lastIndex < raw.length) {
    segments.push(escapeHtml(stripLinks(raw.slice(lastIndex))));
  }

  return segments.join("").trim();
}

// For plain suggestion text — strip links then escape HTML
export function sanitizeSuggestionText(text: string): string {
  return escapeHtml(stripLinks(text));
}

// ─── Zod validation middleware factory ───────────────────────────────────────
export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.length ? e.path.join(".") + ": " : ""}${e.message}`)
        .join("; ");
      res.status(400).json({ error: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ─── Shared field helpers ─────────────────────────────────────────────────────
const trimmedStr = (min: number, max: number, label: string) =>
  z.string({ required_error: `${label} is required` })
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .transform((s) => s.trim());

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const SignupSchema = z.object({
  name:     trimmedStr(2, 80, "Name"),
  email:    z.string().email("Invalid email address").max(254).toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
  phone:    trimmedStr(7, 20, "Phone number"),
});

export const LoginSchema = z.object({
  email:    z.string().email("Invalid email address").max(254).toLowerCase().trim(),
  password: z.string().min(1, "Password is required").max(128),
});

// ─── Game requests ────────────────────────────────────────────────────────────
const VALID_PLATFORMS    = ["PC", "PS5", "Xbox", "Mobile", "Switch", "PS4", "Xbox One", "Other"] as const;
const VALID_SKILL_LEVELS = ["Beginner-Friendly", "Intermediate", "Expert", "Chill"] as const;
const VALID_GEO_GENDERS  = ["any", "male", "female", "non_binary", "no_say"] as const;

const VALID_EXPIRY_OPTIONS = ["forever", "24h", "48h", "7d"] as const;

export const PostRequestSchema = z.object({
  gameName:         trimmedStr(1, 80, "Game name"),
  platform:         z.enum(VALID_PLATFORMS,    { errorMap: () => ({ message: "Invalid platform" }) }),
  skillLevel:       z.enum(VALID_SKILL_LEVELS, { errorMap: () => ({ message: "Invalid skill level" }) }),
  objectives:       trimmedStr(10, 500, "Objectives"),
  isBulkHiring:     z.boolean().optional().default(false),
  bulkGamersNeeded: z.number().int().min(3).max(100).optional(),
  preferredCountry: z.string().max(60).optional().default("any"),
  preferredGender:  z.enum(VALID_GEO_GENDERS).optional().default("any"),
  expiryOption:     z.enum(VALID_EXPIRY_OPTIONS).optional().default("forever"),
}).refine(
  (d) => !d.isBulkHiring || (d.bulkGamersNeeded !== undefined && d.bulkGamersNeeded >= 3),
  { message: "Bulk hiring requires 3–100 gamers", path: ["bulkGamersNeeded"] },
);

// ─── Bids ─────────────────────────────────────────────────────────────────────
export const PlaceBidSchema = z.object({
  price:   z.number({ invalid_type_error: "Price must be a number" })
             .positive("Price must be positive")
             .max(9999, "Price cannot exceed $9,999"),
  message: trimmedStr(5, 500, "Bid message"),
});

// ─── Chat messages ────────────────────────────────────────────────────────────
export const PostMessageSchema = z.object({
  content: trimmedStr(1, 2000, "Message"),
});

// ─── Community suggestions ────────────────────────────────────────────────────
const VALID_CATEGORIES = ["feature", "bug", "ui", "other"] as const;

export const PostSuggestionSchema = z.object({
  title:    trimmedStr(5, 120, "Title"),
  body:     trimmedStr(10, 1000, "Body"),
  category: z.enum(VALID_CATEGORIES).optional().default("other"),
});

// ─── Community comments ───────────────────────────────────────────────────────
export const PostCommentSchema = z.object({
  body:     z.string().min(1, "Comment body is required").max(500, "Comment must be 500 characters or less"),
  parentId: z.number().int().positive().nullable().optional(),
});

// ─── Profile update ───────────────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  bio:               z.string().max(500, "Bio too long (max 500 chars)").optional().nullable(),
  country:           z.string().max(60).optional().nullable(),
  gender:            z.enum(VALID_GEO_GENDERS).optional().nullable(),
  profileBackground: z.string().max(100).optional().nullable(),
  profileTitle:      z.string().max(100).optional().nullable(),
});

// ─── Quest entries ────────────────────────────────────────────────────────────
export const PostQuestSchema = z.object({
  gameName:  trimmedStr(1, 60, "Game name"),
  helpType:  trimmedStr(1, 100, "Help type"),
  playstyle: trimmedStr(1, 60, "Playstyle"),
});

// ─── Tournaments ──────────────────────────────────────────────────────────────
const VALID_TOURNAMENT_TYPES   = ["h2h", "squad", "ffa"] as const;
const VALID_REGIONS            = ["any", "Asia", "North America", "Europe", "South America", "Middle East", "Africa", "Oceania", "Other"] as const;
const VALID_TOURNAMENT_GENDERS = ["any", "male", "female", "non_binary", "no_say"] as const;

export const PostTournamentSchema = z.object({
  title:            trimmedStr(3, 100, "Title"),
  gameName:         trimmedStr(1, 80,  "Game name"),
  platform:         trimmedStr(1, 40,  "Platform"),
  tournamentType:   z.enum(VALID_TOURNAMENT_TYPES, { errorMap: () => ({ message: "Invalid tournament type" }) }),
  maxPlayers:       z.coerce.number().int().min(2, "Minimum 2 players").max(100, "Maximum 100 players"),
  prizePool:        z.coerce.number().positive("Prize pool must be positive").min(100, "Minimum prize pool is $100").max(10000, "Maximum prize pool is $10,000"),
  rules:            trimmedStr(10, 2000, "Rules"),
  prizeDistribution: z.string().max(500).optional(),
  country:          z.string().max(60).default("any"),
  region:           z.enum(VALID_REGIONS,            { errorMap: () => ({ message: "Invalid region" }) }).default("any"),
  genderPreference: z.enum(VALID_TOURNAMENT_GENDERS, { errorMap: () => ({ message: "Invalid gender preference" }) }).default("any"),
});
