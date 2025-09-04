import { TETROMINOS } from "./Tetrominos";

const TETROMINO_KEYS = Object.keys(TETROMINOS);
const HISTORY_SIZE = 15;
const MAX_REPEAT = 3;

const recentHistory = [];
const counts = TETROMINO_KEYS.reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

function updateCountsOnAdd(newBlock) {
  counts[newBlock]++;
}

function updateCountsOnRemove(oldBlock) {
  counts[oldBlock]--;
}

export function generateFairBlock() {
  const allowedBlocks = TETROMINO_KEYS.filter(
    (key) => counts[key] < MAX_REPEAT
  );
  const pool = allowedBlocks.length ? allowedBlocks : TETROMINO_KEYS;
  const index = Math.floor(Math.random() * pool.length);
  const chosen = pool[index];

  recentHistory.push(chosen);
  updateCountsOnAdd(chosen);

  if (recentHistory.length > HISTORY_SIZE) {
    const removed = recentHistory.shift();
    updateCountsOnRemove(removed);
  }

  return {
    type: chosen,
    matrix: TETROMINOS[chosen],
  };
}
