import { Router, type IRouter } from "express";
import { db, gameRequestsTable, walletsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const MIN_HIRING_BALANCE = 10.75;

const VALID_PLATFORMS = [
  "PC",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
  "Steam Deck",
  "iOS",
  "Android",
];

const VALID_SKILL_LEVELS = ["Beginner", "Intermediate", "Expert", "Chill"];

function formatRequest(
  req: {
    id: number;
    userId: number;
    gameName: string;
    platform: string;
    skillLevel: string;
    objectives: string;
    status: string;
    createdAt: Date;
  },
  userName?: string,
) {
  return {
    id: req.id,
    userId: req.userId,
    userName: userName ?? "Unknown",
    gameName: req.gameName,
    platform: req.platform,
    skillLevel: req.skillLevel,
    objectives: req.objectives,
    status: req.status,
    createdAt: req.createdAt.toISOString(),
  };
}

router.get("/requests", async (req, res): Promise<void> => {
  const { platform, skillLevel, status } = req.query as {
    platform?: string;
    skillLevel?: string;
    status?: string;
  };

  let query = db
    .select({
      id: gameRequestsTable.id,
      userId: gameRequestsTable.userId,
      gameName: gameRequestsTable.gameName,
      platform: gameRequestsTable.platform,
      skillLevel: gameRequestsTable.skillLevel,
      objectives: gameRequestsTable.objectives,
      status: gameRequestsTable.status,
      createdAt: gameRequestsTable.createdAt,
      userName: usersTable.name,
    })
    .from(gameRequestsTable)
    .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
    .orderBy(desc(gameRequestsTable.createdAt))
    .$dynamic();

  const result = await query;

  const filtered = result.filter((r) => {
    if (platform && r.platform !== platform) return false;
    if (skillLevel && r.skillLevel !== skillLevel) return false;
    if (status && r.status !== status) return false;
    return true;
  });

  res.json(
    filtered.map((r) =>
      formatRequest(r, r.userName ?? "Unknown"),
    ),
  );
});

router.get("/requests/my", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  const result = await db
    .select()
    .from(gameRequestsTable)
    .where(eq(gameRequestsTable.userId, user.id))
    .orderBy(desc(gameRequestsTable.createdAt));

  res.json(result.map((r) => formatRequest(r, user.name)));
});

router.get("/requests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  const [result] = await db
    .select({
      id: gameRequestsTable.id,
      userId: gameRequestsTable.userId,
      gameName: gameRequestsTable.gameName,
      platform: gameRequestsTable.platform,
      skillLevel: gameRequestsTable.skillLevel,
      objectives: gameRequestsTable.objectives,
      status: gameRequestsTable.status,
      createdAt: gameRequestsTable.createdAt,
      userName: usersTable.name,
    })
    .from(gameRequestsTable)
    .leftJoin(usersTable, eq(gameRequestsTable.userId, usersTable.id))
    .where(eq(gameRequestsTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(formatRequest(result, result.userName ?? "Unknown"));
});

router.post("/requests", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, user.id));

  if (!wallet || wallet.hiringBalance < MIN_HIRING_BALANCE) {
    res.status(400).json({
      error: `You need at least ${MIN_HIRING_BALANCE} in your hiring wallet to post a request`,
    });
    return;
  }

  const { gameName, platform, skillLevel, objectives } = req.body as {
    gameName?: string;
    platform?: string;
    skillLevel?: string;
    objectives?: string;
  };

  if (!gameName || !platform || !skillLevel || !objectives) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: "Invalid platform" });
    return;
  }

  if (!VALID_SKILL_LEVELS.includes(skillLevel)) {
    res.status(400).json({ error: "Invalid skill level" });
    return;
  }

  const [gameRequest] = await db
    .insert(gameRequestsTable)
    .values({
      userId: user.id,
      gameName,
      platform,
      skillLevel,
      objectives,
      status: "open",
    })
    .returning();

  await db
    .update(walletsTable)
    .set({ hiringBalance: wallet.hiringBalance - MIN_HIRING_BALANCE })
    .where(eq(walletsTable.userId, user.id));

  req.log.info({ userId: user.id, gameName }, "Game request posted");
  res.status(201).json(formatRequest(gameRequest, user.name));
});

export default router;
