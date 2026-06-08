import type { Server } from "socket.io";
import type {
  AuthUser,
  PlayerGameState,
  PracticeBotSpeed,
  TerritoryMatchResult,
  TerritoryFormat,
  TerritoryPlayerState,
  TerritoryPreviewAction,
  TerritoryTurnAction,
} from "../shared/types";
import { ClassicRoomService } from "./classic/ClassicRoomService";
import { TerritoryRoomService } from "./territory/TerritoryRoomService";

type ReconnectedPlayer = PlayerGameState | TerritoryPlayerState;

export class RoomManager {
  private readonly classicRooms: ClassicRoomService;
  private readonly territoryRooms: TerritoryRoomService;

  constructor(
    io: Server,
    disconnectGraceMs: number,
    onMatchEnded?: (
      roomId: string,
      playerIds: string[],
      score: number,
      level: number,
      lines: number,
      mode: string,
      territoryResult?: TerritoryMatchResult,
    ) => void,
  ) {
    this.classicRooms = new ClassicRoomService(io, disconnectGraceMs, onMatchEnded);
    this.territoryRooms = new TerritoryRoomService(io, disconnectGraceMs, onMatchEnded);
  }

  createRoom(playerA: AuthUser, socketA: string, playerB: AuthUser, socketB: string) {
    return this.classicRooms.createRoom(playerA, socketA, playerB, socketB);
  }

  createPracticeRoom(player: AuthUser, socketId: string, botSpeed: PracticeBotSpeed) {
    return this.classicRooms.createPracticeRoom(player, socketId, botSpeed);
  }

  createTerritoryRoom(playerA: AuthUser, socketA: string, playerB: AuthUser, socketB: string, format: TerritoryFormat) {
    return this.territoryRooms.createRoom(playerA, socketA, playerB, socketB, format);
  }

  enqueueInput(socketId: string, input: Parameters<ClassicRoomService["enqueueInput"]>[1]): void {
    this.classicRooms.enqueueInput(socketId, input);
  }

  enqueueTerritoryAction(socketId: string, action: TerritoryTurnAction): void {
    this.territoryRooms.enqueueAction(socketId, action);
  }

  updateTerritoryPreview(socketId: string, preview: TerritoryPreviewAction): void {
    this.territoryRooms.updatePreview(socketId, preview);
  }

  markDisconnected(socketId: string): void {
    if (this.classicRooms.markDisconnected(socketId)) {
      return;
    }
    this.territoryRooms.markDisconnected(socketId);
  }

  reconnect(socketId: string, user: AuthUser, roomId: string, reconnectToken: string): ReconnectedPlayer | null {
    return (
      this.classicRooms.reconnect(socketId, user, roomId, reconnectToken) ??
      this.territoryRooms.reconnect(socketId, user, roomId, reconnectToken)
    );
  }

  updateLatency(socketId: string, latencyMs: number): void {
    this.classicRooms.updateLatency(socketId, latencyMs);
  }

  snapshotForSocket(socketId: string) {
    return this.classicRooms.snapshotForSocket(socketId);
  }

  territorySnapshotForSocket(socketId: string) {
    return this.territoryRooms.snapshotForSocket(socketId);
  }

  playerFor(socketId: string): PlayerGameState | null {
    return this.classicRooms.playerFor(socketId);
  }

  isSocketInRoom(socketId: string): boolean {
    return this.classicRooms.hasSocket(socketId) || this.territoryRooms.hasSocket(socketId);
  }
}
