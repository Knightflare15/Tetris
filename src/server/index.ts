import http from "http";
import path from "path";
import crypto from "crypto";
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
import { EmailService } from "./emailService";

const config = loadConfig();
const authService = new AuthService(config.jwtSecret);
const emailService = new EmailService(config);
const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: config.nodeEnv === "production" ? false : config.clientOrigin,
    credentials: true,
  },
});
let socialService: SocialService;

interface PendingRegistration {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: number;
}

interface PendingPasswordReset {
  userId: string;
  email: string;
  displayName: string;
  otpHash: string;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();
const pendingPasswordResets = new Map<string, PendingPasswordReset>();

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
    const submittedOtp = normalizeOtp(req.body?.otp);
    if (!submittedOtp) {
      const existingUser = await getPrisma().user.findFirst({
        where: { OR: [{ username: parsed.username }, { email: parsed.email }] },
        select: { id: true },
      });
      if (existingUser) {
        res.status(409).json({ message: "Username or email is already taken." });
        return;
      }

      const otp = createOtp();
      pendingRegistrations.set(parsed.email, {
        username: parsed.username,
        email: parsed.email,
        displayName: parsed.displayName,
        passwordHash: await hashPassword(parsed.password),
        otpHash: hashOtp(otp),
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      await emailService.sendRegistrationOtp(parsed.email, parsed.displayName, otp);
      res.status(202).json({ otpRequired: true, message: "We sent a 6-digit OTP to your email." });
      return;
    }

    const pending = pendingRegistrations.get(parsed.email);
    if (
      !pending ||
      pending.expiresAt < Date.now() ||
      pending.username !== parsed.username ||
      pending.otpHash !== hashOtp(submittedOtp)
    ) {
      res.status(400).json({ message: "OTP is invalid or expired. Request a new code." });
      return;
    }

    const user = await getPrisma().user.create({
      data: {
        username: pending.username,
        email: pending.email,
        displayName: pending.displayName,
        passwordHash: pending.passwordHash,
      },
      select: { id: true, displayName: true },
    });
    pendingRegistrations.delete(parsed.email);
    const token = authService.createToken({ userId: user.id, displayName: user.displayName });
    res.status(201).json({
      token,
      user: { userId: user.id, displayName: user.displayName },
    });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      res.status(409).json({ message: "Username or email is already taken." });
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

app.post("/auth/forgot-password", async (req, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ message: "Database auth is not configured. Use guest mode." });
    return;
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ message: "A valid email address is required." });
    return;
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true },
    });
    if (user?.email) {
      const otp = createOtp();
      pendingPasswordResets.set(user.email, {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        otpHash: hashOtp(otp),
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      await emailService.sendPasswordResetOtp(user.email, user.displayName, otp);
    }

    res.status(202).json({ message: "If that email exists, we sent a password reset OTP." });
  } catch (error) {
    logger.error({ error }, "forgot password failed");
    res.status(500).json({ message: "Password reset request failed." });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ message: "Database auth is not configured. Use guest mode." });
    return;
  }

  const email = normalizeEmail(req.body?.email);
  const otp = normalizeOtp(req.body?.otp);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !otp || password.length < 8) {
    res.status(400).json({ message: "Email, 6-digit OTP, and a new password are required." });
    return;
  }

  const pending = pendingPasswordResets.get(email);
  if (!pending || pending.expiresAt < Date.now() || pending.otpHash !== hashOtp(otp)) {
    res.status(400).json({ message: "OTP is invalid or expired. Request a new code." });
    return;
  }

  try {
    await getPrisma().user.update({
      where: { id: pending.userId },
      data: { passwordHash: await hashPassword(password) },
    });
    pendingPasswordResets.delete(email);
    res.json({ message: "Password reset. You can log in with the new password." });
  } catch (error) {
    logger.error({ error }, "password reset failed");
    res.status(500).json({ message: "Password reset failed." });
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
  | { ok: true; username: string; email: string; displayName: string; password: string }
  | { ok: false; message: string };

function parseCredentials(body: unknown): ParsedCredentials {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body is required." };
  }

  const record = body as Record<string, unknown>;
  const username = normalizeUsername(record.username);
  const email = normalizeEmail(record.email);
  const displayName = typeof record.displayName === "string" ? record.displayName.trim().slice(0, 24) : username;
  const password = typeof record.password === "string" ? record.password : "";

  if (!username || username.length < 3) {
    return { ok: false, message: "Username must be at least 3 characters." };
  }
  if (!email) {
    return { ok: false, message: "A valid email address is required." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  return { ok: true, username, email, displayName: displayName || username, password };
}

function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) : "";
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const email = value.trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeOtp(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : "";
}

function createOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
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
