import { generateFairBlock } from "./blockGenerator";
import { rotate } from "./rotate";
import { TETROMINOS } from "./Tetrominos.js";
import { getColor } from "./getColor.js";

export const ROWS = 20;
export const COLS = 10;
const BASE_DROP_INTERVAL = 1000;
const DROP_ACCELERATION = 75;
const MAX_SPEED = 100;
const LINES_PER_LEVEL = 10;
const blockSize = 30;

export let gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export let currentPiece = null;
export let currentPos = { x: 0, y: 0 };
export const canvas = document.getElementById("tetris");
export const context = canvas.getContext("2d");
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
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
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

function merge(board, matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + offset.y][x + offset.x] = value;
      }
    });
  });
}

function sweepLines() {
  let rowsCleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (gameBoard[y][x] === 0) {
        continue outer;
      }
    }

    const row = gameBoard.splice(y, 1)[0].fill(0);
    gameBoard.unshift(row);
    y++;
    rowsCleared++;
  }

  if (rowsCleared > 0) {
    linesCleared += rowsCleared;
    score += rowsCleared * 100;

    const newLevel = Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
    if (newLevel > level) {
      level = newLevel;
      dropInterval = Math.max(
        BASE_DROP_INTERVAL - (level - 1) * DROP_ACCELERATION,
        MAX_SPEED
      );
      console.log(`Level up! Level: ${level}, New speed: ${dropInterval}ms`);
    }
  }
}

function drop() {
  currentPos.y++;
  if (collide(gameBoard, currentPiece.matrix, currentPos)) {
    currentPos.y--;
    merge(gameBoard, currentPiece.matrix, currentPos);
    sweepLines();
    spawnPiece();
  }
}

function spawnPiece() {
  const { type, matrix } = generateFairBlock();
  currentPiece = { type, matrix };
  currentPos = {
    x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2),
    y: 0,
  };

  if (collide(gameBoard, matrix, currentPos)) {
    console.log("Game Over");
    cancelAnimationFrame(animationFrameId);
  }
}

export function update(time = 0) {
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
  const newPos = { x: currentPos.x - 1, y: currentPos.y };
  if (!collide(gameBoard, currentPiece.matrix, newPos)) {
    currentPos.x--;
  }
}

export function moveRight() {
  const newPos = { x: currentPos.x + 1, y: currentPos.y };
  if (!collide(gameBoard, currentPiece.matrix, newPos)) {
    currentPos.x++;
  }
}

export function moveDown() {
  const newPos = { x: currentPos.x, y: currentPos.y + 1 };
  if (!collide(gameBoard, currentPiece.matrix, newPos)) {
    currentPos.y++;
    dropCounter = 0;
  } else {
    drop();
  }
}

export function rotatePiece() {
  const rotated = rotate(currentPiece.matrix);
  if (!collide(gameBoard, rotated, currentPos)) {
    currentPiece.matrix = rotated;
  }
}

export function hardDrop() {
  while (
    !collide(gameBoard, currentPiece.matrix, {
      x: currentPos.x,
      y: currentPos.y + 1,
    })
  ) {
    currentPos.y++;
  }
  merge(gameBoard, currentPiece.matrix, currentPos);
  sweepLines();
  spawnPiece();
  render();
}

export function handleStartGame(context) {
  resetGameBoard();
  level = 1;
  score = 0;
  linesCleared = 0;
  dropInterval = BASE_DROP_INTERVAL;

  spawnPiece();
  lastTime = 0;
  dropCounter = 0;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  update();
  render();
}
