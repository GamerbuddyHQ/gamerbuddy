import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

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

export default router;
