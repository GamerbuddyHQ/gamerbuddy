/**
 * Date utility helpers — safe across pg / @neondatabase/serverless Pool / neon-http.
 *
 * @neondatabase/serverless neon-http returns timestamp columns as invalid Date
 * objects in some driver versions. These helpers guard against that by using
 * `isNaN(val.getTime())` before calling `.toISOString()`.
 */

/** Convert a Date | ISO string | null | undefined to a JavaScript Date. */
export function toDate(val: Date | string | null | undefined): Date {
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date(0) : val;
  if (typeof val === "string" && val.length > 0) return new Date(val);
  return new Date(0);
}

/**
 * Convert a Date | ISO string | null | undefined to an ISO 8601 string.
 * Returns null when the input is nullish or an invalid Date.
 */
export function toIso(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  const t = val.getTime();
  return isNaN(t) ? null : val.toISOString();
}

/**
 * Like toIso but never returns null — falls back to current time.
 * Use for required `createdAt` / `updatedAt` fields.
 */
export function toIsoRequired(val: Date | string | null | undefined): string {
  return toIso(val) ?? new Date().toISOString();
}
