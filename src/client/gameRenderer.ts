import { cellsFor } from "../shared/engine";
import { matrixFor } from "../shared/tetrominoes";
import {
  COLS,
  ROWS,
  type ActivePiece,
  type CellValue,
  type Matrix,
  type PlayerSlot,
  type RoomSnapshot,
  type TetrominoType,
  type VisualCell,
} from "../shared/types";
import { familyForValue, familyForType } from "./wineTheme";
import {
  connectedComponents,
  groupByPieceId,
  imageForSprite,
  QUATTRO_SPRITE_LOAD_EVENT,
  spriteLookupForCells,
  spriteLookupForType,
  type ShapeCell,
} from "./quattroSprites";

export { QUATTRO_SPRITE_LOAD_EVENT };

export const BOARD_BLOCK_SIZE = 30;
export const BOARD_CANVAS_WIDTH = COLS * BOARD_BLOCK_SIZE;
export const BOARD_CANVAS_HEIGHT = ROWS * BOARD_BLOCK_SIZE;
const PREVIEW_BLOCK_SIZE = 18;

interface RenderCell extends ShapeCell {
  value: CellValue;
}

interface VisualRenderCell extends RenderCell {
  visual: VisualCell;
}

export function renderBoard(
  canvas: HTMLCanvasElement,
  snapshot: RoomSnapshot | null,
  localSlot: PlayerSlot | null,
  lockEffectProgress = 1,
  clearEffectProgress = 1,
): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const boardSize = snapshot ? boardSizeFor(snapshot.board) : { rows: ROWS, cols: COLS };
  drawCellarGrid(context, canvas.width, canvas.height, boardSize.cols, boardSize.rows);

  if (!snapshot) {
    return;
  }

  drawLockedBoard(context, snapshot);

  if (snapshot.lockEffect && lockEffectProgress < 1) {
    drawLockEffect(context, snapshot.lockEffect.cells, snapshot.lockEffect.value, lockEffectProgress);
  }

  for (const slot of ["A", "B"] as const) {
    const player = snapshot.players[slot];
    if (!player?.active) {
      continue;
    }
    const ghost = ghostPieceFor(snapshot, slot, player.active);
    if (ghost) {
      for (const cell of cellsFor(ghost)) {
        if (cell.y >= 0) {
          drawBoardCell(
            context,
            cell.x,
            cell.y,
            cell.value,
            slot === localSlot ? 0.24 : 0.13,
            true,
            slot === localSlot ? "#9edcff" : "#ff9eaa",
          );
        }
      }
    }
  }

  for (const slot of ["A", "B"] as const) {
    const player = snapshot.players[slot];
    if (!player?.active) {
      continue;
    }
    const alpha = slot === localSlot ? 0.96 : 0.55;
    drawActivePiece(context, player.active, alpha);
  }

  if (snapshot.clearEffect && clearEffectProgress < 1) {
    drawLineClearEffect(context, snapshot.clearEffect.rows, boardSize.cols, clearEffectProgress);
  }
}

export function renderPreview(
  canvas: HTMLCanvasElement,
  types: TetrominoType[],
): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  types.slice(0, 3).forEach((type, index) => {
    drawPreviewPiece(context, type, 45, 8 + index * 100);
  });
}

export function renderHold(canvas: HTMLCanvasElement, type: TetrominoType | null): void {
  const context = getCanvasContext(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (type) {
    drawPreviewPiece(context, type, 34, 16);
  }
}

function drawCellarGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cols: number,
  rows: number,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#321b32");
  gradient.addColorStop(0.58, "#24142b");
  gradient.addColorStop(1, "#140b1b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255, 207, 132, 0.11)";
  context.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    context.beginPath();
    context.moveTo(x * BOARD_BLOCK_SIZE, 0);
    context.lineTo(x * BOARD_BLOCK_SIZE, rows * BOARD_BLOCK_SIZE);
    context.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    context.beginPath();
    context.moveTo(0, y * BOARD_BLOCK_SIZE);
    context.lineTo(cols * BOARD_BLOCK_SIZE, y * BOARD_BLOCK_SIZE);
    context.stroke();
  }

  context.strokeStyle = "rgba(79, 182, 168, 0.28)";
  context.setLineDash([2, 8]);
  context.beginPath();
  context.moveTo((cols * BOARD_BLOCK_SIZE) / 2, 16);
  context.lineTo((cols * BOARD_BLOCK_SIZE) / 2, rows * BOARD_BLOCK_SIZE - 16);
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
  outlineColor?: string,
): void {
  const family = familyForValue(value);
  const left = x * BOARD_BLOCK_SIZE + 2;
  const top = y * BOARD_BLOCK_SIZE + 2;
  const size = BOARD_BLOCK_SIZE - 4;

  context.save();
  context.globalAlpha = alpha;
  if (outline) {
    context.strokeStyle = outlineColor ?? family.color;
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

function drawLockedBoard(context: CanvasRenderingContext2D, snapshot: RoomSnapshot): void {
  const visualCells: VisualRenderCell[] = [];

  snapshot.board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }

      const visual = snapshot.visualBoard[y]?.[x] ?? null;
      if (!visual) {
        drawBoardCell(context, x, y, value, 1);
        return;
      }

      visualCells.push({ x, y, value, visual });
    });
  });

  for (const group of groupByPieceId(visualCells)) {
    drawVisualGroup(context, group, 1);
  }
}

function drawVisualGroup(
  context: CanvasRenderingContext2D,
  group: VisualRenderCell[],
  alpha: number,
): void {
  const cellsByPosition = new Map(group.map((cell) => [`${cell.x}:${cell.y}`, cell]));

  for (const component of connectedComponents(group)) {
    const renderCells = component
      .map((cell) => cellsByPosition.get(`${cell.x}:${cell.y}`))
      .filter((cell): cell is VisualRenderCell => Boolean(cell));
    if (renderCells.length > 0) {
      drawCellSpriteComponent(context, renderCells, alpha);
    }
  }
}

function drawActivePiece(
  context: CanvasRenderingContext2D,
  piece: ActivePiece,
  alpha: number,
): void {
  const cells = cellsFor(piece);
  if (drawTetrominoSprite(context, cells, piece.type, alpha, BOARD_BLOCK_SIZE, 2)) {
    return;
  }

  for (const cell of cells) {
    if (cell.y >= 0) {
      drawBoardCell(context, cell.x, cell.y, cell.value, alpha);
    }
  }
}

function drawCellSpriteComponent(
  context: CanvasRenderingContext2D,
  cells: RenderCell[],
  alpha: number,
): boolean {
  const value = cells[0]?.value ?? 0;
  const lookup = spriteLookupForCells(cells, value);
  if (!lookup.path) {
    drawFallbackCells(context, cells, alpha);
    return false;
  }

  const image = imageForSprite(lookup.path);
  if (!image?.complete || image.naturalWidth === 0) {
    drawFallbackCells(context, cells, alpha);
    return false;
  }

  drawImageForCells(context, image, cells, alpha, BOARD_BLOCK_SIZE, 2);
  return true;
}

function drawTetrominoSprite(
  context: CanvasRenderingContext2D,
  cells: RenderCell[],
  type: TetrominoType,
  alpha: number,
  blockSize: number,
  inset: number,
): boolean {
  if (cells.length === 0) {
    return false;
  }

  const lookup = spriteLookupForType(cells, type);
  if (!lookup.path) {
    return false;
  }

  const image = imageForSprite(lookup.path);
  if (!image?.complete || image.naturalWidth === 0) {
    return false;
  }

  drawImageForCells(context, image, cells, alpha, blockSize, inset);
  return true;
}

function drawImageForCells(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cells: ShapeCell[],
  alpha: number,
  blockSize: number,
  inset: number,
): void {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));

  context.save();
  context.globalAlpha = alpha;
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    minX * blockSize + inset,
    minY * blockSize + inset,
    (maxX - minX + 1) * blockSize - inset * 2,
    (maxY - minY + 1) * blockSize - inset * 2,
  );
  context.restore();
}

function drawFallbackCells(context: CanvasRenderingContext2D, cells: RenderCell[], alpha: number): void {
  for (const cell of cells) {
    if (cell.y >= 0) {
      drawBoardCell(context, cell.x, cell.y, cell.value, alpha);
    }
  }
}

function drawLineClearEffect(
  context: CanvasRenderingContext2D,
  rows: number[],
  cols: number,
  progress: number,
): void {
  const alpha = Math.max(0, 1 - progress);
  const sweepWidth = cols * BOARD_BLOCK_SIZE * Math.min(1, progress * 1.35);

  context.save();
  for (const row of rows) {
    const top = row * BOARD_BLOCK_SIZE;
    context.fillStyle = `rgba(255, 255, 255, ${0.36 * alpha})`;
    context.fillRect(0, top, cols * BOARD_BLOCK_SIZE, BOARD_BLOCK_SIZE);

    const gradient = context.createLinearGradient(0, top, sweepWidth, top);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.62, `rgba(255, 240, 170, ${0.72 * alpha})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, top + 2, sweepWidth, BOARD_BLOCK_SIZE - 4);
  }
  context.restore();
}

function drawLockEffect(
  context: CanvasRenderingContext2D,
  cells: Array<{ x: number; y: number }>,
  value: CellValue,
  progress: number,
): void {
  if (cells.length === 0) {
    return;
  }

  const family = familyForValue(value);
  const alpha = Math.max(0, 1 - progress);
  const pulse = 1 + (1 - progress) * 0.28;

  context.save();
  context.globalCompositeOperation = "screen";

  for (const cell of cells) {
    const centerX = cell.x * BOARD_BLOCK_SIZE + BOARD_BLOCK_SIZE / 2;
    const centerY = cell.y * BOARD_BLOCK_SIZE + BOARD_BLOCK_SIZE / 2;
    const radius = BOARD_BLOCK_SIZE * 0.54 * pulse;
    const gradient = context.createRadialGradient(
      centerX,
      centerY,
      BOARD_BLOCK_SIZE * 0.16,
      centerX,
      centerY,
      radius,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.7 * alpha})`);
    gradient.addColorStop(0.45, hexToRgba(family.color, 0.52 * alpha));
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = hexToRgba(family.color, 0.46 * alpha);
    context.lineWidth = 2;
    roundedRect(
      context,
      cell.x * BOARD_BLOCK_SIZE + 2,
      cell.y * BOARD_BLOCK_SIZE + 2,
      BOARD_BLOCK_SIZE - 4,
      BOARD_BLOCK_SIZE - 4,
      6,
    );
    context.stroke();
  }

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
  const spriteCells = cellsForPreviewMatrix(matrix, originX + xOffset, originY);

  if (drawTetrominoSprite(context, spriteCells, type, 1, PREVIEW_BLOCK_SIZE, 1)) {
    return;
  }

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

function cellsForPreviewMatrix(matrix: Matrix, originX: number, originY: number): RenderCell[] {
  const cells: RenderCell[] = [];
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        cells.push({
          x: originX / PREVIEW_BLOCK_SIZE + x,
          y: originY / PREVIEW_BLOCK_SIZE + y,
          value,
        });
      }
    });
  });
  return cells;
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
    const boardRows = snapshot.board.length;
    const boardCols = snapshot.board[y]?.length ?? COLS;

    if (x < 0 || x >= boardCols || y >= boardRows) {
      return true;
    }
    if (y < 0) {
      return false;
    }
    return snapshot.board[y]?.[x] !== 0;
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

function boardSizeFor(board: Matrix): { rows: number; cols: number } {
  return {
    rows: board.length,
    cols: Math.max(...board.map((row) => row.length), 0),
  };
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

function hexToRgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }
  return context;
}
