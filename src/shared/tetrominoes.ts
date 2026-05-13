import type { CellValue, Matrix, TetrominoType } from "./types";

export const TETROMINO_VALUE: Record<TetrominoType, CellValue> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

export const TETROMINOS: Record<TetrominoType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [0, 0, 0, 0],
    [0, 2, 2, 0],
    [0, 2, 2, 0],
    [0, 0, 0, 0],
  ],
  T: [
    [0, 0, 0, 0],
    [0, 3, 0, 0],
    [3, 3, 3, 0],
    [0, 0, 0, 0],
  ],
  S: [
    [0, 0, 0, 0],
    [0, 4, 4, 0],
    [4, 4, 0, 0],
    [0, 0, 0, 0],
  ],
  Z: [
    [0, 0, 0, 0],
    [5, 5, 0, 0],
    [0, 5, 5, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [0, 0, 0, 0],
    [6, 0, 0, 0],
    [6, 6, 6, 0],
    [0, 0, 0, 0],
  ],
  L: [
    [0, 0, 0, 0],
    [0, 0, 7, 0],
    [7, 7, 7, 0],
    [0, 0, 0, 0],
  ],
};

export const TETROMINO_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

export function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row]);
}

export function matrixFor(type: TetrominoType): Matrix {
  return cloneMatrix(TETROMINOS[type]);
}
