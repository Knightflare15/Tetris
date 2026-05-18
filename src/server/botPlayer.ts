import { cellsFor } from "../shared/engine";
import {
  COLS,
  ROWS,
  type ActivePiece,
  type Board,
  type CellValue,
  type InputAction,
  type Matrix,
  type PracticeBotSpeed,
  type RoomState,
} from "../shared/types";

interface BotPlan {
  pieceKey: string;
  actions: InputAction[];
}

export interface BotRuntime {
  seq: number;
  plan: BotPlan | null;
  cooldown: number;
  speed: PracticeBotSpeed;
}

interface Candidate {
  rotations: number;
  x: number;
  y: number;
  matrix: Matrix;
  score: number;
}

const SPEED_PROFILES: Record<PracticeBotSpeed, { startCooldown: number; minCooldown: number; accelerateEveryTicks: number }> = {
  slow: { startCooldown: 8, minCooldown: 2, accelerateEveryTicks: 520 },
  balanced: { startCooldown: 5, minCooldown: 1, accelerateEveryTicks: 460 },
  quick: { startCooldown: 2, minCooldown: 0, accelerateEveryTicks: 420 },
};

export function createBotRuntime(speed: PracticeBotSpeed): BotRuntime {
  return {
    seq: 0,
    plan: null,
    cooldown: 0,
    speed,
  };
}

export function nextBotAction(state: RoomState, runtime: BotRuntime): InputAction | null {
  const player = state.players.B;
  if (!player?.active || player.pendingLock || state.status !== "playing" || state.gameOver) {
    runtime.plan = null;
    return null;
  }

  if (runtime.cooldown > 0) {
    runtime.cooldown -= 1;
    return null;
  }

  const pieceKey = keyFor(player.active);
  if (runtime.plan?.pieceKey !== pieceKey || runtime.plan.actions.length === 0) {
    runtime.plan = planFor(state, player.active, pieceKey);
  }

  const action = runtime.plan.actions.shift() ?? null;
  runtime.cooldown = cooldownFor(state, runtime, action);
  return action;
}

function cooldownFor(state: RoomState, runtime: BotRuntime, action: InputAction | null): number {
  const profile = SPEED_PROFILES[runtime.speed];
  const acceleration = Math.floor(state.tick / profile.accelerateEveryTicks);
  const movementCooldown = Math.max(profile.minCooldown, profile.startCooldown - acceleration);
  return action === "hardDrop" ? movementCooldown + 2 : movementCooldown;
}

function planFor(state: RoomState, piece: ActivePiece, pieceKey: string): BotPlan {
  const candidate = bestCandidate(state, piece);
  if (!candidate) {
    return { pieceKey, actions: ["hardDrop"] };
  }

  const actions: InputAction[] = [];
  for (let index = 0; index < candidate.rotations; index++) {
    actions.push("rotateCW");
  }

  const dx = candidate.x - piece.x;
  const horizontalAction: InputAction = dx < 0 ? "moveLeft" : "moveRight";
  for (let index = 0; index < Math.abs(dx); index++) {
    actions.push(horizontalAction);
  }

  actions.push("hardDrop");
  return { pieceKey, actions };
}

function bestCandidate(state: RoomState, piece: ActivePiece): Candidate | null {
  let best: Candidate | null = null;
  const seenRotations = new Set<string>();
  let matrix = piece.matrix.map((row) => [...row]);

  for (let rotations = 0; rotations < 4; rotations++) {
    const rotationKey = matrix.map((row) => row.join("")).join("/");
    if (!seenRotations.has(rotationKey)) {
      seenRotations.add(rotationKey);
      for (let x = -matrix.length; x <= COLS; x++) {
        const landed = landingFor(state, { ...piece, matrix, x, y: piece.y });
        if (!landed || collidesWithOtherActive(state, landed)) {
          continue;
        }
        const score = scoreLanding(state.board, landed);
        if (!best || score > best.score) {
          best = { rotations, x, y: landed.y, matrix, score };
        }
      }
    }
    matrix = rotateCW(matrix);
  }

  return best;
}

function landingFor(state: RoomState, piece: ActivePiece): ActivePiece | null {
  if (collidesWithBoard(state.board, piece)) {
    return null;
  }

  const landed: ActivePiece = {
    ...piece,
    matrix: piece.matrix.map((row) => [...row]),
  };

  while (!collidesWithBoard(state.board, { ...landed, y: landed.y + 1 })) {
    landed.y += 1;
  }
  return landed;
}

function scoreLanding(board: Board, piece: ActivePiece): number {
  const merged = board.map((row) => [...row]);
  for (const cell of cellsFor(piece)) {
    if (cell.y >= 0 && merged[cell.y]) {
      merged[cell.y][cell.x] = cell.value;
    }
  }

  const lines = merged.filter((row) => row.every((cell) => cell !== 0)).length;
  const heights = columnHeights(merged);
  const aggregateHeight = heights.reduce((sum, height) => sum + height, 0);
  const maxHeight = Math.max(...heights);
  const holes = countHoles(merged);
  const bumpiness = heights.slice(1).reduce((sum, height, index) => sum + Math.abs(height - heights[index]), 0);
  const center = averageX(cellsFor(piece));
  const centerPenalty = Math.abs(center - (COLS - 1) / 2);

  return lines * 900 - holes * 58 - aggregateHeight * 8 - maxHeight * 16 - bumpiness * 12 - centerPenalty * 3;
}

function columnHeights(board: Board): number[] {
  return Array.from({ length: COLS }, (_, x) => {
    const firstFilled = board.findIndex((row) => row[x] !== 0);
    return firstFilled === -1 ? 0 : ROWS - firstFilled;
  });
}

function countHoles(board: Board): number {
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let seenBlock = false;
    for (let y = 0; y < ROWS; y++) {
      if (board[y][x] !== 0) {
        seenBlock = true;
      } else if (seenBlock) {
        holes += 1;
      }
    }
  }
  return holes;
}

function averageX(cells: Array<{ x: number }>): number {
  return cells.reduce((sum, cell) => sum + cell.x, 0) / Math.max(1, cells.length);
}

function collidesWithBoard(board: Board, piece: ActivePiece): boolean {
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

function collidesWithOtherActive(state: RoomState, piece: ActivePiece): boolean {
  const other = state.players.A?.active;
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

function rotateCW(matrix: Matrix): Matrix {
  const size = matrix.length;
  const result: Matrix = Array.from({ length: size }, () => Array<CellValue>(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      result[y][x] = matrix[size - 1 - x][y];
    }
  }
  return result;
}

function keyFor(piece: ActivePiece): string {
  return `${piece.type}:${piece.x}:${piece.y}:${piece.matrix.map((row) => row.join("")).join("/")}`;
}
