import type { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { toDate } from "../lib/dates";

async function resolveUser(token: string | undefined) {
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session) return null;

  // Use toDate() so we handle both Date objects and ISO strings from the DB driver
  if (toDate(session.expiresAt) < new Date()) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  return user ?? null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.["session_token"] as string | undefined;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await resolveUser(token);

    if (!user) {
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Like requireAuth but never rejects — loads user if a valid session exists */
export async function loadUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.["session_token"] as string | undefined;
    const user = await resolveUser(token);
    if (user) req.user = user;
  } catch {
    // Silently ignore — this middleware never blocks requests
  }
  next();
}
