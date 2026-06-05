import type { Server, Socket } from "socket.io";
import type {
  AuthUser,
  ClientInput,
  ClientToServerEvents,
  ServerToClientEvents,
  TerritoryFormat,
  TerritoryPreviewAction,
  TerritoryTurnAction,
} from "../shared/types";
import { AuthService } from "./authService";
import { logger } from "./logger";
import { MatchmakingService } from "./matchmakingService";
import { RoomManager } from "./roomManager";
import { SocialService } from "./socialService";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents> & { data: { user?: AuthUser } };

export function registerSocketGateway(
  io: GameServer,
  authService: AuthService,
  roomManager: RoomManager,
  matchmaking: MatchmakingService,
  socialService: SocialService,
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
    socialService.addOnline(socket, user);
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
      if (roomManager.isSocketInRoom(socket.id)) {
        socket.emit("serverError", { message: "You are already in a room." });
        return;
      }
      matchmaking.remove(socket.id);
      const state = roomManager.createPracticeRoom(user, socket.id, botSpeed);
      const player = state.players.A;
      if (!player) {
        throw new Error("Practice room created without player A.");
      }
      socket.emit("roomJoined", { roomId: state.roomId, slot: "A", reconnectToken: player.reconnectToken, mode: "classic" });
      const snapshot = roomManager.snapshotForSocket(socket.id);
      if (snapshot) {
        socket.emit("snapshot", snapshot);
      }
    });

    socket.on("joinFriend", ({ friendId }) => {
      if (typeof friendId !== "string" || !friendId) {
        socket.emit("serverError", { message: "Choose a friend to join." });
        return;
      }
      matchmaking.remove(socket.id);
      void socialService.joinFriend(socket, user, friendId).catch((error) => {
        logger.error({ error, userId: user.userId, friendId }, "friend join failed");
        socket.emit("serverError", { message: "Could not start a friend game." });
      });
    });

    socket.on("joinTerritory", ({ format }) => {
      if (!isTerritoryFormat(format)) {
        socket.emit("serverError", { message: "Invalid territory format." });
        return;
      }
      matchmaking.joinTerritory(socket, user, format);
    });

    socket.on("reconnectRoom", ({ roomId, reconnectToken }) => {
      const player = roomManager.reconnect(socket.id, user, roomId, reconnectToken);
      if (!player) {
        socket.emit("serverError", { message: "Reconnect failed. Room or token was invalid." });
        return;
      }
      const snapshot = roomManager.snapshotForSocket(socket.id);
      if (snapshot) {
        socket.emit("roomJoined", { roomId, slot: player.slot, reconnectToken: player.reconnectToken, mode: "classic" });
        socket.emit("snapshot", snapshot);
        return;
      }
      const territorySnapshot = roomManager.territorySnapshotForSocket(socket.id);
      if (territorySnapshot) {
        socket.emit("roomJoined", {
          roomId,
          slot: player.slot,
          reconnectToken: player.reconnectToken,
          mode: "territory",
          format: territorySnapshot.format,
        });
        socket.emit("territorySnapshot", territorySnapshot);
      }
    });

    socket.on("input", (input: ClientInput) => {
      if (!isValidInput(input)) {
        socket.emit("serverError", { message: "Invalid input packet." });
        return;
      }
      roomManager.enqueueInput(socket.id, input);
    });

    socket.on("territoryAction", (action: TerritoryTurnAction) => {
      if (!isValidTerritoryAction(action)) {
        socket.emit("serverError", { message: "Invalid territory action." });
        return;
      }
      roomManager.enqueueTerritoryAction(socket.id, action);
    });

    socket.on("territoryPreview", (preview: TerritoryPreviewAction) => {
      if (!isValidTerritoryPreview(preview)) {
        socket.emit("serverError", { message: "Invalid territory preview." });
        return;
      }
      roomManager.updateTerritoryPreview(socket.id, preview);
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
      socialService.removeOnline(socket.id, user.userId);
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

function isTerritoryFormat(value: unknown): value is TerritoryFormat {
  return value === "bullet" || value === "blitz" || value === "rapid";
}

function isValidTerritoryAction(action: TerritoryTurnAction): boolean {
  if (!action || typeof action !== "object") {
    return false;
  }
  if (action.kind === "pass") {
    return action.slot === "A" || action.slot === "B";
  }
  if (action.kind === "hold") {
    return (action.slot === "A" || action.slot === "B") && typeof action.draftId === "string" && action.draftId.length > 0;
  }
  if (action.kind === "place") {
    const hasValidPlacementFields =
      (action.slot === "A" || action.slot === "B") &&
      Number.isInteger(action.rotation) &&
      Number.isInteger(action.lane) &&
      action.lane >= 0 &&
      ["top", "bottom", "left", "right"].includes(action.edge);
    if (!hasValidPlacementFields) {
      return false;
    }
    return action.source === "hold" || (action.source === "draft" && typeof action.draftId === "string" && action.draftId.length > 0);
  }
  return false;
}

function isValidTerritoryPreview(preview: TerritoryPreviewAction): boolean {
  if (preview.kind === "select") {
    return (
      (preview.slot === "A" || preview.slot === "B") &&
      (preview.source === "hold" || (preview.source === "draft" && typeof preview.draftId === "string" && preview.draftId.length > 0))
    );
  }
  return (
    preview.kind === "input" &&
    (preview.slot === "A" || preview.slot === "B") &&
    ["moveLeft", "moveRight", "softDrop", "rotateCW", "rotateCCW"].includes(preview.action)
  );
}
