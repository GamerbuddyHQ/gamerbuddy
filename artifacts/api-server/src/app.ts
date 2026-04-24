import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./lib/security-headers";
import { ensureTablesCreated } from "@workspace/db";

// ── Startup diagnostic log ────────────────────────────────────────────────────
// Runs once on cold-start. Visible in Vercel function logs.
console.log("[gamerbuddy:startup]", JSON.stringify({
  NODE_ENV:            process.env.NODE_ENV,
  VERCEL:              process.env.VERCEL,
  DATABASE_URL_SET:    !!process.env.DATABASE_URL,
  SESSION_SECRET_SET:  !!process.env.SESSION_SECRET,
  RAZORPAY_KEY_ID_SET: !!process.env.RAZORPAY_KEY_ID,
  FRONTEND_URL:        process.env.FRONTEND_URL ?? "(not set)",
}));

const app: Express = express();

// Replit (and most hosting providers) run behind a reverse proxy.
// This tells Express to trust the X-Forwarded-For header so that
// req.ip resolves to the real client IP, and express-rate-limit
// works correctly for IP-based limiting.
app.set("trust proxy", 1);

// ── Security headers — must be first so every response is covered ───────────
app.use(securityHeaders);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// In production, FRONTEND_URL must be set to the Vercel domain so cookies work
// correctly across origins. In dev, origin:true reflects the request origin.
const corsOrigin = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Non-blocking DB readiness check ─────────────────────────────────────────
// Fire-and-forget on module load: ensures tables exist and warms the
// WebSocket connection. Individual route handlers have their own try/catch,
// so we do NOT block every request with this check.
ensureTablesCreated().catch((err) => {
  console.error("[gamerbuddy:db-init-error]", err);
});

app.use("/api", router);

// ── Global JSON error handler — MUST be last ────────────────────────────────
// Express identifies error handlers by their 4-argument signature.
// Without this, unhandled errors render an HTML page that the frontend
// cannot parse, causing "Unknown error occurred" on the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status: number =
    typeof (err as any).status === "number"
      ? (err as any).status
      : typeof (err as any).statusCode === "number"
        ? (err as any).statusCode
        : 500;

  const message =
    status < 500
      ? err.message || "Bad request"
      : "Internal server error";

  // console.error ensures visibility in Vercel's function log even if pino fails.
  console.error("[gamerbuddy:error]", req.method, req.url, "status:", status, err);
  logger.error({ err, url: req.url, method: req.method, status }, "Unhandled request error");

  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
});

export default app;
