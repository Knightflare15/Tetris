import type { Server, Socket } from "socket.io";
import type {
  AuthUser,
  ClientToServerEvents,
  FriendRequestSummary,
  FriendSummary,
  LeaderboardEntry,
  ServerToClientEvents,
  SocialSummary,
  TerritoryMatchResult,
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

const TERRITORY_DEFAULT_ELO = 1200;
const TERRITORY_ELO_K_FACTOR = 32;

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

  async areUsersFriends(firstId: string, secondId: string): Promise<boolean> {
    this.requireDatabase();
    return this.areFriends(firstId, secondId);
  }

  async ensureTerritoryRating(userId: string): Promise<void> {
    if (!isDatabaseConfigured() || !isAccountUserId(userId)) {
      return;
    }

    try {
      await getPrisma().territoryRating.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    } catch (error) {
      logger.warn({ error, userId }, "territory rating initialization skipped");
    }
  }

  async recordMatch(roomId: string, playerIds: string[], score: number, level: number, lines: number, mode: string): Promise<void> {
    if (!isDatabaseConfigured()) {
      return;
    }
    if (mode.startsWith("territory-")) {
      return;
    }
    const accountPlayerIds = playerIds.filter(isAccountUserId);
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

  async recordTerritoryMatch(roomId: string, result: TerritoryMatchResult): Promise<void> {
    if (!isDatabaseConfigured()) {
      return;
    }

    const accountPlayers = (["A", "B"] as const)
      .map((slot) => ({ slot, ...result.players[slot] }))
      .filter((player): player is { slot: "A" | "B"; userId: string; score: number } =>
        Boolean(player.userId && isAccountUserId(player.userId)),
      );
    if (!accountPlayers.length) {
      return;
    }

    const mode = `territory-${result.format}`;
    try {
      await getPrisma().$transaction(async (tx) => {
        const match = await tx.match.upsert({
          where: { roomId },
          create: {
            roomId,
            mode,
            status: "ended",
            score: Math.max(result.players.A.score, result.players.B.score),
            level: 0,
            lines: 0,
            endedAt: new Date(),
          },
          update: {
            status: "ended",
            score: Math.max(result.players.A.score, result.players.B.score),
            level: 0,
            lines: 0,
            endedAt: new Date(),
          },
        });

        for (const player of accountPlayers) {
          await tx.matchPlayer.upsert({
            where: { matchId_userId: { matchId: match.id, userId: player.userId } },
            create: {
              matchId: match.id,
              userId: player.userId,
              slot: player.slot,
              finalScore: player.score,
              finalLevel: 0,
              finalLines: 0,
            },
            update: {
              slot: player.slot,
              finalScore: player.score,
              finalLevel: 0,
              finalLines: 0,
            },
          });
          await tx.territoryRating.upsert({
            where: { userId: player.userId },
            create: { userId: player.userId },
            update: {},
          });
        }

        const playerAId = result.players.A.userId;
        const playerBId = result.players.B.userId;
        if (!isAccountUserId(playerAId) || !isAccountUserId(playerBId)) {
          return;
        }

        const ratings = await tx.territoryRating.findMany({
          where: { userId: { in: [playerAId, playerBId] } },
          select: { userId: true, rating: true },
        });
        const ratingByUserId = new Map(ratings.map((rating) => [rating.userId, rating.rating]));
        const ratingA = ratingByUserId.get(playerAId) ?? TERRITORY_DEFAULT_ELO;
        const ratingB = ratingByUserId.get(playerBId) ?? TERRITORY_DEFAULT_ELO;
        const { nextA, nextB } = calculateTerritoryElo(ratingA, ratingB, result.winner);

        await Promise.all([
          tx.territoryRating.update({
            where: { userId: playerAId },
            data: {
              rating: nextA,
              gamesPlayed: { increment: 1 },
              wins: result.winner === "A" ? { increment: 1 } : undefined,
              losses: result.winner === "B" ? { increment: 1 } : undefined,
              draws: isTerritoryDraw(result.winner) ? { increment: 1 } : undefined,
            },
          }),
          tx.territoryRating.update({
            where: { userId: playerBId },
            data: {
              rating: nextB,
              gamesPlayed: { increment: 1 },
              wins: result.winner === "B" ? { increment: 1 } : undefined,
              losses: result.winner === "A" ? { increment: 1 } : undefined,
              draws: isTerritoryDraw(result.winner) ? { increment: 1 } : undefined,
            },
          }),
        ]);
      });
    } catch (error) {
      logger.warn({ error, roomId }, "territory match persistence skipped");
    } finally {
      await this.notifyUsers(accountPlayers.map((player) => player.userId));
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

export function calculateTerritoryElo(
  ratingA: number,
  ratingB: number,
  winner: TerritoryMatchResult["winner"],
): { nextA: number; nextB: number } {
  const scoreA = winner === "A" ? 1 : winner === "B" ? 0 : 0.5;
  const scoreB = 1 - scoreA;
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + 10 ** ((ratingA - ratingB) / 400));

  return {
    nextA: Math.round(ratingA + TERRITORY_ELO_K_FACTOR * (scoreA - expectedA)),
    nextB: Math.round(ratingB + TERRITORY_ELO_K_FACTOR * (scoreB - expectedB)),
  };
}

function isAccountUserId(userId: string | null | undefined): userId is string {
  return Boolean(userId && !userId.startsWith("demo-") && !userId.startsWith("bot-"));
}

function isTerritoryDraw(winner: TerritoryMatchResult["winner"]): boolean {
  return winner !== "A" && winner !== "B";
}

function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) : "";
}
