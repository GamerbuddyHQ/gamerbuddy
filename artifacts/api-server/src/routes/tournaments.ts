import { Router } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable,
  tournamentRegistrationsTable,
  walletsTable,
  walletTransactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const round2 = (n: number) => Math.round(n * 100) / 100;

const PLATFORM_FEE_RATE = 0.1;
const MIN_PRIZE_POOL = 100;
const MAX_PRIZE_POOL = 10000;
const MIN_PLAYERS = 2;

const MAX_PLAYERS = 100;

const VALID_TYPES = ["h2h", "squad", "ffa"] as const;
type TournamentType = (typeof VALID_TYPES)[number];

async function recordTx(
  userId: number,
  wallet: "hiring" | "earnings",
  type: string,
  amount: number,
  description: string,
) {
  await db.insert(walletTransactionsTable).values({ userId, wallet, type, amount: String(amount), description });
}

function formatTournament(
  t: typeof tournamentsTable.$inferSelect,
  hostName: string,
  registrations: (typeof tournamentRegistrationsTable.$inferSelect)[],
) {
  const prize = round2(parseFloat(String(t.prizePool)));
  const fee = round2(parseFloat(String(t.entryFee)));
  const platformFee = round2(prize * PLATFORM_FEE_RATE);
  const netPrize = round2(prize - platformFee);

  let distribution = { first: 100, second: 0, third: 0, custom: false };
  try { distribution = JSON.parse(t.prizeDistribution); } catch { /* ignore */ }

  return {
    id: t.id,
    hostId: t.hostId,
    hostName,
    title: t.title,
    gameName: t.gameName,
    platform: t.platform,
    tournamentType: t.tournamentType,
    maxPlayers: t.maxPlayers,
    currentPlayers: t.currentPlayers,
    prizePool: prize,
    entryFee: fee,
    rules: t.rules,
    prizeDistribution: distribution,
    status: t.status,
    platformFee,
    netPrize,
    winnersData: t.winnersData ? (JSON.parse(t.winnersData) as unknown) : null,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    slotsLeft: t.maxPlayers - t.currentPlayers,
    registrations: registrations.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      status: r.status,
      placement: r.placement,
      prizeWon: r.prizeWon ? round2(parseFloat(String(r.prizeWon))) : null,
      joinedAt: r.joinedAt,
    })),
  };
}

/* ── GET /tournaments ── list all */
router.get("/tournaments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ t: tournamentsTable, hostName: usersTable.name })
    .from(tournamentsTable)
    .leftJoin(usersTable, eq(tournamentsTable.hostId, usersTable.id))
    .orderBy(desc(tournamentsTable.createdAt));

  const results = await Promise.all(
    rows.map(async ({ t, hostName }) => {
      const regs = await db
        .select()
        .from(tournamentRegistrationsTable)
        .where(eq(tournamentRegistrationsTable.tournamentId, t.id));
      return formatTournament(t, hostName ?? "Unknown", regs);
    }),
  );

  res.json(results);
});

/* ── GET /tournaments/:id ── single */
router.get("/tournaments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select({ t: tournamentsTable, hostName: usersTable.name })
    .from(tournamentsTable)
    .leftJoin(usersTable, eq(tournamentsTable.hostId, usersTable.id))
    .where(eq(tournamentsTable.id, id));

  if (!row) { res.status(404).json({ error: "Tournament not found" }); return; }

  const regs = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(eq(tournamentRegistrationsTable.tournamentId, id));

  res.json(formatTournament(row.t, row.hostName ?? "Unknown", regs));
});

/* ── POST /tournaments ── create */
router.post("/tournaments", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { title, gameName, platform, tournamentType, maxPlayers, prizePool, entryFee, rules, prizeDistribution } = req.body;

  if (!title?.trim() || !gameName?.trim() || !platform?.trim()) {
    res.status(400).json({ error: "Title, game name, and platform are required" }); return;
  }
  if (!VALID_TYPES.includes(tournamentType as TournamentType)) {
    res.status(400).json({ error: "Invalid tournament type. Must be h2h, squad, or ffa" }); return;
  }

  const prize = round2(parseFloat(prizePool));
  if (isNaN(prize) || prize < MIN_PRIZE_POOL || prize > MAX_PRIZE_POOL) {
    res.status(400).json({ error: `Prize pool must be between $${MIN_PRIZE_POOL} and $${MAX_PRIZE_POOL}` }); return;
  }

  const fee = round2(Math.max(0, parseFloat(entryFee ?? "0") || 0));

  const players = parseInt(maxPlayers);
  if (isNaN(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    res.status(400).json({ error: `Number of slots must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}` }); return;
  }

  if (!rules?.trim()) { res.status(400).json({ error: "Rules / objectives are required" }); return; }

  let distObj = { first: 100, second: 0, third: 0, custom: false };
  try { if (prizeDistribution) distObj = { ...distObj, ...JSON.parse(prizeDistribution) }; }
  catch { res.status(400).json({ error: "Invalid prize distribution format" }); return; }

  const totalPct = distObj.first + distObj.second + distObj.third;
  if (Math.abs(totalPct - 100) > 0.5) {
    res.status(400).json({ error: `Prize distribution must total 100% (currently ${totalPct}%)` }); return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.hiringBalance < prize) {
    res.status(400).json({
      error: `Insufficient hiring balance. Prize pool is $${prize.toFixed(2)} but your wallet has $${(wallet?.hiringBalance ?? 0).toFixed(2)}.`,
    }); return;
  }

  await db.update(walletsTable)
    .set({ hiringBalance: round2(wallet.hiringBalance - prize) })
    .where(eq(walletsTable.userId, user.id));

  const [tournament] = await db
    .insert(tournamentsTable)
    .values({
      hostId: user.id,
      title: title.trim(),
      gameName: gameName.trim(),
      platform: platform.trim(),
      tournamentType,
      maxPlayers: players,
      prizePool: String(prize),
      entryFee: String(fee),
      rules: rules.trim(),
      prizeDistribution: JSON.stringify(distObj),
      status: "open",
    })
    .returning();

  await recordTx(user.id, "hiring", "tournament_escrow", prize, `Prize pool escrowed for tournament: ${title.trim()}`);

  req.log.info({ userId: user.id, tournamentId: tournament.id, prize }, "Tournament created");
  res.status(201).json(formatTournament(tournament, user.name, []));
});

/* ── POST /tournaments/:id/join ── */
router.post("/tournaments/:id/join", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Tournament not found" }); return; }
  if (t.status !== "open") { res.status(400).json({ error: "Tournament is not open for registration" }); return; }
  if (t.hostId === user.id) { res.status(400).json({ error: "You cannot join your own tournament" }); return; }
  if (t.currentPlayers >= t.maxPlayers) { res.status(400).json({ error: "Tournament is full" }); return; }

  const [existing] = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(and(eq(tournamentRegistrationsTable.tournamentId, id), eq(tournamentRegistrationsTable.userId, user.id)));
  if (existing) { res.status(400).json({ error: "You have already joined this tournament" }); return; }

  const fee = round2(parseFloat(String(t.entryFee)));

  if (fee > 0) {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
    if (!wallet || wallet.hiringBalance < fee) {
      res.status(400).json({
        error: `Insufficient hiring balance. Entry fee is $${fee.toFixed(2)} but your wallet has $${(wallet?.hiringBalance ?? 0).toFixed(2)}.`,
      }); return;
    }
    await db.update(walletsTable)
      .set({ hiringBalance: round2(wallet.hiringBalance - fee) })
      .where(eq(walletsTable.userId, user.id));
    await recordTx(user.id, "hiring", "tournament_entry_fee", fee, `Entry fee for tournament: ${t.title}`);
  }

  await db.insert(tournamentRegistrationsTable).values({
    tournamentId: id,
    userId: user.id,
    userName: user.name,
    entryFeePaid: String(fee),
  });

  const newCount = t.currentPlayers + 1;
  const nowFull = newCount >= t.maxPlayers;
  await db.update(tournamentsTable).set({
    currentPlayers: newCount,
    status: nowFull ? "ongoing" : "open",
    ...(nowFull ? { startedAt: new Date() } : {}),
  }).where(eq(tournamentsTable.id, id));

  req.log.info({ userId: user.id, tournamentId: id, fee }, "Player joined tournament");
  res.json({
    success: true,
    message: nowFull
      ? "Tournament is now full — battle begins!"
      : `Joined! ${t.maxPlayers - newCount} slot(s) remaining.`,
  });
});

/* ── PATCH /tournaments/:id/declare-winners ── */
router.patch("/tournaments/:id/declare-winners", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Tournament not found" }); return; }
  if (t.hostId !== user.id) { res.status(403).json({ error: "Only the tournament host can declare winners" }); return; }
  if (t.status === "completed") { res.status(400).json({ error: "Winners already declared" }); return; }
  if (t.status === "cancelled") { res.status(400).json({ error: "Tournament was cancelled" }); return; }

  const { winners } = req.body as { winners: { userId: number; placement: number }[] };
  if (!Array.isArray(winners) || winners.length === 0) {
    res.status(400).json({ error: "Provide at least one winner {userId, placement}" }); return;
  }

  const regs = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(eq(tournamentRegistrationsTable.tournamentId, id));

  const registeredIds = new Set(regs.map((r) => r.userId));
  for (const w of winners) {
    if (!registeredIds.has(w.userId)) {
      res.status(400).json({ error: `User ${w.userId} is not a registered participant` }); return;
    }
  }

  let distObj = { first: 100, second: 0, third: 0, custom: false };
  try { distObj = JSON.parse(t.prizeDistribution); } catch { /* ignore */ }

  const prize = round2(parseFloat(String(t.prizePool)));
  const totalEntryFees = round2(regs.reduce((s, r) => s + parseFloat(String(r.entryFeePaid)), 0));
  const totalPool = round2(prize + totalEntryFees);
  const platformFee = round2(totalPool * PLATFORM_FEE_RATE);
  const netPool = round2(totalPool - platformFee);

  const pctMap: Record<number, number> = { 1: distObj.first, 2: distObj.second, 3: distObj.third };

  const winnersData: { userId: number; placement: number; prizeWon: number; userName: string }[] = [];

  for (const w of winners) {
    const pct = (pctMap[w.placement] ?? 0) / 100;
    const prizeWon = round2(netPool * pct);
    const reg = regs.find((r) => r.userId === w.userId);
    const userName = reg?.userName ?? "Unknown";

    if (prizeWon > 0) {
      const [wWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, w.userId));
      if (wWallet) {
        await db.update(walletsTable)
          .set({ earningsBalance: round2(wWallet.earningsBalance + prizeWon) })
          .where(eq(walletsTable.userId, w.userId));
        await recordTx(w.userId, "earnings", "tournament_prize", prizeWon, `${ordinal(w.placement)} place prize — ${t.title}`);
      }
    }

    await db.update(tournamentRegistrationsTable).set({
      status: "winner",
      placement: w.placement,
      prizeWon: String(prizeWon),
    }).where(and(
      eq(tournamentRegistrationsTable.tournamentId, id),
      eq(tournamentRegistrationsTable.userId, w.userId),
    ));

    winnersData.push({ userId: w.userId, placement: w.placement, prizeWon, userName });
  }

  await db.update(tournamentsTable).set({
    status: "completed",
    completedAt: new Date(),
    platformFeeCollected: String(platformFee),
    winnersData: JSON.stringify(winnersData),
  }).where(eq(tournamentsTable.id, id));

  req.log.info({ tournamentId: id, platformFee, netPool }, "Tournament winners declared");
  res.json({ success: true, message: "Winners declared and prizes distributed!", platformFee, netPool, winners: winnersData });
});

/* ── DELETE /tournaments/:id ── cancel */
router.delete("/tournaments/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Tournament not found" }); return; }
  if (t.hostId !== user.id) { res.status(403).json({ error: "Only the host can cancel this tournament" }); return; }
  if (t.status === "completed") { res.status(400).json({ error: "Cannot cancel a completed tournament" }); return; }
  if (t.status === "cancelled") { res.status(400).json({ error: "Already cancelled" }); return; }

  const prize = round2(parseFloat(String(t.prizePool)));
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (wallet) {
    await db.update(walletsTable)
      .set({ hiringBalance: round2(wallet.hiringBalance + prize) })
      .where(eq(walletsTable.userId, user.id));
    await recordTx(user.id, "hiring", "tournament_refund", prize, `Prize pool refunded — cancelled: ${t.title}`);
  }

  const regs = await db.select().from(tournamentRegistrationsTable).where(eq(tournamentRegistrationsTable.tournamentId, id));
  for (const reg of regs) {
    const fee = round2(parseFloat(String(reg.entryFeePaid)));
    if (fee > 0) {
      const [pWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, reg.userId));
      if (pWallet) {
        await db.update(walletsTable)
          .set({ hiringBalance: round2(pWallet.hiringBalance + fee) })
          .where(eq(walletsTable.userId, reg.userId));
        await recordTx(reg.userId, "hiring", "tournament_refund", fee, `Entry fee refunded — ${t.title} cancelled`);
      }
    }
  }

  await db.update(tournamentsTable).set({ status: "cancelled" }).where(eq(tournamentsTable.id, id));
  req.log.info({ tournamentId: id, userId: user.id }, "Tournament cancelled");
  res.json({ success: true, message: "Tournament cancelled and all funds refunded." });
});

function ordinal(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export default router;
