import type { Server, Socket } from "socket.io";
import type {
  AuthUser,
  ClientToServerEvents,
  FriendRequestSummary,
  FriendSummary,
  LeaderboardEntry,
  ServerToClientEvents,
  SocialSummary,
} from "../shared/types";
import { getPrisma, isDatabaseConfigured } from "./database";
import { logger } from "./logger";
import { RoomManager } from "./roomManager";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface OnlineUser {
  user: AuthUser;
  sockets: Set<string>;
}

export class SocialService {
  private readonly onlineUsers = new Map<string, OnlineUser>();

  constructor(
    private readonly io: GameServer,
    private readonly roomManager: RoomManager,
  ) {}

  addOnline(socket: GameSocket, user: AuthUser): void {
    const entry = this.onlineUsers.get(user.userId) ?? { user, sockets: new Set<string>() };
    entry.user = user;
    entry.sockets.add(socket.id);
    this.onlineUsers.set(user.userId, entry);
    void this.notifyFriends(user.userId);
  }

  removeOnline(socketId: string, userId: string): void {
    const entry = this.onlineUsers.get(userId);
    if (!entry) {
      return;
    }
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      this.onlineUsers.delete(userId);
      void this.notifyFriends(userId);
    }
  }

  async summary(userId: string): Promise<SocialSummary> {
    this.requireDatabase();
    const [friends, incomingRequests, outgoingRequests, leaderboard] = await Promise.all([
      this.friends(userId),
      this.incomingRequests(userId),
      this.outgoingRequests(userId),
      this.leaderboard(),
    ]);

    return { friends, incomingRequests, outgoingRequests, leaderboard };
  }

  async sendFriendRequest(senderId: string, username: string): Promise<void> {
    this.requireDatabase();
    const normalized = normalizeUsername(username);
    if (!normalized) {
      throw new SocialError(400, "Enter a username to add.");
    }

    const receiver = await getPrisma().user.findUnique({ where: { username: normalized }, select: { id: true } });
    if (!receiver) {
      throw new SocialError(404, "No player found with that username.");
    }
    if (receiver.id === senderId) {
      throw new SocialError(400, "You cannot add yourself.");
    }
    if (await this.areFriends(senderId, receiver.id)) {
      throw new SocialError(409, "You are already friends.");
    }

    const reverseRequest = await getPrisma().friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: receiver.id, receiverId: senderId } },
      select: { id: true, status: true },
    });
    if (reverseRequest?.status === "pending") {
      await this.acceptFriendRequest(senderId, reverseRequest.id);
      return;
    }

    await getPrisma().friendRequest.upsert({
      where: { senderId_receiverId: { senderId, receiverId: receiver.id } },
      create: { senderId, receiverId: receiver.id },
      update: { status: "pending", respondedAt: null },
    });
    await this.notifyUsers([senderId, receiver.id]);
  }

  async acceptFriendRequest(userId: string, requestId: string): Promise<void> {
    this.requireDatabase();
    const request = await getPrisma().friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: "pending" },
      select: { id: true, senderId: true, receiverId: true },
    });
    if (!request) {
      throw new SocialError(404, "Friend request was not found.");
    }

    const [userAId, userBId] = orderedPair(request.senderId, request.receiverId);
    await getPrisma().$transaction([
      getPrisma().friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: {},
      }),
      getPrisma().friendRequest.update({
        where: { id: request.id },
        data: { status: "accepted", respondedAt: new Date() },
      }),
    ]);
    await this.notifyUsers([request.senderId, request.receiverId]);
  }

  async declineFriendRequest(userId: string, requestId: string): Promise<void> {
    this.requireDatabase();
    const request = await getPrisma().friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: "pending" },
      select: { id: true, senderId: true, receiverId: true },
    });
    if (!request) {
      throw new SocialError(404, "Friend request was not found.");
    }

    await getPrisma().friendRequest.update({
      where: { id: request.id },
      data: { status: "declined", respondedAt: new Date() },
    });
    await this.notifyUsers([request.senderId, request.receiverId]);
  }

  async joinFriend(socket: GameSocket, user: AuthUser, friendId: string): Promise<void> {
    if (!isDatabaseConfigured()) {
      socket.emit("serverError", { message: "Friend games need account mode." });
      return;
    }
    if (!(await this.areFriends(user.userId, friendId))) {
      socket.emit("serverError", { message: "You can only join friends." });
      return;
    }
    if (this.roomManager.isSocketInRoom(socket.id)) {
      socket.emit("serverError", { message: "You are already in a room." });
      return;
    }

    const friendSocket = this.availableSocketForUser(friendId);
    if (!friendSocket) {
      socket.emit("serverError", { message: "Friend is not available right now." });
      return;
    }

    const friend = this.onlineUsers.get(friendId)?.user;
    if (!friend) {
      socket.emit("serverError", { message: "Friend is not available right now." });
      return;
    }

    const state = this.roomManager.createRoom(user, socket.id, friend, friendSocket.id);
    const playerA = state.players.A;
    const playerB = state.players.B;
    if (!playerA || !playerB) {
      throw new Error("Friend room created without both players.");
    }

    socket.emit("roomJoined", { roomId: state.roomId, slot: "A", reconnectToken: playerA.reconnectToken, mode: "classic" });
    friendSocket.emit("roomJoined", { roomId: state.roomId, slot: "B", reconnectToken: playerB.reconnectToken, mode: "classic" });
    this.io.to(state.roomId).emit("snapshot", this.roomManager.snapshotForSocket(socket.id)!);
    await this.notifyUsers([user.userId, friendId]);
  }

  async recordMatch(roomId: string, playerIds: string[], score: number, level: number, lines: number, mode: string): Promise<void> {
    if (!isDatabaseConfigured()) {
      return;
    }
    const accountPlayerIds = playerIds.filter((id) => !id.startsWith("demo-") && !id.startsWith("bot-"));
    if (!accountPlayerIds.length) {
      return;
    }

    try {
      await getPrisma().$transaction(async (tx) => {
        const match = await tx.match.upsert({
          where: { roomId },
          create: { roomId, mode, status: "ended", score, level, lines, endedAt: new Date() },
          update: { status: "ended", score, level, lines, endedAt: new Date() },
        });

        for (const userId of accountPlayerIds) {
          await tx.matchPlayer.upsert({
            where: { matchId_userId: { matchId: match.id, userId } },
            create: { matchId: match.id, userId, slot: "A", finalScore: score, finalLevel: level, finalLines: lines },
            update: { finalScore: score, finalLevel: level, finalLines: lines },
          });
          await tx.leaderboardScore.create({
            data: { userId, matchId: match.id, score, level, lines, mode },
          });
        }

        if (accountPlayerIds.length === 2) {
          await Promise.all([
            tx.recentTeammate.upsert({
              where: { userId_teammateId: { userId: accountPlayerIds[0], teammateId: accountPlayerIds[1] } },
              create: { userId: accountPlayerIds[0], teammateId: accountPlayerIds[1] },
              update: { matchCount: { increment: 1 }, lastPlayedAt: new Date() },
            }),
            tx.recentTeammate.upsert({
              where: { userId_teammateId: { userId: accountPlayerIds[1], teammateId: accountPlayerIds[0] } },
              create: { userId: accountPlayerIds[1], teammateId: accountPlayerIds[0] },
              update: { matchCount: { increment: 1 }, lastPlayedAt: new Date() },
            }),
          ]);
        }
      });
    } catch (error) {
      logger.warn({ error, roomId }, "match persistence skipped");
    } finally {
      await this.notifyUsers(accountPlayerIds);
    }
  }

  private async friends(userId: string): Promise<FriendSummary[]> {
    const rows = await getPrisma().friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, username: true, displayName: true } },
        userB: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => {
      const friend = row.userAId === userId ? row.userB : row.userA;
      const onlineEntry = this.onlineUsers.get(friend.id);
      const socketId = onlineEntry ? [...onlineEntry.sockets][0] : null;
      return {
        userId: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        online: Boolean(onlineEntry),
        inGame: socketId ? this.roomManager.isSocketInRoom(socketId) : false,
      };
    });
  }

  private async incomingRequests(userId: string): Promise<FriendRequestSummary[]> {
    const rows = await getPrisma().friendRequest.findMany({
      where: { receiverId: userId, status: "pending" },
      include: { sender: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => requestSummary(row.id, row.sender, row.createdAt));
  }

  private async outgoingRequests(userId: string): Promise<FriendRequestSummary[]> {
    const rows = await getPrisma().friendRequest.findMany({
      where: { senderId: userId, status: "pending" },
      include: { receiver: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => requestSummary(row.id, row.receiver, row.createdAt));
  }

  private async leaderboard(): Promise<LeaderboardEntry[]> {
    const rows = await getPrisma().leaderboardScore.findMany({
      take: 10,
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      include: { user: { select: { id: true, displayName: true } } },
    });
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user.id,
      displayName: row.user.displayName,
      score: row.score,
      level: row.level,
      lines: row.lines,
      mode: row.mode,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async areFriends(firstId: string, secondId: string): Promise<boolean> {
    const [userAId, userBId] = orderedPair(firstId, secondId);
    const friendship = await getPrisma().friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true },
    });
    return Boolean(friendship);
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

  private async notifyFriends(userId: string): Promise<void> {
    if (!isDatabaseConfigured() || userId.startsWith("demo-")) {
      return;
    }
    try {
      const friends = await this.friends(userId);
      await this.notifyUsers([userId, ...friends.map((friend) => friend.userId)]);
    } catch (error) {
      logger.debug({ error, userId }, "social presence notification skipped");
    }
  }

  private async notifyUsers(userIds: string[]): Promise<void> {
    for (const userId of new Set(userIds)) {
      const entry = this.onlineUsers.get(userId);
      if (!entry) {
        continue;
      }
      for (const socketId of entry.sockets) {
        this.io.to(socketId).emit("socialUpdated");
      }
    }
  }

  private requireDatabase(): void {
    if (!isDatabaseConfigured()) {
      throw new SocialError(503, "Social features need account mode and a configured database.");
    }
  }
}

export class SocialError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function requestSummary(
  id: string,
  user: { id: string; username: string; displayName: string },
  createdAt: Date,
): FriendRequestSummary {
  return {
    id,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: createdAt.toISOString(),
  };
}

function orderedPair(firstId: string, secondId: string): [string, string] {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) : "";
}
