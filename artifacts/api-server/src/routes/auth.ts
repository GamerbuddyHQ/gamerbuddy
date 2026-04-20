import { Router, type IRouter } from "express";
import multer from "multer";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, walletsTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { SignupSchema, LoginSchema, sanitize, validate } from "../lib/validate";
import { loginLimiter, signupLimiter } from "../lib/rate-limit";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

// Cross-origin split deployment (Vercel frontend ↔ Railway backend) requires
// SameSite=None; Secure so the browser sends the cookie across origins.
// In development (same origin) SameSite=Lax is correct and doesn't need HTTPS.
function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    secure: isProd,
    expires: expiresAt,
  };
}

function formatUser(user: {
  id: number;
  name: string;
  email: string;
  phone: string;
  idVerified: boolean;
  officialIdPath?: string | null;
  points: number;
  profileBackground?: string | null;
  profileTitle?: string | null;
  country?: string | null;
  gender?: string | null;
  gamerbuddyId?: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    idVerified: user.idVerified,
    officialIdPath: user.officialIdPath ?? null,
    points: user.points,
    profileBackground: user.profileBackground ?? null,
    profileTitle: user.profileTitle ?? null,
    country: user.country ?? null,
    gender: user.gender ?? null,
    gamerbuddyId: user.gamerbuddyId ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post(
  "/auth/signup",
  signupLimiter,
  upload.single("officialId"),
  async (req, res): Promise<void> => {
    // Validate with Zod after multer has parsed multipart body
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join("; ");
      res.status(400).json({ error: errors });
      return;
    }
    const { name, email, password, phone } = parsed.data;

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const officialIdPath = req.file ? `uploads/${req.file.originalname}` : null;

    const [user] = await db
      .insert(usersTable)
      .values({
        name: sanitize(name),
        email,
        passwordHash,
        phone: sanitize(phone),
        officialIdPath,
        idVerified: false,
      })
      .returning();

    // Generate deterministic GB-XXXXXX ID from the auto-incremented user id
    const gamerbuddyId = `GB-${String(user.id).padStart(6, "0")}`;
    await db.update(usersTable).set({ gamerbuddyId }).where(eq(usersTable.id, user.id));
    user.gamerbuddyId = gamerbuddyId;

    await db.insert(walletsTable).values({
      userId: user.id,
      hiringBalance: 0,
      earningsBalance: 0,
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

    res.cookie("session_token", token, sessionCookieOptions(expiresAt));

    req.log.info({ userId: user.id }, "User signed up");
    res.status(201).json({
      user: formatUser(user),
      message: "Account created successfully",
    });
  },
);

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

router.post("/auth/login", loginLimiter, validate(LoginSchema), async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  // Always run a bcrypt comparison even if user not found — prevents timing attacks
  // that would let an attacker enumerate valid email addresses by response time.
  const dummyHash = "$2b$10$dummyhashfortimingprotectiononly.............";
  const passwordToCheck = user ? user.passwordHash : dummyHash;
  const valid = await bcryptjs.compare(password, passwordToCheck);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // ── Account lockout check ──────────────────────────────────────────────
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const secondsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    const minutesLeft = Math.ceil(secondsLeft / 60);
    req.log.warn({ userId: user.id }, "Login attempt on locked account");
    res.status(423).json({
      error: `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      lockedUntil: user.lockedUntil.toISOString(),
    });
    return;
  }

  if (!valid) {
    // Increment failed attempts; lock account if threshold reached
    const newAttempts = (user.loginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await db
      .update(usersTable)
      .set({ loginAttempts: newAttempts, lockedUntil })
      .where(eq(usersTable.id, user.id));

    req.log.warn({ userId: user.id, attempts: newAttempts, locked: shouldLock }, "Failed login attempt");

    if (shouldLock) {
      res.status(423).json({
        error: `Too many failed login attempts. Your account has been locked for 15 minutes.`,
        lockedUntil: lockedUntil!.toISOString(),
      });
    } else {
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
      res.status(401).json({
        error: `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before account lockout.`,
        attemptsRemaining: remaining,
      });
    }
    return;
  }

  // ── Successful login — reset lockout counters ──────────────────────────
  if (user.loginAttempts > 0 || user.lockedUntil) {
    await db
      .update(usersTable)
      .set({ loginAttempts: 0, lockedUntil: null })
      .where(eq(usersTable.id, user.id));
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  res.cookie("session_token", token, sessionCookieOptions(expiresAt));

  req.log.info({ userId: user.id }, "User logged in");
  res.json({
    user: formatUser(user),
    message: "Logged in successfully",
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.["session_token"] as string | undefined;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  // Must pass matching SameSite/Secure options so browser actually clears the
  // cross-origin cookie in production. Without these, logout silently fails.
  res.clearCookie("session_token", {
    httpOnly: true,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    secure: isProd,
  });
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const token = req.cookies?.["session_token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
