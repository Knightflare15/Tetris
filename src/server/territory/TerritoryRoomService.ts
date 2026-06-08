import crypto from "crypto";
import type { Server } from "socket.io";
import { seedFromText } from "../../shared/rng";
import {
  createTerritoryRoomState,
  expireTerritoryTurn,
  hasAnyLegalTerritoryAction,
  resolveTerritoryTurn,
  snapshotTerritoryRoom,
  updateTerritoryPreview,
} from "../../shared/territory/engine";
import {
  type AuthUser,
  type PlayerSlot,
  type TerritoryFormat,
  type TerritoryMatchResult,
  type TerritoryPlayerState,
  type TerritoryPreviewAction,
  type TerritoryRoomState,
  type TerritoryTurnAction,
} from "../../shared/types";
import { logger } from "../logger";

interface ManagedTerritoryRoom {
  state: TerritoryRoomState;
  sockets: Map<PlayerSlot, string>;
  interval: NodeJS.Timeout;
  cleanupTimer: NodeJS.Timeout | null;
}

export class TerritoryRoomService {
  private readonly rooms = new Map<string, ManagedTerritoryRoom>();
  private readonly socketToRoom = new Map<string, string>();

  constructor(
    private readonly io: Server,
    private readonly disconnectGraceMs: number,
    private readonly onMatchEnded?: (
      roomId: string,
      playerIds: string[],
      score: number,
      level: number,
      lines: number,
      mode: string,
      territoryResult?: TerritoryMatchResult,
    ) => void,
  ) {}

  createRoom(playerA: AuthUser, socketA: string, playerB: AuthUser, socketB: string, format: TerritoryFormat): TerritoryRoomState {
    const roomId = crypto.randomUUID();
    const seed = seedFromText(`${roomId}:territory:${format}:${Date.now()}`);
    const state = createTerritoryRoomState(
      roomId,
      format,
      seed,
      { userId: playerA.userId, displayName: playerA.displayName, reconnectToken: crypto.randomUUID() },
      { userId: playerB.userId, displayName: playerB.displayName, reconnectToken: crypto.randomUUID() },
    );

    const room: ManagedTerritoryRoom = {
      state,
      sockets: new Map([
        ["A", socketA],
        ["B", socketB],
      ]),
      interval: setInterval(() => this.tickRoom(roomId), 250),
      cleanupTimer: null,
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketA, roomId);
    this.socketToRoom.set(socketB, roomId);
    this.io.sockets.sockets.get(socketA)?.join(roomId);
    this.io.sockets.sockets.get(socketB)?.join(roomId);

    logger.info({ roomId, format, players: [playerA.userId, playerB.userId] }, "territory room created");
    return state;
  }

  enqueueAction(socketId: string, action: TerritoryTurnAction): void {
    const room = this.roomForSocket(socketId);
    if (!room) {
      return;
    }
    const player = this.playerForSocket(room, socketId);
    if (!player) {
      return;
    }

    const normalizedAction = { ...action, slot: player.slot } as TerritoryTurnAction;
    const result = resolveTerritoryTurn(room.state, normalizedAction);
    if (!result.accepted && result.message) {
      this.io.sockets.sockets.get(socketId)?.emit("serverError", { message: result.message });
    }
    this.io.to(room.state.id).emit("territorySnapshot", result.snapshot);
    this.finalizeIfEnded(room.state.id);
  }

  updatePreview(socketId: string, preview: TerritoryPreviewAction): void {
    const room = this.roomForSocket(socketId);
    if (!room) {
      return;
    }
    const player = this.playerForSocket(room, socketId);
    if (!player) {
      return;
    }

    const snapshot = updateTerritoryPreview(room.state, { ...preview, slot: player.slot });
    this.io.to(room.state.id).emit("territorySnapshot", snapshot);
  }

  markDisconnected(socketId: string): boolean {
    const room = this.roomForSocket(socketId);
    if (!room) {
      return false;
    }
    const player = this.playerForSocket(room, socketId);
    if (!player) {
      return false;
    }
    player.connected = false;
    room.sockets.delete(player.slot);
    this.socketToRoom.delete(socketId);
    this.io.to(room.state.id).emit("territorySnapshot", snapshotTerritoryRoom(room.state));
    logger.info({ roomId: room.state.id, slot: player.slot, userId: player.userId }, "territory player disconnected");

    if (!room.cleanupTimer) {
      room.cleanupTimer = setTimeout(() => this.cleanupIfEmpty(room.state.id), this.disconnectGraceMs);
    }
    return true;
  }

  reconnect(socketId: string, user: AuthUser, roomId: string, reconnectToken: string): TerritoryPlayerState | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const player = (["A", "B"] as PlayerSlot[])
      .map((slot) => room.state.players[slot])
      .find((candidate) => candidate.userId === user.userId && candidate.reconnectToken === reconnectToken);
    if (!player) {
      return null;
    }

    const oldSocketId = room.sockets.get(player.slot);
    if (oldSocketId) {
      this.socketToRoom.delete(oldSocketId);
    }

    room.sockets.set(player.slot, socketId);
    this.socketToRoom.set(socketId, roomId);
    this.io.sockets.sockets.get(socketId)?.join(roomId);
    player.connected = true;

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }

    logger.info({ roomId, slot: player.slot, userId: user.userId }, "territory player reconnected");
    return player;
  }

  snapshotForSocket(socketId: string): ReturnType<typeof snapshotTerritoryRoom> | null {
    const room = this.roomForSocket(socketId);
    return room ? snapshotTerritoryRoom(room.state) : null;
  }

  hasSocket(socketId: string): boolean {
    return this.socketToRoom.has(socketId);
  }

  private tickRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.state.status !== "playing") {
      return;
    }

    const now = Date.now();
    if (!hasAnyLegalTerritoryAction(room.state) || now >= room.state.turn.turnEndsAt) {
      const result = expireTerritoryTurn(room.state, now);
      this.io.to(roomId).emit("territorySnapshot", result.snapshot);
      this.finalizeIfEnded(roomId);
    }
  }

  private finalizeIfEnded(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.state.status !== "ended") {
      return;
    }

    logger.info({ roomId, winner: room.state.winner, reason: room.state.winnerReason }, "territory room ended");
    clearInterval(room.interval);
    this.onMatchEnded?.(
      roomId,
      (["A", "B"] as PlayerSlot[])
        .map((slot) => room.state.players[slot].userId)
        .filter((userId): userId is string => Boolean(userId)),
      Math.max(room.state.scores.weighted.A, room.state.scores.weighted.B),
      0,
      0,
      `territory-${room.state.format}`,
      {
        format: room.state.format,
        winner: room.state.winner,
        winnerReason: room.state.winnerReason,
        players: {
          A: { userId: room.state.players.A.userId, score: room.state.scores.weighted.A },
          B: { userId: room.state.players.B.userId, score: room.state.scores.weighted.B },
        },
      },
    );
    setTimeout(() => this.destroyRoom(roomId), 5000);
  }

  private cleanupIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    const hasConnectedPlayer = (["A", "B"] as PlayerSlot[]).some((slot) => room.state.players[slot].connected);
    if (!hasConnectedPlayer) {
      this.destroyRoom(roomId);
    } else {
      room.cleanupTimer = null;
    }
  }

  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    clearInterval(room.interval);
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
    }
    for (const socketId of room.sockets.values()) {
      this.socketToRoom.delete(socketId);
    }
    this.rooms.delete(roomId);
    logger.info({ roomId }, "territory room destroyed");
  }

  private roomForSocket(socketId: string): ManagedTerritoryRoom | null {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) ?? null : null;
  }

  private playerForSocket(room: ManagedTerritoryRoom, socketId: string): TerritoryPlayerState | null {
    for (const [slot, mappedSocket] of room.sockets.entries()) {
      if (mappedSocket === socketId) {
        return room.state.players[slot];
      }
    }
    return null;
  }
}
