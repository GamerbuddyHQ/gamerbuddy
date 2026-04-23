import { Router, type IRouter } from "express";
import multer from "multer";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, walletsTable, sessionsTable, gamingAccountsTable } from "@workspace/db";
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
  trustScore?: number;
  trustFactor?: number;
  profileBackground?: string | null;
  profileTitle?: string | null;
  country?: string | null;
  gender?: string | null;
  gamerbuddyId?: string | null;
  emailVerified?: boolean;
  isActivated?: boolean;
  activationRegion?: string | null;
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
    trustScore: user.trustScore ?? 0,
    trustFactor: user.trustFactor ?? 50,
    profileBackground: user.profileBackground ?? null,
    profileTitle: user.profileTitle ?? null,
    country: user.country ?? null,
    gender: user.gender ?? null,
    gamerbuddyId: user.gamerbuddyId ?? null,
    emailVerified: user.emailVerified ?? false,
    isActivated: user.isActivated ?? false,
    activationRegion: user.activationRegion ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post(
  "/auth/signup",
  signupLimiter,
  upload.single("officialId"),
  async (req, res): Promise<void> => {
    try {
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
    } catch (err) {
      req.log.error({ err }, "Signup error");
      const message = err instanceof Error ? err.message : "Signup failed";
      const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
      res.status(status < 500 ? status : 500).json({
        error: status < 500 ? message : "Account creation failed. Please try again.",
      });
    }
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

// ── Dev-only test login ─────────────────────────────────────────────────────
// Creates seeded test accounts on first call, then issues a session cookie.
// Completely blocked in production.
router.post("/auth/test-login", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Test login is disabled in production" });
    return;
  }

  const { role } = req.body as { role?: string };
  if (role !== "hirer" && role !== "gamer") {
    res.status(400).json({ error: "role must be 'hirer' or 'gamer'" });
    return;
  }

  const isHirer = role === "hirer";
  const email    = isHirer ? "tester.hirer@gamerbuddy.com" : "tester.gamer@gamerbuddy.com";
  const name     = isHirer ? "Alex Rivera" : 'Jordan "Byte" Patel';

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
        { userId: created.id, platform: "epic",  username: "BytePatel_Epic",  status: "approved" },
      ]);
    }

    [user] = await db.select().from(usersTable).where(eq(usersTable.id, created.id));
  }

  // Issue a fresh session
  const token     = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
  res.cookie("session_token", token, sessionCookieOptions(expiresAt));

  req.log.info({ userId: user.id, role }, "Test login used");
  res.json({ user: formatUser(user), message: "Test login successful" });
});

export default router;
