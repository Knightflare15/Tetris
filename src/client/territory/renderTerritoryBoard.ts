import type { PlayerSlot, TerritoryActivePiece, TerritoryLegalPlacement, TerritorySnapshot } from "../../shared/types";

export function renderTerritoryBoard(
  canvas: HTMLCanvasElement,
  snapshot: TerritorySnapshot | null,
  localSlot: PlayerSlot | null,
  preview: TerritoryActivePiece | null,
): void {
  const context = getCanvasContext(canvas);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  const rows = snapshot?.board.length ?? 20;
  const cols = snapshot?.board[0]?.length ?? 12;
  const blockSize = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
  const width = blockSize * cols;
  const height = blockSize * rows;
  const offsetX = Math.floor((canvas.width - width) / 2);
  const offsetY = Math.floor((canvas.height - height) / 2);

  context.save();
  context.translate(offsetX, offsetY);
  drawTerritoryGrid(context, width, height, cols, rows, blockSize);

  if (!snapshot) {
    context.restore();
    return;
  }

  const danger = dangerLines(snapshot);
  context.save();
  context.fillStyle = "rgba(238, 180, 61, 0.13)";
  for (const row of danger.rows) {
    context.fillRect(0, row * blockSize, width, blockSize);
  }
  for (const column of danger.columns) {
    context.fillRect(column * blockSize, 0, blockSize, height);
  }
  context.restore();

  snapshot.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell.owner || cell.value === 0) {
        return;
      }
      drawTerritoryCell(context, x, y, blockSize, cell.owner, cell.owner === localSlot ? 0.96 : 0.74);
    });
  });

  if (preview) {
    const ghost = projectedPlacement(snapshot.board, preview);
    const projectedClearCells = projectedClearSet(snapshot, ghost);
    for (const cell of ghost.cells) {
      drawTerritoryCell(context, cell.x, cell.y, blockSize, snapshot.turn.activeSlot, 0.22, true);
    }
    for (const cell of preview.cells) {
      drawTerritoryCell(context, cell.x, cell.y, blockSize, snapshot.turn.activeSlot, 0.48, true);
    }
    context.save();
    context.fillStyle = "rgba(255, 239, 153, 0.28)";
    for (const key of projectedClearCells) {
      const [x, y] = key.split(":").map(Number);
      context.fillRect((x ?? 0) * blockSize, (y ?? 0) * blockSize, blockSize, blockSize);
    }
    context.restore();
  }

  context.save();
  context.strokeStyle = "rgba(255, 238, 155, 0.75)";
  context.lineWidth = Math.max(2, Math.floor(blockSize * 0.08));
  for (const row of snapshot.lastClears.rows) {
    context.strokeRect(0, row * blockSize, width, blockSize);
  }
  for (const column of snapshot.lastClears.columns) {
    context.strokeRect(column * blockSize, 0, blockSize, height);
  }
  context.restore();

  drawLargestComponentOutline(context, snapshot, blockSize);
  context.restore();
}

function drawTerritoryGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cols: number,
  rows: number,
  blockSize: number,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2d1729");
  gradient.addColorStop(1, "#160b19");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255, 210, 143, 0.14)";
  context.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    context.beginPath();
    context.moveTo(x * blockSize + 0.5, 0);
    context.lineTo(x * blockSize + 0.5, height);
    context.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    context.beginPath();
    context.moveTo(0, y * blockSize + 0.5);
    context.lineTo(width, y * blockSize + 0.5);
    context.stroke();
  }
}

function drawTerritoryCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  blockSize: number,
  owner: PlayerSlot,
  alpha: number,
  preview = false,
): void {
  const palette = owner === "A" ? { fill: "#c04482", edge: "#ffe08a" } : { fill: "#38a7b6", edge: "#c7f8ff" };
  const inset = Math.max(1, Math.floor(blockSize * 0.09));
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = palette.fill;
  context.fillRect(x * blockSize + inset, y * blockSize + inset, blockSize - inset * 2, blockSize - inset * 2);
  context.strokeStyle = preview ? palette.edge : "rgba(22, 9, 22, 0.7)";
  context.lineWidth = Math.max(1, Math.floor(blockSize * 0.06));
  context.strokeRect(x * blockSize + inset, y * blockSize + inset, blockSize - inset * 2, blockSize - inset * 2);
  context.restore();
}

function dangerLines(snapshot: TerritorySnapshot): { rows: number[]; columns: number[] } {
  const rows: number[] = [];
  const columns: number[] = [];
  const colCount = snapshot.board[0]?.length ?? 0;
  snapshot.board.forEach((row, y) => {
    const filled = row.filter((cell) => cell.value !== 0).length;
    if (filled === colCount - 1) {
      rows.push(y);
    }
  });
  for (let x = 0; x < colCount; x++) {
    const filled = snapshot.board.filter((row) => row[x]?.value !== 0).length;
    if (filled === snapshot.board.length - 1) {
      columns.push(x);
    }
  }
  return { rows, columns };
}

function projectedClearSet(snapshot: TerritorySnapshot, preview: TerritoryLegalPlacement): Set<string> {
  const occupied = new Set<string>();
  snapshot.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell.value !== 0) {
        occupied.add(`${x}:${y}`);
      }
    });
  });
  for (const cell of preview.cells) {
    occupied.add(`${cell.x}:${cell.y}`);
  }

  const rows = new Set<number>();
  const columns = new Set<number>();
  const rowCount = snapshot.board.length;
  const colCount = snapshot.board[0]?.length ?? 0;
  for (let y = 0; y < rowCount; y++) {
    let full = true;
    for (let x = 0; x < colCount; x++) {
      full = full && occupied.has(`${x}:${y}`);
    }
    if (full) {
      rows.add(y);
    }
  }
  for (let x = 0; x < colCount; x++) {
    let full = true;
    for (let y = 0; y < rowCount; y++) {
      full = full && occupied.has(`${x}:${y}`);
    }
    if (full) {
      columns.add(x);
    }
  }

  const clearCells = new Set<string>();
  for (const row of rows) {
    for (let x = 0; x < colCount; x++) {
      clearCells.add(`${x}:${row}`);
    }
  }
  for (const column of columns) {
    for (let y = 0; y < rowCount; y++) {
      clearCells.add(`${column}:${y}`);
    }
  }
  return clearCells;
}

function projectedPlacement(
  board: TerritorySnapshot["board"],
  preview: TerritoryActivePiece,
): TerritoryLegalPlacement {
  const offsets = preview.cells.map((cell) => ({ x: cell.x - preview.x, y: cell.y - preview.y }));
  let y = preview.y;
  while (!wouldCollide(board, offsets, preview.x, y + 1)) {
    y += 1;
  }
  return {
    source: preview.source,
    draftId: preview.draftId,
    type: preview.type,
    rotation: preview.rotation,
    edge: "top",
    lane: preview.x,
    x: preview.x,
    y,
    cells: offsets.map((cell) => ({ x: preview.x + cell.x, y: y + cell.y })),
  };
}

function wouldCollide(
  board: TerritorySnapshot["board"],
  offsets: Array<{ x: number; y: number }>,
  x: number,
  y: number,
): boolean {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  return offsets.some((cell) => {
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

function drawLargestComponentOutline(
  context: CanvasRenderingContext2D,
  snapshot: TerritorySnapshot,
  blockSize: number,
): void {
  const components = [...snapshot.scores.components.A, ...snapshot.scores.components.B];
  const largest = components.sort((first, second) => second.size - first.size)[0];
  if (!largest || largest.size < 2) {
    return;
  }

  context.save();
  context.strokeStyle = "rgba(255, 235, 163, 0.78)";
  context.lineWidth = Math.max(1, Math.floor(blockSize * 0.05));
  context.setLineDash([Math.max(2, blockSize * 0.22), Math.max(2, blockSize * 0.18)]);
  for (const cell of largest.cells) {
    context.strokeRect(cell.x * blockSize + 2, cell.y * blockSize + 2, blockSize - 4, blockSize - 4);
  }
  context.restore();
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }
  return context;
}
