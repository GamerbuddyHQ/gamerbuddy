import { Router, type IRouter } from "express";
import { db, bidsTable, messagesTable, usersTable, gameRequestsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { validate, sanitize, PostMessageSchema } from "../lib/validate";
import { toIsoRequired } from "../lib/dates";
import { messageLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

async function getBidAccess(bidId: number, userId: number) {
  const [bid] = await db
    .select({ id: bidsTable.id, bidderId: bidsTable.bidderId, requestId: bidsTable.requestId })
    .from(bidsTable)
    .where(eq(bidsTable.id, bidId));
  if (!bid) return null;

  const [request] = await db
    .select({ userId: gameRequestsTable.userId })
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.id, bid.requestId));
  if (!request) return null;

  const isHirer = request.userId === userId;
  const isBidder = bid.bidderId === userId;
  if (!isHirer && !isBidder) return null;

  return { bid, request };
}

router.get("/bids/:bidId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const bidId = parseInt(req.params.bidId as string);
  if (isNaN(bidId)) { res.status(400).json({ error: "Invalid bid ID" }); return; }

  const access = await getBidAccess(bidId, user.id);
  if (!access) { res.status(403).json({ error: "Access denied" }); return; }

  const rows = await db
    .select({
      id: messagesTable.id,
      bidId: messagesTable.bidId,
      senderId: messagesTable.senderId,
      content: messagesTable.content,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.bidId, bidId))
    .orderBy(asc(messagesTable.createdAt));

  res.json(rows.map((m) => ({
    id: m.id,
    bidId: m.bidId,
    senderId: m.senderId,
    senderName: m.senderName ?? "Unknown",
    content: m.content,
    createdAt: toIsoRequired(m.createdAt),
  })));
});

router.post("/bids/:bidId/messages", requireAuth, messageLimiter, validate(PostMessageSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const bidId = parseInt(req.params.bidId as string);
  if (isNaN(bidId)) { res.status(400).json({ error: "Invalid bid ID" }); return; }

  const access = await getBidAccess(bidId, user.id);
  if (!access) { res.status(403).json({ error: "Access denied" }); return; }

  const { content } = req.body as { content: string };
  const safeContent = sanitize(content);
  if (!safeContent) { res.status(400).json({ error: "Message cannot be empty" }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ bidId, senderId: user.id, content: safeContent })
    .returning();

  const payload = {
    id: msg.id,
    bidId: msg.bidId,
    senderId: msg.senderId,
    senderName: user.name,
    content: msg.content,
    createdAt: toIsoRequired(msg.createdAt),
  };

  // No real-time push — clients poll via refetchInterval
  res.status(201).json(payload);
});

export default router;
