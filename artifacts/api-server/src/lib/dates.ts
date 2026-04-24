/**
 * Date utility helpers — safe across pg / @neondatabase/serverless Pool / neon-http.
 *
 * @neondatabase/serverless Pool returns timestamps as JavaScript Date objects
 * when used with Drizzle (same as pg). However, edge cases exist where some
 * columns can come back as ISO strings (e.g. after raw sql`` queries or when
 * the pg type parser is bypassed). These helpers handle both shapes safely.
 */

/** Convert a Date | ISO string | null | undefined to a JavaScript Date. */
export function toDate(val: Date | string | null | undefined): Date {
  if (val instanceof Date) return val;
  if (typeof val === "string" && val.length > 0) return new Date(val);
  return new Date(0);
}

/**
 * Convert a Date | ISO string | null | undefined to an ISO 8601 string.
 * Returns null when the input is nullish.
 */
export function toIso(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  return val.toISOString();
}

/**
 * Like toIso but never returns null — falls back to current time.
 * Use for required `createdAt` / `updatedAt` fields.
 */
export function toIsoRequired(val: Date | string | null | undefined): string {
  return toIso(val) ?? new Date().toISOString();
}
