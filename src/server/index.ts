import http from "http";
import path from "path";
import crypto from "crypto";
import cors from "cors";
import express from "express";
import type { Prisma } from "@prisma/client";
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
import { OidcService, type OidcUserProfile } from "./oidcService";
import { createRateLimiter, enforceRateLimit } from "./rateLimiter";
import { checkRedisHealth, warmRedis } from "./redis";
import { createTransientStore } from "./transientStore";

const config = loadConfig();
const authService = new AuthService(config.jwtSecret);
const emailService = new EmailService(config);
const transientStore = createTransientStore(config.redisUrl);
const rateLimiter = createRateLimiter(config.redisUrl);
const oidcService = config.oidc ? new OidcService(config.oidc, transientStore) : null;
const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: config.nodeEnv === "production" ? false : config.clientOrigin,
    credentials: true,
  },
});
let socialService: SocialService;

const TEN_MINUTES_MS = 10 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

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

app.use(cors({ origin: config.nodeEnv === "production" ? false : config.clientOrigin }));
app.set("trust proxy", 1);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "coop-tetris", time: new Date().toISOString() });
});

app.get("/health/ready", async (_req, res) => {
  const redis = await checkRedisHealth(config.redisUrl);
  const dependencies = {
    database: {
      configured: isDatabaseConfigured(),
    },
    redis,
  };

  const ready = !redis.configured || redis.healthy;
  res.status(ready ? 200 : 503).json({
    ok: ready,
    service: "coop-tetris",
    time: new Date().toISOString(),
    dependencies,
  });
});

app.get("/auth/oidc/config", (_req, res) => {
  res.json({
    enabled: Boolean(oidcService && isDatabaseConfigured()),
    providerName: oidcService?.providerName ?? null,
  });
});

app.get("/auth/oidc/start", async (_req, res) => {
  if (!(await enforceRateLimit(rateLimiter, _req, res, "auth:oidc:start", 20, TEN_MINUTES_MS))) {
    return;
  }
  if (!oidcService) {
    res.status(404).json({ message: "Single sign-on is not configured." });
    return;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ message: "Database auth is not configured." });
    return;
  }

  try {
    res.redirect(await oidcService.createAuthorizationUrl());
  } catch (error) {
    logger.error({ error }, "oidc authorization start failed");
    res.redirect(buildAuthRedirect({ error: "Could not start single sign-on." }));
  }
});

app.get("/auth/oidc/callback", async (req, res) => {
  if (!oidcService) {
    res.redirect(buildAuthRedirect({ error: "Single sign-on is not configured." }));
    return;
  }
  if (!isDatabaseConfigured()) {
    res.redirect(buildAuthRedirect({ error: "Database auth is not configured." }));
    return;
  }

  const providerError = typeof req.query.error === "string" ? req.query.error : "";
  const providerErrorDescription =
    typeof req.query.error_description === "string" ? req.query.error_description : "";
  if (providerError) {
    res.redirect(buildAuthRedirect({ error: providerErrorDescription || providerError }));
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !state) {
    res.redirect(buildAuthRedirect({ error: "Missing authorization code from the identity provider." }));
    return;
  }

  try {
    const profile = await oidcService.exchangeCode(code, state);
    const user = await findOrCreateOidcUser(profile);
    const token = authService.createToken({ userId: user.id, displayName: user.displayName });
    res.redirect(buildAuthRedirect({ token }));
  } catch (error) {
    logger.error({ error }, "oidc callback failed");
    res.redirect(buildAuthRedirect({ error: errorMessage(error, "Single sign-on failed.") }));
  }
});

app.post("/auth/demo", (req, res) => {
  void (async () => {
    if (!(await enforceRateLimit(rateLimiter, req, res, "auth:demo", 30, TEN_MINUTES_MS))) {
      return;
    }
    const displayName = typeof req.body?.displayName === "string" ? req.body.displayName : "Player";
    const token = authService.createDemoToken(displayName);
    res.json({ token });
  })().catch((error) => {
    logger.error({ error }, "demo auth failed");
    res.status(500).json({ message: "Demo auth failed." });
  });
});

app.post("/auth/register", async (req, res) => {
  if (!(await enforceRateLimit(rateLimiter, req, res, "auth:register", 8, FIFTEEN_MINUTES_MS))) {
    return;
  }
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
      await transientStore.setJson<PendingRegistration>(registrationKey(parsed.email), {
        username: parsed.username,
        email: parsed.email,
        displayName: parsed.displayName,
        passwordHash: await hashPassword(parsed.password),
        otpHash: hashOtp(otp),
        expiresAt: Date.now() + 10 * 60 * 1000,
      }, 10 * 60 * 1000);
      await emailService.sendRegistrationOtp(parsed.email, parsed.displayName, otp);
      res.status(202).json({ otpRequired: true, message: "We sent a 6-digit OTP to your email." });
      return;
    }

    const pending = await transientStore.getJson<PendingRegistration>(registrationKey(parsed.email));
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
    await transientStore.delete(registrationKey(parsed.email));
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
  if (!(await enforceRateLimit(rateLimiter, req, res, "auth:login", 15, TEN_MINUTES_MS))) {
    return;
  }
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
    if (!user) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }
    if (!user.passwordHash) {
      res.status(400).json({ message: "This account uses single sign-on. Continue with your identity provider." });
      return;
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
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
  if (!(await enforceRateLimit(rateLimiter, req, res, "auth:forgot-password", 6, FIFTEEN_MINUTES_MS))) {
    return;
  }
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
      await transientStore.setJson<PendingPasswordReset>(passwordResetKey(user.email), {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        otpHash: hashOtp(otp),
        expiresAt: Date.now() + 10 * 60 * 1000,
      }, 10 * 60 * 1000);
      await emailService.sendPasswordResetOtp(user.email, user.displayName, otp);
    }

    res.status(202).json({ message: "If that email exists, we sent a password reset OTP." });
  } catch (error) {
    logger.error({ error }, "forgot password failed");
    res.status(500).json({ message: "Password reset request failed." });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  if (!(await enforceRateLimit(rateLimiter, req, res, "auth:reset-password", 10, FIFTEEN_MINUTES_MS))) {
    return;
  }
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

  const pending = await transientStore.getJson<PendingPasswordReset>(passwordResetKey(email));
  if (!pending || pending.expiresAt < Date.now() || pending.otpHash !== hashOtp(otp)) {
    res.status(400).json({ message: "OTP is invalid or expired. Request a new code." });
    return;
  }

  try {
    await getPrisma().user.update({
      where: { id: pending.userId },
      data: { passwordHash: await hashPassword(password) },
    });
    await transientStore.delete(passwordResetKey(email));
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
app.use("/assets", express.static(path.resolve(process.cwd(), "src/assets")));
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

if (config.redisUrl) {
  void warmRedis(config.redisUrl)
    .then(() => {
      logger.info("redis warmup succeeded");
    })
    .catch((error) => {
      logger.error({ error }, "redis warmup failed");
    });
}

server.listen(config.port, config.host, () => {
  logger.info(
    {
      host: config.host,
      port: config.port,
      env: config.nodeEnv,
      redisConfigured: Boolean(config.redisUrl),
    },
    "coop tetris server listening",
  );
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

function registrationKey(email: string): string {
  return `auth:register:${email}`;
}

function passwordResetKey(email: string): string {
  return `auth:reset:${email}`;
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

async function findOrCreateOidcUser(profile: OidcUserProfile): Promise<{ id: string; displayName: string }> {
  const existingAccount = await getPrisma().oidcAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: {
      user: {
        select: { id: true, displayName: true },
      },
    },
  });

  if (existingAccount?.user) {
    const now = new Date();
    await getPrisma().oidcAccount.update({
      where: { id: existingAccount.id },
      data: {
        email: profile.email,
        emailVerified: profile.emailVerified,
        lastLoginAt: now,
        user: {
          update: {
            displayName: normalizeDisplayName(profile.displayName),
            email: profile.email,
            lastLoginAt: now,
          },
        },
      },
    });
    return {
      id: existingAccount.user.id,
      displayName: normalizeDisplayName(profile.displayName),
    };
  }

  const now = new Date();
  return getPrisma().$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { email: profile.email },
      select: { id: true, displayName: true },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          username: await createUniqueUsername(tx, profile.usernameHint),
          email: profile.email,
          displayName: normalizeDisplayName(profile.displayName),
          lastLoginAt: now,
        },
        select: { id: true, displayName: true },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          email: profile.email,
          displayName: normalizeDisplayName(profile.displayName),
          lastLoginAt: now,
        },
        select: { id: true, displayName: true },
      });
    }

    await tx.oidcAccount.create({
      data: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        emailVerified: profile.emailVerified,
        lastLoginAt: now,
        userId: user.id,
      },
    });

    return user;
  });
}

async function createUniqueUsername(tx: Prisma.TransactionClient, candidate: string): Promise<string> {
  const base = normalizeUsername(candidate) || "player";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = attempt === 0 ? "" : crypto.randomInt(10, 99999).toString();
    const username = `${base}${suffix}`.slice(0, 24);
    const existing = await tx.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!existing) {
      return username;
    }
  }

  return `player${crypto.randomInt(100000, 999999)}`.slice(0, 24);
}

function normalizeDisplayName(value: string): string {
  return value.trim().slice(0, 24) || "Player";
}

function buildAuthRedirect({
  token,
  error,
}: {
  token?: string;
  error?: string;
}): string {
  const redirectUrl = new URL(config.clientOrigin);
  const hash = new URLSearchParams();
  if (token) {
    hash.set("auth_token", token);
    hash.set("auth_mode", "account");
  }
  if (error) {
    hash.set("auth_error", error);
  }
  redirectUrl.hash = hash.toString();
  return redirectUrl.toString();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
