import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "[gamerbuddy/db] CRITICAL: DATABASE_URL is not set. " +
    "All database operations will fail. " +
    "Set DATABASE_URL in your environment variables (Vercel dashboard for production).",
  );
}

export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, max: 3 })
  : null;

// @ts-ignore — pool is null only when DATABASE_URL is missing (startup warning above)
export const db = drizzle(pool ?? new Pool({ connectionString: "" }), { schema });

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
      "Add it to your Vercel environment variables and redeploy.",
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
