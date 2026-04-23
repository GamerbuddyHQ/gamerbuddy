import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Neon's serverless driver uses WebSocket. In Node.js < 22, there is no
// native globalThis.WebSocket, so we must provide the `ws` library.
// Setting this unconditionally is safe — on Node.js 22+ it's a no-op preference.
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "[gamerbuddy/db] CRITICAL: DATABASE_URL is not set. " +
    "All database operations will fail. " +
    "Set DATABASE_URL in Vercel dashboard (or your .env) and redeploy.",
  );
}

export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, max: 3 })
  : null;

export const db = drizzle(
  // @ts-ignore — pool may be null when DATABASE_URL is missing (warning logged above)
  pool ?? new Pool({ connectionString: "postgresql://placeholder:x@localhost/placeholder" }),
  { schema },
);

if (pool) {
  pool.on("error", (err: Error) => {
    console.error("[gamerbuddy/db] Pool error:", err.message);
  });
}

let _ready = false;

export async function ensureTablesCreated(): Promise<void> {
  if (_ready) return;
  if (!pool) {
    throw new Error(
      "[gamerbuddy/db] DATABASE_URL is not configured. " +
      "Add it to Vercel environment variables and redeploy.",
    );
  }
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() AS now");
    client.release();
    console.log(`[gamerbuddy/db] Neon connected ✓  server time: ${result.rows[0].now}`);
    _ready = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gamerbuddy/db] DB connection failed:", msg);
    throw err;
  }
}

export * from "./schema";
