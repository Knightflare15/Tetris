import { describe, expect, it } from "vitest";
import {
  createTerritoryRoomState,
  expireTerritoryTurn,
  hasAnyLegalTerritoryAction,
  legalTerritoryPlacements,
  resolveTerritoryTurn,
  scoreTerritoryBoard,
  updateTerritoryPreview,
} from "../src/shared/territory/engine";
import type { TerritoryRoomState } from "../src/shared/types";

function room(seed = 1234): TerritoryRoomState {
  return createTerritoryRoomState(
    "territory-test",
    "bullet",
    seed,
    { userId: "player-A", displayName: "A", reconnectToken: "token-A" },
    { userId: "player-B", displayName: "B", reconnectToken: "token-B" },
    1000,
  );
}

describe("territory engine", () => {
  it("creates deterministic unique draft pools", () => {
    const first = room(999);
    const second = room(999);

    expect(first.draft.pieces.map((piece) => piece.type)).toEqual(second.draft.pieces.map((piece) => piece.type));
    expect(new Set(first.draft.pieces.map((piece) => piece.type)).size).toBe(4);
  });

  it("starts each territory match with an active preview piece", () => {
    const state = room();
    expect(state.currentPreview).toBeTruthy();
    expect(state.currentPreview?.source).toBe("draft");
  });

  it("keeps one shared board size across territory formats", () => {
    const bullet = createTerritoryRoomState(
      "territory-bullet",
      "bullet",
      1,
      { userId: "player-A", displayName: "A", reconnectToken: "token-A" },
      { userId: "player-B", displayName: "B", reconnectToken: "token-B" },
      1000,
    );
    const blitz = createTerritoryRoomState(
      "territory-blitz",
      "blitz",
      1,
      { userId: "player-A", displayName: "A", reconnectToken: "token-A" },
      { userId: "player-B", displayName: "B", reconnectToken: "token-B" },
      1000,
    );
    const rapid = createTerritoryRoomState(
      "territory-rapid",
      "rapid",
      1,
      { userId: "player-A", displayName: "A", reconnectToken: "token-A" },
      { userId: "player-B", displayName: "B", reconnectToken: "token-B" },
      1000,
    );

    expect(bullet.board.length).toBe(blitz.board.length);
    expect(blitz.board.length).toBe(rapid.board.length);
    expect(bullet.board[0]!.length).toBe(blitz.board[0]!.length);
    expect(blitz.board[0]!.length).toBe(rapid.board[0]!.length);
  });

  it("generates top-drop legal placements across lanes", () => {
    const state = room();
    state.draft.pieces = [{ id: "draft-o", type: "O" }];

    const placements = legalTerritoryPlacements(state);

    expect(placements.some((placement) => placement.edge === "top")).toBe(true);
    expect(placements.every((placement) => placement.edge === "top")).toBe(true);
    expect(placements.some((placement) => placement.lane === 0)).toBe(true);
    expect(placements.some((placement) => placement.lane > 0)).toBe(true);
  });

  it("treats blocked entry lanes as illegal while preserving other lanes", () => {
    const state = room();
    state.draft.pieces = [{ id: "draft-o", type: "O" }];
    state.board[0]![0] = { value: 2, owner: "B" };
    state.board[0]![1] = { value: 2, owner: "B" };

    const placements = legalTerritoryPlacements(state).filter((placement) => placement.edge === "top" && placement.rotation === 0);

    expect(placements.some((placement) => placement.lane === 0)).toBe(false);
    expect(placements.some((placement) => placement.lane === 2)).toBe(true);
  });

  it("places a piece beneath an overhang after descending through an open lane", () => {
    const state = room();
    state.draft.pieces = [{ id: "draft-o", type: "O" }];
    state.board[2]![7] = { value: 2, owner: "B" };
    state.board[2]![8] = { value: 2, owner: "B" };

    updateTerritoryPreview(state, { kind: "select", slot: "A", source: "draft", draftId: "draft-o" });
    for (let step = 0; step < 5; step++) {
      updateTerritoryPreview(state, { kind: "input", slot: "A", action: "softDrop" });
    }
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "moveRight" });
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "moveRight" });

    const preview = state.currentPreview;
    expect(preview).toMatchObject({ type: "O", x: 7, y: 3 });

    const result = resolveTerritoryTurn(state, {
      kind: "place",
      slot: "A",
      source: "draft",
      draftId: "draft-o",
      rotation: preview!.rotation,
      edge: "top",
      lane: preview!.x,
    }, 2000);

    expect(result.accepted).toBe(true);
    expect(result.placement).toMatchObject({ x: 7, y: state.board.length - 2 });
    expect(result.placement?.cells.every((cell) => cell.x >= 7 && cell.x <= 8 && cell.y >= 3)).toBe(true);
  });

  it("rejects stale blocked previews without writing off the board", () => {
    const state = room();
    state.draft.pieces = [{ id: "draft-o", type: "O" }];
    updateTerritoryPreview(state, { kind: "select", slot: "A", source: "draft", draftId: "draft-o" });
    const preview = state.currentPreview;
    expect(preview).toBeTruthy();
    for (const cell of preview!.cells) {
      if (cell.y + 2 >= 0) {
        state.board[cell.y + 2]![cell.x] = { value: 1, owner: "B" };
      }
    }

    const result = resolveTerritoryTurn(state, {
      kind: "place",
      slot: "A",
      source: "draft",
      draftId: "draft-o",
      rotation: preview!.rotation,
      edge: "top",
      lane: preview!.x,
    }, 2000);

    expect(result.accepted).toBe(false);
    expect(result.message).toBe("Placement is not legal.");
    expect(state.turn.activeSlot).toBe("A");
  });

  it("spends a whole turn on empty hold and later places the held piece", () => {
    const state = room();
    const heldType = state.draft.pieces[0]!.type;
    const heldId = state.draft.pieces[0]!.id;

    const holdResult = resolveTerritoryTurn(state, { kind: "hold", slot: "A", draftId: heldId }, 2000);
    expect(holdResult.accepted).toBe(true);
    expect(state.players.A.hold).toBe(heldType);
    expect(state.turn.activeSlot).toBe("B");
    expect(state.board.flat().filter((cell) => cell.value !== 0)).toHaveLength(0);

    resolveTerritoryTurn(state, { kind: "pass", slot: "B", reason: "forfeit" }, 3000);
    const heldPlacement = legalTerritoryPlacements(state).find((placement) => placement.source === "hold");
    expect(heldPlacement).toBeTruthy();
    updateTerritoryPreview(state, { kind: "select", slot: "A", source: "hold" });
    const placeResult = resolveTerritoryTurn(state, {
      kind: "place",
      slot: "A",
      source: "hold",
      rotation: heldPlacement!.rotation,
      edge: heldPlacement!.edge,
      lane: heldPlacement!.lane,
    }, 4000);

    expect(placeResult.accepted).toBe(true);
    expect(state.players.A.hold).toBeNull();
    expect(state.board.flat().filter((cell) => cell.owner === "A")).toHaveLength(4);
  });

  it("passes without softlocking when no placement or hold action exists", () => {
    const state = room();
    state.draft.pieces = [];
    state.board = state.board.map((row) => row.map(() => ({ value: 1, owner: "A" as const })));

    expect(hasAnyLegalTerritoryAction(state)).toBe(false);
    const result = expireTerritoryTurn(state, 2000);

    expect(result.accepted).toBe(true);
    expect(state.turn.turnNumber).toBe(1);
    expect(state.turn.activeSlot).toBe("B");
  });

  it("clears horizontal rows and deletes ownership before scoring", () => {
    const state = room();
    state.draft.pieces = [{ id: "draft-i", type: "I" }];
    const bottomRow = state.board.length - 1;
    const floatingRow = bottomRow - 3;
    state.board[floatingRow]![0] = { value: 1, owner: "B", pieceId: "floating-b" };
    for (let x = 0; x < 8; x++) {
      state.board[bottomRow]![x] = { value: 1, owner: "B" };
    }

    updateTerritoryPreview(state, { kind: "select", slot: "A", source: "draft", draftId: "draft-i" });
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "moveRight" });
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "moveRight" });
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "moveRight" });
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "moveRight" });
    const result = resolveTerritoryTurn(state, {
      kind: "place",
      slot: "A",
      source: "draft",
      draftId: "draft-i",
      rotation: 0,
      edge: "top",
      lane: 8,
    }, 2000);

    expect(result.accepted).toBe(true);
    expect(state.lastClears.rows).toContain(bottomRow);
    expect(scoreTerritoryBoard(state.board).raw.B).toBe(1);
    expect(state.board[floatingRow]![0].value).toBe(0);
    expect(state.board[bottomRow]![0]).toMatchObject({ value: 1, owner: "B", pieceId: "floating-b" });
  });

  it("clears vertical columns without shifting surviving stacks sideways", () => {
    const state = room();
    state.draft.pieces = [{ id: "draft-i", type: "I" }];
    updateTerritoryPreview(state, { kind: "select", slot: "A", source: "draft", draftId: "draft-i" });
    updateTerritoryPreview(state, { kind: "input", slot: "A", action: "rotateCW" });
    const preview = state.currentPreview;
    expect(preview).toBeTruthy();
    const clearColumn = preview!.x;
    const bottomRow = state.board.length - 1;
    for (let y = 4; y < state.board.length; y++) {
      state.board[y]![clearColumn] = { value: 1, owner: "B", pieceId: `column-${y}` };
    }
    state.board[7]![1] = { value: 2, owner: "A", pieceId: "left-sentinel" };
    state.board[8]![8] = { value: 3, owner: "B", pieceId: "right-sentinel" };

    const result = resolveTerritoryTurn(state, {
      kind: "place",
      slot: "A",
      source: "draft",
      draftId: "draft-i",
      rotation: preview!.rotation,
      edge: "top",
      lane: clearColumn,
    }, 2000);

    expect(result.accepted).toBe(true);
    expect(state.lastClears.columns).toContain(clearColumn);
    expect(state.board.some((row) => row[clearColumn]!.value !== 0)).toBe(false);
    expect(state.board[bottomRow]![1]).toMatchObject({ value: 2, owner: "A", pieceId: "left-sentinel" });
    expect(state.board[bottomRow]![8]).toMatchObject({ value: 3, owner: "B", pieceId: "right-sentinel" });
  });

  it("scores connected components quadratically", () => {
    const state = room();
    state.board[10]![1] = { value: 1, owner: "A" };
    state.board[10]![2] = { value: 1, owner: "A" };
    state.board[11]![2] = { value: 1, owner: "A" };
    state.board[4]![4] = { value: 1, owner: "B" };
    state.board[6]![6] = { value: 1, owner: "B" };

    const scores = scoreTerritoryBoard(state.board);

    expect(scores.raw.A).toBe(3);
    expect(scores.weighted.A).toBe(9);
    expect(scores.raw.B).toBe(2);
    expect(scores.weighted.B).toBe(2);
  });

  it("ends by domination after the configured consecutive resolved turns", () => {
    const state = room();
    let claimed = 0;
    for (let y = state.board.length - 1; y >= 0 && claimed < 85; y--) {
      for (let x = 0; x < state.board[y]!.length && claimed < 85; x++) {
        state.board[y]![x] = { value: 1, owner: "A" };
        claimed += 1;
      }
    }

    resolveTerritoryTurn(state, { kind: "pass", slot: "A", reason: "forfeit" }, 2000);
    expect(state.status).toBe("playing");
    resolveTerritoryTurn(state, { kind: "pass", slot: "B", reason: "forfeit" }, 3000);

    expect(state.status).toBe("ended");
    expect(state.winner).toBe("A");
    expect(state.winnerReason).toBe("domination");
  });

  it("does not grant domination on 85 cells when weighted score is lower", () => {
    const state = room();
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        state.board[y]![x] = { value: 1, owner: "B" };
      }
    }

    let placedA = 0;
    for (let y = 0; y < state.board.length && placedA < 85; y++) {
      for (let x = 0; x < state.board[y]!.length && placedA < 85; x++) {
        if (x < 4 && y < 4) {
          continue;
        }
        if ((x + y) % 2 === 0) {
          state.board[y]![x] = { value: 1, owner: "A" };
          placedA += 1;
        }
      }
    }

    const scores = scoreTerritoryBoard(state.board);

    expect(scores.raw.A).toBe(85);
    expect(scores.weighted.A).toBeLessThan(scores.weighted.B);
    expect(scores.dominantSlot).toBeNull();
  });

  it("decides timeout winner by weighted score only", () => {
    const state = room();
    state.turn.turnNumber = state.turn.totalTurns - 1;

    state.board[5]![1] = { value: 1, owner: "A" };
    state.board[5]![2] = { value: 1, owner: "A" };
    state.board[6]![1] = { value: 1, owner: "A" };
    state.board[6]![2] = { value: 1, owner: "A" };

    state.board[10]![7] = { value: 1, owner: "B" };
    state.board[10]![9] = { value: 1, owner: "B" };
    state.board[12]![7] = { value: 1, owner: "B" };
    state.board[12]![9] = { value: 1, owner: "B" };
    state.board[14]![7] = { value: 1, owner: "B" };

    const result = resolveTerritoryTurn(state, { kind: "pass", slot: "A", reason: "forfeit" }, 2000);

    expect(result.accepted).toBe(true);
    expect(state.scores.raw.A).toBe(4);
    expect(state.scores.raw.B).toBe(5);
    expect(state.scores.weighted.A).toBe(16);
    expect(state.scores.weighted.B).toBe(5);
    expect(state.status).toBe("ended");
    expect(state.winner).toBe("A");
    expect(state.winnerReason).toBe("territory-score");
  });
});
