import { Router, type IRouter } from "express";
import { db, bidsTable, messagesTable, usersTable, gameRequestsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/bids/:bidId/messages", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const bidId = parseInt(req.params.bidId);
  if (isNaN(bidId)) { res.status(400).json({ error: "Invalid bid ID" }); return; }

  const [bid] = await db
    .select({ id: bidsTable.id, bidderId: bidsTable.bidderId, requestId: bidsTable.requestId })
    .from(bidsTable)
    .where(eq(bidsTable.id, bidId));

  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const [request] = await db
    .select({ userId: gameRequestsTable.userId })
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.id, bid.requestId));

  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  const isHirer = request.userId === user.id;
  const isBidder = bid.bidderId === user.id;
  if (!isHirer && !isBidder) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

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

  const [bid] = await db
    .select({ id: bidsTable.id, bidderId: bidsTable.bidderId, requestId: bidsTable.requestId })
    .from(bidsTable)
    .where(eq(bidsTable.id, bidId));

  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const [request] = await db
    .select({ userId: gameRequestsTable.userId })
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.id, bid.requestId));

  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  const isHirer = request.userId === user.id;
  const isBidder = bid.bidderId === user.id;
  if (!isHirer && !isBidder) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

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

  res.status(201).json({
    id: msg.id,
    bidId: msg.bidId,
    senderId: msg.senderId,
    senderName: user.name,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
