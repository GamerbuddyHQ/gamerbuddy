import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // Log loudly to Vercel function logs but do NOT throw at import time.
  // Throwing here causes FUNCTION_INVOCATION_FAILED on cold-start before
  // any request is handled — the client sees a generic crash, not a 500.
  // Instead we let queries fail with a clear error caught by route try-catch.
  console.error(
    "[gamerbuddy] FATAL: DATABASE_URL is not set. " +
    "Add it in Vercel → Project Settings → Environment Variables. " +
    "All database queries will fail until it is set.",
  );
}

// Serverless-friendly pool: limit max connections per lambda instance so we
// don't exhaust the database when many invocations run in parallel.
// SSL is required for cloud Postgres providers (Neon, Supabase, Render, etc.).
const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "",
  max: isServerless ? 2 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: isServerless
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
