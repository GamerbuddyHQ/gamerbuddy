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

// DB connectivity diagnostic — runs a real SELECT 1 against Neon and returns
// the exact error message so we can diagnose connection issues without needing
// Vercel's log panel. Never exposes credentials.
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
