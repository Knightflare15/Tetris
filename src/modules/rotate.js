export function rotate(matrix, direction = "cw") {
  const N = matrix.length;
  const result = [];

  for (let y = 0; y < N; y++) {
    result[y] = [];
    for (let x = 0; x < N; x++) {
      if (direction === "cw" || direction === "clockwise") {
        result[y][x] = matrix[N - 1 - x][y];
      } else if (direction === "ccw" || direction === "counterclockwise") {
        result[y][x] = matrix[x][N - 1 - y];
      } else {
        throw new Error(`Invalid rotation direction: ${direction}`);
      }
    }
  }

  return result;
}
