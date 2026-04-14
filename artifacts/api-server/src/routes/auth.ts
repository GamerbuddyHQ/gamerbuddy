import { Router, type IRouter } from "express";
import multer from "multer";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, walletsTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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
    createdAt: user.createdAt.toISOString(),
  };
}

router.post(
  "/auth/signup",
  upload.single("officialId"),
  async (req, res): Promise<void> => {
    const { name, email, password, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!name || !email || !password || !phone) {
      res.status(400).json({ error: "Missing required fields: name, email, password, phone" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

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
        name,
        email,
        passwordHash,
        phone,
        officialIdPath,
        idVerified: false,
      })
      .returning();

    await db.insert(walletsTable).values({
      userId: user.id,
      hiringBalance: 0,
      earningsBalance: 0,
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

    res.cookie("session_token", token, {
      httpOnly: true,
      sameSite: "lax",
      expires: expiresAt,
      secure: process.env.NODE_ENV === "production",
    });

    req.log.info({ userId: user.id }, "User signed up");
    res.status(201).json({
      user: formatUser(user),
      message: "Account created successfully",
    });
  },
);

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  res.cookie("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });

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
  res.clearCookie("session_token");
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
