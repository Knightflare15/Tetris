import {
  COLS,
  LINES_PER_LEVEL,
  QUEUE_PREVIEW,
  ROWS,
  type ActivePiece,
  type Board,
  type CellValue,
  type Matrix,
  type PlayerGameState,
  type PlayerPublicState,
  type PlayerSlot,
  type QueuedInput,
  type RoomSnapshot,
  type RoomState,
  type TetrominoType,
} from "./types";
import { createGenerator, ensureQueue } from "./pieceGenerator";
import { matrixFor, TETROMINO_VALUE } from "./tetrominoes";

const GRAVITY_TICKS_BASE = 20;
const GRAVITY_TICKS_ACCELERATION = 2;
const GRAVITY_TICKS_MIN = 2;

export interface SimulationDiagnostics {
  locks: string[];
  holdConflicts: string[];
  lineClears: number;
  gameOver?: string;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<CellValue>(COLS).fill(0));
}

export function createRoomState(roomId: string, seed: number): RoomState {
  return {
    roomId,
    tick: 0,
    status: "waiting",
    board: createEmptyBoard(),
    players: { A: null, B: null },
    hold: { type: null, lastHolder: null, lastTick: 0 },
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    seed,
    inputOrder: 0,
  };
}

export function createPlayerState(
  slot: PlayerSlot,
  userId: string,
  displayName: string,
  reconnectToken: string,
  seed: number,
): PlayerGameState {
  const player: PlayerGameState = {
    slot,
    userId,
    displayName,
    connected: true,
    reconnectToken,
    lastProcessedSeq: 0,
    latencyMs: 0,
    active: null,
    queue: [],
    canHold: true,
    pendingLock: false,
    generatorState: createGenerator(seed),
  };
  ensureQueue(player.queue, player.generatorState, slot, 1);
  return player;
}

export function startRoom(state: RoomState): void {
  state.status = "playing";
  forEachPlayer(state, (player) => spawnNextPiece(state, player));
}

export function simulateTick(state: RoomState, inputs: QueuedInput[]): SimulationDiagnostics {
  const diagnostics: SimulationDiagnostics = { locks: [], holdConflicts: [], lineClears: 0 };
  if (state.status !== "playing" || state.gameOver) {
    return diagnostics;
  }

  state.tick += 1;
  const sortedInputs = [...inputs].sort((a, b) => a.serverOrder - b.serverOrder);
  let holdWinner: PlayerSlot | null = null;

  for (const input of sortedInputs) {
    const player = state.players[input.slot];
    if (!player || input.seq <= player.lastProcessedSeq) {
      continue;
    }

    player.lastProcessedSeq = input.seq;

    if (input.action === "hold") {
      if (holdWinner) {
        diagnostics.holdConflicts.push(`tick=${state.tick} loser=${input.slot} winner=${holdWinner}`);
        continue;
      }
      const held = applyHold(state, player);
      if (held) {
        holdWinner = input.slot;
      }
      continue;
    }

    applyMovementInput(state, player, input.action);
  }

  if (state.tick % gravityTicksForLevel(state.level) === 0) {
    forEachPlayer(state, (player) => {
      if (player.active) {
        applyVerticalFall(state, player);
      }
    });
  }

  processPendingLocks(state, diagnostics);
  return diagnostics;
}

export function snapshotRoom(state: RoomState): RoomSnapshot {
  return {
    roomId: state.roomId,
    tick: state.tick,
    status: state.status,
    board: cloneBoard(state.board),
    players: {
      A: publicPlayer(state.players.A),
      B: publicPlayer(state.players.B),
    },
    hold: { ...state.hold },
    score: state.score,
    level: state.level,
    lines: state.lines,
    gameOver: state.gameOver,
    winnerMessage: state.winnerMessage,
  };
}

export function cellsFor(piece: ActivePiece): Array<{ x: number; y: number; value: CellValue }> {
  const cells: Array<{ x: number; y: number; value: CellValue }> = [];
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        cells.push({ x: piece.x + x, y: piece.y + y, value });
      }
    });
  });
  return cells;
}

export function collidesWithBoard(board: Board, piece: ActivePiece): boolean {
  return cellsFor(piece).some(({ x, y }) => {
    if (x < 0 || x >= COLS || y >= ROWS) {
      return true;
    }
    if (y < 0) {
      return false;
    }
    return board[y][x] !== 0;
  });
}

function applyMovementInput(state: RoomState, player: PlayerGameState, action: QueuedInput["action"]): void {
  if (!player.active) {
    return;
  }

  switch (action) {
    case "moveLeft":
      tryMove(state, player.slot, player.active, -1, 0);
      return;
    case "moveRight":
      tryMove(state, player.slot, player.active, 1, 0);
      return;
    case "softDrop":
      applyVerticalFall(state, player);
      return;
    case "rotateCW":
      tryRotate(state, player.slot, player.active, "cw");
      return;
    case "rotateCCW":
      tryRotate(state, player.slot, player.active, "ccw");
      return;
    case "hardDrop":
      if (hardDropWouldOverlapOtherAtBoardLanding(state, player.slot, player.active)) {
        return;
      }
      while (tryMoveAgainstBoard(state.board, player.active, 0, 1)) {
        // Intentionally empty: the move function mutates one deterministic row at a time.
      }
      player.pendingLock = true;
      return;
    case "hold":
      return;
  }
}

function applyVerticalFall(state: RoomState, player: PlayerGameState): void {
  if (!player.active) {
    return;
  }

  const moved = { ...player.active, y: player.active.y + 1 };
  if (collidesWithBoard(state.board, moved)) {
    player.pendingLock = true;
    return;
  }

  if (collidesWithOtherActivePiece(state, player.slot, moved)) {
    return;
  }

  player.active.y = moved.y;
}

function applyHold(state: RoomState, player: PlayerGameState): boolean {
  if (!player.active || !player.canHold) {
    return false;
  }

  const outgoing = player.active.type;
  const incoming = state.hold.type;
  state.hold = { type: outgoing, lastHolder: player.slot, lastTick: state.tick };
  player.canHold = false;

  if (incoming) {
    player.active = createActivePiece(incoming, player.slot);
  } else {
    spawnNextPiece(state, player);
  }

  if (player.active && collidesInRoom(state, player.slot, player.active)) {
    state.gameOver = true;
    state.status = "ended";
    state.winnerMessage = `${player.displayName} could not spawn after hold.`;
  }
  return true;
}

function processPendingLocks(state: RoomState, diagnostics: SimulationDiagnostics): void {
  const lockingPlayers = (["A", "B"] as PlayerSlot[])
    .map((slot) => state.players[slot])
    .filter((player): player is PlayerGameState => Boolean(player?.pendingLock && player.active));

  for (const player of lockingPlayers) {
    if (!player.active) {
      continue;
    }

    if (collidesWithBoard(state.board, player.active)) {
      resolveLockOverlap(state.board, player.active);
    }

    if (collidesWithBoard(state.board, player.active)) {
      state.gameOver = true;
      state.status = "ended";
      state.winnerMessage = `${player.displayName} could not lock without overlap.`;
      diagnostics.gameOver = state.winnerMessage;
      return;
    }

    mergePiece(state.board, player.active);
    diagnostics.locks.push(`tick=${state.tick} slot=${player.slot} piece=${player.active.type}`);
    player.pendingLock = false;
    player.canHold = true;
    clearLines(state, diagnostics);
    spawnNextPiece(state, player);
  }
}

function resolveLockOverlap(board: Board, piece: ActivePiece): void {
  for (let attempts = 0; attempts < 4 && collidesWithBoard(board, piece); attempts++) {
    piece.y -= 1;
  }
}

function spawnNextPiece(state: RoomState, player: PlayerGameState): void {
  ensureQueue(player.queue, player.generatorState, player.slot, state.level);
  const next = player.queue.shift();
  if (!next) {
    state.gameOver = true;
    state.status = "ended";
    state.winnerMessage = "Piece queue unexpectedly empty.";
    return;
  }

  ensureQueue(player.queue, player.generatorState, player.slot, state.level, QUEUE_PREVIEW);
  player.active = createActivePiece(next, player.slot);
  player.pendingLock = false;

  if (collidesInRoom(state, player.slot, player.active)) {
    state.gameOver = true;
    state.status = "ended";
    state.winnerMessage = `${player.displayName} topped out.`;
  }
}

function createActivePiece(type: TetrominoType, slot: PlayerSlot): ActivePiece {
  const matrix = matrixFor(type);
  return {
    type,
    matrix,
    x: slot === "A" ? 1 : COLS - matrix[0].length - 1,
    y: -1,
  };
}

function tryMove(state: RoomState, slot: PlayerSlot, piece: ActivePiece, dx: number, dy: number): boolean {
  const moved = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (collidesInRoom(state, slot, moved)) {
    return false;
  }
  piece.x = moved.x;
  piece.y = moved.y;
  return true;
}

function tryMoveAgainstBoard(board: Board, piece: ActivePiece, dx: number, dy: number): boolean {
  const moved = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (collidesWithBoard(board, moved)) {
    return false;
  }
  piece.x = moved.x;
  piece.y = moved.y;
  return true;
}

function tryRotate(state: RoomState, slot: PlayerSlot, piece: ActivePiece, direction: "cw" | "ccw"): boolean {
  const rotated = rotate(piece.matrix, direction);
  for (const offset of [0, -1, 1, -2, 2]) {
    const candidate = { ...piece, matrix: rotated, x: piece.x + offset };
    if (!collidesInRoom(state, slot, candidate)) {
      piece.matrix = rotated;
      piece.x += offset;
      return true;
    }
  }
  return false;
}

function collidesInRoom(state: RoomState, slot: PlayerSlot, piece: ActivePiece): boolean {
  return collidesWithBoard(state.board, piece) || collidesWithOtherActivePiece(state, slot, piece);
}

function collidesWithOtherActivePiece(state: RoomState, slot: PlayerSlot, piece: ActivePiece): boolean {
  const otherSlot: PlayerSlot = slot === "A" ? "B" : "A";
  const other = state.players[otherSlot]?.active;
  if (!other) {
    return false;
  }

  const occupied = new Set(
    cellsFor(other)
      .filter((cell) => cell.y >= 0)
      .map((cell) => `${cell.x}:${cell.y}`),
  );

  return cellsFor(piece)
    .filter((cell) => cell.y >= 0)
    .some((cell) => occupied.has(`${cell.x}:${cell.y}`));
}

function hardDropWouldOverlapOtherAtBoardLanding(state: RoomState, slot: PlayerSlot, piece: ActivePiece): boolean {
  const candidate: ActivePiece = {
    ...piece,
    matrix: piece.matrix.map((row) => [...row]),
  };

  while (!collidesWithBoard(state.board, { ...candidate, y: candidate.y + 1 })) {
    candidate.y += 1;
  }

  return collidesWithOtherActivePiece(state, slot, candidate);
}

function rotate(matrix: Matrix, direction: "cw" | "ccw"): Matrix {
  const size = matrix.length;
  const result: Matrix = Array.from({ length: size }, () => Array<CellValue>(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      result[y][x] = direction === "cw" ? matrix[size - 1 - x][y] : matrix[x][size - 1 - y];
    }
  }
  return result;
}

function mergePiece(board: Board, piece: ActivePiece): void {
  const value = TETROMINO_VALUE[piece.type];
  for (const cell of cellsFor(piece)) {
    if (cell.y >= 0) {
      board[cell.y][cell.x] = value;
    }
  }
}

function clearLines(state: RoomState, diagnostics: SimulationDiagnostics): void {
  const remaining = state.board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - remaining.length;
  if (cleared === 0) {
    return;
  }

  const emptyRows = Array.from({ length: cleared }, () => Array<CellValue>(COLS).fill(0));
  state.board = emptyRows.concat(remaining);
  state.lines += cleared;
  state.score += cleared * (100 + cleared * 30) * state.level;
  state.level = Math.floor(state.lines / LINES_PER_LEVEL) + 1;
  diagnostics.lineClears += cleared;
}

function gravityTicksForLevel(level: number): number {
  return Math.max(GRAVITY_TICKS_BASE - (level - 1) * GRAVITY_TICKS_ACCELERATION, GRAVITY_TICKS_MIN);
}

function publicPlayer(player: PlayerGameState | null): PlayerPublicState | null {
  if (!player) {
    return null;
  }
  return {
    slot: player.slot,
    userId: player.userId,
    displayName: player.displayName,
    connected: player.connected,
    lastProcessedSeq: player.lastProcessedSeq,
    latencyMs: player.latencyMs,
    active: player.active ? clonePiece(player.active) : null,
    queue: [...player.queue],
    canHold: player.canHold,
  };
}

function clonePiece(piece: ActivePiece): ActivePiece {
  return {
    type: piece.type,
    matrix: piece.matrix.map((row) => [...row]),
    x: piece.x,
    y: piece.y,
  };
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function forEachPlayer(state: RoomState, callback: (player: PlayerGameState) => void): void {
  for (const slot of ["A", "B"] as PlayerSlot[]) {
    const player = state.players[slot];
    if (player) {
      callback(player);
    }
  }
}
