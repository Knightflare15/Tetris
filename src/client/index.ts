import { io, type Socket } from "socket.io-client";
import "../index.css";
import { cellsFor } from "../shared/engine";
import { matrixFor } from "../shared/tetrominoes";
import {
  COLS,
  ROWS,
  type ActivePiece,
  type Board,
  type ClientToServerEvents,
  type InputAction,
  type Matrix,
  type RoomSnapshot,
  type ServerToClientEvents,
  type TetrominoType,
} from "../shared/types";

const BLOCK_SIZE = 30;
const PREVIEW_BLOCK_SIZE = 18;
const STORAGE_KEY = "coop-tetris-session";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface StoredSession {
  token: string;
  roomId?: string;
  reconnectToken?: string;
}

const canvas = mustGet<HTMLCanvasElement>("tetris");
const context = getCanvasContext(canvas);
const preview = mustGet<HTMLCanvasElement>("preview");
const previewContext = getCanvasContext(preview);

const startBtn = mustGet<HTMLButtonElement>("startBtn");
const reconnectBtn = mustGet<HTMLButtonElement>("pauseBtn");
const displayNameInput = mustGet<HTMLInputElement>("displayName");
const statusF = mustGet<HTMLSpanElement>("status");
const roomF = mustGet<HTMLSpanElement>("room");
const slotF = mustGet<HTMLSpanElement>("slot");
const latencyF = mustGet<HTMLSpanElement>("latency");
const scoreF = mustGet<HTMLSpanElement>("score");
const levelF = mustGet<HTMLSpanElement>("level");
const linesF = mustGet<HTMLSpanElement>("lines");
const holdF = mustGet<HTMLSpanElement>("hold");

let socket: GameSocket | null = null;
let snapshot: RoomSnapshot | null = null;
let inputSeq = 0;
let localSlot: "A" | "B" | null = null;

startBtn.addEventListener("click", () => {
  void connectAndQueue();
});

reconnectBtn.addEventListener("click", () => {
  void reconnectStoredSession();
});

window.addEventListener("keydown", (event) => {
  const action = keyToAction(event);
  if (!action) {
    return;
  }
  event.preventDefault();
  sendInput(action);
});

let pingTimer: number | null = null;
renderEmpty();

async function connectAndQueue(): Promise<void> {
  setStatus("Authenticating");
  const token = await requestDemoToken(displayNameInput.value);
  saveSession({ token });
  connectSocket(token);
  socket?.emit("joinMatchmaking");
}

async function reconnectStoredSession(): Promise<void> {
  const session = loadSession();
  if (!session?.token || !session.roomId || !session.reconnectToken) {
    setStatus("No reconnect token");
    return;
  }
  connectSocket(session.token);
  socket?.emit("reconnectRoom", { roomId: session.roomId, reconnectToken: session.reconnectToken });
}

async function requestDemoToken(displayName: string): Promise<string> {
  const response = await fetch("/auth/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  if (!response.ok) {
    throw new Error("Auth request failed.");
  }
  const body = (await response.json()) as { token: string };
  return body.token;
}

function connectSocket(token: string): void {
  if (socket?.connected) {
    return;
  }

  socket = io({ auth: { token }, transports: ["websocket"] });

  socket.on("connect", () => {
    setStatus("Connected");
    startPing();
  });

  socket.on("connect_error", (error) => {
    setStatus(`Connect error: ${error.message}`);
  });

  socket.on("authenticated", ({ user }) => {
    displayNameInput.value = user.displayName;
  });

  socket.on("matchmakingQueued", ({ queueSize }) => {
    setStatus(`Queued (${queueSize})`);
  });

  socket.on("roomJoined", ({ roomId, slot, reconnectToken }) => {
    localSlot = slot;
    const session = loadSession();
    if (session) {
      saveSession({ ...session, roomId, reconnectToken });
    }
    roomF.textContent = short(roomId);
    slotF.textContent = slot;
    setStatus("Playing");
  });

  socket.on("snapshot", (nextSnapshot) => {
    snapshot = nextSnapshot;
    renderSnapshot(nextSnapshot);
  });

  socket.on("latency", ({ latencyMs }) => {
    latencyF.textContent = `${latencyMs}ms`;
  });

  socket.on("serverError", ({ message }) => {
    setStatus(message);
  });

  socket.on("disconnect", () => {
    setStatus("Disconnected");
    stopPing();
  });
}

function sendInput(action: InputAction): void {
  if (!socket?.connected || !snapshot || snapshot.gameOver) {
    return;
  }
  inputSeq += 1;
  socket.emit("input", {
    seq: inputSeq,
    action,
    clientTick: snapshot.tick,
    sentAt: Date.now(),
  });
}

function startPing(): void {
  stopPing();
  pingTimer = window.setInterval(() => {
    socket?.emit("pingCheck", { clientTime: Date.now() });
  }, 2000);
}

function stopPing(): void {
  if (pingTimer !== null) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }
}

function renderSnapshot(nextSnapshot: RoomSnapshot): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  nextSnapshot.board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawCell(x, y, colorFor(value), 1);
      }
    });
  });

  for (const slot of ["A", "B"] as const) {
    const player = nextSnapshot.players[slot];
    if (!player?.active) {
      continue;
    }
    const ghost = ghostPieceFor(nextSnapshot.board, player.active);
    for (const cell of cellsFor(ghost)) {
      if (cell.y >= 0) {
        drawCell(cell.x, cell.y, colorFor(cell.value), slot === localSlot ? 0.22 : 0.14, true);
      }
    }
  }

  for (const slot of ["A", "B"] as const) {
    const player = nextSnapshot.players[slot];
    if (!player?.active) {
      continue;
    }
    const alpha = slot === localSlot ? 0.95 : 0.65;
    for (const cell of cellsFor(player.active)) {
      if (cell.y >= 0) {
        drawCell(cell.x, cell.y, colorFor(cell.value), alpha);
      }
    }
  }

  scoreF.textContent = String(nextSnapshot.score);
  levelF.textContent = String(nextSnapshot.level);
  linesF.textContent = String(nextSnapshot.lines);
  holdF.textContent = nextSnapshot.hold.type ?? "-";
  renderQueue(nextSnapshot);

  if (nextSnapshot.gameOver) {
    setStatus(nextSnapshot.winnerMessage ?? "Game over");
  }
}

function renderQueue(nextSnapshot: RoomSnapshot): void {
  previewContext.clearRect(0, 0, preview.width, preview.height);
  const player = localSlot ? nextSnapshot.players[localSlot] : nextSnapshot.players.A;
  const queue = player?.queue ?? [];
  queue.slice(0, 5).forEach((type, index) => {
    drawPreviewPiece(type, 18, 8 + index * 46);
  });
}

function renderEmpty(): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}

function drawGrid(): void {
  context.strokeStyle = "#1f1f1f";
  context.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    context.beginPath();
    context.moveTo(x * BLOCK_SIZE, 0);
    context.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    context.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath();
    context.moveTo(0, y * BLOCK_SIZE);
    context.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
    context.stroke();
  }
}

function drawCell(x: number, y: number, color: string, alpha: number, outline = false): void {
  context.globalAlpha = alpha;
  if (outline) {
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.strokeRect(x * BLOCK_SIZE + 4, y * BLOCK_SIZE + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
  } else {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
  }
  context.globalAlpha = 1;
}

function drawPreviewPiece(type: TetrominoType, originX: number, originY: number): void {
  const matrix = trimMatrix(matrixFor(type));
  const pieceWidth = matrix[0]?.length ?? 0;
  const xOffset = Math.floor((4 - pieceWidth) * PREVIEW_BLOCK_SIZE * 0.5);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }
      previewContext.fillStyle = colorFor(value);
      previewContext.fillRect(
        originX + xOffset + x * PREVIEW_BLOCK_SIZE,
        originY + y * PREVIEW_BLOCK_SIZE,
        PREVIEW_BLOCK_SIZE - 2,
        PREVIEW_BLOCK_SIZE - 2,
      );
    });
  });
}

function ghostPieceFor(board: Board, piece: ActivePiece): ActivePiece {
  const ghost: ActivePiece = {
    ...piece,
    matrix: piece.matrix.map((row) => [...row]),
  };

  while (!pieceCollides(board, { ...ghost, y: ghost.y + 1 })) {
    ghost.y += 1;
  }

  return ghost;
}

function pieceCollides(board: Board, piece: ActivePiece): boolean {
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

function keyToAction(event: KeyboardEvent): InputAction | null {
  switch (event.code) {
    case "ArrowLeft":
      return "moveLeft";
    case "ArrowRight":
      return "moveRight";
    case "ArrowDown":
      return "softDrop";
    case "ArrowUp":
      return "rotateCW";
    case "KeyZ":
      return "rotateCCW";
    case "Space":
      return "hardDrop";
    case "KeyC":
    case "ShiftLeft":
    case "ShiftRight":
      return "hold";
    default:
      return null;
  }
}

function setStatus(value: string): void {
  statusF.textContent = value;
}

function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function colorFor(value: number): string {
  const colors: Record<number, string> = {
    1: "#00f0f0",
    2: "#f0f000",
    3: "#a000f0",
    4: "#00f000",
    5: "#f00000",
    6: "#0000f0",
    7: "#f0a000",
  };
  return colors[value] ?? "#ffffff";
}

function short(value: string): string {
  return value.slice(0, 8);
}

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element as T;
}

function getCanvasContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const nextContext = element.getContext("2d");
  if (!nextContext) {
    throw new Error("Canvas context unavailable.");
  }
  return nextContext;
}
