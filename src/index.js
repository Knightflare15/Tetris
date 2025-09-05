import "./index.css";
import {
  handleStartGame,
  moveLeft,
  moveRight,
  moveDown,
  rotatePiece,
  hardDrop,
  render,
  context,
  canvas,
  paused,
} from "./modules/gameActions";

import { pauseGame, resumeGame } from "./modules/gameActions.js";

let startX = 0,
  startY = 0;
let lastX = 0;
let touchMoved = false;
let holdTimeout = null;
let holdInterval = null;
const HOLD_DELAY = 500; // ms before continuous drop starts
const MOVE_THRESHOLD = 60; // px minimum move to count as drag
const HARD_DROP_THRESHOLD = 200; // px swipe down distance
let isHolding = false;

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

const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
  canvas.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = startX;
    touchMoved = false;

    holdTimeout = setTimeout(() => {
      isHolding = true;
      holdInterval = setInterval(() => {
        moveDown();
        render();
      }, 100);
    }, HOLD_DELAY);

    e.preventDefault();
  });

  canvas.addEventListener("touchmove", (e) => {
    if (paused) return;
    const touch = e.touches[0];
    const dy = touch.clientY - startY;
    const dx = touch.clientX - lastX;

    if (
      Math.abs(dx) > MOVE_THRESHOLD &&
      Math.abs(dy) < HARD_DROP_THRESHOLD / 5
    ) {
      touchMoved = true;
      if (dx > 0) {
        moveRight();
      } else if (dx < 0) {
        moveLeft();
      }
      render();
      lastX = touch.clientX;

      clearTimeout(holdTimeout);
      clearInterval(holdInterval);
    }
    e.preventDefault();
  });

  canvas.addEventListener("touchend", (e) => {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    const wasHolding = isHolding;
    isHolding = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (dy > HARD_DROP_THRESHOLD) {
      hardDrop();
      render();
      e.preventDefault();
      return;
    }

    if (
      !touchMoved &&
      Math.abs(dx) < MOVE_THRESHOLD &&
      Math.abs(dy) < MOVE_THRESHOLD &&
      !wasHolding
    ) {
      rotatePiece();
      render();
    }
    e.preventDefault();
  });

  startBtn.blur();
  handleStartGame(context);
  setupInputHandlers();
  render();
});
