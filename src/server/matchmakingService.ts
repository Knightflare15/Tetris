import type { Server, Socket } from "socket.io";
import type { AuthUser } from "../shared/types";
import { snapshotRoom } from "../shared/engine";
import { logger } from "./logger";
import { RoomManager } from "./roomManager";

interface QueuedSocket {
  socketId: string;
  user: AuthUser;
  queuedAt: number;
}

export class MatchmakingService {
  private readonly queue: QueuedSocket[] = [];
  private readonly queuedUsers = new Set<string>();

  constructor(
    private readonly io: Server,
    private readonly roomManager: RoomManager,
  ) {}

  join(socket: Socket, user: AuthUser): void {
    if (this.queuedUsers.has(user.userId) || this.roomManager.playerFor(socket.id)) {
      socket.emit("serverError", { message: "You are already queued or in a room." });
      return;
    }

    this.queue.push({ socketId: socket.id, user, queuedAt: Date.now() });
    this.queuedUsers.add(user.userId);
    logger.info({ userId: user.userId, queueSize: this.queue.length }, "player queued");
    socket.emit("matchmakingQueued", { queueSize: this.queue.length });
    this.match();
  }

  remove(socketId: string): void {
    const index = this.queue.findIndex((entry) => entry.socketId === socketId);
    if (index === -1) {
      return;
    }
    const [removed] = this.queue.splice(index, 1);
    this.queuedUsers.delete(removed.user.userId);
    logger.info({ userId: removed.user.userId, queueSize: this.queue.length }, "player removed from queue");
  }

  private match(): void {
    while (this.queue.length >= 2) {
      const first = this.queue.shift();
      const second = this.queue.shift();
      if (!first || !second) {
        return;
      }

      this.queuedUsers.delete(first.user.userId);
      this.queuedUsers.delete(second.user.userId);

      const socketA = this.io.sockets.sockets.get(first.socketId);
      const socketB = this.io.sockets.sockets.get(second.socketId);
      if (!socketA || !socketB || first.user.userId === second.user.userId) {
        logger.warn({ first: first.user.userId, second: second.user.userId }, "stale matchmaking pair skipped");
        continue;
      }

      const state = this.roomManager.createRoom(first.user, first.socketId, second.user, second.socketId);
      const playerA = state.players.A;
      const playerB = state.players.B;
      if (!playerA || !playerB) {
        throw new Error("Room created without both players.");
      }

      socketA.emit("roomJoined", { roomId: state.roomId, slot: "A", reconnectToken: playerA.reconnectToken });
      socketB.emit("roomJoined", { roomId: state.roomId, slot: "B", reconnectToken: playerB.reconnectToken });
      this.io.to(state.roomId).emit("snapshot", snapshotRoom(state));
    }
  }
}
