import { SeededRng } from "./rng";
import { matrixFor, TETROMINO_TYPES, TETROMINO_VALUE } from "./tetrominoes";
import type {
  CellValue,
  Matrix,
  PlayerSlot,
  TerritoryBoard,
  TerritoryCell,
  TerritoryClearSummary,
  TerritoryActivePiece,
  TerritoryDraftPiece,
  TerritoryDraftState,
  TerritoryEntryEdge,
  TerritoryFormat,
  TerritoryFormatConfig,
  TerritoryLegalPlacement,
  TerritoryPreviewAction,
  TerritoryRoomState,
  TerritoryScoreSummary,
  TerritorySnapshot,
  TerritoryTurnAction,
  TetrominoType,
} from "./types";

const DRAFT_SIZE = 4;
const TERRITORY_BOARD_COLUMNS = 12;
const TERRITORY_BOARD_ROWS = 20;
const TERRITORY_DOMINATION_CELLS = 85;

export const TERRITORY_FORMATS: Record<TerritoryFormat, TerritoryFormatConfig> = {
  bullet: {
    format: "bullet",
    columns: TERRITORY_BOARD_COLUMNS,
    rows: TERRITORY_BOARD_ROWS,
    totalTurns: 24,
    turnTimerMs: 8000,
    dominationTurns: 2,
  },
  blitz: {
    format: "blitz",
    columns: TERRITORY_BOARD_COLUMNS,
    rows: TERRITORY_BOARD_ROWS,
    totalTurns: 36,
    turnTimerMs: 12000,
    dominationTurns: 3,
  },
  rapid: {
    format: "rapid",
    columns: TERRITORY_BOARD_COLUMNS,
    rows: TERRITORY_BOARD_ROWS,
    totalTurns: 50,
    turnTimerMs: 18000,
    dominationTurns: 3,
  },
};

export interface TerritoryResolutionResult {
  accepted: boolean;
  message?: string;
  placement?: TerritoryLegalPlacement;
  snapshot: TerritorySnapshot;
}

function cloneActivePiece(piece: TerritoryActivePiece | null): TerritoryActivePiece | null {
  if (!piece) {
    return null;
  }
  return {
    ...piece,
    cells: piece.cells.map((cell) => ({ ...cell })),
  };
}

function clonePlacement(placement: TerritoryLegalPlacement | null): TerritoryLegalPlacement | null {
  if (!placement) {
    return null;
  }
  return {
    ...placement,
    cells: placement.cells.map((cell) => ({ ...cell })),
  };
}

interface PieceCell {
  x: number;
  y: number;
}

function emptyCell(): TerritoryCell {
  return { value: 0, owner: null };
}

function createBoard(rows: number, columns: number): TerritoryBoard {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, emptyCell));
}

function cloneBoard(board: TerritoryBoard): TerritoryBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function otherSlot(slot: PlayerSlot): PlayerSlot {
  return slot === "A" ? "B" : "A";
}

function emptyClears(): TerritoryClearSummary {
  return { rows: [], columns: [], cells: [] };
}

function emptyScores(): TerritoryScoreSummary {
  return {
    weighted: { A: 0, B: 0 },
    raw: { A: 0, B: 0 },
    components: { A: [], B: [] },
    dominantSlot: null,
    dominationStreakSlot: null,
    dominationStreak: 0,
  };
}

function rotateClockwise(matrix: Matrix): Matrix {
  const size = matrix.length;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => matrix[size - 1 - x]?.[y] ?? 0),
  );
}

function normalizedCellsFor(type: TetrominoType, rotation: number): PieceCell[] {
  let matrix = matrixFor(type);
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    matrix = rotateClockwise(matrix);
  }

  const cells: PieceCell[] = [];
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y]!.length; x++) {
      if (matrix[y]![x] !== 0) {
        cells.push({ x, y });
      }
    }
  }

  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
}

function dimensionsFor(cells: PieceCell[]): { width: number; height: number } {
  return {
    width: Math.max(...cells.map((cell) => cell.x)) + 1,
    height: Math.max(...cells.map((cell) => cell.y)) + 1,
  };
}

function cellsAt(cells: PieceCell[], x: number, y: number): Array<{ x: number; y: number }> {
  return cells.map((cell) => ({ x: x + cell.x, y: y + cell.y }));
}

function collidesAt(board: TerritoryBoard, cells: PieceCell[], x: number, y: number): boolean {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  return cells.some((cell) => {
    const boardX = x + cell.x;
    const boardY = y + cell.y;
    if (boardX < 0 || boardX >= columns || boardY >= rows) {
      return true;
    }
    if (boardY < 0) {
      return false;
    }
    return board[boardY]?.[boardX]?.value !== 0;
  });
}

function activePieceFromPosition(
  source: TerritoryActivePiece["source"],
  type: TetrominoType,
  rotation: number,
  x: number,
  y: number,
  draftId?: string,
): TerritoryActivePiece {
  const pieceCells = normalizedCellsFor(type, rotation);
  return {
    source,
    draftId,
    type,
    rotation: ((rotation % 4) + 4) % 4,
    x,
    y,
    cells: cellsAt(pieceCells, x, y),
  };
}

function spawnXFor(columns: number, width: number): number {
  return Math.max(0, Math.floor((columns - width) / 2));
}

function createSpawnPreview(
  board: TerritoryBoard,
  source: TerritoryActivePiece["source"],
  type: TetrominoType,
  rotation = 0,
  draftId?: string,
): TerritoryActivePiece | null {
  const pieceCells = normalizedCellsFor(type, rotation);
  const { width, height } = dimensionsFor(pieceCells);
  const columns = board[0]?.length ?? 0;
  const x = spawnXFor(columns, width);
  const y = -height;
  if (collidesAt(board, pieceCells, x, y)) {
    return null;
  }
  return activePieceFromPosition(source, type, rotation, x, y, draftId);
}

function projectActivePiece(board: TerritoryBoard, piece: TerritoryActivePiece): TerritoryLegalPlacement {
  const pieceCells = normalizedCellsFor(piece.type, piece.rotation);
  let y = piece.y;
  while (!collidesAt(board, pieceCells, piece.x, y + 1)) {
    y += 1;
  }
  return {
    source: piece.source,
    draftId: piece.draftId,
    type: piece.type,
    rotation: piece.rotation,
    edge: "top",
    lane: piece.x,
    x: piece.x,
    y,
    cells: cellsAt(pieceCells, piece.x, y),
  };
}

function tryMovePreview(board: TerritoryBoard, piece: TerritoryActivePiece, dx: number, dy: number): TerritoryActivePiece | null {
  const pieceCells = normalizedCellsFor(piece.type, piece.rotation);
  const nextX = piece.x + dx;
  const nextY = piece.y + dy;
  if (collidesAt(board, pieceCells, nextX, nextY)) {
    return null;
  }
  return activePieceFromPosition(piece.source, piece.type, piece.rotation, nextX, nextY, piece.draftId);
}

function tryRotatePreview(board: TerritoryBoard, piece: TerritoryActivePiece, direction: "cw" | "ccw"): TerritoryActivePiece | null {
  const nextRotation = direction === "cw" ? piece.rotation + 1 : piece.rotation - 1;
  const rotatedCells = normalizedCellsFor(piece.type, nextRotation);
  for (const offset of [0, -1, 1, -2, 2]) {
    const nextX = piece.x + offset;
    if (!collidesAt(board, rotatedCells, nextX, piece.y)) {
      return activePieceFromPosition(piece.source, piece.type, nextRotation, nextX, piece.y, piece.draftId);
    }
  }
  return null;
}

function isFullyInside(board: TerritoryBoard, cells: PieceCell[], x: number, y: number): boolean {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  return cells.every((cell) => {
    const boardX = x + cell.x;
    const boardY = y + cell.y;
    return boardX >= 0 && boardX < columns && boardY >= 0 && boardY < rows;
  });
}

function isEmptyAt(board: TerritoryBoard, cells: PieceCell[], x: number, y: number): boolean {
  return cells.every((cell) => board[y + cell.y]?.[x + cell.x]?.value === 0);
}

function hasExitedOppositeEdge(
  edge: TerritoryEntryEdge,
  x: number,
  y: number,
  width: number,
  height: number,
  rows: number,
  columns: number,
): boolean {
  switch (edge) {
    case "top":
      return y >= rows;
    case "bottom":
      return y + height <= 0;
    case "left":
      return x >= columns;
    case "right":
      return x + width <= 0;
  }
}

function positionForEntry(
  edge: TerritoryEntryEdge,
  lane: number,
  width: number,
  height: number,
  rows: number,
  columns: number,
): { x: number; y: number; dx: number; dy: number; legalLane: boolean; limit: number } {
  switch (edge) {
    case "top":
      return { x: lane, y: -height, dx: 0, dy: 1, legalLane: lane >= 0 && lane <= columns - width, limit: rows + height + 2 };
    case "bottom":
      return { x: lane, y: rows, dx: 0, dy: -1, legalLane: lane >= 0 && lane <= columns - width, limit: rows + height + 2 };
    case "left":
      return { x: -width, y: lane, dx: 1, dy: 0, legalLane: lane >= 0 && lane <= rows - height, limit: columns + width + 2 };
    case "right":
      return { x: columns, y: lane, dx: -1, dy: 0, legalLane: lane >= 0 && lane <= rows - height, limit: columns + width + 2 };
  }
}

function findDropPlacement(
  board: TerritoryBoard,
  source: TerritoryLegalPlacement["source"],
  type: TetrominoType,
  rotation: number,
  edge: TerritoryEntryEdge,
  lane: number,
  draftId?: string,
): TerritoryLegalPlacement | null {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  const pieceCells = normalizedCellsFor(type, rotation);
  const { width, height } = dimensionsFor(pieceCells);
  const start = positionForEntry(edge, lane, width, height, rows, columns);
  if (!start.legalLane) {
    return null;
  }

  let x = start.x;
  let y = start.y;
  let lastValid: { x: number; y: number } | null = null;

  for (let step = 0; step <= start.limit; step++) {
    const inside = isFullyInside(board, pieceCells, x, y);
    if (inside) {
      if (!isEmptyAt(board, pieceCells, x, y)) {
        break;
      }
      lastValid = { x, y };
    } else if (lastValid && hasExitedOppositeEdge(edge, x, y, width, height, rows, columns)) {
      break;
    }

    x += start.dx;
    y += start.dy;
  }

  if (!lastValid) {
    return null;
  }

  return {
    source,
    draftId,
    type,
    rotation: ((rotation % 4) + 4) % 4,
    edge,
    lane,
    x: lastValid.x,
    y: lastValid.y,
    cells: pieceCells.map((cell) => ({ x: lastValid.x + cell.x, y: lastValid.y + cell.y })),
  };
}

function findTopDropPlacement(
  board: TerritoryBoard,
  source: TerritoryLegalPlacement["source"],
  type: TetrominoType,
  rotation: number,
  lane: number,
  draftId?: string,
): TerritoryLegalPlacement | null {
  return findDropPlacement(board, source, type, rotation, "top", lane, draftId);
}

function shuffledBag(seed: number): { bag: TetrominoType[]; seed: number } {
  const rng = new SeededRng(seed);
  const bag = [...TETROMINO_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return { bag, seed: rng.snapshot() };
}

function nextType(draft: TerritoryDraftState): TetrominoType {
  if (draft.bagIndex >= draft.bag.length) {
    const next = shuffledBag(draft.seed);
    draft.bag = next.bag;
    draft.seed = next.seed;
    draft.bagIndex = 0;
  }

  const type = draft.bag[draft.bagIndex];
  draft.bagIndex += 1;
  return type!;
}

function firstSpawnablePreview(state: TerritoryRoomState, slot = state.turn.activeSlot): TerritoryActivePiece | null {
  if (state.status !== "playing" || state.turn.activeSlot !== slot) {
    return null;
  }

  for (const piece of state.draft.pieces) {
    const preview = createSpawnPreview(state.board, "draft", piece.type, 0, piece.id);
    if (preview) {
      return preview;
    }
  }

  const heldType = state.players[slot].hold;
  if (heldType) {
    return createSpawnPreview(state.board, "hold", heldType, 0);
  }

  return null;
}

function refillDraft(draft: TerritoryDraftState): void {
  let attempts = 0;
  while (draft.pieces.length < DRAFT_SIZE) {
    const visibleTypes = new Set(draft.pieces.map((piece) => piece.type));
    const type = nextType(draft);
    attempts += 1;
    if (visibleTypes.has(type) && attempts < TETROMINO_TYPES.length * 4) {
      draft.bag.push(type);
      continue;
    }

    draft.pieces.push({ id: `td-${draft.nextPieceId}`, type });
    draft.nextPieceId += 1;
  }
}

function createDraft(seed: number): TerritoryDraftState {
  const draft: TerritoryDraftState = {
    pieces: [],
    bag: [],
    bagIndex: 0,
    nextPieceId: 1,
    seed,
  };
  refillDraft(draft);
  return draft;
}

export function createTerritoryRoomState(
  roomId: string,
  format: TerritoryFormat,
  seed: number,
  playerA: { userId: string | null; displayName: string; reconnectToken: string },
  playerB: { userId: string | null; displayName: string; reconnectToken: string },
  now = Date.now(),
): TerritoryRoomState {
  const config = TERRITORY_FORMATS[format];
  const board = createBoard(config.rows, config.columns);
  const state: TerritoryRoomState = {
    id: roomId,
    mode: "territory",
    format,
    status: "playing",
    board,
    players: {
      A: { slot: "A", connected: true, hold: null, ...playerA },
      B: { slot: "B", connected: true, hold: null, ...playerB },
    },
    draft: createDraft(seed),
    turn: {
      activeSlot: "A",
      turnNumber: 0,
      totalTurns: config.totalTurns,
      turnStartedAt: now,
      turnEndsAt: now + config.turnTimerMs,
    },
    currentPreview: null,
    scores: emptyScores(),
    winner: null,
    winnerReason: null,
    lastClears: emptyClears(),
    lastTerritoryGainSlot: null,
    createdAt: now,
    updatedAt: now,
  };
  state.currentPreview = firstSpawnablePreview(state);
  return state;
}

export function canHoldTerritoryPiece(state: TerritoryRoomState, slot = state.turn.activeSlot): boolean {
  if (state.status !== "playing" || state.turn.activeSlot !== slot || state.draft.pieces.length === 0) {
    return false;
  }

  const player = state.players[slot];
  if (!player.hold) {
    return true;
  }

  return state.draft.pieces.some((piece) =>
    state.draft.pieces.every((otherPiece) => otherPiece.id === piece.id || otherPiece.type !== player.hold),
  );
}

export function legalTerritoryPlacements(state: TerritoryRoomState, slot = state.turn.activeSlot): TerritoryLegalPlacement[] {
  if (state.status !== "playing" || state.turn.activeSlot !== slot) {
    return [];
  }

  const placements: TerritoryLegalPlacement[] = [];
  const sources: Array<{ source: "draft"; draftId: string; type: TetrominoType } | { source: "hold"; type: TetrominoType }> = [
    ...state.draft.pieces.map((piece) => ({ source: "draft" as const, draftId: piece.id, type: piece.type })),
  ];
  const heldType = state.players[slot].hold;
  if (heldType) {
    sources.push({ source: "hold", type: heldType });
  }

  for (const source of sources) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const cells = normalizedCellsFor(source.type, rotation);
      const { width } = dimensionsFor(cells);
      const laneCount = Math.max(0, (state.board[0]?.length ?? 0) - width + 1);

      for (let lane = 0; lane < laneCount; lane++) {
        const placement = findTopDropPlacement(
          state.board,
          source.source,
          source.type,
          rotation,
          lane,
          source.source === "draft" ? source.draftId : undefined,
        );
        if (placement) {
          placements.push(placement);
        }
      }
    }
  }

  return placements;
}

export function hasAnyLegalTerritoryAction(state: TerritoryRoomState, slot = state.turn.activeSlot): boolean {
  return firstSpawnablePreview(state, slot) !== null || canHoldTerritoryPiece(state, slot);
}

function draftPieceById(state: TerritoryRoomState, draftId: string): TerritoryDraftPiece | null {
  return state.draft.pieces.find((piece) => piece.id === draftId) ?? null;
}

function removeDraftPiece(state: TerritoryRoomState, draftId: string): TerritoryDraftPiece | null {
  const index = state.draft.pieces.findIndex((piece) => piece.id === draftId);
  if (index === -1) {
    return null;
  }
  const [piece] = state.draft.pieces.splice(index, 1);
  return piece ?? null;
}

function applyPlacement(state: TerritoryRoomState, placement: TerritoryLegalPlacement, slot: PlayerSlot): void {
  const value = TETROMINO_VALUE[placement.type];
  const pieceId = `territory-${slot}-${state.turn.turnNumber + 1}-${placement.type}`;
  for (const cell of placement.cells) {
    state.board[cell.y]![cell.x] = { value, owner: slot, pieceId };
  }
  state.lastTerritoryGainSlot = slot;
}

function isPlacementInsideBoard(board: TerritoryBoard, placement: TerritoryLegalPlacement): boolean {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  return placement.cells.every((cell) => cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < rows);
}

function findFullLines(board: TerritoryBoard): { rows: number[]; columns: number[] } {
  const rows = board
    .map((row, index) => ({ index, full: row.every((cell) => cell.value !== 0) }))
    .filter((row) => row.full)
    .map((row) => row.index);
  const columns: number[] = [];
  const columnCount = board[0]?.length ?? 0;
  for (let x = 0; x < columnCount; x++) {
    if (board.every((row) => row[x]?.value !== 0)) {
      columns.push(x);
    }
  }
  return { rows, columns };
}

function collapseHorizontal(board: TerritoryBoard, clearedRows: number[]): TerritoryBoard {
  if (clearedRows.length === 0) {
    return board;
  }

  const rowSet = new Set(clearedRows);
  const columns = board[0]?.length ?? 0;
  const remaining = board.filter((_, y) => !rowSet.has(y));
  const emptyRows = Array.from({ length: clearedRows.length }, () => Array.from({ length: columns }, emptyCell));
  return [...emptyRows, ...remaining];
}

function settleAirborneBlocks(board: TerritoryBoard): TerritoryBoard {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  const nextBoard = createBoard(rows, columns);

  for (let x = 0; x < columns; x++) {
    const fallingCells: TerritoryCell[] = [];
    for (let y = rows - 1; y >= 0; y--) {
      const cell = board[y]?.[x];
      if (cell?.value) {
        fallingCells.push({ ...cell });
      }
    }

    for (let index = 0; index < fallingCells.length; index++) {
      nextBoard[rows - 1 - index]![x] = fallingCells[index]!;
    }
  }

  return nextBoard;
}

function resolveClears(state: TerritoryRoomState): void {
  const { rows, columns } = findFullLines(state.board);
  const clearCells: Array<{ x: number; y: number }> = [];
  if (rows.length === 0 && columns.length === 0) {
    state.lastClears = emptyClears();
    return;
  }

  const rowSet = new Set(rows);
  const columnSet = new Set(columns);
  for (let y = 0; y < state.board.length; y++) {
    for (let x = 0; x < (state.board[y]?.length ?? 0); x++) {
      if (rowSet.has(y) || columnSet.has(x)) {
        clearCells.push({ x, y });
        state.board[y]![x] = emptyCell();
      }
    }
  }

  state.lastClears = { rows, columns, cells: clearCells };
  state.board = settleAirborneBlocks(collapseHorizontal(state.board, rows));
}

export function scoreTerritoryBoard(board: TerritoryBoard): TerritoryScoreSummary {
  const scores = emptyScores();
  const visited = board.map((row) => row.map(() => false));
  const rows = board.length;
  const columns = board[0]?.length ?? 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const owner = board[y]?.[x]?.owner;
      if (!owner || visited[y]?.[x]) {
        continue;
      }

      const queue: Array<{ x: number; y: number }> = [{ x, y }];
      const cells: Array<{ x: number; y: number }> = [];
      visited[y]![x] = true;

      while (queue.length > 0) {
        const current = queue.shift()!;
        cells.push(current);
        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
          const neighborCell = board[neighbor.y]?.[neighbor.x];
          if (!neighborCell || visited[neighbor.y]?.[neighbor.x] || neighborCell.owner !== owner) {
            continue;
          }
          visited[neighbor.y]![neighbor.x] = true;
          queue.push(neighbor);
        }
      }

      const size = cells.length;
      scores.raw[owner] += size;
      scores.weighted[owner] += size * size;
      scores.components[owner].push({ size, cells });
    }
  }

  if (scores.raw.A >= TERRITORY_DOMINATION_CELLS && scores.weighted.A > scores.weighted.B) {
    scores.dominantSlot = "A";
  } else if (scores.raw.B >= TERRITORY_DOMINATION_CELLS && scores.weighted.B > scores.weighted.A) {
    scores.dominantSlot = "B";
  }

  return scores;
}

function refreshScoresAndDomination(state: TerritoryRoomState): void {
  const previousSlot = state.scores.dominationStreakSlot;
  const previousCount = state.scores.dominationStreak;
  const nextScores = scoreTerritoryBoard(state.board);
  if (nextScores.dominantSlot) {
    nextScores.dominationStreakSlot = nextScores.dominantSlot;
    nextScores.dominationStreak = nextScores.dominantSlot === previousSlot ? previousCount + 1 : 1;
  }
  state.scores = nextScores;
}

function refreshCurrentPreview(state: TerritoryRoomState): void {
  state.currentPreview = firstSpawnablePreview(state);
}

function finishByScore(state: TerritoryRoomState): void {
  const weightedA = state.scores.weighted.A;
  const weightedB = state.scores.weighted.B;

  state.status = "ended";
  state.winnerReason = "territory-score";
  state.currentPreview = null;
  if (weightedA !== weightedB) {
    state.winner = weightedA > weightedB ? "A" : "B";
    return;
  }
  state.winner = "draw";
  state.winnerReason = "draw";
}

function finishIfNeeded(state: TerritoryRoomState): void {
  const config = TERRITORY_FORMATS[state.format];
  if (state.scores.dominationStreakSlot && state.scores.dominationStreak >= config.dominationTurns) {
    state.status = "ended";
    state.winner = state.scores.dominationStreakSlot;
    state.winnerReason = "domination";
    state.currentPreview = null;
    return;
  }

  if (state.turn.turnNumber >= config.totalTurns) {
    finishByScore(state);
  }
}

function advanceTurn(state: TerritoryRoomState, now: number): void {
  const config = TERRITORY_FORMATS[state.format];
  refreshScoresAndDomination(state);
  state.turn.turnNumber += 1;
  finishIfNeeded(state);
  if (state.status === "ended") {
    state.updatedAt = now;
    state.currentPreview = null;
    return;
  }

  state.turn.activeSlot = otherSlot(state.turn.activeSlot);
  state.turn.turnStartedAt = now;
  state.turn.turnEndsAt = now + config.turnTimerMs;
  refreshCurrentPreview(state);
  state.updatedAt = now;
}

function publicPlayers(state: TerritoryRoomState): TerritorySnapshot["players"] {
  return {
    A: {
      slot: "A",
      userId: state.players.A.userId,
      displayName: state.players.A.displayName,
      connected: state.players.A.connected,
      hold: state.players.A.hold,
    },
    B: {
      slot: "B",
      userId: state.players.B.userId,
      displayName: state.players.B.displayName,
      connected: state.players.B.connected,
      hold: state.players.B.hold,
    },
  };
}

export function snapshotTerritoryRoom(state: TerritoryRoomState, now = Date.now()): TerritorySnapshot {
  return {
    id: state.id,
    mode: "territory",
    format: state.format,
    status: state.status,
    board: cloneBoard(state.board),
    players: publicPlayers(state),
    draft: state.draft.pieces.map((piece) => ({ ...piece })),
    turn: { ...state.turn },
    currentPreview: cloneActivePiece(state.currentPreview),
    scores: {
      weighted: { ...state.scores.weighted },
      raw: { ...state.scores.raw },
      components: {
        A: state.scores.components.A.map((component) => ({ size: component.size, cells: component.cells.map((cell) => ({ ...cell })) })),
        B: state.scores.components.B.map((component) => ({ size: component.size, cells: component.cells.map((cell) => ({ ...cell })) })),
      },
      dominantSlot: state.scores.dominantSlot,
      dominationStreakSlot: state.scores.dominationStreakSlot,
      dominationStreak: state.scores.dominationStreak,
    },
    winner: state.winner,
    winnerReason: state.winnerReason,
    lastClears: {
      rows: [...state.lastClears.rows],
      columns: [...state.lastClears.columns],
      cells: state.lastClears.cells.map((cell) => ({ ...cell })),
    },
    legalPlacements: legalTerritoryPlacements(state).map((placement) => ({
      ...placement,
      cells: placement.cells.map((cell) => ({ ...cell })),
    })),
    canHold: canHoldTerritoryPiece(state),
    serverTime: now,
  };
}

export function updateTerritoryPreview(state: TerritoryRoomState, preview: TerritoryPreviewAction): TerritorySnapshot {
  if (state.status !== "playing" || preview.slot !== state.turn.activeSlot) {
    return snapshotTerritoryRoom(state);
  }

  if (preview.kind === "select") {
    let nextPreview: TerritoryActivePiece | null = null;
    if (preview.source === "draft" && preview.draftId) {
      const piece = draftPieceById(state, preview.draftId);
      if (piece) {
        nextPreview = createSpawnPreview(state.board, "draft", piece.type, 0, piece.id);
      }
    } else if (preview.source === "hold") {
      const heldType = state.players[preview.slot].hold;
      if (heldType) {
        nextPreview = createSpawnPreview(state.board, "hold", heldType, 0);
      }
    }
    if (nextPreview) {
      state.currentPreview = nextPreview;
    }
    return snapshotTerritoryRoom(state);
  }

  const currentPreview = state.currentPreview;
  if (!currentPreview) {
    return snapshotTerritoryRoom(state);
  }

  let nextPreview: TerritoryActivePiece | null = null;
  switch (preview.action) {
    case "moveLeft":
      nextPreview = tryMovePreview(state.board, currentPreview, -1, 0);
      break;
    case "moveRight":
      nextPreview = tryMovePreview(state.board, currentPreview, 1, 0);
      break;
    case "softDrop":
      nextPreview = tryMovePreview(state.board, currentPreview, 0, 1);
      break;
    case "rotateCW":
      nextPreview = tryRotatePreview(state.board, currentPreview, "cw");
      break;
    case "rotateCCW":
      nextPreview = tryRotatePreview(state.board, currentPreview, "ccw");
      break;
  }

  if (nextPreview) {
    state.currentPreview = nextPreview;
  }
  return snapshotTerritoryRoom(state);
}

function resolveHoldAction(state: TerritoryRoomState, action: Extract<TerritoryTurnAction, { kind: "hold" }>): string | null {
  const selected = draftPieceById(state, action.draftId);
  if (!selected) {
    return "Draft piece is no longer available.";
  }

  const player = state.players[action.slot];
  if (!player.hold) {
    const removed = removeDraftPiece(state, action.draftId);
    if (!removed) {
      return "Draft piece is no longer available.";
    }
    player.hold = removed.type;
    refillDraft(state.draft);
    return null;
  }

  const wouldDuplicate = state.draft.pieces.some((piece) => piece.id !== action.draftId && piece.type === player.hold);
  if (wouldDuplicate) {
    return "Hold swap would duplicate the visible draft pool.";
  }

  const previousHold = player.hold;
  player.hold = selected.type;
  selected.type = previousHold;
  return null;
}

export function resolveTerritoryTurn(
  state: TerritoryRoomState,
  action: TerritoryTurnAction,
  now = Date.now(),
): TerritoryResolutionResult {
  if (state.status !== "playing") {
    return { accepted: false, message: "Territory match is not active.", snapshot: snapshotTerritoryRoom(state, now) };
  }
  if (action.slot !== state.turn.activeSlot) {
    return { accepted: false, message: "It is not your turn.", snapshot: snapshotTerritoryRoom(state, now) };
  }

  if (action.kind === "pass") {
    state.lastClears = emptyClears();
    advanceTurn(state, now);
    return { accepted: true, snapshot: snapshotTerritoryRoom(state, now) };
  }

  if (action.kind === "hold") {
    if (!canHoldTerritoryPiece(state, action.slot)) {
      return { accepted: false, message: "Hold is not legal right now.", snapshot: snapshotTerritoryRoom(state, now) };
    }
    const holdError = resolveHoldAction(state, action);
    if (holdError) {
      return { accepted: false, message: holdError, snapshot: snapshotTerritoryRoom(state, now) };
    }
    state.lastClears = emptyClears();
    advanceTurn(state, now);
    return { accepted: true, snapshot: snapshotTerritoryRoom(state, now) };
  }

  const preview = state.currentPreview;
  if (!preview) {
    return { accepted: false, message: "Placement is not legal.", snapshot: snapshotTerritoryRoom(state, now) };
  }

  if (preview.source !== action.source) {
    return { accepted: false, message: "Placement source is out of sync.", snapshot: snapshotTerritoryRoom(state, now) };
  }
  if (action.source === "draft" && preview.draftId !== action.draftId) {
    return { accepted: false, message: "Draft selection is out of sync.", snapshot: snapshotTerritoryRoom(state, now) };
  }

  const placement = findDropPlacement(
    state.board,
    action.source,
    preview.type,
    action.rotation,
    action.edge,
    action.lane,
    action.source === "draft" ? action.draftId : undefined,
  );
  if (!placement || !isPlacementInsideBoard(state.board, placement)) {
    return { accepted: false, message: "Placement is not legal.", snapshot: snapshotTerritoryRoom(state, now) };
  }

  applyPlacement(state, placement, action.slot);
  if (action.source === "draft") {
    removeDraftPiece(state, action.draftId);
    refillDraft(state.draft);
  } else {
    state.players[action.slot].hold = null;
  }
  resolveClears(state);
  advanceTurn(state, now);
  return { accepted: true, placement, snapshot: snapshotTerritoryRoom(state, now) };
}

export function expireTerritoryTurn(state: TerritoryRoomState, now = Date.now()): TerritoryResolutionResult {
  const reason = hasAnyLegalTerritoryAction(state) ? "timeout" : "no-legal-move";
  return resolveTerritoryTurn(state, { kind: "pass", slot: state.turn.activeSlot, reason }, now);
}
