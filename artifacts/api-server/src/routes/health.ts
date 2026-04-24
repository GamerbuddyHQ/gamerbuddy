import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Vercel diagnostic endpoint — exposes env-var presence so deployment issues
// are visible without needing to access the Vercel dashboard.
// Never exposes actual secret values, only booleans.
router.get("/healthz/env", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      NODE_ENV:            process.env.NODE_ENV ?? "undefined",
      VERCEL:              process.env.VERCEL ?? "undefined",
      DATABASE_URL_SET:    !!process.env.DATABASE_URL,
      SESSION_SECRET_SET:  !!process.env.SESSION_SECRET,
      RAZORPAY_KEY_ID_SET: !!process.env.RAZORPAY_KEY_ID,
      FRONTEND_URL:        process.env.FRONTEND_URL ?? "(not set)",
      ADMIN_SECRET_KEY_SET: !!process.env.ADMIN_SECRET_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

// Signup step-by-step diagnostic — runs each DB operation from the signup
// route and reports exactly which step fails, including raw neon() HTTP test.
// Remove this endpoint before going to stable production.
router.get("/healthz/signup-test", async (_req, res) => {
  const steps: string[] = [];
  try {
    // Reveal the URL hostname to verify it's a Neon endpoint (never the password)
    let urlHost: string | null = null;
    try { urlHost = new URL(process.env.DATABASE_URL ?? "").hostname; } catch { /* noop */ }
    steps.push(`urlHost: ${urlHost}`);

    // Step 1: raw neon() HTTP client — no Drizzle, no Pool
    steps.push("raw neon() HTTP: SELECT 1");
    const { neon: neonHttp } = await import("@neondatabase/serverless");
    const rawSql = neonHttp(process.env.DATABASE_URL!);
    const rawResult = await rawSql`SELECT 1 AS val`;
    steps.push(`raw neon HTTP ok: ${JSON.stringify(rawResult)}`);

    // Step 2: Drizzle ORM SELECT via neon-http
    steps.push("drizzle SELECT from users (limit 1)");
    const { db: dbRef, usersTable } = await import("@workspace/db");
    await dbRef.select({ id: usersTable.id }).from(usersTable).limit(1);
    steps.push("drizzle SELECT ok");

    // Step 3: raw pool INSERT rolled back
    if (pool) {
      steps.push("pool INSERT user + wallet (ROLLBACK)");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const r = await client.query(
          `INSERT INTO users (name, email, password_hash, phone, id_verified)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          ["__diag__", `diag_${Date.now()}@test.internal`, "x", "", false]
        );
        steps.push(`INSERT user ok — id=${r.rows[0].id}`);
        await client.query(
          `INSERT INTO wallets (user_id, hiring_balance, earnings_balance) VALUES ($1,0,0)`,
          [r.rows[0].id]
        );
        steps.push("INSERT wallet ok");
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }
    } else {
      steps.push("pool skipped (not initialised)");
    }

    res.json({ status: "all steps passed", steps });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as any)?.code ?? null;
    const cause = (err as any)?.cause
      ? String((err as any).cause?.message ?? (err as any).cause)
      : null;
    let urlHost: string | null = null;
    try { urlHost = new URL(process.env.DATABASE_URL ?? "").hostname; } catch { /* noop */ }
    res.status(500).json({ failedAt: steps[steps.length - 1], error: msg, code, cause, urlHost, steps });
  }
});

// DB connectivity diagnostic — runs a real SELECT against Neon and returns
// the exact error so deployment issues are diagnosable without Vercel logs.
router.get("/healthz/db", async (_req, res) => {
  if (!pool) {
    res.status(503).json({ status: "error", error: "DATABASE_URL is not set — pool not initialised" });
    return;
  }
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() AS ts, current_database() AS db");
    client.release();
    res.json({
      status: "ok",
      serverTime: result.rows[0].ts,
      database: result.rows[0].db,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as any)?.code ?? null;
    res.status(503).json({ status: "error", error: msg, code });
  }
});

export default router;
