import "./index.css";
import {
  handleStartGame,
  gameBoard,
  resetGameBoard,
  moveLeft,
  moveRight,
  moveDown,
  rotatePiece,
  hardDrop,
  currentPiece,
  currentPos,
  render,
  context,
  canvas,
} from "./modules/gameActions";
import { pauseGame, resumeGame } from "./modules/gameActions.js";

const pauseBtn = document.getElementById("pauseBtn");
pauseBtn.addEventListener("click", () => {
  if (pauseBtn.textContent === "Pause") {
    pauseGame();
    pauseBtn.textContent = "Resume";
  } else {
    resumeGame();
    pauseBtn.textContent = "Pause";
  }
});
const blockSize = 30;
context.scale(blockSize, blockSize);

function setupInputHandlers() {
  window.addEventListener("keydown", handleKeyDown);
}

function handleKeyDown(event) {
  switch (event.code) {
    case "ArrowLeft":
      moveLeft();
      break;
    case "ArrowRight":
      moveRight();
      break;
    case "ArrowDown":
      moveDown();
      break;
    case "ArrowUp":
      rotatePiece();
      break;
    case "Space":
      hardDrop();
      break;
    default:
      break;
  }
  render();
}

function drawBlock(x, y, color) {
  context.fillStyle = color;
  context.fillRect(x, y, 1, 1);
}

function drawMatrix(matrix, offset, color = "#0ff") {
  matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        drawBlock(x + offset.x, y + offset.y, color);
      }
    });
  });
}
const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
  startBtn.blur();
  handleStartGame(context);
  setupInputHandlers();
  render();
});
