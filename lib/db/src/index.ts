import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("[gamerbuddy/db] DATABASE_URL is not set — ensure the database is provisioned");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[gamerbuddy/db] Unexpected pool client error:", err.message);
});

export const db = drizzle(pool, { schema });

let _ready = false;

export async function ensureTablesCreated(): Promise<void> {
  if (_ready) return;
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() AS now");
    client.release();
    console.log(`[gamerbuddy/db] Neon PostgreSQL connected. Server time: ${result.rows[0].now}`);
    _ready = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gamerbuddy/db] Failed to connect to database:", msg);
    throw err;
  }
}

export * from "./schema";
