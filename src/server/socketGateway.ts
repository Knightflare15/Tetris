import type { Server, Socket } from "socket.io";
import type { AuthUser, ClientInput, ClientToServerEvents, ServerToClientEvents } from "../shared/types";
import { AuthService } from "./authService";
import { logger } from "./logger";
import { MatchmakingService } from "./matchmakingService";
import { RoomManager } from "./roomManager";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents> & { data: { user?: AuthUser } };

export function registerSocketGateway(
  io: GameServer,
  authService: AuthService,
  roomManager: RoomManager,
  matchmaking: MatchmakingService,
): void {
  io.use((socket: GameSocket, next) => {
    try {
      const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : "";
      if (!token) {
        next(new Error("Missing websocket auth token."));
        return;
      }
      socket.data.user = authService.verifyToken(token);
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Authentication failed."));
    }
  });

  io.on("connection", (socket: GameSocket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    logger.info({ socketId: socket.id, userId: user.userId }, "socket connected");
    socket.emit("authenticated", { user });

    socket.on("joinMatchmaking", () => {
      matchmaking.join(socket, user);
    });

    socket.on("joinPractice", (payload) => {
      const botSpeed = payload?.botSpeed;
      if (!isPracticeBotSpeed(botSpeed)) {
        socket.emit("serverError", { message: "Invalid practice speed." });
        return;
      }
      if (roomManager.playerFor(socket.id)) {
        socket.emit("serverError", { message: "You are already in a room." });
        return;
      }
      matchmaking.remove(socket.id);
      const state = roomManager.createPracticeRoom(user, socket.id, botSpeed);
      const player = state.players.A;
      if (!player) {
        throw new Error("Practice room created without player A.");
      }
      socket.emit("roomJoined", { roomId: state.roomId, slot: "A", reconnectToken: player.reconnectToken });
      const snapshot = roomManager.snapshotForSocket(socket.id);
      if (snapshot) {
        socket.emit("snapshot", snapshot);
      }
    });

    socket.on("reconnectRoom", ({ roomId, reconnectToken }) => {
      const player = roomManager.reconnect(socket.id, user, roomId, reconnectToken);
      if (!player) {
        socket.emit("serverError", { message: "Reconnect failed. Room or token was invalid." });
        return;
      }
      socket.emit("roomJoined", { roomId, slot: player.slot, reconnectToken: player.reconnectToken });
      const snapshot = roomManager.snapshotForSocket(socket.id);
      if (snapshot) {
        socket.emit("snapshot", snapshot);
      }
    });

    socket.on("input", (input: ClientInput) => {
      if (!isValidInput(input)) {
        socket.emit("serverError", { message: "Invalid input packet." });
        return;
      }
      roomManager.enqueueInput(socket.id, input);
    });

    socket.on("pingCheck", ({ clientTime }) => {
      const latencyMs = Math.max(0, Date.now() - clientTime);
      roomManager.updateLatency(socket.id, latencyMs);
      socket.emit("latency", { latencyMs, serverTime: Date.now() });
      logger.debug({ socketId: socket.id, userId: user.userId, latencyMs }, "latency sample");
    });

    socket.on("disconnect", (reason) => {
      matchmaking.remove(socket.id);
      roomManager.markDisconnected(socket.id);
      logger.info({ socketId: socket.id, userId: user.userId, reason }, "socket disconnected");
    });
  });
}

function isValidInput(input: ClientInput): boolean {
  return (
    Number.isInteger(input.seq) &&
    input.seq > 0 &&
    typeof input.sentAt === "number" &&
    [
      "moveLeft",
      "moveRight",
      "softDrop",
      "rotateCW",
      "rotateCCW",
      "hardDrop",
      "hold",
    ].includes(input.action)
  );
}

function isPracticeBotSpeed(value: unknown): value is "slow" | "balanced" | "quick" {
  return value === "slow" || value === "balanced" || value === "quick";
}
