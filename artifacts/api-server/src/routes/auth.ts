import { Router, type IRouter } from "express";
import multer from "multer";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, walletsTable, sessionsTable, gamingAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { SignupSchema, LoginSchema, sanitize, validate } from "../lib/validate";
import { loginLimiter, signupLimiter } from "../lib/rate-limit";
import { toDate, toIso, toIsoRequired } from "../lib/dates";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const SESSION_DURATION_MS         = 7  * 24 * 60 * 60 * 1000; // 7 days  (default)
const REMEMBER_ME_DURATION_MS     = 30 * 24 * 60 * 60 * 1000; // 30 days (remember me)

// The frontend (gamerbuddy-frontend.vercel.app) and API (gamerbuddy-api-server.vercel.app)
// are on different subdomains of vercel.app, which is a Public Suffix — so browsers treat
// them as cross-site. SameSite=None;Secure is required for the session cookie to be sent
// on cross-origin requests from the frontend. In development (HTTP) we fall back to Lax.
const isHttps =
  process.env.NODE_ENV === "production" ||
  !!process.env.VERCEL ||
  process.env.HTTPS === "true";

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    secure: isHttps,
    expires: expiresAt,
    path: "/",
  };
}

type DbUser = typeof usersTable.$inferSelect;

function formatUser(user: DbUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    idVerified: user.idVerified,
    officialIdPath: user.officialIdPath ?? null,
    points: user.points ?? 0,
    trustScore: user.trustScore ?? 0,
    trustFactor: user.trustFactor ?? 50,
    profileBackground: user.profileBackground ?? null,
    profileTitle: user.profileTitle ?? null,
    country: user.country ?? null,
    gender: user.gender ?? null,
    gamerbuddyId: user.gamerbuddyId ?? null,
    emailVerified: user.emailVerified ?? false,
    phoneVerified: user.phoneVerified ?? false,
    isActivated: user.isActivated ?? false,
    activationRegion: user.activationRegion ?? null,
    // toIsoRequired handles both Date objects and ISO strings from the DB driver
    createdAt: toIsoRequired(user.createdAt),
  };
}

// ── Signup ─────────────────────────────────────────────────────────────────────
router.post(
  "/auth/signup",
  signupLimiter,
  upload.single("officialId"),
  async (req, res): Promise<void> => {
    try {
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
    } catch (err) {
      req.log.error({ err }, "Signup error");
      const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
      res.status(status < 500 ? status : 500).json({
        error: status < 500
          ? (err as Error).message
          : "Account creation failed. Please try again.",
      });
    }
  },
);

// ── Login ──────────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

router.post(
  "/auth/login",
  loginLimiter,
  validate(LoginSchema),
  async (req, res): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      // Always run bcrypt even when user not found — prevents timing-attack enumeration
      const dummyHash = "$2b$10$dummyhashfortimingprotectiononly.............";
      const passwordToCheck = user ? user.passwordHash : dummyHash;
      const valid = await bcryptjs.compare(password, passwordToCheck);

      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Account lockout check — compare via toDate() to handle string or Date
      const lockedUntilDate = user.lockedUntil ? toDate(user.lockedUntil) : null;
      if (lockedUntilDate && lockedUntilDate > new Date()) {
        const secondsLeft = Math.ceil((lockedUntilDate.getTime() - Date.now()) / 1000);
        const minutesLeft = Math.ceil(secondsLeft / 60);
        req.log.warn({ userId: user.id }, "Login attempt on locked account");
        res.status(423).json({
          error: `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
          lockedUntil: lockedUntilDate.toISOString(),
        });
        return;
      }

      if (!valid) {
        const newAttempts = (user.loginAttempts ?? 0) + 1;
        const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
        const lockDate = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

        await db
          .update(usersTable)
          .set({ loginAttempts: newAttempts, lockedUntil: lockDate })
          .where(eq(usersTable.id, user.id));

        req.log.warn({ userId: user.id, attempts: newAttempts, locked: shouldLock }, "Failed login attempt");

        if (shouldLock) {
          res.status(423).json({
            error: `Too many failed attempts. Your account is locked for 15 minutes.`,
            lockedUntil: lockDate!.toISOString(),
          });
        } else {
          const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
          res.status(401).json({
            error: `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`,
            attemptsRemaining: remaining,
          });
        }
        return;
      }

      // Successful login — reset lockout counters
      if ((user.loginAttempts ?? 0) > 0 || user.lockedUntil) {
        await db
          .update(usersTable)
          .set({ loginAttempts: 0, lockedUntil: null })
          .where(eq(usersTable.id, user.id));
      }

      const rememberMe = req.body.rememberMe === true;
      const durationMs = rememberMe ? REMEMBER_ME_DURATION_MS : SESSION_DURATION_MS;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + durationMs);
      await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

      res.cookie("session_token", token, sessionCookieOptions(expiresAt));

      req.log.info({ userId: user.id, rememberMe }, "User logged in");
      res.json({
        user: formatUser(user),
        message: "Logged in successfully",
      });
    } catch (err) {
      req.log.error({ err }, "Login error");
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  },
);

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  try {
    const token = req.cookies?.["session_token"] as string | undefined;
    if (token) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
    // Clear with matching options so the browser removes the cookie
    res.clearCookie("session_token", {
      httpOnly: true,
      sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
      secure: isHttps,
      path: "/",
    });
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    req.log.error({ err }, "Logout error");
    // Still clear the cookie even on DB error
    res.clearCookie("session_token", {
      httpOnly: true,
      sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
      secure: isHttps,
      path: "/",
    });
    res.json({ success: true, message: "Logged out" });
  }
});

// ── /auth/me — session validation and user fetch ──────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const token = req.cookies?.["session_token"] as string | undefined;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token));

    if (!session) {
      res.status(401).json({ error: "Session not found" });
      return;
    }

    // Use toDate() to handle both Date objects and ISO strings from the driver
    if (toDate(session.expiresAt) < new Date()) {
      // Clean up expired session
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token)).catch(() => {});
      res.clearCookie("session_token", {
        httpOnly: true,
        sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
        secure: isHttps,
        path: "/",
      });
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
  } catch (err) {
    req.log.error({ err }, "/auth/me error");
    res.status(500).json({ error: "Failed to verify session" });
  }
});

// ── Dev-only test login ────────────────────────────────────────────────────────
router.post("/auth/test-login", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Test login is disabled in production" });
    return;
  }

  try {
    const { role } = req.body as { role?: string };
    if (role !== "hirer" && role !== "gamer") {
      res.status(400).json({ error: "role must be 'hirer' or 'gamer'" });
      return;
    }

    const isHirer = role === "hirer";
    const email = isHirer ? "tester.hirer@gamerbuddy.com" : "tester.gamer@gamerbuddy.com";
    const name = isHirer ? "Alex Rivera" : 'Jordan "Byte" Patel';

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (!user) {
      const passwordHash = await bcryptjs.hash("test123", 10);
      const [created] = await db
        .insert(usersTable)
        .values({
          name,
          email,
          passwordHash,
          phone: "",
          idVerified: false,
          gender: "male",
          trustFactor: isHirer ? 50 : 92,
          trustScore: isHirer ? 0 : 92,
          points: isHirer ? 0 : 1500,
          bio: isHirer
            ? "Gaming enthusiast looking for skilled players to help me out."
            : "Pro carry player. FPS, RPG, and Soulslike specialist. 15+ completed quests.",
          profileTitle: isHirer ? "Gaming Enthusiast" : "Pro Carry | FPS & RPG Specialist",
          country: "IN",
        })
        .returning();

      const gamerbuddyId = `GB-${String(created.id).padStart(6, "0")}`;
      await db.update(usersTable).set({ gamerbuddyId }).where(eq(usersTable.id, created.id));

      await db.insert(walletsTable).values({
        userId: created.id,
        hiringBalance: isHirer ? 50 : 0,
        earningsBalance: 0,
      });

      if (!isHirer) {
        await db.insert(gamingAccountsTable).values([
          { userId: created.id, platform: "steam", username: "BytePatel_Steam", status: "approved" },
          { userId: created.id, platform: "epic", username: "BytePatel_Epic", status: "approved" },
        ]);
      }

      [user] = await db.select().from(usersTable).where(eq(usersTable.id, created.id));
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
    res.cookie("session_token", token, sessionCookieOptions(expiresAt));

    req.log.info({ userId: user.id, role }, "Test login used");
    res.json({ user: formatUser(user), message: "Test login successful" });
  } catch (err) {
    req.log.error({ err }, "Test login error");
    res.status(500).json({ error: "Test login failed" });
  }
});

export default router;
