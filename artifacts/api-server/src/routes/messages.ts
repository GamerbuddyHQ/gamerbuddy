import { Router, type IRouter } from "express";
import { db, bidsTable, messagesTable, usersTable, gameRequestsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { emitNewMessage } from "../socket-server";

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
  const bidId = parseInt(req.params.bidId);
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
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/bids/:bidId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const bidId = parseInt(req.params.bidId);
  if (isNaN(bidId)) { res.status(400).json({ error: "Invalid bid ID" }); return; }

  const access = await getBidAccess(bidId, user.id);
  if (!access) { res.status(403).json({ error: "Access denied" }); return; }

  const { content } = req.body as { content?: string };
  if (!content || content.trim().length < 1) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }
  if (content.trim().length > 1000) {
    res.status(400).json({ error: "Message too long (max 1000 chars)" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ bidId, senderId: user.id, content: content.trim() })
    .returning();

  const payload = {
    id: msg.id,
    bidId: msg.bidId,
    senderId: msg.senderId,
    senderName: user.name,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  };

  emitNewMessage(bidId, payload);

  res.status(201).json(payload);
});

export default router;
