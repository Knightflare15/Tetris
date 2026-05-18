import http from "http";
import path from "path";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../shared/types";
import { AuthService } from "./authService";
import { loadConfig } from "./config";
import { logger } from "./logger";
import { MatchmakingService } from "./matchmakingService";
import { RoomManager } from "./roomManager";
import { registerSocketGateway } from "./socketGateway";
import { getPrisma, isDatabaseConfigured } from "./database";
import { hashPassword, verifyPassword } from "./passwordService";
import { SocialError, SocialService } from "./socialService";

const config = loadConfig();
const authService = new AuthService(config.jwtSecret);
const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: config.nodeEnv === "production" ? false : config.clientOrigin,
    credentials: true,
  },
});
let socialService: SocialService;

app.use(cors({ origin: config.nodeEnv === "production" ? false : config.clientOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "coop-tetris", time: new Date().toISOString() });
});

app.post("/auth/demo", (req, res) => {
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName : "Player";
  const token = authService.createDemoToken(displayName);
  res.json({ token });
});

app.post("/auth/register", async (req, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ message: "Database auth is not configured. Use guest mode." });
    return;
  }

  const parsed = parseCredentials(req.body);
  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message });
    return;
  }

  try {
    const passwordHash = await hashPassword(parsed.password);
    const user = await getPrisma().user.create({
      data: {
        username: parsed.username,
        displayName: parsed.displayName,
        passwordHash,
      },
      select: { id: true, displayName: true },
    });
    const token = authService.createToken({ userId: user.id, displayName: user.displayName });
    res.status(201).json({ token, user: { userId: user.id, displayName: user.displayName } });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      res.status(409).json({ message: "Username is already taken." });
      return;
    }
    logger.error({ error }, "register failed");
    res.status(500).json({ message: "Registration failed."});
  }
});

app.post("/auth/login", async (req, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ message: "Database auth is not configured. Use guest mode." });
    return;
  }

  const username = normalizeUsername(req.body?.username);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required." });
    return;
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { username },
      select: { id: true, displayName: true, passwordHash: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    await getPrisma().user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = authService.createToken({ userId: user.id, displayName: user.displayName });
    res.json({ token, user: { userId: user.id, displayName: user.displayName } });
  } catch (error) {
    logger.error({ error }, "login failed");
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/auth/me", (req, res) => {
  const token = authHeaderToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ message: "Missing bearer token." });
    return;
  }

  try {
    res.json({ user: authService.verifyToken(token) });
  } catch {
    res.status(401).json({ message: "Invalid token." });
  }
});

app.get("/social/summary", async (req, res) => {
  const user = requireAuth(req.headers.authorization, res);
  if (!user) {
    return;
  }

  try {
    res.json(await socialService.summary(user.userId));
  } catch (error) {
    handleSocialError(res, error, "social summary failed");
  }
});

app.post("/friends/request", async (req, res) => {
  const user = requireAuth(req.headers.authorization, res);
  if (!user) {
    return;
  }

  try {
    const username = typeof req.body?.username === "string" ? req.body.username : "";
    await socialService.sendFriendRequest(user.userId, username);
    res.status(204).end();
  } catch (error) {
    handleSocialError(res, error, "friend request failed");
  }
});

app.post("/friends/requests/:id/accept", async (req, res) => {
  const user = requireAuth(req.headers.authorization, res);
  if (!user) {
    return;
  }

  try {
    await socialService.acceptFriendRequest(user.userId, req.params.id);
    res.status(204).end();
  } catch (error) {
    handleSocialError(res, error, "friend accept failed");
  }
});

app.post("/friends/requests/:id/decline", async (req, res) => {
  const user = requireAuth(req.headers.authorization, res);
  if (!user) {
    return;
  }

  try {
    await socialService.declineFriendRequest(user.userId, req.params.id);
    res.status(204).end();
  } catch (error) {
    handleSocialError(res, error, "friend decline failed");
  }
});

const publicDir = path.resolve(process.cwd(), "dist/public");
app.use("/sounds", express.static(path.resolve(process.cwd(), "sounds")));
app.use(express.static(publicDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const roomManager = new RoomManager(io, config.disconnectGraceMs, (roomId, playerIds, score, level, lines, mode) => {
  void socialService.recordMatch(roomId, playerIds, score, level, lines, mode);
});
socialService = new SocialService(io, roomManager);
const matchmaking = new MatchmakingService(io, roomManager);
registerSocketGateway(io, authService, roomManager, matchmaking, socialService);

server.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "coop tetris server listening");
});

type ParsedCredentials =
  | { ok: true; username: string; displayName: string; password: string }
  | { ok: false; message: string };

function parseCredentials(body: unknown): ParsedCredentials {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body is required." };
  }

  const record = body as Record<string, unknown>;
  const username = normalizeUsername(record.username);
  const displayName = typeof record.displayName === "string" ? record.displayName.trim().slice(0, 24) : username;
  const password = typeof record.password === "string" ? record.password : "";

  if (!username || username.length < 3) {
    return { ok: false, message: "Username must be at least 3 characters." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  return { ok: true, username, displayName: displayName || username, password };
}

function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) : "";
}

function authHeaderToken(value: string | undefined): string | null {
  if (!value?.startsWith("Bearer ")) {
    return null;
  }
  return value.slice("Bearer ".length);
}

function requireAuth(authorization: string | undefined, res: express.Response): { userId: string; displayName: string } | null {
  const token = authHeaderToken(authorization);
  if (!token) {
    res.status(401).json({ message: "Missing bearer token." });
    return null;
  }

  try {
    return authService.verifyToken(token);
  } catch {
    res.status(401).json({ message: "Invalid token." });
    return null;
  }
}

function handleSocialError(res: express.Response, error: unknown, logMessage: string): void {
  if (error instanceof SocialError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  logger.error({ error }, logMessage);
  res.status(500).json({ message: "Social request failed." });
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === code);
}
