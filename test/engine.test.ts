import { describe, expect, it } from "vitest";
import { cellsFor, createPlayerState, createRoomState, simulateTick, startRoom } from "../src/shared/engine";
import { matrixFor } from "../src/shared/tetrominoes";
import type { ActivePiece, QueuedInput } from "../src/shared/types";

function input(slot: "A" | "B", order: number, action: QueuedInput["action"]): QueuedInput {
  return {
    seq: order,
    action,
    sentAt: order,
    clientTick: 0,
    socketId: `socket-${slot}`,
    playerId: `player-${slot}`,
    slot,
    receivedAt: order,
    serverOrder: order,
  };
}

describe("authoritative shared engine", () => {
  it("processes shared hold conflicts deterministically by server order", () => {
    const room = createRoomState("room", 123);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 111);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 222);
    startRoom(room);

    const firstType = room.players.A.active?.type;
    const diagnostics = simulateTick(room, [input("B", 2, "hold"), input("A", 1, "hold")]);

    expect(room.hold.type).toBe(firstType);
    expect(room.hold.lastHolder).toBe("A");
    expect(diagnostics.holdConflicts).toHaveLength(1);
  });

  it("accepts simultaneous hard drops without overlapping locked board cells", () => {
    const room = createRoomState("room", 456);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 333);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 444);
    startRoom(room);

    simulateTick(room, [input("A", 1, "hardDrop"), input("B", 2, "hardDrop")]);

    const lockedCells = room.board.flat().filter((cell) => cell !== 0).length;
    expect(lockedCells).toBeGreaterThan(0);
    expect(room.gameOver).toBe(false);
  });

  it("spawns and moves active pieces without intersecting each other", () => {
    const room = createRoomState("room", 789);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 555);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 666);
    startRoom(room);

    expect(piecesOverlap(room.players.A.active, room.players.B.active)).toBe(false);

    const inputs: QueuedInput[] = [];
    for (let step = 1; step <= 8; step++) {
      inputs.push(input("A", step * 2 - 1, "moveRight"));
      inputs.push(input("B", step * 2, "moveLeft"));
    }

    simulateTick(room, inputs);

    expect(piecesOverlap(room.players.A.active, room.players.B.active)).toBe(false);
  });

  it("varies spawn columns within each player's lane", () => {
    const room = createRoomState("spawn-variation", 741);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 1234);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 5678);
    startRoom(room);
    room.players.B.active = null;

    const spawnColumns: number[] = [];
    for (let step = 0; step < 4; step++) {
      if (!room.players.A.active) {
        throw new Error("Expected player A to have an active piece.");
      }
      spawnColumns.push(room.players.A.active.x);
      simulateTick(room, [input("A", step + 1, "hardDrop")]);
    }

    expect(new Set(spawnColumns).size).toBeGreaterThan(1);
  });

  it("hard drop does not treat the opponent active piece as locked floor", () => {
    const room = createRoomState("room", 987);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 777);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 888);
    startRoom(room);

    if (!room.players.A.active || !room.players.B.active) {
      throw new Error("Expected both active pieces to spawn.");
    }

    room.players.A.active.x = 3;
    room.players.A.active.y = 0;
    room.players.B.active.x = 3;
    room.players.B.active.y = 8;

    simulateTick(room, [input("A", 1, "hardDrop")]);

    const lockedRows = room.board
      .map((row, y) => (row.some((cell) => cell !== 0) ? y : -1))
      .filter((y) => y >= 0);

    expect(Math.max(...lockedRows)).toBeGreaterThan(12);
    expect(piecesOverlap(room.players.A.active, room.players.B.active)).toBe(false);
  });

  it("gravity does not lock a piece when only the opponent active piece blocks it", () => {
    const room = createRoomState("room", 654);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 999);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 1000);
    startRoom(room);

    if (!room.players.A.active || !room.players.B.active) {
      throw new Error("Expected both active pieces to spawn.");
    }

    room.tick = 19;
    room.players.A.active.x = 3;
    room.players.A.active.y = 3;
    room.players.B.active.x = 3;
    room.players.B.active.y = 4;

    simulateTick(room, []);

    expect(room.players.A.pendingLock).toBe(false);
    expect(room.players.A.active).not.toBeNull();
    expect(piecesOverlap(room.players.A.active, room.players.B.active)).toBe(false);
  });

  it("does not top out when a spawned piece only overlaps the opponent active piece", () => {
    const room = createRoomState("room", 321);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 1001);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 1002);
    startRoom(room);

    const playerA = room.players.A;
    const playerB = room.players.B;
    if (!playerA?.active || !playerB?.active) {
      throw new Error("Expected both active pieces to spawn.");
    }

    playerB.active.x = 1;
    playerB.active.y = 0;
    playerA.active.y = 22;

    simulateTick(room, [input("A", 1, "hardDrop")]);

    expect(room.gameOver).toBe(false);
    expect(room.status).toBe("playing");
    expect(playerA.active).not.toBeNull();
  });

  it("awards more points for clearing multiple lines at once", () => {
    const single = preparedClearRoom("single");
    single.board[24] = single.board[24].map((_, x) => (x === 1 || x === 2 ? 0 : 1));
    simulateTick(single, [input("A", 1, "hardDrop")]);

    const double = preparedClearRoom("double");
    double.board[23] = double.board[23].map((_, x) => (x === 1 || x === 2 ? 0 : 1));
    double.board[24] = double.board[24].map((_, x) => (x === 1 || x === 2 ? 0 : 1));
    simulateTick(double, [input("A", 1, "hardDrop")]);

    expect(single.lines).toBe(1);
    expect(double.lines).toBe(2);
    expect(double.score).toBeGreaterThan(single.score);
    expect(double.clearEffect?.label).toContain("Double");
  });

  it("rewards combo handoffs between players", () => {
    const relay = preparedRelayRoom("relay", "A");
    simulateTick(relay, [input("B", 1, "hardDrop")]);

    const samePlayer = preparedRelayRoom("same-player", "B");
    simulateTick(samePlayer, [input("B", 1, "hardDrop")]);

    expect(relay.score).toBeGreaterThan(samePlayer.score);
    expect(relay.clearEffect?.label).toContain("Relay");
  });
});

function preparedClearRoom(roomId: string) {
  const room = createRoomState(roomId, 2468);
  room.players.A = createPlayerState("A", "player-A", "A", "token-A", 2001);
  room.players.B = createPlayerState("B", "player-B", "B", "token-B", 2002);
  startRoom(room);

  if (!room.players.A || !room.players.B) {
    throw new Error("Expected both players.");
  }

  room.players.A.active = {
    type: "O",
    matrix: matrixFor("O"),
    x: 0,
    y: 0,
  };
  room.players.B.active = null;
  return room;
}

function preparedRelayRoom(roomId: string, lastClearSlot: "A" | "B") {
  const room = createRoomState(roomId, 8642);
  room.players.A = createPlayerState("A", "player-A", "A", "token-A", 3001);
  room.players.B = createPlayerState("B", "player-B", "B", "token-B", 3002);
  startRoom(room);

  if (!room.players.A || !room.players.B) {
    throw new Error("Expected both players.");
  }

  room.combo = 1;
  room.lastClearSlot = lastClearSlot;
  room.players.A.active = null;
  room.players.B.active = {
    type: "O",
    matrix: matrixFor("O"),
    x: 5,
    y: 0,
  };
  room.board[24] = room.board[24].map((_, x) => (x === 6 || x === 7 ? 0 : 1));
  return room;
}

function piecesOverlap(left: ActivePiece | null, right: ActivePiece | null): boolean {
  if (!left || !right) {
    return false;
  }

  const occupied = new Set(
    cellsFor(left)
      .filter((cell) => cell.y >= 0)
      .map((cell) => `${cell.x}:${cell.y}`),
  );

  return cellsFor(right)
    .filter((cell) => cell.y >= 0)
    .some((cell) => occupied.has(`${cell.x}:${cell.y}`));
}
