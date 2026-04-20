/**
 * Admin authentication — separate from regular user sessions.
 * Requires: email + bcrypt password (two factors).
 * Session stored as an HMAC-signed cookie — no DB table needed.
 */

import { Router, type RequestHandler } from "express";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { adminLoginLimiter } from "../lib/rate-limit";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

const ADMIN_EMAIL    = "gamerbuddyhq@gmail.com";
const ADMIN_PWD_HASH = process.env.ADMIN_PWD_HASH ?? process.env.ADMIN_PASSWORD_HASH ?? "";
const SIGNING_KEY    = process.env.ADMIN_SECRET_KEY ?? "fallback-signing-key-change-in-prod";
const SESSION_HOURS  = 8;

/* ── Token helpers ──────────────────────────────────────────────────────── */

function signAdminToken(): string {
  const exp     = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = `admin.${exp}`;
  const sig     = crypto
    .createHmac("sha256", SIGNING_KEY)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [prefix, expStr, sig] = parts;
  const payload  = `${prefix}.${expStr}`;
  const expected = crypto
    .createHmac("sha256", SIGNING_KEY)
    .update(payload)
    .digest("hex");
  try {
    const sigBuf = Buffer.from(sig,      "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  } catch {
    return false;
  }
  return Date.now() < parseInt(expStr, 10);
}

/* ── Middleware ─────────────────────────────────────────────────────────── */

export const requireAdminAuth: RequestHandler = (req, res, next) => {
  const token = (req.cookies as Record<string, string>)?.admin_token;
  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
};

/* ── Cookie options ─────────────────────────────────────────────────────── */

function adminCookieOpts(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    secure:   isProd,
    expires:  expiresAt,
    path:     "/",
  };
}

/* ── POST /admin/auth/login ─────────────────────────────────────────────── */

router.post("/admin/auth/login", adminLoginLimiter, async (req, res): Promise<void> => {
  const { email, password } = req.body as {
    email?:    string;
    password?: string;
  };

  if (!ADMIN_PWD_HASH) {
    res.status(503).json({
      error: "Admin authentication is not configured. Set ADMIN_PWD_HASH environment variable.",
    });
    return;
  }

  const emailOk = (email?.toLowerCase().trim() ?? "") === ADMIN_EMAIL;
  let   pwdOk   = false;
  try {
    pwdOk = await bcryptjs.compare(password ?? "", ADMIN_PWD_HASH);
  } catch {
    // leave pwdOk = false
  }

  if (!emailOk || !pwdOk) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  const token     = signAdminToken();
  res.cookie("admin_token", token, adminCookieOpts(expiresAt));
  req.log?.info({ action: "admin_login" }, "Admin login successful");
  res.json({ success: true, expiresAt: expiresAt.toISOString() });
});

/* ── POST /admin/auth/logout ────────────────────────────────────────────── */

router.post("/admin/auth/logout", (_req, res): void => {
  res.clearCookie("admin_token", { path: "/" });
  res.json({ success: true });
});

/* ── GET /admin/auth/me ─────────────────────────────────────────────────── */

router.get("/admin/auth/me", (req, res): void => {
  const token = (req.cookies as Record<string, string>)?.admin_token;
  res.json({ isAdmin: !!(token && verifyAdminToken(token)) });
});

export default router;
