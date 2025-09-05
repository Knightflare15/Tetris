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

let startX = null,
  startY = null;
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

canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
});

canvas.addEventListener("touchend", (e) => {
  let dx = e.changedTouches[0].clientX - startX;
  let dy = e.changedTouches[0].clientY - startY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe
    if (dx > 30) {
      moveRight();
    } else if (dx < -30) {
      moveLeft();
    }
  } else {
    // Vertical swipe
    if (dy > 100) {
      hardDrop();
    } else if (dy > 30) {
      moveDown();
    } else if (dy < -30) {
      rotatePiece();
    }
    render();
    startX = null;
    startY = null;
    e.preventDefault();
  }
});

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
