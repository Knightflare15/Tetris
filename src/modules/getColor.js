export function getColor(value) {
  const colors = {
    1: "#00f0f0", // I - cyan
    2: "#f0f000", // O - yellow
    3: "#a000f0", // T - purple
    4: "#00f000", // S - green
    5: "#f00000", // Z - red
    6: "#0000f0", // J - blue
    7: "#f0a000", // L - orange
    8: "#ffffff9c", // Ghost piece
  };
  return colors[value];
}
