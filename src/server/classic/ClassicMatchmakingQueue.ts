import type { Server, Socket } from "socket.io";
import { snapshotRoom } from "../../shared/classic/engine";
import type { AuthUser } from "../../shared/types";
import { logger } from "../logger";
import { RoomManager } from "../roomManager";

interface QueuedSocket {
  socketId: string;
  user: AuthUser;
  queuedAt: number;
}

export class ClassicMatchmakingQueue {
  private readonly queue: QueuedSocket[] = [];

  constructor(
    private readonly io: Server,
    private readonly roomManager: RoomManager,
    private readonly queuedUsers: Set<string>,
  ) {}

  join(socket: Socket, user: AuthUser): void {
    if (this.queuedUsers.has(user.userId) || this.roomManager.isSocketInRoom(socket.id)) {
      socket.emit("serverError", { message: "You are already queued or in a room." });
      return;
    }

    this.queue.push({ socketId: socket.id, user, queuedAt: Date.now() });
    this.queuedUsers.add(user.userId);
    logger.info({ userId: user.userId, queueSize: this.queue.length }, "player queued");
    socket.emit("matchmakingQueued", { queueSize: this.queue.length });
    this.match();
  }

  remove(socketId: string): boolean {
    const index = this.queue.findIndex((entry) => entry.socketId === socketId);
    if (index === -1) {
      return false;
    }
    const [removed] = this.queue.splice(index, 1);
    this.queuedUsers.delete(removed.user.userId);
    logger.info({ userId: removed.user.userId, queueSize: this.queue.length }, "player removed from queue");
    return true;
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

      socketA.emit("roomJoined", { roomId: state.roomId, slot: "A", reconnectToken: playerA.reconnectToken, mode: "classic" });
      socketB.emit("roomJoined", { roomId: state.roomId, slot: "B", reconnectToken: playerB.reconnectToken, mode: "classic" });
      this.io.to(state.roomId).emit("snapshot", snapshotRoom(state));
    }
  }
}
