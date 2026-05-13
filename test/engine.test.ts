import { describe, expect, it } from "vitest";
import { cellsFor, createPlayerState, createRoomState, simulateTick, startRoom } from "../src/shared/engine";
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

    const originalY = room.players.A.active.y;
    simulateTick(room, [input("A", 1, "hardDrop")]);

    const lockedRows = room.board
      .map((row, y) => (row.some((cell) => cell !== 0) ? y : -1))
      .filter((y) => y >= 0);

    expect(lockedRows).toHaveLength(0);
    expect(room.players.A.active?.y).toBe(originalY);
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
});

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
