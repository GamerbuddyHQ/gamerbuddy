import type { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

async function resolveUser(token: string | undefined) {
  if (!token) return null;
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));
  if (!session) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
}

/** Like requireAuth but never rejects — just loads the user if a valid session exists */
export async function loadUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.["session_token"] as string | undefined;
  const user = await resolveUser(token);
  if (user) req.user = user;
  next();
}
