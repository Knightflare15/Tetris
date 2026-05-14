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

const publicDir = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const roomManager = new RoomManager(io, config.disconnectGraceMs);
const matchmaking = new MatchmakingService(io, roomManager);
registerSocketGateway(io, authService, roomManager, matchmaking);

server.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "coop tetris server listening");
});
