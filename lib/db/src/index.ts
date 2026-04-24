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
const sql = DATABASE_URL
  ? neon(DATABASE_URL)
  : neon("postgresql://placeholder:x@placeholder/placeholder");

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
