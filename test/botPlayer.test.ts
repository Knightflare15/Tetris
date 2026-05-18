import { describe, expect, it } from "vitest";
import { createPlayerState, createRoomState, startRoom } from "../src/shared/engine";
import { matrixFor } from "../src/shared/tetrominoes";
import { createBotRuntime, nextBotAction } from "../src/server/botPlayer";

describe("practice bot planner", () => {
  it("moves toward an obvious double-line clear", () => {
    const room = createRoomState("bot-room", 4321);
    room.players.A = createPlayerState("A", "player-A", "A", "token-A", 1111);
    room.players.B = createPlayerState("B", "player-B", "B", "token-B", 2222);
    startRoom(room);

    if (!room.players.B) {
      throw new Error("Expected player B.");
    }

    room.players.A = null;
    room.players.B.active = {
      type: "O",
      matrix: matrixFor("O"),
      x: 0,
      y: 0,
    };
    room.players.B.queue = ["I", "T", "L"];

    room.board[23] = room.board[23].map((_, x) => (x === 6 || x === 7 ? 0 : 1));
    room.board[24] = room.board[24].map((_, x) => (x === 6 || x === 7 ? 0 : 1));

    const action = nextBotAction(room, createBotRuntime("quick"));
    expect(action).toBe("moveRight");
  });
});
