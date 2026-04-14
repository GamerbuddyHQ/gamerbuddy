import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

function jsonMessage(msg: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ error: msg });
  };
}

// ── Login / Signup ─────────────────────────────────────────────────────────
// 5 per minute per IP — prevents credential stuffing and account farming
export const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonMessage("Too many login attempts. Please wait a minute and try again."),
});

export const signupLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonMessage("Too many signup attempts. Please wait a minute and try again."),
});

// ── Bid placement ──────────────────────────────────────────────────────────
// 5 per minute per user ID (falls back to IP for unauthenticated, though
// bid routes already require auth — this is a belt-and-suspenders guard)
export const bidLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as { user?: { id: number } }).user?.id ?? req.ip),
  handler: jsonMessage("You're placing bids too quickly. Please wait a minute."),
});

// ── Community suggestions ──────────────────────────────────────────────────
// 5 per minute per user — prevents suggestion spam
export const suggestionLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as { user?: { id: number } }).user?.id ?? req.ip),
  handler: jsonMessage("You're posting suggestions too quickly. Please wait a minute."),
});

// ── Community comments ─────────────────────────────────────────────────────
// 10 per minute per user
export const commentLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as { user?: { id: number } }).user?.id ?? req.ip),
  handler: jsonMessage("You're commenting too quickly. Please wait a moment."),
});

// ── Chat messages ──────────────────────────────────────────────────────────
// 30 per minute per user — generous for real-time chat
export const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as { user?: { id: number } }).user?.id ?? req.ip),
  handler: jsonMessage("You're sending messages too quickly. Please slow down."),
});

// ── Tournament creation ────────────────────────────────────────────────────
// 3 per minute per user — tournaments require wallet funds anyway, but still
export const tournamentLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as { user?: { id: number } }).user?.id ?? req.ip),
  handler: jsonMessage("You're creating tournaments too quickly. Please wait a minute."),
});
