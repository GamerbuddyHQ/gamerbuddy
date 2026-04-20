import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";

function jsonMessage(msg: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ error: msg });
  };
}

// For user-authenticated routes: key by user ID.
// For unauthenticated fallback (belt-and-suspenders): use ipKeyGenerator
// so IPv6 addresses are normalised to their /64 subnet before hashing,
// preventing trivial bypass via address rotation.
function userOrIpKey(req: Request): string {
  const userId = (req as { user?: { id: number } }).user?.id;
  if (userId !== undefined) return `user:${userId}`;
  return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
}

// ── Login / Signup ─────────────────────────────────────────────────────────
// 5 per minute per IP — prevents credential stuffing and account farming.
// No custom keyGenerator: the library's default uses ipKeyGenerator internally.
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
// 5 per minute per user ID — bid routes already require auth.
export const bidLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("You're placing bids too quickly. Please wait a minute."),
});

// ── Community suggestions ──────────────────────────────────────────────────
// 5 per minute per user
export const suggestionLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("You're posting suggestions too quickly. Please wait a minute."),
});

// ── Community comments ─────────────────────────────────────────────────────
// 10 per minute per user
export const commentLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("You're commenting too quickly. Please wait a moment."),
});

// ── Chat messages ──────────────────────────────────────────────────────────
// 30 per minute per user — generous for real-time chat
export const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("You're sending messages too quickly. Please slow down."),
});

// ── Tournament creation ────────────────────────────────────────────────────
// 3 per minute per user
export const tournamentLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("You're creating tournaments too quickly. Please wait a minute."),
});

// ── Request creation ───────────────────────────────────────────────────────
// 5 per minute per user — prevents spamming the marketplace with fake requests
export const postRequestLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("You're posting requests too quickly. Please wait a minute."),
});

// ── Admin login ────────────────────────────────────────────────────────────
// 5 per 15 minutes per IP — strict limit to block brute-force on admin panel.
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonMessage("Too many admin login attempts. Please wait 15 minutes and try again."),
});

// ── Verification submission ────────────────────────────────────────────────
// 3 per hour per user — prevents flooding admin review queue.
export const verifyLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("Too many verification requests. Please wait an hour before trying again."),
});

// ── Withdrawal ─────────────────────────────────────────────────────────────
// 3 per 10-minute window per user — prevents DoS spam on the withdrawal route.
// The atomic SQL guard in the route already prevents actual double-deduction,
// but rate limiting reduces unnecessary DB load and log noise.
export const withdrawLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: jsonMessage("Too many withdrawal attempts. Please wait 10 minutes before trying again."),
});
