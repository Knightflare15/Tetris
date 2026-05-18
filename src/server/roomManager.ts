import crypto from "crypto";
import type { Server } from "socket.io";
import {
  createPlayerState,
  createRoomState,
  simulateTick,
  snapshotRoom,
  startRoom,
} from "../shared/engine";
import {
  TICK_MS,
  type AuthUser,
  type PlayerGameState,
  type PlayerSlot,
  type PracticeBotSpeed,
  type QueuedInput,
  type RoomState,
} from "../shared/types";
import { seedFromText } from "../shared/rng";
import { logger } from "./logger";
import { createBotRuntime, nextBotAction, type BotRuntime } from "./botPlayer";

interface ManagedRoom {
  state: RoomState;
  sockets: Map<PlayerSlot, string>;
  inputBuffer: QueuedInput[];
  interval: NodeJS.Timeout;
  cleanupTimer: NodeJS.Timeout | null;
  bot: BotRuntime | null;
}

export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>();
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
    ) => void,
  ) {}

  createRoom(playerA: AuthUser, socketA: string, playerB: AuthUser, socketB: string): RoomState {
    const roomId = crypto.randomUUID();
    const seed = seedFromText(`${roomId}:${Date.now()}`);
    const state = createRoomState(roomId, seed);
    state.players.A = createPlayerState("A", playerA.userId, playerA.displayName, crypto.randomUUID(), seed + 101);
    state.players.B = createPlayerState("B", playerB.userId, playerB.displayName, crypto.randomUUID(), seed + 202);
    startRoom(state);

    const room: ManagedRoom = {
      state,
      sockets: new Map([
        ["A", socketA],
        ["B", socketB],
      ]),
      inputBuffer: [],
      interval: setInterval(() => this.tickRoom(roomId), TICK_MS),
      cleanupTimer: null,
      bot: null,
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketA, roomId);
    this.socketToRoom.set(socketB, roomId);
    this.io.sockets.sockets.get(socketA)?.join(roomId);
    this.io.sockets.sockets.get(socketB)?.join(roomId);

    logger.info({ roomId, players: [playerA.userId, playerB.userId] }, "room created");
    return state;
  }

  createPracticeRoom(player: AuthUser, socketId: string, botSpeed: PracticeBotSpeed): RoomState {
    const roomId = crypto.randomUUID();
    const seed = seedFromText(`${roomId}:practice:${Date.now()}`);
    const state = createRoomState(roomId, seed);
    state.players.A = createPlayerState("A", player.userId, player.displayName, crypto.randomUUID(), seed + 101);
    state.players.B = createPlayerState("B", `bot-${roomId}`, "Practice Bot", crypto.randomUUID(), seed + 202);
    startRoom(state);

    const room: ManagedRoom = {
      state,
      sockets: new Map([["A", socketId]]),
      inputBuffer: [],
      interval: setInterval(() => this.tickRoom(roomId), TICK_MS),
      cleanupTimer: null,
      bot: createBotRuntime(botSpeed),
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketId, roomId);
    this.io.sockets.sockets.get(socketId)?.join(roomId);

    logger.info({ roomId, player: player.userId }, "practice room created");
    return state;
  }

  enqueueInput(socketId: string, input: Omit<QueuedInput, "socketId" | "playerId" | "slot" | "receivedAt" | "serverOrder">): void {
    const room = this.roomForSocket(socketId);
    if (!room) {
      return;
    }
    const player = this.playerForSocket(room, socketId);
    if (!player) {
      return;
    }

    room.state.inputOrder += 1;
    room.inputBuffer.push({
      ...input,
      socketId,
      playerId: player.userId,
      slot: player.slot,
      receivedAt: Date.now(),
      serverOrder: room.state.inputOrder,
    });
  }

  markDisconnected(socketId: string): void {
    const room = this.roomForSocket(socketId);
    if (!room) {
      return;
    }
    const player = this.playerForSocket(room, socketId);
    if (!player) {
      return;
    }
    player.connected = false;
    room.sockets.delete(player.slot);
    this.socketToRoom.delete(socketId);
    logger.info({ roomId: room.state.roomId, slot: player.slot, userId: player.userId }, "player disconnected");

    if (!room.cleanupTimer) {
      room.cleanupTimer = setTimeout(() => this.cleanupIfEmpty(room.state.roomId), this.disconnectGraceMs);
    }
  }

  reconnect(socketId: string, user: AuthUser, roomId: string, reconnectToken: string): PlayerGameState | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const player = (["A", "B"] as PlayerSlot[])
      .map((slot) => room.state.players[slot])
      .find((candidate): candidate is PlayerGameState =>
        Boolean(candidate && candidate.userId === user.userId && candidate.reconnectToken === reconnectToken),
      );

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

    logger.info({ roomId, slot: player.slot, userId: user.userId }, "player reconnected");
    return player;
  }

  updateLatency(socketId: string, latencyMs: number): void {
    const room = this.roomForSocket(socketId);
    const player = room ? this.playerForSocket(room, socketId) : null;
    if (player) {
      player.latencyMs = latencyMs;
    }
  }

  snapshotForSocket(socketId: string): ReturnType<typeof snapshotRoom> | null {
    const room = this.roomForSocket(socketId);
    return room ? snapshotRoom(room.state) : null;
  }

  playerFor(socketId: string): PlayerGameState | null {
    const room = this.roomForSocket(socketId);
    return room ? this.playerForSocket(room, socketId) : null;
  }

  private tickRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const inputs = room.inputBuffer.splice(0);
    const botInput = this.nextBotInput(room);
    if (botInput) {
      inputs.push(botInput);
    }
    const diagnostics = simulateTick(room.state, inputs);
    if (diagnostics.locks.length || diagnostics.holdConflicts.length || diagnostics.lineClears || diagnostics.gameOver) {
      logger.info({ roomId, diagnostics }, "simulation diagnostics");
    }

    this.io.to(roomId).emit("snapshot", snapshotRoom(room.state));

    if (room.state.status === "ended") {
      logger.info({ roomId }, "room ended");
      clearInterval(room.interval);
      this.onMatchEnded?.(
        roomId,
        (["A", "B"] as PlayerSlot[])
          .map((slot) => room.state.players[slot]?.userId)
          .filter((userId): userId is string => Boolean(userId)),
        room.state.score,
        room.state.level,
        room.state.lines,
        room.bot ? "practice" : "coop",
      );
      setTimeout(() => this.destroyRoom(roomId), 5000);
    }
  }

  private cleanupIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    const hasConnectedPlayer = (["A", "B"] as PlayerSlot[]).some((slot) => room.state.players[slot]?.connected);
    if (!hasConnectedPlayer) {
      this.destroyRoom(roomId);
    } else {
      room.cleanupTimer = null;
    }
  }

  private nextBotInput(room: ManagedRoom): QueuedInput | null {
    if (!room.bot) {
      return null;
    }

    const action = nextBotAction(room.state, room.bot);
    if (!action) {
      return null;
    }

    room.bot.seq += 1;
    room.state.inputOrder += 1;
    return {
      seq: room.bot.seq,
      action,
      clientTick: room.state.tick,
      sentAt: Date.now(),
      socketId: "practice-bot",
      playerId: room.state.players.B?.userId ?? "practice-bot",
      slot: "B",
      receivedAt: Date.now(),
      serverOrder: room.state.inputOrder,
    };
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
    logger.info({ roomId }, "room destroyed");
  }

  private roomForSocket(socketId: string): ManagedRoom | null {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) ?? null : null;
  }

  private playerForSocket(room: ManagedRoom, socketId: string): PlayerGameState | null {
    for (const [slot, mappedSocket] of room.sockets.entries()) {
      if (mappedSocket === socketId) {
        return room.state.players[slot];
      }
    }
    return null;
  }
}
