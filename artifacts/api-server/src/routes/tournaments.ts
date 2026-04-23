import { Router } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable,
  tournamentRegistrationsTable,
  walletsTable,
  walletTransactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { validate, sanitize, PostTournamentSchema } from "../lib/validate";
import { tournamentLimiter } from "../lib/rate-limit";

const router = Router();

const round2 = (n: number) => Math.round(n * 100) / 100;

const PLATFORM_FEE_RATE = 0.1;
const MIN_PRIZE_POOL = 100;
const MAX_PRIZE_POOL = 10000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 100;

const VALID_TYPES = ["h2h", "squad", "ffa"] as const;
type TournamentType = (typeof VALID_TYPES)[number];

const VALID_REGIONS = ["any", "Asia", "North America", "Europe", "South America", "Middle East", "Africa", "Oceania", "Other"] as const;
const VALID_GENDERS = ["any", "male", "female", "non_binary", "no_say"] as const;

const COUNTRY_TO_REGION: Record<string, string> = {
  India: "Asia", Japan: "Asia", "South Korea": "Asia", China: "Asia",
  Indonesia: "Asia", Philippines: "Asia", Thailand: "Asia", Vietnam: "Asia",
  Malaysia: "Asia", Singapore: "Asia", Taiwan: "Asia", Pakistan: "Asia", Bangladesh: "Asia",
  USA: "North America", Canada: "North America", Mexico: "North America",
  UK: "Europe", Germany: "Europe", France: "Europe", Spain: "Europe", Italy: "Europe",
  Poland: "Europe", Netherlands: "Europe", Sweden: "Europe", Norway: "Europe",
  Denmark: "Europe", Finland: "Europe", Belgium: "Europe", Portugal: "Europe",
  "Czech Republic": "Europe", Romania: "Europe", Hungary: "Europe", Greece: "Europe",
  Ukraine: "Europe", Switzerland: "Europe", Austria: "Europe", Russia: "Europe",
  Brazil: "South America", Argentina: "South America", Chile: "South America",
  Colombia: "South America", Peru: "South America",
  Turkey: "Middle East", "Saudi Arabia": "Middle East", UAE: "Middle East", Israel: "Middle East",
  Egypt: "Africa", "South Africa": "Africa", Nigeria: "Africa", Kenya: "Africa",
  Australia: "Oceania",
};

function getRegion(country: string | null | undefined): string {
  if (!country) return "Other";
  return COUNTRY_TO_REGION[country] ?? "Other";
}

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
  const platformFee = round2(prize * PLATFORM_FEE_RATE);
  const netPrize = round2(prize - platformFee);

  let distribution = { first: 100, second: 0, third: 0, custom: false };
  try { distribution = JSON.parse(t.prizeDistribution); } catch { /* ignore */ }

  const approvedCount = registrations.filter((r) => r.status === "registered" || r.status === "winner").length;

  return {
    id: t.id,
    hostId: t.hostId,
    hostName,
    title: t.title,
    gameName: t.gameName,
    platform: t.platform,
    tournamentType: t.tournamentType,
    maxPlayers: t.maxPlayers,
    currentPlayers: approvedCount,
    prizePool: prize,
    entryFee: 0,
    rules: t.rules,
    prizeDistribution: distribution,
    status: t.status,
    platformFee,
    netPrize,
    country: t.country ?? "any",
    region: t.region ?? "any",
    genderPreference: t.genderPreference ?? "any",
    winnersData: t.winnersData ? (JSON.parse(t.winnersData) as unknown) : null,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    slotsLeft: Math.max(0, t.maxPlayers - approvedCount),
    registrations: registrations.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      status: r.status,
      placement: r.placement,
      prizeWon: r.prizeWon ? round2(parseFloat(String(r.prizeWon))) : null,
      entryFeePaid: round2(parseFloat(String(r.entryFeePaid))),
      joinedAt: r.joinedAt,
    })),
  };
}

function userMatchesTournament(
  t: { country: string; region: string; genderPreference: string },
  user: { country: string | null; gender: string | null },
): boolean {
  const userRegion = getRegion(user.country);

  if (t.country !== "any" && t.country !== (user.country ?? "")) return false;
  if (t.region !== "any" && t.region !== userRegion) return false;
  if (t.genderPreference !== "any" && t.genderPreference !== (user.gender ?? "")) return false;
  return true;
}

/* ── GET /tournaments/my ── must be BEFORE /:id ── */
router.get("/tournaments/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const hostedRows = await db
    .select({ t: tournamentsTable, hostName: usersTable.name })
    .from(tournamentsTable)
    .leftJoin(usersTable, eq(tournamentsTable.hostId, usersTable.id))
    .where(eq(tournamentsTable.hostId, userId))
    .orderBy(desc(tournamentsTable.createdAt));

  const hosted = await Promise.all(
    hostedRows.map(async ({ t, hostName }) => {
      const regs = await db.select().from(tournamentRegistrationsTable).where(eq(tournamentRegistrationsTable.tournamentId, t.id));
      return formatTournament(t, hostName ?? "Unknown", regs);
    }),
  );

  const myRegs = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(eq(tournamentRegistrationsTable.userId, userId))
    .orderBy(desc(tournamentRegistrationsTable.joinedAt));

  const joined: { tournament: ReturnType<typeof formatTournament>; registration: { status: string; joinedAt: Date } }[] = [];
  for (const reg of myRegs) {
    const [row] = await db
      .select({ t: tournamentsTable, hostName: usersTable.name })
      .from(tournamentsTable)
      .leftJoin(usersTable, eq(tournamentsTable.hostId, usersTable.id))
      .where(eq(tournamentsTable.id, reg.tournamentId));
    if (!row) continue;
    const regs = await db.select().from(tournamentRegistrationsTable).where(eq(tournamentRegistrationsTable.tournamentId, reg.tournamentId));
    joined.push({
      tournament: formatTournament(row.t, row.hostName ?? "Unknown", regs),
      registration: { status: reg.status, joinedAt: reg.joinedAt },
    });
  }

  res.json({ hosted, joined });
});

/* ── GET /tournaments ── list (filtered by user profile when authenticated) ── */
router.get("/tournaments", async (req, res): Promise<void> => {
  const rows = await db
    .select({ t: tournamentsTable, hostName: usersTable.name })
    .from(tournamentsTable)
    .leftJoin(usersTable, eq(tournamentsTable.hostId, usersTable.id))
    .orderBy(desc(tournamentsTable.createdAt));

  const all = await Promise.all(
    rows.map(async ({ t, hostName }) => {
      const regs = await db.select().from(tournamentRegistrationsTable).where(eq(tournamentRegistrationsTable.tournamentId, t.id));
      return { formatted: formatTournament(t, hostName ?? "Unknown", regs), raw: t, regs };
    }),
  );

  const user = (req as any).user as { id: number; country?: string | null; gender?: string | null } | undefined;

  let results = all.map((x) => x.formatted);

  if (user) {
    const [profile] = await db.select({ country: usersTable.country, gender: usersTable.gender }).from(usersTable).where(eq(usersTable.id, user.id));
    const userCountry = profile?.country ?? null;
    const userGender = profile?.gender ?? null;

    results = all
      .filter(({ raw, regs }) => {
        const isHost = raw.hostId === user.id;
        const hasReg = regs.some((r) => r.userId === user.id);
        if (isHost || hasReg) return true;
        return userMatchesTournament(
          { country: raw.country ?? "any", region: raw.region ?? "any", genderPreference: raw.genderPreference ?? "any" },
          { country: userCountry, gender: userGender },
        );
      })
      .map((x) => x.formatted);
  }

  res.json(results);
});

/* ── GET /tournaments/:id ── single */
router.get("/tournaments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select({ t: tournamentsTable, hostName: usersTable.name })
    .from(tournamentsTable)
    .leftJoin(usersTable, eq(tournamentsTable.hostId, usersTable.id))
    .where(eq(tournamentsTable.id, id));

  if (!row) { res.status(404).json({ error: "Tournament not found" }); return; }

  const regs = await db.select().from(tournamentRegistrationsTable).where(eq(tournamentRegistrationsTable.tournamentId, id));
  res.json(formatTournament(row.t, row.hostName ?? "Unknown", regs));
});

/* ── POST /tournaments ── create */
router.post("/tournaments", requireAuth, tournamentLimiter, validate(PostTournamentSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const { title, gameName, platform, tournamentType, maxPlayers, prizePool, rules, prizeDistribution, country, region, genderPreference } = req.body as {
    title: string; gameName: string; platform: string; tournamentType: "h2h" | "squad" | "ffa";
    maxPlayers: number; prizePool: number; rules: string; prizeDistribution?: string;
    country: string; region: string; genderPreference: string;
  };

  const prize = round2(prizePool);

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
      title:          sanitize(title),
      gameName:       sanitize(gameName),
      platform:       sanitize(platform),
      tournamentType,
      maxPlayers,
      prizePool:      String(prize),
      entryFee:       "0",
      rules:          sanitize(rules),
      prizeDistribution: JSON.stringify(distObj),
      status: "open",
      country:          country || "any",
      region:           region  || "any",
      genderPreference: genderPreference || "any",
    })
    .returning();

  await recordTx(user.id, "hiring", "tournament_escrow", prize, `Prize pool escrowed for tournament: ${title}`);
  req.log.info({ userId: user.id, tournamentId: tournament.id, prize }, "Tournament created");
  res.status(201).json(formatTournament(tournament, user.name, []));
});

/* ── POST /tournaments/:id/request-join ── submit participation request */
router.post("/tournaments/:id/request-join", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Tournament not found" }); return; }
  if (t.status !== "open") { res.status(400).json({ error: "Tournament is not open for registration" }); return; }
  if (t.hostId === user.id) { res.status(400).json({ error: "You cannot join your own tournament" }); return; }

  const approved = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(and(
      eq(tournamentRegistrationsTable.tournamentId, id),
      eq(tournamentRegistrationsTable.status, "registered"),
    ));
  if (approved.length >= t.maxPlayers) { res.status(400).json({ error: "Tournament is full" }); return; }

  const [existing] = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(and(eq(tournamentRegistrationsTable.tournamentId, id), eq(tournamentRegistrationsTable.userId, user.id)));
  if (existing) {
    if (existing.status === "pending") { res.status(400).json({ error: "You already have a pending request for this tournament" }); return; }
    if (existing.status === "registered") { res.status(400).json({ error: "You are already registered in this tournament" }); return; }
    if (existing.status === "rejected") { res.status(400).json({ error: "Your request was rejected by the host" }); return; }
  }

  /* ── Anti-cheat: Validate user's profile matches tournament requirements ── */
  const [profile] = await db
    .select({ country: usersTable.country, gender: usersTable.gender })
    .from(usersTable)
    .where(eq(usersTable.id, user.id));

  const matchError = (() => {
    const tc = t.country ?? "any";
    const tr = t.region ?? "any";
    const tg = t.genderPreference ?? "any";
    const uc = profile?.country ?? "";
    const ug = profile?.gender ?? "";
    const ur = getRegion(uc || null);

    if (tc !== "any" && tc !== uc) {
      return `This tournament requires players from ${tc}. Update your profile country to join.`;
    }
    if (tr !== "any" && tr !== ur) {
      return `This tournament is restricted to the ${tr} region. Your profile shows ${ur || "no region"}.`;
    }
    if (tg !== "any" && tg !== ug) {
      return `This tournament has a gender restriction. Please ensure your profile gender matches.`;
    }
    return null;
  })();

  if (matchError) { res.status(403).json({ error: matchError }); return; }

  await db.insert(tournamentRegistrationsTable).values({
    tournamentId: id,
    userId: user.id,
    userName: user.name,
    status: "pending",
    entryFeePaid: "0",
  });

  req.log.info({ userId: user.id, tournamentId: id }, "Tournament join request submitted");
  res.json({ success: true, message: "Join request sent! The host will review and approve your request." });
});

/* ── POST /tournaments/:id/approve-request/:userId ── host approves a pending request */
router.post("/tournaments/:id/approve-request/:targetUserId", requireAuth, async (req, res): Promise<void> => {
  const host = req.user!;
  const id = parseInt(req.params.id as string);
  const targetUserId = parseInt(req.params.targetUserId as string);
  if (isNaN(id) || isNaN(targetUserId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Tournament not found" }); return; }
  if (t.hostId !== host.id) { res.status(403).json({ error: "Only the tournament host can approve requests" }); return; }
  if (t.status !== "open") { res.status(400).json({ error: "Tournament is no longer open" }); return; }

  const [reg] = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(and(eq(tournamentRegistrationsTable.tournamentId, id), eq(tournamentRegistrationsTable.userId, targetUserId)));
  if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }
  if (reg.status !== "pending") { res.status(400).json({ error: `Cannot approve — current status is "${reg.status}"` }); return; }

  const approved = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(and(
      eq(tournamentRegistrationsTable.tournamentId, id),
      eq(tournamentRegistrationsTable.status, "registered"),
    ));
  if (approved.length >= t.maxPlayers) { res.status(400).json({ error: "Tournament is already full" }); return; }

  await db.update(tournamentRegistrationsTable)
    .set({ status: "registered" })
    .where(eq(tournamentRegistrationsTable.id, reg.id));

  const newCount = approved.length + 1;
  const nowFull = newCount >= t.maxPlayers;
  await db.update(tournamentsTable).set({
    currentPlayers: newCount,
    status: nowFull ? "ongoing" : "open",
    ...(nowFull ? { startedAt: new Date() } : {}),
  }).where(eq(tournamentsTable.id, id));

  req.log.info({ hostId: host.id, tournamentId: id, targetUserId, newCount }, "Request approved");
  res.json({
    success: true,
    message: nowFull
      ? `${reg.userName} approved! Tournament is now full — battle begins!`
      : `${reg.userName} has been approved and added to the tournament.`,
  });
});

/* ── POST /tournaments/:id/reject-request/:userId ── host rejects a pending request */
router.post("/tournaments/:id/reject-request/:targetUserId", requireAuth, async (req, res): Promise<void> => {
  const host = req.user!;
  const id = parseInt(req.params.id as string);
  const targetUserId = parseInt(req.params.targetUserId as string);
  if (isNaN(id) || isNaN(targetUserId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Tournament not found" }); return; }
  if (t.hostId !== host.id) { res.status(403).json({ error: "Only the tournament host can reject requests" }); return; }

  const [reg] = await db
    .select()
    .from(tournamentRegistrationsTable)
    .where(and(eq(tournamentRegistrationsTable.tournamentId, id), eq(tournamentRegistrationsTable.userId, targetUserId)));
  if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }
  if (reg.status !== "pending") { res.status(400).json({ error: `Cannot reject — current status is "${reg.status}"` }); return; }

  await db.update(tournamentRegistrationsTable)
    .set({ status: "rejected" })
    .where(eq(tournamentRegistrationsTable.id, reg.id));

  req.log.info({ hostId: host.id, tournamentId: id, targetUserId }, "Request rejected");
  res.json({ success: true, message: `${reg.userName}'s request has been rejected.` });
});

/* ── PATCH /tournaments/:id/declare-winners ── */
router.patch("/tournaments/:id/declare-winners", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(req.params.id as string);
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
    .where(and(
      eq(tournamentRegistrationsTable.tournamentId, id),
      eq(tournamentRegistrationsTable.status, "registered"),
    ));

  const registeredIds = new Set(regs.map((r) => r.userId));
  for (const w of winners) {
    if (!registeredIds.has(w.userId)) {
      res.status(400).json({ error: `User ${w.userId} is not an approved participant` }); return;
    }
  }

  let distObj = { first: 100, second: 0, third: 0, custom: false };
  try { distObj = JSON.parse(t.prizeDistribution); } catch { /* ignore */ }

  const prize = round2(parseFloat(String(t.prizePool)));
  const platformFee = round2(prize * PLATFORM_FEE_RATE);
  const netPool = round2(prize - platformFee);

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
  const id = parseInt(req.params.id as string);
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

  await db.update(tournamentsTable).set({ status: "cancelled" }).where(eq(tournamentsTable.id, id));
  req.log.info({ tournamentId: id, userId: user.id }, "Tournament cancelled");
  res.json({ success: true, message: "Tournament cancelled and prize pool refunded." });
});

function ordinal(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export default router;
