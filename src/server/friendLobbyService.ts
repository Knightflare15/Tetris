import type { Server, Socket } from "socket.io";
import { snapshotRoom } from "../shared/classic/engine";
import { snapshotTerritoryRoom } from "../shared/territory/engine";
import type {
  AuthUser,
  ClientToServerEvents,
  FriendLobbyClosedReason,
  FriendLobbySelection,
  FriendLobbySummary,
  ServerToClientEvents,
} from "../shared/types";
import { logger } from "./logger";
import { MatchmakingService } from "./matchmakingService";
import { RoomManager } from "./roomManager";
import { SocialService } from "./socialService";

const INVITE_TIMEOUT_MS = 60_000;

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface OnlineUser {
  user: AuthUser;
  sockets: Set<string>;
}

interface FriendLobby {
  id: string;
  host: AuthUser;
  guest: AuthUser;
  hostSocketId: string;
  guestSocketId: string;
  status: "pending" | "accepted";
  selection: FriendLobbySelection;
  createdAt: number;
  expiresAt: number;
  timeout: ReturnType<typeof setTimeout>;
}

export class FriendLobbyService {
  private readonly lobbies = new Map<string, FriendLobby>();
  private readonly lobbyByUserId = new Map<string, string>();
  private readonly onlineUsers = new Map<string, OnlineUser>();

  constructor(
    private readonly io: GameServer,
    private readonly roomManager: RoomManager,
    private readonly matchmaking: MatchmakingService,
    private readonly socialService: SocialService,
  ) {}

  addOnline(socket: GameSocket, user: AuthUser): void {
    const entry = this.onlineUsers.get(user.userId) ?? { user, sockets: new Set<string>() };
    entry.user = user;
    entry.sockets.add(socket.id);
    this.onlineUsers.set(user.userId, entry);
  }

  removeOnline(socketId: string, userId: string): void {
    const entry = this.onlineUsers.get(userId);
    if (!entry) {
      return;
    }
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      this.onlineUsers.delete(userId);
    }
    this.cancelForSocket(socketId, "disconnected");
  }

  async createInvite(socket: GameSocket, host: AuthUser, friendId: string): Promise<void> {
    if (!friendId || friendId === host.userId) {
      socket.emit("serverError", { message: "Choose a friend to invite." });
      return;
    }
    if (isGuestUser(host.userId)) {
      socket.emit("serverError", { message: "Friend lobbies need an account." });
      return;
    }
    if (this.roomManager.isSocketInRoom(socket.id)) {
      socket.emit("serverError", { message: "Leave your current room before inviting a friend." });
      return;
    }
    if (this.lobbyByUserId.has(host.userId)) {
      socket.emit("serverError", { message: "You already have an open friend lobby." });
      return;
    }
    if (!(await this.socialService.areUsersFriends(host.userId, friendId))) {
      socket.emit("serverError", { message: "You can only invite friends." });
      return;
    }

    const guestSocket = this.availableSocketForUser(friendId);
    if (!guestSocket) {
      socket.emit("serverError", { message: "Friend is not available right now." });
      return;
    }
    const guestEntry = this.onlineUsers.get(friendId);
    if (!guestEntry) {
      socket.emit("serverError", { message: "Friend is not available right now." });
      return;
    }
    if (this.lobbyByUserId.has(friendId)) {
      socket.emit("serverError", { message: "Friend already has an open lobby invite." });
      return;
    }

    this.matchmaking.remove(socket.id);
    this.matchmaking.remove(guestSocket.id);

    const createdAt = Date.now();
    const lobby: FriendLobby = {
      id: createLobbyId(),
      host,
      guest: guestEntry.user,
      hostSocketId: socket.id,
      guestSocketId: guestSocket.id,
      status: "pending",
      selection: { mode: "classic" },
      createdAt,
      expiresAt: createdAt + INVITE_TIMEOUT_MS,
      timeout: setTimeout(() => this.closeLobby(lobby.id, "timeout"), INVITE_TIMEOUT_MS),
    };

    this.lobbies.set(lobby.id, lobby);
    this.lobbyByUserId.set(host.userId, lobby.id);
    this.lobbyByUserId.set(friendId, lobby.id);

    socket.emit("friendLobbyUpdated", summarizeLobby(lobby));
    guestSocket.emit("friendLobbyInviteReceived", {
      lobbyId: lobby.id,
      from: playerSummary(host),
      selection: lobby.selection,
      createdAt: lobby.createdAt,
      expiresAt: lobby.expiresAt,
    });
    logger.info({ lobbyId: lobby.id, hostId: host.userId, guestId: friendId }, "friend lobby invite created");
  }

  respond(socket: GameSocket, user: AuthUser, lobbyId: string, response: "accept" | "decline"): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.guest.userId !== user.userId) {
      socket.emit("serverError", { message: "Friend invite was not found." });
      return;
    }
    if (response === "decline") {
      this.closeLobby(lobbyId, "declined");
      return;
    }
    if (Date.now() >= lobby.expiresAt) {
      this.closeLobby(lobbyId, "timeout");
      return;
    }
    if (this.roomManager.isSocketInRoom(socket.id)) {
      socket.emit("serverError", { message: "Leave your current room before accepting." });
      return;
    }
    if (this.roomManager.isSocketInRoom(lobby.hostSocketId)) {
      this.closeLobby(lobbyId, "unavailable");
      return;
    }

    this.matchmaking.remove(socket.id);
    this.matchmaking.remove(lobby.hostSocketId);
    lobby.status = "accepted";
    lobby.guest = user;
    lobby.guestSocketId = socket.id;
    clearTimeout(lobby.timeout);
    this.emitLobby(lobby);
    logger.info({ lobbyId, hostId: lobby.host.userId, guestId: user.userId }, "friend lobby invite accepted");
  }

  updateSettings(socket: GameSocket, user: AuthUser, lobbyId: string, selection: FriendLobbySelection): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.host.userId !== user.userId) {
      socket.emit("serverError", { message: "Only the lobby host can change settings." });
      return;
    }
    if (!isValidSelection(selection)) {
      socket.emit("serverError", { message: "Choose a valid lobby mode." });
      return;
    }
    lobby.selection = selection;
    this.emitLobby(lobby);
  }

  start(socket: GameSocket, user: AuthUser, lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.host.userId !== user.userId) {
      socket.emit("serverError", { message: "Only the lobby host can start the match." });
      return;
    }
    if (lobby.status !== "accepted") {
      socket.emit("serverError", { message: "Wait for your friend to accept first." });
      return;
    }

    const hostSocket = this.io.sockets.sockets.get(lobby.hostSocketId) as GameSocket | undefined;
    const guestSocket = this.io.sockets.sockets.get(lobby.guestSocketId) as GameSocket | undefined;
    if (!hostSocket || !guestSocket || this.roomManager.isSocketInRoom(hostSocket.id) || this.roomManager.isSocketInRoom(guestSocket.id)) {
      this.closeLobby(lobbyId, "unavailable");
      return;
    }

    this.matchmaking.remove(hostSocket.id);
    this.matchmaking.remove(guestSocket.id);
    this.lobbies.delete(lobby.id);
    this.lobbyByUserId.delete(lobby.host.userId);
    this.lobbyByUserId.delete(lobby.guest.userId);

    if (lobby.selection.mode === "territory") {
      const state = this.roomManager.createTerritoryRoom(lobby.host, hostSocket.id, lobby.guest, guestSocket.id, lobby.selection.format);
      const playerA = state.players.A;
      const playerB = state.players.B;
      hostSocket.emit("roomJoined", { roomId: state.id, slot: "A", reconnectToken: playerA.reconnectToken, mode: "territory", format: lobby.selection.format });
      guestSocket.emit("roomJoined", { roomId: state.id, slot: "B", reconnectToken: playerB.reconnectToken, mode: "territory", format: lobby.selection.format });
      this.io.to(state.id).emit("territorySnapshot", snapshotTerritoryRoom(state));
    } else {
      const state = this.roomManager.createRoom(lobby.host, hostSocket.id, lobby.guest, guestSocket.id);
      const playerA = state.players.A;
      const playerB = state.players.B;
      if (!playerA || !playerB) {
        throw new Error("Friend lobby room created without both players.");
      }
      hostSocket.emit("roomJoined", { roomId: state.roomId, slot: "A", reconnectToken: playerA.reconnectToken, mode: "classic" });
      guestSocket.emit("roomJoined", { roomId: state.roomId, slot: "B", reconnectToken: playerB.reconnectToken, mode: "classic" });
      this.io.to(state.roomId).emit("snapshot", snapshotRoom(state));
    }

    hostSocket.emit("friendLobbyClosed", { lobbyId: lobby.id, reason: "started" });
    guestSocket.emit("friendLobbyClosed", { lobbyId: lobby.id, reason: "started" });
    logger.info({ lobbyId: lobby.id, selection: lobby.selection }, "friend lobby match started");
  }

  leave(socket: GameSocket, user: AuthUser, lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || (lobby.host.userId !== user.userId && lobby.guest.userId !== user.userId)) {
      socket.emit("serverError", { message: "Friend lobby was not found." });
      return;
    }
    this.closeLobby(lobbyId, "left");
  }

  cancelForSocket(socketId: string, reason: FriendLobbyClosedReason): void {
    for (const lobby of this.lobbies.values()) {
      if (lobby.hostSocketId === socketId || lobby.guestSocketId === socketId) {
        this.closeLobby(lobby.id, reason);
        return;
      }
    }
  }

  private closeLobby(lobbyId: string, reason: FriendLobbyClosedReason): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return;
    }
    clearTimeout(lobby.timeout);
    this.lobbies.delete(lobbyId);
    this.lobbyByUserId.delete(lobby.host.userId);
    this.lobbyByUserId.delete(lobby.guest.userId);

    const hostSocket = this.io.sockets.sockets.get(lobby.hostSocketId);
    const guestSocket = this.io.sockets.sockets.get(lobby.guestSocketId);
    hostSocket?.emit("friendLobbyClosed", { lobbyId, reason });
    guestSocket?.emit("friendLobbyClosed", { lobbyId, reason });
    logger.info({ lobbyId, reason }, "friend lobby closed");
  }

  private emitLobby(lobby: FriendLobby): void {
    const summary = summarizeLobby(lobby);
    this.io.sockets.sockets.get(lobby.hostSocketId)?.emit("friendLobbyUpdated", summary);
    this.io.sockets.sockets.get(lobby.guestSocketId)?.emit("friendLobbyUpdated", summary);
  }

  private availableSocketForUser(userId: string): GameSocket | null {
    const entry = this.onlineUsers.get(userId);
    if (!entry) {
      return null;
    }
    for (const socketId of entry.sockets) {
      const socket = this.io.sockets.sockets.get(socketId) as GameSocket | undefined;
      if (socket && !this.roomManager.isSocketInRoom(socketId)) {
        return socket;
      }
    }
    return null;
  }
}

function summarizeLobby(lobby: FriendLobby): FriendLobbySummary {
  return {
    id: lobby.id,
    host: playerSummary(lobby.host),
    guest: playerSummary(lobby.guest),
    status: lobby.status,
    selection: lobby.selection,
    createdAt: lobby.createdAt,
    expiresAt: lobby.expiresAt,
  };
}

function playerSummary(user: AuthUser) {
  return {
    userId: user.userId,
    displayName: user.displayName,
  };
}

function createLobbyId(): string {
  return `lobby-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isGuestUser(userId: string): boolean {
  return userId.startsWith("demo-");
}

function isValidSelection(selection: FriendLobbySelection): selection is FriendLobbySelection {
  if (!selection || typeof selection !== "object") {
    return false;
  }
  if (selection.mode === "classic") {
    return true;
  }
  return selection.mode === "territory" && ["bullet", "blitz", "rapid"].includes(selection.format);
}
