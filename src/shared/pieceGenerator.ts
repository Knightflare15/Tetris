import { BIAS_ROTATION_LEVELS, QUEUE_PREVIEW, type PieceGeneratorState, type PlayerSlot, type TetrominoType } from "./types";
import { SeededRng } from "./rng";
import { TETROMINO_TYPES } from "./tetrominoes";

type BiasRole = "spiky" | "stable";

const BIAS_WEIGHTS: Record<BiasRole, Record<TetrominoType, number>> = {
  spiky: {
    I: 1,
    O: 2,
    T: 1,
    S: 4,
    Z: 4,
    J: 2,
    L: 2,
  },
  stable: {
    I: 4,
    O: 2,
    T: 4,
    S: 1,
    Z: 1,
    J: 2,
    L: 2,
  },
};

export function biasRoleFor(slot: PlayerSlot, level: number): BiasRole {
  const band = Math.floor((level - 1) / BIAS_ROTATION_LEVELS);
  const swapped = band % 2 === 1;
  if (slot === "A") {
    return swapped ? "stable" : "spiky";
  }
  return swapped ? "spiky" : "stable";
}

export function createGenerator(seed: number): PieceGeneratorState {
  return {
    seed: seed >>> 0,
    bag: [],
    bagIndex: 0,
  };
}

export function ensureQueue(
  queue: TetrominoType[],
  state: PieceGeneratorState,
  slot: PlayerSlot,
  level: number,
  minimum = QUEUE_PREVIEW + 1,
): void {
  while (queue.length < minimum) {
    queue.push(drawPiece(state, slot, level));
  }
}

export function drawPiece(state: PieceGeneratorState, slot: PlayerSlot, level: number): TetrominoType {
  if (state.bagIndex >= state.bag.length) {
    state.bag = createWeightedBag(state.seed, slot, level);
    state.bagIndex = 0;
    advanceGeneratorSeed(state);
  }

  const piece = state.bag[state.bagIndex];
  state.bagIndex += 1;
  return piece;
}

function createWeightedBag(seed: number, slot: PlayerSlot, level: number): TetrominoType[] {
  const role = biasRoleFor(slot, level);
  const weighted = TETROMINO_TYPES.flatMap((type) => Array(BIAS_WEIGHTS[role][type]).fill(type) as TetrominoType[]);
  const rng = new SeededRng(seed + level * 97 + (slot === "A" ? 11 : 29));

  for (let i = weighted.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }

  return weighted;
}

export function advanceGeneratorSeed(state: PieceGeneratorState): void {
  const rng = new SeededRng(state.seed);
  rng.next();
  state.seed = rng.snapshot();
}
