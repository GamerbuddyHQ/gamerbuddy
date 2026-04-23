import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./lib/security-headers";

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

  logger.error({ err, url: req.url, method: req.method, status }, "Unhandled request error");

  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
});

export default app;
