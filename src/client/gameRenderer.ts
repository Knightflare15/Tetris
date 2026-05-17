import { cellsFor } from "../shared/engine";
import { matrixFor } from "../shared/tetrominoes";
import {
  COLS,
  ROWS,
  type ActivePiece,
  type Matrix,
  type PlayerSlot,
  type RoomSnapshot,
  type TetrominoType,
} from "../shared/types";
import { familyForValue, familyForType } from "./wineTheme";

const BOARD_BLOCK_SIZE = 30;
const PREVIEW_BLOCK_SIZE = 18;

export function renderBoard(
  canvas: HTMLCanvasElement,
  snapshot: RoomSnapshot | null,
  localSlot: PlayerSlot | null,
): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawCellarGrid(context, canvas.width, canvas.height);

  if (!snapshot) {
    return;
  }

  snapshot.board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawBoardCell(context, x, y, value, 1);
      }
    });
  });

  for (const slot of ["A", "B"] as const) {
    const player = snapshot.players[slot];
    if (!player?.active) {
      continue;
    }
    const ghost = ghostPieceFor(snapshot, slot, player.active);
    if (ghost) {
      for (const cell of cellsFor(ghost)) {
        if (cell.y >= 0) {
          drawBoardCell(context, cell.x, cell.y, cell.value, slot === localSlot ? 0.24 : 0.13, true);
        }
      }
    }
  }

  for (const slot of ["A", "B"] as const) {
    const player = snapshot.players[slot];
    if (!player?.active) {
      continue;
    }
    const alpha = slot === localSlot ? 0.96 : 0.65;
    for (const cell of cellsFor(player.active)) {
      if (cell.y >= 0) {
        drawBoardCell(context, cell.x, cell.y, cell.value, alpha);
      }
    }
  }
}

export function renderPreview(
  canvas: HTMLCanvasElement,
  types: TetrominoType[],
): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  types.slice(0, 5).forEach((type, index) => {
    drawPreviewPiece(context, type, 18, 8 + index * 46);
  });
}

export function renderHold(canvas: HTMLCanvasElement, type: TetrominoType | null): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (type) {
    drawPreviewPiece(context, type, 34, 16);
  }
}

function drawCellarGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#fae2bf");
  gradient.addColorStop(1, "#efba79");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(122, 71, 31, 0.2)";
  context.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    context.beginPath();
    context.moveTo(x * BOARD_BLOCK_SIZE, 0);
    context.lineTo(x * BOARD_BLOCK_SIZE, ROWS * BOARD_BLOCK_SIZE);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath();
    context.moveTo(0, y * BOARD_BLOCK_SIZE);
    context.lineTo(COLS * BOARD_BLOCK_SIZE, y * BOARD_BLOCK_SIZE);
    context.stroke();
  }

  context.strokeStyle = "rgba(111, 55, 38, 0.32)";
  context.setLineDash([2, 8]);
  context.beginPath();
  context.moveTo(width / 2, 16);
  context.lineTo(width / 2, height - 16);
  context.stroke();
  context.setLineDash([]);
}

function drawBoardCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  alpha: number,
  outline = false,
): void {
  const family = familyForValue(value);
  const left = x * BOARD_BLOCK_SIZE + 2;
  const top = y * BOARD_BLOCK_SIZE + 2;
  const size = BOARD_BLOCK_SIZE - 4;

  context.save();
  context.globalAlpha = alpha;
  if (outline) {
    context.strokeStyle = family.color;
    context.lineWidth = 3;
    roundedRect(context, left + 4, top + 4, size - 8, size - 8, 6);
    context.stroke();
    context.restore();
    return;
  }

  const gradient = context.createLinearGradient(left, top, left, top + size);
  gradient.addColorStop(0, lighten(family.color));
  gradient.addColorStop(0.52, family.color);
  gradient.addColorStop(1, family.shadow);
  context.fillStyle = gradient;
  roundedRect(context, left, top, size, size, 5);
  context.fill();

  context.strokeStyle = "rgba(69, 32, 23, 0.42)";
  context.lineWidth = 1.4;
  context.stroke();

  // context.fillStyle = "rgba(255, 248, 225, 0.78)";
  // context.font = "bold 12px Georgia, serif";
  // context.textAlign = "center";
  // context.textBaseline = "middle";
  // context.fillText(family.shortName.slice(0, 1), left + size / 2, top + size / 2 + 1);
  context.restore();
}

function drawPreviewPiece(
  context: CanvasRenderingContext2D,
  type: TetrominoType,
  originX: number,
  originY: number,
): void {
  const matrix = trimMatrix(matrixFor(type));
  const pieceWidth = matrix[0]?.length ?? 0;
  const xOffset = Math.floor((4 - pieceWidth) * PREVIEW_BLOCK_SIZE * 0.5);
  const family = familyForType(type);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }
      const left = originX + xOffset + x * PREVIEW_BLOCK_SIZE;
      const top = originY + y * PREVIEW_BLOCK_SIZE;
      const size = PREVIEW_BLOCK_SIZE - 2;
      const gradient = context.createLinearGradient(left, top, left, top + size);
      gradient.addColorStop(0, lighten(family.color));
      gradient.addColorStop(1, family.shadow);
      context.fillStyle = gradient;
      roundedRect(context, left, top, size, size, 4);
      context.fill();
      context.strokeStyle = "rgba(76, 35, 25, 0.38)";
      context.stroke();
    });
  });
}

function ghostPieceFor(snapshot: RoomSnapshot, slot: PlayerSlot, piece: ActivePiece): ActivePiece | null {
  const ghost: ActivePiece = {
    ...piece,
    matrix: piece.matrix.map((row) => [...row]),
  };

  while (!pieceCollidesWithBoard(snapshot, { ...ghost, y: ghost.y + 1 })) {
    ghost.y += 1;
  }

  if (pieceCollidesWithOtherActive(snapshot, slot, ghost)) {
    return null;
  }

  return ghost;
}

function pieceCollidesWithBoard(snapshot: RoomSnapshot, piece: ActivePiece): boolean {
  return cellsFor(piece).some(({ x, y }) => {
    if (x < 0 || x >= COLS || y >= ROWS) {
      return true;
    }
    if (y < 0) {
      return false;
    }
    return snapshot.board[y][x] !== 0;
  });
}

function pieceCollidesWithOtherActive(snapshot: RoomSnapshot, slot: PlayerSlot, piece: ActivePiece): boolean {
  const otherSlot = slot === "A" ? "B" : "A";
  const otherPiece = snapshot.players[otherSlot]?.active;
  if (!otherPiece) {
    return false;
  }

  const occupied = new Set(
    cellsFor(otherPiece)
      .filter((cell) => cell.y >= 0)
      .map((cell) => `${cell.x}:${cell.y}`),
  );

  return cellsFor(piece)
    .filter((cell) => cell.y >= 0)
    .some((cell) => occupied.has(`${cell.x}:${cell.y}`));
}

function trimMatrix(matrix: Matrix): Matrix {
  const occupiedRows = matrix.filter((row) => row.some((value) => value !== 0));
  if (occupiedRows.length === 0) {
    return matrix;
  }

  const occupiedColumns = occupiedRows[0].map((_, index) =>
    occupiedRows.some((row) => row[index] !== 0),
  );
  const firstColumn = occupiedColumns.findIndex(Boolean);
  const lastColumn = occupiedColumns.lastIndexOf(true);
  return occupiedRows.map((row) => row.slice(firstColumn, lastColumn + 1));
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function lighten(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((value >> 16) & 255) + 42);
  const g = Math.min(255, ((value >> 8) & 255) + 42);
  const b = Math.min(255, (value & 255) + 42);
  return `rgb(${r}, ${g}, ${b})`;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }
  return context;
}
