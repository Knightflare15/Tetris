import type { Server, Socket } from "socket.io";
import type { AuthUser, TerritoryFormat } from "../shared/types";
import { ClassicMatchmakingQueue } from "./classic/ClassicMatchmakingQueue";
import { RoomManager } from "./roomManager";
import { TerritoryMatchmakingQueue } from "./territory/TerritoryMatchmakingQueue";

export class MatchmakingService {
  private readonly queuedUsers = new Set<string>();
  private readonly classicQueue: ClassicMatchmakingQueue;
  private readonly territoryQueue: TerritoryMatchmakingQueue;

  constructor(
    io: Server,
    roomManager: RoomManager,
  ) {
    this.classicQueue = new ClassicMatchmakingQueue(io, roomManager, this.queuedUsers);
    this.territoryQueue = new TerritoryMatchmakingQueue(io, roomManager, this.queuedUsers);
  }

  join(socket: Socket, user: AuthUser): void {
    this.classicQueue.join(socket, user);
  }

  joinTerritory(socket: Socket, user: AuthUser, format: TerritoryFormat): void {
    this.territoryQueue.join(socket, user, format);
  }

  remove(socketId: string): void {
    if (this.classicQueue.remove(socketId)) {
      return;
    }
    this.territoryQueue.remove(socketId);
  }
}
