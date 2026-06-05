import type { Server, Socket } from "socket.io";
import { snapshotTerritoryRoom } from "../../shared/territory/engine";
import type { AuthUser, TerritoryFormat } from "../../shared/types";
import { logger } from "../logger";
import { RoomManager } from "../roomManager";

interface QueuedSocket {
  socketId: string;
  user: AuthUser;
  queuedAt: number;
}

export class TerritoryMatchmakingQueue {
  private readonly queues: Record<TerritoryFormat, QueuedSocket[]> = {
    bullet: [],
    blitz: [],
    rapid: [],
  };

  constructor(
    private readonly io: Server,
    private readonly roomManager: RoomManager,
    private readonly queuedUsers: Set<string>,
  ) {}

  join(socket: Socket, user: AuthUser, format: TerritoryFormat): void {
    if (this.queuedUsers.has(user.userId) || this.roomManager.isSocketInRoom(socket.id)) {
      socket.emit("serverError", { message: "You are already queued or in a room." });
      return;
    }

    const queue = this.queues[format];
    queue.push({ socketId: socket.id, user, queuedAt: Date.now() });
    this.queuedUsers.add(user.userId);
    logger.info({ userId: user.userId, queueSize: queue.length, format }, "territory player queued");
    socket.emit("matchmakingQueued", { queueSize: queue.length, mode: "territory", format });
    this.match(format);
  }

  remove(socketId: string): boolean {
    let removedAny = false;
    for (const format of Object.keys(this.queues) as TerritoryFormat[]) {
      const queue = this.queues[format];
      const index = queue.findIndex((entry) => entry.socketId === socketId);
      if (index === -1) {
        continue;
      }
      const [removed] = queue.splice(index, 1);
      this.queuedUsers.delete(removed.user.userId);
      logger.info({ userId: removed.user.userId, queueSize: queue.length, format }, "territory player removed from queue");
      removedAny = true;
    }
    return removedAny;
  }

  private match(format: TerritoryFormat): void {
    const queue = this.queues[format];
    while (queue.length >= 2) {
      const first = queue.shift();
      const second = queue.shift();
      if (!first || !second) {
        return;
      }

      this.queuedUsers.delete(first.user.userId);
      this.queuedUsers.delete(second.user.userId);

      const socketA = this.io.sockets.sockets.get(first.socketId);
      const socketB = this.io.sockets.sockets.get(second.socketId);
      if (!socketA || !socketB || first.user.userId === second.user.userId) {
        logger.warn({ first: first.user.userId, second: second.user.userId, format }, "stale territory matchmaking pair skipped");
        continue;
      }

      const state = this.roomManager.createTerritoryRoom(first.user, first.socketId, second.user, second.socketId, format);
      const playerA = state.players.A;
      const playerB = state.players.B;

      socketA.emit("roomJoined", {
        roomId: state.id,
        slot: "A",
        reconnectToken: playerA.reconnectToken,
        mode: "territory",
        format,
      });
      socketB.emit("roomJoined", {
        roomId: state.id,
        slot: "B",
        reconnectToken: playerB.reconnectToken,
        mode: "territory",
        format,
      });
      this.io.to(state.id).emit("territorySnapshot", snapshotTerritoryRoom(state));
    }
  }
}
