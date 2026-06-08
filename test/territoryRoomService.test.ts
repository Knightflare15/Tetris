import { afterEach, describe, expect, it, vi } from "vitest";
import { TerritoryRoomService } from "../src/server/territory/TerritoryRoomService";
import type { AuthUser } from "../src/shared/types";

describe("TerritoryRoomService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reconnects a territory player with their reconnect token", () => {
    vi.useFakeTimers();
    const io = new FakeIo();
    const service = new TerritoryRoomService(io as never, 30_000);
    const playerA: AuthUser = { userId: "player-A", displayName: "A" };
    const playerB: AuthUser = { userId: "player-B", displayName: "B" };
    io.addSocket("old-a");
    io.addSocket("old-b");
    io.addSocket("new-a");

    const state = service.createRoom(playerA, "old-a", playerB, "old-b", "bullet");
    const reconnectToken = state.players.A.reconnectToken;

    expect(service.markDisconnected("old-a")).toBe(true);
    const reconnected = service.reconnect("new-a", playerA, state.id, reconnectToken);

    expect(reconnected).toMatchObject({ slot: "A", userId: "player-A", connected: true, reconnectToken });
    expect(service.snapshotForSocket("new-a")).toMatchObject({ id: state.id, mode: "territory", format: "bullet" });
    expect(service.snapshotForSocket("old-a")).toBeNull();
    expect(io.socket("new-a").joinedRooms).toContain(state.id);
    vi.clearAllTimers();
  });

  it("reports territory result details when a room ends", () => {
    vi.useFakeTimers();
    const io = new FakeIo();
    const onMatchEnded = vi.fn();
    const service = new TerritoryRoomService(io as never, 30_000, onMatchEnded);
    const playerA: AuthUser = { userId: "player-A", displayName: "A" };
    const playerB: AuthUser = { userId: "player-B", displayName: "B" };
    io.addSocket("socket-a");
    io.addSocket("socket-b");

    const state = service.createRoom(playerA, "socket-a", playerB, "socket-b", "blitz");
    state.status = "ended";
    state.winner = "A";
    state.winnerReason = "territory-score";
    state.scores.weighted.A = 42;
    state.scores.weighted.B = 31;

    service["finalizeIfEnded"](state.id);

    expect(onMatchEnded).toHaveBeenCalledWith(
      state.id,
      ["player-A", "player-B"],
      42,
      0,
      0,
      "territory-blitz",
      {
        format: "blitz",
        winner: "A",
        winnerReason: "territory-score",
        players: {
          A: { userId: "player-A", score: 42 },
          B: { userId: "player-B", score: 31 },
        },
      },
    );
    vi.clearAllTimers();
  });
});

class FakeIo {
  readonly sockets = { sockets: new Map<string, FakeSocket>() };

  addSocket(id: string): FakeSocket {
    const socket = new FakeSocket(id);
    this.sockets.sockets.set(id, socket);
    return socket;
  }

  socket(id: string): FakeSocket {
    const socket = this.sockets.sockets.get(id);
    if (!socket) {
      throw new Error(`Missing fake socket ${id}`);
    }
    return socket;
  }

  to(_roomId: string): { emit: () => void } {
    return { emit: () => undefined };
  }
}

class FakeSocket {
  readonly joinedRooms: string[] = [];

  constructor(readonly id: string) {}

  join(roomId: string): void {
    this.joinedRooms.push(roomId);
  }
}
