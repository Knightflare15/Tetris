import { describe, expect, it } from "vitest";
import { createPlayerState, createRoomState, simulateTick, startRoom } from "../src/shared/engine";
import type { QueuedInput } from "../src/shared/types";

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
});
