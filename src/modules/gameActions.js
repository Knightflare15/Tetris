import { generateFairBlock } from "./blockGenerator";
import { rotate } from "./rotate";
import { TETROMINOS } from "./Tetrominos.js";
import { getColor } from "./getColor.js";

export const ROWS = 20;
export const COLS = 10;
const BASE_DROP_INTERVAL = 1000;
const DROP_ACCELERATION = 75;
const MAX_SPEED = 100;
const LINES_PER_LEVEL = 3;
const blockSize = 30;
const queue = [];
export let gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export let currentPiece = null;
export let currentPos = { x: 0, y: 0 };
export const canvas = document.getElementById("tetris");
export const context = canvas.getContext("2d");
const scoreF = document.getElementById("score");
const levelF = document.getElementById("level");
const linesF = document.getElementById("lines");
let paused = false;
let lastSweepTime = 0;
let timeSubtract = 0;
export function pauseGame() {
  paused = true;
  timeSubtract = Date.now();
}

export function resumeGame() {
  if (paused) {
    paused = false;
    update();
    timeSubtract = Date.now() - timeSubtract;
  }
}
let gameOver = false;
let dropCounter = 0;
let dropInterval = BASE_DROP_INTERVAL;
let lastTime = 0;
let animationFrameId = null;

let level = 1;
let score = 0;
let linesCleared = 0;

export function render() {
  context.clearRect(0, 0, COLS * blockSize, ROWS * blockSize);

  gameBoard.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = getColor(value);
        context.fillRect(x, y, 1, 1);
      }
    });
  });

  if (currentPiece) {
    const ghostPos = getGhostPiecePosition();

    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        const drawY = ghostPos.y + y;
        if (value !== 0 && drawY >= 0) {
          context.fillRect(ghostPos.x + x, drawY, 1, 1);
        }
      });
    });

    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        const drawY = currentPos.y + y;
        if (value !== 0 && drawY >= 0) {
          context.fillStyle = getColor(value);
          context.fillRect(currentPos.x + x, currentPos.y + y, 1, 1);
        }
      });
    });
  }
}

export function resetGameBoard() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      gameBoard[y][x] = 0;
    }
  }
}

function collide(board, matrix, offset) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (
        matrix[y][x] !== 0 &&
        (board[y + offset.y] === undefined ||
          board[y + offset.y][x + offset.x] === undefined ||
          board[y + offset.y][x + offset.x] !== 0)
      ) {
        return true;
      }
    }
  }
  return false;
}

function getGhostPiecePosition() {
  let ghostY = currentPos.y;

  while (
    !collide(gameBoard, currentPiece.matrix, {
      x: currentPos.x,
      y: ghostY + 1,
    })
  ) {
    ghostY++;
  }

  return { x: currentPos.x, y: ghostY };
}

function merge(board, matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0 && y + offset.y >= 0) {
        board[y + offset.y][x + offset.x] = (level % 7) + 1;
      }
    });
  });
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isClearingLines = false;

async function sweepLines() {
  let rowsCleared = 0;
  const linesToClear = [];
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (gameBoard[y][x] === 0) {
        continue outer;
      }
    }
    linesToClear.push(y);
  }

  if (linesToClear.length > 0) {
    isClearingLines = true;

    for (const y of linesToClear) {
      gameBoard[y].fill(0);
    }
    let tempPiece = currentPiece;
    currentPiece = null;
    render();
    await delay(500); // Wait for a full second
    currentPiece = tempPiece;

    const newGameBoard = gameBoard.filter(
      (row, index) => !linesToClear.includes(index)
    );
    rowsCleared = linesToClear.length;
    const emptyLines = Array.from({ length: rowsCleared }, () =>
      Array(COLS).fill(0)
    );
    gameBoard = emptyLines.concat(newGameBoard);
    isClearingLines = false;
    rowsCleared = linesToClear.length;

    linesCleared += rowsCleared;
    let TimeRN = Date.now();
    score += parseInt(
      (rowsCleared * (100 + rowsCleared * 30) * 10) /
        ((TimeRN - lastSweepTime - timeSubtract) / 1000)
    );
    timeSubtract = 0;
    lastSweepTime = TimeRN;
    const newLevel = Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
    scoreF.textContent = score;
    linesF.textContent = linesCleared;

    if (newLevel > level) {
      level = newLevel;
      gameBoard = gameBoard.map((row) =>
        row.map((cell) => (cell != 0 ? (level % 7) + 1 : 0))
      );
      levelF.textContent = level;
      dropInterval = Math.max(
        BASE_DROP_INTERVAL - (level - 1) * DROP_ACCELERATION,
        MAX_SPEED
      );
    }
    update();
    render();
  }
}

async function drop() {
  currentPos.y++;
  if (collide(gameBoard, currentPiece.matrix, currentPos)) {
    currentPos.y--;
    merge(gameBoard, currentPiece.matrix, currentPos);

    await sweepLines();
    spawnPiece();
  }
}

function spawnPiece() {
  if (gameOver) return;
  const { type, matrix } = queue.shift();
  queue.push(generateFairBlock());
  currentPiece = { type, matrix };
  currentPos = {
    x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2),
    y: -1,
  };
  if (collide(gameBoard, matrix, currentPos)) {
    gameOver = true;
    cancelAnimationFrame(animationFrameId);
    alert("Game Over!");
    return;
  }
  renderQueue();
}

export function update(time = 0) {
  if (paused || isClearingLines) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    drop();
    dropCounter = 0;
    render();
  }

  animationFrameId = requestAnimationFrame(update);
}
export function moveLeft() {
  if (paused) return;
  const newPos = { x: currentPos.x - 1, y: currentPos.y };
  if (!collide(gameBoard, currentPiece.matrix, newPos)) {
    currentPos.x--;
  }
}

export function moveRight() {
  if (paused) return;
  const newPos = { x: currentPos.x + 1, y: currentPos.y };
  if (!collide(gameBoard, currentPiece.matrix, newPos)) {
    currentPos.x++;
  }
}

export function moveDown() {
  if (paused) return;
  const newPos = { x: currentPos.x, y: currentPos.y + 1 };
  if (!collide(gameBoard, currentPiece.matrix, newPos)) {
    currentPos.y++;
    dropCounter = 0;
  } else {
    drop();
  }
}

export function rotatePiece() {
  if (paused) return;
  const rotated = rotate(currentPiece.matrix);
  if (!collide(gameBoard, rotated, currentPos)) {
    currentPiece.matrix = rotated;
  }
}

export async function hardDrop() {
  if (paused) return;
  while (
    !collide(gameBoard, currentPiece.matrix, {
      x: currentPos.x,
      y: currentPos.y + 1,
    })
  ) {
    currentPos.y++;
  }
  merge(gameBoard, currentPiece.matrix, currentPos); // Merge at the final spot.
  await sweepLines(); // Check for and clear lines.
  spawnPiece(); // Spawn the next piece.
  dropCounter = 0; // Reset the drop timer.
  render();
}

export function renderQueue() {
  const previewCanvas = document.getElementById("preview");
  const previewCtx = previewCanvas.getContext("2d");
  const previewBlockSize = 30;
  previewCtx.setTransform(0.7, 0, 0, 0.7, 0, 0); // Reset any previous transforms

  previewCtx.scale(previewBlockSize, previewBlockSize);
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  queue.slice(0, 3).forEach((block, i) => {
    const matrix = block.matrix;
    const offsetX = Math.floor(previewCanvas.width / previewBlockSize / 2);
    const offsetY = i * 4;

    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          previewCtx.fillStyle = getColor(value);
          previewCtx.fillRect(offsetX + x, offsetY + y, 1, 1);
        }
      });
    });
  });
}

export function handleStartGame(context) {
  resetGameBoard();
  level = 1;
  score = 0;
  linesCleared = 0;
  scoreF.textContent = score;
  levelF.textContent = level;
  linesF.textContent = linesCleared;
  dropInterval = BASE_DROP_INTERVAL;
  gameOver = false;
  lastSweepTime = Date.now();
  while (queue.length) queue.shift();
  queue.push(generateFairBlock());
  queue.push(generateFairBlock());
  queue.push(generateFairBlock());
  spawnPiece();
  lastTime = 0;
  dropCounter = 0;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  update();
  render();
  renderQueue();
}
