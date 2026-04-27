import { neon, Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import * as schema from "./schema";

// Neon WebSocket pool — used only for raw SQL diagnostics (healthz/db, ensureTablesCreated).
// All Drizzle ORM queries use the HTTP transport (neon-http) instead, which is the
// correct driver for Vercel/edge serverless environments.  WebSocket pools need a
// persistent process, which serverless functions don't guarantee.
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "[gamerbuddy/db] CRITICAL: DATABASE_URL is not set. " +
    "All database operations will fail. " +
    "Set DATABASE_URL in Vercel dashboard (or your .env) and redeploy.",
  );
}

// HTTP client — one-shot HTTP request per query, ideal for serverless.
const rawSql = DATABASE_URL
  ? neon(DATABASE_URL)
  : neon("postgresql://placeholder:x@placeholder/placeholder");

// Workaround for @neondatabase/serverless@1.1.0 bug:
// When a SELECT returns 0 rows the HTTP API returns `{fields: null}` instead of
// `{fields: []}`.  The driver's internal processQueryResult then crashes with
// "TypeError: Cannot read properties of null (reading 'map')".
// Intercept that specific rejection at the client level and return an empty
// result object that is structurally compatible with `fullResults: true` mode
// (the only mode Drizzle neon-http uses).
const NEON_EMPTY_RESULT = Object.freeze({
  command: "SELECT", fields: [] as const, rowCount: 0, rows: [] as const,
  viaNeonFetch: true, rowAsArray: false,
});
function isNeonEmptyResultBug(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  return (err.message ?? "").includes("Cannot read properties of null (reading 'map')");
}
function patchPromise(result: unknown): unknown {
  if (result && typeof (result as Promise<unknown>).catch === "function") {
    return (result as Promise<unknown>).catch((err: unknown) => {
      if (isNeonEmptyResultBug(err)) return NEON_EMPTY_RESULT;
      throw err;
    });
  }
  return result;
}

const sql = new Proxy(rawSql, {
  apply(target, thisArg, args) {
    return patchPromise(Reflect.apply(target, thisArg, args));
  },
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    // Drizzle neon-http uses `client.query ?? client` as its actual query executor.
    // We must also patch the `.query` method so empty-result errors are handled there.
    if (prop === "query" && typeof value === "function") {
      return (...args: unknown[]) => patchPromise((value as (...a: unknown[]) => unknown)(...args));
    }
    return value;
  },
}) as typeof rawSql;

export const db = drizzle(sql, { schema });

// Keep pool for raw-SQL diagnostics (healthz/db, ensureTablesCreated).
export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, max: 3 })
  : null;

if (pool) {
  pool.on("error", (err: Error) => {
    console.error("[gamerbuddy/db] Pool error:", err.message);
  });
}

let _ready = false;

export async function ensureTablesCreated(): Promise<void> {
  if (_ready) return;
  try {
    const result = await sql`SELECT NOW() AS now`;
    console.log(`[gamerbuddy/db] Neon connected ✓  server time: ${result[0].now}`);
    _ready = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gamerbuddy/db] DB connection failed:", msg);
    throw err;
  }
}

export * from "./schema";
